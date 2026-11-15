#!/usr/bin/env node
// Для сборки tg-channel-manager_1: все ссылки без подчёркивания и цветом акцента (цвет логотипа).
// Запуск из корня проекта:  node apply-link-style.mjs
// assets/main.css копируется в assets/main.css.bak. Повторный запуск безопасен.
import fs from 'node:fs';
import path from 'node:path';

const DATA = {
 "edits": [
  {
   "file": "assets/main.css",
   "hunks": [
    {
     "old": "html { -webkit-text-size-adjust: 100%; }\nbody { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 \"Segoe UI\", system-ui, -apple-system, sans-serif; }\nimg { max-width: 100%; }\n\n/* ---------- шапка и меню ---------- */\n/* Бургер всегда слева перед логотипом, пользователь и «Выйти» справа. Края шапки и выпадающего меню лежат\n",
     "new": "html { -webkit-text-size-adjust: 100%; }\nbody { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 \"Segoe UI\", system-ui, -apple-system, sans-serif; }\nimg { max-width: 100%; }\n\n/* ссылки: без подчёркивания, цвет акцента (как у логотипа); у ссылок в меню и оглавлении свои стили ниже */\na { color: var(--accent); text-decoration: none; }\na:hover { color: color-mix(in srgb, var(--accent) 75%, var(--text)); text-decoration: none; }\n\n/* ---------- шапка и меню ---------- */\n/* Бургер всегда слева перед логотипом, пользователь и «Выйти» справа. Края шапки и выпадающего меню лежат\n"
    }
   ]
  }
 ],
 "files": {},
 "bin": {}
};

const root = process.cwd();
for (const marker of ['nuxt.config.ts', 'pages/register.vue', 'server/express/secrets.js', 'server/express/bot.js']) {
  if (!fs.existsSync(path.join(root, marker))) {
    console.error(`Не найден ${marker}. Скрипт рассчитан на сборку tg-channel-manager_1 — запустите его из её корня.`);
    process.exit(1);
  }
}
const backup = (file) => { const bak = file + '.bak'; if (!fs.existsSync(bak)) fs.copyFileSync(file, bak); };
const count = (s, sub) => s.split(sub).length - 1;

// 1) проверяем все правки заранее: либо применяем всё, либо ничего
const plan = [];
let failed = false;
for (const { file, hunks } of DATA.edits) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { console.error(`✗ нет файла ${file}`); failed = true; continue; }
  let text = fs.readFileSync(full, 'utf8');
  let changed = false;
  hunks.forEach((h, i) => {
    if (count(text, h.new) >= 1) { /* уже применено */ }
    else if (count(text, h.old) === 1) { text = text.replace(h.old, () => h.new); changed = true; }
    else { console.error(`✗ ${file}: фрагмент #${i + 1} не найден (файл изменён после выгрузки сборки?)`); failed = true; }
  });
  plan.push({ full, file, text, changed });
}
if (failed) { console.error('\nНичего не изменено.'); process.exit(1); }

// 2) записываем
for (const p of plan) {
  if (!p.changed) { console.log(`= ${p.file} (уже применено)`); continue; }
  backup(p.full);
  fs.writeFileSync(p.full, p.text);
  console.log(`✓ ${p.file}`);
}
const put = (file, buf) => {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) {
    if (fs.readFileSync(full).equals(buf)) return console.log(`= ${file} (уже применено)`);
    backup(full);
  }
  fs.writeFileSync(full, buf);
  console.log(`✓ ${file}`);
};
for (const [file, content] of Object.entries(DATA.files)) put(file, Buffer.from(content, 'utf8'));
for (const [file, b64] of Object.entries(DATA.bin)) put(file, Buffer.from(b64, 'base64'));

console.log('\nГотово. Перезапустите приложение (npm run dev / npm run build + перезапуск).');
