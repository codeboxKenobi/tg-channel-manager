<script setup lang="ts">
const api = useApi()
const dialog = useDialog()
const { t, th } = useLocale()
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
  }, t('bot.connectedOk'))
const remove = async () => {
  const sure = await dialog.confirm({
    title: t('bot.disconnectTitle'),
    message: t('bot.disconnectMsg'),
    confirmText: t('bot.disconnect'),
    danger: true,
  })
  if (sure) await run(() => api('/bot', { method: 'DELETE' }), t('bot.disconnectedOk'))
}

onMounted(() => load().catch((e: any) => (error.value = e.message)))
</script>

<template>
  <section :aria-busy="!info && !error">
    <div class="row head"><h1>{{ t('bot.title') }}</h1></div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="ok" class="pos">{{ ok }}</p>
    <p v-if="info && !info.secrets_configured" class="error" v-html="th('bot.noSecrets')"></p>

    <div class="card">
      <h3>{{ t('bot.status') }}</h3>
      <div v-if="!info && !error" aria-hidden="true">
        <Skeleton width="60%" height="20px" />
        <Skeleton class="mt-2" width="40%" height="14px" />
      </div>
      <p v-else-if="!info" class="muted">{{ t('bot.statusUnavailable') }}</p>
      <p v-else-if="!info.connected" class="warn">{{ t('bot.notConnected') }}</p>
      <template v-else>
        <p>
          {{ t('bot.connectedLabel') }}
          <b v-if="info.username">@{{ info.username }}</b>
          <span v-if="info.updated_at" class="muted"> · {{ t('bot.updatedAt', { date: fmtDate(info.updated_at) }) }}</span>
        </p>
        <p v-if="info.source === 'env'" class="muted mt-2">{{ t('bot.defaultBot') }}</p>
        <p v-if="info.mode === 'webhook'" style="margin: 8px 0 0">
          {{ t('bot.updatesFrom') }}: <b>webhook</b>
          <span v-if="info.webhook?.registered" class="pos"> · {{ t('bot.webhookRegistered') }}</span>
          <span v-else class="warn"> · {{ t('bot.webhookNotRegistered') }}</span>
          <span v-if="info.webhook?.pending" class="muted"> · {{ t('bot.webhookPending', { n: info.webhook.pending }) }}</span>
        </p>
        <p v-if="info.webhook?.error" class="error" style="margin: 8px 0 0">{{ t('bot.webhookError', { error: info.webhook.error }) }}</p>
        <p v-if="info.webhook?.last_error" class="warn" style="margin: 8px 0 0">
          {{ t('bot.lastError') }}: {{ info.webhook.last_error.message }}
          <span v-if="info.webhook.last_error.at" class="muted">({{ fmtDate(info.webhook.last_error.at) }})</span>
          <br /><span class="muted">{{ t('bot.webhookHint') }}</span>
        </p>
        <p v-else-if="info.mode === 'polling'" class="muted" style="margin: 8px 0 0" v-html="th('bot.pollingHint')"></p>
      </template>
    </div>

    <form class="card" @submit.prevent="save">
      <h3>{{ info?.source === 'own' ? t('bot.replaceTitle') : t('bot.connectTitle') }}</h3>
      <p class="muted mb-3">{{ t('bot.tokenHelp') }}</p>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 1; min-width: 260px">
          <label>{{ t('bot.tokenLabel') }}</label>
          <input v-model="token" type="password" required autocomplete="off" placeholder="123456789:AA…" />
        </div>
        <button class="primary" :disabled="busy || !token.trim() || (info && !info.secrets_configured)">{{ busy ? t('common.checking') : t('common.save') }}</button>
        <button v-if="info?.source === 'own'" type="button" class="danger" :disabled="busy" @click="remove">{{ t('bot.disconnect') }}</button>
      </div>
    </form>

    <div class="card">
      <h3>{{ t('bot.howTitle') }}</h3>
      <ol class="steps">
        <li>{{ t('bot.step1') }}</li>
        <li>{{ t('bot.step2') }}</li>
        <li>{{ t('bot.step3') }}</li>
      </ol>
      <p class="muted mt-3">{{ t('bot.replaceNote') }}</p>
    </div>
  </section>
</template>
