import { pool, q } from './db.js';
import { httpError } from './http.js';

/** id каналов, доступных пользователю. null — все каналы (администратор). */
export async function accessibleChannelIds(user) {
  if (user.role === 'admin') return null;
  const { rows } = await q('select channel_id from channel_users where user_id = $1', [user.id]);
  return rows.map((r) => r.channel_id);
}

export async function assertChannelAccess(user, channelId) {
  if (user.role === 'admin') return;
  const { rowCount } = await q('select 1 from channel_users where user_id = $1 and channel_id = $2', [user.id, Number(channelId)]);
  if (!rowCount) throw httpError('Нет доступа к этому каналу', 403);
}

const ids = (list) => [...new Set((Array.isArray(list) ? list : []).map(Number))].filter(Number.isInteger);

async function inTransaction(fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await fn(c);
    await c.query('commit');
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Полностью заменяет список пользователей, закреплённых за каналом. */
export const setChannelUsers = (channelId, userIds) =>
  inTransaction(async (c) => {
    await c.query('delete from channel_users where channel_id = $1', [channelId]);
    await c.query(
      'insert into channel_users (channel_id, user_id) select $1::int, id from users where id = any($2::int[])',
      [channelId, ids(userIds)],
    );
  });

/** Полностью заменяет список каналов, закреплённых за пользователем. */
export const setUserChannels = (userId, channelIds) =>
  inTransaction(async (c) => {
    await c.query('delete from channel_users where user_id = $1', [userId]);
    await c.query(
      'insert into channel_users (channel_id, user_id) select id, $1::int from channels where id = any($2::int[])',
      [userId, ids(channelIds)],
    );
  });
