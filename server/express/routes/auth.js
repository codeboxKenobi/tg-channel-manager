import crypto from 'node:crypto';
import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import {
  assertPassword, cleanUserInput, createSession, currentUser, destroySession,
  hashPassword, normalizeLang, readToken, requireAuth, sha, verifyPassword,
} from '../auth.js';
import { issueChallenge, openPasswords } from '../sealed.js';
import { deleteAccount, inactiveDays } from '../account.js';
import { mailEnabled, sendMail, appUrl } from '../mailer.js';
import { resetCodeMail } from '../mail-templates.js';

const r = Router();
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, is_super: Boolean(u.is_super), lang: normalizeLang(u.lang) ?? 'ru' });

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
  res.json({ user: user ? publicUser(user) : null, needsSetup: n === 0, registration: registrationInfo(), mail: mailEnabled() });
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
    `insert into users (email, name, password_hash, role, is_super, lang)
     select $1, $2, $3, 'admin', true, $4 where not exists (select 1 from users)
     returning id, email, name, role, is_super, lang`,
    [email, name, await hashPassword(password), normalizeLang(req.body?.lang) ?? 'ru'],
  );
  if (!u) throw httpError('Администратор уже создан', 409);
  await createSession(req, res, u.id);
  res.status(201).json({ user: u });
});

// Самостоятельная регистрация: новый администратор получает собственное изолированное пространство.
// ALLOW_REGISTRATION=false отключает её; REGISTRATION_CODE (необязательно) — код-приглашение.
function registrationInfo() {
  return { open: process.env.ALLOW_REGISTRATION !== 'false', code_required: Boolean((process.env.REGISTRATION_CODE ?? '').trim()) };
}

// не больше 10 попыток регистрации в час с одного IP (защита от спама и подбора кода-приглашения)
const regAttempts = new Map();
const REG_WINDOW = 60 * 60 * 1000;
function regThrottled(ip) {
  const now = Date.now();
  if (regAttempts.size > 10000) for (const [k, v] of regAttempts) if (now - v.at[v.at.length - 1] > REG_WINDOW) regAttempts.delete(k);
  const at = (regAttempts.get(ip)?.at ?? []).filter((t) => now - t < REG_WINDOW);
  if (at.length >= 10) return true;
  regAttempts.set(ip, { at: [...at, now] });
  return false;
}

