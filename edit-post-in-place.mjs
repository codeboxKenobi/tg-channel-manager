#!/usr/bin/env node
// «Подготовка постов»: редактирование поста происходит на его месте в списке.
// Раньше форма открывалась сверху, а сам пост оставался ниже и выглядел как дубликат. Теперь карточка поста
// заменяется формой редактирования, а «Новый пост» по-прежнему открывается сверху.
//
// Запуск из корня проекта:  node edit-post-in-place.mjs [путь/к/проекту]
// Всё или ничего; повторный запуск безопасен; копия pages/drafts.vue: *.bak-inplace.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);

const EDITS = {
  'pages/drafts.vue': [
    [
      `    <div v-if="creating || editing" class="card">
      <PostForm :key="editing?.id ?? 'new'" :channels="channels" :post="editing" @save="save" @cancel="closeForm" />
    </div>
`,
      `    <div v-if="creating" class="card">
      <PostForm key="new" :channels="channels" :post="null" @save="save" @cancel="closeForm" />
    </div>
`,
    ],
    [
      `    <article v-for="p in posts" :key="p.id" class="card">\n`,
      `    <template v-for="p in posts" :key="p.id">
    <div v-if="editing?.id === p.id" class="card">
      <PostForm :key="p.id" :channels="channels" :post="editing" @save="save" @cancel="closeForm" />
    </div>
    <article v-else class="card">\n`,
    ],
    [
      `    </article>\n  </section>\n</template>`,
      `    </article>\n    </template>\n  </section>\n</template>`,
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
    if (n !== 1) { problems.push(`${file}: правка №${i + 1}: якорь найден ${n} раз(а), ожидался 1:\n    ${from.trim().split('\n')[0].slice(0, 110)}`); return; }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text] of plan) {
  const bak = p(file + '.bak-inplace');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение.');
