#!/usr/bin/env node
// Исправляет ошибку «Пароль должен передаваться в зашифрованном виде. Обновите страницу (Ctrl+F5)».
// Причина: форма смены пароля в «Профиле» (pages/account.vue) отправляла текущий и новый пароль открытым текстом,
// а сервер (POST /api/auth/password) принимает только зашифрованные поля { enc, kid }. Шифрование (sealFields) в этой форме
// пропало при одном из прошлых обновлений: в .ui-polish-backup оно ещё есть. Остальные места с паролями уже шифруют:
// вход, регистрация, первый запуск, восстановление пароля по коду, удаление аккаунта, пароль пользователя (создание и сброс),
// токен бота.
//
// Запуск из корня проекта:  node fix-password-sealing.mjs [путь/к/проекту]
// Всё или ничего; повторный запуск безопасен; копия pages/account.vue: *.bak-sealing.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const file = 'pages/account.vue';
const from = "await api('/auth/password', { method: 'POST', body: { current: current.value, next: next.value } })";
const to = "await api('/auth/password', { method: 'POST', body: await sealFields({ current: current.value, next: next.value }) })";

const full = path.join(root, file);
if (!fs.existsSync(full)) { console.error(`${file}: файл не найден (запускайте из корня проекта или укажите путь)`); process.exit(1); }
let text = fs.readFileSync(full, 'utf8');
if (text.includes(to)) { console.log('Уже применено: изменений нет.'); process.exit(0); }
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`Ничего не изменено: ожидаемая строка отправки пароля найдена ${n} раз(а), ожидался 1.`); process.exit(1); }

// на всякий случай проверяем, что остальные отправки паролей в проекте зашифрованы
const left = [];
for (const dir of ['pages', 'components', 'composables']) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /\.(vue|ts)$/.test(x))) {
    const src = (f === 'account.vue' && dir === 'pages') ? text.replace(from, to) : fs.readFileSync(path.join(d, f), 'utf8');
    for (const [i, line] of src.split('\n').entries()) {
      if (/api\(.*\/(auth\/(login|setup|register|reset|password|delete-account)|users|bot)['`"]/.test(line) && /body:/.test(line) && !/sealFields/.test(line)
        && /(password|token|current|next|code)\b/.test(line)) left.push(`${dir}/${f}:${i + 1}`);
    }
  }
}

const bak = full + '.bak-sealing';
if (!fs.existsSync(bak)) fs.copyFileSync(full, bak);
fs.writeFileSync(full, text.replace(from, () => to));
console.log('изменён: ' + file);
if (left.length) console.log('Внимание: в этих местах пароль может уходить без шифрования, проверьте вручную:\n  - ' + left.join('\n  - '));
else console.log('Проверка: других отправок паролей без шифрования не найдено.');
console.log('\nГотово. Обновите страницу в браузере (Ctrl+F5); на production сначала пересоберите приложение.');
