import crypto from 'node:crypto';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { httpError } from './http.js';
import { UPLOAD_DIR, URL_PREFIX, ensureUploadDir } from './uploads.js';

// Bot API не умеет читать чужие каналы, поэтому берём публичную веб-версию https://t.me/s/<username>
// (работает только для публичных каналов с @username и включённым веб-просмотром).

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const PAGE_SIZE = 20; // t.me/s отдаёт ~20 сообщений на страницу
const PAUSE_MS = 400; // пауза между страницами, чтобы не получить 429
const MAX_LIMIT = 300;
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
// картинки берём только с CDN Telegram
const CDN_RE = /(^|\.)(cdn-telegram\.org|telesco\.pe|telegram\.org|t\.me)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @username, username, t.me/username, https://t.me/s/username?before=1 → username (нижний регистр). */
export function normalizeChannel(input) {
  let s = String(input ?? '').trim();
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?(?:t|telegram)\.me\/(.+)$/i);
  if (m) {
    s = m[1];
    if (/^(\+|joinchat\/)/i.test(s)) throw httpError('Ссылки-приглашения не подходят: нужен публичный канал с @username');
    s = s.replace(/^s\//i, '').split(/[/?#]/)[0];
  }
  s = s.replace(/^@/, '');
  if (!USERNAME_RE.test(s)) throw httpError('Укажите @username публичного канала (латиница, цифры и _, 4–32 символа)');
  return s.toLowerCase();
}

export const clampLimit = (n) => Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(n)) || PAGE_SIZE));

// ---------- разбор HTML ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(n);
      } catch {
        return m;
      }
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** Содержимое <div> до парного закрывающего тега (openEnd — индекс сразу после открывающего тега). */
function divInner(html, openEnd) {
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = openEnd;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(openEnd, m.index);
  }
  return html.slice(openEnd);
}

