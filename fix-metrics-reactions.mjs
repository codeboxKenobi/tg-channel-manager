#!/usr/bin/env node
// «Метрики»: актуальные данные по реакциям читателей. Раньше считались только нажатия нашей кнопки «👍», а она убрана,
// поэтому цифры не росли. Теперь бот получает от Telegram обновления message_reaction_count (реакции прямо под постом в канале)
// и сохраняет счётчики по каждому посту: суммарно и по видам (👍 ❤️ 🔥 …).
//
// Что меняется:
//  • «Реакций всего», графики, таблица каналов и «Лучшие посты» считают реакции Telegram + старые лайки кнопки (у прежних постов);
//  • новый блок «Реакции по видам» и разбивка реакций у лучших постов;
//  • график «Реакции на посты» строится по дню публикации поста (Telegram не присылает время каждой реакции);
//  • на странице «Опубликованные» бейдж показывает сумму реакций.
//
// Запуск из корня проекта:  node fix-metrics-reactions.mjs [путь/к/проекту]
// Всё или ничего; повторный запуск безопасен; копии: *.bak-reactions. В схему БД добавляются 2 колонки posts (создаются при старте).
// Ограничения Bot API: просмотры постов не отдаются; данные приходят с задержкой, и только по реакциям, поставленным после
// перезапуска приложения с этим патчем (старые реакции Telegram не присылает). Бот должен быть администратором канала.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);

