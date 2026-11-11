import { Router } from 'express';
import { q } from '../db.js';
import { accessibleChannelIds, assertChannelAccess } from '../access.js';

const r = Router();
const channelParam = (req) => (req.query.channel_id ? Number(req.query.channel_id) : null);

// Во всех запросах: $1 — выбранный канал (null = все каналы), $2 — доступные пользователю каналы (null = все).

r.get('/overview', async (req, res) => {
  const { rows: [row] } = await q(
    `with ch as (
       select c.id, c.subscribers_count from channels c
       where ($1::int is null or c.id = $1) and ($2::int[] is null or c.id = any($2::int[]))
     )
     select (select count(*)::int from ch) as channels,
            (select coalesce(sum(subscribers_count), 0)::int from ch) as subscribers,
            (select coalesce(sum(ch.subscribers_count - coalesce((
                select s.subscribers from channel_stats s
                where s.channel_id = ch.id and s.recorded_at >= now() - interval '30 days'
                order by s.recorded_at asc limit 1), ch.subscribers_count)), 0)::int from ch) as growth_30d,
            (select count(*)::int from posts p where p.status = 'published' and p.channel_id in (select id from ch)) as published,
            (select count(*)::int from posts p where p.status = 'scheduled' and p.channel_id in (select id from ch)) as scheduled,
            (select count(*)::int from posts p where p.status = 'draft' and p.channel_id in (select id from ch)) as drafts,
            (select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where p.channel_id in (select id from ch)) as likes,
            coalesce((select round(avg(p.likes_count), 1) from posts p
              where p.status = 'published' and p.channel_id in (select id from ch)), 0)::float as avg_likes`,
    [channelParam(req), await accessibleChannelIds(req.user)],
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

// Единая динамика за 30 дней: публикации, лайки и подписчики на одной оси дат.
// Подписчики — сумма последних известных значений по каналам на конец дня (null, пока снимков нет).
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
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes,
            (select sum(x.subscribers)::int from (
               select distinct on (s.channel_id) s.subscribers
               from channel_stats s
               where s.recorded_at < d + interval '1 day'
                 and ($1::int is null or s.channel_id = $1)
                 and ($2::int[] is null or s.channel_id = any($2::int[]))
               order by s.channel_id, s.recorded_at desc) x) as subscribers
     from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') d
     order by d`,
    [channelParam(req), await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

// оставлен для совместимости: подписчики одного канала по дням
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
