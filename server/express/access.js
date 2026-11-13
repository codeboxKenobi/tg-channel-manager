import { pool, q } from './db.js';
import { httpError } from './http.js';

// Каждый администратор владеет своим изолированным пространством: каналами, редакторами и источниками парсера.
// Пространство администратора — его собственный id, редактора — id его администратора (users.owner_id).

export const workspaceId = (user) => (user.role === 'admin' ? user.id : user.owner_id);

/**
 * Может ли actor управлять пользователем target.
 * Администратор — редакторами своего пространства; главный администратор — ещё и другими администраторами
 * (но не собой и не другим главным).
 */
export function canManageUser(actor, target) {
  if (!actor || !target || actor.role !== 'admin') return false;
  if (target.role === 'editor') return target.owner_id === actor.id;
  return Boolean(actor.is_super) && target.id !== actor.id && !target.is_super;
}

/** id каналов, доступных пользователю: у администратора — все его каналы, у редактора — закреплённые за ним. */
export async function accessibleChannelIds(user) {
  const { rows } =
    user.role === 'admin'
      ? await q('select id from channels where owner_id = $1', [user.id])
      : await q(
          `select cu.channel_id as id from channel_users cu join channels c on c.id = cu.channel_id
           where cu.user_id = $1 and c.owner_id = $2`,
          [user.id, user.owner_id],
        );
  return rows.map((r) => r.id);
}

/** Чужие каналы выглядят как несуществующие (404), чтобы не раскрывать их наличие. */
export async function assertChannelAccess(user, channelId) {
  const id = Number(channelId);
  const { rows: [c] } = Number.isInteger(id) ? await q('select owner_id from channels where id = $1', [id]) : { rows: [] };
  if (!c || c.owner_id !== workspaceId(user)) throw httpError('Канал не найден', 404);
  if (user.role === 'admin') return;
  const { rowCount } = await q('select 1 from channel_users where user_id = $1 and channel_id = $2', [user.id, id]);
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

/** Полностью заменяет список редакторов, закреплённых за каналом. Берутся только редакторы пространства ownerId. */
export const setChannelUsers = (channelId, userIds, ownerId) =>
  inTransaction(async (c) => {
    await c.query('delete from channel_users where channel_id = $1', [channelId]);
    await c.query(
      `insert into channel_users (channel_id, user_id)
       select $1::int, id from users where id = any($2::int[]) and role = 'editor' and owner_id = $3`,
      [channelId, ids(userIds), ownerId],
    );
  });

/** Полностью заменяет список каналов, закреплённых за редактором. Берутся только каналы пространства ownerId. */
export const setUserChannels = (userId, channelIds, ownerId) =>
  inTransaction(async (c) => {
    await c.query('delete from channel_users where user_id = $1', [userId]);
    await c.query(
      'insert into channel_users (channel_id, user_id) select id, $1::int from channels where id = any($2::int[]) and owner_id = $3',
      [userId, ids(channelIds), ownerId],
    );
  });
