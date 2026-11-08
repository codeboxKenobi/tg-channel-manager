<script setup lang="ts">
const api = useApi()
const PAGE = 30
const CLAMP = 500 // длиннее — текст сворачивается

const sources = ref<any[]>([])
const selected = ref<number[]>([])
const channelInput = ref('')
const limit = ref(20)

const channels = ref<any[]>([]) // каналы публикации (с учётом доступа пользователя)
const targetId = ref<number | ''>('')

const posts = ref<any[]>([])
const total = ref(0)
const filterSource = ref<number | ''>('')
const search = ref('')
const expanded = ref<number[]>([])

const error = ref('')
const info = ref('')
const draftLink = ref(false)
const adding = ref(false)
const parsing = ref(false)
const loadingPosts = ref(false)
const creating = ref<number[]>([])

const allSelected = computed(() => sources.value.length > 0 && selected.value.length === sources.value.length)
const hasMore = computed(() => posts.value.length < total.value)

function say(message: string, withLink = false) {
  error.value = ''
  info.value = message
  draftLink.value = withLink
}
function fail(e: any) {
  info.value = ''
  draftLink.value = false
  error.value = e.message
}

async function loadSources() {
  sources.value = await api('/parser/sources')
  const ids = new Set(sources.value.map((s) => s.id))
  selected.value = selected.value.filter((id) => ids.has(id))
}

let seq = 0
async function loadPosts(append = false) {
  const mine = ++seq
  loadingPosts.value = true
  try {
    const r = await api<{ items: any[]; total: number }>('/parser/posts', {
      query: {
        source_ids: filterSource.value || undefined,
        q: search.value.trim() || undefined,
        limit: PAGE,
        offset: append ? posts.value.length : 0,
      },
    })
    if (mine !== seq) return // пришёл ответ на устаревший запрос
    posts.value = append ? [...posts.value, ...r.items] : r.items
    if (!append || r.items.length) total.value = r.total
  } catch (e: any) {
    if (mine === seq) fail(e)
  } finally {
    if (mine === seq) loadingPosts.value = false
  }
}

const toggleAll = () => (selected.value = allSelected.value ? [] : sources.value.map((s) => s.id))

async function add() {
  adding.value = true
  try {
    const s = await api('/parser/sources', { method: 'POST', body: { channel: channelInput.value } })
    channelInput.value = ''
    selected.value = [...selected.value, s.id]
    say(`Канал @${s.username} добавлен. Загружено новых постов: ${s.added}.`)
    await Promise.all([loadSources(), loadPosts()])
  } catch (e: any) {
    fail(e)
  } finally {
    adding.value = false
  }
}

async function parse() {
  parsing.value = true
  try {
    const { results } = await api<{ results: any[] }>('/parser/parse', {
      method: 'POST',
      body: { source_ids: selected.value, limit: limit.value },
    })
    const ok = results.filter((r) => !r.error)
    const bad = results.filter((r) => r.error)
    const added = ok.reduce((n, r) => n + r.added, 0)
    say(ok.length ? `Готово: каналов — ${ok.length}, новых постов — ${added}.` : '')
    if (bad.length) error.value = bad.map((r) => `@${r.username}: ${r.error}`).join('\n')
  } catch (e: any) {
    fail(e)
  } finally {
    parsing.value = false
    await Promise.all([loadSources(), loadPosts()]).catch(() => {})
  }
}

async function removeSource(s: any) {
  if (!confirm(`Удалить канал @${s.username} и ${s.posts_count} спарсенных постов? Уже созданные черновики останутся.`)) return
  try {
    await api(`/parser/sources/${s.id}`, { method: 'DELETE' })
    if (filterSource.value === s.id) filterSource.value = ''
    say(`Канал @${s.username} удалён.`)
  } catch (e: any) {
    fail(e)
  }
  await Promise.all([loadSources(), loadPosts()]).catch(() => {})
}

async function makeDraft(p: any) {
  if (!targetId.value) return fail(new Error('Выберите канал для публикации'))
  creating.value.push(p.id)
  try {
    const r = await api<{ post: any; note: string | null }>(`/parser/posts/${p.id}/draft`, {
      method: 'POST',
      body: { channel_id: targetId.value },
    })
    p.draft_post_id = r.post.id
    p.draft_status = r.post.status
    say(`Пост добавлен в «Подготовку постов».${r.note ? ' ' + r.note + '.' : ''}`, true)
  } catch (e: any) {
    fail(e)
    await loadPosts().catch(() => {}) // например, 409: пост уже сформирован в другой вкладке
  } finally {
    creating.value = creating.value.filter((id) => id !== p.id)
  }
}

const shown = (p: any) => (p.content.length > CLAMP && !expanded.value.includes(p.id) ? p.content.slice(0, CLAMP).trimEnd() + '…' : p.content)
const toggleText = (id: number) => (expanded.value = expanded.value.includes(id) ? expanded.value.filter((x) => x !== id) : [...expanded.value, id])

let timer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => loadPosts(), 350)
})
watch(filterSource, () => loadPosts())
onBeforeUnmount(() => clearTimeout(timer))

onMounted(async () => {
  try {
    channels.value = await api('/channels')
    targetId.value = channels.value[0]?.id ?? ''
    await Promise.all([loadSources(), loadPosts()])
  } catch (e: any) {
    fail(e)
  }
})
</script>

