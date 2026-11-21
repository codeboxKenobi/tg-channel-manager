#!/usr/bin/env node
// «Метрики»: графики приводятся к одному виду.
// Что было не так: у графика подписчиков масштаб от минимума, у остальных от нуля, а шкалы нигде не было, поэтому столбики
// были несопоставимы; число в шапке у одних сумма, у другого текущее значение без пояснения; при отсутствии данных карточка
// была ниже соседних; число в шапке стояло не на одной линии с заголовком; дни с нулём выглядели как данные.
// Что стало: у каждого графика слева шкала (макс. и мин. значения, у подписчиков видно, что масштаб от минимума), подпись
// у числа («за 30 дней» / «сейчас»), одинаковая высота и ширина колонок, в том числе в пустом состоянии и при загрузке,
// нулевые дни рисуются тонкой серой линией.
//
// Запуск из корня проекта:  node fix-metrics-charts.mjs [путь/к/проекту]
// Заменяет components/BarChart.vue и SkeletonChart.vue целиком (если они не менялись вручную), правит main.css, metrics.vue, переводы.
// Всё или ничего; повторный запуск безопасен; копии: *.bak-charts.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);
const dec = (s) => Buffer.from(s, 'base64').toString('utf8');

// Файл заменяется целиком, только если в нём есть все «старые» признаки (и ещё нет новых)
const REPLACE = {
  'components/BarChart.vue': { old: ['const height = (v: number)', 'class="bars"'], mark: 'chart-head', text: dec('PHNjcmlwdCBzZXR1cCBsYW5nPSJ0cyI+CmNvbnN0IHByb3BzID0gZGVmaW5lUHJvcHM8ewogIHRpdGxlOiBzdHJpbmcKICBpdGVtczogeyBsYWJlbDogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH1bXQogIHN1bW1hcnk/OiBzdHJpbmcgLy8g0LfQvdCw0YfQtdC90LjQtSDQsiDRiNCw0L/QutC1INCz0YDQsNGE0LjQutCwICjRgdGD0LzQvNCwINC40LvQuCDRgtC10LrRg9GJ0LXQtSDRh9C40YHQu9C+KQogIHN1bW1hcnlMYWJlbD86IHN0cmluZyAvLyDQv9C+0LTQv9C40YHRjCDQuiDQvdC10LzRgzogwqvQt9CwIDMwINC00L3QtdC5wrssIMKr0YHQtdC50YfQsNGBwrsKICBmcm9tTWluPzogYm9vbGVhbiAvLyDQvNCw0YHRiNGC0LDQsSDQvtGCINC80LjQvdC40LzRg9C80LAg4oCUINC00LvRjyDQstC10LvQuNGH0LjQvSDQstGA0L7QtNC1INGH0LjRgdC70LAg0L/QvtC00L/QuNGB0YfQuNC60L7Qsgp9PigpCgpjb25zdCB7IHQsIGludGxMb2NhbGUgfSA9IHVzZUxvY2FsZSgpCmNvbnN0IHZhbHVlcyA9IGNvbXB1dGVkKCgpID0+IHByb3BzLml0ZW1zLm1hcCgoaSkgPT4gaS52YWx1ZSkpCmNvbnN0IGxvID0gY29tcHV0ZWQoKCkgPT4gKHByb3BzLmZyb21NaW4gJiYgdmFsdWVzLnZhbHVlLmxlbmd0aCA/IE1hdGgubWluKC4uLnZhbHVlcy52YWx1ZSkgOiAwKSkKY29uc3QgaGkgPSBjb21wdXRlZCgoKSA9PiAodmFsdWVzLnZhbHVlLmxlbmd0aCA/IE1hdGgubWF4KC4uLnZhbHVlcy52YWx1ZSkgOiAwKSkKY29uc3Qgc3BhbiA9IGNvbXB1dGVkKCgpID0+IE1hdGgubWF4KDEsIGhpLnZhbHVlIC0gbG8udmFsdWUpKQpjb25zdCBoZWlnaHQgPSAodjogbnVtYmVyKSA9PiAoKHYgLSBsby52YWx1ZSkgLyBzcGFuLnZhbHVlKSAqIDEwMCArICclJwovLyDQv9C+0LTQv9C40YHQuCDRiNC60LDQu9GLINC60L7RgNC+0YLQutC40LUgKDEySyksINGH0YLQvtCx0Ysg0LrQvtC70L7QvdC60LAg0YjQutCw0LvRiyDQsdGL0LvQsCDQvtC00L3QvtC5INGI0LjRgNC40L3RiyDRgyDQstGB0LXRhSDQs9GA0LDRhNC40LrQvtCyCmNvbnN0IHNob3J0ID0gKG46IG51bWJlcikgPT4gbmV3IEludGwuTnVtYmVyRm9ybWF0KGludGxMb2NhbGUudmFsdWUsIHsgbm90YXRpb246ICdjb21wYWN0JywgbWF4aW11bUZyYWN0aW9uRGlnaXRzOiAxIH0pLmZvcm1hdChuKQo8L3NjcmlwdD4KCjx0ZW1wbGF0ZT4KICA8ZGl2IGNsYXNzPSJjYXJkIGNoYXJ0Ij4KICAgIDxkaXYgY2xhc3M9ImNoYXJ0LWhlYWQiPgogICAgICA8aDMgOnRpdGxlPSJ0aXRsZSI+e3sgdGl0bGUgfX08L2gzPgogICAgICA8ZGl2IHYtaWY9InN1bW1hcnkiIGNsYXNzPSJjaGFydC1zdW0iPjxiPnt7IHN1bW1hcnkgfX08L2I+PHNtYWxsIHYtaWY9InN1bW1hcnlMYWJlbCI+e3sgc3VtbWFyeUxhYmVsIH19PC9zbWFsbD48L2Rpdj4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0icGxvdC1ncmlkIj4KICAgICAgPGRpdiBjbGFzcz0ieWF4aXMiIGFyaWEtaGlkZGVuPSJ0cnVlIj48c3Bhbj57eyBpdGVtcy5sZW5ndGggPyBzaG9ydChoaSkgOiAnJyB9fTwvc3Bhbj48c3Bhbj57eyBpdGVtcy5sZW5ndGggPyBzaG9ydChsbykgOiAnJyB9fTwvc3Bhbj48L2Rpdj4KICAgICAgPGRpdiB2LWlmPSJpdGVtcy5sZW5ndGgiIGNsYXNzPSJiYXJzIj4KICAgICAgICA8ZGl2IHYtZm9yPSJpIGluIGl0ZW1zIiA6a2V5PSJpLmxhYmVsIiBjbGFzcz0iYmFyIiA6dGl0bGU9ImAke2kubGFiZWx9OiAke2kudmFsdWV9YCI+CiAgICAgICAgICA8c3BhbiA6Y2xhc3M9InsgemVybzogaS52YWx1ZSA9PT0gMCB9IiA6c3R5bGU9InsgaGVpZ2h0OiBoZWlnaHQoaS52YWx1ZSkgfSIgLz4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxwIHYtZWxzZSBjbGFzcz0ibXV0ZWQgZW1wdHkiPnt7IHQoJ2NoYXJ0LmVtcHR5JykgfX08L3A+CiAgICAgIDxzcGFuIC8+CiAgICAgIDxkaXYgY2xhc3M9ImF4aXMiPgogICAgICAgIDxzcGFuPnt7IGl0ZW1zLmxlbmd0aCA/IGl0ZW1zWzBdLmxhYmVsIDogJycgfX08L3NwYW4+CiAgICAgICAgPHNwYW4+e3sgaXRlbXMubGVuZ3RoID8gaXRlbXNbaXRlbXMubGVuZ3RoIC0gMV0ubGFiZWwgOiAnJyB9fTwvc3Bhbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC90ZW1wbGF0ZT4K') },
  'components/SkeletonChart.vue': { old: ['class="card chart"', '<Skeleton height="120px" />'], mark: 'chart-head', text: dec('PHNjcmlwdCBzZXR1cCBsYW5nPSJ0cyI+Ci8vINCX0LDQs9C70YPRiNC60LAg0LrQsNGA0YLQvtGH0LrQuCDRgSDQs9GA0LDRhNC40LrQvtC8IOKAlCDQv9C+INGA0LDQt9C80LXRgNGDINGB0L7QstC/0LDQtNCw0LXRgiDRgSBCYXJDaGFydCAo0YjQsNC/0LrQsCwg0YjQutCw0LvQsCArINGB0YLQvtC70LHQuNC60LgsINC/0L7QtNC/0LjRgdC4INC+0YHQuCkuCjwvc2NyaXB0PgoKPHRlbXBsYXRlPgogIDxkaXYgY2xhc3M9ImNhcmQgY2hhcnQiIGFyaWEtaGlkZGVuPSJ0cnVlIj4KICAgIDxkaXYgY2xhc3M9ImNoYXJ0LWhlYWQiPgogICAgICA8U2tlbGV0b24gd2lkdGg9IjQ1JSIgaGVpZ2h0PSIxOHB4IiAvPgogICAgICA8U2tlbGV0b24gd2lkdGg9IjY0cHgiIGhlaWdodD0iMThweCIgLz4KICAgIDwvZGl2PgogICAgPGRpdiBjbGFzcz0icGxvdC1ncmlkIj4KICAgICAgPFNrZWxldG9uIHdpZHRoPSI0MHB4IiBoZWlnaHQ9IjEyMHB4IiAvPgogICAgICA8U2tlbGV0b24gaGVpZ2h0PSIxMjBweCIgLz4KICAgICAgPHNwYW4gLz4KICAgICAgPGRpdiBjbGFzcz0iYXhpcyI+CiAgICAgICAgPFNrZWxldG9uIHdpZHRoPSIzNnB4IiBoZWlnaHQ9IjEycHgiIC8+CiAgICAgICAgPFNrZWxldG9uIHdpZHRoPSIzNnB4IiBoZWlnaHQ9IjEycHgiIC8+CiAgICAgIDwvZGl2PgogICAgPC9kaXY+CiAgPC9kaXY+CjwvdGVtcGxhdGU+Cg==') },
};