r.post('/register', async (req, res) => {
  const info = registrationInfo();
  if (!info.open) throw httpError('Регистрация отключена', 403);
  if (regThrottled(req.ip ?? req.socket.remoteAddress)) throw httpError('Слишком много попыток регистрации. Повторите позже', 429);

  const { password: plain, code } = openPasswords(req.body, ['password', 'code']);
  if (info.code_required) {
    const expected = Buffer.from(sha((process.env.REGISTRATION_CODE ?? '').trim()));
    if (!crypto.timingSafeEqual(expected, Buffer.from(sha(String(code ?? '').trim())))) throw httpError('Неверный код приглашения', 403);
  }
  const { email, name, password } = cleanUserInput({ ...req.body, password: plain });

  const { rows: [{ n }] } = await q('select count(*)::int as n from users');
  if (n === 0) throw httpError('Сначала нужно создать первого администратора', 409);
  if ((await q('select 1 from users where email = $1', [email])).rowCount) throw httpError('Этот email уже зарегистрирован', 409);

  // не главный администратор (is_super = false), владельца нет: пространство создаётся вместе с аккаунтом
  const { rows: [u] } = await q(
    `insert into users (email, name, password_hash, role, is_super, lang) values ($1, $2, $3, 'admin', false, $4)
     returning id, email, name, role, is_super, lang`,
    [email, name, await hashPassword(password), normalizeLang(req.body?.lang) ?? 'ru'],
  );
  await createSession(req, res, u.id);
  res.status(201).json({ user: publicUser(u) });
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

// ---- восстановление пароля по коду из письма ----
// Код: 6 цифр, живёт 15 минут, на него 5 попыток; в БД хранится только хеш. Ответ на запрос кода одинаков для любого email
// и не ждёт отправки письма, поэтому по нему нельзя узнать, зарегистрирован ли адрес.
const RESET_TTL_MIN = 15;
const RESET_MAX_TRIES = 5;
const resetAsks = new Map(); // ключ (IP или email) → метки времени запросов кода
function askThrottled(key, limit) {
  const now = Date.now();
  if (resetAsks.size > 10000) for (const [k, v] of resetAsks) if (now - v[v.length - 1] > 3600_000) resetAsks.delete(k);
  const at = (resetAsks.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (at.length >= limit) return true;
  resetAsks.set(key, [...at, now]);
  return false;
}

// Шаг 1: код на почту. Не больше 10 запросов в час с одного IP и 3 в час на один адрес.
r.post('/forgot', async (req, res) => {
  if (!mailEnabled()) throw httpError('Отправка почты не настроена. Обратитесь к администратору', 503);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email.includes('@') || email.length > 254) throw httpError('Некорректный email');
  if (askThrottled(`ip|${req.ip ?? req.socket.remoteAddress}`, 10) || askThrottled(`mail|${email}`, 3)) {
    throw httpError('Слишком много запросов кода. Повторите через час', 429);
  }
  await q('delete from password_resets where expires_at < now()');
  const { rows: [u] } = await q('select id, email, name, lang from users where email = $1', [email]);
  if (u) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const salt = crypto.randomBytes(8).toString('hex');
    await q(
      `insert into password_resets (user_id, salt, code_hash, tries, expires_at)
       values ($1, $2, $3, 0, now() + make_interval(mins => $4::int))
       on conflict (user_id) do update
         set salt = excluded.salt, code_hash = excluded.code_hash, tries = 0, expires_at = excluded.expires_at, created_at = now()`,
      [u.id, salt, sha(salt + code), RESET_TTL_MIN],
    );
    // письмо уходит в фоне: время ответа не зависит от того, найден ли адрес
    sendMail({ to: u.email, ...resetCodeMail({ name: u.name, code, minutes: RESET_TTL_MIN, url: appUrl(), lang: u.lang }) })
      .catch((e) => console.error('Письмо с кодом не отправлено:', e.message));
  }
  res.json({ ok: true, minutes: RESET_TTL_MIN });
});

// Шаг 2: код + новый пароль. Пароль и код приходят в зашифрованном виде, как и при входе.
r.post('/reset', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const { password, code } = openPasswords(req.body, ['password', 'code']);
  const key = `reset|${req.socket.remoteAddress}|${email}`;
  if (isBlocked(key)) throw httpError('Слишком много попыток. Повторите через 15 минут', 429);
  assertPassword(password);

  const digits = String(code ?? '').replace(/\s/g, '');
  const bad = () => {
    recordFailure(key);
    return httpError('Неверный или просроченный код', 400);
  };
  const { rows: [u] } = await q('select id from users where email = $1', [email]);
  if (!u || !/^\d{6}$/.test(digits)) throw bad();
  const { rows: [row] } = await q(
    'select salt, code_hash from password_resets where user_id = $1 and expires_at > now() and tries < $2',
    [u.id, RESET_MAX_TRIES],
  );
  if (!row) throw bad();
  if (!crypto.timingSafeEqual(Buffer.from(sha(row.salt + digits)), Buffer.from(row.code_hash))) {
    await q('update password_resets set tries = tries + 1 where user_id = $1', [u.id]);
    throw bad();
  }
  failures.delete(key);
  await q('update users set password_hash = $2 where id = $1', [u.id, await hashPassword(password)]);
  await q('delete from password_resets where user_id = $1', [u.id]);
  await q('delete from sessions where user_id = $1', [u.id]); // со всех устройств нужно войти заново
  res.status(204).end();
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

// Язык интерфейса аккаунта (страница «Профиль»)
r.put('/lang', requireAuth, async (req, res) => {
  const lang = normalizeLang(req.body?.lang);
  if (!lang) throw httpError('Неподдерживаемый язык');
  await q('update users set lang = $2 where id = $1', [req.user.id, lang]);
  res.json({ lang });
});

// Сведения для страницы «Профиль»: можно ли удалить аккаунт, что при этом пропадёт и через сколько дней неактивный аккаунт удаляется сам
r.get('/account', requireAuth, async (req, res) => {
  const u = req.user;
  const out = { role: u.role, is_super: Boolean(u.is_super), can_delete: !u.is_super, inactive_days: inactiveDays() };
  if (u.role === 'admin') {
    const { rows: [c] } = await q(
      `select (select count(*)::int from channels where owner_id = $1) as channels,
              (select count(*)::int from users where owner_id = $1) as editors`,
      [u.id],
    );
    Object.assign(out, c);
  }
  res.json(out);
});

// Удаление своего аккаунта по желанию: нужен пароль. Администратор удаляется вместе со всем своим пространством.
// Главный администратор удалить себя не может (иначе система осталась бы без него).
r.post('/delete-account', requireAuth, async (req, res) => {
  if (req.user.is_super) throw httpError('Главный администратор не может удалить аккаунт', 403);
  const key = `${req.socket.remoteAddress}|${req.user.email}`; // общий с входом счётчик неудачных попыток
  if (isBlocked(key)) throw httpError('Слишком много попыток. Повторите через 15 минут', 429);

  const password = String(openPasswords(req.body, ['password']).password ?? '');
  const { rows: [row] } = await q('select password_hash from users where id = $1', [req.user.id]);
  if (!row || password.length > 200 || !(await verifyPassword(password, row.password_hash))) {
    recordFailure(key);
    throw httpError('Пароль неверен', 400);
  }
  failures.delete(key);

  await deleteAccount(req.user.id);
  await destroySession(req, res); // снимает cookie сессии
  res.status(204).end();
});

export default r;
