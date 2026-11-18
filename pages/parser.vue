<script setup lang="ts">
const api = useApi()
const dialog = useDialog()
const { t, tServer } = useLocale()
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
const booting = ref(true) // первая загрузка страницы

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
    say(t('parser.added', { username: s.username, added: s.added }))
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
    say(ok.length ? t('parser.done', { channels: ok.length, added }) : '')
    if (bad.length) error.value = bad.map((r) => `@${r.username}: ${tServer(r.error)}`).join('\n')
  } catch (e: any) {
    fail(e)
  } finally {
    parsing.value = false
    await Promise.all([loadSources(), loadPosts()]).catch(() => {})
  }
}

async function removeSource(s: any) {
  const sure = await dialog.confirm({
    title: t('channels.deleteTitle'),
    message: t('parser.deleteMsg', { username: s.username, n: s.posts_count }, s.posts_count),
    confirmText: t('common.delete'),
    danger: true,
  })
  if (!sure) return
  try {
    await api(`/parser/sources/${s.id}`, { method: 'DELETE' })
    if (filterSource.value === s.id) filterSource.value = ''
    say(t('parser.removed', { username: s.username }))
  } catch (e: any) {
    fail(e)
  }
  await Promise.all([loadSources(), loadPosts()]).catch(() => {})
}

async function makeDraft(p: any) {
  if (!targetId.value) return fail(new Error(t('parser.pickChannel')))
  creating.value.push(p.id)
  try {
    const r = await api<{ post: any; note: string | null }>(`/parser/posts/${p.id}/draft`, {
      method: 'POST',
      body: { channel_id: targetId.value },
    })
    p.draft_post_id = r.post.id
    p.draft_status = r.post.status
    say(`${t('parser.draftAdded')}${r.note ? ' ' + tServer(r.note) + '.' : ''}`, true)
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
  } finally {
    booting.value = false
  }
})
</script>

