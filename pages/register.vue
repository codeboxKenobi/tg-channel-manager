<script setup lang="ts">
const { registration, register } = useAuth()
const { t } = useLocale()
const email = ref('')
const name = ref('')
const password = ref('')
const repeat = ref('')
const code = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== repeat.value) return void (error.value = t('register.mismatch'))
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
    <LangSwitch variant="buttons" />
    <AuthBrand />
    <h1>{{ t('register.title') }}</h1>
    <p class="muted">{{ t('register.intro') }}</p>

    <label>{{ t('field.email') }}</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <label>{{ t('field.name') }}</label>
    <input v-model="name" required autocomplete="name" />

    <label>{{ t('field.passwordMin') }}</label>
    <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />

    <label>{{ t('field.repeatPassword') }}</label>
    <input v-model="repeat" type="password" required minlength="8" autocomplete="new-password" />

    <template v-if="registration.code_required">
      <label>{{ t('field.inviteCode') }}</label>
      <input v-model="code" type="password" required autocomplete="off" />
    </template>

    <p v-if="error" class="error mt-3">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ busy ? t('register.busy') : t('register.submit') }}</button>
    </div>
    <p class="muted mt-4">{{ t('register.haveAccount') }} <NuxtLink to="/login">{{ t('login.submit') }}</NuxtLink></p>
  </form>

  <div v-else class="card auth-card">
    <LangSwitch variant="buttons" />
    <AuthBrand />
    <h1>{{ t('register.title') }}</h1>
    <p class="muted">{{ t('register.disabled') }}</p>
    <p class="muted"><NuxtLink to="/login">{{ t('login.submit') }}</NuxtLink></p>
  </div>
</template>
