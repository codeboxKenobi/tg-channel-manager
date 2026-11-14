// Проверка окружения перед запуском: npm run doctor  (node --env-file=.env scripts/doctor.js [--offline])
// Ничего не меняет в БД и данных. Код выхода 1, если есть критичные проблемы (✗).
// --offline пропускает проверки доступности Telegram и t.me.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const offline = process.argv.includes('--offline');
let webhookUrlToCheck = null;
const results = [];
const ok = (m) => results.push(['ok', m]);
const warn = (m) => results.push(['warn', m]);
const fail = (m) => results.push(['fail', m]);
const section = (m) => results.push(['section', m]);

const TABLES = ['users', 'sessions', 'channels', 'posts', 'post_likes', 'channel_stats', 'channel_users', 'parser_sources', 'parsed_posts', 'workspace_bots'];
const env = process.env;

// ---------- Node.js ----------
section('Node.js и файлы');
{
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major > 20 || (major === 20 && minor >= 6)) ok(`Node.js ${process.versions.node} (нужен 20.6+, рекомендуется 22 LTS)`);
  else fail(`Node.js ${process.versions.node}: нужен 20.6 или новее (флаг --env-file, fetch, AbortSignal.timeout)`);

  if (fs.existsSync('.env')) ok('Файл .env найден');
  else warn('Файл .env не найден: значения берутся только из окружения процесса (cp .env.example .env)');

  if (fs.existsSync('.output/server/index.mjs')) ok('Продакшн-сборка есть (.output)');
  else warn('Нет сборки .output: для продакшена выполните npm run build (для разработки не нужно)');
}

