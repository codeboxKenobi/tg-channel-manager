export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false, // SPA: Express-API живёт в том же процессе (см. server/middleware/api.ts)
  css: ['~/assets/main.css'],
  app: { head: { title: 'Менеджер каналов', htmlAttrs: { lang: 'ru' } } },
})