/** HTML поста → простой текст: <br> в переводы строк, ссылки с «спрятанным» адресом — «текст (url)». */
export function htmlToText(html) {
  let s = html.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, '');
    const url = decode(href);
    if (!/^https?:\/\//i.test(url)) return label; // #хештеги и прочие относительные ссылки
    const bare = (x) => x.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
    const shown = bare(decode(label).trim().replace(/^[@#]/, ''));
    return shown && bare(url).includes(shown) ? label : `${label} (${href})`;
  });
  s = s.replace(/<[^>]+>/g, ''); // теги убираем до декодирования, иначе «&lt;b&gt;» превратится в тег
  return decode(s)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const TLDS = 'com|ru|org|net|me|info|su|ua|by|kz|xyz|site|online|link|рф';
const LINK_RES = [
  /\s*\(\s*(?:https?:\/\/|tg:\/\/)[^\s)]+\s*\)/gi, // «текст (https://…)», как их делает htmlToText
  /(?:https?:\/\/|tg:\/\/|www\.)\S+/gi,
  /\b(?:t\.me|telegram\.me|telegra\.ph)\/\S*/gi,
  new RegExp(`\\b(?:[a-z0-9-]+\\.)+(?:${TLDS})\\b(?:\\/\\S*)?`, 'gi'), // голые домены: example.com/page
];
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MENTION_RE = /(?<![\w.])@[A-Za-z][A-Za-z0-9_]{3,31}\b/g;

/**
 * Убирает из текста всё, что указывает на источник: ссылки, домены, t.me, e-mail и @упоминания.
 * Строки, которые после этого остались пустыми или только со значками (например «👉 @channel»), удаляются.
 */
export function stripLinks(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    let s = line.replace(EMAIL_RE, '');
    for (const re of LINK_RES) s = s.replace(re, '');
    s = s.replace(MENTION_RE, '');
    if (s === line) {
      out.push(line);
      continue;
    }
    s = s.replace(/[ \t]{2,}/g, ' ').trim();
    if (/^[\p{P}\p{S}\s]*$/u.test(s)) continue; // от строки ничего не осталось
    out.push(s.replace(/\s*[:\-–—|·•]+$/u, '').replace(/^[\-–—|·•:]+\s*/u, ''));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function isTelegramCdn(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && CDN_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Разбирает одну страницу t.me/s/<username>.
 * ids — id всех сообщений страницы (нужны для пагинации), posts — только сообщения с текстом.
 */
export function parsePage(html, username) {
  const header = html.match(/tgme_channel_info_header_title[^>]*>([\s\S]*?)<\/div>/);
  const og = html.match(/<meta property="og:title" content="([^"]*)"/);
  const title = header ? htmlToText(header[1]) : og ? decode(og[1]).trim() : null;
  const isChannel = html.includes('tgme_channel_info') || html.includes('tgme_widget_message');

  const ids = [];
  const posts = [];
  for (const chunk of html.split(/<div class="tgme_widget_message_wrap\b/).slice(1)) {
    const ref = chunk.match(/data-post="([^"]+)"/)?.[1];
    if (!ref) continue;
    const [owner, rawId] = ref.split('/');
    const id = Number(rawId);
    if (owner.toLowerCase() !== username || !Number.isInteger(id)) continue;
    ids.push(id);

    const textTag = /<div class="[^"]*\bjs-message_text\b[^"]*"[^>]*>/.exec(chunk);
    const content = textTag ? htmlToText(divInner(chunk, textTag.index + textTag[0].length)) : '';
    if (!content) continue; // фото/видео без подписи в черновик не превратить — текст обязателен

    const photo = chunk.match(/tgme_widget_message_photo_wrap[^>]*?style="[^"]*?background-image:\s*url\((['"]?)([^'")]+)\1\)/);
    const mediaUrl = photo ? decode(photo[2]) : null;
    const date = chunk.match(/<time[^>]*\bdatetime="([^"]+)"/)?.[1];
    const posted = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null;

    posts.push({ id, content, media_url: mediaUrl && isTelegramCdn(mediaUrl) ? mediaUrl : null, posted_at: posted });
  }
  return { title, isChannel, ids, posts };
}

// ---------- сеть ----------

async function fetchPage(username, before) {
  const url = `https://t.me/s/${username}${before ? `?before=${before}` : ''}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8' },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    throw httpError(`Не удалось загрузить t.me: ${e.cause?.code || e.cause?.message || e.message}`, 502);
  }
  if (res.status === 429) throw httpError('Telegram просит подождать (429). Повторите позже', 429);
  if (!res.ok) throw httpError(`t.me ответил ${res.status}`, 502);
  // для несуществующих каналов и каналов без веб-просмотра t.me/s/… перенаправляет на t.me/…
  if (!new URL(res.url).pathname.startsWith('/s/')) {
    throw httpError('Канал не найден или у него отключён публичный просмотр', 404);
  }
  return res.text();
}

/** Читает последние `limit` сообщений канала (с пагинацией назад по ?before=). */
export async function scrapeChannel(username, { limit = PAGE_SIZE } = {}) {
  const found = new Map();
  let title = null;
  let seen = 0;
  let before = null;

  for (let page = 0; seen < limit && page < Math.ceil(MAX_LIMIT / PAGE_SIZE); page++) {
    if (page) await sleep(PAUSE_MS);
    const parsed = parsePage(await fetchPage(username, before), username);
    if (!page) {
      if (!parsed.isChannel) throw httpError('Канал не найден или у него отключён публичный просмотр', 404);
      title = parsed.title;
    }
    if (!parsed.ids.length) break;
    seen += parsed.ids.length;
    for (const p of parsed.posts) found.set(p.id, p);
    const oldest = Math.min(...parsed.ids);
    if (oldest <= 1 || (before && oldest >= before)) break;
    before = oldest;
  }
  return { title, posts: [...found.values()] };
}

/** Скачивает картинку поста в каталог загрузок приложения (CDN-ссылки со временем протухают). */
export async function downloadImage(url) {
  if (!isTelegramCdn(url)) throw new Error('Недопустимый адрес картинки');
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Картинка недоступна (${res.status})`);
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[(res.headers.get('content-type') || '').split(';')[0].trim()];
  if (!ext) throw new Error('Неподдерживаемый тип картинки');
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.length > 10 * 1024 * 1024) throw new Error('Картинка пустая или больше 10 МБ');
  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return URL_PREFIX + name;
}
