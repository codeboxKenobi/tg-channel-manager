#!/usr/bin/env bash
# Единые отступы + skeleton-загрузка на всех страницах tg-channel-manager.
# Запуск из корня проекта:  bash apply-ui-polish.sh
# Старые версии изменённых файлов копируются в .ui-polish-backup/
set -euo pipefail

if [ ! -f nuxt.config.ts ] || [ ! -d pages ] || [ ! -f assets/main.css ]; then
  echo "Запустите скрипт из корня проекта (там, где nuxt.config.ts)" >&2
  exit 1
fi

BACKUP=.ui-polish-backup
mkdir -p "$BACKUP"

write() { # write <path>: содержимое берётся из stdin
  local path="$1" tmp
  tmp="$(mktemp)"
  cat > "$tmp"
  if [ -f "$path" ] && cmp -s "$tmp" "$path"; then
    rm -f "$tmp"
    echo "  без изменений: $path"
    return
  fi
  if [ -f "$path" ] && [ ! -f "$BACKUP/$path" ]; then
    mkdir -p "$BACKUP/$(dirname "$path")"
    cp "$path" "$BACKUP/$path"
  fi
  mkdir -p "$(dirname "$path")"
  mv "$tmp" "$path"
  chmod 644 "$path"
  echo "  обновлён: $path"
}

write assets/main.css <<'UI_POLISH_EOF'
:root {
  color-scheme: light dark;
  --bg: #f2f5f7; --card: #ffffff; --text: #17252e; --muted: #64757f; --line: #dde4e8;
  --accent: #0a7d8c; --ok: #1a8a4a; --warn: #b7791f; --bad: #c0392b;

  /* отступы: единая шкала, все значения ниже берутся отсюда */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;
  --gutter: 24px;   /* боковой отступ страницы и шапки */
  --page: 1040px;   /* максимальная ширина содержимого */
  --header-h: 56px;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0e1a20; --card: #15252d; --text: #e4edf1; --muted: #8aa0ab; --line: #24383f; --accent: #3cb8c7; --ok: #4cc27f; --warn: #e0a64a; --bad: #ef6f60; }
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 "Segoe UI", system-ui, -apple-system, sans-serif; }
img { max-width: 100%; }

/* ---------- шапка и меню ---------- */
/* боковой отступ шапки считается так, чтобы логотип стоял над левым краем содержимого и на широких экранах */
.top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--s-6); padding: 0 max(var(--gutter), calc((100% - var(--page)) / 2 + var(--gutter))); height: var(--header-h); background: var(--card); border-bottom: 1px solid var(--line); }
.brand { font-weight: 700; font-size: 17px; white-space: nowrap; }
.menu { display: flex; align-items: center; gap: var(--s-3); flex: 1; min-width: 0; }
.menu nav { display: flex; gap: var(--s-1); }
.menu nav a { padding: var(--s-2) var(--s-3); border-radius: 8px; color: var(--muted); text-decoration: none; white-space: nowrap; }
.menu nav a.router-link-exact-active { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-weight: 600; }
.menu .sp { flex: 1; }
.menu .who { color: var(--muted); text-decoration: none; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.menu .who:hover { color: var(--accent); }
.burger { display: none; width: 40px; height: 40px; padding: 0; align-items: center; justify-content: center; }
.burger svg { width: 20px; height: 20px; }
.backdrop { display: none; }

/* ---------- основа ---------- */
main { max-width: var(--page); margin: var(--s-5) auto; padding: 0 var(--gutter) var(--s-7); }
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 17px; margin: var(--s-5) 0 var(--s-3); }
h3 { font-size: 14px; margin: 0 0 var(--s-3); color: var(--muted); font-weight: 600; }
h2:first-child, h3:first-child { margin-top: 0; }
/* абзацы: 12px снизу; внутри карточки отступ между строками задают классы .mt-* */
p { margin: 0 0 var(--s-3); }
p:last-child { margin-bottom: 0; }
:where(.card) p { margin-bottom: 0; }
.row { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; }
.between { justify-content: space-between; }
.head { margin-bottom: var(--s-4); min-height: 42px; } /* одинаковая высота шапки страницы с фильтром и без него: заголовок не «прыгает» */
.filter { width: 210px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: var(--s-4); margin-bottom: var(--s-3); }
.grid { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); margin-bottom: var(--s-3); }
.grid .card { margin: 0; }
.stat b { display: block; font-size: 26px; line-height: 1.2; }
.stat span { color: var(--muted); font-size: 13px; }

input, select, textarea { width: 100%; padding: var(--s-2) var(--s-3); border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: inherit; font: inherit; }
textarea { min-height: 150px; resize: vertical; }
input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
label { display: block; font-size: 13px; color: var(--muted); margin: var(--s-3) 0 var(--s-1); }
button { padding: var(--s-2) var(--s-4); border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: inherit; cursor: pointer; font: inherit; }
button:hover:not(:disabled) { border-color: var(--accent); }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.danger { color: var(--bad); }
button:disabled { opacity: .5; cursor: default; }

