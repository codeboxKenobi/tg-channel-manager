import { Router } from 'express';
import { q } from '../db.js';
import { accessibleChannelIds, assertChannelAccess } from '../access.js';

const r = Router();
const channelParam = (req) => (req.query.channel_id ? Number(req.query.channel_id) : null);

// Читает channel_id из запроса и проверяет доступ к нему (если канал выбран).
async function scope(req) {
  const channelId = channelParam(req);
  if (channelId) await assertChannelAccess(req.user, channelId);
  return [channelId, await accessibleChannelIds(req.user)];
}

// Везде: allowed = null для администратора (все каналы), иначе массив id закреплённых каналов.
// $1 — выбранный канал (null — все доступные), $2 — доступные пользователю каналы.
r.get('/overview', async (req, res) => {
  const { rows: [row] } = await q(
    `select (select count(*)::int from channels c
              where ($1::int is null or c.id = $1) and ($2::int[] is null or c.id = any($2::int[]))) as channels,
            (select coalesce(sum(c.subscribers_count), 0)::int from channels c
              where ($1::int is null or c.id = $1) and ($2::int[] is null or c.id = any($2::int[]))) as subscribers,
            (select count(*)::int from posts p where p.status = 'published'
              and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as published,
            (select count(*)::int from posts p where p.status = 'scheduled'
              and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as scheduled,
            (select count(*)::int from posts p where p.status = 'draft'
              and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as drafts,
            (select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes`,
    await scope(req),
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
    await scope(req),
  );
  res.json(rows);
});

// подписчики по дням за 30 дней: у выбранного канала или суммарно по всем доступным.
// На каждый день берётся последний снимок на конец дня (если снимков до этого дня нет — самый ранний).
r.get('/subscribers', async (req, res) => {
  const { rows } = await q(
    `select to_char(d, 'YYYY-MM-DD') as day, coalesce(sum(s.subscribers), 0)::int as subscribers
     from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') d
     cross join (select id from channels
                  where ($1::int is null or id = $1) and ($2::int[] is null or id = any($2::int[]))) c
     left join lateral (
       select subscribers from channel_stats
       where channel_id = c.id
       order by (recorded_at >= d + interval '1 day'),
                case when recorded_at < d + interval '1 day' then recorded_at end desc,
                recorded_at asc
       limit 1
     ) s on true
     group by d order by d`,
    await scope(req),
  );
  // нет ни одного снимка — графику показывать нечего
  res.json(rows.some((x) => x.subscribers > 0) ? rows : []);
});

r.get('/top-posts', async (req, res) => {
  const { rows } = await q(
    `select p.id, p.title, p.likes_count, p.published_at, c.title as channel_title
     from posts p join channels c on c.id = p.channel_id
     where p.status = 'published' and ($1::int is null or p.channel_id = $1)
       and ($2::int[] is null or p.channel_id = any($2::int[]))
     order by p.likes_count desc, p.published_at desc limit 10`,
    await scope(req),
  );
  res.json(rows);
});

export default r;
