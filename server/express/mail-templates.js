// Шаблоны писем в оформлении приложения: те же цвета, шрифт и скругления, что в assets/main.css (светлая тема).
// Вёрстка таблицами с inline-стилями: так письма одинаково выглядят в Gmail, Яндекс.Почте, Mail.ru и Outlook.
// Письма уходят на языке получателя (users.lang): код восстановления — на языке его аккаунта, письмо с доступом — на языке
// создавшего аккаунт администратора (с ним же начинает новый пользователь). Неизвестный язык заменяется русским.
// Названия кнопок и разделов в текстах совпадают с интерфейсом (locales/ru.ts, locales/en.ts). Новый язык: добавьте блок в TEXTS.

const C = { bg: '#f2f5f7', card: '#ffffff', text: '#17252e', muted: '#64757f', line: '#dde4e8', accent: '#0a7d8c', warn: '#b7791f' };
const FONT = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const TEXTS = {
  ru: {
    app: 'Менеджер каналов',
    footer: (app) => `Это автоматическое письмо от приложения «${app}». Отвечать на него не нужно.`,
    roles: { editor: 'Редактор', admin: 'Администратор' },
    hello: (name) => `Здравствуйте, ${name}!`,
    // Что делать дальше — краткое содержание «Руководства пользователя» для роли (раздел «Быстрый старт»)
    steps: {
      editor: [
        'Войдите в приложение по логину и паролю из этого письма.',
        'Администратор закрепит за вами каналы. Пока доступ не выдан, вы увидите «Вам пока не назначены каналы» — напишите администратору.',
        'Откройте «Подготовка постов» → «Новый пост»: введите текст, добавьте картинку, видео MP4 или файл (PDF, TXT, Excel) и выберите время либо нажмите «Опубликовать сейчас».',
        'Результат смотрите в «Опубликованных» и «Метриках». Готовые посты можно взять в «Парсере» из публичных Telegram-каналов.',
      ],
      admin: [
        'Войдите в приложение по логину и паролю из этого письма.',
        'На странице «Бот» вставьте токен бота, созданного у @BotFather. У каждого администратора свой бот.',
        'Добавьте бота администратором в свой Telegram-канал с правом публикации сообщений.',
        'На странице «Каналы» подключите канал по @username или числовому id.',
        'На странице «Пользователи» создайте редакторов и закрепите за ними каналы. Ваше пространство изолировано: другие администраторы его не видят.',
      ],
    },
    reset: {
      subject: (code) => `Код для восстановления пароля: ${code}`,
      h1: 'Восстановление пароля',
      ask: 'Вы запросили смену пароля. Введите этот код на странице восстановления:',
      valid: (minutes) => `Код действует ${minutes} минут и подходит для одной смены пароля.`,
      button: 'Ввести код',
      warn: 'Если вы не запрашивали смену пароля, просто удалите письмо: пароль останется прежним. Никому не сообщайте этот код.',
      textCode: (code) => `Код для восстановления пароля: ${code}`,
      textValid: (minutes) => `Он действует ${minutes} минут.`,
      textPage: (url) => `Страница восстановления: ${url}/forgot`,
      textWarn: 'Если вы не запрашивали смену пароля, просто удалите письмо. Никому не сообщайте этот код.',
      preheader: (code, minutes) => `Код: ${code}. Действует ${minutes} минут.`,
    },
    welcome: {
      subject: (app) => `Вам создан доступ к приложению «${app}»`,
      h1: 'Добро пожаловать!',
      intro: (creator, app, role) => `${creator} создал(а) для вас аккаунт в приложении «${app}» с ролью <b>${role}</b>. Данные для входа:`,
      textIntro: (creator, app, role) => `${creator} создал(а) для вас аккаунт в приложении «${app}» с ролью «${role}».`,
      login: 'Логин (email)',
      password: 'Пароль',
      address: 'Адрес входа',
      button: 'Войти в приложение',
      warn: 'Пароль передан по почте, поэтому после первого входа смените его: имя в правом верхнем углу → «Профиль» → смена пароля. Затем удалите это письмо.',
      start: 'С чего начать',
      moreLead: 'Подробнее — в разделе «Руководство пользователя»',
      moreLinked: (link) => ` (${link}, откроется после входа)`,
      moreMenu: ' в меню приложения',
      textWarn: 'Пароль передан по почте: после первого входа смените его (Профиль → смена пароля) и удалите это письмо.',
      textStart: 'С чего начать:',
      textMore: (url) => `Подробнее — «Руководство пользователя» в меню приложения${url ? ` (${url}/guide)` : ''}.`,
      preheader: (role) => `Логин и пароль для входа, роль: ${role}`,
    },
  },
  en: {
    app: 'Channel Manager',
    footer: (app) => `This is an automatic email from “${app}”. There is no need to reply.`,
    roles: { editor: 'Editor', admin: 'Administrator' },
    hello: (name) => `Hello, ${name}!`,
    steps: {
      editor: [
        'Sign in to the app with the login and password from this email.',
        'An administrator will assign channels to you. Until access is granted you will see “No channels have been assigned to you yet”: contact the administrator.',
        'Open “Post preparation” → “New post”: enter the text, add an image, an MP4 video or a file (PDF, TXT, Excel) and choose a time, or click “Publish now”.',
        'See the results in “Published” and “Metrics”. You can take ready-made posts from public Telegram channels in the “Parser”.',
      ],
      admin: [
        'Sign in to the app with the login and password from this email.',
        'On the “Bot” page, paste the token of the bot you created with @BotFather. Each administrator has their own bot.',
        'Add the bot as an administrator to your Telegram channel with permission to post messages.',
        'On the “Channels” page, connect the channel by its @username or numeric id.',
        'On the “Users” page, create editors and assign channels to them. Your workspace is isolated: other administrators cannot see it.',
      ],
    },
    reset: {
      subject: (code) => `Password reset code: ${code}`,
      h1: 'Password reset',
      ask: 'You requested a password change. Enter this code on the password reset page:',
      valid: (minutes) => `The code is valid for ${minutes} minutes and works for a single password change.`,
      button: 'Enter the code',
      warn: 'If you did not request a password change, just delete this email: your password will stay the same. Do not share this code with anyone.',
      textCode: (code) => `Password reset code: ${code}`,
      textValid: (minutes) => `It is valid for ${minutes} minutes.`,
      textPage: (url) => `Password reset page: ${url}/forgot`,
      textWarn: 'If you did not request a password change, just delete this email. Do not share this code with anyone.',
      preheader: (code, minutes) => `Code: ${code}. Valid for ${minutes} minutes.`,
    },
    welcome: {
      subject: (app) => `You have been given access to “${app}”`,
      h1: 'Welcome!',
      intro: (creator, app, role) => `${creator} has created an account for you in “${app}” with the role <b>${role}</b>. Your sign-in details:`,
      textIntro: (creator, app, role) => `${creator} has created an account for you in “${app}” with the role “${role}”.`,
      login: 'Login (email)',
      password: 'Password',
      address: 'Sign-in address',
      button: 'Sign in to the app',
      warn: 'The password was sent by email, so change it after your first sign-in: your name in the top right corner → “Profile” → change password. Then delete this email.',
      start: 'Getting started',
      moreLead: 'For more details, see the “User guide” section',
      moreLinked: (link) => ` (${link}, available after you sign in)`,
      moreMenu: ' in the app menu',
      textWarn: 'The password was sent by email: after your first sign-in change it (Profile → change password) and delete this email.',
      textStart: 'Getting started:',
      textMore: (url) => `For more details, see the “User guide” section in the app menu${url ? ` (${url}/guide)` : ''}.`,
      preheader: (role) => `Sign-in details, role: ${role}`,
    },
  },
};