<template>
  <section :aria-busy="booting">
    <div class="row head"><h1>{{ t('parser.title') }}</h1></div>

    <form class="card" @submit.prevent="add">
      <h3>{{ t('parser.addTitle') }}</h3>
      <p class="muted mb-3">{{ t('parser.addHint') }}</p>
      <div class="row">
        <input v-model="channelInput" required :placeholder="t('parser.addPlaceholder')" style="flex: 1; min-width: 240px" />
        <button class="primary" :disabled="adding || parsing">{{ adding ? t('common.checking') : t('common.add') }}</button>
      </div>
    </form>

    <p v-if="error" class="error pre-line">{{ error }}</p>
    <p v-if="info" class="pos">
      {{ info }}
      <NuxtLink v-if="draftLink" to="/drafts">{{ t('parser.openDrafts') }}</NuxtLink>
    </p>

    <div class="card">
      <h3>{{ t('parser.sourcesTitle') }}</h3>
      <div v-if="booting" aria-hidden="true">
        <div v-for="n in 3" :key="n" class="src-row">
          <Skeleton width="18px" height="18px" radius="4px" />
          <div class="sk-cell"><Skeleton :width="n === 2 ? '48%' : '64%'" height="16px" /></div>
          <Skeleton width="84px" height="41px" radius="8px" />
        </div>
      </div>
      <p v-else-if="!sources.length" class="muted">{{ t('parser.noSources') }}</p>
      <template v-else>
        <label class="opt all"><input type="checkbox" :checked="allSelected" @change="toggleAll" /><span>{{ t('common.selectAll') }}</span></label>
        <div v-for="s in sources" :key="s.id" class="src-row">
          <label>
            <input v-model="selected" type="checkbox" :value="s.id" />
            <span class="src-info">
              <b>{{ s.title || s.username }}</b>
              <span class="muted"> @{{ s.username }} · {{ t('parser.postsCount', { n: fmtNum(s.posts_count) }) }} · {{ s.last_parsed_at ? t('parser.updatedAt', { date: fmtDate(s.last_parsed_at) }) : t('parser.neverParsed') }}</span>
              <span v-if="s.last_error" class="error">{{ tServer(s.last_error) }}</span>
            </span>
          </label>
          <button type="button" class="danger" :disabled="parsing" @click="removeSource(s)">{{ t('common.delete') }}</button>
        </div>
        <div class="parse-bar">
          <select v-model.number="limit" :aria-label="t('parser.limitAria')">
            <option v-for="n in [20, 50, 100, 200]" :key="n" :value="n">{{ t('parser.limitOption', { n }) }}</option>
          </select>
          <button class="primary" :disabled="!selected.length || parsing || adding" @click="parse">
            {{ parsing ? t('parser.parsing') : t('parser.parseBtn', { n: selected.length }) }}
          </button>
        </div>
        <p class="muted small mt-2">{{ t('parser.parseNote') }}</p>
      </template>
    </div>

    <div class="row between head mt-5">
      <h1 style="font-size: 18px">{{ t('parser.postsTitle') }}<span v-if="total" class="muted"> · {{ fmtNum(total) }}</span></h1>
      <div class="row">
        <select v-model="filterSource" class="filter" :aria-label="t('parser.filterAria')">
          <option value="">{{ t('parser.allSources') }}</option>
          <option v-for="s in sources" :key="s.id" :value="s.id">@{{ s.username }}</option>
        </select>
        <input v-model="search" type="search" :placeholder="t('parser.searchPlaceholder')" class="filter" />
      </div>
    </div>

    <div class="card">
      <label>{{ t('parser.targetLabel') }}</label>
      <select v-model="targetId" :disabled="booting || !channels.length">
        <option v-if="!booting && !channels.length" value="">{{ t('parser.noTargets') }}</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
      <p v-if="!booting && !channels.length" class="muted mt-2">{{ t('parser.noTargetsHint') }}</p>
    </div>

    <p v-if="sources.length && !posts.length && !loadingPosts" class="muted">
      {{ search || filterSource ? t('parser.noMatches') : t('parser.noPosts') }}
    </p>

    <SkeletonCards v-if="booting || (loadingPosts && !posts.length)" :count="3" :actions="2" />

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.source_title || p.source_username }}</strong>
          <span class="muted"> @{{ p.source_username }}</span>
        </div>
        <span class="muted">{{ p.media_type === 'video' ? t('parser.videoLabel') + ' · ' : '' }}{{ fmtDate(p.posted_at) }}</span>
      </div>
      <p class="post-content">{{ shown(p) }}</p>
      <button v-if="p.content.length > CLAMP" type="button" class="link" @click="toggleText(p.id)">
        {{ expanded.includes(p.id) ? t('parser.collapse') : t('parser.expand') }}
      </button>
      <video v-if="p.media_url && p.media_type === 'video'" :src="p.media_url" class="thumb" controls playsinline preload="metadata" />
      <img v-else-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" referrerpolicy="no-referrer" />
      <div class="actions">
        <button v-if="!p.draft_post_id" class="primary" :disabled="!targetId || creating.includes(p.id)" @click="makeDraft(p)">
          {{ creating.includes(p.id) ? t('parser.making') : t('parser.makeDraft') }}
        </button>
        <NuxtLink v-else-if="p.draft_status !== 'published'" to="/drafts"><button>{{ t('parser.inDrafts') }}</button></NuxtLink>
        <span v-else class="badge published" style="align-self: center">{{ t('parser.alreadyPublished') }}</span>
        <a :href="`https://t.me/${p.source_username}/${p.tg_post_id}`" target="_blank" rel="noopener"><button>{{ t('parser.openOriginal') }}</button></a>
      </div>
    </article>

    <div v-if="hasMore" class="row" style="justify-content: center">
      <button :disabled="loadingPosts" @click="loadPosts(true)">{{ loadingPosts ? t('common.loading') : t('parser.loadMore') }}</button>
    </div>
  </section>
</template>