// from — строка или список вариантов (берётся тот, что найден ровно один раз)
const EDITS = {
  'server/express/schema.js': [
    [
      "alter table users add column if not exists lang text not null default 'ru';\n",
      "alter table users add column if not exists lang text not null default 'ru';\n\n-- реакции Telegram под постом канала: reactions — { \"👍\": 5, \"❤️\": 2 }, reactions_count — сумма (из обновлений message_reaction_count)\nalter table posts add column if not exists reactions jsonb not null default '{}'::jsonb;\nalter table posts add column if not exists reactions_count int not null default 0;\n",
    ],
  ],

  'server/express/bot.js': [
    [
      "const ALLOWED_UPDATES = ['callback_query'];",
      "const ALLOWED_UPDATES = ['callback_query', 'message_reaction_count']; // реакции под постами каналов приходят агрегированными",
    ],
    [
      "function connect(ownerId, token) {\n",
      `/**
 * Реакции под постом канала: Telegram присылает текущие суммарные счётчики (message_reaction_count), а не отдельные события.
 * Пост ищем по каналу и id сообщения среди каналов этого пространства.
 */
const onReactionCount = (ownerId) => async (rc) => {
  const byKind = {};
  let total = 0;
  for (const r of rc.reactions ?? []) {
    const key = r.type?.type === 'emoji' ? r.type.emoji : r.type?.type === 'paid' ? 'paid' : 'custom';
    const n = Number(r.total_count) || 0;
    byKind[key] = (byKind[key] ?? 0) + n;
    total += n;
  }
  await q(
    \`update posts p set reactions = $4::jsonb, reactions_count = $5
     from channels c
     where c.id = p.channel_id and c.owner_id = $1 and c.tg_chat_id = $2 and p.tg_message_id = $3\`,
    [ownerId, rc.chat?.id, rc.message_id, JSON.stringify(byKind), total],
  );
};

function connect(ownerId, token) {
`,
    ],
    [
      "  telegraf.action(/^like:(\\d+)$/, onLike(ownerId));\n",
      `  telegraf.use((ctx, next) => {
    const rc = ctx.update?.message_reaction_count;
    if (!rc) return next();
    return onReactionCount(ownerId)(rc).catch((e) => console.error(\`Ошибка учёта реакций (пространство \${ownerId}):\`, redact(e.message)));
  });
  telegraf.action(/^like:(\\d+)$/, onLike(ownerId));
`,
    ],
  ],

  'server/express/routes/metrics.js': [
    [
      "const r = Router();\n",
      `const r = Router();

// «Лайки» в метриках = все реакции читателей: реакции Telegram под постом (posts.reactions_count)
// плюс нажатия прежней кнопки «👍» (posts.likes_count, у постов, опубликованных до её удаления).
// Имена полей в ответах (likes, avg_likes, likes_count) сохранены для совместимости с интерфейсом.
const SYMBOL = { custom: '✨', paid: '⭐' };
const sym = (k) => SYMBOL[k] ?? k;
function detail(reactions, legacyLikes) {
  const m = { ...(reactions ?? {}) };
  if (legacyLikes > 0) m['👍'] = (m['👍'] ?? 0) + legacyLikes;
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, n]) => \`\${sym(k)} \${n}\`)
    .join('  ');
}
`,
    ],
    [
      `(select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes`,
      `(select coalesce(sum(p.likes_count + p.reactions_count), 0)::int from posts p where p.status = 'published'
              and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes`,
    ],
    [
      `coalesce(sum(p.likes_count) filter (where p.status = 'published'), 0)::int as likes,
            coalesce(round(avg(p.likes_count) filter (where p.status = 'published'), 1), 0)::float as avg_likes,`,
      `coalesce(sum(p.likes_count + p.reactions_count) filter (where p.status = 'published'), 0)::int as likes,
            coalesce(round(avg(p.likes_count + p.reactions_count) filter (where p.status = 'published'), 1), 0)::float as avg_likes,`,
    ],
    [
      `(select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where l.created_at::date = d::date
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes`,
      `(select coalesce(sum(p.likes_count + p.reactions_count), 0)::int from posts p
              where p.status = 'published' and p.published_at::date = d::date -- реакции относятся ко дню публикации поста
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes`,
    ],
    [
      `    \`select p.id, p.title, p.likes_count, p.published_at, c.title as channel_title
     from posts p join channels c on c.id = p.channel_id
     where p.status = 'published' and ($1::int is null or p.channel_id = $1)
       and ($2::int[] is null or p.channel_id = any($2::int[]))
     order by p.likes_count desc, p.published_at desc limit 10\`,
    await scope(req),
  );
  res.json(rows);
});
`,
      `    \`select p.id, p.title, p.likes_count + p.reactions_count as likes_count, p.likes_count as legacy_likes, p.reactions,
            p.published_at, c.title as channel_title
     from posts p join channels c on c.id = p.channel_id
     where p.status = 'published' and ($1::int is null or p.channel_id = $1)
       and ($2::int[] is null or p.channel_id = any($2::int[]))
     order by p.likes_count + p.reactions_count desc, p.published_at desc limit 10\`,
    await scope(req),
  );
  res.json(rows.map(({ reactions, legacy_likes, ...post }) => ({ ...post, detail: detail(reactions, legacy_likes) })));
});

// реакции по видам (👍 ❤️ 🔥 …) по всем опубликованным постам выбранного канала или всех доступных
r.get('/reactions', async (req, res) => {
  const { rows } = await q(
    \`select key as emoji, sum(n)::int as total from (
       select e.key, e.value::int as n from posts p, jsonb_each_text(p.reactions) e
        where p.status = 'published' and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))
       union all
       select '👍', p.likes_count from posts p
        where p.status = 'published' and p.likes_count > 0 and ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))
     ) t group by key order by total desc limit 12\`,
    await scope(req),
  );
  res.json(rows.map((x) => ({ ...x, emoji: sym(x.emoji) })));
});
`,
    ],
  ],

  'pages/metrics.vue': [
    ["const top = ref<any[]>([])\n", "const top = ref<any[]>([])\nconst reactionTypes = ref<any[]>([])\n"],
    ["const [o, c, tl, s, tp] = await Promise.all([", "const [o, c, tl, s, tp, rt] = await Promise.all(["],
    ["      api('/metrics/top-posts', { query }),\n    ])", "      api('/metrics/top-posts', { query }),\n      api('/metrics/reactions', { query }),\n    ])"],
    ["    top.value = tp\n", "    top.value = tp\n    reactionTypes.value = rt\n"],
    [
      "    <h2>{{ t('metrics.dynamics') }}</h2>\n",
      `    <p class="muted mt-2">{{ t('metrics.reactionsHint') }}</p>
    <template v-if="!loading && reactionTypes.length">
      <h2>{{ t('metrics.reactionsByType') }}</h2>
      <div class="card">
        <span v-for="r in reactionTypes" :key="r.emoji" style="display: inline-flex; align-items: baseline; gap: 6px; margin: 4px 16px 4px 0; font-size: 20px">{{ r.emoji }} <b style="font-size: 16px">{{ fmtNum(r.total) }}</b></span>
      </div>
    </template>

    <h2>{{ t('metrics.dynamics') }}</h2>
`,
    ],
    [
      `<td :data-label="t('metrics.col.post')">{{ p.title }}</td>`,
      `<td :data-label="t('metrics.col.post')">{{ p.title }}<small v-if="p.detail" class="muted"> · {{ p.detail }}</small></td>`,
    ],
  ],

  'pages/published.vue': [
    [
      [
        `<span v-if="p.likes_count > 0" class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>`,
        `<span class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>`,
      ],
      `<span v-if="p.likes_count + p.reactions_count > 0" class="badge published">❤️ {{ fmtNum(p.likes_count + p.reactions_count) }}</span>`,
    ],
  ],

  'locales/ru.ts': [
    [
      "  'metrics.likesTotal': 'Лайков всего',\n",
      "  'metrics.likesTotal': 'Реакций всего',\n  'metrics.reactionsByType': 'Реакции по видам',\n  'metrics.reactionsHint': 'Реакции берутся из Telegram и приходят с задержкой; учитываются реакции, поставленные после подключения этого обновления. Просмотры Telegram боту не передаёт.',\n",
    ],
    ["  'metrics.chartLikes': 'Лайки по дням',\n", "  'metrics.chartLikes': 'Реакции на посты (по дню публикации)',\n"],
    ["  'metrics.col.likes': 'Лайков',\n", "  'metrics.col.likes': 'Реакций',\n"],
    ["  'metrics.col.likesPerPost': 'Лайков на пост',\n", "  'metrics.col.likesPerPost': 'Реакций на пост',\n"],
    ["  'metrics.topPosts': 'Лучшие посты по лайкам',\n", "  'metrics.topPosts': 'Лучшие посты по реакциям',\n"],
    ["  'metrics.col.likesShort': 'Лайки',\n", "  'metrics.col.likesShort': 'Реакции',\n"],
  ],
  'locales/en.ts': [
    [
      "  'metrics.likesTotal': 'Total likes',\n",
      "  'metrics.likesTotal': 'Total reactions',\n  'metrics.reactionsByType': 'Reactions by type',\n  'metrics.reactionsHint': 'Reactions come from Telegram with a delay; only reactions made after this update is installed are counted. Telegram does not give bots post views.',\n",
    ],
    ["  'metrics.chartLikes': 'Likes per day',\n", "  'metrics.chartLikes': 'Post reactions (by publication day)',\n"],
    ["  'metrics.col.likes': 'Likes',\n", "  'metrics.col.likes': 'Reactions',\n"],
    ["  'metrics.col.likesPerPost': 'Likes per post',\n", "  'metrics.col.likesPerPost': 'Reactions per post',\n"],
    ["  'metrics.topPosts': 'Top posts by likes',\n", "  'metrics.topPosts': 'Top posts by reactions',\n"],
    ["  'metrics.col.likesShort': 'Likes',\n", "  'metrics.col.likesShort': 'Reactions',\n"],
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const problems = [];
for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(p(file))) { problems.push(`${file}: файл не найден`); continue; }
  let text = fs.readFileSync(p(file), 'utf8');
  let changed = false;
  edits.forEach(([fromAny, to], i) => {
    if (count(text, to) >= 1) return; // уже применено
    const from = [].concat(fromAny).find((f) => count(text, f) === 1);
    if (from === undefined) {
      problems.push(`${file}: правка №${i + 1}: якорь не найден (или найден несколько раз):\n    ${[].concat(fromAny)[0].trim().split('\n')[0].slice(0, 110)}`);
      return;
    }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text] of plan) {
  const bak = p(file + '.bak-reactions');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение (колонки posts.reactions и reactions_count создадутся при старте).');
console.log('Webhook обновит список разрешённых обновлений при старте; в режиме polling бот подхватит их сам.');
