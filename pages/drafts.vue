<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()
const channels = ref<any[]>([])
const posts = ref<any[]>([])
const channelId = ref<number | ''>('')
const editing = ref<any | null>(null)
const creating = ref(false)
const error = ref('')
const busy = ref(false)
const loading = ref(true)

const STATUS: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'В графике',
  publishing: 'Публикуется',
  failed: 'Ошибка публикации',
}

async function load() {
  try {
    channels.value = await api('/channels')
    posts.value = await api('/posts', {
      query: { status: 'draft,scheduled,publishing,failed', channel_id: channelId.value || undefined },
    })
  } finally {
    loading.value = false
  }
}
async function run(fn: () => Promise<any>) {
  error.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e: any) {
    error.value = e.message
  } finally {
    await load().catch(() => {})
    busy.value = false
  }
}

const save = (payload: any) =>
  run(async () => {
    if (editing.value) await api(`/posts/${editing.value.id}`, { method: 'PUT', body: payload })
    else await api('/posts', { method: 'POST', body: payload })
    editing.value = null
    creating.value = false
  })
const publishNow = (p: any) =>
  confirm(`Опубликовать «${p.title}» в канале «${p.channel_title}» прямо сейчас?`) &&
  run(() => api(`/posts/${p.id}/publish`, { method: 'POST' }))
const unschedule = (p: any) =>
  run(() => api(`/posts/${p.id}`, { method: 'PUT', body: { ...p, scheduled_at: null } }))
const remove = (p: any) =>
  confirm(`Удалить пост «${p.title}»?`) && run(() => api(`/posts/${p.id}`, { method: 'DELETE' }))

function startEdit(p: any) {
  creating.value = false
  editing.value = p
}
function startCreate() {
  editing.value = null
  creating.value = true
}
function closeForm() {
  editing.value = null
  creating.value = false
}

// список обновляется сам: запланированные посты уходят в «Опубликованные»
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  run(async () => {})
  timer = setInterval(() => load().catch(() => {}), 30000)
})
onBeforeUnmount(() => clearInterval(timer))
watch(channelId, () => {
  loading.value = true
  posts.value = []
  load().catch((e) => (error.value = e.message))
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>Подготовка постов</h1>
      <div class="row">
        <select v-model="channelId" class="filter">
          <option value="">Все каналы</option>
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <button class="primary" :disabled="!channels.length" @click="startCreate">Новый пост</button>
      </div>
    </div>

    <p v-if="!loading && !channels.length" class="muted">{{ isAdmin ? 'Сначала подключите канал на странице «Каналы».' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="creating || editing" class="card">
      <PostForm :key="editing?.id ?? 'new'" :channels="channels" :post="editing" @save="save" @cancel="closeForm" />
    </div>

    <p v-if="!loading && channels.length && !posts.length" class="muted">Постов в подготовке нет. Создайте новый.</p>

    <SkeletonCards v-if="loading" :count="3" :actions="4" />

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.title }}</strong>
          <span class="muted"> · {{ p.channel_title }}</span>
        </div>
        <span class="badge" :class="p.status">{{ STATUS[p.status] }}</span>
      </div>
      <p class="post-content">{{ p.content }}</p>
      <img v-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      <p v-if="p.scheduled_at" class="muted mt-2">Публикация: {{ fmtDate(p.scheduled_at) }}</p>
      <p v-if="p.author_name" class="muted mt-2">Автор: {{ p.author_name }}</p>
      <p v-if="p.error" class="error mt-2">{{ p.error }}</p>
      <div class="actions">
        <button :disabled="busy || p.status === 'publishing'" @click="startEdit(p)">Редактировать</button>
        <button class="primary" :disabled="busy || p.status === 'publishing'" @click="publishNow(p)">Опубликовать сейчас</button>
        <button v-if="p.status === 'scheduled'" :disabled="busy" @click="unschedule(p)">Убрать из графика</button>
        <button class="danger" :disabled="busy || p.status === 'publishing'" @click="remove(p)">Удалить</button>
      </div>
    </article>
  </section>
</template>
