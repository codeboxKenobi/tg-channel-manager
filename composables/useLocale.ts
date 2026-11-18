// Язык интерфейса. Тексты лежат в locales/ru.ts и locales/en.ts, ключи у них общие.
// Выбранный язык хранится в аккаунте (users.lang) и дублируется в localStorage, чтобы страницы входа открывались на нём же.
import { computed, ref } from 'vue'
import ru from '../locales/ru'
import en from '../locales/en'
import { translateServerMessage } from '../locales/server-errors'
import type { Entry, Locale, Messages } from '../locales/types'

export type { Locale } from '../locales/types'

type Params = Record<string, string | number | null | undefined>

const STORAGE_KEY = 'tgm-lang'
const DICTS: Record<Locale, Messages> = { ru, en }
// Язык по умолчанию — русский; чтобы добавить язык: locales/<код>.ts, записи здесь, LANGS на сервере (server/express/auth.js) и руководство
const OPTIONS: { code: Locale; name: string }[] = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
]
const INTL: Record<Locale, string> = { ru: 'ru-RU', en: 'en-GB' }

const isLocale = (v: unknown): v is Locale => typeof v === 'string' && Object.prototype.hasOwnProperty.call(DICTS, v)

function readStored(): Locale {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (isLocale(v)) return v
  } catch {
    /* localStorage недоступен (например, приватный режим) — остаётся язык по умолчанию */
  }
  return 'ru'
}

// SPA (ssr: false): состояние живёт на уровне модуля, как в useDialog
const locale = ref<Locale>(readStored())
// true, если язык выбрали вручную (например, на странице входа) и он ещё не сохранён в аккаунте
const picked = ref(false)

/** Применяет язык без пометки «выбран вручную» (например, язык из аккаунта). */
function applyLocale(code: Locale) {
  locale.value = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* не страшно: язык просто не запомнится в браузере */
  }
}

/** Язык, выбранный пользователем вручную. */
function pickLocale(code: string) {
  if (!isLocale(code)) return
  applyLocale(code)
  picked.value = true
}

const rules: Partial<Record<Locale, Intl.PluralRules>> = {}
const pluralForm = (count: number) => (rules[locale.value] ??= new Intl.PluralRules(INTL[locale.value])).select(count)

function choose(entry: Entry | undefined, count?: number): string | undefined {
  if (entry === undefined) return undefined
  if (typeof entry === 'string') return entry
  const form = count === undefined ? 'other' : pluralForm(count)
  return entry[form as keyof typeof entry] ?? entry.other
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function render(key: string, params: Params | undefined, count: number | undefined, escape: boolean): string {
  const text = choose(DICTS[locale.value][key], count) ?? choose(DICTS.ru[key], count) ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (!(name in params)) return whole
    const v = String(params[name] ?? '')
    return escape ? escapeHtml(v) : v
  })
}

/** Текст по ключу. {имя} подставляется из params; count выбирает форму множественного числа. */
const t = (key: string, params?: Params, count?: number) => render(key, params, count, false)
/** То же для v-html: сам текст — доверенный HTML из словаря (<b>, <code>), а подставляемые значения экранируются. */
const th = (key: string, params?: Params, count?: number) => render(key, params, count, true)
/** Сообщение сервера (он пишет по-русски) на текущем языке. */
const tServer = (message?: string | null) => (message ? translateServerMessage(message, locale.value) : '')

export function useLocale() {
  return {
    locale,
    locales: OPTIONS,
    /** Код для Intl и toLocaleString: ru-RU, en-GB */
    intlLocale: computed(() => INTL[locale.value]),
    picked,
    isLocale,
    applyLocale,
    pickLocale,
    t,
    th,
    tServer,
  }
}
