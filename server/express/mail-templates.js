// Шаблоны писем в оформлении приложения: те же цвета, шрифт и скругления, что в assets/main.css (светлая тема).
// Вёрстка таблицами с inline-стилями: так письма одинаково выглядят в Gmail, Яндекс.Почте, Mail.ru и Outlook.

const C = { bg: '#f2f5f7', card: '#ffffff', text: '#17252e', muted: '#64757f', line: '#dde4e8', accent: '#0a7d8c', warn: '#b7791f' };
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const APP = 'Менеджер каналов';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// Что делать дальше — краткое содержание «Руководства пользователя» для роли (раздел «Быстрый старт»)
const STEPS = {
  editor: [
    'Войдите в приложение по логину и паролю из этого письма.',
    'Администратор закрепит за вами каналы. Пока доступ не выдан, вы увидите «Вам пока не назначены каналы» — напишите администратору.',
    'Откройте «Подготовка постов» → «Новый пост»: введите текст, добавьте картинку или видео MP4 и выберите время либо нажмите «Опубликовать сейчас».',
    'Результат смотрите в «Опубликованных» и «Метриках». Готовые посты можно взять в «Парсере» из публичных Telegram-каналов.',
  ],
  admin: [
    'Войдите в приложение по логину и паролю из этого письма.',
    'На странице «Бот» вставьте токен бота, созданного у @BotFather. У каждого администратора свой бот.',
    'Добавьте бота администратором в свой Telegram-канал с правом публикации сообщений.',
    'На странице «Каналы» подключите канал по @username или числовому id.',
    'На странице «Пользователи» создайте редакторов и закрепите за ними каналы. Ваше пространство изолировано: другие администраторы его не видят.',
  ],
};
const ROLE = { editor: 'Редактор', admin: 'Администратор' };

const btn = (href, label) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px"><tr><td style="border-radius:8px;background:${C.accent}">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:10px 24px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a></td></tr></table>`;

function layout({ preheader, body }) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${APP}</title></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.text};font:15px/1.55 ${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px">
    <tr><td align="center" style="padding:0 0 20px">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="padding-right:12px"><img src="cid:logo" alt="" height="40" style="display:block;height:40px;width:auto;border:0"></td>
        <td style="font:600 20px ${FONT};color:${C.text}">${APP}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:10px;padding:28px 28px 24px">${body}</td></tr>
    <tr><td align="center" style="padding:16px 8px 0;font:12px/1.5 ${FONT};color:${C.muted}">Это автоматическое письмо от приложения «${APP}». Отвечать на него не нужно.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 12px;font:600 22px/1.3 ${FONT};color:${C.text}">${esc(t)}</h1>`;
const p = (t, extra = '') => `<p style="margin:0 0 12px;color:${C.text};${extra}">${t}</p>`;

/** Письмо с кодом восстановления пароля. */
export function resetCodeMail({ name, code, minutes, url }) {
  const subject = `Код для восстановления пароля: ${code}`;
  const body =
    h1('Восстановление пароля') +
    p(`Здравствуйте, ${esc(name)}!`) +
    p('Вы запросили смену пароля. Введите этот код на странице восстановления:') +
    `<div style="margin:16px 0;padding:16px;text-align:center;background:${C.bg};border:1px solid ${C.line};border-radius:8px;font:600 32px/1 'Courier New',Consolas,monospace;letter-spacing:8px;color:${C.accent}">${esc(code)}</div>` +
    p(`Код действует ${minutes} минут и подходит для одной смены пароля.`, `color:${C.muted}`) +
    (url ? btn(`${url}/forgot`, 'Ввести код') : '') +
    `<p style="margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px">Если вы не запрашивали смену пароля, просто удалите письмо: пароль останется прежним. Никому не сообщайте этот код.</p>`;
  const text = [
    `Здравствуйте, ${name}!`,
    '',
    `Код для восстановления пароля: ${code}`,
    `Он действует ${minutes} минут.`,
    url ? `Страница восстановления: ${url}/forgot` : '',
    '',
    'Если вы не запрашивали смену пароля, просто удалите письмо. Никому не сообщайте этот код.',
  ].filter((l, i, a) => l || a[i - 1] !== '').join('\n');
  return { subject, html: layout({ preheader: `Код: ${code}. Действует ${minutes} минут.`, body }), text };
}

/** Письмо новому администратору или редактору: логин, пароль и краткое описание из руководства пользователя. */
export function welcomeMail({ name, role, email, password, creator, url }) {
  const steps = STEPS[role] ?? STEPS.editor;
  const roleName = ROLE[role] ?? ROLE.editor;
  const subject = `Вам создан доступ к приложению «${APP}»`;
  const row = (label, value, mono) =>
    `<tr><td style="padding:8px 12px 8px 0;font-size:13px;color:${C.muted};white-space:nowrap;vertical-align:top">${label}</td>` +
    `<td style="padding:8px 0;font:${mono ? "600 15px 'Courier New',Consolas,monospace" : `15px ${FONT}`};color:${C.text};word-break:break-all">${value}</td></tr>`;
  const list = steps.map((s, i) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join('');
  const body =
    h1('Добро пожаловать!') +
    p(`Здравствуйте, ${esc(name)}!`) +
    p(`${esc(creator)} создал(а) для вас аккаунт в приложении «${APP}» с ролью <b>${esc(roleName)}</b>. Данные для входа:`) +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 4px;padding:8px 16px;background:${C.bg};border:1px solid ${C.line};border-radius:8px"><tr><td style="padding:4px 16px">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">` +
    row('Логин (email)', esc(email), true) +
    row('Пароль', esc(password), true) +
    (url ? row('Адрес входа', `<a href="${esc(url)}" style="color:${C.accent};text-decoration:none">${esc(url)}</a>`) : '') +
    `</table></td></tr></table>` +
    (url ? btn(url, 'Войти в приложение') : '') +
    `<p style="margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px">Пароль передан по почте, поэтому после первого входа смените его: имя в правом верхнем углу → «Профиль» → смена пароля. Затем удалите это письмо.</p>` +
    `<h2 style="margin:24px 0 8px;font:600 17px/1.3 ${FONT};color:${C.text}">С чего начать</h2>` +
    `<ol style="margin:0 0 12px;padding-left:20px;color:${C.text}">${list}</ol>` +
    p(`Подробнее — в разделе «Руководство пользователя»${url ? ` (<a href="${esc(url)}/guide" style="color:${C.accent};text-decoration:none">${esc(url)}/guide</a>, откроется после входа)` : ' в меню приложения'}.`, `color:${C.muted};font-size:14px`);
  const text = [
    `Здравствуйте, ${name}!`,
    '',
    `${creator} создал(а) для вас аккаунт в приложении «${APP}» с ролью «${roleName}».`,
    '',
    `Логин (email): ${email}`,
    `Пароль: ${password}`,
    url ? `Адрес входа: ${url}` : '',
    '',
    'Пароль передан по почте: после первого входа смените его (Профиль → смена пароля) и удалите это письмо.',
    '',
    'С чего начать:',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Подробнее — «Руководство пользователя» в меню приложения${url ? ` (${url}/guide)` : ''}.`,
  ].filter((l, i, a) => l || a[i - 1] !== '').join('\n');
  return { subject, html: layout({ preheader: `Логин и пароль для входа, роль: ${roleName}`, body }), text };
}
