import { Router } from 'express';
import { q } from '../db.js';
import { httpError } from '../http.js';
import { requireRole } from '../auth.js';
import { getBot, getMe, resetBot } from '../bot.js';
import { encryptSecret, secretsConfigured } from '../secrets.js';
import { openPasswords } from '../sealed.js';

// Бот пространства администратора. Токен принимается только зашифрованным в запросе и никогда не отдаётся обратно.
const r = Router();
r.use(requireRole('admin'));

const TOKEN_RE = /^\d{5,}:[A-Za-z0-9_-]{30,}$/;

async function status(ownerId) {
  const base = { secrets_configured: secretsConfigured() };
  const { rows: [b] } = await q('select bot_id, bot_username, updated_at from workspace_bots where owner_id = $1', [ownerId]);
  if (b) return { ...base, connected: true, source: 'own', bot_id: Number(b.bot_id), username: b.bot_username, updated_at: b.updated_at };
  // главный администратор может работать на BOT_TOKEN из окружения
  const conn = await getBot(ownerId);
  if (!conn) return { ...base, connected: false };
  const me = await getMe(conn.token).catch(() => null);
  return { ...base, connected: true, source: 'env', bot_id: me?.id ?? null, username: me?.username ?? null };
}

r.get('/', async (req, res) => {
  res.json(await status(req.user.id));
});

r.put('/', async (req, res) => {
  if (!secretsConfigured()) throw httpError('На сервере не задан SECRETS_KEY: токены ботов негде безопасно хранить. Обратитесь к владельцу сервера', 503);
  const token = String(openPasswords(req.body, ['token']).token ?? '').trim();
  if (!TOKEN_RE.test(token)) throw httpError('Токен выглядит неверно: ожидается вид 123456789:AA… от @BotFather');
  const me = await getMe(token);
  if (!me.is_bot) throw httpError('Это токен не бота');

  // одним ботом не могут пользоваться два пространства: иначе изоляция теряет смысл
  const { rows: [other] } = await q('select 1 from workspace_bots where bot_id = $1 and owner_id <> $2', [me.id, req.user.id]);
  if (other) throw httpError('Этот бот уже подключён к другому администратору', 409);
  if (process.env.BOT_TOKEN) {
    // бот из окружения принадлежит главному администратору; остальным его токен подключить нельзя
    const { rows: [s] } = await q('select id from users where is_super limit 1');
    if (s && s.id !== req.user.id) {
      const legacy = await getMe(process.env.BOT_TOKEN).catch(() => null);
      if (legacy?.id === me.id) throw httpError('Этот бот уже подключён к другому администратору', 409);
    }
  }

  await q(
    `insert into workspace_bots (owner_id, token_enc, bot_id, bot_username) values ($1, $2, $3, $4)
     on conflict (owner_id) do update
       set token_enc = excluded.token_enc, bot_id = excluded.bot_id, bot_username = excluded.bot_username, updated_at = now()`,
    [req.user.id, encryptSecret(token), me.id, me.username ?? null],
  );
  await resetBot(req.user.id);
  await getBot(req.user.id); // сразу запускаем: лайки под постами заработают без перезапуска сервера
  res.json(await status(req.user.id));
});

r.delete('/', async (req, res) => {
  await q('delete from workspace_bots where owner_id = $1', [req.user.id]);
  await resetBot(req.user.id);
  await getBot(req.user.id); // у главного администратора после этого снова бот из BOT_TOKEN, если он задан
  res.json(await status(req.user.id));
});

export default r;
