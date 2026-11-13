import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { assertChannelAccess, workspaceId } from '../access.js';
import { removeUploadIfUnused } from '../uploads.js';
import { clampLimit, downloadMedia, normalizeChannel, scrapeChannel, stripLinks } from '../parser.js';

const r = Router();

// каналы, которые парсятся прямо сейчас (защита от двойного клика и параллельных запусков)
const running = (globalThis.__tgmParsing ??= new Set());
const MAX_SOURCES_PER_RUN = 20;
const MAX_SOURCES = 50; // на пространство: открытая регистрация не должна давать безлимитный сбор с t.me

const ints = (list) => [...new Set((Array.isArray(list) ? list : []).map(Number))].filter(Number.isInteger);

/** Сохраняет посты источника; возвращает число новых. Уже известные посты обновляются (текст мог быть отредактирован). */
async function storePosts(sourceId, posts) {
  if (!posts.length) return 0;
  const { rows } = await q(
    `insert into parsed_posts (source_id, tg_post_id, content, media_url, media_type, posted_at)
     select $1::int, t.id, t.content, t.media_url, t.media_type, t.posted_at
     from unnest($2::int[], $3::text[], $4::text[], $5::text[], $6::timestamptz[]) as t(id, content, media_url, media_type, posted_at)
     on conflict (source_id, tg_post_id) do update
       set content = excluded.content, media_url = excluded.media_url, media_type = excluded.media_type
     returning (xmax = 0) as inserted`,
    [sourceId, posts.map((p) => p.id), posts.map((p) => p.content), posts.map((p) => p.media_url), posts.map((p) => p.media_type), posts.map((p) => p.posted_at)],
  );
  return rows.filter((x) => x.inserted).length;
}

const sourceWithCount = async (id) =>
  (await q(
    `select s.*, count(pp.id)::int as posts_count
     from parser_sources s left join parsed_posts pp on pp.source_id = s.id
     where s.id = $1 group by s.id`,
    [id],
  )).rows[0];

// ---------- каналы-источники ----------

r.get('/sources', async (req, res) => {
  const { rows } = await q(
    `select s.*, count(pp.id)::int as posts_count
     from parser_sources s left join parsed_posts pp on pp.source_id = s.id
     where s.owner_id = $1
     group by s.id order by s.username`,
    [workspaceId(req.user)],
  );
  res.json(rows);
});

// Добавление сразу проверяет канал и забирает свежие посты первой страницы
r.post('/sources', async (req, res) => {
  const username = normalizeChannel(req.body?.channel);
  const ws = workspaceId(req.user);
  if ((await q('select 1 from parser_sources where username = $1 and owner_id = $2', [username, ws])).rowCount) {
    throw httpError('Этот канал уже добавлен', 409);
  }
  const { rows: [{ n }] } = await q('select count(*)::int as n from parser_sources where owner_id = $1', [ws]);
  if (n >= MAX_SOURCES) throw httpError(`Не больше ${MAX_SOURCES} каналов-источников: удалите ненужные`, 409);
  const scraped = await scrapeChannel(username, { limit: 20 });
  const { rows: [src] } = await q(
    `insert into parser_sources (username, title, last_parsed_at, created_by, owner_id)
     values ($1, $2, now(), $3, $4) returning id`,
    [username, scraped.title || username, req.user.id, ws],
  );
  const added = await storePosts(src.id, scraped.posts);
  res.status(201).json({ ...(await sourceWithCount(src.id)), added });
});

// посты-черновики, уже созданные из спарсенных, остаются в «Подготовке постов»
r.delete('/sources/:id', async (req, res) => {
  const { rowCount } = await q('delete from parser_sources where id = $1 and owner_id = $2', [req.params.id, workspaceId(req.user)]);
  if (!rowCount) throw httpError('Канал не найден', 404);
  res.status(204).end();
});

// ---------- парсинг выбранных каналов ----------

r.post('/parse', async (req, res) => {
  const ids = ints(req.body?.source_ids);
  if (!ids.length) throw httpError('Выберите хотя бы один канал');
  if (ids.length > MAX_SOURCES_PER_RUN) throw httpError(`За один раз — не более ${MAX_SOURCES_PER_RUN} каналов`);
  const limit = clampLimit(req.body?.limit);

  const { rows: sources } = await q('select * from parser_sources where id = any($1::int[]) and owner_id = $2 order by username', [ids, workspaceId(req.user)]);
  const results = [];
  for (const s of sources) {
    const base = { id: s.id, username: s.username };
    if (running.has(s.id)) {
      results.push({ ...base, error: 'Канал уже парсится' });
      continue;
    }
    running.add(s.id);
    try {
      const scraped = await scrapeChannel(s.username, { limit });
      const added = await storePosts(s.id, scraped.posts);
      await q(
        'update parser_sources set title = coalesce($2, title), last_parsed_at = now(), last_error = null where id = $1',
        [s.id, scraped.title],
      );
      results.push({ ...base, added, found: scraped.posts.length });
    } catch (e) {
      await q('update parser_sources set last_error = $2 where id = $1', [s.id, String(e.message).slice(0, 500)]);
      results.push({ ...base, error: e.message });
    } finally {
      running.delete(s.id);
    }
  }
  res.json({ results });
});

