import crypto from 'node:crypto';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import express, { Router } from 'express';
import { httpError } from '../http.js';
import { UPLOAD_DIR, URL_PREFIX, ensureUploadDir, localUpload } from '../uploads.js';

const r = Router();
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_VIDEO = 50 * 1024 * 1024; // лимит Bot API на отправку файла ботом

const typeOf = (req) => String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();

// проверка сигнатуры файла, а не только заголовка Content-Type
function looksLike(buf, ext) {
  if (ext === 'jpg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === 'png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
}

// MP4: в начале файла блок ftyp. QuickTime (.mov, видео с iPhone) Telegram как видео не принимает
function assertMp4(head) {
  if (head.length < 12 || head.subarray(4, 8).toString('latin1') !== 'ftyp') throw httpError('Файл не похож на видео MP4');
  if (head.subarray(8, 12).toString('latin1') === 'qt  ') {
    throw httpError('Формат QuickTime (.mov) не поддерживается: экспортируйте видео в MP4 (H.264)');
  }
}

/**
 * Видео пишется на диск потоком, а не загружается целиком в память: до 50 МБ, несколько загрузок одновременно не страшны.
 * Файл, который не прошёл проверку или оборвался, удаляется.
 */
async function saveVideo(req, res) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_VIDEO) throw httpError('Видео больше 50 МБ: Telegram принимает от бота файлы до 50 МБ', 413);

  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.mp4`;
  const file = path.join(UPLOAD_DIR, name);
  let size = 0;
  let head = Buffer.alloc(0);
  const guard = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (head.length < 12) head = Buffer.concat([head, chunk.subarray(0, 12 - head.length)]);
      cb(size > MAX_VIDEO ? httpError('Видео больше 50 МБ: Telegram принимает от бота файлы до 50 МБ', 413) : null, chunk);
    },
  });
  try {
    await pipeline(req, guard, createWriteStream(file));
    if (!size) throw httpError('Файл пустой');
    assertMp4(head);
  } catch (e) {
    await unlink(file).catch(() => {});
    throw e;
  }
  res.status(201).json({ url: URL_PREFIX + name });
}

// Тело запроса — сам файл, Content-Type — его тип: картинка (до 10 МБ) или video/mp4 (до 50 МБ)
r.post(
  '/',
  async (req, res, next) => (typeOf(req) === 'video/mp4' ? saveVideo(req, res) : next()),
  express.raw({ type: Object.keys(TYPES), limit: '10mb' }),
  async (req, res) => {
    const ext = TYPES[typeOf(req)];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) {
      throw httpError('Загрузите изображение (JPEG, PNG, WebP до 10 МБ) или видео MP4 (до 50 МБ)', 415);
    }
    if (!looksLike(req.body, ext)) throw httpError('Файл не похож на изображение');
    await ensureUploadDir();
    const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, name), req.body);
    res.status(201).json({ url: URL_PREFIX + name });
  },
);

// Раздача только для вошедших (роутер смонтирован после requireAuth)
r.get('/:name', (req, res) => {
  const file = localUpload(URL_PREFIX + req.params.name);
  if (!file) throw httpError('Не найдено', 404);
  res.set('Cache-Control', 'private, max-age=86400, immutable');
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Не найдено' });
  });
});

export default r;
