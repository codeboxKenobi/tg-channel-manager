/** Видео определяем по расширению ссылки (загрузки приложения называются <hash>.mp4). */
export const isVideoUrl = (url?: string | null): boolean => /\.mp4(?:[?#].*)?$/i.test(url ?? '')

/** Файл-вложение (PDF, TXT, Excel) определяем по расширению ссылки (загрузки приложения называются <hash>.<ext>). */
export const isDocUrl = (url?: string | null): boolean => /\.(pdf|txt|xlsx|xls)(?:[?#].*)?$/i.test(url ?? '')

const DOC_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
}

/** Content-Type для загрузки документа по расширению имени (браузеры часто не заполняют type у xlsx/txt); null — это не документ. */
export const docTypeOf = (f: File): string | null => DOC_TYPES[f.name.split('.').pop()?.toLowerCase() ?? ''] ?? null
