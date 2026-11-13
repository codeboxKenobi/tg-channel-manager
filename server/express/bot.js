import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Telegraf, Markup } from 'telegraf';
import { q } from './db.js';
import { httpError } from './http.js';
import { isVideoUrl, localUpload } from './uploads.js';
import { decryptSecret } from './secrets.js';

// У каждого администратора свой бот (токен в workspace_bots, зашифрован). Его каналы, публикации, статистика и лайки
// идут только через него, поэтому изоляция действует и на стороне Telegram.
// BOT_TOKEN из окружения — бот по умолчанию для главного администратора, пока он не подключил своего.

const registry = (globalThis.__tgmBots ??= new Map()); // ownerId → Promise<{ ownerId, token, telegraf } | null>

// токен не должен попадать ни в логи, ни в интерфейс (он есть в URL запросов к Bot API)
const redact = (s) => String(s ?? '').replace(/bot\d+:[A-Za-z0-9_-]{20,}/g, 'bot***');

const likeKeyboard = (postId, count) =>
  Markup.inlineKeyboard([[Markup.button.callback(`👍 ${count}`, `like:${postId}`)]]);

// Лайк — inline-кнопка под постом: повторное нажатие снимает лайк. Пост должен принадлежать пространству этого бота.
const onLike = (ownerId) => async (ctx) => {
  const postId = Number(ctx.match[1]);
  const userId = ctx.from.id;
  const own = await q('select 1 from posts p join channels c on c.id = p.channel_id where p.id = $1 and c.owner_id = $2', [postId, ownerId]);
  if (!own.rowCount) return ctx.answerCbQuery().catch(() => {});

  const removed = await q('delete from post_likes where post_id = $1 and tg_user_id = $2', [postId, userId]);
  if (removed.rowCount === 0) {
    await q('insert into post_likes (post_id, tg_user_id) values ($1, $2) on conflict do nothing', [postId, userId]);
  }
  const { rows } = await q(
    `update posts set likes_count = (select count(*) from post_likes where post_id = $1)
     where id = $1 returning likes_count`,
    [postId],
  );
  await ctx.answerCbQuery(removed.rowCount ? 'Лайк убран' : 'Спасибо! 👍');
  await ctx.editMessageReplyMarkup(likeKeyboard(postId, rows[0]?.likes_count ?? 0).reply_markup).catch(() => {});
};

function connect(ownerId, token) {
  const telegraf = new Telegraf(token, { telegram: { agent: new https.Agent({ keepAlive: false, family: 4 }) } });
  telegraf.action(/^like:(\d+)$/, onLike(ownerId));
  telegraf.launch({ allowedUpdates: ['callback_query'] }).catch((e) => console.error(`Ошибка запуска бота (пространство ${ownerId}):`, redact(e.message)));
  return { ownerId, token, telegraf };
}

async function superId() {
  const { rows: [s] } = await q('select id from users where is_super limit 1');
  return s?.id ?? null;
}

/** Токен бота пространства: собственный (расшифровывается из БД) или BOT_TOKEN из окружения — только для главного администратора. */
async function resolveToken(ownerId) {
  const { rows: [r] } = await q('select token_enc from workspace_bots where owner_id = $1', [ownerId]);
  if (r) return decryptSecret(r.token_enc);
  return process.env.BOT_TOKEN && (await superId()) === ownerId ? process.env.BOT_TOKEN : null;
}

/** Бот пространства (создаётся и запускается при первом обращении) или null, если у администратора его нет. */
export function getBot(ownerId) {
  if (!Number.isInteger(ownerId)) return Promise.resolve(null);
  let p = registry.get(ownerId);
  if (!p) {
    p = resolveToken(ownerId)
      .then((token) => (token ? connect(ownerId, token) : null))
      .catch((e) => {
        console.error(`Бот пространства ${ownerId} недоступен:`, redact(e.message));
        return null;
      });
    registry.set(ownerId, p);
    p.then((c) => c || registry.delete(ownerId)); // «нет бота» не запоминаем: токен могут добавить в любой момент
  }
  return p;
}

