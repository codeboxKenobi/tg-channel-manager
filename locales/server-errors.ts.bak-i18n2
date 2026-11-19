// Сообщения об ошибках приходят с сервера на русском (так они написаны в server/express/*). Для других языков
// клиент переводит их по этой таблице; неизвестное сообщение показывается как есть.
// Добавляете новое сообщение на сервере: добавьте его сюда (точная строка или шаблон).

type Rule = [RegExp, (m: RegExpMatchArray) => string]
interface Table {
  exact: Record<string, string>
  patterns: Rule[]
}

const MEDIA: Record<string, string> = { Видео: 'Video', Картинка: 'Image' }

const en: Table = {
  exact: {
    'Канал не найден': 'Channel not found',
    'Нет доступа к этому каналу': 'You do not have access to this channel',
    'Главный администратор не может быть удалён': 'The main administrator cannot be deleted',
    'Не найдено': 'Not found',
    'Такая запись уже существует': 'This record already exists',
    'Связанная запись не найдена': 'Related record not found',
    'Внутренняя ошибка сервера': 'Internal server error',
    'Пароль — не короче 8 символов': 'The password must be at least 8 characters long',
    'Пароль слишком длинный': 'The password is too long',
    'Некорректный email': 'Invalid email address',
    'Укажите имя': 'Enter a name',
    'Требуется вход': 'Sign-in required',
    'Недостаточно прав': 'Insufficient permissions',
    'Запрос с чужого origin отклонён': 'Request from a foreign origin rejected',
    'Telegram не принял токен: проверьте, что он скопирован целиком': 'Telegram rejected the token: make sure it was copied in full',
    'Бот не подключён: администратор должен добавить токен бота на странице «Бот»': 'The bot is not connected: an administrator must add the bot token on the “Bot” page',
    'Бот не подключён': 'The bot is not connected',
    'Ссылки-приглашения не подходят: нужен публичный канал с @username': 'Invite links do not work: a public channel with an @username is required',
    'Укажите @username публичного канала (латиница, цифры и _, 4–32 символа)': 'Enter the @username of a public channel (Latin letters, digits and _, 4–32 characters)',
    'Telegram просит подождать (429). Повторите позже': 'Telegram asks you to wait (429). Try again later',
    'Канал не найден или у него отключён публичный просмотр': 'Channel not found, or its public preview is disabled',
    'Недопустимый адрес файла': 'Invalid file address',
    'Неподдерживаемый тип файла': 'Unsupported file type',
    'Файл повреждён или имеет другой формат': 'The file is corrupted or has a different format',
    'Ключ шифрования устарел. Повторите попытку': 'The encryption key has expired. Try again',
    'Запрос устарел или уже использован. Повторите попытку': 'The request has expired or has already been used. Try again',
    'Пароль должен передаваться в зашифрованном виде. Обновите страницу (Ctrl+F5)': 'The password must be sent in encrypted form. Refresh the page (Ctrl+F5)',
    'Не удалось расшифровать данные. Обновите страницу и повторите попытку': 'Could not decrypt the data. Refresh the page and try again',
    'На сервере не задан SECRETS_KEY (32 байта, например: openssl rand -base64 32)': 'SECRETS_KEY is not set on the server (32 bytes, for example: openssl rand -base64 32)',
    'Неизвестный формат секрета': 'Unknown secret format',
    'Не удалось расшифровать токен: изменился SECRETS_KEY или запись повреждена': 'Could not decrypt the token: SECRETS_KEY has changed or the record is corrupted',
    'Администратор уже создан': 'The administrator has already been created',
    'Регистрация отключена': 'Registration is disabled',
    'Слишком много попыток регистрации. Повторите позже': 'Too many registration attempts. Try again later',
    'Неверный код приглашения': 'Invalid invitation code',
    'Сначала нужно создать первого администратора': 'The first administrator must be created first',
    'Этот email уже зарегистрирован': 'This email is already registered',
    'Слишком много попыток. Повторите через 15 минут': 'Too many attempts. Try again in 15 minutes',
    'Неверный email или пароль': 'Incorrect email or password',
    'Текущий пароль неверен': 'The current password is incorrect',
    'Главный администратор не может удалить аккаунт': 'The main administrator cannot delete their account',
    'Пароль неверен': 'Incorrect password',
    'Неподдерживаемый язык': 'Unsupported language',
    'На сервере не задан SECRETS_KEY: токены ботов негде безопасно хранить. Обратитесь к владельцу сервера': 'SECRETS_KEY is not set on the server, so bot tokens cannot be stored securely. Contact the server owner',
    'Токен выглядит неверно: ожидается вид 123456789:AA… от @BotFather': 'The token looks wrong: expected something like 123456789:AA… from @BotFather',
    'Это токен не бота': 'This is not a bot token',
    'Этот бот уже подключён к другому администратору': 'This bot is already connected to another administrator',
    'Укажите @username или id канала': 'Enter the channel @username or id',
    'Бот не подключён (страница «Бот»): укажите числовой id и название': 'The bot is not connected (“Bot” page): enter the numeric id and the title',
    'Этот канал уже подключён': 'This channel is already connected',
    'Укажите название': 'Enter a title',
    'Бот не подключён: администратор должен добавить токен на странице «Бот»': 'The bot is not connected: an administrator must add the token on the “Bot” page',
    'Этот канал уже добавлен': 'This channel has already been added',
    'Выберите хотя бы один канал': 'Select at least one channel',
    'Канал уже парсится': 'The channel is already being parsed',
    'Выберите канал для публикации': 'Select a channel to publish to',
    'Пост не найден': 'Post not found',
    'Пост уже сформирован': 'The post has already been created',
    'После удаления ссылок и упоминаний в посте не осталось текста': 'No text is left in the post after removing links and mentions',
    'Выберите канал': 'Select a channel',
    'Укажите заголовок': 'Enter a title',
    'Текст поста не может быть пустым': 'The post text cannot be empty',
    'Подпись к фото или видео — не более 1024 символов': 'A photo or video caption can be at most 1024 characters',
    'Текст — не более 4096 символов': 'The text can be at most 4096 characters',
    'Некорректная ссылка на файл': 'Invalid file link',
    'Некорректный parse_mode': 'Invalid parse_mode',
    'Некорректная дата публикации': 'Invalid publication date',
    'Опубликованный пост редактировать нельзя': 'A published post cannot be edited',
    'Пост не найден или уже публикуется': 'Post not found or is already being published',
    'Не удалось опубликовать': 'Could not publish',
    'Файл не похож на видео MP4': 'The file does not look like an MP4 video',
    'Формат QuickTime (.mov) не поддерживается: экспортируйте видео в MP4 (H.264)': 'QuickTime (.mov) is not supported: export the video as MP4 (H.264)',
    'Видео больше 50 МБ: Telegram принимает от бота файлы до 50 МБ': 'The video is larger than 50 MB: Telegram accepts files up to 50 MB from a bot',
    'Файл пустой': 'The file is empty',
    'Загрузите изображение (JPEG, PNG, WebP до 10 МБ) или видео MP4 (до 50 МБ)': 'Upload an image (JPEG, PNG, WebP up to 10 MB) or an MP4 video (up to 50 MB)',
    'Файл не похож на изображение': 'The file does not look like an image',
    'Пользователь не найден': 'User not found',
    'Некорректная роль': 'Invalid role',
    'Создавать администраторов может только главный администратор': 'Only the main administrator can create administrators',
    'Роль изменить нельзя: создайте пользователя заново': 'The role cannot be changed: create the user again',
    'Каналы закрепляются только за редакторами': 'Channels can only be assigned to editors',
  },
  patterns: [
    [/^Не удалось связаться с Telegram: (.+)$/s, (m) => `Could not reach Telegram: ${m[1]}`],
    [/^Не удалось отправить (видео|фото): (.+)$/s, (m) => `Could not send the ${m[1] === 'видео' ? 'video' : 'photo'}: ${m[2]}`],
    [/^Telegram ответил (\d+)$/, (m) => `Telegram responded with ${m[1]}`],
    [/^Не удалось загрузить t\.me: (.+)$/s, (m) => `Could not load t.me: ${m[1]}`],
    [/^t\.me ответил (\d+)$/, (m) => `t.me responded with ${m[1]}`],
    [/^Файл недоступен \((\d+)\)$/, (m) => `File unavailable (${m[1]})`],
    [/^Файл больше (\d+) МБ$/, (m) => `The file is larger than ${m[1]} MB`],
    [/^Не больше (\d+) каналов-источников: удалите ненужные$/, (m) => `No more than ${m[1]} source channels: remove the ones you do not need`],
    [/^За один раз — не более (\d+) каналов$/, (m) => `No more than ${m[1]} channels at a time`],
    [/^(Видео|Картинка) не добавлено: текст длиннее 1024 символов \(лимит подписи в Telegram\)$/, (m) => `${MEDIA[m[1]]} was not added: the text is longer than 1024 characters (the Telegram caption limit)`],
    [/^(Видео|Картинка) не добавлено: (.+)\. Добавьте вручную$/s, (m) => `${MEDIA[m[1]]} was not added: ${translateServerMessage(m[2], 'en')}. Add it manually`],
    [/^У администратора есть данные \(каналов: (\d+), редакторов: (\d+)\)\. Они будут удалены вместе с ним, подтвердите удаление$/, (m) => `The administrator has data (channels: ${m[1]}, editors: ${m[2]}). It will be deleted along with the account, please confirm the deletion`],
  ],
}

const TABLES: Record<string, Table> = { en }

/** Переводит сообщение сервера на язык locale (для ru и неизвестных сообщений возвращает как есть). */
export function translateServerMessage(message: string, locale: string): string {
  const table = TABLES[locale]
  if (!table || !message) return message
  const exact = table.exact[message]
  if (exact !== undefined) return exact
  for (const [re, fn] of table.patterns) {
    const m = message.match(re)
    if (m) return fn(m)
  }
  return message
}
