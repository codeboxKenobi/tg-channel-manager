<script setup lang="ts">
const api = useApi()
const overview = ref<any>(null)
const channels = ref<any[]>([])
const timeline = ref<any[]>([])
const subscribers = ref<any[]>([])
const top = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')
const loading = ref(true)

async function load() {
  error.value = ''
  try {
    const query = { channel_id: channelId.value || undefined }
    const [o, c, t, tp] = await Promise.all([
      api('/metrics/overview'),
      api('/metrics/channels'),
      api('/metrics/timeline', { query }),
      api('/metrics/top-posts', { query }),
    ])
    overview.value = o
    channels.value = c
    timeline.value = t
    top.value = tp
    subscribers.value = channelId.value ? await api('/metrics/subscribers', { query }) : []
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const postsSeries = computed(() => timeline.value.map((d) => ({ label: d.day.slice(5), value: d.posts })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: d.day.slice(5), value: d.likes })))
const subsSeries = computed(() => subscribers.value.map((d) => ({ label: d.label, value: d.subscribers })))

onMounted(load)
watch(channelId, () => {
  loading.value = true
  load()
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>Метрики</h1>
      <select v-model="channelId" class="filter">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="grid" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="card stat">
        <Skeleton width="56%" height="26px" />
        <Skeleton class="mt-2" width="84%" height="13px" />
      </div>
    </div>
    <div v-else-if="overview" class="grid">
      <div class="card stat"><b>{{ fmtNum(overview.subscribers) }}</b><span>Подписчиков во всех каналах</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.published) }}</b><span>Опубликовано постов</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.likes) }}</b><span>Лайков всего</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.scheduled) }}</b><span>В графике</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.drafts) }}</b><span>Черновиков</span></div>
    </div>

    <h2>Динамика за 30 дней</h2>
    <div class="charts">
      <template v-if="loading">
        <SkeletonChart v-for="n in 3" :key="n" />
      </template>
      <template v-else>
        <BarChart title="Публикации по дням" :items="postsSeries" />
        <BarChart title="Лайки по дням" :items="likesSeries" />
        <BarChart v-if="channelId" title="Подписчики канала" :items="subsSeries" from-min />
        <div v-else class="card chart"><h3>Подписчики канала</h3><p class="muted">Выберите канал, чтобы увидеть рост.</p></div>
      </template>
    </div>

    <h2>Каналы</h2>
    <SkeletonTable v-if="loading" :rows="3" :cols="6" />
    <div v-else class="card table-wrap">
      <table class="stack">
        <thead>
          <tr>
            <th>Канал</th><th class="num">Подписчики</th><th class="num">Рост за 30 дней</th>
            <th class="num">Постов</th><th class="num">Лайков</th><th class="num">Лайков на пост</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in channels" :key="c.id">
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
    <SkeletonTable v-if="loading" :rows="5" :cols="4" />
    <div v-else class="card table-wrap">
      <p v-if="!top.length" class="muted">Опубликованных постов пока нет.</p>
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