const EDITS = {
  'assets/main.css': [
    [
      '.axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: var(--s-2); }\n',
      `.axis { display: flex; justify-content: space-between; font-size: 12px; line-height: 16px; min-height: 16px; color: var(--muted); }
.chart-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-3); min-height: 24px; margin-bottom: var(--s-3); }
.chart-head h3 { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-head .sk { flex: none; }
.chart-sum { display: flex; align-items: baseline; gap: var(--s-1); flex: none; white-space: nowrap; }
.chart-sum small { color: var(--muted); font-size: 12px; }
.plot-grid { display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: var(--s-2); row-gap: var(--s-2); }
.yaxis { display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; height: 120px; font-size: 11px; line-height: 1; color: var(--muted); }
.plot-grid .bars { border-bottom: 1px solid var(--line); }
.plot-grid .empty { display: flex; align-items: center; justify-content: center; height: 120px; margin: 0; border-bottom: 1px solid var(--line); }
.bar span.zero { background: var(--line); }
`,
    ],
  ],
  'pages/metrics.vue': [
    [
      `<BarChart :title="t('metrics.chartPosts')" :items="postsSeries" :summary="postsTotal" />`,
      `<BarChart :title="t('metrics.chartPosts')" :items="postsSeries" :summary="postsTotal" :summary-label="t('chart.total')" />`,
    ],
    [
      `<BarChart :title="t('metrics.chartLikes')" :items="likesSeries" :summary="likesTotal" />`,
      `<BarChart :title="t('metrics.chartLikes')" :items="likesSeries" :summary="likesTotal" :summary-label="t('chart.total')" />`,
    ],
    [
      `<BarChart :title="t('metrics.chartSubs')" :items="subsSeries" :summary="subsLast" from-min />`,
      `<BarChart :title="t('metrics.chartSubs')" :items="subsSeries" :summary="subsLast" :summary-label="t('chart.now')" from-min />`,
    ],
  ],
  'locales/ru.ts': [
    ["  'chart.empty': 'Данных пока нет',\n", "  'chart.empty': 'Данных пока нет',\n  'chart.total': 'за 30 дней',\n  'chart.now': 'сейчас',\n"],
    // короткое название, чтобы заголовок не переносился и столбики во всех карточках стояли на одном уровне
    [["  'metrics.chartLikes': 'Реакции на посты (по дню публикации)',\n", "  'metrics.chartLikes': 'Лайки по дням',\n"], "  'metrics.chartLikes': 'Реакции на посты',\n"],
  ],
  'locales/en.ts': [
    ["  'chart.empty': 'No data yet',\n", "  'chart.empty': 'No data yet',\n  'chart.total': 'last 30 days',\n  'chart.now': 'now',\n"],
    [["  'metrics.chartLikes': 'Post reactions (by publication day)',\n", "  'metrics.chartLikes': 'Likes per day',\n"], "  'metrics.chartLikes': 'Post reactions',\n"],
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const problems = [];
for (const [file, r] of Object.entries(REPLACE)) {
  if (!fs.existsSync(p(file))) { problems.push(`${file}: файл не найден`); continue; }
  const cur = fs.readFileSync(p(file), 'utf8');
  if (cur === r.text || cur.includes(r.mark)) continue; // уже применено
  if (!r.old.every((s) => cur.includes(s))) { problems.push(`${file}: файл изменён вручную и не похож на ожидаемый, заменять его целиком небезопасно`); continue; }
  plan.push([file, r.text]);
}
for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(p(file))) { problems.push(`${file}: файл не найден`); continue; }
  let text = fs.readFileSync(p(file), 'utf8');
  let changed = false;
  edits.forEach(([fromAny, to], i) => {
    if (count(text, to) >= 1) return;
    const from = [].concat(fromAny).find((f) => count(text, f) === 1);
    if (from === undefined) { problems.push(`${file}: правка №${i + 1}: якорь не найден (или найден несколько раз):\n    ${[].concat(fromAny)[0].trim().split('\n')[0].slice(0, 110)}`); return; }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text] of plan) {
  const bak = p(file + '.bak-charts');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение (в dev достаточно обновить страницу).');
