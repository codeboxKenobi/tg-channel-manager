<script setup lang="ts">
const props = defineProps<{
  title: string
  options: { id: number; label: string; hint?: string }[]
  selected: number[]
  empty: string
}>()
const emit = defineEmits<{ save: [ids: number[]]; cancel: [] }>()

const picked = ref<number[]>([...props.selected])
const all = computed(() => props.options.length > 0 && picked.value.length === props.options.length)
const toggleAll = () => (picked.value = all.value ? [] : props.options.map((o) => o.id))
</script>

<template>
  <div class="picker">
    <h3>{{ title }}</h3>
    <p v-if="!options.length" class="muted" style="margin: 0 0 8px">{{ empty }}</p>
    <template v-else>
      <label class="opt all"><input type="checkbox" :checked="all" @change="toggleAll" /><span>Выбрать все</span></label>
      <label v-for="o in options" :key="o.id" class="opt">
        <input v-model="picked" type="checkbox" :value="o.id" />
        <span>{{ o.label }}<small v-if="o.hint" class="muted"> · {{ o.hint }}</small></span>
      </label>
    </template>
    <div class="actions">
      <button class="primary" type="button" :disabled="!options.length" @click="emit('save', picked)">Сохранить</button>
      <button type="button" @click="emit('cancel')">Отмена</button>
    </div>
  </div>
</template>
