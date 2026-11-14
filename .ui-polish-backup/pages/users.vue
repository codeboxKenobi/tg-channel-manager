<script setup lang="ts">
const api = useApi()
const { user: me, isSuper } = useAuth()
const users = ref<any[]>([]) // редакторы моего пространства
const admins = ref<any[]>([]) // все администраторы (только для главного администратора)
const channels = ref<any[]>([])
const editorForm = reactive({ email: '', name: '', password: '' })
const adminForm = reactive({ email: '', name: '', password: '' })
const error = ref('')
const busy = ref(false)
const accessFor = ref<any | null>(null)

async function load() {
  users.value = await api('/users')
  channels.value = await api('/channels')
  admins.value = isSuper.value ? await api('/users/admins') : []
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
const resetPassword = (u: any) => {
  const password = prompt(`Новый пароль для ${u.email} (не короче 8 символов)`)
  return password ? run(async () => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, ...(await sealFields({ password })) } })) : undefined
}
const removeEditor = (u: any) =>
  confirm(`Удалить редактора ${u.email}?`) ? run(() => api(`/users/${u.id}`, { method: 'DELETE' })) : undefined
// администратор уносит с собой всё своё пространство, поэтому предупреждаем о его содержимом
const removeAdmin = (u: any) =>
  confirm(
    `Удалить администратора ${u.email}?\n\nВместе с ним будут безвозвратно удалены его каналы (${u.channels_count}) с постами и его редакторы (${u.editors_count}).`,
  )
    ? run(() => api(`/users/${u.id}?force=1`, { method: 'DELETE' }))
    : undefined

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
  <section>
    <div class="row head"><h1>Пользователи</h1></div>

    <form class="card" @submit.prevent="create('editor', editorForm)">
      <h3>Новый редактор</h3>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 2; min-width: 200px"><label>Email</label><input v-model="editorForm.email" type="email" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Имя</label><input v-model="editorForm.name" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Пароль</label><input v-model="editorForm.password" type="password" required minlength="8" autocomplete="new-password" /></div>
        <button class="primary" :disabled="busy">Добавить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="accessFor" class="card">
      <AccessPicker
        :key="accessFor.id"
        :title="'Каналы редактора ' + accessFor.name"
        :options="channelOptions"
        :selected="pickedIds(accessFor)"
        empty="Каналов пока нет. Подключите канал на странице «Каналы»."
        @save="saveAccess"
        @cancel="accessFor = null"
      />
    </div>

    <h3 style="margin: 20px 0 8px">Мои редакторы</h3>
    <div class="card table-wrap">
      <p v-if="!users.length" class="muted" style="margin: 0">Редакторов пока нет.</p>
      <table v-else class="stack">
        <thead><tr><th>Имя</th><th>Email</th><th>Каналы</th><th>Создан</th><th /></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td data-label="Имя">{{ u.name }}</td>
            <td data-label="Email">{{ u.email }}</td>
            <td class="wrap" data-label="Каналы">
              <span v-if="!u.channels.length" class="warn">нет доступа</span>
              <span v-else class="chips-inline"><span v-for="c in u.channels" :key="c.id" class="tagchip">{{ c.title }}</span></span>
            </td>
            <td data-label="Создан">{{ fmtDate(u.created_at) }}</td>
            <td class="num actions-cell">
              <button :disabled="busy" @click="accessFor = u">Каналы</button>
              <button :disabled="busy" @click="resetPassword(u)">Сбросить пароль</button>
              <button class="danger" :disabled="busy" @click="removeEditor(u)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="isSuper">
      <h3 style="margin: 28px 0 8px">Администраторы</h3>
      <form class="card" @submit.prevent="create('admin', adminForm)">
        <h3>Новый администратор</h3>
        <p class="muted" style="margin-top: 0">У каждого администратора своё изолированное пространство: свои каналы, редакторы и источники парсера. Вы их не увидите.</p>
        <div class="row" style="align-items: flex-end">
          <div style="flex: 2; min-width: 200px"><label>Email</label><input v-model="adminForm.email" type="email" required /></div>
          <div style="flex: 1; min-width: 150px"><label>Имя</label><input v-model="adminForm.name" required /></div>
          <div style="flex: 1; min-width: 150px"><label>Пароль</label><input v-model="adminForm.password" type="password" required minlength="8" autocomplete="new-password" /></div>
          <button class="primary" :disabled="busy">Добавить</button>
        </div>
      </form>

      <div class="card table-wrap">
        <table class="stack">
          <thead><tr><th>Имя</th><th>Email</th><th>Каналов</th><th>Редакторов</th><th>Создан</th><th /></tr></thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id">
              <td data-label="Имя">
                {{ a.name }}
                <span v-if="a.id === me?.id" class="tagchip">вы</span>
                <span v-else-if="a.is_super" class="tagchip">главный</span>
              </td>
              <td data-label="Email">{{ a.email }}</td>
              <td data-label="Каналов">{{ a.channels_count }}</td>
              <td data-label="Редакторов">{{ a.editors_count }}</td>
              <td data-label="Создан">{{ fmtDate(a.created_at) }}</td>
              <td class="num actions-cell">
                <template v-if="a.id !== me?.id && !a.is_super">
                  <button :disabled="busy" @click="resetPassword(a)">Сбросить пароль</button>
                  <button class="danger" :disabled="busy" @click="removeAdmin(a)">Удалить</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <p class="muted">
      Администратор работает в своём изолированном пространстве: видит только свои каналы, посты, метрики и источники парсера, и управляет только своими редакторами.
      Редактор работает только с каналами, которые за ним закреплены.
      <template v-if="isSuper">Главный администратор дополнительно создаёт других администраторов и может удалить их вместе с их пространством.</template>
    </p>
  </section>
</template>
