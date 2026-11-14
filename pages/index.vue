<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()
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
const remove = (c: any) =>
  confirm(`Удалить канал «${c.title}» вместе со всеми его постами?`) ? run(() => api(`/channels/${c.id}`, { method: 'DELETE' })) : undefined

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
    <div class="row head"><h1>Каналы</h1></div>

    <form v-if="isAdmin" class="card" @submit.prevent="add">
      <h3>Подключить канал</h3>
      <p class="muted mb-3">
        Добавьте бота администратором канала с правом публикации, затем укажите @username или числовой id канала.
      </p>
      <div class="row">
        <input v-model="chat" required placeholder="@my_channel или -1001234567890" style="flex: 2; min-width: 220px" />
        <input v-model="title" placeholder="Название (если бот не подключён к API)" style="flex: 2; min-width: 220px" />
        <button class="primary" :disabled="busy">Подключить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!loading && !channels.length" class="muted">
      {{ isAdmin ? 'Каналов пока нет. Подключите первый выше.' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}
    </p>

    <SkeletonCards v-if="loading" :count="3" :actions="isAdmin ? 4 : 1" />

    <article v-for="c in channels" :key="c.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ c.title }}</strong>
          <span class="muted"> {{ c.username ? '@' + c.username : 'приватный канал' }}</span>
          <span v-if="!c.is_active" class="badge ml-2">Отключён</span>
        </div>
        <div class="muted">{{ fmtNum(c.subscribers_count) }} подписчиков</div>
      </div>
      <p v-if="c.description" class="muted mt-2">{{ c.description }}</p>
      <p class="mt-2">
        Опубликовано: <b>{{ c.published_count }}</b> · В подготовке: <b>{{ c.pending_count }}</b>
      </p>
      <p v-if="isAdmin" class="muted mt-2">
        Доступ:
        <span v-if="!c.assigned_users.length">только администраторы</span>
        <span v-else class="chips-inline"><span v-for="u in c.assigned_users" :key="u.id" class="tagchip">{{ u.name }}</span></span>
      </p>
      <div class="actions">
        <button :disabled="busy" @click="refresh(c)">Обновить данные</button>
        <button v-if="isAdmin" :disabled="busy" @click="accessFor = accessFor === c.id ? null : c.id">Доступ</button>
        <button v-if="isAdmin" :disabled="busy" @click="toggle(c)">{{ c.is_active ? 'Отключить публикации' : 'Включить публикации' }}</button>
        <button v-if="isAdmin" class="danger" :disabled="busy" @click="remove(c)">Удалить</button>
      </div>
      <AccessPicker
        v-if="isAdmin && accessFor === c.id"
        :key="c.id"
        title="Кому доступен канал"
        :options="editorOptions"
        :selected="assignedIds(c)"
        empty="Редакторов пока нет. Добавьте их на странице «Пользователи»."
        @save="(ids) => saveAccess(c, ids)"
        @cancel="accessFor = null"
      />
    </article>
  </section>
</template>
