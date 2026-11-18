<script setup lang="ts">
const api = useApi()
const dialog = useDialog()
const { user: me, isSuper } = useAuth()
const { t } = useLocale()
const users = ref<any[]>([]) // редакторы моего пространства
const admins = ref<any[]>([]) // все администраторы (только для главного администратора)
const channels = ref<any[]>([])
const editorForm = reactive({ email: '', name: '', password: '' })
const adminForm = reactive({ email: '', name: '', password: '' })
const error = ref('')
const busy = ref(false)
const accessFor = ref<any | null>(null)
const loading = ref(true)

async function load() {
  try {
    users.value = await api('/users')
    channels.value = await api('/channels')
    admins.value = isSuper.value ? await api('/users/admins') : []
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

const create = (role: 'editor' | 'admin', form: { email: string; name: string; password: string }) =>
  run(async () => {
    await api('/users', { method: 'POST', body: { email: form.email, name: form.name, role, ...(await sealFields({ password: form.password })) } })
    Object.assign(form, { email: '', name: '', password: '' })
  })
const resetPassword = async (u: any) => {
  const password = await dialog.prompt({
    title: t('users.resetTitle'),
    message: t('users.resetMsg', { email: u.email }),
    input: { label: t('field.newPassword'), type: 'password', minlength: 8, autocomplete: 'new-password' },
    confirmText: t('users.resetConfirm'),
  })
  if (password) await run(async () => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, ...(await sealFields({ password })) } }))
}
const removeEditor = async (u: any) => {
  const sure = await dialog.confirm({
    title: t('users.removeEditorTitle'),
    message: t('users.removeEditorMsg', { email: u.email }),
    confirmText: t('common.delete'),
    danger: true,
  })
  if (sure) await run(() => api(`/users/${u.id}`, { method: 'DELETE' }))
}
// администратор уносит с собой всё своё пространство, поэтому предупреждаем о его содержимом
const removeAdmin = async (u: any) => {
  const sure = await dialog.confirm({
    title: t('users.removeAdminTitle'),
    message: [
      t('users.removeAdminMsg1', { email: u.email }),
      t('users.removeAdminMsg2', { channels: u.channels_count, editors: u.editors_count }),
    ],
    confirmText: t('common.delete'),
    danger: true,
  })
  if (sure) await run(() => api(`/users/${u.id}?force=1`, { method: 'DELETE' }))
}

const channelOptions = computed(() =>
  channels.value.map((c) => ({ id: c.id, label: c.title, hint: c.username ? '@' + c.username : undefined })),
)
const pickedIds = (u: any): number[] => (u.channels ?? []).map((c: any) => c.id)
const saveAccess = (ids: number[]) =>
  run(async () => {
    await api(`/users/${accessFor.value.id}/channels`, { method: 'PUT', body: { channel_ids: ids } })
    accessFor.value = null
  })

onMounted(() => run(async () => {}))
</script>

