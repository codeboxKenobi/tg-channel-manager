#!/usr/bin/env node
// Руководство пользователя (русская и английская версии): приведено в соответствие с проектом, убрано всё про главного администратора.
//
// Убрано: роль «Главный администратор», раздел «Администраторы» на странице «Пользователи» и удаление администратора,
// упоминание в письмах и в удалении аккаунта, вопрос «нет кнопки удаления аккаунта».
// Исправлено и добавлено (по текущему коду проекта):
//  • вложения: картинка, видео MP4, файлы PDF/TXT/Excel (раньше в руководстве было только изображение), лимиты 10 / 50 МБ;
//  • публикация сразу в несколько каналов, панель эмодзи, редактирование поста на его месте;
//  • кнопки «лайк» больше нет: вместо них реакции Telegram («Бот», «Опубликованные», «Метрики»), ограничения учёта реакций;
//  • код приглашения при регистрации, удаление редактора, новые вопросы в «Частых вопросах».
// Заодно приведены в соответствие два текста интерфейса про «лайки» на странице «Бот» (locales) и пункт письма для редактора.
//
// Запуск из корня проекта:  node fix-user-guide.mjs [путь/к/проекту]
// Рассчитан на проект с установленными патчами про файлы, несколько каналов, эмодзи, реакции и редактирование на месте.
// Всё или ничего; повторный запуск безопасен; копии изменяемых файлов: *.bak-guide.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);

