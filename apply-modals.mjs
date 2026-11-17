#!/usr/bin/env node
// Единый стиль для модальных окон и окон подтверждения (как у форм).
// Заменяет нативные confirm()/prompt() на <AppDialog /> + useDialog().
//
// Запуск из корня проекта:   node apply-modals.mjs
// Проверка без записи:       node apply-modals.mjs --dry-run
//
// Скрипт безопасен к повторному запуску: уже применённые правки пропускаются.
// Перед изменением каждого существующего файла рядом кладётся копия <файл>.bak-modals.
// Если какой-то фрагмент не найден (файл успели изменить), скрипт ничего не запишет и скажет, где именно.

import fs from 'node:fs'
import path from 'node:path'

const DRY = process.argv.includes('--dry-run')
const root = process.cwd()
const abs = (f) => path.join(root, f)

if (!fs.existsSync(abs('app.vue')) || !fs.existsSync(abs('nuxt.config.ts'))) {
  console.error('Запустите скрипт из корня проекта (там, где app.vue и nuxt.config.ts).')
  process.exit(1)
}

// ---------- новые файлы ----------
const NEW_FILES = {
  'composables/useDialog.ts': `// Окна подтверждения и ввода в общем стиле приложения (вместо window.confirm / window.prompt).
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
`,
  'components/AppDialog.vue': `<script setup lang="ts">
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
`,
}

