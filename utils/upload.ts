/** Лимит Telegram для бота при отправке файла (видео). Совпадает с серверным. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

/** Видео MP4: тип от браузера или расширение (часть браузеров не заполняет type). */
export const isMp4File = (f: File): boolean => f.type === 'video/mp4' || (!f.type && /\.mp4$/i.test(f.name))

/** Похоже ли на видео (по типу или расширению), чтобы дать понятную ошибку для .mov, .webm и т. п. */
export const looksLikeVideo = (f: File): boolean => f.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|avi|mkv|3gp|wmv)$/i.test(f.name)

export interface UploadError extends Error {
  status?: number
}

/**
 * Загружает файл на /api/uploads (тело запроса — сам файл) с индикатором прогресса.
 * Используется XMLHttpRequest, потому что fetch не умеет сообщать о ходе отправки.
 */
export function uploadFile(file: Blob, contentType: string, onProgress?: (percent: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const fail = (message: string, status?: number) => reject(Object.assign(new Error(message), { status }) as UploadError)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
    }
    xhr.onload = () => {
      let data: any = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* ответ не JSON: например, страница ошибки прокси */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) return resolve(data)
      if (data?.error) return fail(data.error, xhr.status)
      if (xhr.status === 413) return fail('Сервер отклонил файл как слишком большой. Администратору сервера: в nginx задайте client_max_body_size 50m', 413)
      if (xhr.status === 401) return fail('Сессия истекла. Войдите заново', 401)
      fail(`Не удалось загрузить файл (код ${xhr.status})`, xhr.status)
    }
    xhr.onerror = () => fail('Не удалось загрузить файл: проблема с соединением')
    xhr.ontimeout = () => fail('Загрузка заняла слишком много времени')
    xhr.onabort = () => fail('Загрузка прервана')
    xhr.send(file)
  })
}
