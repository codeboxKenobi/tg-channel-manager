// Окна подтверждения и ввода в общем стиле приложения (вместо window.confirm / window.prompt).
// Окно рисует компонент <AppDialog /> из app.vue. Одновременно показывается одно окно, остальные ждут в очереди.

export interface DialogOptions {
  title: string
  /** Текст под заголовком; массив выводится отдельными абзацами */
  message?: string | string[]
  confirmText?: string
  cancelText?: string
  /** Опасное действие: кнопка подтверждения красная, фокус по умолчанию на «Отмене» */
  danger?: boolean
  /** Флажок над кнопками */
  option?: { label: string; checked?: boolean }
  /** Поле ввода (делает окно формой, как остальные формы приложения) */
  input?: {
    label: string
    type?: string
    value?: string
    placeholder?: string
    required?: boolean
    minlength?: number
    maxlength?: number
    autocomplete?: string
  }
}

export interface DialogResult {
  ok: boolean
  value: string
  checked: boolean
}

interface Pending {
  opts: DialogOptions
  resolve: (r: DialogResult) => void
}

// SPA (ssr: false): состояние живёт на уровне модуля
const current = shallowRef<Pending | null>(null)
const queue: Pending[] = []

function show(opts: DialogOptions): Promise<DialogResult> {
  return new Promise((resolve) => {
    const item: Pending = { opts, resolve }
    if (current.value) queue.push(item)
    else current.value = item
  })
}

function close(result: DialogResult) {
  const item = current.value
  current.value = queue.shift() ?? null
  item?.resolve(result)
}

export function useDialog() {
  return {
    current,
    close,
    /** Подтверждение: true, если пользователь согласился */
    confirm: async (opts: Omit<DialogOptions, 'input' | 'option'>) => (await show(opts)).ok,
    /** Подтверждение с флажком: ok и состояние флажка */
    ask: (opts: Omit<DialogOptions, 'input'>) => show(opts),
    /** Ввод строки: введённое значение или null, если отменили */
    prompt: async (opts: Omit<DialogOptions, 'option'> & { input: NonNullable<DialogOptions['input']> }) => {
      const r = await show(opts)
      return r.ok ? r.value : null
    },
  }
}
