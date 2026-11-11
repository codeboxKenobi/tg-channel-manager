import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import {
  assertPassword, cleanUserInput, createSession, currentUser, destroySession,
  hashPassword, readToken, requireAuth, sha, verifyPassword,
} from '../auth.js';
import { issueChallenge, openPasswords } from '../sealed.js';

const r = Router();
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

// ограничение подбора пароля: 10 неудачных попыток за 15 минут на пару IP + email
const failures = new Map();
const WINDOW = 15 * 60 * 1000;
const recent = (key) => (failures.get(key) ?? []).filter((t) => Date.now() - t < WINDOW);
const isBlocked = (key) => recent(key).length >= 10;
const recordFailure = (key) => failures.set(key, [...recent(key), Date.now()]);

let dummyHash; // сравнение с пустышкой, чтобы время ответа не выдавало существование email
const getDummy = async () => (dummyHash ??= await hashPassword('dummy-password'));

// Публичный: кто я и нужно ли создать первого администратора
r.get('/me', async (req, res) => {
  const user = await currentUser(req);
  const { rows: [{ n }] } = await q('select count(*)::int as n from users');
  res.json({ user: user ? publicUser(user) : null, needsSetup: n === 0 });
});

// Публичный ключ для шифрования пароля в браузере + одноразовый nonce (защита от повтора запроса)
r.get('/key', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await issueChallenge());
});

// Работает только пока в системе нет ни одного пользователя
r.post('/setup', async (req, res) => {
  const { password: plain } = openPasswords(req.body, ['password']);
  const { email, name, password } = cleanUserInput({ ...req.body, password: plain });
  const { rows: [u] } = await q(
    `insert into users (email, name, password_hash, role)
     select $1, $2, $3, 'admin' where not exists (select 1 from users)
     returning id, email, name, role`,
    [email, name, await hashPassword(password)],
  );
  if (!u) throw httpError('Администратор уже создан', 409);
  await createSession(req, res, u.id);
  res.status(201).json({ user: u });
});

r.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(openPasswords(req.body, ['password']).password ?? '');
  const key = `${req.socket.remoteAddress}|${email}`;
  if (isBlocked(key)) throw httpError('Слишком много попыток. Повторите через 15 минут', 429);

  const { rows: [u] } = await q('select * from users where email = $1', [email]);
  const ok = password.length <= 200 && (await verifyPassword(password, u?.password_hash ?? (await getDummy())));
  if (!u || !ok) {
    recordFailure(key);
    throw httpError('Неверный email или пароль', 401);
  }
  failures.delete(key);
  await createSession(req, res, u.id);
  res.json({ user: publicUser(u) });
});

r.post('/logout', async (req, res) => {
  await destroySession(req, res);
  res.status(204).end();
});

r.post('/password', requireAuth, async (req, res) => {
  const { current, next } = openPasswords(req.body, ['current', 'next']);
  assertPassword(next);
  const { rows: [u] } = await q('select password_hash from users where id = $1', [req.user.id]);
  if (!(await verifyPassword(String(current ?? ''), u.password_hash))) throw httpError('Текущий пароль неверен', 400);
  await q('update users set password_hash = $2 where id = $1', [req.user.id, await hashPassword(next)]);
  // остальные устройства разлогиниваются
  await q('delete from sessions where user_id = $1 and token_hash <> $2', [req.user.id, sha(readToken(req))]);
  res.status(204).end();
});

export default r;