// ---------- спарсенные посты ----------

// ?source_ids=1,2&q=текст&limit=30&offset=0
r.get('/posts', async (req, res) => {
  const sourceIds = req.query.source_ids ? ints(String(req.query.source_ids).split(',')) : null;
  const search = String(req.query.q ?? '').trim().slice(0, 200);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const { rows } = await q(
    `select pp.id, pp.source_id, pp.tg_post_id, pp.content, pp.media_url, pp.media_type, pp.posted_at, pp.draft_post_id,
            s.username as source_username, s.title as source_title, p.status as draft_status,
            count(*) over()::int as total
     from parsed_posts pp
       join parser_sources s on s.id = pp.source_id
       left join posts p on p.id = pp.draft_post_id
     where s.owner_id = $5
       and ($1::int[] is null or pp.source_id = any($1::int[]))
       and ($2::text = '' or pp.content ilike '%' || $2 || '%')
     order by pp.posted_at desc nulls last, pp.id desc
     limit $3 offset $4`,
    [sourceIds, search.replace(/[\\%_]/g, '\\$&'), limit, offset, workspaceId(req.user)],
  );
  res.json({ items: rows.map(({ total, ...p }) => p), total: rows[0]?.total ?? 0 });
});

const titleFrom = (content) => {
  const first = content.split('\n').find((l) => l.trim())?.trim() ?? '';
  return first.length > 80 ? `${first.slice(0, 79).trimEnd()}…` : first || 'Без заголовка';
};

// «Сформировать пост»: создаёт черновик в «Подготовке постов» для выбранного канала публикации
r.post('/posts/:id/draft', async (req, res) => {
  const channelId = Number(req.body?.channel_id);
  if (!Number.isInteger(channelId)) throw httpError('Выберите канал для публикации');
  await assertChannelAccess(req.user, channelId);
  if (!(await q('select 1 from channels where id = $1', [channelId])).rowCount) throw httpError('Канал не найден', 404);

  const { rows: [pp] } = await q(
    `select pp.* from parsed_posts pp join parser_sources s on s.id = pp.source_id where pp.id = $1 and s.owner_id = $2`,
    [req.params.id, workspaceId(req.user)],
  );
  if (!pp) throw httpError('Пост не найден', 404);
  if (pp.draft_post_id) throw httpError('Пост уже сформирован', 409);

  // в черновик не попадают ссылки и упоминания: ничто не должно вести к каналу-источнику
  const content = stripLinks(pp.content).slice(0, 4096);
  if (!content) throw httpError('После удаления ссылок и упоминаний в посте не осталось текста');

  let media = pp.media_url;
  let note = null;
  const what = pp.media_type === 'video' ? 'Видео' : 'Картинка';
  if (media && content.length > 1024) {
    media = null; // подпись к фото и видео в Telegram — не больше 1024 символов
    note = `${what} не добавлено: текст длиннее 1024 символов (лимит подписи в Telegram)`;
  } else if (media) {
    // файл сохраняется локально; ссылку на CDN в черновик не кладём
    media = await downloadMedia(media).catch((e) => {
      note = `${what} не добавлено: ${e.message}. Добавьте вручную`;
      return null;
    });
  }

  const { rows: [post] } = await q(
    `insert into posts (channel_id, title, content, media_url, status, created_by)
     values ($1, $2, $3, $4, 'draft', $5) returning *`,
    [channelId, titleFrom(content), content, media, req.user.id],
  );
  // защита от двойного нажатия: связываем только если черновик ещё не создан
  const claimed = await q('update parsed_posts set draft_post_id = $2 where id = $1 and draft_post_id is null', [pp.id, post.id]);
  if (!claimed.rowCount) {
    await q('delete from posts where id = $1', [post.id]);
    await removeUploadIfUnused(media);
    throw httpError('Пост уже сформирован', 409);
  }
  res.status(201).json({ post, note });
});

export default r;
