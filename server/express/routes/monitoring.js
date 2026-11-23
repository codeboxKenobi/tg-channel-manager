import { Router } from 'express';
import { q } from '../db.js';
import { requireSuper } from '../auth.js';
import { inactiveDays } from '../account.js';

const r = Router();
r.use(requireSuper);

const DAY = 24 * 60 * 60 * 1000;

// Сводка по приложению и список всех пользователей (без хешей паролей и токенов)
r.get('/', async (_req, res) => {
  const [{ rows: [s] }, { rows: statuses }, { rows: users }] = await Promise.all([
    q(`select
         (select count(*)::int from users) as users,
         (select count(*)::int from users where role = 'admin') as admins,
         (select count(*)::int from users where role = 'editor') as editors,
         (select count(*)::int from users where last_active_at > now() - interval '24 hours') as active_24h,
         (select count(*)::int from users where last_active_at > now() - interval '7 days') as active_7d,
         (select count(*)::int from users where last_active_at > now() - interval '30 days') as active_30d,
         (select count(*)::int from sessions where expires_at > now()) as sessions,
         (select count(*)::int from channels) as channels,
         (select count(*)::int from channels where not is_active) as channels_disabled,
         (select count(*)::int from workspace_bots) as bots,
         (select count(*)::int from parser_sources) as parser_sources,
         (select count(*)::int from posts where status = 'published' and published_at > now() - interval '7 days') as published_7d`),
    q('select status, count(*)::int as n from posts group by status'),
    q(`select u.id, u.name, u.email, u.role, u.is_super, u.lang, u.created_at, u.last_active_at,
              o.name as owner_name, o.email as owner_email,
              (select count(*)::int from sessions s where s.user_id = u.id and s.expires_at > now()) as sessions,
              case when u.role = 'admin' then (select count(*)::int from channels c where c.owner_id = u.id)
                   else (select count(*)::int from channel_users cu where cu.user_id = u.id) end as channels,
              case when u.role = 'admin' then (select count(*)::int from users e where e.owner_id = u.id) end as editors,
              (select count(*)::int from posts p where p.created_by = u.id) as posts_created,
              exists (select 1 from workspace_bots b where b.owner_id = u.id) as has_bot,
              greatest(u.last_active_at, coalesce((select max(e.last_active_at) from users e where e.owner_id = u.id), u.last_active_at)) as team_last_active_at
       from users u left join users o on o.id = u.owner_id
       order by u.role, u.last_active_at desc`),
  ]);

  // сколько дней осталось до автоудаления за бездействие: у администратора учитывается и активность его редакторов
  const limit = inactiveDays();
  const now = Date.now();
  const list = users.map(({ team_last_active_at, ...u }) => {
    const idle = Math.floor((now - new Date(u.role === 'admin' ? team_last_active_at : u.last_active_at).getTime()) / DAY);
    return { ...u, days_left: limit && !u.is_super ? Math.max(0, limit - idle) : null };
  });

  const posts = Object.fromEntries(statuses.map((x) => [x.status, x.n]));
  res.json({ generated_at: new Date().toISOString(), inactive_days: limit, summary: { ...s, posts }, users: list });
});

export default r;