.badge { padding: 2px 10px; border-radius: 99px; font-size: 12px; background: var(--line); color: var(--muted); white-space: nowrap; }
.badge.scheduled { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
.badge.published { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }
.badge.failed { background: color-mix(in srgb, var(--bad) 18%, transparent); color: var(--bad); }
.badge.publishing { background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); }
.muted { color: var(--muted); }
.warn { color: var(--warn); }
.error { color: var(--bad); margin: 0 0 var(--s-3); }
.pos { color: var(--ok); }
.post-content { white-space: pre-wrap; overflow-wrap: anywhere; margin: var(--s-2) 0; }
.thumb { display: block; max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid var(--line); margin: var(--s-2) 0; }
.actions { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: var(--s-3); }
.auth-card { max-width: 380px; margin: var(--s-8) auto; }
.auth-card h1 { margin-bottom: var(--s-3); }

/* вспомогательные отступы (идут после .error и т.п., чтобы переопределять их) */
.mt-1 { margin-top: var(--s-1); }
.mt-2 { margin-top: var(--s-2); }
.mt-3 { margin-top: var(--s-3); }
.mb-3 { margin-bottom: var(--s-3); }
.ml-2 { margin-left: var(--s-2); }

/* ---------- таблицы ---------- */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: var(--s-3) var(--s-2); border-bottom: 1px solid var(--line); white-space: nowrap; }
th { color: var(--muted); font-weight: 500; font-size: 13px; }
td.num, th.num { text-align: right; }
td .danger { margin-left: var(--s-2); }

/* ---------- графики ---------- */
.charts { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); }
.chart { margin: 0; }
.bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
.bar { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.bar span { display: block; width: 100%; min-height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }
.axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: var(--s-2); }

/* ---------- выбор даты и времени ---------- */
.dt { display: flex; gap: var(--s-2); align-items: center; flex-wrap: wrap; }
.dt input[type='date'] { flex: 1 1 170px; width: auto; min-width: 0; }
.dt-time { display: flex; align-items: center; gap: var(--s-2); }
.dt-time select { width: 78px; }
.chips { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: var(--s-2); }
button.chip { padding: var(--s-1) var(--s-3); border-radius: 99px; font-size: 13px; }
.dt-summary { margin: var(--s-2) 0 0; font-size: 13px; }

/* ---------- загрузка картинки ---------- */
.upload { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; margin-top: var(--s-2); }
label.filebtn { position: relative; display: inline-flex; align-items: center; margin: 0; padding: var(--s-2) var(--s-4); border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--text); font-size: 15px; cursor: pointer; }
label.filebtn:hover { border-color: var(--accent); }
label.filebtn:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }
label.filebtn.busy { opacity: .6; pointer-events: none; }
.filebtn input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.preview { display: block; max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid var(--line); margin-top: var(--s-3); }

