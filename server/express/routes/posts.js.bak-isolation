import { Router } from 'express';
import { q } from '../db.js';
import { bot } from '../bot.js';
import { publishById } from '../scheduler.js';
import { httpError } from '../http.js';
import { localUpload, removeUploadIfUnused } from '../uploads.js';
import { accessibleChannelIds, assertChannelAccess } from '../access.js';

const r = Router();

function parse(body) {
  const { channel_id, title, content, media_url, parse_mode, scheduled_at } = body ?? {};
  if (!Number.isInteger(Number(channel_id))) throw httpError('Выберите канал');
  if (!title?.trim()) throw httpError('Укажите заголовок');
  if (!content?.trim()) throw httpError('Текст поста не может быть пустым');
  if (content.length > (media_url ? 1024 : 4096)) {
    throw httpError(media_url ? 'Подпись к фото или видео — не более 1024 символов' : 'Текст — не более 4096 символов');
  }
  if (media_url && !/^https?:\/\//i.test(media_url) && !localUpload(media_url)) throw httpError('Некорректная ссылка на файл');
  if (parse_mode && !['HTML', 'MarkdownV2'].includes(parse_mode)) throw httpError('Некорректный parse_mode');
  let when = null;
  if (scheduled_at) {
    when = new Date(scheduled_at);
    if (Number.isNaN(when.getTime())) throw httpError('Некорректная дата публикации');
  }
  return {
    channel_id: Number(channel_id),
    title: title.trim(),
    content,
    media_url: media_url || null,
    parse_mode: parse_mode || null,
    scheduled_at: when,
    status: when ? 'scheduled' : 'draft',
  };
}

// ?status=draft,scheduled&channel_id=1
r.get('/', async (req, res) => {
  const statuses = req.query.status ? String(req.query.status).split(',') : null;
  const channelId = req.query.channel_id ? Number(req.query.channel_id) : null;
  const { rows } = await q(
    `select p.*, c.title as channel_title, c.username as channel_username, u.name as author_name
     from posts p join channels c on c.id = p.channel_id left join users u on u.id = p.created_by
     where ($1::post_status[] is null or p.status = any($1::post_status[]))
       and ($2::int is null or p.channel_id = $2)
       and ($3::int[] is null or p.channel_id = any($3::int[]))
     order by coalesce(p.published_at, p.scheduled_at, p.created_at) desc`,
    [statuses, channelId, await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

r.get('/:id', async (req, res) => {
  const { rows: [row] } = await q('select * from posts where id = $1', [req.params.id]);
  if (!row) throw httpError('Пост не найден', 404);
  await assertChannelAccess(req.user, row.channel_id);
  res.json(row);
});

r.post('/', async (req, res) => {
  const p = parse(req.body);
  await assertChannelAccess(req.user, p.channel_id);
  const { rows: [row] } = await q(
    `insert into posts (channel_id, title, content, media_url, parse_mode, scheduled_at, status, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [p.channel_id, p.title, p.content, p.media_url, p.parse_mode, p.scheduled_at, p.status, req.user.id],
  );
  res.status(201).json(row);
});

// scheduled_at задан → пост ставится в график, пусто → остаётся черновиком
r.put('/:id', async (req, res) => {
  const p = parse(req.body);
  const { rows: [cur] } = await q('select status, media_url, channel_id from posts where id = $1', [req.params.id]);
  if (!cur) throw httpError('Пост не найден', 404);
  await assertChannelAccess(req.user, cur.channel_id);
  await assertChannelAccess(req.user, p.channel_id);
  if (['published', 'publishing'].includes(cur.status)) throw httpError('Опубликованный пост редактировать нельзя', 409);
  const { rows: [row] } = await q(
    `update posts set channel_id = $2, title = $3, content = $4, media_url = $5, parse_mode = $6,
            scheduled_at = $7, status = $8, error = null, updated_at = now()
     where id = $1 returning *`,
    [req.params.id, p.channel_id, p.title, p.content, p.media_url, p.parse_mode, p.scheduled_at, p.status],
  );
  if (cur.media_url && cur.media_url !== p.media_url) await removeUploadIfUnused(cur.media_url);
  res.json(row);
});

r.post('/:id/publish', async (req, res) => {
  if (!bot) throw httpError('BOT_TOKEN не задан: публикация недоступна', 503);
  const { rows: [pre] } = await q('select channel_id from posts where id = $1', [req.params.id]);
  if (!pre) throw httpError('Пост не найден', 404);
  await assertChannelAccess(req.user, pre.channel_id);
  const { rows } = await q(
    `update posts set status = 'publishing', updated_at = now()
     where id = $1 and status in ('draft', 'scheduled', 'failed') returning id`,
    [req.params.id],
  );
  if (!rows.length) throw httpError('Пост не найден или уже публикуется', 409);
  const post = await publishById(rows[0].id);
  if (post.status === 'failed') throw httpError(post.error || 'Не удалось опубликовать', 502);
  res.json(post);
});

// ?tg=1 — дополнительно удалить сообщение в канале
r.delete('/:id', async (req, res) => {
  const { rows: [post] } = await q(
    'select p.tg_message_id, p.status, p.media_url, p.channel_id, c.tg_chat_id from posts p join channels c on c.id = p.channel_id where p.id = $1',
    [req.params.id],
  );
  if (!post) throw httpError('Пост не найден', 404);
  await assertChannelAccess(req.user, post.channel_id);
  if (req.query.tg === '1' && bot && post.status === 'published' && post.tg_message_id) {
    await bot.telegram.deleteMessage(post.tg_chat_id, Number(post.tg_message_id)).catch(() => {});
  }
  await q('delete from posts where id = $1', [req.params.id]);
  await removeUploadIfUnused(post.media_url);
  res.status(204).end();
});

export default r;
