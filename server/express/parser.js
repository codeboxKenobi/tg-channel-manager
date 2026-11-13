import crypto from 'node:crypto';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
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

// Ссылки на соцсети, мессенджеры, сокращатели и т.п.: такие строки — подписи-реклама («Мы в MAX — подписаться»)
const PROMO_HOST_RE = /(^|\.)(t\.me|telegram\.me|telegra\.ph|telegram\.org|max\.ru|vk\.com|vk\.cc|vk\.me|vkvideo\.ru|ok\.ru|youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok\.com|wa\.me|whatsapp\.com|dzen\.ru|zen\.yandex\.ru|rutube\.ru|boosty\.to|patreon\.com|bit\.ly|clck\.ru|goo\.gl|tinyurl\.com)$/i;
const MARK_RE = /\u0001([PL])([^\u0002]*)\u0002/g;

function isPromoLink(url) {
  if (!/^https?:\/\//i.test(url)) return true; // tg://, mailto: и пр.
  try {
    return PROMO_HOST_RE.test(new URL(url).hostname);
  } catch {
    return true;
  }
}

/**
 * HTML → простой текст. С mark=true ссылки не теряются, а помечаются (P — на мессенджер/соцсеть, L — на другой сайт):
 * по меткам cleanPostText решает, какие строки — реклама. Без mark остаётся только подпись ссылки.
 */
export function htmlToText(html, { mark = false } = {}) {
  let s = html.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, '');
    const url = decode(href);
    if (!mark || !/^[a-z][a-z0-9+.-]*:/i.test(url)) return label; // #хештеги и прочие относительные ссылки
    return `\u0001${isPromoLink(url) ? 'P' : 'L'}${label.replace(/[\u0001\u0002]/g, '')}\u0002`;
  });
  s = s.replace(/<[^>]+>/g, ''); // теги убираем до декодирования, иначе «&lt;b&gt;» превратится в тег
  return decode(s)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const words = (s) => s.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
const unmark = (s) => s.replace(MARK_RE, (_m, kind, label) => (kind === 'P' ? '' : label));

/**
 * Строка со ссылками — реклама, если от неё почти ничего не осталось без ссылок
 * («📢 Прямой Эфир, 💰 Деньги в эфире | Наш MAX», «Подпишись👉 CUBE.VIDEO») или это короткая строка со ссылкой на мессенджер.
 * В обычном предложении («Президент подписал указ…») остаётся подпись ссылки без самой ссылки.
 */
function promoClean(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.includes('\u0001')) {
      out.push(line);
      continue;
    }
    const plain = words(line.replace(MARK_RE, ' ').replace(HASHTAG_RE, ' '));
    const hasPromo = /\u0001P/.test(line);
    if (plain <= 2 || (hasPromo && plain <= 8)) continue;
    out.push(unmark(line).replace(/[ \t]{2,}/g, ' ').trim());
  }
  return out.join('\n');
}

const TLDS = 'com|ru|org|net|me|info|su|ua|by|kz|xyz|site|online|link|рф';
const LINK_RES = [
  /\s*\(\s*(?:https?:\/\/|tg:\/\/)[^\s)]+\s*\)/gi, // «текст (https://…)»
  /(?:https?:\/\/|tg:\/\/|www\.)\S+/gi,
  /\b(?:t\.me|telegram\.me|telegra\.ph)\/\S*/gi,
  new RegExp(`\\b(?:[a-z0-9-]+\\.)+(?:${TLDS})\\b(?:\\/\\S*)?`, 'gi'), // голые домены: example.com/page
];
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MENTION_RE = /(?<![\w.])@[A-Za-z][A-Za-z0-9_]{3,31}\b/g;
const HASHTAG_RE = /(?<![\p{L}\p{N}_&])#(?=[\p{N}_]*\p{L})[\p{L}\p{N}_]+(?:@\w+)?/gu;
const DIVIDER_RE = /^[\s\-–—_=*~•·|─━▬➖▪▫◾◽]*$/u;

/**
 * Убирает из текста всё, что указывает на источник: ссылки, домены, t.me, e-mail, @упоминания и #хештеги.
 * Строки, от которых после этого ничего не осталось (например «👉 @channel»), удаляются, как и «хвосты»-разделители.
 */