<template>
  <section>
    <div class="row head"><h1>Парсер</h1></div>

    <form class="card" @submit.prevent="add">
      <h3>Добавить канал</h3>
      <p class="muted" style="margin-top: 0">
        Укажите @username или ссылку на публичный канал. Парсится его открытая веб-версия (t.me/s/…), поэтому приватные каналы и каналы с отключённым просмотром не подойдут.
      </p>
      <div class="row">
        <input v-model="channelInput" required placeholder="@channel_name или https://t.me/channel_name" style="flex: 1; min-width: 240px" />
        <button class="primary" :disabled="adding || parsing">{{ adding ? 'Проверяю…' : 'Добавить' }}</button>
      </div>
    </form>

    <p v-if="error" class="error pre-line">{{ error }}</p>
    <p v-if="info" class="pos" style="margin: 0 0 12px">
      {{ info }}
      <NuxtLink v-if="draftLink" to="/drafts">Открыть «Подготовка постов»</NuxtLink>
    </p>

    <div class="card">
      <h3>Каналы для парсинга</h3>
      <p v-if="!sources.length" class="muted" style="margin: 0">Каналов пока нет. Добавьте первый выше.</p>
      <template v-else>
        <label class="opt all"><input type="checkbox" :checked="allSelected" @change="toggleAll" /><span>Выбрать все</span></label>
        <div v-for="s in sources" :key="s.id" class="src-row">
          <label>
            <input v-model="selected" type="checkbox" :value="s.id" />
            <span class="src-info">
              <b>{{ s.title || s.username }}</b>
              <span class="muted"> @{{ s.username }} · постов: {{ fmtNum(s.posts_count) }} · {{ s.last_parsed_at ? 'обновлён ' + fmtDate(s.last_parsed_at) : 'ещё не парсился' }}</span>
              <span v-if="s.last_error" class="error">{{ s.last_error }}</span>
            </span>
          </label>
          <button type="button" class="danger" :disabled="parsing" @click="removeSource(s)">Удалить</button>
        </div>
        <div class="parse-bar">
          <select v-model.number="limit" aria-label="Сколько постов загружать">
            <option :value="20">20 последних постов</option>
            <option :value="50">50 последних постов</option>
            <option :value="100">100 последних постов</option>
            <option :value="200">200 последних постов</option>
          </select>
          <button class="primary" :disabled="!selected.length || parsing || adding" @click="parse">
            {{ parsing ? 'Парсинг…' : `Спарсить выбранные (${selected.length})` }}
          </button>
        </div>
        <p class="muted" style="margin: 8px 0 0; font-size: 13px">Чем больше постов, тем дольше загрузка. Уже сохранённые посты не дублируются. Из текста удаляются ссылки, @упоминания, хештеги и рекламные подписи; посты без текста пропускаются.</p>
      </template>
    </div>

    <div class="row between head" style="margin-top: 24px">
      <h1 style="font-size: 18px">Спарсенные посты<span v-if="total" class="muted"> · {{ fmtNum(total) }}</span></h1>
      <div class="row">
        <select v-model="filterSource" class="filter" aria-label="Фильтр по каналу-источнику">
          <option value="">Все источники</option>
          <option v-for="s in sources" :key="s.id" :value="s.id">@{{ s.username }}</option>
        </select>
        <input v-model="search" type="search" placeholder="Поиск по тексту" class="filter" />
      </div>
    </div>

    <div class="card">
      <label style="margin-top: 0">Канал публикации для кнопки «Сформировать пост»</label>
      <select v-model="targetId" :disabled="!channels.length">
        <option v-if="!channels.length" value="">Нет доступных каналов</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
      <p v-if="!channels.length" class="muted" style="margin: 8px 0 0">Каналов для публикации нет: подключите канал на странице «Каналы» или попросите администратора выдать доступ.</p>
    </div>

    <p v-if="sources.length && !posts.length && !loadingPosts" class="muted">
      {{ search || filterSource ? 'По фильтру ничего не найдено.' : 'Спарсенных постов пока нет. Выберите каналы и нажмите «Спарсить выбранные».' }}
    </p>

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.source_title || p.source_username }}</strong>
          <span class="muted"> @{{ p.source_username }}</span>
        </div>
        <span class="muted">{{ fmtDate(p.posted_at) }}</span>
      </div>
      <p class="post-content">{{ shown(p) }}</p>
      <button v-if="p.content.length > CLAMP" type="button" class="link" @click="toggleText(p.id)">
        {{ expanded.includes(p.id) ? 'Свернуть' : 'Показать полностью' }}
      </button>
      <img v-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <div class="actions">
        <button v-if="!p.draft_post_id" class="primary" :disabled="!targetId || creating.includes(p.id)" @click="makeDraft(p)">
          {{ creating.includes(p.id) ? 'Формирую…' : 'Сформировать пост' }}
        </button>
        <NuxtLink v-else-if="p.draft_status !== 'published'" to="/drafts"><button>Уже в «Подготовке постов»</button></NuxtLink>
        <span v-else class="badge published" style="align-self: center">Уже опубликован</span>
        <a :href="`https://t.me/${p.source_username}/${p.tg_post_id}`" target="_blank" rel="noopener"><button>Открыть оригинал</button></a>
      </div>
    </article>

    <div v-if="hasMore" class="row" style="justify-content: center">
      <button :disabled="loadingPosts" @click="loadPosts(true)">{{ loadingPosts ? 'Загрузка…' : 'Показать ещё' }}</button>
    </div>
  </section>
</template>
