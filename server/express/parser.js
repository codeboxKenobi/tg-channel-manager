import cron from 'node-cron';
import { q } from './db.js';
import { httpError } from './http.js';
import { parseChannelHtml } from './tgparse.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Одна страница ленты канала (веб-версия t.me/s/<name>); before — id поста, старше которого нужны записи. */
export async function fetchChannelPage(username, before) {
  const url = `https://t.me/s/${username}${before ? `?before=${before}` : ''}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw httpError(`Не удалось связаться с Telegram: ${e.cause?.code || e.message}`, 502);
  }
  if (!res.ok) throw httpError(`Telegram ответил ${res.status}`, 502);
  const html = await res.text();
  // у несуществующих каналов и каналов без веб-просмотра t.me/s перенаправляет на обычную страницу
  if (!res.url.includes('/s/') || !html.includes('tgme_channel_history')) {
    throw httpError('Канал не найден или у него отключён веб-просмотр. Парсер читает только публичные каналы.', 404);
  }
  return parseChannelHtml(html);
}

/** Сохраняет посты; возвращает число новых (у уже известных обновляются только просмотры). */
export async function savePosts(source, posts) {
  let added = 0;
  for (const p of posts) {
    const { rows } = await q(
      `insert into parsed_posts (source_id, tg_message_id, text, photo_url, post_url, posted_at, views)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (source_id, tg_message_id) do update set views = excluded.views
       returning (xmax = 0) as inserted`,
      [source.id, p.id, p.text, p.photo, `https://t.me/${source.username}/${p.id}`, p.postedAt, p.views],
    );
    if (rows[0].inserted) added++;
  }
  return added;
}

/** Парсит pages страниц (≈20 постов каждая), начиная с самых свежих. */
export async function parseSource(source, pages = 1, firstPage = null) {
  let before = null;
  let total = 0;
  let added = 0;
  let title = source.title;
  try {
    for (let i = 0; i < pages; i++) {
      const page = i === 0 && firstPage ? firstPage : await fetchChannelPage(source.username, before);
      if (i === 0 && page.title) title = page.title;
      if (!page.posts.length) break;
      added += await savePosts(source, page.posts);
      total += page.posts.length;
      before = Math.min(...page.posts.map((p) => p.id));
      if (i < pages - 1) await sleep(700);
    }
    await q('update parser_sources set title = $2, last_parsed_at = now(), last_error = null where id = $1', [source.id, title]);
    return { total, added };
  } catch (e) {
    await q('update parser_sources set last_error = $2 where id = $1', [source.id, e.message]);
    throw e;
  }
}

export async function refreshAll(pages = 1) {
  const { rows } = await q('select * from parser_sources order by id');
  const result = [];
  for (const s of rows) {
    try {
      result.push({ id: s.id, username: s.username, ...(await parseSource(s, pages)) });
    } catch (e) {
      result.push({ id: s.id, username: s.username, error: e.message });
    }
    await sleep(800);
  }
  return result;
}

// Автообновление раз в час (отключается PARSER_AUTO=false). globalThis — чтобы в dev задача не дублировалась.
if (process.env.PARSER_AUTO !== 'false' && !globalThis.__tgmParserCron) {
  globalThis.__tgmParserCron = cron.schedule('17 * * * *', () =>
    refreshAll().catch((e) => console.error('Парсер:', e.message)),
  );
}