/* ---------- закрепление каналов за пользователями ---------- */
input[type='checkbox'] { width: 18px; height: 18px; padding: 0; flex: none; accent-color: var(--accent); }
.picker { margin-top: var(--s-3); padding: var(--s-4); border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
.picker h3 { margin-bottom: var(--s-2); }
label.opt { display: flex; align-items: center; gap: var(--s-3); margin: 0; padding: var(--s-3) var(--s-1); font-size: 15px; color: var(--text); border-bottom: 1px solid var(--line); cursor: pointer; }
label.opt.all { color: var(--muted); }
.chips-inline { display: inline-flex; flex-wrap: wrap; gap: var(--s-2); vertical-align: middle; }
.tagchip { padding: 2px 10px; border-radius: 99px; font-size: 12px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
td.wrap { white-space: normal; min-width: 180px; }

/* отступ между кнопками в колонке действий */
td.actions-cell button + button { margin-left: var(--s-2); }

/* ---------- skeleton-загрузка ---------- */
.sk { display: block; border-radius: 6px; background: linear-gradient(90deg, var(--line) 0%, color-mix(in srgb, var(--line) 50%, var(--card)) 50%, var(--line) 100%); background-size: 200% 100%; animation: sk-shimmer 1.4s ease-in-out infinite; }
@keyframes sk-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
.sk-row { display: flex; gap: var(--s-4); padding: var(--s-3) var(--s-2); border-bottom: 1px solid var(--line); }
.sk-row:last-child { border-bottom: 0; }
.sk-cell { flex: 1; min-width: 0; }

/* ---------- планшеты и телефоны: меню-бургер ---------- */
@media (max-width: 980px) {
  :root { --gutter: 16px; }
  .top { gap: var(--s-3); justify-content: space-between; }
  .burger { display: inline-flex; }
  .menu { display: none; position: absolute; top: 100%; left: 0; right: 0; flex: none; flex-direction: column; align-items: stretch; gap: var(--s-1); padding: var(--s-2) var(--gutter) var(--s-4); background: var(--card); border-bottom: 1px solid var(--line); box-shadow: 0 12px 24px rgba(0, 0, 0, .14); max-height: calc(100dvh - var(--header-h)); overflow-y: auto; }
  .menu.open { display: flex; }
  .menu nav { flex-direction: column; }
  .menu nav a, .menu .who { display: flex; align-items: center; min-height: 44px; padding: var(--s-2) var(--s-3); max-width: none; }
  .menu .sp { display: none; }
  .menu button { min-height: 44px; margin-top: var(--s-2); }
  .backdrop { display: block; position: fixed; inset: var(--header-h) 0 0 0; background: rgba(0, 0, 0, .35); z-index: 4; }
}

/* ---------- телефоны ---------- */
@media (max-width: 640px) {
  main { margin: var(--s-4) auto; padding: 0 var(--gutter) var(--s-6); }
  h1 { font-size: 20px; }
  input, select, textarea { font-size: 16px; line-height: 1.5; } /* iOS не приближает страницу при фокусе */
  button { min-height: 42px; }
  button.chip { min-height: 34px; }

  .head { flex-direction: column; align-items: stretch; min-height: 0; }
  .head > .row { width: 100%; }
  .head .filter { width: 100%; flex: 1 1 100%; }
  .head .row > button { flex: 1 1 100%; }

  .actions > button, .actions > a, .actions > .sk { flex: 1 1 auto; }
  .actions > a { display: flex; }
  .actions > a button { width: 100%; }
  .auth-card { margin: var(--s-5) auto; }
  .dt-time { flex: 1 1 100%; }
  .dt-time select { flex: 1; width: auto; }
  .upload > * { flex: 1 1 auto; }
  label.filebtn { justify-content: center; }

  /* таблицы превращаются в список карточек */
  table.stack, table.stack tbody, table.stack tr, table.stack td { display: block; width: 100%; }
  table.stack thead { display: none; }
  table.stack tr { padding: var(--s-3) 0; border-bottom: 1px solid var(--line); }
  table.stack tr:last-child { border-bottom: 0; }
  table.stack td { display: flex; justify-content: space-between; align-items: center; gap: var(--s-4); padding: var(--s-1) 0; border: 0; white-space: normal; text-align: right; }
  table.stack td::before { content: attr(data-label); color: var(--muted); text-align: left; flex-shrink: 0; }
  table.stack td.actions-cell { justify-content: flex-end; flex-wrap: wrap; gap: var(--s-2); padding-top: var(--s-2); }
  table.stack td.actions-cell::before { display: none; }
  table.stack td .danger { margin-left: 0; }
  table.stack td select { max-width: 60%; }
  table.stack td.actions-cell button + button { margin-left: 0; }
}
UI_POLISH_EOF

write components/AccessPicker.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const props = defineProps<{
  title: string
  options: { id: number; label: string; hint?: string }[]
  selected: number[]
  empty: string
}>()
const emit = defineEmits<{ save: [ids: number[]]; cancel: [] }>()

const picked = ref<number[]>([...props.selected])
const all = computed(() => props.options.length > 0 && picked.value.length === props.options.length)
const toggleAll = () => (picked.value = all.value ? [] : props.options.map((o) => o.id))
</script>

<template>
  <div class="picker">
    <h3>{{ title }}</h3>
    <p v-if="!options.length" class="muted">{{ empty }}</p>
    <template v-else>
      <label class="opt all"><input type="checkbox" :checked="all" @change="toggleAll" /><span>Выбрать все</span></label>
      <label v-for="o in options" :key="o.id" class="opt">
        <input v-model="picked" type="checkbox" :value="o.id" />
        <span>{{ o.label }}<small v-if="o.hint" class="muted"> · {{ o.hint }}</small></span>
      </label>
    </template>
    <div class="actions">
      <button class="primary" type="button" :disabled="!options.length" @click="emit('save', picked)">Сохранить</button>
      <button type="button" @click="emit('cancel')">Отмена</button>
    </div>
  </div>
</template>
UI_POLISH_EOF

write components/PostForm.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const props = defineProps<{ channels: any[]; post?: any | null }>()
const emit = defineEmits<{ save: [payload: any]; cancel: [] }>()
const api = useApi()

const UPLOAD_PREFIX = '/api/uploads/'

const form = reactive({
  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,
  title: props.post?.title ?? '',
  content: props.post?.content ?? '',
  media_url: (props.post?.media_url ?? '') as string,
  parse_mode: props.post?.parse_mode ?? '',
  scheduled_at: (props.post?.scheduled_at ?? null) as string | null,
})

const isUploaded = computed(() => form.media_url.startsWith(UPLOAD_PREFIX))
const showPreview = computed(() => isUploaded.value || /^https?:\/\//i.test(form.media_url))
const limit = computed(() => (form.media_url ? 1024 : 4096))
const uploading = ref(false)
const uploadError = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // чтобы тот же файл можно было выбрать повторно
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const blob = await toJpeg(file)
    const { url } = await api<{ url: string }>('/uploads', {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    })
    form.media_url = url
  } catch (err: any) {
    uploadError.value = err.message
  } finally {
    uploading.value = false
  }
}

function submit() {
  emit('save', {
    channel_id: form.channel_id,
    title: form.title,
    content: form.content,
    media_url: form.media_url || null,
    parse_mode: form.parse_mode || null,
    scheduled_at: form.scheduled_at,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <h2>{{ post ? 'Редактирование поста' : 'Новый пост' }}</h2>

    <label>Канал</label>
    <select v-model="form.channel_id" required>
      <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
    </select>

    <label>Заголовок (виден только вам)</label>
    <input v-model="form.title" required maxlength="200" />

    <label>Текст поста ({{ form.content.length }} / {{ limit }})</label>
    <textarea v-model="form.content" required :maxlength="limit" />

    <div class="row" style="align-items: flex-start">
      <div style="flex: 2; min-width: 220px">
        <label>Ссылка на изображение (необязательно)</label>
        <input v-if="!isUploaded" v-model="form.media_url" type="url" placeholder="https://…" />
        <input v-else value="Загружено с устройства" readonly disabled />

        <div class="upload">
          <label class="filebtn" :class="{ busy: uploading }">
            {{ uploading ? 'Загрузка…' : 'Загрузить с устройства' }}
            <input type="file" accept="image/*" :disabled="uploading" @change="onFile" />
          </label>
          <button v-if="form.media_url" type="button" class="danger" @click="form.media_url = ''">Убрать картинку</button>
        </div>
        <p v-if="uploadError" class="error mt-2">{{ uploadError }}</p>
        <img v-if="showPreview" :key="form.media_url" :src="form.media_url" class="preview" alt="Предпросмотр картинки" />
      </div>
      <div style="flex: 1; min-width: 160px">
        <label>Форматирование</label>
        <select v-model="form.parse_mode">
          <option value="">Без форматирования</option>
          <option value="HTML">HTML</option>
          <option value="MarkdownV2">MarkdownV2</option>
        </select>
      </div>
    </div>

    <label>Время публикации (не выбрано — сохранить как черновик)</label>
    <DateTimePicker v-model="form.scheduled_at" />

    <div class="actions">
      <button class="primary" type="submit" :disabled="uploading">{{ form.scheduled_at ? 'Запланировать' : 'Сохранить черновик' }}</button>
      <button type="button" @click="emit('cancel')">Отмена</button>
    </div>
  </form>
</template>
UI_POLISH_EOF

write components/Skeleton.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
// Базовый «скелет»: серый блок с мерцанием. Размеры — любые CSS-значения.
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: '16px',
  radius: undefined,
})
</script>

<template>
  <span class="sk" :style="{ width, height, borderRadius: radius }" aria-hidden="true" />
</template>
UI_POLISH_EOF

write components/SkeletonCards.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
// Заглушка списка карточек (каналы, посты) на время загрузки.
withDefaults(defineProps<{ count?: number; actions?: number }>(), { count: 3, actions: 2 })
</script>

<template>
  <div aria-hidden="true">
    <article v-for="n in count" :key="n" class="card">
      <div class="row between">
        <Skeleton width="42%" height="20px" />
        <Skeleton width="84px" height="22px" radius="99px" />
      </div>
      <Skeleton class="mt-2" width="92%" height="14px" />
      <Skeleton class="mt-2" width="68%" height="14px" />
      <div class="actions">
        <Skeleton v-for="a in actions" :key="a" width="116px" height="41px" radius="8px" />
      </div>
    </article>
  </div>
</template>
UI_POLISH_EOF

write components/SkeletonChart.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
// Заглушка карточки с графиком — по размеру совпадает с BarChart.
</script>

<template>
  <div class="card chart" aria-hidden="true">
    <Skeleton class="mb-3" width="55%" height="18px" />
    <Skeleton height="120px" />
    <div class="axis">
      <Skeleton width="36px" height="12px" />
      <Skeleton width="36px" height="12px" />
    </div>
  </div>
</template>
UI_POLISH_EOF

write components/SkeletonTable.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
// Заглушка таблицы в карточке: строки с «ячейками» разной ширины.
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 4, cols: 4 })
const widths = ['70%', '90%', '55%', '80%', '65%', '75%']
</script>

