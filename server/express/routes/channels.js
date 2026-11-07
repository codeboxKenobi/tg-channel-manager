import { Router } from 'express';
import { q } from '../db.js';
import { bot, memberCount } from '../bot.js';
import { httpError } from '../http.js';
import { requireRole } from '../auth.js';

const r = Router();

r.get('/', async (_req, res) => {
  const { rows } = await q(`
    select c.*,
           count(p.id) filter (where p.status = 'published')::int as published_count,
           count(p.id) filter (where p.status in ('draft', 'scheduled'))::int as pending_count
    from channels c left join posts p on p.channel_id = c.id
    group by c.id order by c.id`);
  res.json(rows);
});

// chat — @username или числовой id. Бот должен быть администратором канала.
r.post('/', requireRole('admin'), async (req, res) => {
  const { chat, title, description } = req.body ?? {};
  if (!chat) throw httpError('Укажите @username или id канала');

  let tgChatId, name = title, username = null, about = description ?? null, subs = 0;
  if (bot) {
    const info = await bot.telegram.getChat(chat);
    tgChatId = info.id;
    name = info.title;
    username = info.username ?? null;
    about = info.description ?? null;
    subs = await memberCount(info.id);
  } else {
    tgChatId = Number(chat);
    if (!Number.isFinite(tgChatId) || !name) throw httpError('Без BOT_TOKEN укажите числовой id и название');
  }

  const { rows: [row] } = await q(
    `insert into channels (tg_chat_id, title, username, description, subscribers_count)
     values ($1, $2, $3, $4, $5) returning *`,
    [tgChatId, name, username, about, subs],
  );
  if (subs) await q('insert into channel_stats (channel_id, subscribers) values ($1, $2)', [row.id, subs]);
  res.status(201).json(row);
});

r.put('/:id', requireRole('admin'), async (req, res) => {
  const { title, description, is_active } = req.body ?? {};
  if (!title?.trim()) throw httpError('Укажите название');
  const { rows: [row] } = await q(
    'update channels set title = $2, description = $3, is_active = $4 where id = $1 returning *',
    [req.params.id, title.trim(), description ?? null, is_active !== false],
  );
  if (!row) throw httpError('Канал не найден', 404);
  res.json(row);
});

r.post('/:id/refresh', async (req, res) => {
  if (!bot) throw httpError('BOT_TOKEN не задан', 503);
  const { rows: [c] } = await q('select * from channels where id = $1', [req.params.id]);
  if (!c) throw httpError('Канал не найден', 404);
  const info = await bot.telegram.getChat(c.tg_chat_id);
  const n = await memberCount(c.tg_chat_id);
  const { rows: [row] } = await q(
    `update channels set title = $2, username = $3, description = $4, subscribers_count = $5
     where id = $1 returning *`,
    [c.id, info.title, info.username ?? null, info.description ?? null, n],
  );
  await q('insert into channel_stats (channel_id, subscribers) values ($1, $2)', [c.id, n]);
  res.json(row);
});

r.delete('/:id', requireRole('admin'), async (req, res) => {
  const { rowCount } = await q('delete from channels where id = $1', [req.params.id]);
  if (!rowCount) throw httpError('Канал не найден', 404);
  res.status(204).end();
});

export default r;