<template>
  <section :aria-busy="loading">
    <div class="row head"><h1>{{ t('users.title') }}</h1></div>

    <form class="card" @submit.prevent="create('editor', editorForm)">
      <h3>{{ t('users.newEditor') }}</h3>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 2; min-width: 200px"><label>{{ t('field.email') }}</label><input v-model="editorForm.email" type="email" required /></div>
        <div style="flex: 1; min-width: 150px"><label>{{ t('field.name') }}</label><input v-model="editorForm.name" required /></div>
        <div style="flex: 1; min-width: 150px"><label>{{ t('field.password') }}</label><input v-model="editorForm.password" type="password" required minlength="8" autocomplete="new-password" /></div>
        <button class="primary" :disabled="busy">{{ t('common.add') }}</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="accessFor" class="card">
      <AccessPicker
        :key="accessFor.id"
        :title="t('users.channelsOf', { name: accessFor.name })"
        :options="channelOptions"
        :selected="pickedIds(accessFor)"
        :empty="t('users.noChannels')"
        @save="saveAccess"
        @cancel="accessFor = null"
      />
    </div>

    <h3 class="section-title">{{ t('users.myEditors') }}</h3>
    <SkeletonTable v-if="loading" :rows="3" :cols="4" />
    <div v-else class="card table-wrap">
      <p v-if="!users.length" class="muted">{{ t('users.noEditors') }}</p>
      <table v-else class="stack">
        <thead><tr><th>{{ t('users.col.name') }}</th><th>{{ t('field.email') }}</th><th>{{ t('users.col.channels') }}</th><th>{{ t('users.col.created') }}</th><th /></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td :data-label="t('users.col.name')">{{ u.name }}</td>
            <td :data-label="t('field.email')">{{ u.email }}</td>
            <td class="wrap" :data-label="t('users.col.channels')">
              <span v-if="!u.channels.length" class="warn">{{ t('users.noAccess') }}</span>
              <span v-else class="chips-inline"><span v-for="c in u.channels" :key="c.id" class="tagchip">{{ c.title }}</span></span>
            </td>
            <td :data-label="t('users.col.created')">{{ fmtDate(u.created_at) }}</td>
            <td class="num actions-cell">
              <button :disabled="busy" @click="accessFor = u">{{ t('users.channelsBtn') }}</button>
              <button :disabled="busy" @click="resetPassword(u)">{{ t('users.resetPassword') }}</button>
              <button class="danger" :disabled="busy" @click="removeEditor(u)">{{ t('common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="isSuper">
      <h3 class="section-title">{{ t('users.admins') }}</h3>
      <form class="card" @submit.prevent="create('admin', adminForm)">
        <h3>{{ t('users.newAdmin') }}</h3>
        <p class="muted mb-3">{{ t('users.newAdminHint') }}</p>
        <div class="row" style="align-items: flex-end">
          <div style="flex: 2; min-width: 200px"><label>{{ t('field.email') }}</label><input v-model="adminForm.email" type="email" required /></div>
          <div style="flex: 1; min-width: 150px"><label>{{ t('field.name') }}</label><input v-model="adminForm.name" required /></div>
          <div style="flex: 1; min-width: 150px"><label>{{ t('field.password') }}</label><input v-model="adminForm.password" type="password" required minlength="8" autocomplete="new-password" /></div>
          <button class="primary" :disabled="busy">{{ t('common.add') }}</button>
        </div>
      </form>

      <SkeletonTable v-if="loading" :rows="3" :cols="5" />
      <div v-else class="card table-wrap">
        <table class="stack">
          <thead><tr><th>{{ t('users.col.name') }}</th><th>{{ t('field.email') }}</th><th>{{ t('users.col.channelsCount') }}</th><th>{{ t('users.col.editorsCount') }}</th><th>{{ t('users.col.created') }}</th><th /></tr></thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id">
              <td :data-label="t('users.col.name')">
                {{ a.name }}
                <span v-if="a.id === me?.id" class="tagchip">{{ t('users.you') }}</span>
                <span v-else-if="a.is_super" class="tagchip">{{ t('users.main') }}</span>
              </td>
              <td :data-label="t('field.email')">{{ a.email }}</td>
              <td :data-label="t('users.col.channelsCount')">{{ a.channels_count }}</td>
              <td :data-label="t('users.col.editorsCount')">{{ a.editors_count }}</td>
              <td :data-label="t('users.col.created')">{{ fmtDate(a.created_at) }}</td>
              <td class="num actions-cell">
                <template v-if="a.id !== me?.id && !a.is_super">
                  <button :disabled="busy" @click="resetPassword(a)">{{ t('users.resetPassword') }}</button>
                  <button class="danger" :disabled="busy" @click="removeAdmin(a)">{{ t('common.delete') }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p class="muted">
      {{ t('users.footer') }}
      <template v-if="isSuper">{{ t('users.footerSuper') }}</template>
    </p>
  </section>
</template>
