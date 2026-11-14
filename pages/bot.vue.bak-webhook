<script setup lang="ts">
const api = useApi()
const info = ref<any | null>(null)
const token = ref('')
const error = ref('')
const ok = ref('')
const busy = ref(false)

async function load() {
  info.value = await api('/bot')
}
async function run(fn: () => Promise<any>, done: string) {
  error.value = ''
  ok.value = ''
  busy.value = true
  try {
    info.value = await fn()
    ok.value = done
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const save = () =>
  run(async () => {
    const r = await api('/bot', { method: 'PUT', body: await sealFields({ token: token.value.trim() }) })
    token.value = '' // токен после сохранения нигде не остаётся
    return r
  }, 'Бот подключён.')
const remove = () =>
  confirm(
    'Отключить бота?\n\nПубликация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.',
  )
    ? run(() => api('/bot', { method: 'DELETE' }), 'Бот отключён.')
    : undefined

onMounted(() => load().catch((e: any) => (error.value = e.message)))
</script>

<template>
  <section>
    <div class="row head"><h1>Бот</h1></div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="ok" class="pos" style="margin: 0 0 12px">{{ ok }}</p>
    <p v-if="info && !info.secrets_configured" class="error">
      На сервере не задан <code>SECRETS_KEY</code>: токен бота негде безопасно хранить, подключить его пока нельзя. Обратитесь к владельцу сервера.
    </p>

    <div class="card">
      <h3>Статус</h3>
      <p v-if="!info" class="muted" style="margin: 0">Загрузка…</p>
      <p v-else-if="!info.connected" class="warn" style="margin: 0">
        Бот не подключён: публикация, сбор статистики и подключение каналов по @username недоступны.
      </p>
      <template v-else>
        <p style="margin: 0">
          Подключён
          <b v-if="info.username">@{{ info.username }}</b>
          <span v-if="info.updated_at" class="muted"> · обновлён {{ fmtDate(info.updated_at) }}</span>
        </p>
        <p v-if="info.source === 'env'" class="muted" style="margin: 8px 0 0">
          Используется бот по умолчанию из настроек сервера. Подключите своего бота ниже, и он заменит его.
        </p>
      </template>
    </div>

    <form class="card" @submit.prevent="save">
      <h3>{{ info?.source === 'own' ? 'Заменить бота' : 'Подключить бота' }}</h3>
      <p class="muted" style="margin-top: 0">
        Создайте бота у @BotFather и вставьте его токен. Токен хранится на сервере в зашифрованном виде, виден только вам и не показывается после сохранения.
        У каждого администратора свой бот, поэтому ваши каналы и публикации недоступны другим.
      </p>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 1; min-width: 260px">
          <label>Токен бота</label>
          <input v-model="token" type="password" required autocomplete="off" placeholder="123456789:AA…" />
        </div>
        <button class="primary" :disabled="busy || !token.trim() || (info && !info.secrets_configured)">{{ busy ? 'Проверяю…' : 'Сохранить' }}</button>
        <button v-if="info?.source === 'own'" type="button" class="danger" :disabled="busy" @click="remove">Отключить</button>
      </div>
    </form>

    <div class="card">
      <h3>Как подключить канал</h3>
      <ol style="margin: 0; padding-left: 20px; line-height: 1.7">
        <li>Подключите бота выше.</li>
        <li>Добавьте этого бота администратором своего канала с правом публикации сообщений.</li>
        <li>На странице «Каналы» укажите @username или числовой id канала.</li>
      </ol>
      <p class="muted" style="margin: 12px 0 0">
        Если заменить бота, под старыми постами «лайки» работать перестанут (кнопки привязаны к прежнему боту), а новый бот нужно заново добавить администратором в каналы.
      </p>
    </div>
  </section>
</template>
