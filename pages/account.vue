<script setup lang="ts">
const api = useApi()
const { user } = useAuth()
const current = ref('')
const next = ref('')
const done = ref('')
const error = ref('')

async function change() {
  error.value = ''
  done.value = ''
  try {
    await api('/auth/password', { method: 'POST', body: { current: current.value, next: next.value } })
    current.value = ''
    next.value = ''
    done.value = 'Пароль изменён. На других устройствах потребуется войти заново.'
  } catch (e: any) {
    error.value = e.message
  }
}

// ---- удаление аккаунта ----
const info = ref<any>(null)
const delPassword = ref('')
const delError = ref('')
const delBusy = ref(false)

onMounted(() => {
  api('/auth/account').then((r: any) => (info.value = r)).catch(() => {})
})

async function deleteMyAccount() {
  delError.value = ''
  const what =
    info.value?.role === 'admin'
      ? `Будут безвозвратно удалены ваш аккаунт, все ваши каналы с постами и статистикой, источники парсера, подключённый бот и редакторы (${info.value.editors ?? 0}). Сообщения, уже опубликованные в Telegram, останутся.`
      : 'Ваш аккаунт будет безвозвратно удалён. Посты, которые вы создали, останутся у администратора.'
  if (!confirm(`Удалить аккаунт?\n\n${what}\n\nОтменить это будет нельзя.`)) return
  delBusy.value = true
  try {
    await api('/auth/delete-account', { method: 'POST', body: await sealFields({ password: delPassword.value }) })
    user.value = null
    await navigateTo('/login')
  } catch (e: any) {
    delError.value = e.message
  } finally {
    delBusy.value = false
  }
}
</script>

<template>
  <section>
    <div class="row head"><h1>Профиль</h1></div>
    <form class="card" style="max-width: 420px" @submit.prevent="change">
      <p class="mb-3">
        <strong>{{ user?.name }}</strong><br />
        <span class="muted">{{ user?.email }} · {{ user?.role === 'admin' ? 'администратор' : 'редактор' }}</span>
      </p>
      <h3>Смена пароля</h3>
      <label>Текущий пароль</label>
      <input v-model="current" type="password" required autocomplete="current-password" />
      <label>Новый пароль (не короче 8 символов)</label>
      <input v-model="next" type="password" required minlength="8" autocomplete="new-password" />
      <p v-if="error" class="error mt-3">{{ error }}</p>
      <p v-if="done" class="pos mt-3">{{ done }}</p>
      <div class="actions"><button class="primary">Сменить пароль</button></div>
    </form>

    <div class="card" style="max-width: 420px">
      <h3>Удаление аккаунта</h3>
      <p v-if="info?.inactive_days" class="muted" style="margin-top: 0">
        Если в аккаунт не заходить {{ info.inactive_days }} дн. подряд, он удаляется автоматически.
      </p>
      <p v-if="info?.is_super" class="muted">Главный администратор не может удалить аккаунт.</p>
      <form v-else-if="info" @submit.prevent="deleteMyAccount">
        <p v-if="info.role === 'admin'" class="warn">
          Вместе с аккаунтом удалятся ваши каналы (<b>{{ info.channels }}</b>) с постами и статистикой, источники парсера, бот и редакторы (<b>{{ info.editors }}</b>).
        </p>
        <p v-else class="muted">Удалится только ваш аккаунт. Созданные вами посты останутся у администратора.</p>
        <label>Пароль для подтверждения</label>
        <input v-model="delPassword" type="password" required autocomplete="current-password" />
        <p v-if="delError" class="error mt-3">{{ delError }}</p>
        <div class="actions"><button class="danger" :disabled="delBusy || !delPassword">{{ delBusy ? 'Удаляю…' : 'Удалить аккаунт' }}</button></div>
      </form>
    </div>
  </section>
</template>
