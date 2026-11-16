#!/usr/bin/env node
// Для сборки tg-channel-manager_1: страница «Поддержать проект» (/support) и пункт меню под «Руководством пользователя».
// Запуск из корня проекта:  node apply-support-page.mjs
// Изменяемые файлы копируются в <файл>.bak. Повторный запуск безопасен.
// ВАЖНО: адреса кошельков и номер СБП в pages/support.vue выдуманные — замените на свои.
import fs from 'node:fs';
import path from 'node:path';

const DATA = {
 "edits": [
  {
   "file": "app.vue",
   "hunks": [
    {
     "old": "          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">Руководство пользователя</NuxtLink>\n        </nav>\n      </Transition>\n    </header>\n",
     "new": "          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">Руководство пользователя</NuxtLink>\n          <NuxtLink to=\"/support\">Поддержать проект</NuxtLink>\n        </nav>\n      </Transition>\n    </header>\n"
    }
   ]
  },
  {
   "file": "assets/main.css",
   "hunks": [
    {
     "old": "  .src-row { align-items: flex-start; }\n  .parse-bar select, .parse-bar button { flex: 1 1 100%; }\n}\n",
     "new": "  .src-row { align-items: flex-start; }\n  .parse-bar select, .parse-bar button { flex: 1 1 100%; }\n}\n\n/* страница «Поддержать проект» */\n.wallets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-4); }\n.wallet-name { font-weight: 600; margin-bottom: var(--s-1); }\n.wallet-row { display: flex; align-items: center; gap: var(--s-2); }\n.wallet-value { flex: 1; min-width: 0; padding: var(--s-2) var(--s-3); overflow-wrap: anywhere; user-select: all; font-size: 14px; }\n@media (max-width: 640px) {\n  .wallet-row { flex-direction: column; align-items: stretch; }\n}\n"
    }
   ]
  }
 ],
 "files": {
  "pages/support.vue": "<script setup lang=\"ts\">\n// Реквизиты для пожертвований.\n// ВНИМАНИЕ: адреса и номер ниже ВЫДУМАННЫЕ (для примера) — перед запуском замените их на свои.\nconst wallets = [\n  { id: 'gram', name: 'Gram', value: 'UQPBnAFJOxK2AN18foIsGviEaM7ctRFZ-fgK0it5Nu_sIqAU' },\n  { id: 'btc', name: 'Bitcoin', value: 'bc1qdde45qvqh0mkszwmea8adtwqqdel2vg00e829d' },\n  { id: 'eth', name: 'Ethereum', value: '0xe6f0d35a9d7cc3e39cc7f7102c70507aa6b1c9cd' },\n  { id: 'sbp', name: 'СБП (Служба быстрых платежей)', value: '+7 900 555-01-23' },\n]\n\nconst copiedId = ref('')\nlet timer: ReturnType<typeof setTimeout> | undefined\n\n// navigator.clipboard работает только на HTTPS и localhost, а сайт может открываться по http — тогда копируем через textarea\nasync function writeClipboard(text: string) {\n  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)\n  const area = document.createElement('textarea')\n  area.value = text\n  area.setAttribute('readonly', '')\n  area.style.position = 'fixed'\n  area.style.opacity = '0'\n  document.body.appendChild(area)\n  area.select()\n  const ok = document.execCommand('copy')\n  area.remove()\n  if (!ok) throw new Error('copy failed')\n}\n\nasync function copy(w: { id: string; value: string }) {\n  try {\n    await writeClipboard(w.value)\n    copiedId.value = w.id\n    clearTimeout(timer)\n    timer = setTimeout(() => (copiedId.value = ''), 1800)\n  } catch {\n    copiedId.value = '' // не вышло — значение можно выделить и скопировать вручную (клик по нему выделяет всё)\n  }\n}\n\nonBeforeUnmount(() => clearTimeout(timer))\n</script>\n\n<template>\n  <section>\n    <div class=\"row head\"><h1>Поддержать проект</h1></div>\n\n    <div class=\"card prose\">\n      <p>«Менеджер каналов» — бесплатный проект. Им может пользоваться каждый, платить ничего не нужно, а развивает и поддерживает его один разработчик.</p>\n      <p>Если сервис вам полезен, вы можете по желанию поддержать проект пожертвованием. Это добровольно: на доступ к возможностям сервиса пожертвование никак не влияет.</p>\n    </div>\n\n    <div class=\"card\">\n      <h2>Реквизиты для пожертвований</h2>\n      <ul class=\"wallets\">\n        <li v-for=\"w in wallets\" :key=\"w.id\" class=\"wallet\">\n          <div class=\"wallet-name\">{{ w.name }}</div>\n          <div class=\"wallet-row\">\n            <code class=\"wallet-value\">{{ w.value }}</code>\n            <button type=\"button\" :aria-label=\"`Скопировать: ${w.name}`\" @click=\"copy(w)\">{{ copiedId === w.id ? 'Скопировано' : 'Копировать' }}</button>\n          </div>\n        </li>\n      </ul>\n      <p class=\"muted mt-3\">Перед переводом сверьте адрес или номер: переводы в криптовалютах необратимы. Спасибо за поддержку!</p>\n    </div>\n  </section>\n</template>\n"
 },
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
console.log('Страница: /support. Не забудьте заменить выдуманные реквизиты в pages/support.vue на свои.');
