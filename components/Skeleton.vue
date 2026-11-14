<script setup lang="ts">
// Базовый «скелет»: серый блок с мерцанием. Размеры — любые CSS-значения.
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: '16px',
  radius: undefined,
})
</script>

<template>
  <span class="sk" :style="{ width, height, borderRadius: radius }" aria-hidden="true" />
</template>
