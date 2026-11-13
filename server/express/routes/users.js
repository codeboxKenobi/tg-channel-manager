import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { assertPassword, cleanUserInput, hashPassword, requireRole, requireSuper } from '../auth.js';
import { canManageUser, setUserChannels } from '../access.js';
import { openPasswords } from '../sealed.js';

const r = Router();
r.use(requireRole('admin'));

// Пользователь, которым actor вправе управлять; чужие выглядят как несуществующие
async function managed(req) {
  const id = Number(req.params.id);
  const { rows: [target] } = Number.isInteger(id)
    ? await q('select id, email, name, role, owner_id, is_super, created_at from users where id = $1', [id])
    : { rows: [] };
  if (!canManageUser(req.user, target)) throw httpError('Пользователь не найден', 404);
  return target;
}

// Редакторы своего пространства
r.get('/', async (req, res) => {
  const { rows } = await q(
    `select u.id, u.email, u.name, u.role, u.created_at,
            coalesce((select json_agg(json_build_object('id', c.id, 'title', c.title) order by c.title)
                      from channel_users cu join channels c on c.id = cu.channel_id
                      where cu.user_id = u.id), '[]'::json) as channels
     from users u where u.role = 'editor' and u.owner_id = $1 order by u.id`,
    [req.user.id],
  );
  res.json(rows);
});

// Все администраторы (каждый со своим пространством) — только главному администратору
r.get('/admins', requireSuper, async (_req, res) => {
  const { rows } = await q(
    `select u.id, u.email, u.name, u.is_super, u.created_at,
            (select count(*)::int from channels c where c.owner_id = u.id) as channels_count,
            (select count(*)::int from users e where e.owner_id = u.id) as editors_count
     from users u where u.role = 'admin' order by u.id`,
  );
  res.json(rows);
});

r.post('/', async (req, res) => {
  const { password: plain } = openPasswords(req.body, ['password']);
  const { email, name, password } = cleanUserInput({ ...req.body, password: plain });
  const role = req.body?.role ?? 'editor';
  if (!['admin', 'editor'].includes(role)) throw httpError('Некорректная роль');
  // новый администратор получает собственное пустое пространство, редактор — пространство создателя
  if (role === 'admin' && !req.user.is_super) throw httpError('Создавать администраторов может только главный администратор', 403);
  const { rows: [u] } = await q(
    `insert into users (email, name, password_hash, role, owner_id) values ($1, $2, $3, $4, $5)
     returning id, email, name, role, created_at`,
    [email, name, await hashPassword(password), role, role === 'editor' ? req.user.id : null],
  );
  res.status(201).json(u);
});

r.put('/:id', async (req, res) => {
  const target = await managed(req);
  const { name, role } = req.body ?? {};
  const { password } = openPasswords(req.body, ['password'], { optional: true });
  if (!name?.trim()) throw httpError('Укажите имя');
  if (role !== undefined && role !== target.role) throw httpError('Роль изменить нельзя: создайте пользователя заново');
  let hash = null;
  if (password) {
    assertPassword(password);
    hash = await hashPassword(password);
  }
  const { rows: [u] } = await q(
    `update users set name = $2, password_hash = coalesce($3, password_hash)
     where id = $1 returning id, email, name, role, created_at`,
    [target.id, name.trim(), hash],
  );
  if (hash) await q('delete from sessions where user_id = $1', [target.id]); // смена пароля завершает его сессии
  res.json(u);
});

// Удаление администратора удаляет и всё его пространство (каналы, посты, редакторов), поэтому нужен ?force=1
r.delete('/:id', async (req, res) => {
  const target = await managed(req);
  if (target.role === 'admin' && req.query.force !== '1') {
    const { rows: [c] } = await q(
      `select (select count(*)::int from channels where owner_id = $1) as channels,
              (select count(*)::int from users where owner_id = $1) as editors`,
      [target.id],
    );
    if (c.channels || c.editors) {
      throw httpError(`У администратора есть данные (каналов: ${c.channels}, редакторов: ${c.editors}). Они будут удалены вместе с ним, подтвердите удаление`, 409);
    }
  }
  await q('delete from users where id = $1', [target.id]);
  res.status(204).end();
});

// Закрепление каналов за редактором (полная замена списка); только каналы своего пространства
r.put('/:id/channels', async (req, res) => {
  const target = await managed(req);
  if (target.role !== 'editor') throw httpError('Каналы закрепляются только за редакторами');
  await setUserChannels(target.id, req.body?.channel_ids, req.user.id);
  res.status(204).end();
});

export default r;
