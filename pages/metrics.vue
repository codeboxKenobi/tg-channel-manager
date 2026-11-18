<script setup lang="ts">
const api = useApi()
const { t, locale } = useLocale()
const overview = ref<any>(null)
const channels = ref<any[]>([])
const timeline = ref<any[]>([])
const subscribers = ref<any[]>([])
const top = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')
const loading = ref(true)

let requestId = 0 // защита от гонки: учитываем только ответ последнего запроса

async function load() {
  const current = ++requestId
  error.value = ''
  try {
    const query = { channel_id: channelId.value || undefined }
    const [o, c, tl, s, tp] = await Promise.all([
      api('/metrics/overview', { query }),
      api('/metrics/channels'),
      api('/metrics/timeline', { query }),
      api('/metrics/subscribers', { query }),
      api('/metrics/top-posts', { query }),
    ])
    if (current !== requestId) return
    overview.value = o
    channels.value = c
    timeline.value = tl
    subscribers.value = s
    top.value = tp
  } catch (e: any) {
    if (current === requestId) error.value = e.message
  } finally {
    if (current === requestId) loading.value = false
  }
}

// 'YYYY-MM-DD' -> 'DD.MM' (en: 'DD/MM'); одинаковые подписи у всех графиков
const fmtDay = (day: string) => `${day.slice(8, 10)}${locale.value === 'ru' ? '.' : '/'}${day.slice(5, 7)}`

const postsSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.posts })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.likes })))
const subsSeries = computed(() => subscribers.value.map((d) => ({ label: fmtDay(d.day), value: d.subscribers })))

const sum = (list: { value: number }[]) => list.reduce((acc, i) => acc + i.value, 0)
const postsTotal = computed(() => fmtNum(sum(postsSeries.value)))
const likesTotal = computed(() => fmtNum(sum(likesSeries.value)))
const subsLast = computed(() => (subsSeries.value.length ? fmtNum(subsSeries.value[subsSeries.value.length - 1].value) : ''))

const selected = computed(() => channels.value.find((c) => c.id === channelId.value))
const visibleChannels = computed(() => (channelId.value ? channels.value.filter((c) => c.id === channelId.value) : channels.value))
const scopeLabel = computed(() => (selected.value ? t('metrics.scopeOne', { title: selected.value.title }) : t('metrics.scopeAll')))

onMounted(load)
watch(channelId, () => {
  loading.value = true
  load()
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>{{ t('metrics.title') }}</h1>
      <select v-model="channelId" class="filter">
        <option value="">{{ t('common.allChannels') }}</option>
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
      <div class="card stat"><b>{{ fmtNum(overview.subscribers) }}</b><span>{{ t('metrics.subscribersScope', { scope: scopeLabel }) }}</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.published) }}</b><span>{{ t('metrics.publishedPosts') }}</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.likes) }}</b><span>{{ t('metrics.likesTotal') }}</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.scheduled) }}</b><span>{{ t('metrics.scheduled') }}</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.drafts) }}</b><span>{{ t('metrics.drafts') }}</span></div>
    </div>

    <h2>{{ t('metrics.dynamics') }}</h2>
    <div class="charts">
      <template v-if="loading">
        <SkeletonChart v-for="n in 3" :key="n" />
      </template>
      <template v-else>
        <BarChart :title="t('metrics.chartPosts')" :items="postsSeries" :summary="postsTotal" />
        <BarChart :title="t('metrics.chartLikes')" :items="likesSeries" :summary="likesTotal" />
        <BarChart :title="t('metrics.chartSubs')" :items="subsSeries" :summary="subsLast" from-min />
      </template>
    </div>

    <h2>{{ selected ? t('metrics.channelOne') : t('metrics.channelMany') }}</h2>
    <SkeletonTable v-if="loading" :rows="3" :cols="6" />
    <div v-else class="card table-wrap">
      <table class="stack">
        <thead>
          <tr>
            <th>{{ t('metrics.col.channel') }}</th><th class="num">{{ t('metrics.col.subscribers') }}</th><th class="num">{{ t('metrics.col.growth') }}</th>
            <th class="num">{{ t('metrics.col.posts') }}</th><th class="num">{{ t('metrics.col.likes') }}</th><th class="num">{{ t('metrics.col.likesPerPost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in visibleChannels" :key="c.id">
            <td :data-label="t('metrics.col.channel')">{{ c.title }}</td>
            <td class="num" :data-label="t('metrics.col.subscribers')">{{ fmtNum(c.subscribers_count) }}</td>
            <td class="num" :data-label="t('metrics.col.growth')" :class="{ pos: c.growth_30d > 0 }">{{ c.growth_30d > 0 ? '+' : '' }}{{ fmtNum(c.growth_30d) }}</td>
            <td class="num" :data-label="t('metrics.col.posts')">{{ fmtNum(c.posts) }}</td>
            <td class="num" :data-label="t('metrics.col.likes')">{{ fmtNum(c.likes) }}</td>
            <td class="num" :data-label="t('metrics.col.likesPerPost')">{{ c.avg_likes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>{{ t('metrics.topPosts') }}</h2>
    <SkeletonTable v-if="loading" :rows="5" :cols="4" />
    <div v-else class="card table-wrap">
      <p v-if="!top.length" class="muted">{{ t('published.empty') }}</p>
      <table v-else class="stack">
        <thead><tr><th>{{ t('metrics.col.post') }}</th><th>{{ t('metrics.col.channel') }}</th><th>{{ t('metrics.col.date') }}</th><th class="num">{{ t('metrics.col.likesShort') }}</th></tr></thead>
        <tbody>
          <tr v-for="p in top" :key="p.id">
            <td :data-label="t('metrics.col.post')">{{ p.title }}</td>
            <td :data-label="t('metrics.col.channel')">{{ p.channel_title }}</td>
            <td :data-label="t('metrics.col.date')">{{ fmtDate(p.published_at) }}</td>
            <td class="num" :data-label="t('metrics.col.likesShort')">{{ fmtNum(p.likes_count) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
