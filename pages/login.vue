<script setup lang="ts">
const { needsSetup, login, setup, registration } = useAuth()
const email = ref('')
const name = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (needsSetup.value) await setup(email.value, name.value, password.value)
    else await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="card auth-card" @submit.prevent="submit">
    <h1>{{ needsSetup ? 'Создание администратора' : 'Вход' }}</h1>
    <p v-if="needsSetup" class="muted">Пользователей пока нет. Эта учётная запись станет администратором.</p>

    <label>Email</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <template v-if="needsSetup">
      <label>Имя</label>
      <input v-model="name" required autocomplete="name" />
    </template>

    <label>Пароль{{ needsSetup ? ' (не короче 8 символов)' : '' }}</label>
    <input v-model="password" type="password" required :minlength="needsSetup ? 8 : undefined" :autocomplete="needsSetup ? 'new-password' : 'current-password'" />

    <p v-if="error" class="error" style="margin-top: 12px">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ needsSetup ? 'Создать и войти' : 'Войти' }}</button>
    </div>
    <p v-if="!needsSetup && registration.open" class="muted" style="margin: 16px 0 0">
      Нет аккаунта? <NuxtLink to="/register">Зарегистрироваться</NuxtLink>
    </p>
  </form>
</template>
