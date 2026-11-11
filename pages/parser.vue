<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()

const sources = ref<any[]>([])
const channels = ref<any[]>([])
const items = ref<any[]>([])
const hasMore = ref(false)
const sourceId = ref<number | ''>('')
const search = ref('')
const onlyNew = ref(false)
const username = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)
const draftFor = ref<number | null>(null)
const draft = reactive({ channel_id: null as number | null, add_source: true })
const expanded = ref<number[]>([])

async function loadSources() {
  sources.value = await api('/parser/sources')
}
async function loadPosts(reset = true) {
  const r = await api<{ items: any[]; hasMore: boolean }>('/parser/posts', {
    query: {
      source_id: sourceId.value || undefined,
      q: search.value.trim() || undefined,
      only_new: onlyNew.value ? 1 : undefined,
      offset: reset ? 0 : items.value.length,
    },
  })
  items.value = reset ? r.items : [...items.value, ...r.items]
  hasMore.value = r.hasMore
}
async function loadAll() {
  channels.value = await api('/channels')
  if (draft.channel_id === null) draft.channel_id = channels.value[0]?.id ?? null
  await Promise.all([loadSources(), loadPosts()])
}
async function run(fn: () => Promise<any>) {
  error.value = ''
  notice.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e: any) {
    error.value = e.message
  } finally {
    await loadAll().catch(() => {})
    busy.value = false
  }
}

const addSource = () =>
  run(async () => {
    const r = await api('/parser/sources', { method: 'POST', body: { username: username.value } })
    username.value = ''
    notice.value = `Канал «${r.title}» добавлен, загружено постов: ${r.total}`
  })
const refresh = (s: any) =>
  run(async () => {
    const r = await api(`/parser/sources/${s.id}/refresh`, { method: 'POST', body: { pages: 1 } })
    notice.value = `@${s.username}: новых постов ${r.added}`
  })
const refreshAll = () =>
  run(async () => {
    const res = await api<any[]>('/parser/refresh-all', { method: 'POST' })
    const added = res.reduce((n, x) => n + (x.added ?? 0), 0)
    const failed = res.filter((x) => x.error).length
    notice.value = `Новых постов: ${added}` + (failed ? `, ошибок: ${failed}` : '')
  })
const removeSource = (s: any) =>
  confirm(`Удалить канал «${s.title}» и все его спарсенные посты?`)
    ? run(async () => {
        await api(`/parser/sources/${s.id}`, { method: 'DELETE' })
        if (sourceId.value === s.id) sourceId.value = ''
      })
    : undefined

function openDraft(p: any) {
  draftFor.value = draftFor.value === p.id ? null : p.id
}
const makeDraft = (p: any) =>
  run(async () => {
    const r = await api<{ draft_id: number; warnings: string[] }>(`/parser/posts/${p.id}/draft`, {
      method: 'POST',
      body: { channel_id: draft.channel_id, add_source: draft.add_source },
    })
    draftFor.value = null
    notice.value = 'Черновик создан. Его можно отредактировать и запланировать на странице «Подготовка постов».' + (r.warnings.length ? ' ' + r.warnings.join('. ') + '.' : '')
  })

const isOpen = (id: number) => expanded.value.includes(id)
const toggleText = (id: number) => (expanded.value = isOpen(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id])

let timer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => loadPosts().catch((e) => (error.value = e.message)), 400)
})
watch([sourceId, onlyNew], () => loadPosts().catch((e) => (error.value = e.message)))
onBeforeUnmount(() => clearTimeout(timer))
onMounted(() => run(async () => {}))
</script>

