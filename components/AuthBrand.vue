<script setup lang="ts">
const { t } = useLocale()
</script>

<template>
  <div class="auth-brand">
    <img src="/logo.png" alt="" class="auth-logo" />
    <span>{{ t('app.name') }}</span>
  </div>
</template>
