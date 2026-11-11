import crypto from 'node:crypto';
import { httpError } from './http.js';

// Шифрование паролей при передаче: клиент шифрует их публичным ключом сервера (RSA-OAEP, SHA-256),
// поэтому в теле запроса, в логах прокси и в HAR-файлах открытого пароля нет.
// Внутрь шифротекста клиент кладёт одноразовый nonce, выданный сервером: перехваченный запрос повторить нельзя.
// ВАЖНО: это не заменяет HTTPS. Активный перехватчик по HTTP может подменить и ключ, и скрипт страницы.

const KEY_BITS = 2048;
const BLOCK = KEY_BITS / 8; // размер одного RSA-блока шифротекста
const MAX_BLOCKS = 16;
const ROTATE_MS = 60 * 60 * 1000; // ключ меняется раз в час, предыдущий живёт ещё столько же
const NONCE_TTL_MS = 2 * 60 * 1000;
const MAX_NONCES = 5000;

const state = (globalThis.__tgmSealed ??= { keys: [], nonces: new Map(), pending: null });

async function newKey() {
  const { publicKey, privateKey } = await new Promise((resolve, reject) =>
    crypto.generateKeyPair('rsa', { modulusLength: KEY_BITS }, (e, pub, priv) => (e ? reject(e) : resolve({ publicKey: pub, privateKey: priv }))),
  );
  const { n, e } = publicKey.export({ format: 'jwk' });
  return { kid: crypto.createHash('sha256').update(n).digest('hex').slice(0, 16), n, e, privateKey, createdAt: Date.now() };
}

async function currentKey() {
  const now = Date.now();
  state.keys = state.keys.filter((k) => now - k.createdAt < 2 * ROTATE_MS);
  const last = state.keys.at(-1);
  if (last && now - last.createdAt < ROTATE_MS) return last;
  state.pending ??= newKey()
    .then((k) => (state.keys.push(k), k))
    .finally(() => (state.pending = null));
  return state.pending;
}

function purgeNonces() {
  const now = Date.now();
  for (const [nonce, exp] of state.nonces) {
    if (exp > now && state.nonces.size <= MAX_NONCES) break; // Map хранит в порядке добавления: дальше только свежие
    state.nonces.delete(nonce);
  }
}

/** Публичный ключ (JWK n/e) и одноразовый nonce для следующего запроса с паролем. */
export async function issueChallenge() {
  const key = await currentKey();
  purgeNonces();
  const nonce = crypto.randomBytes(18).toString('base64url');
  state.nonces.set(nonce, Date.now() + NONCE_TTL_MS);
  return { kid: key.kid, n: key.n, e: key.e, nonce };
}

const BAD = 'Не удалось расшифровать данные. Обновите страницу и повторите попытку';

function decryptSealed(enc, kid) {
  const key = state.keys.find((k) => k.kid === kid);
  if (!key) throw httpError('Ключ шифрования устарел. Повторите попытку', 400);
  const buf = Buffer.from(String(enc), 'base64');
  if (!buf.length || buf.length % BLOCK || buf.length > BLOCK * MAX_BLOCKS) throw httpError(BAD, 400);
  let plain;
  try {
    const parts = [];
    for (let i = 0; i < buf.length; i += BLOCK) {
      parts.push(crypto.privateDecrypt({ key: key.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, buf.subarray(i, i + BLOCK)));
    }
    plain = JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw httpError(BAD, 400);
  }
  // nonce гасится при первом же использовании, даже если дальше что-то не так
  const exp = typeof plain?.n === 'string' ? state.nonces.get(plain.n) : undefined;
  if (exp !== undefined) state.nonces.delete(plain.n);
  if (!exp || exp < Date.now()) throw httpError('Запрос устарел или уже использован. Повторите попытку', 400);
  if (!plain.f || typeof plain.f !== 'object' || Array.isArray(plain.f)) throw httpError(BAD, 400);
  return plain.f;
}

/**
 * Достаёт пароли из тела запроса: { enc, kid } → { [поле]: строка }.
 * Открытые пароли в теле не принимаются (кроме ALLOW_PLAINTEXT_PASSWORD=true — для скриптов и curl).
 * optional: поля могут отсутствовать вовсе (например, смена пароля админом без пароля).
 */
export function openPasswords(body, fields, { optional = false } = {}) {
  const b = body ?? {};
  if (b.enc !== undefined) {
    const f = decryptSealed(b.enc, b.kid);
    return Object.fromEntries(fields.map((name) => [name, typeof f[name] === 'string' ? f[name] : undefined]));
  }
  const hasPlain = fields.some((name) => b[name] !== undefined);
  if (!hasPlain && optional) return {};
  if (hasPlain && process.env.ALLOW_PLAINTEXT_PASSWORD === 'true') return Object.fromEntries(fields.map((name) => [name, b[name]]));
  throw httpError('Пароль должен передаваться в зашифрованном виде. Обновите страницу (Ctrl+F5)', 400);
}
