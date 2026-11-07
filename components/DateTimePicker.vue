<script setup lang="ts">
// v-model — ISO-строка или null. Дата выбирается в календаре, время — в выпадающих списках.
const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()

const pad = (n: number) => String(n).padStart(2, '0')
const hours = Array.from({ length: 24 }, (_, i) => pad(i))
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const state = reactive({ date: '', hour: '', minute: '' })

function load(iso: string | null) {
  if (!iso) {
    state.date = ''
    state.hour = ''
    state.minute = ''
    return
  }
  const d = new Date(iso)
  state.date = ymd(d)
  state.hour = pad(d.getHours())
  state.minute = pad(d.getMinutes())
}
load(props.modelValue)
watch(() => props.modelValue, load)

// минуты с шагом 5; если у поста уже стоит другое значение — оно тоже в списке
const minutes = computed(() => {
  const list = Array.from({ length: 12 }, (_, i) => pad(i * 5))
  if (state.minute && !list.includes(state.minute)) list.push(state.minute)
  return list.sort()
})

watch(
  () => [state.date, state.hour, state.minute],
  () => {
    if (!state.date) {
      if (props.modelValue) emit('update:modelValue', null)
      return
    }
    if (state.hour === '') state.hour = '12'
    if (state.minute === '') state.minute = '00'
    const [y, m, d] = state.date.split('-').map(Number)
    const iso = new Date(y, m - 1, d, Number(state.hour), Number(state.minute)).toISOString()
    if (props.modelValue && new Date(props.modelValue).getTime() === new Date(iso).getTime()) return
    emit('update:modelValue', iso)
  },
)

function preset(kind: 'hour' | 'evening' | 'morning') {
  const d = new Date()
  if (kind === 'hour') {
    d.setHours(d.getHours() + 1)
    d.setSeconds(0, 0)
    d.setMinutes(Math.ceil((d.getMinutes() + 1) / 5) * 5)
  } else if (kind === 'evening') {
    d.setHours(18, 0, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
  } else {
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
  }
  load(d.toISOString())
}

function openPicker(e: Event) {
  try {
    ;(e.target as HTMLInputElement).showPicker?.()
  } catch {
    /* браузер не разрешил — календарь откроется обычным способом */
  }
}

const summary = computed(() =>
  props.modelValue ? new Date(props.modelValue).toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'short' }) : '',
)
const inPast = computed(() => (props.modelValue ? new Date(props.modelValue).getTime() < Date.now() : false))
</script>

<template>
  <div>
    <div class="dt">
      <input v-model="state.date" type="date" aria-label="Дата публикации" @click="openPicker" />
      <div class="dt-time">
        <select v-model="state.hour" aria-label="Часы" :disabled="!state.date">
          <option value="" disabled>чч</option>
          <option v-for="h in hours" :key="h" :value="h">{{ h }}</option>
        </select>
        <span>:</span>
        <select v-model="state.minute" aria-label="Минуты" :disabled="!state.date">
          <option value="" disabled>мм</option>
          <option v-for="m in minutes" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
    </div>

    <div class="chips">
      <button type="button" class="chip" @click="preset('hour')">Через час</button>
      <button type="button" class="chip" @click="preset('evening')">Сегодня в 18:00</button>
      <button type="button" class="chip" @click="preset('morning')">Завтра в 9:00</button>
      <button v-if="state.date" type="button" class="chip" @click="load(null)">Очистить</button>
    </div>

    <p v-if="summary" class="dt-summary" :class="inPast ? 'warn' : 'muted'">
      {{ inPast ? 'Время уже прошло: пост опубликуется в течение минуты. ' : 'Опубликуется: ' }}{{ summary }}
    </p>
  </div>
</template>