// ---------- настройки ----------
section('Настройки (.env)');
function secretsKeyProblem(raw) {
  const v = (raw || '').trim();
  if (!v) return 'не задан';
  if (/^[0-9a-f]{64}$/i.test(v)) return null;
  const b = Buffer.from(v, 'base64');
  return b.length === 32 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(v) ? null : 'должен быть ровно 32 байта: openssl rand -base64 32';
}
{
  const p = secretsKeyProblem(env.SECRETS_KEY);
  if (!p) ok('SECRETS_KEY корректен');
  else fail(`SECRETS_KEY ${p}: без него администраторы не смогут подключить ботов`);

  if (env.ALLOW_REGISTRATION === 'false') ok('Самостоятельная регистрация отключена');
  else if ((env.REGISTRATION_CODE || '').trim()) ok('Регистрация открыта по коду-приглашению (REGISTRATION_CODE)');
  else warn('Регистрация открыта для всех без кода. На публичном сервере задайте REGISTRATION_CODE или ALLOW_REGISTRATION=false');

  if (env.TRUST_PROXY === 'true') ok('TRUST_PROXY=true (приложение за reverse proxy с HTTPS)');
  else ok('TRUST_PROXY не включён: cookie без флага Secure (нормально для http://localhost; за HTTPS-прокси включите)');

  // режим получения событий от Telegram: webhook (продакшн) или polling (разработка)
  const botMode = (env.BOT_MODE || '').trim().toLowerCase();
  const pub = (env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (botMode && !['auto', 'polling', 'webhook'].includes(botMode)) warn(`BOT_MODE="${env.BOT_MODE}" не распознан (допустимо auto, webhook, polling)`);
  if (botMode === 'polling') ok('Боты работают через polling (BOT_MODE=polling)');
  else if (/^https:\/\/[^/\s]+/i.test(pub)) {
    ok(`Боты работают через webhook: ${pub}/api/telegram/<id администратора>`);
    const port = new URL(pub).port;
    if (port && !['80', '88', '443', '8443'].includes(port)) fail(`PUBLIC_URL с портом ${port}: Telegram принимает webhook только на портах 443, 80, 88 и 8443`);
    webhookUrlToCheck = pub;
  } else if (pub) {
    warn(`PUBLIC_URL="${env.PUBLIC_URL}" не начинается с https://: боты будут работать через polling (Telegram принимает webhook только по HTTPS)`);
  } else if (botMode === 'webhook') {
    fail('BOT_MODE=webhook, но PUBLIC_URL не задан: укажите публичный https-адрес приложения');
  } else {
    warn('PUBLIC_URL не задан: боты работают через polling (подходит для разработки). Для продакшена задайте PUBLIC_URL=https://ваш-домен: боты перейдут на webhook');
  }

  if (env.ALLOW_PLAINTEXT_PASSWORD === 'true') warn('ALLOW_PLAINTEXT_PASSWORD=true: сервер принимает пароли в открытом виде. Отключите, если не нужен curl/скрипты');
  if (env.PORT && !/^\d+$/.test(env.PORT)) fail(`PORT="${env.PORT}" не число`);
  else ok(`Порт: ${env.PORT || '3000 (по умолчанию)'}`);

  const dir = path.resolve(env.UPLOAD_DIR || './data/uploads');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.doctor-${process.pid}`);
    fs.writeFileSync(probe, 'x');
    fs.unlinkSync(probe);
    ok(`Папка загрузок доступна на запись: ${dir}`);
  } catch (e) {
    fail(`Папка загрузок ${dir} недоступна на запись: ${e.code || e.message}`);
  }
}

// ---------- база данных ----------
section('База данных');
async function checkDb() {
  if (!env.DATABASE_URL) return fail('DATABASE_URL не задан');
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    return fail('DATABASE_URL не похож на URL (postgres://пользователь:пароль@хост:5432/база). Спецсимволы в пароле кодируйте: @ → %40, # → %23');
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) return fail(`DATABASE_URL: протокол ${url.protocol} (нужен postgres://)`);
  const where = `${url.hostname}:${url.port || 5432}/${url.pathname.slice(1)}`;

  let pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    return fail('Пакет pg не установлен: выполните npm install');
  }
  const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  client.on('error', () => {});
  try {
    await client.connect();
  } catch (e) {
    const hint =
      e.code === 'ECONNREFUSED' ? 'сервер не запущен или неверный хост/порт (для docker-compose.yml порт 5433)'
      : e.code === '28P01' ? 'неверный пароль'
      : e.code === '3D000' ? 'база не существует: создайте её (docs/SETUP.md, раздел «База данных»)'
      : e.code === '28000' ? 'пользователь не существует или нет доступа'
      : e.code === 'ENOTFOUND' ? 'хост не найден'
      : e.message;
    return fail(`Не удалось подключиться к ${where}: ${hint}`);
  }
  try {
    const { rows: [v] } = await client.query('select current_setting(\'server_version\') as v');
    ok(`PostgreSQL ${v.v} (${where})`);
    const { rows } = await client.query('select table_name from information_schema.tables where table_schema = current_schema()');
    const have = new Set(rows.map((r) => r.table_name));
    const missing = TABLES.filter((t) => !have.has(t));
    if (!missing.length) ok(`Все ${TABLES.length} таблиц на месте`);
    else if (missing.length === TABLES.length) warn('Таблиц ещё нет: они создадутся при первом запуске приложения (или npm run migrate)');
    else warn(`Не хватает таблиц: ${missing.join(', ')}. Они создадутся при запуске приложения (или npm run migrate)`);

    if (have.has('users')) {
      const { rows: cols } = await client.query("select column_name from information_schema.columns where table_schema = current_schema() and table_name = 'users'");
      const hasTenancy = cols.some((c) => c.column_name === 'is_super');
      if (!hasTenancy) warn('Схема старая (нет изолированных пространств): запустите приложение или npm run migrate, предварительно сделав pg_dump');
      else {
        const { rows: [s] } = await client.query("select count(*)::int as users, count(*) filter (where role = 'admin')::int as admins, count(*) filter (where is_super)::int as supers from users");
        if (s.users === 0) ok('Пользователей нет: при первом входе откроется создание главного администратора');
        else if (s.supers === 1) ok(`Пользователей: ${s.users}, администраторов: ${s.admins}, главный администратор есть`);
        else warn(`Пользователей: ${s.users}, но главных администраторов ${s.supers} (ожидается 1): перезапустите приложение, миграция назначит главного`);
        if (have.has('workspace_bots')) {
          const { rows: [b] } = await client.query('select count(*)::int as n from workspace_bots');
          ok(`Подключено ботов (workspace_bots): ${b.n}`);
        }
      }
    }
  } catch (e) {
    fail(`Ошибка запроса к БД: ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}
await checkDb();

// ---------- Telegram ----------
section('Telegram');
async function get(url, ms = 8000) {
  return fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'Mozilla/5.0 (tg-channel-manager doctor)' } });
}
async function checkTelegram() {
  if (env.BOT_TOKEN) {
    if (offline) warn('BOT_TOKEN задан, но проверка пропущена (--offline)');
    else {
      try {
        const res = await get(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
        const data = await res.json().catch(() => ({}));
        if (data.ok) ok(`BOT_TOKEN принят Telegram: @${data.result.username} (бот по умолчанию главного администратора)`);
        else fail(`BOT_TOKEN отклонён Telegram (${res.status}): проверьте токен у @BotFather`);
      } catch (e) {
        fail(`Не удалось проверить BOT_TOKEN: ${e.cause?.code || e.message}`);
      }
    }
  } else ok('BOT_TOKEN не задан: боты подключаются администраторами на странице «Бот» (нужен SECRETS_KEY)');

  if (offline) return;
  if (webhookUrlToCheck) {
    try {
      const res = await get(`${webhookUrlToCheck}/api/health`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) ok(`${webhookUrlToCheck} отвечает с этого сервера: приложение доступно по публичному адресу`);
      else warn(`${webhookUrlToCheck}/api/health ответил HTTP ${res.status}: Telegram может не достучаться (приложение ещё не запущено или прокси не настроен)`);
    } catch (e) {
      warn(`${webhookUrlToCheck} не открывается с этого сервера (${e.cause?.code || e.message}): проверьте DNS, сертификат и прокси; Telegram должен достучаться извне`);
    }
  }
  try {
    const res = await get('https://api.telegram.org');
    ok(`api.telegram.org доступен (HTTP ${res.status}): публикация и подключение каналов будут работать`);
  } catch (e) {
    fail(`api.telegram.org недоступен с этого сервера (${e.cause?.code || e.message}): публикация не заработает`);
  }
  try {
    const res = await get('https://t.me/s/telegram');
    if (res.ok && new URL(res.url).pathname.startsWith('/s/')) ok('t.me доступен: парсер каналов будет работать');
    else warn(`t.me/s ответил неожиданно (HTTP ${res.status}): парсер может не работать`);
  } catch (e) {
    warn(`t.me недоступен с этого сервера (${e.cause?.code || e.message}): страница «Парсер» не заработает`);
  }
}
await checkTelegram();

// ---------- вывод ----------
const icon = { ok: '✓', warn: '⚠', fail: '✗' };
console.log(`tg-channel-manager: проверка окружения (${os.hostname()})`);
for (const [kind, msg] of results) {
  if (kind === 'section') console.log(`\n${msg}`);
  else console.log(`  ${icon[kind]} ${msg}`);
}
const f = results.filter((r) => r[0] === 'fail').length;
const w = results.filter((r) => r[0] === 'warn').length;
console.log(`\nИтог: ${f ? `критичных проблем — ${f}` : 'критичных проблем нет'}${w ? `, предупреждений — ${w}` : ''}`);
process.exit(f ? 1 : 0);
