export type Locale = 'ru' | 'en'

/** Формы множественного числа (ключи Intl.PluralRules); other обязателен. */
export interface PluralForms {
  one?: string
  few?: string
  many?: string
  other: string
}

export type Entry = string | PluralForms
export type Messages = Record<string, Entry>