// ---------- правки существующих файлов: [что искать, на что заменить] ----------
const EDITS = {
  'app.vue': [
    [
      `    <main><NuxtPage /></main>
`,
      `    <main><NuxtPage /></main>
    <AppDialog />
`,
    ],
  ],
  'assets/main.css': [
    [
      `/* ---------- основа ---------- */`,
      `/* ---------- окна подтверждения и ввода (AppDialog.vue) ---------- */
/* Окно — та же карточка и те же элементы формы (заголовок, подпись, поле, ряд кнопок), только по центру поверх затемнённого фона. */
.modal { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: var(--s-4); background: rgba(0, 0, 0, .35); overflow-y: auto; }
.modal-panel { width: min(440px, 100%); max-height: calc(100dvh - 2 * var(--s-4)); margin: 0; overflow-y: auto; box-shadow: 0 12px 24px rgba(0, 0, 0, .14); }
.modal-body { overflow-wrap: anywhere; }
.modal-panel label.opt { margin-top: var(--s-3); padding: 0; border-bottom: 0; }
.modal-enter-active, .modal-leave-active { transition: opacity .15s ease; }
.modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: transform .15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal-panel, .modal-leave-to .modal-panel { transform: translateY(calc(-1 * var(--s-2))); }
@media (prefers-reduced-motion: reduce) { .modal-enter-active, .modal-leave-active, .modal-enter-active .modal-panel, .modal-leave-active .modal-panel { transition: none; } }
html.modal-open { overflow: hidden; }

/* ---------- основа ---------- */`,
    ],
  ],
  'pages/account.vue': [
    [
      `const api = useApi()
const { user } = useAuth()
`,
      `const api = useApi()
const dialog = useDialog()
const { user } = useAuth()
`,
    ],
    [
      `  if (!confirm(\`Удалить аккаунт?\\n\\n\${what}\\n\\nОтменить это будет нельзя.\`)) return
`,
      `  const sure = await dialog.confirm({
    title: 'Удалить аккаунт?',
    message: [what, 'Отменить это будет нельзя.'],
    confirmText: 'Удалить аккаунт',
    danger: true,
  })
  if (!sure) return
`,
    ],
  ],
  'pages/bot.vue': [
    [
      `const api = useApi()
const info`,
      `const api = useApi()
const dialog = useDialog()
const info`,
    ],
    [
      `const remove = () =>
  confirm(
    'Отключить бота?\\n\\nПубликация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.',
  )
    ? run(() => api('/bot', { method: 'DELETE' }), 'Бот отключён.')
    : undefined
`,
      `const remove = async () => {
  const sure = await dialog.confirm({
    title: 'Отключить бота?',
    message:
      'Публикация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.',
    confirmText: 'Отключить',
    danger: true,
  })
  if (sure) await run(() => api('/bot', { method: 'DELETE' }), 'Бот отключён.')
}
`,
    ],
  ],
  'pages/drafts.vue': [
    [
      `const api = useApi()
const { isAdmin }`,
      `const api = useApi()
const dialog = useDialog()
const { isAdmin }`,
    ],
    [
      `const publishNow = (p: any) =>
  confirm(\`Опубликовать «\${p.title}» в канале «\${p.channel_title}» прямо сейчас?\`) &&
  run(() => api(\`/posts/\${p.id}/publish\`, { method: 'POST' }))
`,
      `const publishNow = async (p: any) => {
  const sure = await dialog.confirm({
    title: 'Опубликовать пост?',
    message: \`Пост «\${p.title}» будет сразу опубликован в канале «\${p.channel_title}».\`,
    confirmText: 'Опубликовать',
  })
  if (sure) await run(() => api(\`/posts/\${p.id}/publish\`, { method: 'POST' }))
}
`,
    ],
    [
      `const remove = (p: any) =>
  confirm(\`Удалить пост «\${p.title}»?\`) && run(() => api(\`/posts/\${p.id}\`, { method: 'DELETE' }))
`,
      `const remove = async (p: any) => {
  const sure = await dialog.confirm({
    title: 'Удалить пост?',
    message: \`Пост «\${p.title}» будет удалён.\`,
    confirmText: 'Удалить',
    danger: true,
  })
  if (sure) await run(() => api(\`/posts/\${p.id}\`, { method: 'DELETE' }))
}
`,
    ],
  ],
  'pages/index.vue': [
    [
      `const api = useApi()
const { isAdmin }`,
      `const api = useApi()
const dialog = useDialog()
const { isAdmin }`,
    ],
    [
      `const remove = (c: any) =>
  confirm(\`Удалить канал «\${c.title}» вместе со всеми его постами?\`) ? run(() => api(\`/channels/\${c.id}\`, { method: 'DELETE' })) : undefined
`,
      `const remove = async (c: any) => {
  const sure = await dialog.confirm({
    title: 'Удалить канал?',
    message: \`Канал «\${c.title}» будет удалён вместе со всеми его постами.\`,
    confirmText: 'Удалить',
    danger: true,
  })
  if (sure) await run(() => api(\`/channels/\${c.id}\`, { method: 'DELETE' }))
}
`,
    ],
  ],
  'pages/parser.vue': [
    [
      `const api = useApi()
const PAGE`,
      `const api = useApi()
const dialog = useDialog()
const PAGE`,
    ],
    [
      `  if (!confirm(\`Удалить канал @\${s.username} и \${s.posts_count} спарсенных постов? Уже созданные черновики останутся.\`)) return
`,
      `  const sure = await dialog.confirm({
    title: 'Удалить канал?',
    message: \`Канал @\${s.username} и \${s.posts_count} спарсенных постов будут удалены. Уже созданные черновики останутся.\`,
    confirmText: 'Удалить',
    danger: true,
  })
  if (!sure) return
`,
    ],
  ],
  'pages/published.vue': [
    [
      `const api = useApi()
const channels`,
      `const api = useApi()
const dialog = useDialog()
const channels`,
    ],
    [
      `  if (!confirm(\`Удалить запись «\${p.title}»?\`)) return
  const fromTelegram = Boolean(p.tg_message_id) && confirm('Удалить и само сообщение из канала?')
`,
      `  // один диалог вместо двух подряд: вопрос про сообщение в Telegram — флажок
  const hasMessage = Boolean(p.tg_message_id)
  const { ok, checked } = await dialog.ask({
    title: 'Удалить запись?',
    message: \`Запись «\${p.title}» будет удалена.\`,
    option: hasMessage ? { label: 'Удалить и само сообщение из канала', checked: false } : undefined,
    confirmText: 'Удалить',
    danger: true,
  })
  if (!ok) return
  const fromTelegram = hasMessage && checked
`,
    ],
  ],
  'pages/users.vue': [
    [
      `const api = useApi()
const { user: me`,
      `const api = useApi()
const dialog = useDialog()
const { user: me`,
    ],
    [
      `const resetPassword = (u: any) => {
  const password = prompt(\`Новый пароль для \${u.email} (не короче 8 символов)\`)
  return password ? run(async () => api(\`/users/\${u.id}\`, { method: 'PUT', body: { name: u.name, ...(await sealFields({ password })) } })) : undefined
}
const removeEditor = (u: any) =>
  confirm(\`Удалить редактора \${u.email}?\`) ? run(() => api(\`/users/\${u.id}\`, { method: 'DELETE' })) : undefined
// администратор уносит с собой всё своё пространство, поэтому предупреждаем о его содержимом
const removeAdmin = (u: any) =>
  confirm(
    \`Удалить администратора \${u.email}?\\n\\nВместе с ним будут безвозвратно удалены его каналы (\${u.channels_count}) с постами и его редакторы (\${u.editors_count}).\`,
  )
    ? run(() => api(\`/users/\${u.id}?force=1\`, { method: 'DELETE' }))
    : undefined
`,
      `const resetPassword = async (u: any) => {
  const password = await dialog.prompt({
    title: 'Сброс пароля',
    message: \`Новый пароль для \${u.email}.\`,
    input: { label: 'Новый пароль (не короче 8 символов)', type: 'password', minlength: 8, autocomplete: 'new-password' },
    confirmText: 'Сменить пароль',
  })
  if (password) await run(async () => api(\`/users/\${u.id}\`, { method: 'PUT', body: { name: u.name, ...(await sealFields({ password })) } }))
}
const removeEditor = async (u: any) => {
  const sure = await dialog.confirm({
    title: 'Удалить редактора?',
    message: \`Редактор \${u.email} будет удалён.\`,
    confirmText: 'Удалить',
    danger: true,
  })
  if (sure) await run(() => api(\`/users/\${u.id}\`, { method: 'DELETE' }))
}
// администратор уносит с собой всё своё пространство, поэтому предупреждаем о его содержимом
const removeAdmin = async (u: any) => {
  const sure = await dialog.confirm({
    title: 'Удалить администратора?',
    message: [
      \`Администратор \${u.email} будет удалён.\`,
      \`Вместе с ним будут безвозвратно удалены его каналы (\${u.channels_count}) с постами и его редакторы (\${u.editors_count}).\`,
    ],
    confirmText: 'Удалить',
    danger: true,
  })
  if (sure) await run(() => api(\`/users/\${u.id}?force=1\`, { method: 'DELETE' }))
}
`,
    ],
  ],
}

