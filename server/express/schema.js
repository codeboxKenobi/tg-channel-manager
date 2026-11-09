// Идемпотентная схема БД: применяется при старте сервера и командой `npm run migrate`
export default `create table if not exists users (
  id            serial primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  role          text not null default 'editor' check (role in ('admin', 'editor')),
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id    int not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists channels (
  id               serial primary key,
  tg_chat_id       bigint not null unique,
  title            text not null,
  username         text,
  description      text,
  subscribers_count int not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

do $$ begin
  create type post_status as enum ('draft', 'scheduled', 'publishing', 'published', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists posts (
  id            serial primary key,
  channel_id    int not null references channels(id) on delete cascade,
  title         text not null,
  content       text not null,
  media_url     text,
  parse_mode    text check (parse_mode in ('HTML', 'MarkdownV2')),
  status        post_status not null default 'draft',
  scheduled_at  timestamptz,
  published_at  timestamptz,
  tg_message_id bigint,
  likes_count   int not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists posts_due_idx on posts (scheduled_at) where status = 'scheduled';
create index if not exists posts_channel_status_idx on posts (channel_id, status);

create table if not exists post_likes (
  post_id     int not null references posts(id) on delete cascade,
  tg_user_id  bigint not null,
  created_at  timestamptz not null default now(),
  primary key (post_id, tg_user_id)
);
create index if not exists post_likes_created_idx on post_likes (created_at);

create table if not exists channel_stats (
  id          bigserial primary key,
  channel_id  int not null references channels(id) on delete cascade,
  subscribers int not null,
  recorded_at timestamptz not null default now()
);
create index if not exists channel_stats_idx on channel_stats (channel_id, recorded_at);

alter table posts add column if not exists created_by int references users(id) on delete set null;

-- закрепление каналов за пользователями (администратор видит все каналы без записей здесь)
create table if not exists channel_users (
  channel_id int not null references channels(id) on delete cascade,
  user_id    int not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);
create index if not exists channel_users_user_idx on channel_users (user_id);

-- парсер публичных Telegram-каналов: источники и спарсенные посты
create table if not exists parser_sources (
  id             serial primary key,
  username       text not null unique,
  title          text,
  last_parsed_at timestamptz,
  last_error     text,
  created_by     int references users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists parsed_posts (
  id            serial primary key,
  source_id     int not null references parser_sources(id) on delete cascade,
  tg_post_id    int not null,
  content       text not null,
  media_url     text,
  posted_at     timestamptz,
  draft_post_id int references posts(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (source_id, tg_post_id)
);
create index if not exists parsed_posts_source_idx on parsed_posts (source_id, posted_at desc);
create index if not exists parsed_posts_posted_idx on parsed_posts (posted_at desc);

-- тип медиа спарсенного поста: photo | video
alter table parsed_posts add column if not exists media_type text;
`;
