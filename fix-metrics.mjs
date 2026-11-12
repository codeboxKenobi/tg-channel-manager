#!/usr/bin/env node
// Правки страницы метрик: одинаковые графики + данные по выбранному каналу (или общие).
// Запуск из корня проекта:  node fix-metrics.mjs
// Старые файлы сохраняются рядом с суффиксом .bak
import fs from 'node:fs'
import path from 'node:path'

const files = {
  'components/BarChart.vue': `<script setup lang="ts">
const props = defineProps<{
  title: string
  items: { label: string; value: number }[]
  summary?: string // значение в шапке графика (сумма или текущее число)
  fromMin?: boolean // масштаб от минимума — для величин вроде числа подписчиков
}>()

const min = computed(() => (props.fromMin ? Math.min(...props.items.map((i) => i.value)) : 0))
const max = computed(() => Math.max(min.value + 1, ...props.items.map((i) => i.value)))
const height = (v: number) => ((v - min.value) / (max.value - min.value)) * 100 + '%'
</script>

<template>
  <div class="card chart">
    <div class="row between">
      <h3>{{ title }}</h3>
      <b v-if="summary">{{ summary }}</b>
    </div>
    <p v-if="!items.length" class="muted">Данных пока нет</p>
    <template v-else>
      <div class="bars">
        <div v-for="i in items" :key="i.label" class="bar" :title="\`\${i.label}: \${i.value}\`">
          <span :style="{ height: height(i.value) }" />
        </div>
      </div>
      <div class="axis">
        <span>{{ items[0].label }}</span>
        <span>{{ items[items.length - 1].label }}</span>
      </div>
    </template>
  </div>
</template>
`,
  'pages/metrics.vue': `<script setup lang="ts">
const api = useApi()
const overview = ref<any>(null)
const channels = ref<any[]>([])
const timeline = ref<any[]>([])
const subscribers = ref<any[]>([])
const top = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')

let requestId = 0 // защита от гонки: учитываем только ответ последнего запроса

async function load() {
  const current = ++requestId
  error.value = ''
  try {
    const query = { channel_id: channelId.value || undefined }
    const [o, c, t, s, tp] = await Promise.all([
      api('/metrics/overview', { query }),
      api('/metrics/channels'),
      api('/metrics/timeline', { query }),
      api('/metrics/subscribers', { query }),
      api('/metrics/top-posts', { query }),
    ])
    if (current !== requestId) return
    overview.value = o
    channels.value = c
    timeline.value = t
    subscribers.value = s
    top.value = tp
  } catch (e: any) {
    if (current === requestId) error.value = e.message
  }
}

// 'YYYY-MM-DD' -> 'DD.MM' (одинаковые подписи у всех графиков)
const fmtDay = (day: string) => \`\${day.slice(8, 10)}.\${day.slice(5, 7)}\`

const postsSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.posts })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.likes })))
const subsSeries = computed(() => subscribers.value.map((d) => ({ label: fmtDay(d.day), value: d.subscribers })))

const sum = (list: { value: number }[]) => list.reduce((acc, i) => acc + i.value, 0)
const postsTotal = computed(() => fmtNum(sum(postsSeries.value)))
const likesTotal = computed(() => fmtNum(sum(likesSeries.value)))
const subsLast = computed(() => (subsSeries.value.length ? fmtNum(subsSeries.value[subsSeries.value.length - 1].value) : ''))

const selected = computed(() => channels.value.find((c) => c.id === channelId.value))
const visibleChannels = computed(() => (channelId.value ? channels.value.filter((c) => c.id === channelId.value) : channels.value))
const scopeLabel = computed(() => (selected.value ? \`«\${selected.value.title}»\` : 'во всех каналах'))

onMounted(load)
watch(channelId, load)
</script>

<template>
  <section>
    <div class="row between head">
      <h1>Метрики</h1>
      <select v-model="channelId" class="filter">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="overview" class="grid">
      <div class="card stat"><b>{{ fmtNum(overview.subscribers) }}</b><span>Подписчиков {{ scopeLabel }}</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.published) }}</b><span>Опубликовано постов</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.likes) }}</b><span>Лайков всего</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.scheduled) }}</b><span>В графике</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.drafts) }}</b><span>Черновиков</span></div>
    </div>

    <h2>Динамика за 30 дней</h2>
    <div class="charts">
      <BarChart title="Публикации по дням" :items="postsSeries" :summary="postsTotal" />
      <BarChart title="Лайки по дням" :items="likesSeries" :summary="likesTotal" />
      <BarChart title="Подписчики" :items="subsSeries" :summary="subsLast" from-min />
    </div>

    <h2>{{ selected ? 'Канал' : 'Каналы' }}</h2>
    <div class="card table-wrap">
      <table class="stack">
        <thead>
          <tr>
            <th>Канал</th><th class="num">Подписчики</th><th class="num">Рост за 30 дней</th>
            <th class="num">Постов</th><th class="num">Лайков</th><th class="num">Лайков на пост</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in visibleChannels" :key="c.id">
            <td data-label="Канал">{{ c.title }}</td>
            <td class="num" data-label="Подписчики">{{ fmtNum(c.subscribers_count) }}</td>
            <td class="num" data-label="Рост за 30 дней" :class="{ pos: c.growth_30d > 0 }">{{ c.growth_30d > 0 ? '+' : '' }}{{ fmtNum(c.growth_30d) }}</td>
            <td class="num" data-label="Постов">{{ fmtNum(c.posts) }}</td>
            <td class="num" data-label="Лайков">{{ fmtNum(c.likes) }}</td>
            <td class="num" data-label="Лайков на пост">{{ c.avg_likes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Лучшие посты по лайкам</h2>
    <div class="card table-wrap">
      <p v-if="!top.length" class="muted" style="margin: 0">Опубликованных постов пока нет.</p>
      <table v-else class="stack">
        <thead><tr><th>Пост</th><th>Канал</th><th>Дата</th><th class="num">Лайки</th></tr></thead>
        <tbody>
          <tr v-for="p in top" :key="p.id">
            <td data-label="Пост">{{ p.title }}</td>
            <td data-label="Канал">{{ p.channel_title }}</td>
            <td data-label="Дата">{{ fmtDate(p.published_at) }}</td>
            <td class="num" data-label="Лайки">{{ fmtNum(p.likes_count) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
`,
  'server/express/routes/metrics.js': `import { Router } from 'express';
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
    \`select (select count(*)::int from channels c
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
              where ($1::int is null or p.channel_id = $1) and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes\`,
    await scope(req),
  );
  res.json(row);
});

r.get('/channels', async (req, res) => {
  const { rows } = await q(
    \`select c.id, c.title, c.username, c.subscribers_count,
            count(p.id) filter (where p.status = 'published')::int as posts,
            coalesce(sum(p.likes_count) filter (where p.status = 'published'), 0)::int as likes,
            coalesce(round(avg(p.likes_count) filter (where p.status = 'published'), 1), 0)::float as avg_likes,
            coalesce(c.subscribers_count - (
              select s.subscribers from channel_stats s
              where s.channel_id = c.id and s.recorded_at >= now() - interval '30 days'
              order by s.recorded_at asc limit 1), 0)::int as growth_30d
     from channels c left join posts p on p.channel_id = c.id
     where $1::int[] is null or c.id = any($1::int[])
     group by c.id order by c.id\`,
    [await accessibleChannelIds(req.user)],
  );
  res.json(rows);
});

// посты и лайки по дням за 30 дней
r.get('/timeline', async (req, res) => {
  const { rows } = await q(
    \`select to_char(d, 'YYYY-MM-DD') as day,
            (select count(*)::int from posts p
              where p.status = 'published' and p.published_at::date = d::date
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as posts,
            (select count(*)::int from post_likes l join posts p on p.id = l.post_id
              where l.created_at::date = d::date
                and ($1::int is null or p.channel_id = $1)
                and ($2::int[] is null or p.channel_id = any($2::int[]))) as likes
     from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') d
     order by d\`,
    await scope(req),
  );
  res.json(rows);
});

// подписчики по дням за 30 дней: у выбранного канала или суммарно по всем доступным.
// На каждый день берётся последний снимок на конец дня (если снимков до этого дня нет — самый ранний).
r.get('/subscribers', async (req, res) => {
  const { rows } = await q(
    \`select to_char(d, 'YYYY-MM-DD') as day, coalesce(sum(s.subscribers), 0)::int as subscribers
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
     group by d order by d\`,
    await scope(req),
  );
  // нет ни одного снимка — графику показывать нечего
  res.json(rows.some((x) => x.subscribers > 0) ? rows : []);
});

r.get('/top-posts', async (req, res) => {
  const { rows } = await q(
    \`select p.id, p.title, p.likes_count, p.published_at, c.title as channel_title
     from posts p join channels c on c.id = p.channel_id
     where p.status = 'published' and ($1::int is null or p.channel_id = $1)
       and ($2::int[] is null or p.channel_id = any($2::int[]))
     order by p.likes_count desc, p.published_at desc limit 10\`,
    await scope(req),
  );
  res.json(rows);
});

export default r;
`,
}

for (const f of Object.keys(files)) {
  if (!fs.existsSync(f)) {
    console.error(`Не найден ${f} — запускай скрипт из корня проекта tg-channel-manager`)
    process.exit(1)
  }
}

for (const [f, content] of Object.entries(files)) {
  fs.copyFileSync(f, f + '.bak')
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, content)
  console.log('обновлён', f)
}
console.log('Готово, копии: *.bak. Дальше: docker compose up -d --build')