const EDITS = {
  // ───────────── русское руководство ─────────────
  'components/GuideRu.vue': [
    [
      'Администратор может зарегистрироваться сам, если регистрация включена. Аккаунт редактора создаёт администратор.',
      'Администратор может зарегистрироваться сам, если регистрация включена (если просят код приглашения, его выдаёт владелец сервера). Аккаунт редактора создаёт администратор.',
    ],
    [
      `      <dt><span class="badge">Главный администратор</span></dt>
      <dd>Работает как администратор и дополнительно создаёт других администраторов. Может удалить администратора вместе с его пространством.</dd>
      <dt><span class="badge">Администратор</span></dt>`,
      `      <dt><span class="badge">Администратор</span></dt>`,
    ],
    [
      '<p>Публикации, статистика и кнопки «лайк» работают через вашего бота. У каждого администратора свой бот.</p>',
      '<p>Публикации, статистика и учёт реакций читателей работают через вашего бота. У каждого администратора свой бот.</p>',
    ],
    [
      '<p>Новый токен заменяет прежнего бота. После замены «лайки» под старыми постами перестанут работать, а нового бота нужно заново добавить администратором в каналы.</p>',
      '<p>Новый токен заменяет прежнего бота. Нового бота нужно заново добавить администратором в каналы, иначе публикация и учёт реакций работать не будут. Кнопки «лайк» под постами, опубликованными раньше, перестанут работать.</p>',
    ],
    [
      'Если отключить бота, публикация и сбор статистики остановятся, а запланированные посты получат статус ошибки.',
      'Если отключить бота, публикация, сбор статистики и учёт реакций остановятся, а запланированные посты получат статус ошибки.',
    ],
    [
      '<li><b>Канал</b> — куда будет опубликован пост.</li>',
      '<li><b>Канал</b> — куда будет опубликован пост. Если каналов несколько, при создании можно отметить сразу несколько или нажать «Выбрать все»: для каждого канала создаётся отдельный пост со своим статусом и результатом публикации. При редактировании поста выбирается один канал.</li>',
    ],
    [
      '<li><b>Текст</b> — до 4096 символов, а если к посту прикреплено фото или видео, то до 1024.</li>',
      '<li><b>Текст</b> — до 4096 символов, а если к посту прикреплено фото, видео или файл, то до 1024. Под полем текста есть кнопка «😊 Эмодзи»: выберите категорию и нажмите на эмодзи, он вставится в место курсора.</li>',
    ],
    [
      '<li><b>Изображение или видео</b> — вставьте ссылку или загрузите картинку с устройства (JPEG, PNG или WebP до 10 МБ).</li>',
      '<li><b>Вложение</b> — у поста может быть одно вложение: картинка (JPEG, PNG или WebP до 10 МБ), видео MP4 или файл PDF, TXT или Excel (XLSX, XLS) до 50 МБ. Вставьте ссылку или нажмите «Загрузить с устройства». Файл уходит в канал документом под своим именем, а текст поста становится подписью.</li>',
    ],
    [
      '<dd>Изменить любое поле, в том числе время публикации.</dd>',
      '<dd>Изменить любое поле, в том числе время публикации. Форма открывается прямо на месте поста в списке.</dd>',
    ],
    [
      '<li>Под каждым постом бот добавляет кнопку «лайк», а в карточке виден счётчик 👍.</li>',
      '<li>В карточке виден счётчик реакций читателей (❤️): их передаёт Telegram, подробнее в разделе «Метрики». Если реакций нет, счётчик не показывается.</li>',
    ],
    [
      '<li><b>Сводка</b> — подписчики, опубликованные посты, лайки, посты в графике и черновики.</li>',
      '<li><b>Сводка</b> — подписчики, опубликованные посты, реакции читателей, посты в графике и черновики.</li>',
    ],
    [
      '<li><b>Динамика за 30 дней</b> — графики публикаций, лайков и подписчиков по дням.</li>',
      '<li><b>Динамика за 30 дней</b> — графики публикаций, реакций и подписчиков по дням. Реакции на графике относятся ко дню публикации поста.</li>\n      <li><b>Реакции по видам</b> — сколько раз читатели поставили 👍, ❤️, 🔥 и другие реакции.</li>',
    ],
    [
      'числом постов, лайков и лайков на пост.',
      'числом постов, реакций и реакций на пост.',
    ],
    [
      '<li><b>Лучшие посты</b> — публикации с наибольшим числом лайков.</li>',
      '<li><b>Лучшие посты</b> — публикации с наибольшим числом реакций, рядом показано, какие именно.</li>',
    ],
    [
      '<p class="callout">Число подписчиков фиксируется раз в час, поэтому график подписчиков заполняется постепенно.</p>',
      `<p class="callout">Число подписчиков фиксируется раз в час, поэтому график подписчиков заполняется постепенно.</p>
    <p class="callout">Реакции приходят от Telegram с задержкой, и учитываются только те, что поставлены после подключения учёта реакций: прежние Telegram боту не передаёт. Для этого бот должен быть администратором канала, а реакции в канале включены. Просмотры постов приложение не показывает: Telegram не передаёт их ботам.</p>`,
    ],
    [
      `      <li>Если редактор забыл пароль, нажмите «Сбросить пароль» и задайте новый.</li>
    </ol>
    <p>Главный администратор дополнительно видит раздел «Администраторы»: в нём можно создать администратора, сбросить ему пароль или удалить его.</p>
    <p class="callout callout-warn">Удаление администратора безвозвратно стирает его каналы с постами и всех его редакторов.</p>
`,
      `      <li>Если редактор забыл пароль, нажмите «Сбросить пароль» и задайте новый.</li>
      <li>Кнопка «Удалить» убирает редактора: его аккаунт и доступ к каналам удаляются, а созданные им посты остаются.</li>
    </ol>
`,
    ],
    [
      'Когда администратор создаёт редактора (а главный администратор — администратора), на email',
      'Когда администратор создаёт редактора, на email',
    ],
    [
      `      <dt><span class="badge">Главный администратор</span></dt>
      <dd>Не может удалить аккаунт сам: блока с кнопкой удаления в его профиле нет.</dd>
`,
      '',
    ],
    [
      'каналы с постами, лайками и статистикой, источники парсера',
      'каналы с постами, реакциями и статистикой, источники парсера',
    ],
    [
      `      <dt>В профиле нет кнопки удаления аккаунта</dt>
      <dd>Её нет у главного администратора: он не может удалить аккаунт сам. У остальных блок «Удаление аккаунта» находится внизу страницы «Профиль».</dd>
`,
      '',
    ],
    [
      '<dd>Для текстового поста лимит 4096 символов, для поста с фото или видео — 1024. Сократите текст или уберите медиа.</dd>',
      `<dd>Для текстового поста лимит 4096 символов, для поста с фото, видео или файлом — 1024. Сократите текст или уберите вложение.</dd>
      <dt>Файл не прикрепляется к посту</dt>
      <dd>Поддерживаются картинки JPEG, PNG и WebP до 10 МБ, видео MP4 (H.264) и файлы PDF, TXT, XLSX и XLS. Видео и файлы — до 50 МБ: это лимит Telegram для ботов. Видео с iPhone (.mov) сначала сохраните как MP4. Тип файла проверяется по содержимому, поэтому переименованный файл не подойдёт.</dd>
      <dt>В метриках нет реакций или цифры меньше, чем в Telegram</dt>
      <dd>Реакции приходят от Telegram с задержкой, и учитываются только те, что поставлены после подключения учёта реакций. Бот должен быть администратором канала, а реакции в канале включены. Посты, опубликованные раньше, начнут показывать реакции, когда под ними появится новая.</dd>`,
    ],
  ],

  // ───────────── английское руководство ─────────────
  'components/GuideEn.vue': [
    [
      'An administrator can sign up on their own if registration is enabled. An editor account is created by an administrator.',
      'An administrator can sign up on their own if registration is enabled (if an invitation code is requested, the server owner provides it). An editor account is created by an administrator.',
    ],
    [
      `      <dt><span class="badge">Main administrator</span></dt>
      <dd>Works as an administrator and can also create other administrators. Can delete an administrator together with their workspace.</dd>
      <dt><span class="badge">Administrator</span></dt>`,
      `      <dt><span class="badge">Administrator</span></dt>`,
    ],
    [
      '<p>Publishing, statistics and “like” buttons work through your bot. Each administrator has their own bot.</p>',
      '<p>Publishing, statistics and the counting of readers’ reactions work through your bot. Each administrator has their own bot.</p>',
    ],
    [
      '<p>A new token replaces the previous bot. After the replacement, “like” buttons under old posts stop working, and you need to add the new bot as an administrator to your channels again.</p>',
      '<p>A new token replaces the previous bot. You need to add the new bot as an administrator to your channels again, otherwise publishing and the counting of reactions will not work. “Like” buttons under posts published earlier stop working.</p>',
    ],
    [
      'If you disconnect the bot, publishing and statistics collection stop, and scheduled posts get the failed status.',
      'If you disconnect the bot, publishing, statistics collection and the counting of reactions stop, and scheduled posts get the failed status.',
    ],
    [
      '<li><b>Channel</b>: where the post will be published.</li>',
      '<li><b>Channel</b>: where the post will be published. If you have several channels, you can tick several at once or click “Select all” when creating a post: a separate post is created for each channel, with its own status and publishing result. When editing a post, one channel is chosen.</li>',
    ],
    [
      '<li><b>Text</b>: up to 4096 characters, or up to 1024 if a photo or video is attached to the post.</li>',
      '<li><b>Text</b>: up to 4096 characters, or up to 1024 if a photo, video or file is attached to the post. Under the text field there is an “😊 Emoji” button: choose a category and click an emoji to insert it at the cursor.</li>',
    ],
    [
      '<li><b>Image or video</b>: paste a link or upload a picture from your device (JPEG, PNG or WebP up to 10 MB).</li>',
      '<li><b>Attachment</b>: a post can have one attachment: a picture (JPEG, PNG or WebP up to 10 MB), an MP4 video, or a PDF, TXT or Excel (XLSX, XLS) file up to 50 MB. Paste a link or click “Upload from device”. A file is sent to the channel as a document under its own name, and the post text becomes the caption.</li>',
    ],
    [
      '<dd>Change any field, including the publication time.</dd>',
      '<dd>Change any field, including the publication time. The form opens right in place of the post in the list.</dd>',
    ],
    [
      '<li>Under each post the bot adds a “like” button, and the card shows a 👍 counter.</li>',
      '<li>The card shows a counter of readers’ reactions (❤️), which Telegram passes on; see the “Metrics” section. If there are no reactions, the counter is not shown.</li>',
    ],
    [
      '<li><b>Summary</b>: subscribers, published posts, likes, scheduled posts and drafts.</li>',
      '<li><b>Summary</b>: subscribers, published posts, readers’ reactions, scheduled posts and drafts.</li>',
    ],
    [
      '<li><b>Last 30 days</b>: charts of posts, likes and subscribers by day.</li>',
      '<li><b>Last 30 days</b>: charts of posts, reactions and subscribers by day. Reactions on the chart belong to the day the post was published.</li>\n      <li><b>Reactions by type</b>: how many times readers put 👍, ❤️, 🔥 and other reactions.</li>',
    ],
    [
      'the number of posts, likes and likes per post.',
      'the number of posts, reactions and reactions per post.',
    ],
    [
      '<li><b>Top posts</b>: the posts with the most likes.</li>',
      '<li><b>Top posts</b>: the posts with the most reactions, with the kinds of reactions shown next to them.</li>',
    ],
    [
      '<p class="callout">The subscriber count is recorded once an hour, so the subscribers chart fills up gradually.</p>',
      `<p class="callout">The subscriber count is recorded once an hour, so the subscribers chart fills up gradually.</p>
    <p class="callout">Reactions come from Telegram with a delay, and only reactions made after reaction counting was switched on are counted: Telegram does not pass earlier ones to the bot. For this the bot must be a channel administrator and reactions must be enabled in the channel. The app does not show post views: Telegram does not give them to bots.</p>`,
    ],
    [
      `      <li>If an editor forgets their password, click “Reset password” and set a new one.</li>
    </ol>
    <p>The main administrator also sees the “Administrators” section, where you can create an administrator, reset their password or delete them.</p>
    <p class="callout callout-warn">Deleting an administrator permanently erases their channels with posts and all their editors.</p>
`,
      `      <li>If an editor forgets their password, click “Reset password” and set a new one.</li>
      <li>The “Delete” button removes an editor: their account and access to channels are deleted, and the posts they created stay.</li>
    </ol>
`,
    ],
    [
      'When an administrator creates an editor (or the main administrator creates an administrator), an email',
      'When an administrator creates an editor, an email',
    ],
    [
      `      <dt><span class="badge">Main administrator</span></dt>
      <dd>Cannot delete the account themselves: there is no block with a delete button in their profile.</dd>
`,
      '',
    ],
    [
      'channels with posts, likes and statistics, parser sources',
      'channels with posts, reactions and statistics, parser sources',
    ],
    [
      `      <dt>There is no delete account button in my profile</dt>
      <dd>The main administrator does not have it: they cannot delete their account themselves. For everyone else, the “Delete account” block is at the bottom of the “Profile” page.</dd>
`,
      '',
    ],
    [
      '<dd>A text post is limited to 4096 characters, and a post with a photo or video to 1024. Shorten the text or remove the media.</dd>',
      `<dd>A text post is limited to 4096 characters, and a post with a photo, video or file to 1024. Shorten the text or remove the attachment.</dd>
      <dt>A file will not attach to a post</dt>
      <dd>Supported are JPEG, PNG and WebP pictures up to 10 MB, MP4 (H.264) videos, and PDF, TXT, XLSX and XLS files. Videos and files can be up to 50 MB: that is Telegram’s limit for bots. Save iPhone videos (.mov) as MP4 first. The file type is checked by its content, so a renamed file will not work.</dd>
      <dt>There are no reactions in Metrics, or the numbers are lower than in Telegram</dt>
      <dd>Reactions come from Telegram with a delay, and only reactions made after reaction counting was switched on are counted. The bot must be a channel administrator and reactions must be enabled in the channel. Posts published earlier start showing reactions when a new one appears under them.</dd>`,
    ],
  ],

  // ───────────── тексты интерфейса, которые ссылались на кнопку «лайк» ─────────────
  'locales/ru.ts': [
    [
      "'Публикация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.'",
      "'Публикация, статистика и учёт реакций ваших каналов остановятся, а запланированные посты будут помечены как неудавшиеся.'",
    ],
    [
      "'Если заменить бота, под старыми постами «лайки» работать перестанут (кнопки привязаны к прежнему боту), а новый бот нужно заново добавить администратором в каналы.'",
      "'Если заменить бота, новый бот нужно заново добавить администратором в каналы, иначе публикация и учёт реакций работать не будут.'",
    ],
  ],
  'locales/en.ts': [
    [
      "'Publishing and statistics for your channels will stop, scheduled posts will be marked as failed, and the “like” buttons under already published posts will stop working.'",
      "'Publishing, statistics and the counting of reactions for your channels will stop, and scheduled posts will be marked as failed.'",
    ],
    [
      "'If you replace the bot, “like” buttons under old posts will stop working (they are tied to the previous bot), and you will need to add the new bot as an administrator to your channels again.'",
      "'If you replace the bot, you will need to add the new bot as an administrator to your channels again, otherwise publishing and the counting of reactions will not work.'",
    ],
  ],

  // ───────────── письмо для нового редактора повторяет «Быстрый старт» ─────────────
  'server/express/mail-templates.js': [
    [
      'добавьте картинку или видео MP4 и выберите',
      'добавьте картинку, видео MP4 или файл (PDF, TXT, Excel) и выберите',
    ],
    [
      'add an image or an MP4 video and choose a time',
      'add an image, an MP4 video or a file (PDF, TXT, Excel) and choose a time',
    ],
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const problems = [];
for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(p(file))) { problems.push(`${file}: файл не найден`); continue; }
  let text = fs.readFileSync(p(file), 'utf8');
  let changed = false;
  edits.forEach(([from, to], i) => {
    const n = count(text, from);
    // «уже применено»: для вставки (новый текст содержит старый) ищем новый текст, для замены и удаления старого текста уже нет
    const insertion = to.includes(from);
    if (insertion ? count(text, to) >= 1 : n === 0 && (to === '' || count(text, to) >= 1)) return;
    if (n !== 1) { problems.push(`${file}: правка №${i + 1}: якорь найден ${n} раз(а), ожидался 1:\n    ${from.trim().split('\n')[0].slice(0, 110)}`); return; }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text] of plan) {
  const bak = p(file + '.bak-guide');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение (письма берут текст при старте сервера).');