<template>
  <div class="card" aria-hidden="true">
    <div v-for="r in rows" :key="r" class="sk-row">
      <div v-for="c in cols" :key="c" class="sk-cell">
        <Skeleton :width="widths[(r + c) % widths.length]" height="16px" />
      </div>
    </div>
  </div>
</template>
UI_POLISH_EOF

write pages/account.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const { user } = useAuth()
const current = ref('')
const next = ref('')
const done = ref('')
const error = ref('')

async function change() {
  error.value = ''
  done.value = ''
  try {
    await api('/auth/password', { method: 'POST', body: { current: current.value, next: next.value } })
    current.value = ''
    next.value = ''
    done.value = 'Пароль изменён. На других устройствах потребуется войти заново.'
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <section>
    <div class="row head"><h1>Профиль</h1></div>
    <form class="card" style="max-width: 420px" @submit.prevent="change">
      <p class="mb-3">
        <strong>{{ user?.name }}</strong><br />
        <span class="muted">{{ user?.email }} · {{ user?.role === 'admin' ? 'администратор' : 'редактор' }}</span>
      </p>
      <h3>Смена пароля</h3>
      <label>Текущий пароль</label>
      <input v-model="current" type="password" required autocomplete="current-password" />
      <label>Новый пароль (не короче 8 символов)</label>
      <input v-model="next" type="password" required minlength="8" autocomplete="new-password" />
      <p v-if="error" class="error mt-3">{{ error }}</p>
      <p v-if="done" class="pos mt-3">{{ done }}</p>
      <div class="actions"><button class="primary">Сменить пароль</button></div>
    </form>
  </section>
</template>
UI_POLISH_EOF

write pages/drafts.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()
const channels = ref<any[]>([])
const posts = ref<any[]>([])
const channelId = ref<number | ''>('')
const editing = ref<any | null>(null)
const creating = ref(false)
const error = ref('')
const busy = ref(false)
const loading = ref(true)

const STATUS: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'В графике',
  publishing: 'Публикуется',
  failed: 'Ошибка публикации',
}

async function load() {
  try {
    channels.value = await api('/channels')
    posts.value = await api('/posts', {
      query: { status: 'draft,scheduled,publishing,failed', channel_id: channelId.value || undefined },
    })
  } finally {
    loading.value = false
  }
}
async function run(fn: () => Promise<any>) {
  error.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e: any) {
    error.value = e.message
  } finally {
    await load().catch(() => {})
    busy.value = false
  }
}

