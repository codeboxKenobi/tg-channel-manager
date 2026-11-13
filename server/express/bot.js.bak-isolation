import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Telegraf, Markup } from 'telegraf';
import { q } from './db.js';
import { isVideoUrl, localUpload } from './uploads.js';

const likeKeyboard = (postId, count) =>
  Markup.inlineKeyboard([[Markup.button.callback(`👍 ${count}`, `like:${postId}`)]]);

function createBot() {
  const b = new Telegraf(process.env.BOT_TOKEN, {
    telegram: { agent: new https.Agent({ keepAlive: false, family: 4 }) },
  });
  // Лайк — inline-кнопка под постом: повторное нажатие снимает лайк
  b.action(/^like:(\d+)$/, async (ctx) => {
    const postId = Number(ctx.match[1]);
    const userId = ctx.from.id;

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
  });
  return b;
}

export const bot = process.env.BOT_TOKEN ? (globalThis.__tgmBot ??= createBot()) : null;

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4' };

/** Фото или видео (.mp4) из файла: multipart с известной длиной (как у curl), без потоковой передачи. */
async function sendMediaFile(chatId, file, { caption, parse_mode, reply_markup }) {
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
    res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${video ? 'sendVideo' : 'sendPhoto'}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(video ? 300_000 : 60_000),
    });
  } catch (e) {
    // текст ошибки без URL, чтобы токен не попал в логи и в интерфейс
    throw new Error(`Не удалось отправить ${video ? 'видео' : 'фото'}: ${e.cause?.code || e.cause?.message || e.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.description || `Telegram ответил ${res.status}`);
  return data.result.message_id;
}

/** Публикует пост в канал, возвращает message_id. post должен содержать tg_chat_id. */
export async function publishPost(post) {
  const keyboard = likeKeyboard(post.id, post.likes_count || 0);
  const parse = post.parse_mode ? { parse_mode: post.parse_mode } : {};

  const file = localUpload(post.media_url);
  if (file) {
    return sendMediaFile(post.tg_chat_id, file, { caption: post.content, ...parse, reply_markup: keyboard.reply_markup });
  }

  const extra = { ...parse, ...keyboard };
  const send = isVideoUrl(post.media_url) ? 'sendVideo' : 'sendPhoto';
  const msg = post.media_url
    ? await bot.telegram[send](post.tg_chat_id, post.media_url, { caption: post.content, ...extra })
    : await bot.telegram.sendMessage(post.tg_chat_id, post.content, extra);
  return msg.message_id;
}

export function startBot() {
  if (!bot) return console.warn('BOT_TOKEN не задан: публикация и сбор статистики отключены');
  bot.launch({ allowedUpdates: ['callback_query'] }).catch((e) => console.error('Ошибка запуска бота', e));
  console.log('Бот запущен');
}

export function stopBot() {
  try {
    bot?.stop('shutdown');
  } catch {
    /* бот не был запущен */
  }
}

/** Число подписчиков канала (прямой вызов Bot API). */
export const memberCount = (chatId) => bot.telegram.callApi('getChatMemberCount', { chat_id: chatId });
