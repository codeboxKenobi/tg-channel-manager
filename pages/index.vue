<script setup lang="ts">
const api = useApi()
const dialog = useDialog()
const { isAdmin } = useAuth()
const { t } = useLocale()
const channels = ref<any[]>([])
const editors = ref<any[]>([])
const chat = ref('')
const title = ref('')
const error = ref('')
const busy = ref(false)
const accessFor = ref<number | null>(null)
const loading = ref(true)

async function load() {
  try {
    channels.value = await api('/channels')
    if (isAdmin.value) editors.value = (await api<any[]>('/users')).filter((u) => u.role === 'editor')
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

const add = () =>
  run(async () => {
    await api('/channels', { method: 'POST', body: { chat: chat.value.trim(), title: title.value.trim() } })
    chat.value = ''
    title.value = ''
  })
const toggle = (c: any) =>
  run(() => api(`/channels/${c.id}`, { method: 'PUT', body: { title: c.title, description: c.description, is_active: !c.is_active } }))
const refresh = (c: any) => run(() => api(`/channels/${c.id}/refresh`, { method: 'POST' }))
const remove = async (c: any) => {
  const sure = await dialog.confirm({
    title: t('channels.deleteTitle'),
    message: t('channels.deleteMsg', { title: c.title }),
    confirmText: t('common.delete'),
    danger: true,
  })
  if (sure) await run(() => api(`/channels/${c.id}`, { method: 'DELETE' }))
}

const editorOptions = computed(() => editors.value.map((u) => ({ id: u.id, label: u.name, hint: u.email })))
const assignedIds = (c: any): number[] => (c.assigned_users ?? []).map((u: any) => u.id)
const saveAccess = (c: any, ids: number[]) =>
  run(async () => {
    await api(`/channels/${c.id}/users`, { method: 'PUT', body: { user_ids: ids } })
    accessFor.value = null
  })

onMounted(() => run(async () => {}))
</script>

<template>
  <section :aria-busy="loading">
    <div class="row head"><h1>{{ t('channels.title') }}</h1></div>

    <form v-if="isAdmin" class="card" @submit.prevent="add">
      <h3>{{ t('channels.connectTitle') }}</h3>
      <p class="muted mb-3">{{ t('channels.connectHint') }}</p>
      <div class="row">
        <input v-model="chat" required :placeholder="t('channels.chatPlaceholder')" style="flex: 2; min-width: 220px" />
        <input v-model="title" :placeholder="t('channels.titlePlaceholder')" style="flex: 2; min-width: 220px" />
        <button class="primary" :disabled="busy">{{ t('channels.connect') }}</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!loading && !channels.length" class="muted">
      {{ isAdmin ? t('channels.emptyAdmin') : t('channels.emptyEditor') }}
    </p>

    <SkeletonCards v-if="loading" :count="3" :actions="isAdmin ? 4 : 1" />

    <article v-for="c in channels" :key="c.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ c.title }}</strong>
          <span class="muted"> {{ c.username ? '@' + c.username : t('channels.private') }}</span>
          <span v-if="!c.is_active" class="badge ml-2">{{ t('channels.disabled') }}</span>
        </div>
        <div class="muted">{{ t('channels.subscribers', { n: fmtNum(c.subscribers_count) }, c.subscribers_count) }}</div>
      </div>
      <p v-if="c.description" class="muted mt-2">{{ c.description }}</p>
      <p class="mt-2">
        {{ t('channels.published') }}: <b>{{ c.published_count }}</b> · {{ t('channels.pending') }}: <b>{{ c.pending_count }}</b>
      </p>
      <p v-if="isAdmin" class="muted mt-2">
        {{ t('channels.access') }}:
        <span v-if="!c.assigned_users.length">{{ t('channels.adminsOnly') }}</span>
        <span v-else class="chips-inline"><span v-for="u in c.assigned_users" :key="u.id" class="tagchip">{{ u.name }}</span></span>
      </p>
      <div class="actions">
        <button :disabled="busy" @click="refresh(c)">{{ t('channels.refresh') }}</button>
        <button v-if="isAdmin" :disabled="busy" @click="accessFor = accessFor === c.id ? null : c.id">{{ t('channels.access') }}</button>
        <button v-if="isAdmin" :disabled="busy" @click="toggle(c)">{{ c.is_active ? t('channels.disablePosting') : t('channels.enablePosting') }}</button>
        <button v-if="isAdmin" class="danger" :disabled="busy" @click="remove(c)">{{ t('common.delete') }}</button>
      </div>
      <AccessPicker
        v-if="isAdmin && accessFor === c.id"
        :key="c.id"
        :title="t('channels.accessTitle')"
        :options="editorOptions"
        :selected="assignedIds(c)"
        :empty="t('channels.noEditors')"
        @save="(ids) => saveAccess(c, ids)"
        @cancel="accessFor = null"
      />
    </article>
  </section>
</template>
