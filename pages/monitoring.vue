<script setup lang="ts">
const api = useApi()
const { t, intlLocale } = useLocale()
const { user: me } = useAuth()

const data = ref<any>(null)
const error = ref('')
const loading = ref(true)
const search = ref('')
const role = ref<'' | 'admin' | 'editor'>('')

async function load() {
  try {
    data.value = await api('/monitoring')
    error.value = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// данные обновляются сами раз в 30 секунд, пока страница открыта
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  load()
  timer = setInterval(load, 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const rtf = computed(() => new Intl.RelativeTimeFormat(intlLocale.value, { numeric: 'auto' }))
function ago(iso: string) {
  const sec = Math.abs(Date.now() - Date.parse(iso)) / 1000
  if (sec < 60) return t('monitoring.justNow')
  if (sec < 3600) return rtf.value.format(-Math.round(sec / 60), 'minute')
  if (sec < 172800) return rtf.value.format(-Math.round(sec / 3600), 'hour')
  return rtf.value.format(-Math.round(sec / 86400), 'day')
}

const users = computed<any[]>(() => {
  const q = search.value.trim().toLowerCase()
  return (data.value?.users ?? []).filter(
    (u: any) => (!role.value || u.role === role.value) && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  )
})

const stats = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    [s.users, t('monitoring.users')],
    [s.admins, t('monitoring.admins')],
    [s.editors, t('monitoring.editors')],
    [s.active_24h, t('monitoring.active24')],
    [s.active_7d, t('monitoring.active7')],
    [s.active_30d, t('monitoring.active30')],
    [s.sessions, t('monitoring.sessions')],
    [s.channels, t('monitoring.channels')],
    [s.bots, t('monitoring.bots')],
    [s.parser_sources, t('monitoring.parserSources')],
    [s.published_7d, t('monitoring.published7')],
    [s.posts?.scheduled ?? 0, t('monitoring.scheduled')],
    [s.posts?.failed ?? 0, t('monitoring.failed')],
  ] as [number, string][]
})

const deleteIn = (u: any) => (u.days_left === null ? '—' : t('monitoring.days', { n: u.days_left }))
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>{{ t('monitoring.title') }}</h1>
      <span v-if="data" class="muted">{{ t('monitoring.updated', { time: fmtDate(data.generated_at) }) }}</span>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="grid" aria-hidden="true">
      <div v-for="n in 8" :key="n" class="card stat">
        <Skeleton width="56%" height="26px" />
        <Skeleton class="mt-2" width="84%" height="13px" />
      </div>
    </div>
    <div v-else-if="data" class="grid">
      <div v-for="([n, label], i) in stats" :key="i" class="card stat"><b>{{ fmtNum(n) }}</b><span>{{ label }}</span></div>
    </div>

    <div class="row mt-2" style="margin-bottom: var(--s-3)">
      <input v-model="search" class="filter" style="width: 260px" type="search" :placeholder="t('monitoring.search')" :aria-label="t('monitoring.search')" />
      <select v-model="role" class="filter" :aria-label="t('monitoring.col.role')">
        <option value="">{{ t('monitoring.allRoles') }}</option>
        <option value="admin">{{ t('role.admin') }}</option>
        <option value="editor">{{ t('role.editor') }}</option>
      </select>
    </div>

    <SkeletonTable v-if="loading" :rows="6" :cols="6" />
    <div v-else class="card table-wrap">
      <p v-if="!users.length" class="muted">{{ t('monitoring.empty') }}</p>
      <table v-else class="stack">
        <thead>
          <tr>
            <th>{{ t('monitoring.col.user') }}</th>
            <th>{{ t('monitoring.col.role') }}</th>
            <th>{{ t('monitoring.col.workspace') }}</th>
            <th>{{ t('monitoring.col.channels') }}</th>
            <th>{{ t('monitoring.col.editors') }}</th>
            <th>{{ t('monitoring.col.posts') }}</th>
            <th>{{ t('monitoring.col.bot') }}</th>
            <th>{{ t('monitoring.col.sessions') }}</th>
            <th>{{ t('monitoring.col.lang') }}</th>
            <th>{{ t('monitoring.col.created') }}</th>
            <th>{{ t('monitoring.col.active') }}</th>
            <th>{{ t('monitoring.col.deleteIn') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td :data-label="t('monitoring.col.user')" class="user-cell">
              <div class="uwho">
                <span>
                  {{ u.name }}
                  <span v-if="u.id === me?.id" class="tagchip">{{ t('users.you') }}</span>
                  <span v-else-if="u.is_super" class="tagchip">{{ t('users.main') }}</span>
                </span>
                <small class="muted email">{{ u.email }}</small>
              </div>
            </td>
            <td :data-label="t('monitoring.col.role')">{{ t('role.' + u.role) }}</td>
            <td :data-label="t('monitoring.col.workspace')">{{ u.role === 'editor' ? u.owner_name || '—' : t('monitoring.own') }}</td>
            <td :data-label="t('monitoring.col.channels')">{{ u.channels }}</td>
            <td :data-label="t('monitoring.col.editors')">{{ u.editors ?? '—' }}</td>
            <td :data-label="t('monitoring.col.posts')">{{ u.posts_created }}</td>
            <td :data-label="t('monitoring.col.bot')">{{ u.role === 'admin' ? (u.has_bot ? '✓' : '—') : '' }}</td>
            <td :data-label="t('monitoring.col.sessions')">{{ u.sessions }}</td>
            <td :data-label="t('monitoring.col.lang')">{{ (u.lang || '').toUpperCase() }}</td>
            <td :data-label="t('monitoring.col.created')">{{ fmtDate(u.created_at) }}</td>
            <td :data-label="t('monitoring.col.active')" :title="fmtDate(u.last_active_at)">{{ ago(u.last_active_at) }}</td>
            <td :data-label="t('monitoring.col.deleteIn')" :class="{ warn: u.days_left !== null && u.days_left <= 14 }">{{ deleteIn(u) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted mt-2">{{ t('monitoring.hint') }}</p>
  </section>
</template>

<style scoped>
.uwho { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.email { overflow-wrap: anywhere; word-break: break-word; }
@media (max-width: 640px) {
  .uwho { align-items: flex-end; text-align: right; flex: 1 1 auto; }
  .user-cell { align-items: flex-start; }
  .user-cell::before { padding-top: 1px; }
  td { min-width: 0; }
}
</style>
