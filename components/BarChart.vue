<script setup lang="ts">
const props = defineProps<{
  title: string
  items: { label: string; value: number }[]
  summary?: string // значение в шапке графика (сумма или текущее число)
  summaryLabel?: string // подпись к нему: «за 30 дней», «сейчас»
  fromMin?: boolean // масштаб от минимума — для величин вроде числа подписчиков
}>()

const { t, intlLocale } = useLocale()
const values = computed(() => props.items.map((i) => i.value))
const lo = computed(() => (props.fromMin && values.value.length ? Math.min(...values.value) : 0))
const hi = computed(() => (values.value.length ? Math.max(...values.value) : 0))
const span = computed(() => Math.max(1, hi.value - lo.value))
const height = (v: number) => ((v - lo.value) / span.value) * 100 + '%'
// подписи шкалы короткие (12K), чтобы колонка шкалы была одной ширины у всех графиков
const short = (n: number) => new Intl.NumberFormat(intlLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
</script>

<template>
  <div class="card chart">
    <div class="chart-head">
      <h3 :title="title">{{ title }}</h3>
      <div v-if="summary" class="chart-sum"><b>{{ summary }}</b><small v-if="summaryLabel">{{ summaryLabel }}</small></div>
    </div>
    <div class="plot-grid">
      <div class="yaxis" aria-hidden="true"><span>{{ items.length ? short(hi) : '' }}</span><span>{{ items.length ? short(lo) : '' }}</span></div>
      <div v-if="items.length" class="bars">
        <div v-for="i in items" :key="i.label" class="bar" :title="`${i.label}: ${i.value}`">
          <span :class="{ zero: i.value === 0 }" :style="{ height: height(i.value) }" />
        </div>
      </div>
      <p v-else class="muted empty">{{ t('chart.empty') }}</p>
      <span />
      <div class="axis">
        <span>{{ items.length ? items[0].label : '' }}</span>
        <span>{{ items.length ? items[items.length - 1].label : '' }}</span>
      </div>
    </div>
  </div>
</template>
