<script setup lang="ts">
// Переключатель языка интерфейса: variant="select" — выпадающий список (профиль), variant="buttons" — компактные кнопки (вход, регистрация).
// Сам только меняет язык в браузере; сохранить его в аккаунте (если нужно) должен родитель по событию change.
withDefaults(defineProps<{ variant?: 'select' | 'buttons'; disabled?: boolean }>(), { variant: 'select', disabled: false })
const emit = defineEmits<{ change: [code: string] }>()
const { t, locale, locales, pickLocale } = useLocale()

function pick(code: string) {
  if (code === locale.value) return
  pickLocale(code)
  emit('change', code)
}
</script>

<template>
  <div v-if="variant === 'buttons'" class="lang-buttons" role="group" :aria-label="t('lang.label')">
    <button
      v-for="l in locales"
      :key="l.code"
      type="button"
      :class="{ active: l.code === locale }"
      :aria-pressed="l.code === locale"
      :lang="l.code"
      :title="l.name"
      @click="pick(l.code)"
    >
      {{ l.code.toUpperCase() }}
    </button>
  </div>
  <select v-else :value="locale" :disabled="disabled" :aria-label="t('lang.label')" @change="pick(($event.target as HTMLSelectElement).value)">
    <option v-for="l in locales" :key="l.code" :value="l.code" :lang="l.code">{{ l.name }}</option>
  </select>
</template>
