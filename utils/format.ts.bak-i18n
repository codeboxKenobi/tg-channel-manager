export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const fmtNum = (n?: number | null) => new Intl.NumberFormat('ru-RU').format(n ?? 0)
