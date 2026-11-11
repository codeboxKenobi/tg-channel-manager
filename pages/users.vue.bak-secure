<script setup lang="ts">
const api = useApi()
const { user: me } = useAuth()
const users = ref<any[]>([])
const channels = ref<any[]>([])
const form = reactive({ email: '', name: '', password: '', role: 'editor' })
const error = ref('')
const busy = ref(false)
const accessFor = ref<any | null>(null)

async function load() {
  users.value = await api('/users')
  channels.value = await api('/channels')
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

const create = () =>
  run(async () => {
    await api('/users', { method: 'POST', body: { ...form } })
    Object.assign(form, { email: '', name: '', password: '', role: 'editor' })
  })
const setRole = (u: any, role: string) => run(() => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, role } }))
const resetPassword = (u: any) => {
  const password = prompt(`Новый пароль для ${u.email} (не короче 8 символов)`)
  return password ? run(() => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, role: u.role, password } })) : undefined
}
const remove = (u: any) =>
  confirm(`Удалить пользователя ${u.email}?`) ? run(() => api(`/users/${u.id}`, { method: 'DELETE' })) : undefined

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

    <form class="card" @submit.prevent="create">
      <h3>Новый пользователь</h3>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 2; min-width: 200px"><label>Email</label><input v-model="form.email" type="email" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Имя</label><input v-model="form.name" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Пароль</label><input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" /></div>
        <div style="width: 150px">
          <label>Роль</label>
          <select v-model="form.role"><option value="editor">Редактор</option><option value="admin">Администратор</option></select>
        </div>
        <button class="primary" :disabled="busy">Добавить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="accessFor" class="card">
      <AccessPicker
        :key="accessFor.id"
        :title="'Каналы пользователя ' + accessFor.name"
        :options="channelOptions"
        :selected="pickedIds(accessFor)"
        empty="Каналов пока нет. Подключите канал на странице «Каналы»."
        @save="saveAccess"
        @cancel="accessFor = null"
      />
    </div>

    <div class="card table-wrap">
      <table class="stack">
        <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Каналы</th><th>Создан</th><th /></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td data-label="Имя">{{ u.name }}</td>
            <td data-label="Email">{{ u.email }}</td>
            <td data-label="Роль">
              <select :value="u.role" :disabled="busy || u.id === me?.id" style="width: 160px" @change="setRole(u, ($event.target as HTMLSelectElement).value)">
                <option value="editor">Редактор</option>
                <option value="admin">Администратор</option>
              </select>
            </td>
            <td class="wrap" data-label="Каналы">
              <span v-if="u.role === 'admin'" class="muted">все каналы</span>
              <span v-else-if="!u.channels.length" class="warn">нет доступа</span>
              <span v-else class="chips-inline"><span v-for="c in u.channels" :key="c.id" class="tagchip">{{ c.title }}</span></span>
            </td>
            <td data-label="Создан">{{ fmtDate(u.created_at) }}</td>
            <td class="num actions-cell">
              <button v-if="u.role === 'editor'" :disabled="busy" @click="accessFor = u">Каналы</button>
              <button :disabled="busy" @click="resetPassword(u)">Сбросить пароль</button>
              <button class="danger" :disabled="busy || u.id === me?.id" @click="remove(u)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted">
      Администратор видит все каналы и управляет пользователями. Редактор работает только с каналами, которые за ним закреплены:
      он видит их посты и метрики, остальные каналы для него скрыты.
    </p>
  </section>
</template>
