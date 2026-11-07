import { migrate } from '../express/db.js'
import { startBot, stopBot } from '../express/bot.js'
import { startJobs } from '../express/scheduler.js'

export default defineNitroPlugin((nitro) => {
  const g = globalThis as any
  if (g.__tgmBooted) return
  g.__tgmBooted = true

  migrate()
    .then(() => {
      startBot()
      return startJobs()
    })
    .catch((e: Error) => console.error('Ошибка запуска:', e.message))

  nitro.hooks.hookOnce('close', () => stopBot())
})
