import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { assertPassword, cleanUserInput, hashPassword, requireRole } from '../auth.js';
import { setUserChannels } from '../access.js';
import { openPasswords } from '../sealed.js';

const r = Router();
const ROLES = ['admin', 'editor'];
r.use(requireRole('admin'));

r.get('/', async (_req, res) => {
  const { rows } = await q(
    `select u.id, u.email, u.name, u.role, u.created_at,
            coalesce((select json_agg(json_build_object('id', c.id, 'title', c.title) order by c.title)
                      from channel_users cu join channels c on c.id = cu.channel_id
                      where cu.user_id = u.id), '[]'::json) as channels
     from users u order by u.id`,
  );
  res.json(rows);
});

r.post('/', async (req, res) => {
  const { password: plain } = openPasswords(req.body, ['password']);
  const { email, name, password } = cleanUserInput({ ...req.body, password: plain });
  const role = req.body.role ?? 'editor';
  if (!ROLES.includes(role)) throw httpError('Некорректная роль');
  const { rows: [u] } = await q(
    `insert into users (email, name, password_hash, role) values ($1, $2, $3, $4)
     returning id, email, name, role, created_at`,
    [email, name, await hashPassword(password), role],
  );
  res.status(201).json(u);
});

r.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, role } = req.body ?? {};
  const { password } = openPasswords(req.body, ['password'], { optional: true });
  if (!name?.trim()) throw httpError('Укажите имя');
  if (!ROLES.includes(role)) throw httpError('Некорректная роль');
  if (id === req.user.id && role !== 'admin') throw httpError('Нельзя понизить собственную роль');
  let hash = null;
  if (password) {
    assertPassword(password);
    hash = await hashPassword(password);
  }
  const { rows: [u] } = await q(
    `update users set name = $2, role = $3, password_hash = coalesce($4, password_hash)
     where id = $1 returning id, email, name, role, created_at`,
    [id, name.trim(), role, hash],
  );
  if (!u) throw httpError('Пользователь не найден', 404);
  if (hash) await q('delete from sessions where user_id = $1', [id]); // смена пароля завершает его сессии
  res.json(u);
});

r.delete('/:id', async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw httpError('Нельзя удалить самого себя');
  const { rowCount } = await q('delete from users where id = $1', [req.params.id]);
  if (!rowCount) throw httpError('Пользователь не найден', 404);
  res.status(204).end();
});

// Закрепление каналов за пользователем (полная замена списка)
r.put('/:id/channels', async (req, res) => {
  const { rowCount } = await q('select 1 from users where id = $1', [req.params.id]);
  if (!rowCount) throw httpError('Пользователь не найден', 404);
  await setUserChannels(Number(req.params.id), req.body?.channel_ids);
  res.status(204).end();
});

export default r;
