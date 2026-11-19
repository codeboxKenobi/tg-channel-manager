#!/usr/bin/env node
// Многоязычность, часть 2: английский для писем, восстановления пароля и остальных мест, которые остались русскими.
// Ставится поверх проекта, в котором уже применён add-i18n.mjs и добавлена почта (add-email.mjs).
//
// Запуск из корня проекта:   node add-i18n-2.mjs            (применить)
//                            node add-i18n-2.mjs --dry-run  (только проверить, ничего не менять)
//                            node add-i18n-2.mjs --force    (перезаписать mail-templates.js и forgot.vue, даже если они изменены)
//
// Что делает:
//   • письма (server/express/mail-templates.js): письмо с доступом и код восстановления пароля уходят на языке получателя
//     (код — на языке аккаунта, письмо с доступом — на языке создавшего аккаунт администратора); русский текст не меняется;
//   • страница восстановления пароля (/forgot), ссылка «Забыли пароль?», сообщение «Пароль изменён» и уведомление об отправке
//     письма на странице «Пользователи» переведены; на странице восстановления есть переключатель RU / EN;
//   • причины сбоя отправки почты и новые сообщения сервера переводятся по таблице locales/server-errors.ts;
//   • ответ читателю на «лайк» в Telegram приходит на языке администратора, которому принадлежит канал;
//   • руководство: раздел «Письма и восстановление пароля» (из add-email-guide-section.html) на обоих языках, вопросы в FAQ,
//     исправлено устаревшее «приложение не отправляет писем»; README дополнен.
//
// Скрипт безопасен: сначала проверяет все правки, и если хоть одна не подходит, ничего не меняет.
// Перед первым изменением файла рядом сохраняется копия *.bak-i18n2. Повторный запуск ничего не ломает.
// После применения перезапустите сервер и обновите страницу (Ctrl+F5).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DATA = {
 "edits": [
  {
   "file": "locales/ru.ts",
   "hunks": [
    {
     "old": "  'guide.toc.faq': 'Частые вопросы',\n}\n\nexport default ru",
     "new": "  'guide.toc.faq': 'Частые вопросы',\n  'login.forgot': 'Забыли пароль?',\n  'login.resetDone': 'Пароль изменён. Войдите с новым паролем.',\n  'forgot.title': 'Восстановление пароля',\n  'forgot.intro': 'Укажите email от аккаунта. Мы отправим на него код для смены пароля.',\n  'forgot.sendCode': 'Отправить код',\n  'forgot.backToLogin': 'Вернуться ко входу',\n  'forgot.newPasswordTitle': 'Новый пароль',\n  'forgot.sentNotice': 'Если аккаунт с адресом {email} существует, мы отправили на него письмо с кодом. Код действует {minutes} минут. Проверьте и папку «Спам».',\n  'forgot.codeLabel': 'Код из письма',\n  'forgot.noMail': 'Письмо не пришло?',\n  'forgot.resend': 'Отправить код ещё раз',\n  'forgot.resendIn': 'Повторить можно через {n} с',\n  'users.mailSent': 'Пользователь создан. Письмо с логином и паролем отправлено на {email}.',\n  'users.mailFailed': 'Пользователь создан, но письмо не отправлено: {reason}. Передайте логин и пароль другим способом.',\n  'users.mailUnknown': 'причина неизвестна',\n  'guide.toc.mail': 'Письма и восстановление пароля',\n}\n\nexport default ru",
     "count": 1
    }
   ]
  },
  {
   "file": "locales/en.ts",
   "hunks": [
    {
     "old": "  'guide.toc.faq': 'Frequently asked questions',\n}\n\nexport default en",
     "new": "  'guide.toc.faq': 'Frequently asked questions',\n  'login.forgot': 'Forgot your password?',\n  'login.resetDone': 'Password changed. Sign in with your new password.',\n  'forgot.title': 'Password recovery',\n  'forgot.intro': 'Enter the email of your account. We will send a code for changing the password to it.',\n  'forgot.sendCode': 'Send code',\n  'forgot.backToLogin': 'Back to sign in',\n  'forgot.newPasswordTitle': 'New password',\n  'forgot.sentNotice': 'If an account with the address {email} exists, we have sent an email with a code to it. The code is valid for {minutes} minutes. Check your spam folder as well.',\n  'forgot.codeLabel': 'Code from the email',\n  'forgot.noMail': 'Did not get the email?',\n  'forgot.resend': 'Send the code again',\n  'forgot.resendIn': 'You can resend it in {n} s',\n  'users.mailSent': 'The user was created. An email with the login and password was sent to {email}.',\n  'users.mailFailed': 'The user was created, but the email was not sent: {reason}. Pass the login and password on in another way.',\n  'users.mailUnknown': 'reason unknown',\n  'guide.toc.mail': 'Emails and password recovery',\n}\n\nexport default en",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/login.vue",
   "hunks": [
    {
     "old": "<p v-if=\"resetDone && !needsSetup\" class=\"callout mb-3\">Пароль изменён. Войдите с новым паролем.</p>",
     "new": "<p v-if=\"resetDone && !needsSetup\" class=\"callout mb-3\">{{ t('login.resetDone') }}</p>",
     "count": 1
    },
    {
     "old": "<NuxtLink to=\"/forgot\">Забыли пароль?</NuxtLink>",
     "new": "<NuxtLink to=\"/forgot\">{{ t('login.forgot') }}</NuxtLink>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/users.vue",
   "hunks": [
    {
     "old": "const { user: me, isSuper } = useAuth()\nconst { t } = useLocale()",
     "new": "const { user: me, isSuper } = useAuth()\nconst { t, tServer } = useLocale()",
     "count": 1
    },
    {
     "old": "      ? { ok: true, text: `Пользователь создан. Письмо с логином и паролем отправлено на ${res.email}.` }\n      : { ok: false, text: `Пользователь создан, но письмо не отправлено: ${res?.mail?.reason ?? 'причина неизвестна'}. Передайте логин и пароль другим способом.` }",
     "new": "      ? { ok: true, text: t('users.mailSent', { email: res.email }) }\n      : { ok: false, text: t('users.mailFailed', { reason: res?.mail?.reason ? tServer(res.mail.reason) : t('users.mailUnknown') }) }",
     "count": 1
    }
   ]
  },
  {
   "file": "locales/server-errors.ts",
   "hunks": [
    {
     "old": "    'Каналы закрепляются только за редакторами': 'Channels can only be assigned to editors',",
     "new": "    'Каналы закрепляются только за редакторами': 'Channels can only be assigned to editors',\n    'Отправка почты не настроена. Обратитесь к администратору': 'Email sending is not configured. Contact the administrator',\n    'Слишком много запросов кода. Повторите через час': 'Too many code requests. Try again in an hour',\n    'Неверный или просроченный код': 'Invalid or expired code',\n    // причины сбоя отправки письма (server/express/mailer.js); подставляются в середину предложения, поэтому с маленькой буквы\n    'отправка почты не настроена на сервере': 'email sending is not configured on the server',\n    'на сервере не установлен пакет nodemailer': 'the nodemailer package is not installed on the server',\n    'почтовый сервер отклонил логин или пароль SMTP': 'the mail server rejected the SMTP login or password',\n    'не удалось подключиться к почтовому серверу': 'could not connect to the mail server',\n    'почтовый сервер отклонил письмо (проверьте адрес получателя и MAIL_FROM)': 'the mail server rejected the email (check the recipient address and MAIL_FROM)',\n    'ошибка отправки письма': 'email sending error',",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/routes/auth.js",
   "hunks": [
    {
     "old": "await q('select id, email, name from users where email = $1', [email]);",
     "new": "await q('select id, email, name, lang from users where email = $1', [email]);",
     "count": 1
    },
    {
     "old": "resetCodeMail({ name: u.name, code, minutes: RESET_TTL_MIN, url: appUrl() })",
     "new": "resetCodeMail({ name: u.name, code, minutes: RESET_TTL_MIN, url: appUrl(), lang: u.lang })",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/routes/users.js",
   "hunks": [
    {
     "old": "creator: req.user.name, url: appUrl(req) }),",
     "new": "creator: req.user.name, url: appUrl(req), lang: normalizeLang(req.user.lang) ?? 'ru' }),",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/bot.js",
   "hunks": [
    {
     "old": "const likeKeyboard = (postId, count) =>",
     "new": "// Ответ читателю на нажатие «лайка» приходит на языке администратора, которому принадлежит канал (users.lang)\nconst LIKE_TOAST = {\n  ru: { removed: 'Лайк убран', added: 'Спасибо! 👍' },\n  en: { removed: 'Like removed', added: 'Thanks! 👍' },\n};\n\nconst likeKeyboard = (postId, count) =>",
     "count": 1
    },
    {
     "old": "await q('select 1 from posts p join channels c on c.id = p.channel_id where p.id = $1 and c.owner_id = $2', [postId, ownerId]);",
     "new": "await q(\n    'select u.lang from posts p join channels c on c.id = p.channel_id join users u on u.id = c.owner_id where p.id = $1 and c.owner_id = $2',\n    [postId, ownerId],\n  );",
     "count": 1
    },
    {
     "old": "  await ctx.answerCbQuery(removed.rowCount ? 'Лайк убран' : 'Спасибо! 👍');",
     "new": "  const toast = LIKE_TOAST[own.rows[0].lang] ?? LIKE_TOAST.ru;\n  await ctx.answerCbQuery(removed.rowCount ? toast.removed : toast.added);",
     "count": 1
    }
   ]
  },
  {
   "file": "scripts/test-mail.js",
   "hunks": [
    {
     "old": "// Проверка почты: npm run mail:test -- адрес@пример.рф",
     "new": "// Проверка почты: npm run mail:test -- адрес@пример.рф [ru|en]  (язык письма, по умолчанию ru)",
     "count": 1
    },
    {
     "old": "creator: 'Проверка почты', url: appUrl() }),",
     "new": "creator: 'Проверка почты', url: appUrl(), lang: process.argv[3] === 'en' ? 'en' : 'ru' }),",
     "count": 1
    }
   ]
  },
  {
   "file": "README.md",
   "hunks": [
    {
     "old": "- Названия каналов, тексты постов и сообщения, которые бот пишет в Telegram, не переводятся.",
     "new": "- Письма (`server/express/mail-templates.js`) уходят на языке получателя: код восстановления пароля — на языке его аккаунта, письмо с доступом — на языке создавшего аккаунт администратора. Проверить: `npm run mail:test -- адрес@пример.рф en`.\n- Ответ читателю на нажатие «лайка» в Telegram приходит на языке администратора, которому принадлежит канал (`LIKE_TOAST` в `server/express/bot.js`).\n- Названия каналов и тексты постов не переводятся. Журналы сервера (`console`) и скрипты `scripts/` остаются русскими.",
     "count": 1
    },
    {
     "old": "Чтобы добавить язык: `locales/<код>.ts`, запись в `composables/useLocale.ts`, код в `LANGS` в `server/express/auth.js` и перевод руководства.",
     "new": "Чтобы добавить язык: `locales/<код>.ts`, запись в `composables/useLocale.ts`, код в `LANGS` в `server/express/auth.js`, перевод руководства, блок в `TEXTS` в `server/express/mail-templates.js` и `LIKE_TOAST` в `server/express/bot.js`.",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/guide.vue",
   "hunks": [
    {
     "old": "'language', 'delete', 'faq']",
     "new": "'language', 'mail', 'delete', 'faq']",
     "count": 1
    }
   ]
  },
  {
   "file": "components/GuideRu.vue",
   "hunks": [
    {
     "old": "  <section id=\"delete\" class=\"card guide-section prose\">",
     "new": "  <section id=\"mail\" class=\"card guide-section prose\">\n    <h2>Письма и восстановление пароля</h2>\n    <p>Приложение отправляет два вида писем. Они приходят в том же оформлении, что и само приложение, и на языке аккаунта получателя.</p>\n\n    <h3>Письмо с доступом</h3>\n    <p>Когда администратор создаёт редактора (а главный администратор — администратора), на email нового пользователя уходит письмо. В нём указаны логин для входа (это email), пароль, кнопка «Войти в приложение» и краткое описание того, с чего начать работу. Описание повторяет «Быстрый старт» этого руководства для роли пользователя. Письмо приходит на языке администратора, который создал аккаунт; сменить язык новый пользователь может в своём профиле.</p>\n    <p class=\"callout callout-warn\">Пароль передан по почте, поэтому после первого входа смените его на странице «Профиль», а письмо удалите.</p>\n    <p>Если письмо не удалось отправить, под формой на странице «Пользователи» появится предупреждение. Аккаунт при этом уже создан: передайте логин и пароль другим способом.</p>\n\n    <h3>Если забыли пароль</h3>\n    <ol>\n      <li>На странице входа нажмите «Забыли пароль?» и введите email своего аккаунта.</li>\n      <li>Откройте письмо и скопируйте 6-значный код. Он действует 15 минут.</li>\n      <li>Введите код и новый пароль (не короче 8 символов) и нажмите «Сменить пароль».</li>\n      <li>Войдите с новым паролем. На остальных устройствах вход придётся выполнить заново.</li>\n    </ol>\n    <p>На код даётся 5 попыток, затем запросите новый. Код можно запрашивать не чаще 3 раз в час. Если письма нет, проверьте папку «Спам».</p>\n    <p class=\"callout\">Если на странице входа нет ссылки «Забыли пароль?», почта на сервере не настроена: попросите администратора сбросить пароль на странице «Пользователи».</p>\n  </section>\n\n  <section id=\"delete\" class=\"card guide-section prose\">",
     "count": 1
    },
    {
     "old": "Приложение не отправляет писем, поэтому предупреждения перед удалением нет.",
     "new": "Предупреждение по почте перед удалением не отправляется.",
     "count": 1
    },
    {
     "old": "    </dl>\n  </section>\n</template>",
     "new": "      <dt>Забыл пароль</dt>\n      <dd>На странице входа нажмите «Забыли пароль?», введите email и код из письма (раздел «Письма и восстановление пароля»). Если такой ссылки нет, попросите администратора сбросить пароль на странице «Пользователи».</dd>\n      <dt>Не пришло письмо с кодом или с доступом</dt>\n      <dd>Проверьте папку «Спам» и адрес, на который создан аккаунт. Код можно запросить заново не чаще 3 раз в час. Если письма не приходят совсем, сообщите владельцу сервера: у него могут быть не настроены SMTP-параметры.</dd>\n    </dl>\n  </section>\n</template>",
     "count": 1
    }
   ]
  },
  {
   "file": "components/GuideEn.vue",
   "hunks": [
    {
     "old": "  <section id=\"delete\" class=\"card guide-section prose\">",
     "new": "  <section id=\"mail\" class=\"card guide-section prose\">\n    <h2>Emails and password recovery</h2>\n    <p>The app sends two kinds of emails. They come in the same design as the app itself and in the language of the recipient’s account.</p>\n\n    <h3>The access email</h3>\n    <p>When an administrator creates an editor (or the main administrator creates an administrator), an email is sent to the new user’s address. It contains the login (which is the email), the password, a “Sign in to the app” button and a short description of how to get started. The description repeats the “Quick start” of this guide for the user’s role. The email comes in the language of the administrator who created the account; the new user can change the language in their profile.</p>\n    <p class=\"callout callout-warn\">The password was sent by email, so change it on the “Profile” page after your first sign-in and delete the email.</p>\n    <p>If the email could not be sent, a warning appears under the form on the “Users” page. The account has already been created, so pass the login and password on in another way.</p>\n\n    <h3>If you forgot your password</h3>\n    <ol>\n      <li>On the sign-in page click “Forgot your password?” and enter the email of your account.</li>\n      <li>Open the email and copy the 6-digit code. It is valid for 15 minutes.</li>\n      <li>Enter the code and a new password (at least 8 characters) and click “Change password”.</li>\n      <li>Sign in with the new password. You will need to sign in again on your other devices.</li>\n    </ol>\n    <p>You have 5 attempts to enter the code, then request a new one. A code can be requested no more than 3 times per hour. If the email does not arrive, check your spam folder.</p>\n    <p class=\"callout\">If there is no “Forgot your password?” link on the sign-in page, email is not configured on the server: ask an administrator to reset your password on the “Users” page.</p>\n  </section>\n\n  <section id=\"delete\" class=\"card guide-section prose\">",
     "count": 1
    },
    {
     "old": "The app does not send emails, so there is no warning before deletion.",
     "new": "No warning email is sent before deletion.",
     "count": 1
    },
    {
     "old": "    </dl>\n  </section>\n</template>",
     "new": "      <dt>I forgot my password</dt>\n      <dd>On the sign-in page click “Forgot your password?”, then enter your email and the code from the email (see the “Emails and password recovery” section). If there is no such link, ask an administrator to reset your password on the “Users” page.</dd>\n      <dt>The email with the code or with access did not arrive</dt>\n      <dd>Check your spam folder and the address the account was created for. A code can be requested again no more than 3 times per hour. If emails do not arrive at all, tell the server owner: the SMTP settings may not be configured.</dd>\n    </dl>\n  </section>\n</template>",
     "count": 1
    }
   ]
  }
 ],
 "files": {},
 "replace": {
  "server/express/mail-templates.js": {
   "from": "8770d6fad29b6e09840031a7c7baee469a2974c267b804d7589be3668499f6db",
   "content": "// Шаблоны писем в оформлении приложения: те же цвета, шрифт и скругления, что в assets/main.css (светлая тема).\n// Вёрстка таблицами с inline-стилями: так письма одинаково выглядят в Gmail, Яндекс.Почте, Mail.ru и Outlook.\n// Письма уходят на языке получателя (users.lang): код восстановления — на языке его аккаунта, письмо с доступом — на языке\n// создавшего аккаунт администратора (с ним же начинает новый пользователь). Неизвестный язык заменяется русским.\n// Названия кнопок и разделов в текстах совпадают с интерфейсом (locales/ru.ts, locales/en.ts). Новый язык: добавьте блок в TEXTS.\n\nconst C = { bg: '#f2f5f7', card: '#ffffff', text: '#17252e', muted: '#64757f', line: '#dde4e8', accent: '#0a7d8c', warn: '#b7791f' };\nconst FONT = \"'Segoe UI', Roboto, Helvetica, Arial, sans-serif\";\n\nconst esc = (s) => String(s ?? '').replace(/[&<>\"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' })[ch]);\n\nconst TEXTS = {\n  ru: {\n    app: 'Менеджер каналов',\n    footer: (app) => `Это автоматическое письмо от приложения «${app}». Отвечать на него не нужно.`,\n    roles: { editor: 'Редактор', admin: 'Администратор' },\n    hello: (name) => `Здравствуйте, ${name}!`,\n    // Что делать дальше — краткое содержание «Руководства пользователя» для роли (раздел «Быстрый старт»)\n    steps: {\n      editor: [\n        'Войдите в приложение по логину и паролю из этого письма.',\n        'Администратор закрепит за вами каналы. Пока доступ не выдан, вы увидите «Вам пока не назначены каналы» — напишите администратору.',\n        'Откройте «Подготовка постов» → «Новый пост»: введите текст, добавьте картинку или видео MP4 и выберите время либо нажмите «Опубликовать сейчас».',\n        'Результат смотрите в «Опубликованных» и «Метриках». Готовые посты можно взять в «Парсере» из публичных Telegram-каналов.',\n      ],\n      admin: [\n        'Войдите в приложение по логину и паролю из этого письма.',\n        'На странице «Бот» вставьте токен бота, созданного у @BotFather. У каждого администратора свой бот.',\n        'Добавьте бота администратором в свой Telegram-канал с правом публикации сообщений.',\n        'На странице «Каналы» подключите канал по @username или числовому id.',\n        'На странице «Пользователи» создайте редакторов и закрепите за ними каналы. Ваше пространство изолировано: другие администраторы его не видят.',\n      ],\n    },\n    reset: {\n      subject: (code) => `Код для восстановления пароля: ${code}`,\n      h1: 'Восстановление пароля',\n      ask: 'Вы запросили смену пароля. Введите этот код на странице восстановления:',\n      valid: (minutes) => `Код действует ${minutes} минут и подходит для одной смены пароля.`,\n      button: 'Ввести код',\n      warn: 'Если вы не запрашивали смену пароля, просто удалите письмо: пароль останется прежним. Никому не сообщайте этот код.',\n      textCode: (code) => `Код для восстановления пароля: ${code}`,\n      textValid: (minutes) => `Он действует ${minutes} минут.`,\n      textPage: (url) => `Страница восстановления: ${url}/forgot`,\n      textWarn: 'Если вы не запрашивали смену пароля, просто удалите письмо. Никому не сообщайте этот код.',\n      preheader: (code, minutes) => `Код: ${code}. Действует ${minutes} минут.`,\n    },\n    welcome: {\n      subject: (app) => `Вам создан доступ к приложению «${app}»`,\n      h1: 'Добро пожаловать!',\n      intro: (creator, app, role) => `${creator} создал(а) для вас аккаунт в приложении «${app}» с ролью <b>${role}</b>. Данные для входа:`,\n      textIntro: (creator, app, role) => `${creator} создал(а) для вас аккаунт в приложении «${app}» с ролью «${role}».`,\n      login: 'Логин (email)',\n      password: 'Пароль',\n      address: 'Адрес входа',\n      button: 'Войти в приложение',\n      warn: 'Пароль передан по почте, поэтому после первого входа смените его: имя в правом верхнем углу → «Профиль» → смена пароля. Затем удалите это письмо.',\n      start: 'С чего начать',\n      moreLead: 'Подробнее — в разделе «Руководство пользователя»',\n      moreLinked: (link) => ` (${link}, откроется после входа)`,\n      moreMenu: ' в меню приложения',\n      textWarn: 'Пароль передан по почте: после первого входа смените его (Профиль → смена пароля) и удалите это письмо.',\n      textStart: 'С чего начать:',\n      textMore: (url) => `Подробнее — «Руководство пользователя» в меню приложения${url ? ` (${url}/guide)` : ''}.`,\n      preheader: (role) => `Логин и пароль для входа, роль: ${role}`,\n    },\n  },\n  en: {\n    app: 'Channel Manager',\n    footer: (app) => `This is an automatic email from “${app}”. There is no need to reply.`,\n    roles: { editor: 'Editor', admin: 'Administrator' },\n    hello: (name) => `Hello, ${name}!`,\n    steps: {\n      editor: [\n        'Sign in to the app with the login and password from this email.',\n        'An administrator will assign channels to you. Until access is granted you will see “No channels have been assigned to you yet”: contact the administrator.',\n        'Open “Post preparation” → “New post”: enter the text, add an image or an MP4 video and choose a time, or click “Publish now”.',\n        'See the results in “Published” and “Metrics”. You can take ready-made posts from public Telegram channels in the “Parser”.',\n      ],\n      admin: [\n        'Sign in to the app with the login and password from this email.',\n        'On the “Bot” page, paste the token of the bot you created with @BotFather. Each administrator has their own bot.',\n        'Add the bot as an administrator to your Telegram channel with permission to post messages.',\n        'On the “Channels” page, connect the channel by its @username or numeric id.',\n        'On the “Users” page, create editors and assign channels to them. Your workspace is isolated: other administrators cannot see it.',\n      ],\n    },\n    reset: {\n      subject: (code) => `Password reset code: ${code}`,\n      h1: 'Password reset',\n      ask: 'You requested a password change. Enter this code on the password reset page:',\n      valid: (minutes) => `The code is valid for ${minutes} minutes and works for a single password change.`,\n      button: 'Enter the code',\n      warn: 'If you did not request a password change, just delete this email: your password will stay the same. Do not share this code with anyone.',\n      textCode: (code) => `Password reset code: ${code}`,\n      textValid: (minutes) => `It is valid for ${minutes} minutes.`,\n      textPage: (url) => `Password reset page: ${url}/forgot`,\n      textWarn: 'If you did not request a password change, just delete this email. Do not share this code with anyone.',\n      preheader: (code, minutes) => `Code: ${code}. Valid for ${minutes} minutes.`,\n    },\n    welcome: {\n      subject: (app) => `You have been given access to “${app}”`,\n      h1: 'Welcome!',\n      intro: (creator, app, role) => `${creator} has created an account for you in “${app}” with the role <b>${role}</b>. Your sign-in details:`,\n      textIntro: (creator, app, role) => `${creator} has created an account for you in “${app}” with the role “${role}”.`,\n      login: 'Login (email)',\n      password: 'Password',\n      address: 'Sign-in address',\n      button: 'Sign in to the app',\n      warn: 'The password was sent by email, so change it after your first sign-in: your name in the top right corner → “Profile” → change password. Then delete this email.',\n      start: 'Getting started',\n      moreLead: 'For more details, see the “User guide” section',\n      moreLinked: (link) => ` (${link}, available after you sign in)`,\n      moreMenu: ' in the app menu',\n      textWarn: 'The password was sent by email: after your first sign-in change it (Profile → change password) and delete this email.',\n      textStart: 'Getting started:',\n      textMore: (url) => `For more details, see the “User guide” section in the app menu${url ? ` (${url}/guide)` : ''}.`,\n      preheader: (role) => `Sign-in details, role: ${role}`,\n    },\n  },\n};\n\nconst textsFor = (lang) => TEXTS[lang] ?? TEXTS.ru;\nconst langOf = (lang) => (TEXTS[lang] ? lang : 'ru');\n\nconst btn = (href, label) =>\n  `<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin:24px 0 8px\"><tr><td style=\"border-radius:8px;background:${C.accent}\">` +\n  `<a href=\"${esc(href)}\" style=\"display:inline-block;padding:10px 24px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;border-radius:8px\">${esc(label)}</a></td></tr></table>`;\n\nfunction layout({ lang, preheader, body }) {\n  const tx = textsFor(lang);\n  return `<!doctype html>\n<html lang=\"${langOf(lang)}\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"color-scheme\" content=\"light\"><title>${tx.app}</title></head>\n<body style=\"margin:0;padding:0;background:${C.bg};color:${C.text};font:15px/1.55 ${FONT}\">\n<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">${esc(preheader)}</div>\n<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"background:${C.bg}\"><tr><td align=\"center\" style=\"padding:24px 12px\">\n  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"max-width:520px\">\n    <tr><td align=\"center\" style=\"padding:0 0 20px\">\n      <table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\"><tr>\n        <td style=\"padding-right:12px\"><img src=\"cid:logo\" alt=\"\" height=\"40\" style=\"display:block;height:40px;width:auto;border:0\"></td>\n        <td style=\"font:600 20px ${FONT};color:${C.text}\">${tx.app}</td>\n      </tr></table>\n    </td></tr>\n    <tr><td style=\"background:${C.card};border:1px solid ${C.line};border-radius:10px;padding:28px 28px 24px\">${body}</td></tr>\n    <tr><td align=\"center\" style=\"padding:16px 8px 0;font:12px/1.5 ${FONT};color:${C.muted}\">${tx.footer(tx.app)}</td></tr>\n  </table>\n</td></tr></table>\n</body></html>`;\n}\n\nconst h1 = (t) => `<h1 style=\"margin:0 0 12px;font:600 22px/1.3 ${FONT};color:${C.text}\">${esc(t)}</h1>`;\nconst p = (t, extra = '') => `<p style=\"margin:0 0 12px;color:${C.text};${extra}\">${t}</p>`;\n\n/** Письмо с кодом восстановления пароля (lang — язык аккаунта получателя). */\nexport function resetCodeMail({ name, code, minutes, url, lang }) {\n  const tx = textsFor(lang);\n  const r = tx.reset;\n  const subject = r.subject(code);\n  const body =\n    h1(r.h1) +\n    p(tx.hello(esc(name))) +\n    p(r.ask) +\n    `<div style=\"margin:16px 0;padding:16px;text-align:center;background:${C.bg};border:1px solid ${C.line};border-radius:8px;font:600 32px/1 'Courier New',Consolas,monospace;letter-spacing:8px;color:${C.accent}\">${esc(code)}</div>` +\n    p(r.valid(minutes), `color:${C.muted}`) +\n    (url ? btn(`${url}/forgot`, r.button) : '') +\n    `<p style=\"margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px\">${r.warn}</p>`;\n  const text = [\n    tx.hello(name),\n    '',\n    r.textCode(code),\n    r.textValid(minutes),\n    url ? r.textPage(url) : '',\n    '',\n    r.textWarn,\n  ].filter((l, i, a) => l || a[i - 1] !== '').join('\\n');\n  return { subject, html: layout({ lang, preheader: r.preheader(code, minutes), body }), text };\n}\n\n/** Письмо новому администратору или редактору: логин, пароль и краткое описание из руководства пользователя (lang — язык нового пользователя). */\nexport function welcomeMail({ name, role, email, password, creator, url, lang }) {\n  const tx = textsFor(lang);\n  const w = tx.welcome;\n  const steps = tx.steps[role] ?? tx.steps.editor;\n  const roleName = tx.roles[role] ?? tx.roles.editor;\n  const subject = w.subject(tx.app);\n  const row = (label, value, mono) =>\n    `<tr><td style=\"padding:8px 12px 8px 0;font-size:13px;color:${C.muted};white-space:nowrap;vertical-align:top\">${label}</td>` +\n    `<td style=\"padding:8px 0;font:${mono ? \"600 15px 'Courier New',Consolas,monospace\" : `15px ${FONT}`};color:${C.text};word-break:break-all\">${value}</td></tr>`;\n  const list = steps.map((s) => `<li style=\"margin:0 0 6px\">${esc(s)}</li>`).join('');\n  const guideLink = `<a href=\"${esc(url)}/guide\" style=\"color:${C.accent};text-decoration:none\">${esc(url)}/guide</a>`;\n  const body =\n    h1(w.h1) +\n    p(tx.hello(esc(name))) +\n    p(w.intro(esc(creator), tx.app, esc(roleName))) +\n    `<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"margin:8px 0 4px;padding:8px 16px;background:${C.bg};border:1px solid ${C.line};border-radius:8px\"><tr><td style=\"padding:4px 16px\">` +\n    `<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">` +\n    row(w.login, esc(email), true) +\n    row(w.password, esc(password), true) +\n    (url ? row(w.address, `<a href=\"${esc(url)}\" style=\"color:${C.accent};text-decoration:none\">${esc(url)}</a>`) : '') +\n    `</table></td></tr></table>` +\n    (url ? btn(url, w.button) : '') +\n    `<p style=\"margin:16px 0 0;padding:10px 14px;border-left:3px solid ${C.warn};background:#faf4e8;border-radius:0 8px 8px 0;font-size:14px\">${w.warn}</p>` +\n    `<h2 style=\"margin:24px 0 8px;font:600 17px/1.3 ${FONT};color:${C.text}\">${w.start}</h2>` +\n    `<ol style=\"margin:0 0 12px;padding-left:20px;color:${C.text}\">${list}</ol>` +\n    p(`${w.moreLead}${url ? w.moreLinked(guideLink) : w.moreMenu}.`, `color:${C.muted};font-size:14px`);\n  const text = [\n    tx.hello(name),\n    '',\n    w.textIntro(creator, tx.app, roleName),\n    '',\n    `${w.login}: ${email}`,\n    `${w.password}: ${password}`,\n    url ? `${w.address}: ${url}` : '',\n    '',\n    w.textWarn,\n    '',\n    w.textStart,\n    ...steps.map((s, i) => `${i + 1}. ${s}`),\n    '',\n    w.textMore(url),\n  ].filter((l, i, a) => l || a[i - 1] !== '').join('\\n');\n  return { subject, html: layout({ lang, preheader: w.preheader(roleName), body }), text };\n}\n"
  },
  "pages/forgot.vue": {
   "from": "632a6bf61dedad0353c94243c2e1de74127aebfb66293ab4c213b30fcf4b110b",
   "content": "<script setup lang=\"ts\">\n// Восстановление пароля: 1) email → код на почту, 2) код + новый пароль.\nconst { forgot, resetPassword } = useAuth()\nconst { t } = useLocale()\nconst route = useRoute()\nconst step = ref<'email' | 'code'>('email')\nconst email = ref(typeof route.query.email === 'string' ? route.query.email : '')\nconst code = ref('')\nconst password = ref('')\nconst repeat = ref('')\nconst error = ref('')\nconst busy = ref(false)\nconst minutes = ref(15)\nconst cooldown = ref(0)\nlet timer: ReturnType<typeof setInterval> | null = null\n\nfunction startCooldown() {\n  cooldown.value = 60\n  if (timer) clearInterval(timer)\n  timer = setInterval(() => {\n    cooldown.value -= 1\n    if (cooldown.value <= 0 && timer) {\n      clearInterval(timer)\n      timer = null\n    }\n  }, 1000)\n}\nonBeforeUnmount(() => {\n  if (timer) clearInterval(timer)\n})\n\nasync function sendCode() {\n  error.value = ''\n  busy.value = true\n  try {\n    const r = await forgot(email.value.trim())\n    minutes.value = r.minutes\n    step.value = 'code'\n    startCooldown()\n  } catch (e: any) {\n    error.value = e.message\n  } finally {\n    busy.value = false\n  }\n}\n\nasync function submit() {\n  error.value = ''\n  if (password.value !== repeat.value) return void (error.value = t('register.mismatch'))\n  busy.value = true\n  try {\n    await resetPassword(email.value.trim(), code.value, password.value)\n    await navigateTo('/login?reset=1')\n  } catch (e: any) {\n    error.value = e.message\n  } finally {\n    busy.value = false\n  }\n}\n</script>\n\n<template>\n  <form v-if=\"step === 'email'\" class=\"card auth-card\" @submit.prevent=\"sendCode\">\n    <LangSwitch variant=\"buttons\" />\n    <AuthBrand />\n    <h1>{{ t('forgot.title') }}</h1>\n    <p class=\"muted\">{{ t('forgot.intro') }}</p>\n\n    <label>{{ t('field.email') }}</label>\n    <input v-model=\"email\" type=\"email\" required autocomplete=\"username\" autofocus />\n\n    <p v-if=\"error\" class=\"error mt-3\">{{ error }}</p>\n    <div class=\"actions\">\n      <button class=\"primary\" :disabled=\"busy\">{{ t('forgot.sendCode') }}</button>\n    </div>\n    <p class=\"muted mt-4\"><NuxtLink to=\"/login\">{{ t('forgot.backToLogin') }}</NuxtLink></p>\n  </form>\n\n  <form v-else class=\"card auth-card\" @submit.prevent=\"submit\">\n    <LangSwitch variant=\"buttons\" />\n    <AuthBrand />\n    <h1>{{ t('forgot.newPasswordTitle') }}</h1>\n    <p class=\"muted\">{{ t('forgot.sentNotice', { email, minutes }) }}</p>\n\n    <label>{{ t('forgot.codeLabel') }}</label>\n    <input v-model=\"code\" required inputmode=\"numeric\" pattern=\"[0-9 ]{6,7}\" maxlength=\"7\" autocomplete=\"one-time-code\" autofocus />\n\n    <label>{{ t('field.newPassword') }}</label>\n    <input v-model=\"password\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" />\n\n    <label>{{ t('field.repeatPassword') }}</label>\n    <input v-model=\"repeat\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" />\n\n    <p v-if=\"error\" class=\"error mt-3\">{{ error }}</p>\n    <div class=\"actions\">\n      <button class=\"primary\" :disabled=\"busy\">{{ t('account.changePassword') }}</button>\n    </div>\n    <p class=\"muted mt-4\">\n      {{ t('forgot.noMail') }}\n      <button v-if=\"cooldown <= 0\" type=\"button\" class=\"linkbtn\" :disabled=\"busy\" @click=\"sendCode\">{{ t('forgot.resend') }}</button>\n      <span v-else>{{ t('forgot.resendIn', { n: cooldown }) }}</span>\n    </p>\n    <p class=\"muted mt-2\"><NuxtLink to=\"/login\">{{ t('forgot.backToLogin') }}</NuxtLink></p>\n  </form>\n</template>\n\n<style scoped>\n/* кнопка «Отправить код ещё раз» выглядит как ссылка (как остальные ссылки приложения) */\n.linkbtn { background: none; border: 0; padding: 0; font: inherit; color: var(--accent); cursor: pointer; }\n.linkbtn:hover { color: color-mix(in srgb, var(--accent) 75%, var(--text)); }\n.linkbtn:disabled { opacity: 0.6; cursor: default; }\n</style>\n"
  }
 }
}

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const FORCE = args.has('--force')
const BAK = '.bak-i18n2'
const root = process.cwd()
const abs = (f) => path.join(root, f)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const count = (t, s) => (s === '' ? 0 : t.split(s).length - 1)

if (!fs.existsSync(abs('package.json')) || !fs.existsSync(abs('pages')) || !fs.existsSync(abs('server/express'))) {
  console.error('Запустите скрипт из корня проекта tg-channel-manager (рядом с package.json).')
  process.exit(1)
}

const errors = []
const writes = [] // { file, text, backup }
const log = []

// 1. Точечные правки существующих файлов
for (const { file, hunks } of DATA.edits) {
  if (!fs.existsSync(abs(file))) { errors.push(`${file}: файл не найден`); continue }
  const original = fs.readFileSync(abs(file), 'utf8')
  let text = original
  let applied = 0
  let skipped = 0
  hunks.forEach((h, i) => {
    const n = h.count ?? 1
    const done = h.new === '' ? count(text, h.old) === 0 : text.includes(h.new)
    if (done) { skipped++; return }
    const found = count(text, h.old)
    if (found !== n) {
      errors.push(`${file}, правка ${i + 1}: ожидалось вхождений: ${n}, найдено: ${found}. Начало фрагмента: ${JSON.stringify(h.old.slice(0, 70))}`)
      return
    }
    text = text.split(h.old).join(h.new)
    applied++
  })
  if (applied) writes.push({ file, text, backup: true })
  log.push(`${applied ? 'изменён ' : 'без изменений'} ${file}${applied ? ` (правок: ${applied}${skipped ? `, уже было: ${skipped}` : ''})` : ''}`)
}

// 2. Файлы целиком, которые заменяют существующие (с проверкой исходного содержимого)
for (const [file, { from, content }] of Object.entries(DATA.replace)) {
  if (!fs.existsSync(abs(file))) { errors.push(`${file}: файл не найден`); continue }
  const cur = fs.readFileSync(abs(file), 'utf8')
  if (cur === content) { log.push(`без изменений ${file}`); continue }
  if (sha(cur) !== from && !FORCE) {
    errors.push(`${file}: файл отличается от версии, под которую написан скрипт. Если изменения в нём не нужны, запустите с --force (останется копия ${file}${BAK})`)
    continue
  }
  writes.push({ file, text: content, backup: true })
  log.push(`заменён  ${file}`)
}

// 3. Новые файлы
for (const [file, content] of Object.entries(DATA.files)) {
  if (!fs.existsSync(abs(file))) { writes.push({ file, text: content, backup: false }); log.push(`создан   ${file}`); continue }
  const cur = fs.readFileSync(abs(file), 'utf8')
  log.push(cur === content ? `без изменений ${file}` : `пропущен ${file} (уже есть и отличается: не перезаписываю ваши правки)`)
}

if (errors.length) {
  console.error('Ничего не изменено. Проблемы:\n')
  for (const e of errors) console.error('  • ' + e)
  console.error('\nПохоже, файлы проекта отличаются от тех, под которые написан скрипт. Пришлите их, и я подгоню правки.')
  process.exit(1)
}

for (const l of log) console.log('  ' + l)
if (DRY) { console.log('\nПроверка пройдена, файлы не менялись (--dry-run).'); process.exit(0) }

for (const { file, text, backup } of writes) {
  if (backup && !fs.existsSync(abs(file + BAK))) fs.copyFileSync(abs(file), abs(file + BAK))
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true })
  fs.writeFileSync(abs(file), text)
}

console.log(writes.length ? `\nГотово: записано файлов — ${writes.length}.` : '\nНичего не изменилось: правки уже применены.')
console.log('Дальше: перезапустите сервер и обновите страницу (Ctrl+F5).')
console.log('Проверка писем на английском: npm run mail:test -- адрес@пример.рф en')
