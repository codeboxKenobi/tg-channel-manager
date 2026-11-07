import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { assertPassword, cleanUserInput, hashPassword, requireRole } from '../auth.js';

const r = Router();
const ROLES = ['admin', 'editor'];
r.use(requireRole('admin'));

r.get('/', async (_req, res) => {
  const { rows } = await q('select id, email, name, role, created_at from users order by id');
  res.json(rows);
});

r.post('/', async (req, res) => {
  const { email, name, password } = cleanUserInput(req.body);
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
  const { name, role, password } = req.body ?? {};
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

export default r;
