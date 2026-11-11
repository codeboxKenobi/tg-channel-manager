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
    await api('/auth/password', { method: 'POST', body: await sealFields({ current: current.value, next: next.value }) })
    current.value = ''
    next.value = ''
    done.value = 'Пароль изменён. На других устройствах потребуется войти заново.'
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <section>
    <div class="row head"><h1>Профиль</h1></div>
    <form class="card" style="max-width: 420px" @submit.prevent="change">
      <p style="margin-top: 0">
        <strong>{{ user?.name }}</strong><br />
        <span class="muted">{{ user?.email }} · {{ user?.role === 'admin' ? 'администратор' : 'редактор' }}</span>
      </p>
      <h3>Смена пароля</h3>
      <label>Текущий пароль</label>
      <input v-model="current" type="password" required autocomplete="current-password" />
      <label>Новый пароль (не короче 8 символов)</label>
      <input v-model="next" type="password" required minlength="8" autocomplete="new-password" />
      <p v-if="error" class="error" style="margin-top: 12px">{{ error }}</p>
      <p v-if="done" class="pos" style="margin-top: 12px">{{ done }}</p>
      <div class="actions"><button class="primary">Сменить пароль</button></div>
    </form>
  </section>
</template>
