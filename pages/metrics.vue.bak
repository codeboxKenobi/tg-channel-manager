<script setup lang="ts">
const api = useApi()
const route = useRoute()

const overview = ref<any>(null)
const channels = ref<any[]>([])
const timeline = ref<any[]>([])
const top = ref<any[]>([])
const channelId = ref<number | ''>(route.query.channel ? Number(route.query.channel) : '')
const error = ref('')
const loading = ref(false)
let seq = 0 // чтобы устаревший ответ не перезаписал свежий при быстрой смене канала

async function load() {
  const mine = ++seq
  error.value = ''
  loading.value = true
  try {
    const query = { channel_id: channelId.value || undefined }
    const [o, c, t, tp] = await Promise.all([
      api('/metrics/overview', { query }),
      api('/metrics/channels'),
      api('/metrics/timeline', { query }),
      api('/metrics/top-posts', { query }),
    ])
    if (mine !== seq) return
    overview.value = o
    channels.value = c
    timeline.value = t
    top.value = tp
    // канал из ссылки может быть недоступен — показываем общие метрики
    if (channelId.value && !c.some((x: any) => x.id === channelId.value)) channelId.value = ''
  } catch (e: any) {
    if (mine === seq) error.value = e.message
  } finally {
    if (mine === seq) loading.value = false
  }
}

watch(channelId, () => {
  navigateTo({ query: channelId.value ? { channel: String(channelId.value) } : {} }, { replace: true })
  load()
})
onMounted(load)

const current = computed(() => channels.value.find((c) => c.id === channelId.value))
const fmtDay = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`
const subsSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.subscribers as number | null })))
const postsSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.posts as number })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: fmtDay(d.day), value: d.likes as number })))

const total = (s: { value: number | null }[]) => s.reduce((sum, i) => sum + (i.value ?? 0), 0)
const signed = (n: number) => `${n > 0 ? '+' : ''}${fmtNum(n)}`
const subsCaption = computed(() => {
  const v = subsSeries.value.filter((i) => i.value !== null).map((i) => i.value as number)
  return v.length > 1 ? `${signed(v[v.length - 1] - v[0])} за 30 дней` : ''
})
</script>

<template>
  <section :class="{ busy: loading }">
    <div class="row between head">
      <div>
        <h1>Метрики</h1>
        <p class="muted" style="margin: 4px 0 0">
          {{ current ? 'Канал: ' + current.title : 'Общие метрики по всем каналам' + (channels.length ? ` (${channels.length})` : '') }}
        </p>
      </div>
      <select v-model="channelId" class="filter" aria-label="Канал">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="overview" class="grid">
      <div class="card stat"><b>{{ fmtNum(overview.subscribers) }}</b><span>Подписчиков</span></div>
      <div class="card stat">
        <b :class="{ pos: overview.growth_30d > 0 }">{{ signed(overview.growth_30d) }}</b><span>Рост за 30 дней</span>
      </div>
      <div class="card stat"><b>{{ fmtNum(overview.published) }}</b><span>Опубликовано постов</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.likes) }}</b><span>Лайков всего</span></div>
      <div class="card stat"><b>{{ overview.avg_likes }}</b><span>Лайков на пост</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.scheduled) }}</b><span>В графике</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.drafts) }}</b><span>Черновиков</span></div>
    </div>

    <h2>Динамика за 30 дней</h2>
    <div class="charts">
      <MetricChart title="Подписчики" :caption="subsCaption" :items="subsSeries" baseline="auto" />
      <MetricChart title="Публикации по дням" :caption="`всего ${fmtNum(total(postsSeries))}`" :items="postsSeries" />
      <MetricChart title="Лайки по дням" :caption="`всего ${fmtNum(total(likesSeries))}`" :items="likesSeries" />
    </div>

    <template v-if="!current">
      <h2>Каналы</h2>
      <div class="card table-wrap">
        <table class="stack">
          <thead>
            <tr>
              <th>Канал</th><th class="num">Подписчики</th><th class="num">Рост за 30 дней</th>
              <th class="num">Постов</th><th class="num">Лайков</th><th class="num">Лайков на пост</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in channels" :key="c.id">
              <td data-label="Канал"><button class="linkbtn" @click="channelId = c.id">{{ c.title }}</button></td>
              <td class="num" data-label="Подписчики">{{ fmtNum(c.subscribers_count) }}</td>
              <td class="num" data-label="Рост за 30 дней" :class="{ pos: c.growth_30d > 0 }">{{ signed(c.growth_30d) }}</td>
              <td class="num" data-label="Постов">{{ fmtNum(c.posts) }}</td>
              <td class="num" data-label="Лайков">{{ fmtNum(c.likes) }}</td>
              <td class="num" data-label="Лайков на пост">{{ c.avg_likes }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

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