const save = (payload: any) =>
  run(async () => {
    if (editing.value) await api(`/posts/${editing.value.id}`, { method: 'PUT', body: payload })
    else await api('/posts', { method: 'POST', body: payload })
    editing.value = null
    creating.value = false
  })
const publishNow = (p: any) =>
  confirm(`Опубликовать «${p.title}» в канале «${p.channel_title}» прямо сейчас?`) &&
  run(() => api(`/posts/${p.id}/publish`, { method: 'POST' }))
const unschedule = (p: any) =>
  run(() => api(`/posts/${p.id}`, { method: 'PUT', body: { ...p, scheduled_at: null } }))
const remove = (p: any) =>
  confirm(`Удалить пост «${p.title}»?`) && run(() => api(`/posts/${p.id}`, { method: 'DELETE' }))

function startEdit(p: any) {
  creating.value = false
  editing.value = p
}
function startCreate() {
  editing.value = null
  creating.value = true
}
function closeForm() {
  editing.value = null
  creating.value = false
}

// список обновляется сам: запланированные посты уходят в «Опубликованные»
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  run(async () => {})
  timer = setInterval(() => load().catch(() => {}), 30000)
})
onBeforeUnmount(() => clearInterval(timer))
watch(channelId, () => {
  loading.value = true
  posts.value = []
  load().catch((e) => (error.value = e.message))
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>Подготовка постов</h1>
      <div class="row">
        <select v-model="channelId" class="filter">
          <option value="">Все каналы</option>
          <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
        </select>
        <button class="primary" :disabled="!channels.length" @click="startCreate">Новый пост</button>
      </div>
    </div>

    <p v-if="!loading && !channels.length" class="muted">{{ isAdmin ? 'Сначала подключите канал на странице «Каналы».' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="creating || editing" class="card">
      <PostForm :key="editing?.id ?? 'new'" :channels="channels" :post="editing" @save="save" @cancel="closeForm" />
    </div>

    <p v-if="!loading && channels.length && !posts.length" class="muted">Постов в подготовке нет. Создайте новый.</p>

    <SkeletonCards v-if="loading" :count="3" :actions="4" />

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.title }}</strong>
          <span class="muted"> · {{ p.channel_title }}</span>
        </div>
        <span class="badge" :class="p.status">{{ STATUS[p.status] }}</span>
      </div>
      <p class="post-content">{{ p.content }}</p>
      <img v-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      <p v-if="p.scheduled_at" class="muted mt-2">Публикация: {{ fmtDate(p.scheduled_at) }}</p>
      <p v-if="p.author_name" class="muted mt-2">Автор: {{ p.author_name }}</p>
      <p v-if="p.error" class="error mt-2">{{ p.error }}</p>
      <div class="actions">
        <button :disabled="busy || p.status === 'publishing'" @click="startEdit(p)">Редактировать</button>
        <button class="primary" :disabled="busy || p.status === 'publishing'" @click="publishNow(p)">Опубликовать сейчас</button>
        <button v-if="p.status === 'scheduled'" :disabled="busy" @click="unschedule(p)">Убрать из графика</button>
        <button class="danger" :disabled="busy || p.status === 'publishing'" @click="remove(p)">Удалить</button>
      </div>
    </article>
  </section>
</template>
UI_POLISH_EOF

write pages/index.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const { isAdmin } = useAuth()
const channels = ref<any[]>([])
const editors = ref<any[]>([])
const chat = ref('')
const title = ref('')
const error = ref('')
const busy = ref(false)
const accessFor = ref<number | null>(null)
const loading = ref(true)

async function load() {
  try {
    channels.value = await api('/channels')
    if (isAdmin.value) editors.value = (await api<any[]>('/users')).filter((u) => u.role === 'editor')
  } finally {
    loading.value = false
  }
}
async function run(fn: () => Promise<any>) {
  error.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e: any) {
    error.value = e.message
  } finally {
    await load().catch(() => {})
    busy.value = false
  }
}

const add = () =>
  run(async () => {
    await api('/channels', { method: 'POST', body: { chat: chat.value.trim(), title: title.value.trim() } })
    chat.value = ''
    title.value = ''
  })
const toggle = (c: any) =>
  run(() => api(`/channels/${c.id}`, { method: 'PUT', body: { title: c.title, description: c.description, is_active: !c.is_active } }))
const refresh = (c: any) => run(() => api(`/channels/${c.id}/refresh`, { method: 'POST' }))
const remove = (c: any) =>
  confirm(`Удалить канал «${c.title}» вместе со всеми его постами?`) ? run(() => api(`/channels/${c.id}`, { method: 'DELETE' })) : undefined

const editorOptions = computed(() => editors.value.map((u) => ({ id: u.id, label: u.name, hint: u.email })))
const assignedIds = (c: any): number[] => (c.assigned_users ?? []).map((u: any) => u.id)
const saveAccess = (c: any, ids: number[]) =>
  run(async () => {
    await api(`/channels/${c.id}/users`, { method: 'PUT', body: { user_ids: ids } })
    accessFor.value = null
  })

onMounted(() => run(async () => {}))
</script>

<template>
  <section :aria-busy="loading">
    <div class="row head"><h1>Каналы</h1></div>

    <form v-if="isAdmin" class="card" @submit.prevent="add">
      <h3>Подключить канал</h3>
      <p class="muted mb-3">
        Добавьте бота администратором канала с правом публикации, затем укажите @username или числовой id канала.
      </p>
      <div class="row">
        <input v-model="chat" required placeholder="@my_channel или -1001234567890" style="flex: 2; min-width: 220px" />
        <input v-model="title" placeholder="Название (если бот не подключён к API)" style="flex: 2; min-width: 220px" />
        <button class="primary" :disabled="busy">Подключить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!loading && !channels.length" class="muted">
      {{ isAdmin ? 'Каналов пока нет. Подключите первый выше.' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}
    </p>

    <SkeletonCards v-if="loading" :count="3" :actions="isAdmin ? 4 : 1" />

    <article v-for="c in channels" :key="c.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ c.title }}</strong>
          <span class="muted"> {{ c.username ? '@' + c.username : 'приватный канал' }}</span>
          <span v-if="!c.is_active" class="badge ml-2">Отключён</span>
        </div>
        <div class="muted">{{ fmtNum(c.subscribers_count) }} подписчиков</div>
      </div>
      <p v-if="c.description" class="muted mt-2">{{ c.description }}</p>
      <p class="mt-2">
        Опубликовано: <b>{{ c.published_count }}</b> · В подготовке: <b>{{ c.pending_count }}</b>
      </p>
      <p v-if="isAdmin" class="muted mt-2">
        Доступ:
        <span v-if="!c.assigned_users.length">только администраторы</span>
        <span v-else class="chips-inline"><span v-for="u in c.assigned_users" :key="u.id" class="tagchip">{{ u.name }}</span></span>
      </p>
      <div class="actions">
        <button :disabled="busy" @click="refresh(c)">Обновить данные</button>
        <button v-if="isAdmin" :disabled="busy" @click="accessFor = accessFor === c.id ? null : c.id">Доступ</button>
        <button v-if="isAdmin" :disabled="busy" @click="toggle(c)">{{ c.is_active ? 'Отключить публикации' : 'Включить публикации' }}</button>
        <button v-if="isAdmin" class="danger" :disabled="busy" @click="remove(c)">Удалить</button>
      </div>
      <AccessPicker
        v-if="isAdmin && accessFor === c.id"
        :key="c.id"
        title="Кому доступен канал"
        :options="editorOptions"
        :selected="assignedIds(c)"
        empty="Редакторов пока нет. Добавьте их на странице «Пользователи»."
        @save="(ids) => saveAccess(c, ids)"
        @cancel="accessFor = null"
      />
    </article>
  </section>
</template>
UI_POLISH_EOF

write pages/login.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const { needsSetup, login, setup } = useAuth()
const email = ref('')
const name = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (needsSetup.value) await setup(email.value, name.value, password.value)
    else await login(email.value, password.value)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="card auth-card" @submit.prevent="submit">
    <h1>{{ needsSetup ? 'Создание администратора' : 'Вход' }}</h1>
    <p v-if="needsSetup" class="muted">Пользователей пока нет. Эта учётная запись станет администратором.</p>

    <label>Email</label>
    <input v-model="email" type="email" required autocomplete="username" autofocus />

    <template v-if="needsSetup">
      <label>Имя</label>
      <input v-model="name" required autocomplete="name" />
    </template>

    <label>Пароль{{ needsSetup ? ' (не короче 8 символов)' : '' }}</label>
    <input v-model="password" type="password" required :minlength="needsSetup ? 8 : undefined" :autocomplete="needsSetup ? 'new-password' : 'current-password'" />

    <p v-if="error" class="error mt-3">{{ error }}</p>
    <div class="actions">
      <button class="primary" :disabled="busy">{{ needsSetup ? 'Создать и войти' : 'Войти' }}</button>
    </div>
  </form>
</template>
UI_POLISH_EOF

write pages/metrics.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const overview = ref<any>(null)
const channels = ref<any[]>([])
const timeline = ref<any[]>([])
const subscribers = ref<any[]>([])
const top = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')
const loading = ref(true)

async function load() {
  error.value = ''
  try {
    const query = { channel_id: channelId.value || undefined }
    const [o, c, t, tp] = await Promise.all([
      api('/metrics/overview'),
      api('/metrics/channels'),
      api('/metrics/timeline', { query }),
      api('/metrics/top-posts', { query }),
    ])
    overview.value = o
    channels.value = c
    timeline.value = t
    top.value = tp
    subscribers.value = channelId.value ? await api('/metrics/subscribers', { query }) : []
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const postsSeries = computed(() => timeline.value.map((d) => ({ label: d.day.slice(5), value: d.posts })))
const likesSeries = computed(() => timeline.value.map((d) => ({ label: d.day.slice(5), value: d.likes })))
const subsSeries = computed(() => subscribers.value.map((d) => ({ label: d.label, value: d.subscribers })))

onMounted(load)
watch(channelId, () => {
  loading.value = true
  load()
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>Метрики</h1>
      <select v-model="channelId" class="filter">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="grid" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="card stat">
        <Skeleton width="56%" height="26px" />
        <Skeleton class="mt-2" width="84%" height="13px" />
      </div>
    </div>
    <div v-else-if="overview" class="grid">
      <div class="card stat"><b>{{ fmtNum(overview.subscribers) }}</b><span>Подписчиков во всех каналах</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.published) }}</b><span>Опубликовано постов</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.likes) }}</b><span>Лайков всего</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.scheduled) }}</b><span>В графике</span></div>
      <div class="card stat"><b>{{ fmtNum(overview.drafts) }}</b><span>Черновиков</span></div>
    </div>

    <h2>Динамика за 30 дней</h2>
    <div class="charts">
      <template v-if="loading">
        <SkeletonChart v-for="n in 3" :key="n" />
      </template>
      <template v-else>
        <BarChart title="Публикации по дням" :items="postsSeries" />
        <BarChart title="Лайки по дням" :items="likesSeries" />
        <BarChart v-if="channelId" title="Подписчики канала" :items="subsSeries" from-min />
        <div v-else class="card chart"><h3>Подписчики канала</h3><p class="muted">Выберите канал, чтобы увидеть рост.</p></div>
      </template>
    </div>

    <h2>Каналы</h2>
    <SkeletonTable v-if="loading" :rows="3" :cols="6" />
    <div v-else class="card table-wrap">
      <table class="stack">
        <thead>
          <tr>
            <th>Канал</th><th class="num">Подписчики</th><th class="num">Рост за 30 дней</th>
            <th class="num">Постов</th><th class="num">Лайков</th><th class="num">Лайков на пост</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in channels" :key="c.id">
            <td data-label="Канал">{{ c.title }}</td>
            <td class="num" data-label="Подписчики">{{ fmtNum(c.subscribers_count) }}</td>
            <td class="num" data-label="Рост за 30 дней" :class="{ pos: c.growth_30d > 0 }">{{ c.growth_30d > 0 ? '+' : '' }}{{ fmtNum(c.growth_30d) }}</td>
            <td class="num" data-label="Постов">{{ fmtNum(c.posts) }}</td>
            <td class="num" data-label="Лайков">{{ fmtNum(c.likes) }}</td>
            <td class="num" data-label="Лайков на пост">{{ c.avg_likes }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Лучшие посты по лайкам</h2>
    <SkeletonTable v-if="loading" :rows="5" :cols="4" />
    <div v-else class="card table-wrap">
      <p v-if="!top.length" class="muted">Опубликованных постов пока нет.</p>
      <table v-else class="stack">
        <thead><tr><th>Пост</th><th>Канал</th><th>Дата</th><th class="num">Лайки</th></tr></thead>
        <tbody>
          <tr v-for="p in top" :key="p.id">
            <td data-label="Пост">{{ p.title }}</td>
            <td data-label="Канал">{{ p.channel_title }}</td>
            <td data-label="Дата">{{ fmtDate(p.published_at) }}</td>
            <td class="num" data-label="Лайки">{{ fmtNum(p.likes_count) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
UI_POLISH_EOF

write pages/published.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const channels = ref<any[]>([])
const posts = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')
const loading = ref(true)

async function load() {
  error.value = ''
  try {
    channels.value = await api('/channels')
    posts.value = await api('/posts', { query: { status: 'published', channel_id: channelId.value || undefined } })
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function remove(p: any) {
  if (!confirm(`Удалить запись «${p.title}»?`)) return
  const fromTelegram = Boolean(p.tg_message_id) && confirm('Удалить и само сообщение из канала?')
  try {
    await api(`/posts/${p.id}`, { method: 'DELETE', query: { tg: fromTelegram ? 1 : undefined } })
  } catch (e: any) {
    error.value = e.message
  }
  await load()
}

const link = (p: any) => (p.channel_username && p.tg_message_id ? `https://t.me/${p.channel_username}/${p.tg_message_id}` : null)

onMounted(load)
watch(channelId, () => {
  loading.value = true
  posts.value = []
  load()
})
</script>

<template>
  <section :aria-busy="loading">
    <div class="row between head">
      <h1>Опубликованные</h1>
      <select v-model="channelId" class="filter">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!loading && !posts.length" class="muted">Опубликованных постов пока нет.</p>

    <SkeletonCards v-if="loading" :count="3" :actions="2" />

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.title }}</strong>
          <span class="muted"> · {{ p.channel_title }}</span>
        </div>
        <span class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>
      </div>
      <p class="post-content">{{ p.content }}</p>
      <img v-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      <p class="muted mt-2">Опубликовано: {{ fmtDate(p.published_at) }}<span v-if="p.author_name"> · автор: {{ p.author_name }}</span></p>
      <div class="actions">
        <a v-if="link(p)" :href="link(p)!" target="_blank" rel="noopener"><button>Открыть в Telegram</button></a>
        <button class="danger" @click="remove(p)">Удалить</button>
      </div>
    </article>
  </section>
</template>
UI_POLISH_EOF

write pages/users.vue <<'UI_POLISH_EOF'
<script setup lang="ts">
const api = useApi()
const { user: me } = useAuth()
const users = ref<any[]>([])
const channels = ref<any[]>([])
const form = reactive({ email: '', name: '', password: '', role: 'editor' })
const error = ref('')
const busy = ref(false)
const accessFor = ref<any | null>(null)
const loading = ref(true)

async function load() {
  try {
    users.value = await api('/users')
    channels.value = await api('/channels')
  } finally {
    loading.value = false
  }
}
async function run(fn: () => Promise<any>) {
  error.value = ''
  busy.value = true
  try {
    await fn()
  } catch (e: any) {
    error.value = e.message
  } finally {
    await load().catch(() => {})
    busy.value = false
  }
}

const create = () =>
  run(async () => {
    await api('/users', { method: 'POST', body: { ...form } })
    Object.assign(form, { email: '', name: '', password: '', role: 'editor' })
  })
const setRole = (u: any, role: string) => run(() => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, role } }))
const resetPassword = (u: any) => {
  const password = prompt(`Новый пароль для ${u.email} (не короче 8 символов)`)
  return password ? run(() => api(`/users/${u.id}`, { method: 'PUT', body: { name: u.name, role: u.role, password } })) : undefined
}
const remove = (u: any) =>
  confirm(`Удалить пользователя ${u.email}?`) ? run(() => api(`/users/${u.id}`, { method: 'DELETE' })) : undefined

