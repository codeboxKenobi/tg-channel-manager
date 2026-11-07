<script setup lang="ts">
const api = useApi()
const { user: me } = useAuth()
const users = ref<any[]>([])
const form = reactive({ email: '', name: '', password: '', role: 'editor' })
const error = ref('')
const busy = ref(false)

async function load() {
  users.value = await api('/users')
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

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Создан</th><th /></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td>
              <select :value="u.role" :disabled="busy || u.id === me?.id" style="width: 160px" @change="setRole(u, ($event.target as HTMLSelectElement).value)">
                <option value="editor">Редактор</option>
                <option value="admin">Администратор</option>
              </select>
            </td>
            <td>{{ fmtDate(u.created_at) }}</td>
            <td class="num">
              <button :disabled="busy" @click="resetPassword(u)">Сбросить пароль</button>
              <button class="danger" :disabled="busy || u.id === me?.id" @click="remove(u)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted">Редактор работает с постами и видит метрики. Администратор дополнительно подключает каналы и управляет пользователями.</p>
  </section>
</template>
