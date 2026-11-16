import cron from 'node-cron';
import { q } from './db.js';
import { activeBots, getBot, publishPost, memberCount } from './bot.js';

/** Публикует один пост (статус должен быть 'publishing'), возвращает обновлённую строку. */
export async function publishById(id) {
  const { rows: [post] } = await q(
    'select p.*, c.tg_chat_id, c.owner_id from posts p join channels c on c.id = p.channel_id where p.id = $1',
    [id],
  );
  try {
    const messageId = await publishPost(post);
    const { rows: [row] } = await q(
      `update posts set status = 'published', published_at = now(), tg_message_id = $2,
              error = null, updated_at = now() where id = $1 returning *`,
      [id, messageId],
    );
    return row;
  } catch (e) {
    const { rows: [row] } = await q(
      `update posts set status = 'failed', error = $2, updated_at = now() where id = $1 returning *`,
      [id, String(e?.response?.description || e.message)],
    );
    return row;
  }
}

/** Забирает все посты, время которых наступило. skip locked защищает от двойной публикации. */
export async function publishDue() {
  if (!activeBots()) return;
  const { rows } = await q(
    `update posts set status = 'publishing', updated_at = now()
     where id in (
       select p.id from posts p join channels c on c.id = p.channel_id
       where p.status = 'scheduled' and p.scheduled_at <= now() and c.is_active
       order by p.scheduled_at limit 10 for update of p skip locked
     ) returning id`,
  );
  for (const { id } of rows) await publishById(id);
}

/** Снимок числа подписчиков для графиков роста. */
export async function snapshotStats() {
  if (!activeBots()) return;
  const { rows } = await q('select id, tg_chat_id, owner_id from channels where is_active');
  for (const c of rows) {
    if (!(await getBot(c.owner_id))) continue; // у администратора канала нет бота
    try {
      const n = await memberCount(c.owner_id, c.tg_chat_id);
      await q('insert into channel_stats (channel_id, subscribers) values ($1, $2)', [c.id, n]);
      await q('update channels set subscribers_count = $2 where id = $1', [c.id, n]);
    } catch (e) {
      console.error(`Статистика канала ${c.id}:`, e.message);
    }
  }
}

export async function startJobs() {
  // если сервер упал посреди публикации — вернуть такие посты в очередь
  await q(`update posts set status = 'scheduled' where status = 'publishing'`);
  cron.schedule('* * * * *', () => publishDue().catch((e) => console.error('publishDue', e)));
  cron.schedule('0 * * * *', () => snapshotStats().catch((e) => console.error('snapshotStats', e)));
  cron.schedule('15 3 * * *', () => q('delete from sessions where expires_at < now()').catch(() => {}));
  snapshotStats().catch(() => {});
}
