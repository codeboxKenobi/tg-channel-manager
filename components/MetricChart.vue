<script setup lang="ts">
// Один вид графика для всех метрик: линия с заливкой, ось Y со значениями, подписи дат, подсказка при наведении.
const props = defineProps<{
  title: string
  caption?: string
  items: { label: string; value: number | null }[]
  baseline?: 'zero' | 'auto' // zero — ось с нуля (счётчики), auto — по диапазону данных (подписчики)
}>()

const hover = ref<number | null>(null)
const n = computed(() => props.items.length)
const present = computed(() => props.items.map((i) => i.value).filter((v): v is number => v !== null))

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

const scale = computed(() => {
  if (!present.value.length) return { min: 0, max: 1, ticks: [0, 1] }
  let min = props.baseline === 'auto' ? Math.min(...present.value) : 0
  let max = Math.max(...present.value)
  if (max <= min) max = min + 1
  const step = Math.max(1, niceStep((max - min) / 4)) // значения целые
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = min; v <= max; v += step) ticks.push(v)
  return { min, max, ticks }
})

const pct = (v: number) => ((v - scale.value.min) / (scale.value.max - scale.value.min)) * 100
const xPct = (i: number) => (n.value > 1 ? (i / (n.value - 1)) * 100 : 50)

// непрерывные участки без пропусков (null — нет данных)
const segments = computed(() => {
  const segs: { x: number; y: number }[][] = []
  let cur: { x: number; y: number }[] = []
  props.items.forEach((it, i) => {
    if (it.value === null) {
      if (cur.length) segs.push(cur)
      cur = []
      return
    }
    cur.push({ x: xPct(i), y: 100 - pct(it.value) })
  })
  if (cur.length) segs.push(cur)
  return segs
})
const f = (v: number) => v.toFixed(2)
const linePath = computed(() =>
  segments.value.filter((s) => s.length > 1).map((s) => 'M' + s.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L')).join(' '),
)
const areaPath = computed(() =>
  segments.value
    .filter((s) => s.length > 1)
    .map((s) => `M${f(s[0].x)} 100 L` + s.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L') + ` L${f(s[s.length - 1].x)} 100 Z`)
    .join(' '),
)

const lastIdx = computed(() => {
  for (let i = props.items.length - 1; i >= 0; i--) if (props.items[i].value !== null) return i
  return null
})
const dotStyle = (i: number) => ({ left: xPct(i) + '%', top: 100 - pct(props.items[i].value as number) + '%' })

const xTicks = computed(() => {
  if (n.value <= 1) return n.value ? [0] : []
  const k = n.value > 12 ? 4 : n.value - 1
  return [...new Set(Array.from({ length: k + 1 }, (_, i) => Math.round((i * (n.value - 1)) / k)))]
})
const xStyle = (i: number) => ({
  left: xPct(i) + '%',
  transform: i === 0 ? 'none' : i === n.value - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
})

const compact = (v: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

function onMove(e: PointerEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  hover.value = Math.round(ratio * (n.value - 1))
}
</script>

<template>
  <div class="card chart">
    <div class="ch-head">
      <h3>{{ title }}</h3>
      <span v-if="caption" class="muted">{{ caption }}</span>
    </div>

    <p v-if="!present.length" class="muted ch-empty">Данных пока нет</p>

    <div v-else class="ch-body">
      <div class="ch-y">
        <span v-for="t in scale.ticks" :key="t" :style="{ bottom: pct(t) + '%' }">{{ compact(t) }}</span>
      </div>

      <div class="ch-plot" role="img" :aria-label="title" @pointermove="onMove" @pointerleave="hover = null">
        <i v-for="t in scale.ticks" :key="t" class="ch-grid" :style="{ bottom: pct(t) + '%' }" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path :d="areaPath" class="ch-area" />
          <path :d="linePath" class="ch-line" vector-effect="non-scaling-stroke" />
        </svg>
        <i v-if="lastIdx !== null" class="ch-dot" :style="dotStyle(lastIdx)" />
        <template v-if="hover !== null && items[hover]">
          <i class="ch-cursor" :style="{ left: xPct(hover) + '%' }" />
          <i v-if="items[hover].value !== null" class="ch-dot on" :style="dotStyle(hover)" />
          <div class="ch-tip" :class="{ left: xPct(hover) > 60 }" :style="{ left: xPct(hover) + '%' }">
            <b>{{ items[hover].value === null ? 'нет данных' : fmtNum(items[hover].value) }}</b>
            <span class="muted"> · {{ items[hover].label }}</span>
          </div>
        </template>
      </div>

      <div class="ch-x">
        <span v-for="i in xTicks" :key="i" :style="xStyle(i)">{{ items[i].label }}</span>
      </div>
    </div>
  </div>
</template>
