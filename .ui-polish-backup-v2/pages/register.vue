<script setup lang="ts">
const { registration, register } = useAuth()
const email = ref('')
const name = ref('')
const password = ref('')
const repeat = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== repeat.value) return void (error.value = 'Пароли не совпадают')
  busy.value = true
  try {
    await register(email.value, name.value, password.value, code.value)
    await navigateTo('/bot') // первым делом администратору нужно подключить своего бота
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form v-if="registration.open" class="card auth-card" @submit.prevent="submit">
    <h1>Регистрация</h1>
    <p class="muted">
      Вы получите собственное изолированное пространство: свои каналы, редакторов и источники парсера.
      Публиковать посты будет ваш бот, токен которого вы подключите после регистрации.
    </p>

    <label>Email</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <label>Имя</label>
    <input v-model="name" required autocomplete="name" />

    <label>Пароль (не короче 8 символов)</label>
    <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />

    <label>Повторите пароль</label>
    <input v-model="repeat" type="password" required minlength="8" autocomplete="new-password" />

    <template v-if="registration.code_required">
      <label>Код приглашения</label>
      <input v-model="code" type="password" required autocomplete="off" />
    </template>

    <p v-if="error" class="error" style="margin-top: 12px">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ busy ? 'Создаю…' : 'Зарегистрироваться' }}</button>
    </div>
    <p class="muted" style="margin: 16px 0 0">Уже есть аккаунт? <NuxtLink to="/login">Войти</NuxtLink></p>
  </form>

  <div v-else class="card auth-card">
    <h1>Регистрация</h1>
    <p class="muted">Самостоятельная регистрация отключена. Попросите администратора создать для вас аккаунт.</p>
    <p class="muted"><NuxtLink to="/login">Войти</NuxtLink></p>
  </div>
</template>
