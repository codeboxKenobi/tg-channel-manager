<script setup lang="ts">
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
const fmtDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`

const postsSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.posts })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.likes })))
const subsSeries = computed(() => subscribers.value.map((d) => ({ label: fmtDay(d.day), value: d.subscribers })))

const sum = (list: { value: number }[]) => list.reduce((acc, i) => acc + i.value, 0)
const postsTotal = computed(() => fmtNum(sum(postsSeries.value)))
const likesTotal = computed(() => fmtNum(sum(likesSeries.value)))
const subsLast = computed(() => (subsSeries.value.length ? fmtNum(subsSeries.value[subsSeries.value.length - 1].value) : ''))

const selected = computed(() => channels.value.find((c) => c.id === channelId.value))
const visibleChannels = computed(() => (channelId.value ? channels.value.filter((c) => c.id === channelId.value) : channels.value))
const scopeLabel = computed(() => (selected.value ? `«${selected.value.title}»` : 'во всех каналах'))

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
