#!/usr/bin/env node
// «Подготовка постов» → «Новый пост»: можно выбрать несколько каналов и создать пост сразу для всех.
// Для каждого выбранного канала создаётся отдельный пост (свой статус, время, лайки и ошибки публикации); вложение у них общее.
// Если каналов несколько, в форме вместо выпадающего списка появляется список чекбоксов с «Выбрать все».
// Редактирование существующего поста по-прежнему работает с одним каналом.
//
// Запуск из корня проекта:  node add-multi-channel-posts.mjs [путь/к/проекту]
// Всё или ничего; повторный запуск безопасен; копии изменяемых файлов: *.bak-multi. Схема БД и зависимости не меняются.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);

const EDITS = {
  'server/express/routes/posts.js': [
    [
      "r.post('/', async (req, res) => {\n",
      `r.post('/', async (req, res) => {
  // несколько каналов: на каждый создаётся свой пост (у каждого свой статус, лайки и результат публикации)
  if (Array.isArray(req.body?.channel_ids)) {
    const ids = [...new Set(req.body.channel_ids.map(Number))];
    if (!ids.length || ids.length > 50 || ids.some((n) => !Number.isInteger(n))) throw httpError('Выберите канал');
    const p = parse({ ...req.body, channel_id: ids[0] });
    for (const id of ids) await assertChannelAccess(req.user, id); // доступ проверяется ко всем каналам до создания первого поста
    const created = [];
    for (const id of ids) {
      const { rows: [row] } = await q(
        \`insert into posts (channel_id, title, content, media_url, media_name, parse_mode, scheduled_at, status, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *\`,
        [id, p.title, p.content, p.media_url, p.media_name, p.parse_mode, p.scheduled_at, p.status, req.user.id],
      );
      created.push(row);
    }
    return res.status(201).json(created);
  }
`,
    ],
  ],

  'components/PostForm.vue': [
    [
      "  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,\n",
      "  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,\n  channel_ids: (props.channels[0] ? [props.channels[0].id] : []) as number[], // для нового поста: несколько каналов\n",
    ],
    [
      "const limit = computed(() => (form.media_url ? 1024 : 4096))\n",
      `const limit = computed(() => (form.media_url ? 1024 : 4096))
// выбор нескольких каналов — только при создании и если каналов больше одного
const multi = computed(() => !props.post && props.channels.length > 1)
const allChannels = computed(() => form.channel_ids.length === props.channels.length)
const toggleAllChannels = () => (form.channel_ids = allChannels.value ? [] : props.channels.map((c) => c.id))
`,
    ],
    [
      "    channel_id: form.channel_id,\n",
      "    channel_id: multi.value ? form.channel_ids[0] : form.channel_id,\n    ...(multi.value ? { channel_ids: form.channel_ids } : {}),\n",
    ],
    [
      `    <label>{{ t('common.channel') }}</label>
    <select v-model="form.channel_id" required>
      <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
    </select>
`,
      `    <template v-if="multi">
      <label>{{ t('post.channelsLabel', { n: form.channel_ids.length }) }}</label>
      <label class="opt all"><input type="checkbox" :checked="allChannels" @change="toggleAllChannels" /><span>{{ t('common.selectAll') }}</span></label>
      <label v-for="c in channels" :key="c.id" class="opt"><input v-model="form.channel_ids" type="checkbox" :value="c.id" /><span>{{ c.title }}</span></label>
      <p v-if="!form.channel_ids.length" class="error mt-2">{{ t('post.err.noChannel') }}</p>
    </template>
    <template v-else>
      <label>{{ t('common.channel') }}</label>
      <select v-model="form.channel_id" required>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </template>
`,
    ],
    [
      `<button class="primary" type="submit" :disabled="uploading">`,
      `<button class="primary" type="submit" :disabled="uploading || (multi && !form.channel_ids.length)">`,
    ],
  ],

  'locales/ru.ts': [
    [
      "  'post.new': 'Новый пост',\n",
      "  'post.new': 'Новый пост',\n  'post.channelsLabel': 'Каналы для публикации (выбрано: {n})',\n  'post.err.noChannel': 'Выберите хотя бы один канал',\n",
    ],
  ],
  'locales/en.ts': [
    [
      "  'post.new': 'New post',\n",
      "  'post.new': 'New post',\n  'post.channelsLabel': 'Channels to publish to ({n} selected)',\n  'post.err.noChannel': 'Select at least one channel',\n",
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
  const bak = p(file + '.bak-multi');
  if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  fs.writeFileSync(p(file), text);
  console.log('изменён: ' + file);
}
console.log('\nГотово. Перезапустите приложение.');
