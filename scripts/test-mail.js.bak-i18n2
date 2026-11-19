// Проверка почты: npm run mail:test -- адрес@пример.рф
// Отправляет тестовое письмо в оформлении приложения и показывает причину, если не получилось.
import { mailEnabled, sendMail, mailErrorText, appUrl } from '../server/express/mailer.js';
import { welcomeMail } from '../server/express/mail-templates.js';

const to = process.argv[2];
if (!to) {
  console.error('Укажите адрес получателя: npm run mail:test -- you@example.com');
  process.exit(1);
}
if (!mailEnabled()) {
  console.error('✗ Почта не настроена: задайте SMTP_HOST и MAIL_FROM (и SMTP_USER/SMTP_PASS) в .env');
  process.exit(1);
}
try {
  const info = await sendMail({
    to,
    ...welcomeMail({ name: 'Тест', role: 'editor', email: to, password: 'Пример-пароля-123', creator: 'Проверка почты', url: appUrl() }),
  });
  console.log('✓ Письмо отправлено:', info.messageId);
} catch (e) {
  console.error('✗ Не удалось отправить:', mailErrorText(e));
  console.error('  Подробности:', e.message);
  process.exit(1);
}
