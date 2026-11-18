<script setup lang="ts">
const api = useApi()
const dialog = useDialog()
const { user, changeLang } = useAuth()
const { t, th } = useLocale()
const current = ref('')
const next = ref('')
const done = ref(false)
const error = ref('')

async function change() {
  error.value = ''
  done.value = false
  try {
    await api('/auth/password', { method: 'POST', body: { current: current.value, next: next.value } })
    current.value = ''
    next.value = ''
    done.value = true
  } catch (e: any) {
    error.value = e.message
  }
}

// ---- язык интерфейса ----
// Интерфейс переключается сразу; если сохранить язык в аккаунте не вышло, он всё равно остаётся выбранным в этом браузере
const langBusy = ref(false)
const langSaved = ref(false)
const langError = ref('')

async function onLang(code: string) {
  langSaved.value = false
  langError.value = ''
  langBusy.value = true
  try {
    await changeLang(code)
    langSaved.value = true
  } catch (e: any) {
    langError.value = e.message
  } finally {
    langBusy.value = false
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
      ? t('account.confirmMsgAdmin', { editors: info.value.editors ?? 0 })
      : t('account.confirmMsgEditor')
  const sure = await dialog.confirm({
    title: t('account.confirmTitle'),
    message: [what, t('account.confirmIrreversible')],
    confirmText: t('account.deleteBtn'),
    danger: true,
  })
  if (!sure) return
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
    <div class="row head"><h1>{{ t('account.title') }}</h1></div>
    <form class="card" style="max-width: 420px" @submit.prevent="change">
      <p class="mb-3">
        <strong>{{ user?.name }}</strong><br />
        <span class="muted">{{ user?.email }} · {{ user?.role === 'admin' ? t('role.admin') : t('role.editor') }}</span>
      </p>
      <h3>{{ t('account.passwordTitle') }}</h3>
      <label>{{ t('field.currentPassword') }}</label>
      <input v-model="current" type="password" required autocomplete="current-password" />
      <label>{{ t('field.newPassword') }}</label>
      <input v-model="next" type="password" required minlength="8" autocomplete="new-password" />
      <p v-if="error" class="error mt-3">{{ error }}</p>
      <p v-if="done" class="pos mt-3">{{ t('account.passwordChanged') }}</p>
      <div class="actions"><button class="primary">{{ t('account.changePassword') }}</button></div>
    </form>

    <div class="card" style="max-width: 420px">
      <h3>{{ t('account.languageTitle') }}</h3>
      <label for="lang-select">{{ t('account.languageLabel') }}</label>
      <LangSwitch id="lang-select" :disabled="langBusy" @change="onLang" />
      <p class="muted mt-3">{{ t('account.languageHint') }}</p>
      <p v-if="langError" class="error mt-3">{{ t('account.languageSaveFailed', { error: langError }) }}</p>
      <p v-else-if="langSaved" class="pos mt-3" role="status">{{ t('account.languageSaved') }}</p>
    </div>

    <div class="card" style="max-width: 420px">
      <h3>{{ t('account.deleteTitle') }}</h3>
      <p v-if="info?.inactive_days" class="muted" style="margin-top: 0">
        {{ t('account.inactiveInfo', { n: info.inactive_days }, info.inactive_days) }}
      </p>
      <p v-if="info?.is_super" class="muted">{{ t('account.superNoDelete') }}</p>
      <form v-else-if="info" @submit.prevent="deleteMyAccount">
        <p v-if="info.role === 'admin'" class="warn" v-html="th('account.adminWarn', { channels: info.channels, editors: info.editors })"></p>
        <p v-else class="muted">{{ t('account.editorWarn') }}</p>
        <label>{{ t('account.confirmPassword') }}</label>
        <input v-model="delPassword" type="password" required autocomplete="current-password" />
        <p v-if="delError" class="error mt-3">{{ delError }}</p>
        <div class="actions"><button class="danger" :disabled="delBusy || !delPassword">{{ delBusy ? t('account.deleting') : t('account.deleteBtn') }}</button></div>
      </form>
    </div>
  </section>
</template>
