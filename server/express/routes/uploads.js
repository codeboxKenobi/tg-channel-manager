import crypto from 'node:crypto';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import express, { Router } from 'express';
import { httpError } from '../http.js';
import { UPLOAD_DIR, URL_PREFIX, cleanFileName, ensureUploadDir, isDocUrl, localUpload } from '../uploads.js';

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

// Документы: PDF, TXT, Excel. Тип определяется по Content-Type, а содержимое проверяется по началу файла.
const MAX_DOC = 50 * 1024 * 1024; // лимит Bot API на отправку файла ботом
const DOC_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};
const DOC_TOO_BIG = 'Файл больше 50 МБ: Telegram принимает от бота файлы до 50 МБ';
const DOC_MISMATCH = 'Содержимое файла не соответствует его типу (PDF, TXT, XLSX, XLS)';

function assertDoc(head, ext) {
  const bom = head.length >= 2 && ((head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff)); // TXT в UTF-16
  const ok =
    ext === 'pdf'
      ? head.subarray(0, 1024).includes('%PDF')
      : ext === 'xlsx'
        ? head[0] === 0x50 && head[1] === 0x4b && (head[2] === 3 || head[2] === 5) && (head[3] === 4 || head[3] === 6) // ZIP
        : ext === 'xls'
          ? head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) // OLE2
          : bom || !head.includes(0); // txt: без нулевых байтов
  if (!ok) throw httpError(DOC_MISMATCH);
}

/** Как и видео, документ пишется на диск потоком; не прошедший проверку или оборванный файл удаляется. */
async function saveDoc(req, res, ext) {
  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_DOC) throw httpError(DOC_TOO_BIG, 413);

  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  const file = path.join(UPLOAD_DIR, name);
  let size = 0;
  let head = Buffer.alloc(0);
  const guard = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (head.length < 1024) head = Buffer.concat([head, chunk.subarray(0, 1024 - head.length)]);
      cb(size > MAX_DOC ? httpError(DOC_TOO_BIG, 413) : null, chunk);
    },
  });
  try {
    await pipeline(req, guard, createWriteStream(file));
    if (!size) throw httpError('Файл пустой');
    assertDoc(head, ext);
  } catch (e) {
    await unlink(file).catch(() => {});
    throw e;
  }
  res.status(201).json({ url: URL_PREFIX + name, name: cleanFileName(req.headers['x-file-name'], ext) });
}

// Тело запроса — сам файл, Content-Type — его тип: картинка (до 10 МБ), video/mp4 или документ PDF/TXT/Excel (до 50 МБ)
r.post(
  '/',
  async (req, res, next) =>
    typeOf(req) === 'video/mp4' ? saveVideo(req, res) : DOC_TYPES[typeOf(req)] ? saveDoc(req, res, DOC_TYPES[typeOf(req)]) : next(),
  express.raw({ type: Object.keys(TYPES), limit: '10mb' }),
  async (req, res) => {
    const ext = TYPES[typeOf(req)];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) {
      throw httpError('Загрузите изображение (JPEG, PNG, WebP до 10 МБ), видео MP4 или файл PDF, TXT, Excel (до 50 МБ)', 415);
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
  res.set('X-Content-Type-Options', 'nosniff');
  if (isDocUrl(file)) res.set('Content-Disposition', 'attachment'); // документ скачивается, а не открывается на нашем домене
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Не найдено' });
  });
});

export default r;
