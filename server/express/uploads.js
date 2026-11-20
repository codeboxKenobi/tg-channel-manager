import path from 'node:path';
import { mkdir, unlink } from 'node:fs/promises';
import { q } from './db.js';

// В Docker каталог монтируется как volume (UPLOAD_DIR=/data/uploads)
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './data/uploads');
export const URL_PREFIX = '/api/uploads/';
export const NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp|mp4|pdf|txt|xlsx|xls)$/;

/** Видео определяем по расширению: наши загрузки всегда называются <hash>.<ext>. */
export const isVideoUrl = (url) => /\.mp4(?:[?#].*)?$/i.test(url ?? '');

/** Документы (файлы-вложения): PDF, TXT, Excel. */
export const DOC_EXTS = ['pdf', 'txt', 'xlsx', 'xls'];
export const isDocUrl = (url) => /\.(pdf|txt|xlsx|xls)(?:[?#].*)?$/i.test(url ?? '');

/** Безопасное имя файла для показа и для Telegram: без путей и служебных символов, с расширением ext. */
export function cleanFileName(raw, ext) {
  let s = String(raw ?? '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* имя пришло не в percent-кодировке: берём как есть */
  }
  s = s.replace(/[\u0000-\u001f\u007f\\/:*?"<>|]+/g, '_').replace(/^[.\s]+|\s+$/g, '');
  const tail = new RegExp(`\\.${ext}$`, 'i');
  const base = s.replace(tail, '').slice(0, 100).trim();
  return `${base || 'file'}.${ext}`;
}

export const ensureUploadDir = () => mkdir(UPLOAD_DIR, { recursive: true });

/** Абсолютный путь файла, если media_url указывает на загруженную картинку, иначе null. */
export function localUpload(mediaUrl) {
  if (!mediaUrl?.startsWith(URL_PREFIX)) return null;
  const name = mediaUrl.slice(URL_PREFIX.length);
  return NAME_RE.test(name) ? path.join(UPLOAD_DIR, name) : null;
}

/** Удаляет файл, если на него больше не ссылается ни один пост. */
export async function removeUploadIfUnused(mediaUrl) {
  const file = localUpload(mediaUrl);
  if (!file) return;
  const { rowCount } = await q('select 1 from posts where media_url = $1 limit 1', [mediaUrl]);
  if (!rowCount) await unlink(file).catch(() => {});
}
