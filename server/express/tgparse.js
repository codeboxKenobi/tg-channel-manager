// Разбор публичной веб-версии канала https://t.me/s/<username> и подготовка текста для черновика.

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decode(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return m;
      }
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

/** "@name", "t.me/name", "https://t.me/s/name?before=5" → "name"; иначе null */
export function normalizeUsername(input) {
  let s = String(input ?? '').trim();
  s = s.replace(/^https?:\/\//i, '').replace(/^(t\.me|telegram\.me)\//i, '').replace(/^s\//, '').replace(/^@/, '');
  s = s.split(/[/?#]/)[0];
  return /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(s) ? s : null;
}

/** Картинки берём только с CDN Telegram (защита от SSRF при скачивании). */
export const isTelegramCdn = (url) =>
  /^https:\/\/([a-z0-9-]+\.)*(telesco\.pe|cdn-telegram\.org|telegram-cdn\.org|telegram\.org|t\.me)\//i.test(url ?? '');

function linkToText(href, inner) {
  const text = inner.replace(/<[^>]+>/g, '');
  const url = decode(href);
  const t = text.trim();
  if (!/^https?:\/\//i.test(url) || /^[@#$]/.test(t) || url.includes(t) || t.includes(url)) return text;
  return `${text} (${url})`;
}

function htmlToText(html) {
  const s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\s[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => linkToText(href, inner))
    .replace(/<[^>]+>/g, '');
  return decode(s).replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// текст сообщения: блок с классом js-message_text (в ответах на сообщения класс другой — js-message_reply_text)
function extractText(chunk) {
  const at = chunk.indexOf('class="tgme_widget_message_text js-message_text');
  if (at < 0) return '';
  const open = chunk.indexOf('>', at) + 1;
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = open;
  let depth = 1;
  let m;
  while ((m = re.exec(chunk))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return htmlToText(chunk.slice(open, m.index));
  }
  return htmlToText(chunk.slice(open));
}

function parseViews(s) {
  const m = String(s ?? '').trim().match(/^([\d.,]+)\s*([KkMm]?)$/);
  if (!m) return null;
  const mult = { '': 1, k: 1e3, m: 1e6 }[m[2].toLowerCase()];
  return Math.round(parseFloat(m[1].replace(',', '.')) * mult);
}

export function parseChannelHtml(html) {
  const titleRaw =
    html.match(/tgme_channel_info_header_title[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ??
    html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ??
    '';
  const title = decode(titleRaw.replace(/<[^>]+>/g, '')).trim();

  const posts = [];
  for (const chunk of html.split('<div class="tgme_widget_message_wrap').slice(1)) {
    const id = chunk.match(/data-post="[^"/]+\/(\d+)"/)?.[1];
    if (!id) continue;
    const text = extractText(chunk);
    const photoRaw = chunk.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/)?.[1];
    const photo = photoRaw && isTelegramCdn(decode(photoRaw)) ? decode(photoRaw) : null;
    if (!text && !photo) continue;
    const when = chunk.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    const date = when ? new Date(when) : null;
    posts.push({
      id: Number(id),
      text,
      photo,
      postedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      views: parseViews(chunk.match(/tgme_widget_message_views">([^<]+)</)?.[1]),
    });
  }
  return { title, posts };
}

/** Собирает текст черновика с учётом лимитов Telegram: 4096 символов, а с картинкой подпись — 1024. */
export function fitPost(text, sourceUrl, { hasPhoto, addSource }) {
  const tail = addSource ? `Источник: ${sourceUrl}` : '';
  const body = text.trim();
  const notes = [];
  const join = (b) => [b, tail].filter(Boolean).join('\n\n');

  let dropPhoto = false;
  let limit = hasPhoto ? 1024 : 4096;
  if (hasPhoto && join(body).length > 1024) {
    dropPhoto = true;
    limit = 4096;
    notes.push('Текст длиннее 1024 символов, поэтому картинка не добавлена (лимит подписи к фото в Telegram)');
  }
  let b = body;
  if (join(b).length > limit) {
    b = b.slice(0, Math.max(0, limit - tail.length - 4)).trimEnd() + '…';
    notes.push('Текст сокращён до лимита Telegram');
  }
  return { content: join(b), dropPhoto, notes };
}
