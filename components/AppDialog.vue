<script setup lang="ts">
// Единое окно подтверждения/ввода. Выглядит как остальные формы: карточка, заголовок h2, подписи, ряд кнопок
// «действие + Отмена». Рисуется один раз в app.vue, вызывается через useDialog().
const { current, close } = useDialog()
const route = useRoute()

const value = ref('')
const checked = ref(false)
const panel = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const submitBtn = ref<HTMLButtonElement | null>(null)
const cancelBtn = ref<HTMLButtonElement | null>(null)
let lastFocus: HTMLElement | null = null

const messages = computed(() => {
  const m = current.value?.opts.message
  return m ? (Array.isArray(m) ? m : [m]) : []
})

function submit() {
  close({ ok: true, value: value.value, checked: checked.value })
}
function cancel() {
  close({ ok: false, value: '', checked: false })
}
// клик по фону закрывает только простое подтверждение: введённое в поле не должно пропадать случайно
function onBackdrop() {
  if (!current.value?.opts.input) cancel()
}

watch(
  current,
  async (item, prev) => {
    if (item) {
      if (!prev) {
        lastFocus = document.activeElement as HTMLElement | null
        document.documentElement.classList.add('modal-open')
      }
      value.value = item.opts.input?.value ?? ''
      checked.value = item.opts.option?.checked ?? false
      await nextTick()
      // опасное действие: фокус на «Отмене», чтобы случайный Enter ничего не удалил
      const target = item.opts.input ? inputEl.value : item.opts.danger ? cancelBtn.value : submitBtn.value
      target?.focus()
    } else {
      document.documentElement.classList.remove('modal-open')
      lastFocus?.focus?.()
      lastFocus = null
    }
  },
  { flush: 'post' },
)

function onKey(e: KeyboardEvent) {
  if (!current.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
    return
  }
  if (e.key !== 'Tab' || !panel.value) return
  // фокус не уходит за пределы окна
  const items = [...panel.value.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)')]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (!panel.value.contains(active)) {
    e.preventDefault()
    first.focus()
  } else if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

// ушли на другую страницу (например, «Назад» в браузере) — окно закрываем как отмену
watch(() => route.fullPath, () => current.value && cancel())

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('modal-open')
})
</script>

<template>
  <Transition name="modal">
    <div v-if="current" class="modal" @mousedown.self="onBackdrop">
      <form
        ref="panel"
        class="card modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        :aria-describedby="messages.length ? 'dialog-body' : undefined"
        @submit.prevent="submit"
      >
        <h2 id="dialog-title">{{ current.opts.title }}</h2>

        <div v-if="messages.length" id="dialog-body" class="modal-body">
          <p v-for="(m, i) in messages" :key="i">{{ m }}</p>
        </div>

        <template v-if="current.opts.input">
          <label for="dialog-input">{{ current.opts.input.label }}</label>
          <input
            id="dialog-input"
            ref="inputEl"
            v-model="value"
            :type="current.opts.input.type ?? 'text'"
            :placeholder="current.opts.input.placeholder"
            :required="current.opts.input.required ?? true"
            :minlength="current.opts.input.minlength"
            :maxlength="current.opts.input.maxlength"
            :autocomplete="current.opts.input.autocomplete ?? 'off'"
          />
        </template>

        <label v-if="current.opts.option" class="opt">
          <input v-model="checked" type="checkbox" />
          <span>{{ current.opts.option.label }}</span>
        </label>

        <div class="actions">
          <button ref="submitBtn" type="submit" :class="current.opts.danger ? 'danger' : 'primary'">
            {{ current.opts.confirmText ?? 'Подтвердить' }}
          </button>
          <button ref="cancelBtn" type="button" @click="cancel">{{ current.opts.cancelText ?? 'Отмена' }}</button>
        </div>
      </form>
    </div>
  </Transition>
</template>
