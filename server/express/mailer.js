// Отправка почты через SMTP (nodemailer). Настраивается переменными SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM.
// Пока SMTP_HOST и MAIL_FROM не заданы, почта выключена: mailEnabled() = false, а приложение работает как раньше.
import { LOGO_PNG_BASE64 } from './mail-logo.js';

const env = (k) => (process.env[k] ?? '').trim();

export const mailEnabled = () => Boolean(env('SMTP_HOST') && env('MAIL_FROM'));

/** Адрес приложения для ссылок в письмах: APP_URL, затем PUBLIC_URL. Без них — адрес текущего запроса (если он передан). */
export function appUrl(req) {
  const fixed = (env('APP_URL') || env('PUBLIC_URL')).replace(/\/+$/, '');
  if (fixed) return fixed;
  const host = req?.get?.('host');
  return host ? `${req.protocol}://${host}` : '';
}

const cache = (globalThis.__tgmMailer ??= { key: '', transport: null });

async function getTransport() {
  const host = env('SMTP_HOST');
  const port = Number(env('SMTP_PORT')) || 587;
  const secure = env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : port === 465; // 465 — TLS сразу, 587 — STARTTLS
  const user = env('SMTP_USER');
  const key = [host, port, secure, user, process.env.SMTP_PASS ?? ''].join('|');
  if (cache.key !== key) {
    let nodemailer;
    try {
      nodemailer = (await import('nodemailer')).default;
    } catch {
      throw Object.assign(new Error('Не установлен пакет nodemailer: выполните npm install'), { code: 'NO_NODEMAILER' });
    }
    cache.transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: process.env.SMTP_PASS ?? '' } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    cache.key = key;
  }
  return cache.transport;
}

/** Отправляет письмо с логотипом приложения во вложении (cid:logo). */
export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled()) throw Object.assign(new Error('Отправка почты не настроена'), { code: 'MAIL_OFF' });
  const transport = await getTransport();
  return transport.sendMail({
    from: env('MAIL_FROM'),
    to,
    subject,
    html,
    text,
    attachments: [{ filename: 'logo.png', content: Buffer.from(LOGO_PNG_BASE64, 'base64'), cid: 'logo', contentDisposition: 'inline' }],
  });
}

/** Понятная причина сбоя для администратора (подробности остаются в логах сервера). */
export function mailErrorText(e) {
  if (e?.code === 'MAIL_OFF') return 'отправка почты не настроена на сервере';
  if (e?.code === 'NO_NODEMAILER') return 'на сервере не установлен пакет nodemailer';
  if (e?.code === 'EAUTH') return 'почтовый сервер отклонил логин или пароль SMTP';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS'].includes(e?.code)) return 'не удалось подключиться к почтовому серверу';
  if (e?.responseCode >= 500) return 'почтовый сервер отклонил письмо (проверьте адрес получателя и MAIL_FROM)';
  return 'ошибка отправки письма';
}