const channelOptions = computed(() =>
  channels.value.map((c) => ({ id: c.id, label: c.title, hint: c.username ? '@' + c.username : undefined })),
)
const pickedIds = (u: any): number[] => (u.channels ?? []).map((c: any) => c.id)
const saveAccess = (ids: number[]) =>
  run(async () => {
    await api(`/users/${accessFor.value.id}/channels`, { method: 'PUT', body: { channel_ids: ids } })
    accessFor.value = null
  })

onMounted(() => run(async () => {}))
</script>

<template>
  <section :aria-busy="loading">
    <div class="row head"><h1>Пользователи</h1></div>

    <form class="card" @submit.prevent="create">
      <h3>Новый пользователь</h3>
      <div class="row" style="align-items: flex-end">
        <div style="flex: 2; min-width: 200px"><label>Email</label><input v-model="form.email" type="email" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Имя</label><input v-model="form.name" required /></div>
        <div style="flex: 1; min-width: 150px"><label>Пароль</label><input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" /></div>
        <div style="width: 150px">
          <label>Роль</label>
          <select v-model="form.role"><option value="editor">Редактор</option><option value="admin">Администратор</option></select>
        </div>
        <button class="primary" :disabled="busy">Добавить</button>
      </div>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="accessFor" class="card">
      <AccessPicker
        :key="accessFor.id"
        :title="'Каналы пользователя ' + accessFor.name"
        :options="channelOptions"
        :selected="pickedIds(accessFor)"
        empty="Каналов пока нет. Подключите канал на странице «Каналы»."
        @save="saveAccess"
        @cancel="accessFor = null"
      />
    </div>

    <SkeletonTable v-if="loading" :rows="4" :cols="5" />
    <div v-else class="card table-wrap">
      <table class="stack">
        <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Каналы</th><th>Создан</th><th /></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td data-label="Имя">{{ u.name }}</td>
            <td data-label="Email">{{ u.email }}</td>
            <td data-label="Роль">
              <select :value="u.role" :disabled="busy || u.id === me?.id" style="width: 160px" @change="setRole(u, ($event.target as HTMLSelectElement).value)">
                <option value="editor">Редактор</option>
                <option value="admin">Администратор</option>
              </select>
            </td>
            <td class="wrap" data-label="Каналы">
              <span v-if="u.role === 'admin'" class="muted">все каналы</span>
              <span v-else-if="!u.channels.length" class="warn">нет доступа</span>
              <span v-else class="chips-inline"><span v-for="c in u.channels" :key="c.id" class="tagchip">{{ c.title }}</span></span>
            </td>
            <td data-label="Создан">{{ fmtDate(u.created_at) }}</td>
            <td class="num actions-cell">
              <button v-if="u.role === 'editor'" :disabled="busy" @click="accessFor = u">Каналы</button>
              <button :disabled="busy" @click="resetPassword(u)">Сбросить пароль</button>
              <button class="danger" :disabled="busy || u.id === me?.id" @click="remove(u)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted">
      Администратор видит все каналы и управляет пользователями. Редактор работает только с каналами, которые за ним закреплены:
      он видит их посты и метрики, остальные каналы для него скрыты.
    </p>
  </section>
</template>
UI_POLISH_EOF

echo "Готово. Проверьте: npm run dev (или пересоберите Docker-образ)."
