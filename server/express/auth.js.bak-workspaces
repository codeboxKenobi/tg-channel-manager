import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { q } from './db.js';
import { httpError } from './http.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'tgm_session';
const TTL_DAYS = 14;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---- пароли: scrypt + соль, формат "соль:хеш" ----
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':');
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(key, expected);
}

export function assertPassword(p) {
  if (typeof p !== 'string' || p.length < 8) throw httpError('Пароль — не короче 8 символов');
  if (p.length > 200) throw httpError('Пароль слишком длинный');
}

export function cleanUserInput(body = {}) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  if (!EMAIL.test(email)) throw httpError('Некорректный email');
  if (!name) throw httpError('Укажите имя');
  assertPassword(body.password);
  return { email, name, password: body.password };
}

// ---- сессии: случайный токен в httpOnly-cookie, в БД хранится только его sha256 ----
export function readToken(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (part.slice(0, i).trim() === COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await q(
    `insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3::int))`,
    [sha(token), userId, TTL_DAYS],
  );
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure, // true за HTTPS-прокси при TRUST_PROXY=true
    maxAge: TTL_DAYS * 86400 * 1000,
    path: '/',
  });
}

export async function destroySession(req, res) {
  const token = readToken(req);
  if (token) await q('delete from sessions where token_hash = $1', [sha(token)]);
  res.clearCookie(COOKIE, { path: '/' });
}

export async function currentUser(req) {
  const token = readToken(req);
  if (!token) return null;
  const { rows: [u] } = await q(
    `select u.id, u.email, u.name, u.role
     from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha(token)],
  );
  return u ?? null;
}

// ---- middleware ----
export async function requireAuth(req, _res, next) {
  const user = await currentUser(req);
  if (!user) throw httpError('Требуется вход', 401);
  req.user = user;
  next();
}

export const requireRole = (role) => (req, _res, next) =>
  req.user?.role === role ? next() : next(httpError('Недостаточно прав', 403));

// Защита от CSRF: запросы с изменением данных должны приходить с нашего origin (плюс SameSite=Lax у cookie)
export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (host !== req.headers.host) return next(httpError('Запрос с чужого origin отклонён', 403));
  }
  next();
}
