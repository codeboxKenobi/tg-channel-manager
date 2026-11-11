import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { requireRole } from '../auth.js';
import { assertChannelAccess } from '../access.js';
import { fetchChannelPage, parseSource, refreshAll } from '../parser.js';
import { fitPost, isTelegramCdn, normalizeUsername } from '../tgparse.js';
import { saveRemoteImage } from '../uploads.js';

const r = Router();

// ---------- каналы-источники ----------
r.get('/sources', async (_req, res) => {
  const { rows } = await q(
    `select s.*, count(p.id)::int as posts_count
     from parser_sources s left join parsed_posts p on p.source_id = s.id
     group by s.id order by lower(s.username)`,
  );
  res.json(rows);
});

// Добавляет канал по названию (@username или ссылке) и сразу загружает ~60 последних постов
r.post('/sources', async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  if (!username) throw httpError('Укажите название канала: @username или ссылку вида t.me/username');
  const { rowCount } = await q('select 1 from parser_sources where lower(username) = lower($1)', [username]);
  if (rowCount) throw httpError('Этот канал уже добавлен', 409);

  const first = await fetchChannelPage(username); // заодно проверяем, что канал существует и публичный
  const { rows: [source] } = await q(
    'insert into parser_sources (username, title, created_by) values ($1, $2, $3) returning *',
    [username, first.title || username, req.user.id],
  );
  const result = await parseSource(source, 3, first);
  res.status(201).json({ ...source, ...result });
});

r.post('/sources/:id/refresh', async (req, res) => {
  const { rows: [source] } = await q('select * from parser_sources where id = $1', [req.params.id]);
  if (!source) throw httpError('Источник не найден', 404);
  const pages = Math.min(5, Math.max(1, Number(req.body?.pages) || 1));
  res.json(await parseSource(source, pages));
});

r.post('/refresh-all', async (_req, res) => {
  res.json(await refreshAll());
});

r.delete('/sources/:id', requireRole('admin'), async (req, res) => {
  const { rowCount } = await q('delete from parser_sources where id = $1', [req.params.id]);
  if (!rowCount) throw httpError('Источник не найден', 404);
  res.status(204).end();
});

// ---------- спарсенные посты ----------
// ?source_id=&q=текст&only_new=1&offset=0&limit=30
r.get('/posts', async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const { rows } = await q(
    `select p.id, p.source_id, p.tg_message_id, p.text, p.photo_url, p.post_url, p.posted_at, p.views, p.draft_post_id,
            s.username as source_username, s.title as source_title, d.status as draft_status
     from parsed_posts p
     join parser_sources s on s.id = p.source_id
     left join posts d on d.id = p.draft_post_id
     where ($1::int is null or p.source_id = $1)
       and ($2::text = '' or p.text ilike '%' || $2 || '%')
       and (not $3::boolean or p.draft_post_id is null)
     order by p.posted_at desc nulls last, p.id desc
     limit $4 offset $5`,
    [req.query.source_id ? Number(req.query.source_id) : null, String(req.query.q ?? '').trim(), req.query.only_new === '1', limit + 1, offset],
  );
  res.json({ items: rows.slice(0, limit), hasMore: rows.length > limit });
});

// «Сформировать пост»: создаёт черновик в «Подготовке постов»
r.post('/posts/:id/draft', async (req, res) => {
  const channelId = Number(req.body?.channel_id);
  if (!Number.isInteger(channelId)) throw httpError('Выберите канал, в котором будет опубликован пост');
  await assertChannelAccess(req.user, channelId);

  const { rows: [src] } = await q(
    'select p.*, s.username from parsed_posts p join parser_sources s on s.id = p.source_id where p.id = $1',
    [req.params.id],
  );
  if (!src) throw httpError('Пост не найден', 404);
  if (src.draft_post_id) {
    const { rowCount } = await q('select 1 from posts where id = $1', [src.draft_post_id]);
    if (rowCount) throw httpError('Черновик из этого поста уже создан', 409);
  }

  const addSource = req.body?.add_source !== false;
  if (!src.text.trim() && !addSource) throw httpError('В посте нет текста: включите «Указать источник» или выберите другой пост');
  const fit = fitPost(src.text, src.post_url, { hasPhoto: Boolean(src.photo_url), addSource });
  const warnings = [...fit.notes];

  let mediaUrl = null;
  if (src.photo_url && !fit.dropPhoto && isTelegramCdn(src.photo_url)) {
    try {
      mediaUrl = await saveRemoteImage(src.photo_url); // скачиваем к себе: ссылки CDN со временем протухают
    } catch (e) {
      warnings.push(`Картинку скачать не удалось (${e.message}), пост создан без неё`);
    }
  }
  // заголовок виден только вам: первая строка текста
  const firstLine = src.text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const title = (firstLine || `Пост из @${src.username}`).slice(0, 80);

  const { rows: [draft] } = await q(
    `insert into posts (channel_id, title, content, media_url, status, created_by)
     values ($1, $2, $3, $4, 'draft', $5) returning id`,
    [channelId, title, fit.content, mediaUrl, req.user.id],
  );
  await q('update parsed_posts set draft_post_id = $2 where id = $1', [src.id, draft.id]);
  res.status(201).json({ draft_id: draft.id, warnings });
});

export default r;
