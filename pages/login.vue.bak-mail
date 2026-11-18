<script setup lang="ts">
const { needsSetup, login, setup, registration } = useAuth()
const { t } = useLocale()
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
    <LangSwitch variant="buttons" />
    <AuthBrand />
    <h1>{{ needsSetup ? t('login.titleSetup') : t('login.title') }}</h1>
    <p v-if="needsSetup" class="muted">{{ t('login.noUsers') }}</p>

    <label>{{ t('field.email') }}</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <template v-if="needsSetup">
      <label>{{ t('field.name') }}</label>
      <input v-model="name" required autocomplete="name" />
    </template>

    <label>{{ needsSetup ? t('field.passwordMin') : t('field.password') }}</label>
    <input v-model="password" type="password" required :minlength="needsSetup ? 8 : undefined" :autocomplete="needsSetup ? 'new-password' : 'current-password'" />

    <p v-if="error" class="error mt-3">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ needsSetup ? t('login.createAndSignIn') : t('login.submit') }}</button>
    </div>
    <p v-if="!needsSetup && registration.open" class="muted mt-4">
      {{ t('login.noAccount') }} <NuxtLink to="/register">{{ t('login.register') }}</NuxtLink>
    </p>
  </form>
</template>
