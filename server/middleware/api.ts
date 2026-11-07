import { fromNodeMiddleware } from 'h3'
import { app } from '../express/app.js'

export default fromNodeMiddleware((req, res, next) => {
  if (/^\/api(\/|\?|$)/.test(req.url || '')) return app(req, res, next)
  next()
})
