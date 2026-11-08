/**
 * Как подготовить картинку для Telegram.
 * Telegram показывает фото во всю ширину пузыря только если оно достаточно широкое:
 * вертикальные и квадратные картинки выводятся узкой колонкой.
 *  - none: как есть
 *  - blur: вписать целиком в кадр 16:9, по бокам размытая копия картинки (ничего не обрезается)
 *  - crop: обрезать по центру до 16:9
 */
export type ImageFit = 'none' | 'blur' | 'crop'

const WIDE = 16 / 9

/** Уменьшает фото до maxSide пикселей по длинной стороне и сжимает в JPEG (быстрее загрузка, нет проблем с лимитами). */
export async function toJpeg(file: File, fit: ImageFit = 'none', maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите файл изображения')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Не удалось прочитать изображение. Попробуйте JPEG, PNG или WebP')
  }

  const bw = bitmap.width
  const bh = bitmap.height
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // у PNG с прозрачностью фон станет белым

  if (fit === 'none' || bw / bh >= WIDE) {
    // уже достаточно широкая (или обработка отключена) — только уменьшаем
    const scale = Math.min(1, maxSide / Math.max(bw, bh))
    canvas.width = Math.max(1, Math.round(bw * scale))
    canvas.height = Math.max(1, Math.round(bh * scale))
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  } else if (fit === 'crop') {
    const sh = bw / WIDE // высота полосы исходника
    const sy = (bh - sh) / 2
    const W = Math.min(bw, maxSide)
    canvas.width = Math.round(W)
    canvas.height = Math.round(W / WIDE)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, sy, bw, sh, 0, 0, canvas.width, canvas.height)
  } else {
    // blur: высота кадра = высота картинки, ширина добирается до 16:9
    const s = Math.min(1, maxSide / Math.max(bw, bh))
    const k = Math.min(1, maxSide / (bh * s * WIDE))
    const W = Math.round(bh * s * WIDE * k)
    const H = Math.round(bh * s * k)
    const fw = Math.round(bw * s * k)
    canvas.width = W
    canvas.height = H

    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)
    // фон: та же картинка, растянутая на весь кадр и размытая (Safari без ctx.filter получит тёмный фон)
    if ('filter' in ctx) {
      const cover = Math.max(W / bw, H / bh)
      const dw = bw * cover
      const dh = bh * cover
      ctx.filter = 'blur(28px) brightness(.7)'
      ctx.drawImage(bitmap, (W - dw) / 2, (H - dh) / 2, dw, dh)
      ctx.filter = 'none'
    }
    ctx.drawImage(bitmap, Math.round((W - fw) / 2), 0, fw, H)
  }
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать изображение'))), 'image/jpeg', quality),
  )
}