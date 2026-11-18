<script setup lang="ts">
const props = defineProps<{
  title: string
  items: { label: string; value: number }[]
  summary?: string // значение в шапке графика (сумма или текущее число)
  fromMin?: boolean // масштаб от минимума — для величин вроде числа подписчиков
}>()

const min = computed(() => (props.fromMin ? Math.min(...props.items.map((i) => i.value)) : 0))
const max = computed(() => Math.max(min.value + 1, ...props.items.map((i) => i.value)))
const height = (v: number) => ((v - min.value) / (max.value - min.value)) * 100 + '%'
</script>

<template>
  <div class="card chart">
    <div class="row between">
      <h3>{{ title }}</h3>
      <b v-if="summary">{{ summary }}</b>
    </div>
    <p v-if="!items.length" class="muted">Данных пока нет</p>
    <template v-else>
      <div class="bars">
        <div v-for="i in items" :key="i.label" class="bar" :title="`${i.label}: ${i.value}`">
          <span :style="{ height: height(i.value) }" />
        </div>
      </div>
      <div class="axis">
        <span>{{ items[0].label }}</span>
        <span>{{ items[items.length - 1].label }}</span>
      </div>
    </template>
  </div>
</template>
