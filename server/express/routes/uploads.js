import crypto from 'node:crypto';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import express, { Router } from 'express';
import { httpError } from '../http.js';
import { UPLOAD_DIR, URL_PREFIX, ensureUploadDir, localUpload } from '../uploads.js';

const r = Router();
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// проверка сигнатуры файла, а не только заголовка Content-Type
function looksLike(buf, ext) {
  if (ext === 'jpg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === 'png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
}

// Тело запроса — сам файл, Content-Type — его тип
r.post('/', express.raw({ type: Object.keys(TYPES), limit: '10mb' }), async (req, res) => {
  const ext = TYPES[String(req.headers['content-type'] ?? '').split(';')[0].trim()];
  if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) {
    throw httpError('Загрузите изображение JPEG, PNG или WebP (до 10 МБ)', 415);
  }
  if (!looksLike(req.body, ext)) throw httpError('Файл не похож на изображение');
  await ensureUploadDir();
  const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), req.body);
  res.status(201).json({ url: URL_PREFIX + name });
});

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
