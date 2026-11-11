import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { q } from './db.js';
import { isTelegramCdn } from './tgparse.js';

// В Docker каталог монтируется как volume (UPLOAD_DIR=/data/uploads)
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './data/uploads');
export const URL_PREFIX = '/api/uploads/';
export const NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

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

function imageExt(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** Скачивает картинку с CDN Telegram и сохраняет как загрузку; возвращает media_url вида /api/uploads/<имя>. */
export async function saveRemoteImage(url) {
  if (!isTelegramCdn(url)) throw new Error('недопустимый адрес картинки');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) throw new Error('файл больше 10 МБ');
  const ext = imageExt(buf);
  if (!ext) throw new Error('это не изображение');
  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return URL_PREFIX + name;
}
