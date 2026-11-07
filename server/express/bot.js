import { Telegraf, Markup } from 'telegraf';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { q } from './db.js';
import { localUpload } from './uploads.js';

const likeKeyboard = (postId, count) =>
  Markup.inlineKeyboard([[Markup.button.callback(`👍 ${count}`, `like:${postId}`)]]);

function createBot() {
  const b = new Telegraf(process.env.BOT_TOKEN, { telegram: { agent: new https.Agent({ keepAlive: false, family: 4 }) } });
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

/** Публикует пост в канал, возвращает message_id. post должен содержать tg_chat_id. */
export async function publishPost(post) {
  const extra = {
    ...(post.parse_mode ? { parse_mode: post.parse_mode } : {}),
    ...likeKeyboard(post.id, post.likes_count || 0),
  };
  // картинка, загруженная с устройства, уходит в Telegram файлом; внешняя ссылка — по URL
  const file = localUpload(post.media_url);
  const photo = file ? { source: await readFile(file), filename: path.basename(file) } : post.media_url;
  const msg = post.media_url
    ? await bot.telegram.sendPhoto(post.tg_chat_id, photo, { caption: post.content, ...extra })
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
