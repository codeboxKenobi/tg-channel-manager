import crypto from 'node:crypto';
import { pool, q } from '../server/express/db.js';
import { hashPassword } from '../server/express/auth.js';

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const at = (daysFromNow, hour = rnd(9, 20)) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, rnd(0, 59), 0, 0);
  return d;
};

// tg_chat_id вымышленные: чтобы публиковать по-настоящему, добавьте свой канал на странице «Каналы»
const channels = [
  { tg: -1001000000001, title: 'Tech Digest', username: 'tech_digest_demo', description: 'Новости разработки и инструментов', subs: 12450 },
  { tg: -1001000000002, title: 'Кофе и код', username: 'coffee_code_demo', description: 'Заметки разработчика за чашкой кофе', subs: 5320 },
  { tg: -1001000000003, title: 'Дизайн каждый день', username: null, description: 'Приватный канал с референсами', subs: 8100 },
];

const topics = [
  ['Релиз Nuxt', '<b>Вышло обновление Nuxt</b>\nБыстрее сборка, стабильнее гидратация. Подробности в changelog.'],
  ['PostgreSQL: частичные индексы', 'Частичный индекс <code>where status = \'scheduled\'</code> ускоряет выбор постов к публикации.'],
  ['Подборка недели', 'Пять инструментов, которые экономят время на ревью кода.'],
  ['Как мы пишем тесты', 'Короткий разбор: что тестировать на уровне API, а что — в интерфейсе.'],
  ['Утренний дайджест', 'Главное за сутки: релизы, статьи и один хороший доклад.'],
  ['Совет по TypeScript', 'Используйте <code>satisfies</code>, чтобы проверять форму объекта и не терять литеральные типы.'],
  ['Вопрос к подписчикам', 'Какой редактор вы используете для работы каждый день? Расскажите в комментариях.'],
  ['Мини-гайд по Docker', 'Один docker-compose для базы данных — и локальная среда готова за минуту.'],
  ['Разбор архитектуры', 'Почему очередь публикаций лучше держать в базе, а не в памяти процесса.'],
  ['Итоги месяца', 'Что вышло, что мы прочитали и что планируем на следующий месяц.'],
  ['Инструмент дня', 'Утилита для сравнения JSON-ответов API — удобно при миграциях.'],
  ['Шпаргалка по Git', 'Пять команд, которые спасают после неудачного rebase.'],
];
let t = 0;
const nextTopic = () => topics[t++ % topics.length];

await q('truncate sessions, post_likes, channel_stats, parsed_posts, parser_sources, channel_users, posts, channels, users restart identity cascade');

// пользователи: пароль берётся из ADMIN_PASSWORD или генерируется и печатается в конце
const pwd = () => crypto.randomBytes(9).toString('base64url');
const demoUsers = [
  { email: process.env.ADMIN_EMAIL || 'admin@example.com', name: 'Администратор', role: 'admin', password: process.env.ADMIN_PASSWORD || pwd() },
  { email: 'editor@example.com', name: 'Редактор', role: 'editor', password: pwd() },
];
const userIds = [];
for (const u of demoUsers) {
  const { rows: [row] } = await q(
    'insert into users (email, name, password_hash, role) values ($1, $2, $3, $4) returning id',
    [u.email, u.name, await hashPassword(u.password), u.role],
  );
  userIds.push(row.id);
}

let assigned = 0;
for (const c of channels) {
  const { rows: [ch] } = await q(
    `insert into channels (tg_chat_id, title, username, description, subscribers_count)
     values ($1, $2, $3, $4, $5) returning id`,
    [c.tg, c.title, c.username, c.description, c.subs],
  );
  // редактор закреплён за первыми двумя каналами, третий видит только администратор
  if (assigned++ < 2) await q('insert into channel_users (channel_id, user_id) values ($1, $2)', [ch.id, userIds[1]]);

  // подписчики: 30 дневных снимков с ростом
  await q(
    `insert into channel_stats (channel_id, subscribers, recorded_at)
     select $1::int, $2::int - (29 - g) * $3::int + floor(random() * $3::int)::int,
            now() - make_interval(days => 29 - g)
     from generate_series(0, 29) g`,
    [ch.id, c.subs, Math.max(1, Math.round(c.subs / 150))],
  );

  const insert = (status, o = {}) => {
    const [title, content] = nextTopic();
    return q(
      `insert into posts (channel_id, title, content, parse_mode, status, scheduled_at, published_at, tg_message_id, error, created_by)
       values ($1, $2, $3, 'HTML', $4, $5, $6, $7, $8, $9) returning id`,
      [ch.id, title, content, status, o.scheduled ?? null, o.published ?? null, o.msg ?? null, o.error ?? null, userIds[rnd(0, userIds.length - 1)]],
    );
  };

  // 10 опубликованных постов с лайками
  for (let i = 0; i < 10; i++) {
    const published = at(-(1 + i * 3));
    const { rows: [p] } = await insert('published', { scheduled: published, published, msg: 1000 + i });
    const likes = rnd(20, 60) * Math.max(1, Math.round(c.subs / 2000));
    await q(
      `insert into post_likes (post_id, tg_user_id, created_at)
       select $1::int, 100000 + g, least(now(), $2::timestamptz + random() * interval '3 days')
       from generate_series(1, $3::int) g`,
      [p.id, published, likes],
    );
  }
  // 2 в графике, 3 черновика, 1 с ошибкой
  await insert('scheduled', { scheduled: at(1) });
  await insert('scheduled', { scheduled: at(3) });
  for (let i = 0; i < 3; i++) await insert('draft');
  await insert('failed', { scheduled: at(-1), error: 'Forbidden: bot is not a member of the channel chat' });
}

// парсер: демо-источники и посты (обновление этих вымышленных каналов вернёт ошибку — подключите настоящие)
for (const [username, title] of [['demo_tech_news', 'Демо: Tech News'], ['demo_dev_blog', 'Демо: Dev Blog']]) {
  const { rows: [s] } = await q(
    'insert into parser_sources (username, title, created_by, last_parsed_at) values ($1, $2, $3, now()) returning id',
    [username, title, userIds[0]],
  );
  for (let i = 0; i < 8; i++) {
    const [t, content] = nextTopic();
    await q(
      `insert into parsed_posts (source_id, tg_message_id, text, post_url, posted_at, views) values ($1, $2, $3, $4, $5, $6)`,
      [s.id, 100 + i, `${t}\n\n${content.replace(/<[^>]+>/g, '')}`, `https://t.me/${username}/${100 + i}`, at(-(i + 1)), rnd(500, 20000)],
    );
  }
}

await q(`update posts p set likes_count = (select count(*) from post_likes l where l.post_id = p.id)`);

const counts = await q(`select
  (select count(*) from channels) as channels, (select count(*) from posts) as posts,
  (select count(*) from post_likes) as likes, (select count(*) from channel_stats) as stats`);
console.log('Seed готов:', counts.rows[0]);
console.log('Учётные записи (смените пароли после входа):');
for (const u of demoUsers) console.log(`  ${u.role.padEnd(6)} ${u.email}  /  ${u.password}`);
await pool.end();