<template>
  <section>
    <div class="row between head">
      <h1>Парсер</h1>
      <button :disabled="busy || !sources.length" @click="refreshAll">Обновить все каналы</button>
    </div>

    <form class="card" @submit.prevent="addSource">
      <h3>Добавить канал для парсинга</h3>
      <p class="muted" style="margin-top: 0">
        Укажите название канала: <code>@durov</code> или ссылку <code>t.me/durov</code>. Читаются публичные каналы с веб-просмотром,
        новые посты подгружаются автоматически раз в час.
      </p>
      <div class="row">
        <input v-model="username" required placeholder="@название_канала" style="flex: 1; min-width: 220px" />
        <button class="primary" :disabled="busy">{{ busy ? 'Загрузка…' : 'Добавить' }}</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="notice" class="pos">{{ notice }}</p>

    <article v-for="s in sources" :key="s.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ s.title }}</strong>
          <span class="muted"> @{{ s.username }} · постов: {{ fmtNum(s.posts_count) }} · обновлён: {{ fmtDate(s.last_parsed_at) }}</span>
          <p v-if="s.last_error" class="error" style="margin: 4px 0 0">{{ s.last_error }}</p>
        </div>
        <div class="actions" style="margin: 0">
          <button :disabled="busy" @click="refresh(s)">Обновить</button>
          <button v-if="isAdmin" class="danger" :disabled="busy" @click="removeSource(s)">Удалить</button>
        </div>
      </div>
    </article>
    <p v-if="!sources.length" class="muted">Каналов для парсинга пока нет. Добавьте первый выше.</p>

    <h2>Посты</h2>
    <div class="row" style="margin-bottom: 12px">
      <select v-model="sourceId" class="filter" aria-label="Канал-источник">
        <option value="">Все источники</option>
        <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.title }}</option>
      </select>
      <input v-model="search" type="search" placeholder="Поиск по тексту" style="flex: 1; min-width: 180px" />
      <label class="opt" style="border: 0; padding: 0"><input v-model="onlyNew" type="checkbox" /><span>Только без черновика</span></label>
    </div>
    <p v-if="!channels.length" class="muted">Чтобы формировать посты, вам должен быть доступен хотя бы один канал.</p>
    <p v-if="!items.length" class="muted">Постов не найдено.</p>

    <article v-for="p in items" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.source_title }}</strong>
          <span class="muted"> @{{ p.source_username }} · {{ fmtDate(p.posted_at) }}<template v-if="p.views !== null"> · просмотров: {{ fmtNum(p.views) }}</template></span>
        </div>
        <span v-if="p.draft_post_id" class="badge" :class="p.draft_status === 'published' ? 'published' : 'scheduled'">
          {{ p.draft_status === 'published' ? 'Опубликован' : 'Черновик создан' }}
        </span>
      </div>
      <img v-if="p.photo_url" :src="p.photo_url" class="thumb" alt="" loading="lazy" referrerpolicy="no-referrer" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      <p class="post-content" :class="{ clamp: !isOpen(p.id) }">{{ p.text || '(только картинка)' }}</p>
      <button v-if="p.text.length > 400" type="button" class="linkbtn" @click="toggleText(p.id)">{{ isOpen(p.id) ? 'Свернуть' : 'Показать полностью' }}</button>

      <div class="actions">
        <a :href="p.post_url" target="_blank" rel="noopener"><button>Открыть в Telegram</button></a>
        <button v-if="!p.draft_post_id" class="primary" :disabled="busy || !channels.length" @click="openDraft(p)">Сформировать пост</button>
        <NuxtLink v-else :to="p.draft_status === 'published' ? '/published' : '/drafts'"><button>{{ p.draft_status === 'published' ? 'Открыть в опубликованных' : 'Открыть в подготовке' }}</button></NuxtLink>
      </div>

      <form v-if="draftFor === p.id" class="picker" @submit.prevent="makeDraft(p)">
        <label style="margin-top: 0">Канал, в котором будет опубликован пост</label>
        <select v-model="draft.channel_id" required>
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <label class="opt"><input v-model="draft.add_source" type="checkbox" /><span>Указать источник: ссылка на оригинал в конце поста</span></label>
        <p class="muted" style="margin: 8px 0 0; font-size: 13px">Публикуя чужие материалы, соблюдайте права авторов и указывайте источник.</p>
        <div class="actions">
          <button class="primary" :disabled="busy">Создать черновик</button>
          <button type="button" @click="draftFor = null">Отмена</button>
        </div>
      </form>
    </article>

    <div v-if="hasMore" class="actions" style="justify-content: center">
      <button :disabled="busy" @click="loadPosts(false)">Показать ещё</button>
    </div>
  </section>
</template>
