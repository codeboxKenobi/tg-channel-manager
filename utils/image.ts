/** Уменьшает фото до maxSide пикселей по длинной стороне и сжимает в JPEG (быстрее загрузка, нет проблем с лимитами). */
export async function toJpeg(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Выберите файл изображения')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Не удалось прочитать изображение. Попробуйте JPEG, PNG или WebP')
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // у PNG с прозрачностью фон станет белым
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать изображение'))), 'image/jpeg', quality),
  )
}