const stopConn = (c) => {
  try {
    c?.telegraf.stop('reset');
  } catch {
    /* бот не был запущен */
  }
};

/** Забывает бота пространства (после смены или удаления токена); следующий getBot создаст нового. */
export async function resetBot(ownerId) {
  const p = registry.get(ownerId);
  registry.delete(ownerId);
  stopConn(await p?.catch(() => null));
}

export const activeBots = () => registry.size;

/** Проверка токена у Telegram: возвращает { id, username, is_bot }. */
export async function getMe(token) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    throw httpError(`Не удалось связаться с Telegram: ${redact(e.cause?.code || e.cause?.message || e.message)}`, 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw httpError(res.status === 401 || res.status === 404 ? 'Telegram не принял токен: проверьте, что он скопирован целиком' : redact(data.description) || `Telegram ответил ${res.status}`);
  }
  return data.result;
}

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' };

/** Фото или видео (.mp4) из файла: multipart с известной длиной (как у curl), без потоковой передачи. */
async function sendMediaFile(token, chatId, file, { caption, parse_mode, reply_markup }) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  if (parse_mode) form.append('parse_mode', parse_mode);
  form.append('reply_markup', JSON.stringify(reply_markup));
  const ext = path.extname(file).slice(1);
  const video = ext === 'mp4';
  if (video) form.append('supports_streaming', 'true');
  form.append(video ? 'video' : 'photo', new Blob([await readFile(file)], { type: MIME[ext] || 'image/jpeg' }), path.basename(file));

  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${video ? 'sendVideo' : 'sendPhoto'}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(video ? 300_000 : 60_000),
    });
  } catch (e) {
    // текст ошибки без URL, чтобы токен не попал в логи и в интерфейс
    throw new Error(`Не удалось отправить ${video ? 'видео' : 'фото'}: ${redact(e.cause?.code || e.cause?.message || e.message)}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(redact(data.description) || `Telegram ответил ${res.status}`);
  return data.result.message_id;
}

/** Публикует пост в канал ботом его владельца, возвращает message_id. post должен содержать tg_chat_id и owner_id. */
export async function publishPost(post) {
  const conn = await getBot(post.owner_id);
  if (!conn) throw new Error('Бот не подключён: администратор должен добавить токен бота на странице «Бот»');
  const keyboard = likeKeyboard(post.id, post.likes_count || 0);
  const parse = post.parse_mode ? { parse_mode: post.parse_mode } : {};

  const file = localUpload(post.media_url);
  if (file) {
    return sendMediaFile(conn.token, post.tg_chat_id, file, { caption: post.content, ...parse, reply_markup: keyboard.reply_markup });
  }

  const tg = conn.telegraf.telegram;
  const extra = { ...parse, ...keyboard };
  const send = isVideoUrl(post.media_url) ? 'sendVideo' : 'sendPhoto';
  const msg = post.media_url
    ? await tg[send](post.tg_chat_id, post.media_url, { caption: post.content, ...extra })
    : await tg.sendMessage(post.tg_chat_id, post.content, extra);
  return msg.message_id;
}

/** Число подписчиков канала (прямой вызов Bot API ботом владельца). */
export async function memberCount(ownerId, chatId) {
  const conn = await getBot(ownerId);
  if (!conn) throw new Error('Бот не подключён');
  return conn.telegraf.telegram.callApi('getChatMemberCount', { chat_id: chatId });
}

/** Запускает ботов всех администраторов (нужно, чтобы работали лайки под уже опубликованными постами). */
export async function startBot() {
  try {
    const { rows } = await q('select owner_id from workspace_bots');
    const owners = new Set(rows.map((r) => r.owner_id));
    const sid = process.env.BOT_TOKEN ? await superId() : null;
    if (sid) owners.add(sid);
    for (const id of owners) await getBot(id);
    if (registry.size) console.log(`Запущено ботов: ${registry.size}`);
    else console.warn('Ни у одного администратора не подключён бот: публикация и сбор статистики отключены');
  } catch (e) {
    console.error('Ошибка запуска ботов:', redact(e.message));
  }
}

export function stopBot() {
  for (const p of registry.values()) p.then(stopConn).catch(() => {});
  registry.clear();
}
