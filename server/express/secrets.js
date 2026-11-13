import crypto from 'node:crypto';
import { httpError } from './http.js';

// Шифрование секретов (токенов ботов) в БД: AES-256-GCM, ключ берётся из SECRETS_KEY (32 байта: hex из 64 символов или base64).
// Формат записи: v1:<iv>:<tag>:<шифротекст>, всё в base64. Потеряете ключ — токены придётся ввести заново.

function key() {
  const raw = (process.env.SECRETS_KEY || '').trim();
  let k = null;
  if (/^[0-9a-f]{64}$/i.test(raw)) k = Buffer.from(raw, 'hex');
  else if (raw) {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) k = b;
  }
  if (!k) throw httpError('На сервере не задан SECRETS_KEY (32 байта, например: openssl rand -base64 32)', 503);
  return k;
}

export function secretsConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((x) => (Buffer.isBuffer(x) ? x.toString('base64') : x)).join(':');
}

export function decryptSecret(blob) {
  const [v, iv, tag, data] = String(blob).split(':');
  if (v !== 'v1' || !iv || !tag || !data) throw new Error('Неизвестный формат секрета');
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch (e) {
    if (e.status) throw e; // SECRETS_KEY не задан
    throw new Error('Не удалось расшифровать токен: изменился SECRETS_KEY или запись повреждена');
  }
}
