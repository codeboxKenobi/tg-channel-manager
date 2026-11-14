import express from 'express';
import { activeBots } from './bot.js';
import { csrfGuard, requireAuth } from './auth.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import channels from './routes/channels.js';
import posts from './routes/posts.js';
import uploads from './routes/uploads.js';
import metrics from './routes/metrics.js';
import parser from './routes/parser.js';
import botRoute from './routes/bot.js';

export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(csrfGuard);

app.get('/api/health', (_req, res) => res.json({ ok: true, bot: activeBots() > 0 }));
app.use('/api/auth', auth); // публичные: me, setup, login, logout

app.use('/api', requireAuth); // всё ниже — только для вошедших
app.use('/api/users', users);
app.use('/api/channels', channels);
app.use('/api/posts', posts);
app.use('/api/uploads', uploads);
app.use('/api/metrics', metrics);
app.use('/api/parser', parser);
app.use('/api/bot', botRoute);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Не найдено' }));

// Express 5 сам передаёт сюда ошибки async-обработчиков
app.use((err, _req, res, _next) => {
  const tg = err?.response?.description;
  const status = err.status || (err.code === '23505' ? 409 : err.code === '23503' ? 400 : tg ? 400 : 500);
  if (status === 500) console.error(err);
  const message =
    tg || (err.code === '23505' ? 'Такая запись уже существует' : err.code === '23503' ? 'Связанная запись не найдена' : status === 500 ? 'Внутренняя ошибка сервера' : err.message);
  res.status(status).json({ error: message });
});
