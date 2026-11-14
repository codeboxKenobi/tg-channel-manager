import { Router } from 'express';
import { acceptUpdate } from '../bot.js';

// Webhook Telegram: публичный адрес (без входа в систему), POST /api/telegram/<id администратора>.
// Подлинность запроса подтверждает секрет в заголовке X-Telegram-Bot-Api-Secret-Token (у каждого бота свой).
// На любой чужой запрос отвечаем 404, ничего не раскрывая.
const r = Router();

r.post('/:ownerId', async (req, res) => {
  const ok = await acceptUpdate(Number(req.params.ownerId), req.get('x-telegram-bot-api-secret-token'), req.body);
  res.sendStatus(ok ? 200 : 404);
});

export default r;