export function stripLinks(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    let s = line.replace(EMAIL_RE, '');
    for (const re of LINK_RES) s = s.replace(re, '');
    s = s.replace(MENTION_RE, '').replace(HASHTAG_RE, '');
    if (s === line) {
      out.push(line);
      continue;
    }
    s = s.replace(/[ \t]{2,}/g, ' ').trim();
    if (/^[\p{P}\p{S}\s]*$/u.test(s)) continue; // от строки ничего не осталось
    out.push(s.replace(/\s*[:\-–—|·•]+$/u, '').replace(/^[\-–—|·•:]+\s*/u, ''));
  }
  while (out.length && DIVIDER_RE.test(out[out.length - 1])) out.pop(); // остатки разделителя перед удалённой подписью
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Текст поста для сохранения: без рекламных блоков, ссылок, упоминаний и хештегов. */
export const cleanPostHtml = (html) => stripLinks(promoClean(htmlToText(html, { mark: true })));

const absolute = (u) => (u.startsWith('//') ? `https:${u}` : u);

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
    const content = textTag ? cleanPostHtml(divInner(chunk, textTag.index + textTag[0].length)) : '';
    if (!content) continue; // фото/видео без подписи в черновик не превратить — текст обязателен

    const date = chunk.match(/<time[^>]*\bdatetime="([^"]+)"/)?.[1];
    const posted = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null;

    // видео: <video src="…mp4"> (обычные, круглые, гифки); если t.me файл не отдаёт, берём только текст
    const video = absolute(decode(chunk.match(/<video\b[^>]*?\bsrc="([^"]+)"/i)?.[1] ?? ''));
    const photo = absolute(decode(chunk.match(/tgme_widget_message_photo_wrap[^>]*?style="[^"]*?background-image:\s*url\((['"]?)([^'")]+)\1\)/)?.[2] ?? ''));
    const media = isTelegramCdn(video) ? { media_url: video, media_type: 'video' } : isTelegramCdn(photo) ? { media_url: photo, media_type: 'photo' } : { media_url: null, media_type: null };

    posts.push({ id, content, ...media, posted_at: posted });
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

// тип файла → [расширение, максимальный размер в МБ]. Для видео — лимит Bot API на загрузку файла (50 МБ)
const MEDIA_TYPES = { 'image/jpeg': ['jpg', 10], 'image/png': ['png', 10], 'image/webp': ['webp', 10], 'video/mp4': ['mp4', 50] };

// проверка сигнатуры файла, а не только заголовка Content-Type
function looksLike(head, ext) {
  if (ext === 'jpg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (ext === 'png') return head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (ext === 'mp4') return head.subarray(4, 8).toString('latin1') === 'ftyp';
  return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
}

/** Скачивает фото или видео поста в каталог загрузок приложения (CDN-ссылки со временем протухают). Возвращает /api/uploads/… */
export async function downloadMedia(url) {
  if (!isTelegramCdn(url)) throw new Error('Недопустимый адрес файла');
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(180_000) });
  if (!res.ok || !res.body) throw new Error(`Файл недоступен (${res.status})`);
  const spec = MEDIA_TYPES[(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()];
  if (!spec) throw new Error('Неподдерживаемый тип файла');
  const [ext, maxMb] = spec;
  const max = maxMb * 1024 * 1024;
  if (Number(res.headers.get('content-length')) > max) throw new Error(`Файл больше ${maxMb} МБ`);

  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const file = path.join(UPLOAD_DIR, name);
  let size = 0;
  const limit = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      cb(size > max ? new Error(`Файл больше ${maxMb} МБ`) : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(res.body), limit, createWriteStream(file)); // потоком на диск, без загрузки в память
    const fh = await open(file);
    const head = Buffer.alloc(12);
    await fh.read(head, 0, 12, 0).finally(() => fh.close());
    if (!size || !looksLike(head, ext)) throw new Error('Файл повреждён или имеет другой формат');
  } catch (e) {
    await unlink(file).catch(() => {});
    throw e;
  }
  return URL_PREFIX + name;
}