const textsFor = (lang) => TEXTS[lang] ?? TEXTS.ru;
const langOf = (lang) => (TEXTS[lang] ? lang : 'ru');

const btn = (href, label) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px"><tr><td style="border-radius:8px;background:${C.accent}">` +
  `<a href="${esc(href)}" style="display:inline-block;padding:10px 24px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a></td></tr></table>`;

function layout({ lang, preheader, body }) {
  const tx = textsFor(lang);
  return `<!doctype html>
<html lang="${langOf(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${tx.app}</title></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.text};font:15px/1.55 ${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px">
    <tr><td align="center" style="padding:0 0 20px">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="padding-right:12px"><img src="cid:logo" alt="" height="40" style="display:block;height:40px;width:auto;border:0"></td>
        <td style="font:600 20px ${FONT};color:${C.text}">${tx.app}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:10px;padding:28px 28px 24px">${body}</td></tr>
    <tr><td align="center" style="padding:16px 8px 0;font:12px/1.5 ${FONT};color:${C.muted}">${tx.footer(tx.app)}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const h1 = (t) => `<h1 style="margin:0 0 12px;font:600 22px/1.3 ${FONT};color:${C.text}">${esc(t)}</h1>`;
const p = (t, extra = '') => `<p style="margin:0 0 12px;color:${C.text};${extra}">${t}</p>`;

/** Письмо с кодом восстановления пароля (lang — язык аккаунта получателя). */
export function resetCodeMail({ name, code, minutes, url, lang }) {
  const tx = textsFor(lang);
  const r = tx.reset;
  const subject = r.subject(code);
  const body =
    h1(r.h1) +
    p(tx.hello(esc(name))) +
    p(r.ask) +
    `<div style="margin:16px 0;padding:16px;text-align:center;background:${C.bg};border:1px solid ${C.line};border-radius:8px;font:600 32px/1 'Courier New',Consolas,monospace;letter-spacing:8px;color:${C.accent}">${esc(code)}</div>` +
    p(r.valid(minutes), `color:${C.muted}`) +
    (url ? btn(`${url}/forgot`, r.button) : '') +
    `<p style="margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px">${r.warn}</p>`;
  const text = [
    tx.hello(name),
    '',
    r.textCode(code),
    r.textValid(minutes),
    url ? r.textPage(url) : '',
    '',
    r.textWarn,
  ].filter((l, i, a) => l || a[i - 1] !== '').join('\n');
  return { subject, html: layout({ lang, preheader: r.preheader(code, minutes), body }), text };
}

/** Письмо новому администратору или редактору: логин, пароль и краткое описание из руководства пользователя (lang — язык нового пользователя). */
export function welcomeMail({ name, role, email, password, creator, url, lang }) {
  const tx = textsFor(lang);
  const w = tx.welcome;
  const steps = tx.steps[role] ?? tx.steps.editor;
  const roleName = tx.roles[role] ?? tx.roles.editor;
  const subject = w.subject(tx.app);
  const row = (label, value, mono) =>
    `<tr><td style="padding:8px 12px 8px 0;font-size:13px;color:${C.muted};white-space:nowrap;vertical-align:top">${label}</td>` +
    `<td style="padding:8px 0;font:${mono ? "600 15px 'Courier New',Consolas,monospace" : `15px ${FONT}`};color:${C.text};word-break:break-all">${value}</td></tr>`;
  const list = steps.map((s) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join('');
  const guideLink = `<a href="${esc(url)}/guide" style="color:${C.accent};text-decoration:none">${esc(url)}/guide</a>`;
  const body =
    h1(w.h1) +
    p(tx.hello(esc(name))) +
    p(w.intro(esc(creator), tx.app, esc(roleName))) +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 4px;padding:8px 16px;background:${C.bg};border:1px solid ${C.line};border-radius:8px"><tr><td style="padding:4px 16px">` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">` +
    row(w.login, esc(email), true) +
    row(w.password, esc(password), true) +
    (url ? row(w.address, `<a href="${esc(url)}" style="color:${C.accent};text-decoration:none">${esc(url)}</a>`) : '') +
    `</table></td></tr></table>` +
    (url ? btn(url, w.button) : '') +
    `<p style="margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px">${w.warn}</p>` +
    `<h2 style="margin:24px 0 8px;font:600 17px/1.3 ${FONT};color:${C.text}">${w.start}</h2>` +
    `<ol style="margin:0 0 12px;padding-left:20px;color:${C.text}">${list}</ol>` +
    p(`${w.moreLead}${url ? w.moreLinked(guideLink) : w.moreMenu}.`, `color:${C.muted};font-size:14px`);
  const text = [
    tx.hello(name),
    '',
    w.textIntro(creator, tx.app, roleName),
    '',
    `${w.login}: ${email}`,
    `${w.password}: ${password}`,
    url ? `${w.address}: ${url}` : '',
    '',
    w.textWarn,
    '',
    w.textStart,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    w.textMore(url),
  ].filter((l, i, a) => l || a[i - 1] !== '').join('\n');
  return { subject, html: layout({ lang, preheader: w.preheader(roleName), body }), text };
}
