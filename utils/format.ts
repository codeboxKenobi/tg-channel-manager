import { useLocale } from '../composables/useLocale'

// Формат даты и чисел зависит от языка интерфейса (ru-RU / en-GB)
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString(useLocale().intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const fmtNum = (n?: number | null) => new Intl.NumberFormat(useLocale().intlLocale.value).format(n ?? 0)
