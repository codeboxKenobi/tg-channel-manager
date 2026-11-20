#!/usr/bin/env node
// Убирает кнопку «👍 N» под постами: новые публикации уходят в канал без inline-кнопки.
// Запуск из корня проекта:  node remove-like-button.mjs [путь/к/проекту]
// Обработчик нажатий оставлен, чтобы кнопки под уже опубликованными постами продолжали работать.
// На странице «Опубликованные» счётчик 👍 показывается только у постов, где лайки есть (у старых).
// Всё или ничего; повторный запуск безопасен; копии изменяемых файлов: *.bak-nolike.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);

const EDITS = {
  'server/express/bot.js': [
    [
      "  const keyboard = likeKeyboard(post.id, post.likes_count || 0);\n",
      "  const keyboard = {}; // без кнопки «👍»: у новых постов нет inline-клавиатуры\n",
    ],
    [
      "  form.append('reply_markup', JSON.stringify(reply_markup));\n",
      "  if (reply_markup) form.append('reply_markup', JSON.stringify(reply_markup));\n",
    ],
  ],
  'pages/published.vue': [
    [
      `<span class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>`,
      `<span v-if="p.likes_count > 0" class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>`,
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
    if (count(text, to) >= 1) return;
    const n = count(text, from);
    if (n !== 1) { problems.push(`${file}: правка №${i + 1}: якорь найден ${n} раз(а), ожидался 1:\n    ${from.trim().slice(0, 110)}`); return; }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text] of plan) {
  const bak = p(file + '.bak-nolike');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение.');
