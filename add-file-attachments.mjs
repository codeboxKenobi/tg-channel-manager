#!/usr/bin/env node
// Добавляет прикрепление ФАЙЛОВ к посту в tg-channel-manager: PDF, TXT и Excel (.xlsx, .xls) до 50 МБ.
// Файл загружается с устройства в форме поста, сохраняется с исходным именем и уходит в канал как документ (sendDocument)
// вместе с текстом поста в подписи (до 1024 символов). Картинка/видео и файл взаимоисключающи: у поста одно вложение.
//
// Запуск из корня проекта:  node add-file-attachments.mjs [путь/к/проекту]
//
// Всё или ничего: если хотя бы один якорь не найден (файл отличается от ожидаемого), ничего не меняется.
// Повторный запуск безопасен (уже применённые правки пропускаются). Копии изменяемых файлов: *.bak-files.
// Изменение схемы БД: одна колонка posts.media_name (добавляется автоматически при старте через schema.js, `npm run migrate` тоже подойдёт).
// Новых зависимостей нет. Лимит nginx client_max_body_size 50m уже нужен для видео.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);
const read = (f) => fs.readFileSync(p(f), 'utf8');

// Каждая правка: [старый текст (ровно одно вхождение), новый текст]. Если новый текст уже в файле — правка считается применённой.
const EDITS = {
  // ───────────── сервер ─────────────
  'server/express/schema.js': [
    [
      "alter table users add column if not exists lang text not null default 'ru';\n",
      "alter table users add column if not exists lang text not null default 'ru';\n\n-- исходное имя прикреплённого файла (PDF, TXT, Excel): под ним файл попадает в Telegram и показывается в интерфейсе\nalter table posts add column if not exists media_name text;\n",
    ],
  ],

  'server/express/uploads.js': [
    [
      'export const NAME_RE = /^[a-f0-9]{32}\\.(jpg|png|webp|mp4)$/;',
      'export const NAME_RE = /^[a-f0-9]{32}\\.(jpg|png|webp|mp4|pdf|txt|xlsx|xls)$/;',
    ],
    [
      "export const isVideoUrl = (url) => /\\.mp4(?:[?#].*)?$/i.test(url ?? '');\n",
      `export const isVideoUrl = (url) => /\\.mp4(?:[?#].*)?$/i.test(url ?? '');

/** Документы (файлы-вложения): PDF, TXT, Excel. */
export const DOC_EXTS = ['pdf', 'txt', 'xlsx', 'xls'];
export const isDocUrl = (url) => /\\.(pdf|txt|xlsx|xls)(?:[?#].*)?$/i.test(url ?? '');

/** Безопасное имя файла для показа и для Telegram: без путей и служебных символов, с расширением ext. */
export function cleanFileName(raw, ext) {
  let s = String(raw ?? '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* имя пришло не в percent-кодировке: берём как есть */
  }
  s = s.replace(/[\\u0000-\\u001f\\u007f\\\\/:*?"<>|]+/g, '_').replace(/^[.\\s]+|\\s+$/g, '');
  const tail = new RegExp(\`\\\\.\${ext}$\`, 'i');
  const base = s.replace(tail, '').slice(0, 100).trim();
  return \`\${base || 'file'}.\${ext}\`;
}
`,
    ],
  ],

  'server/express/routes/uploads.js': [
    [
      "import { UPLOAD_DIR, URL_PREFIX, ensureUploadDir, localUpload } from '../uploads.js';",
      "import { UPLOAD_DIR, URL_PREFIX, cleanFileName, ensureUploadDir, isDocUrl, localUpload } from '../uploads.js';",
    ],
    [
      '// Тело запроса — сам файл, Content-Type — его тип: картинка (до 10 МБ) или video/mp4 (до 50 МБ)\n',
      `// Документы: PDF, TXT, Excel. Тип определяется по Content-Type, а содержимое проверяется по началу файла.
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
  const name = \`\${crypto.randomBytes(16).toString('hex')}.\${ext}\`;
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
`,
    ],
    [
      "async (req, res, next) => (typeOf(req) === 'video/mp4' ? saveVideo(req, res) : next()),",
      "async (req, res, next) =>\n    typeOf(req) === 'video/mp4' ? saveVideo(req, res) : DOC_TYPES[typeOf(req)] ? saveDoc(req, res, DOC_TYPES[typeOf(req)]) : next(),",
    ],
    [
      "'Загрузите изображение (JPEG, PNG, WebP до 10 МБ) или видео MP4 (до 50 МБ)'",
      "'Загрузите изображение (JPEG, PNG, WebP до 10 МБ), видео MP4 или файл PDF, TXT, Excel (до 50 МБ)'",
    ],
    [
      "  res.set('Cache-Control', 'private, max-age=86400, immutable');\n",
      "  res.set('Cache-Control', 'private, max-age=86400, immutable');\n  res.set('X-Content-Type-Options', 'nosniff');\n  if (isDocUrl(file)) res.set('Content-Disposition', 'attachment'); // документ скачивается, а не открывается на нашем домене\n",
    ],
  ],

  'server/express/routes/posts.js': [
    [
      "import { localUpload, removeUploadIfUnused } from '../uploads.js';",
      "import { cleanFileName, isDocUrl, localUpload, removeUploadIfUnused } from '../uploads.js';",
    ],
    [
      "const { channel_id, title, content, media_url, parse_mode, scheduled_at } = body ?? {};",
      "const { channel_id, title, content, media_url, media_name, parse_mode, scheduled_at } = body ?? {};",
    ],
    [
      "throw httpError(media_url ? 'Подпись к фото или видео — не более 1024 символов' : 'Текст — не более 4096 символов');",
      "throw httpError(media_url ? 'Подпись к фото, видео или файлу — не более 1024 символов' : 'Текст — не более 4096 символов');",
    ],
    [
      "    media_url: media_url || null,\n    parse_mode: parse_mode || null,",
      "    media_url: media_url || null,\n    // имя файла храним только у загруженных документов\n    media_name: media_url && localUpload(media_url) && isDocUrl(media_url) ? cleanFileName(media_name, media_url.split('.').pop().toLowerCase()) : null,\n    parse_mode: parse_mode || null,",
    ],
    [
      "`insert into posts (channel_id, title, content, media_url, parse_mode, scheduled_at, status, created_by)\n     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,\n    [p.channel_id, p.title, p.content, p.media_url, p.parse_mode, p.scheduled_at, p.status, req.user.id],",
      "`insert into posts (channel_id, title, content, media_url, media_name, parse_mode, scheduled_at, status, created_by)\n     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,\n    [p.channel_id, p.title, p.content, p.media_url, p.media_name, p.parse_mode, p.scheduled_at, p.status, req.user.id],",
    ],
    [
      "`update posts set channel_id = $2, title = $3, content = $4, media_url = $5, parse_mode = $6,\n            scheduled_at = $7, status = $8, error = null, updated_at = now()\n     where id = $1 returning *`,\n    [req.params.id, p.channel_id, p.title, p.content, p.media_url, p.parse_mode, p.scheduled_at, p.status],",
      "`update posts set channel_id = $2, title = $3, content = $4, media_url = $5, media_name = $6, parse_mode = $7,\n            scheduled_at = $8, status = $9, error = null, updated_at = now()\n     where id = $1 returning *`,\n    [req.params.id, p.channel_id, p.title, p.content, p.media_url, p.media_name, p.parse_mode, p.scheduled_at, p.status],",
    ],
  ],

  'server/express/bot.js': [
    [
      "import { isVideoUrl, localUpload } from './uploads.js';",
      "import { DOC_EXTS, isDocUrl, isVideoUrl, localUpload } from './uploads.js';",
    ],
    [
      "const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' };",
      "const MIME = {\n  jpg: 'image/jpeg',\n  png: 'image/png',\n  webp: 'image/webp',\n  mp4: 'video/mp4',\n  pdf: 'application/pdf',\n  txt: 'text/plain',\n  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',\n  xls: 'application/vnd.ms-excel',\n};",
    ],
    [
      "/** Фото или видео (.mp4) из файла: multipart с известной длиной (как у curl), без потоковой передачи. */\nasync function sendMediaFile(token, chatId, file, { caption, parse_mode, reply_markup }) {",
      "/** Фото, видео (.mp4) или документ (PDF, TXT, Excel) из файла: multipart с известной длиной (как у curl), без потоковой передачи. */\nasync function sendMediaFile(token, chatId, file, { caption, parse_mode, reply_markup, filename }) {",
    ],
    [
      "  const video = ext === 'mp4';\n  if (video) form.append('supports_streaming', 'true');\n  form.append(video ? 'video' : 'photo', new Blob([await readFile(file)], { type: MIME[ext] || 'image/jpeg' }), path.basename(file));",
      "  const video = ext === 'mp4';\n  const doc = DOC_EXTS.includes(ext);\n  const kind = doc ? 'document' : video ? 'video' : 'photo';\n  if (video) form.append('supports_streaming', 'true');\n  // у документа в Telegram показывается имя файла: берём исходное имя, а не хеш\n  form.append(kind, new Blob([await readFile(file)], { type: MIME[ext] || 'image/jpeg' }), doc && filename ? filename : path.basename(file));",
    ],
    [
      "    res = await fetch(`https://api.telegram.org/bot${token}/${video ? 'sendVideo' : 'sendPhoto'}`, {\n      method: 'POST',\n      body: form,\n      signal: AbortSignal.timeout(video ? 300_000 : 60_000),",
      "    res = await fetch(`https://api.telegram.org/bot${token}/${doc ? 'sendDocument' : video ? 'sendVideo' : 'sendPhoto'}`, {\n      method: 'POST',\n      body: form,\n      signal: AbortSignal.timeout(video || doc ? 300_000 : 60_000),",
    ],
    [
      "throw new Error(`Не удалось отправить ${video ? 'видео' : 'фото'}: ${redact(e.cause?.code || e.cause?.message || e.message)}`);",
      "throw new Error(`Не удалось отправить ${doc ? 'файл' : video ? 'видео' : 'фото'}: ${redact(e.cause?.code || e.cause?.message || e.message)}`);",
    ],
    [
      "return sendMediaFile(conn.token, post.tg_chat_id, file, { caption: post.content, ...parse, reply_markup: keyboard.reply_markup });",
      "return sendMediaFile(conn.token, post.tg_chat_id, file, { caption: post.content, ...parse, reply_markup: keyboard.reply_markup, filename: post.media_name });",
    ],
    [
      "const send = isVideoUrl(post.media_url) ? 'sendVideo' : 'sendPhoto';",
      "const send = isDocUrl(post.media_url) ? 'sendDocument' : isVideoUrl(post.media_url) ? 'sendVideo' : 'sendPhoto';",
    ],
  ],

  // ───────────── клиент ─────────────
  'utils/media.ts': [
    [
      "export const isVideoUrl = (url?: string | null): boolean => /\\.mp4(?:[?#].*)?$/i.test(url ?? '')\n",
      `export const isVideoUrl = (url?: string | null): boolean => /\\.mp4(?:[?#].*)?$/i.test(url ?? '')

/** Файл-вложение (PDF, TXT, Excel) определяем по расширению ссылки (загрузки приложения называются <hash>.<ext>). */
export const isDocUrl = (url?: string | null): boolean => /\\.(pdf|txt|xlsx|xls)(?:[?#].*)?$/i.test(url ?? '')

const DOC_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
}

/** Content-Type для загрузки документа по расширению имени (браузеры часто не заполняют type у xlsx/txt); null — это не документ. */
export const docTypeOf = (f: File): string | null => DOC_TYPES[f.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
`,
    ],
  ],

  'utils/upload.ts': [
    [
      "export function uploadFile(file: Blob, contentType: string, onProgress?: (percent: number) => void): Promise<{ url: string }> {",
      "export function uploadFile(file: Blob, contentType: string, onProgress?: (percent: number) => void, fileName?: string): Promise<{ url: string; name?: string }> {",
    ],
    [
      "    xhr.setRequestHeader('Content-Type', contentType)\n",
      "    xhr.setRequestHeader('Content-Type', contentType)\n    if (fileName) xhr.setRequestHeader('X-File-Name', encodeURIComponent(fileName)) // исходное имя документа\n",
    ],
  ],

  'components/PostForm.vue': [
    [
      "  media_url: (props.post?.media_url ?? '') as string,\n",
      "  media_url: (props.post?.media_url ?? '') as string,\n  media_name: (props.post?.media_name ?? '') as string,\n",
    ],
    [
      "const isVideo = computed(() => isVideoUrl(form.media_url))\n",
      "const isVideo = computed(() => isVideoUrl(form.media_url))\nconst isDoc = computed(() => isDocUrl(form.media_url))\n",
    ],
    [
      "    if (looksLikeVideo(file)) {\n",
      `    const docType = docTypeOf(file)
    if (docType) {
      // PDF, TXT, Excel: уходит как есть, вместе с исходным именем
      if (!file.size) throw new Error(t('post.err.empty'))
      if (file.size > MAX_VIDEO_BYTES) throw new Error(t('post.err.fileTooBig', { mb: Math.ceil(file.size / 1048576) }))
      const res = await uploadFile(file, docType, (p) => (progress.value = p), file.name)
      form.media_url = res.url
      form.media_name = res.name || file.name
    } else if (looksLikeVideo(file)) {
`,
    ],
    [
      "      form.media_url = (await uploadFile(file, 'video/mp4', (p) => (progress.value = p))).url\n",
      "      form.media_url = (await uploadFile(file, 'video/mp4', (p) => (progress.value = p))).url\n      form.media_name = ''\n",
    ],
    [
      "      form.media_url = url\n",
      "      form.media_url = url\n      form.media_name = ''\n",
    ],
    [
      "    media_url: form.media_url || null,\n",
      "    media_url: form.media_url || null,\n    media_name: form.media_name || null,\n",
    ],
    [
      `<input v-else :value="isVideo ? t('post.videoSaved') : t('post.uploadedFromDevice')" readonly disabled />`,
      `<input v-else :value="isDoc ? form.media_name || t('post.fileSaved') : isVideo ? t('post.videoSaved') : t('post.uploadedFromDevice')" readonly disabled />`,
    ],
    [
      `accept="image/*,video/mp4,.mp4"`,
      `accept="image/*,video/mp4,.mp4,.pdf,.txt,.xlsx,.xls,application/pdf,text/plain"`,
    ],
    [
      `@click="form.media_url = ''">{{ isVideo ? t('post.removeVideo') : t('post.removeImage') }}</button>`,
      `@click="form.media_url = ''; form.media_name = ''">{{ isDoc ? t('post.removeFile') : isVideo ? t('post.removeVideo') : t('post.removeImage') }}</button>`,
    ],
    [
      `        <img v-else-if="showPreview" :key="form.media_url"`,
      `        <a v-else-if="showPreview && isDoc" :key="form.media_url" :href="form.media_url" :download="form.media_name || true" class="file-chip">📎 {{ form.media_name || t('post.file') }}</a>
        <img v-else-if="showPreview" :key="form.media_url"`,
    ],
  ],

  'pages/drafts.vue': [
    [
      `<video v-if="isVideoUrl(p.media_url)" :src="p.media_url"`,
      `<a v-if="isDocUrl(p.media_url)" :href="p.media_url" :download="p.media_name || true" class="file-chip">📎 {{ p.media_name || t('post.file') }}</a>
      <video v-else-if="isVideoUrl(p.media_url)" :src="p.media_url"`,
    ],
  ],

  'pages/published.vue': [
    [
      `<video v-if="isVideoUrl(p.media_url)" :src="p.media_url"`,
      `<a v-if="isDocUrl(p.media_url)" :href="p.media_url" :download="p.media_name || true" class="file-chip">📎 {{ p.media_name || t('post.file') }}</a>
      <video v-else-if="isVideoUrl(p.media_url)" :src="p.media_url"`,
    ],
  ],

  'assets/main.css': [
    [
      '.thumb { display: block; max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid var(--line); margin: var(--s-2) 0; }\n',
      '.thumb { display: block; max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid var(--line); margin: var(--s-2) 0; }\n.file-chip { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--line); margin: var(--s-2) 0; text-decoration: none; }\n',
    ],
  ],

  // ───────────── переводы ─────────────
  'locales/ru.ts': [
    [
      "  'post.mediaLabel': 'Ссылка на изображение или видео (необязательно)',\n",
      "  'post.mediaLabel': 'Ссылка на изображение, видео или файл (необязательно)',\n  'post.file': 'Файл',\n  'post.fileSaved': 'Файл сохранён',\n  'post.removeFile': 'Убрать файл',\n",
    ],
    [
      "  'post.mediaHint': 'Картинка (JPEG, PNG, WebP) или видео MP4 до 50 МБ',",
      "  'post.mediaHint': 'Картинка (JPEG, PNG, WebP), видео MP4 или файл PDF, TXT, Excel (XLSX, XLS) до 50 МБ. У поста одно вложение',",
    ],
    [
      "  'post.err.videoTooBig': 'Видео {mb} МБ: Telegram принимает от бота файлы до 50 МБ',\n",
      "  'post.err.videoTooBig': 'Видео {mb} МБ: Telegram принимает от бота файлы до 50 МБ',\n  'post.err.fileTooBig': 'Файл {mb} МБ: Telegram принимает от бота файлы до 50 МБ',\n",
    ],
  ],

  'locales/en.ts': [
    [
      "  'post.mediaLabel': 'Link to an image or video (optional)',\n",
      "  'post.mediaLabel': 'Link to an image, video or file (optional)',\n  'post.file': 'File',\n  'post.fileSaved': 'File saved',\n  'post.removeFile': 'Remove file',\n",
    ],
    [
      "  'post.mediaHint': 'Image (JPEG, PNG, WebP) or MP4 video up to 50 MB',",
      "  'post.mediaHint': 'Image (JPEG, PNG, WebP), MP4 video or a PDF, TXT or Excel (XLSX, XLS) file up to 50 MB. A post has one attachment',",
    ],
    [
      "  'post.err.videoTooBig': 'The video is {mb} MB: Telegram accepts files up to 50 MB from a bot',\n",
      "  'post.err.videoTooBig': 'The video is {mb} MB: Telegram accepts files up to 50 MB from a bot',\n  'post.err.fileTooBig': 'The file is {mb} MB: Telegram accepts files up to 50 MB from a bot',\n",
    ],
  ],

  'locales/server-errors.ts': [
    [
      "    'Подпись к фото или видео — не более 1024 символов': 'A photo or video caption can be at most 1024 characters',",
      "    'Подпись к фото, видео или файлу — не более 1024 символов': 'A photo, video or file caption can be at most 1024 characters',",
    ],
    [
      "    'Загрузите изображение (JPEG, PNG, WebP до 10 МБ) или видео MP4 (до 50 МБ)': 'Upload an image (JPEG, PNG, WebP up to 10 MB) or an MP4 video (up to 50 MB)',\n",
      "    'Загрузите изображение (JPEG, PNG, WebP до 10 МБ), видео MP4 или файл PDF, TXT, Excel (до 50 МБ)': 'Upload an image (JPEG, PNG, WebP up to 10 MB), an MP4 video or a PDF, TXT or Excel file (up to 50 MB)',\n    'Файл больше 50 МБ: Telegram принимает от бота файлы до 50 МБ': 'The file is larger than 50 MB: Telegram accepts files up to 50 MB from a bot',\n    'Содержимое файла не соответствует его типу (PDF, TXT, XLSX, XLS)': 'The file content does not match its type (PDF, TXT, XLSX, XLS)',\n",
    ],
    [
      "    [/^Не удалось отправить (видео|фото): (.+)$/s, (m) => `Could not send the ${m[1] === 'видео' ? 'video' : 'photo'}: ${m[2]}`],",
      "    [/^Не удалось отправить (видео|фото|файл): (.+)$/s, (m) => `Could not send the ${m[1] === 'видео' ? 'video' : m[1] === 'файл' ? 'file' : 'photo'}: ${m[2]}`],",
    ],
  ],

  // ───────────── документация ─────────────
  'README.md': [
    [
      "Перед nginx нужен `client_max_body_size 50m`.",
      "Кроме того, к посту можно прикрепить **файл PDF, TXT или Excel (XLSX, XLS)** до 50 МБ: он уходит в канал документом с исходным именем, а текст поста становится подписью (до 1024 символов). У поста одно вложение: картинка, видео или файл. Перед nginx нужен `client_max_body_size 50m`.",
    ],
  ],
};

// ───────────── применение ─────────────
const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const problems = [];

for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(p(file))) {
    problems.push(`${file}: файл не найден (запускайте из корня проекта или укажите путь)`);
    continue;
  }
  let text = read(file);
  let changed = false;
  edits.forEach(([from, to], i) => {
    if (count(text, to) >= 1) return; // уже применено
    const n = count(text, from);
    if (n !== 1) {
      problems.push(`${file}: правка №${i + 1}: якорь найден ${n} раз(а), ожидался 1:\n    ${from.split('\n')[0].slice(0, 110)}`);
      return;
    }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}

if (problems.length) {
  console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
if (!plan.length) {
  console.log('Уже применено: изменений нет.');
  process.exit(0);
}

for (const [file, text] of plan) {
  const bak = p(file + '.bak-files');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log(`\nГотово: изменено файлов — ${plan.length}. Копии: *.bak-files.`);
console.log('Дальше: перезапустите приложение (колонка posts.media_name создастся при старте; либо выполните npm run migrate).');
