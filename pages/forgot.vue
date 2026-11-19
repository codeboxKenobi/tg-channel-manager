<script setup lang="ts">
// Восстановление пароля: 1) email → код на почту, 2) код + новый пароль.
const { forgot, resetPassword } = useAuth()
const { t } = useLocale()
const route = useRoute()
const step = ref<'email' | 'code'>('email')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const code = ref('')
const password = ref('')
const repeat = ref('')
const error = ref('')
const busy = ref(false)
const minutes = ref(15)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function sendCode() {
  error.value = ''
  busy.value = true
  try {
    const r = await forgot(email.value.trim())
    minutes.value = r.minutes
    step.value = 'code'
    startCooldown()
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

async function submit() {
  error.value = ''
  if (password.value !== repeat.value) return void (error.value = t('register.mismatch'))
  busy.value = true
  try {
    await resetPassword(email.value.trim(), code.value, password.value)
    await navigateTo('/login?reset=1')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form v-if="step === 'email'" class="card auth-card" @submit.prevent="sendCode">
    <LangSwitch variant="buttons" />
    <AuthBrand />
    <h1>{{ t('forgot.title') }}</h1>
    <p class="muted">{{ t('forgot.intro') }}</p>

    <label>{{ t('field.email') }}</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <p v-if="error" class="error mt-3">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ t('forgot.sendCode') }}</button>
    </div>
    <p class="muted mt-4"><NuxtLink to="/login">{{ t('forgot.backToLogin') }}</NuxtLink></p>
  </form>

  <form v-else class="card auth-card" @submit.prevent="submit">
    <LangSwitch variant="buttons" />
    <AuthBrand />
    <h1>{{ t('forgot.newPasswordTitle') }}</h1>
    <p class="muted">{{ t('forgot.sentNotice', { email, minutes }) }}</p>

    <label>{{ t('forgot.codeLabel') }}</label>
    <input v-model="code" required inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="one-time-code" autofocus />

    <label>{{ t('field.newPassword') }}</label>
    <input v-model="password" type="password" required minlength="8" autocomplete="new-password" />

    <label>{{ t('field.repeatPassword') }}</label>
    <input v-model="repeat" type="password" required minlength="8" autocomplete="new-password" />

    <p v-if="error" class="error mt-3">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ t('account.changePassword') }}</button>
    </div>
    <p class="muted mt-4">
      {{ t('forgot.noMail') }}
      <button v-if="cooldown <= 0" type="button" class="linkbtn" :disabled="busy" @click="sendCode">{{ t('forgot.resend') }}</button>
      <span v-else>{{ t('forgot.resendIn', { n: cooldown }) }}</span>
    </p>
    <p class="muted mt-2"><NuxtLink to="/login">{{ t('forgot.backToLogin') }}</NuxtLink></p>
  </form>
</template>

<style scoped>
/* кнопка «Отправить код ещё раз» выглядит как ссылка (как остальные ссылки приложения) */
.linkbtn { background: none; border: 0; padding: 0; font: inherit; color: var(--accent); cursor: pointer; }
.linkbtn:hover { color: color-mix(in srgb, var(--accent) 75%, var(--text)); }
.linkbtn:disabled { opacity: 0.6; cursor: default; }
</style>