// ---------- применение: сначала всё считаем, потом пишем ----------
const writes = [] // { file, content, backupOf? }
const errors = []
const report = []

for (const [file, content] of Object.entries(NEW_FILES)) {
  if (!fs.existsSync(abs(file))) {
    writes.push({ file, content })
    report.push(`создан   ${file}`)
  } else if (fs.readFileSync(abs(file), 'utf8') === content) {
    report.push(`без изм. ${file} (уже актуален)`)
  } else {
    writes.push({ file, content, backup: true })
    report.push(`заменён  ${file} (старая версия сохранена в .bak-modals)`)
  }
}

for (const [file, pairs] of Object.entries(EDITS)) {
  if (!fs.existsSync(abs(file))) {
    errors.push(`${file}: файл не найден`)
    continue
  }
  const original = fs.readFileSync(abs(file), 'utf8')
  let text = original
  let changed = 0
  pairs.forEach(([from, to], i) => {
    if (text.includes(to)) return // уже применено
    const n = text.split(from).length - 1
    if (n !== 1) {
      errors.push(`${file}: правка №${i + 1}: нужный фрагмент найден ${n} раз (ожидался 1). Начало фрагмента: ${JSON.stringify(from.slice(0, 70))}`)
      return
    }
    text = text.replace(from, () => to)
    changed++
  })
  if (changed) {
    writes.push({ file, content: text, backup: true })
    report.push(`изменён  ${file} (правок: ${changed})`)
  } else if (!errors.some((e) => e.startsWith(file + ':'))) {
    report.push(`без изм. ${file} (уже применено)`)
  }
}

if (errors.length) {
  console.error('Ничего не записано. Проблемы:\n  - ' + errors.join('\n  - '))
  console.error('\nПохоже, файлы изменились после того, как скрипт был подготовлен. Пришлите их, и я подправлю скрипт.')
  process.exit(1)
}

for (const w of writes) {
  if (DRY) continue
  fs.mkdirSync(path.dirname(abs(w.file)), { recursive: true })
  if (w.backup && fs.existsSync(abs(w.file)) && !fs.existsSync(abs(w.file) + '.bak-modals')) {
    fs.copyFileSync(abs(w.file), abs(w.file) + '.bak-modals')
  }
  fs.writeFileSync(abs(w.file), w.content)
}

console.log(report.join('\n'))
console.log(DRY ? '\nДиагностика (--dry-run): файлы не менялись.' : '\nГотово. Запустите `npm run dev` и проверьте окна: «Удалить» на любой странице, «Сбросить пароль» у редактора.')
