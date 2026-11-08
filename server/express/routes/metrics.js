import { Router } from 'express';
import { q } from '../db.js';
import { accessibleChannelIds, assertChannelAccess } from '../access.js';

const r = Router();
const channelParam = (req) => (req.query.channel_id ? Number(req.query.channel_id) : null);

// Везде: allowed = null для администратора (все каналы), иначе массив id закреплённых каналов.
r.get('/overview', async (req, res) => {
  const { rows: [row] } = await q(
    `select (select count(*)::int from channels where $1::int[] is null or id = any($1::int[])) as channels,
            (select coalesce(sum(subscribers_count), 0)::int from channels where $1::int[] is null or id = any($1::int[])) as subscribers,
            (select count(*)::int from posts where status = 'published' and ($1::int[] is null or channel_id = any($1::int[]))) as published,
            (select count(*)::int from posts where status = 'scheduled' and ($1::int[] is null or channel_id = any($1::int[]))) as scheduled,
            (select count(*)::int from posts where status = 'draft' and ($1::int[] is null or channel_id = any($1::int[]))) as drafts,
            (select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where $1::int[] is null or p.channel_id = any($1::int[])) as likes`,
    [await accessibleChannelIds(req.user)],
  );
  res.json(row);
});

r.get('/channels', async (req, res) => {
  const { rows } = await q(
    `select c.id, c.title, c.username, c.subscribers_count,
            count(p.id) filter (where p.status = 'published')::int as posts,
            coalesce(sum(p.likes_count) filter (where p.status = 'published'), 0)::int as likes,
            coalesce(round(avg(p.likes_count) filter (where p.status = 'published'), 1), 0)::float as avg_likes,
            coalesce(c.subscribers_count - (
              select s.subscribers from channel_stats s
              where s.channel_id = c.id and s.recorded_at >= now() - interval '30 days'
              order by s.recorded_at asc limit 1), 0)::int as growth_30d
     from channels c left join posts p on p.channel_id = c.id
     where $1::int[] is null or c.id = any($1::int[])
     group by c.id order by c.id`,
    [await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

// посты и лайки по дням за 30 дней
r.get('/timeline', async (req, res) => {
  const { rows } = await q(
    `select to_char(d, 'YYYY-MM-DD') as day,
            (select count(*)::int from posts p
              where p.status = 'published' and p.published_at::date = d::date
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as posts,
            (select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where l.created_at::date = d::date
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes
     from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') d
     order by d`,
    [channelParam(req), await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

// подписчики канала по дням (последний снимок за день)
r.get('/subscribers', async (req, res) => {
  const id = channelParam(req);
  if (id) await assertChannelAccess(req.user, id);
  const { rows } = await q(
    `select to_char(day, 'DD.MM') as label, subscribers from (
       select distinct on (date_trunc('day', recorded_at))
              date_trunc('day', recorded_at) as day, subscribers
       from channel_stats
       where channel_id = $1 and recorded_at >= now() - interval '30 days'
       order by date_trunc('day', recorded_at), recorded_at desc
     ) t order by day`,
    [id],
  );
  res.json(rows);
});

r.get('/top-posts', async (req, res) => {
  const { rows } = await q(
    `select p.id, p.title, p.likes_count, p.published_at, c.title as channel_title
     from posts p join channels c on c.id = p.channel_id
     where p.status = 'published' and ($1::int is null or p.channel_id = $1)
       and ($2::int[] is null or p.channel_id = any($2::int[]))
     order by p.likes_count desc, p.published_at desc limit 10`,
    [channelParam(req), await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

export default r;
