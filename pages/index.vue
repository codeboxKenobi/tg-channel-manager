<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()
const channels = ref<any[]>([])
const chat = ref('')
const title = ref('')
const error = ref('')
const busy = ref(false)

async function load() {
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
  confirm(`Удалить канал «${c.title}» вместе со всеми его постами?`) &&
  run(() => api(`/channels/${c.id}`, { method: 'DELETE' }))

onMounted(() => run(async () => {}))
</script>

<template>
  <section>
    <div class="row head"><h1>Каналы</h1></div>

    <form v-if="isAdmin" class="card" @submit.prevent="add">
      <h3>Подключить канал</h3>
      <p class="muted" style="margin-top: 0">
        Добавьте бота администратором канала с правом публикации, затем укажите @username или числовой id канала.
      </p>
      <div class="row">
        <input v-model="chat" required placeholder="@my_channel или -1001234567890" style="flex: 2; min-width: 220px" />
        <input v-model="title" placeholder="Название (если бот не подключён к API)" style="flex: 2; min-width: 220px" />
        <button class="primary" :disabled="busy">Подключить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!channels.length" class="muted">{{ isAdmin ? 'Каналов пока нет. Подключите первый выше.' : 'Каналов пока нет. Попросите администратора подключить канал.' }}</p>

    <article v-for="c in channels" :key="c.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ c.title }}</strong>
          <span class="muted"> {{ c.username ? '@' + c.username : 'приватный канал' }}</span>
          <span v-if="!c.is_active" class="badge" style="margin-left: 8px">Отключён</span>
        </div>
        <div class="muted">{{ fmtNum(c.subscribers_count) }} подписчиков</div>
      </div>
      <p v-if="c.description" class="muted" style="margin: 6px 0 0">{{ c.description }}</p>
      <p style="margin: 8px 0 0">
        Опубликовано: <b>{{ c.published_count }}</b> · В подготовке: <b>{{ c.pending_count }}</b>
      </p>
      <div class="actions">
        <button :disabled="busy" @click="refresh(c)">Обновить данные</button>
        <button v-if="isAdmin" :disabled="busy" @click="toggle(c)">{{ c.is_active ? 'Отключить публикации' : 'Включить публикации' }}</button>
        <button v-if="isAdmin" class="danger" :disabled="busy" @click="remove(c)">Удалить</button>
      </div>
    </article>
  </section>
</template>
