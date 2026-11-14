#!/usr/bin/env node
// Единые отступы и skeleton-загрузка для tg-channel-manager (v2, точечные правки).
// Запуск из корня проекта:  node apply-ui-polish.mjs
//
// Скрипт НЕ перезаписывает файлы целиком: он вносит замены в ваши текущие версии,
// а если якорь не найден, файл остаётся нетронутым и выводится предупреждение.
// Перед первой правкой каждого файла его копия сохраняется в .ui-polish-backup-v2/
//
// Если ранее запускалась первая версия скрипта (apply-ui-polish.sh), она затёрла часть ваших файлов.
// Их версии до того запуска лежат в .ui-polish-backup/ — при первом запуске этого скрипта
// файлы берутся оттуда и уже на них накладываются правки.
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

const DATA = {
 "files": {
  "pages/index.vue": {
   "marker": "const accessFor = ref<number | null>(null)\nconst loading = ref(true)\n",
   "edits": [
    [
     "const accessFor = ref<number | null>(null)\n",
     "const accessFor = ref<number | null>(null)\nconst loading = ref(true)\n"
    ],
    [
     "async function load() {\n  channels.value = await api('/channels')\n  if (isAdmin.value) editors.value = (await api<any[]>('/users')).filter((u) => u.role === 'editor')\n}",
     "async function load() {\n  try {\n    channels.value = await api('/channels')\n    if (isAdmin.value) editors.value = (await api<any[]>('/users')).filter((u) => u.role === 'editor')\n  } finally {\n    loading.value = false\n  }\n}"
    ],
    [
     "  <section>\n    <div class=\"row head\"><h1>Каналы</h1></div>",
     "  <section :aria-busy=\"loading\">\n    <div class=\"row head\"><h1>Каналы</h1></div>"
    ],
    [
     "<p class=\"muted\" style=\"margin-top: 0\">",
     "<p class=\"muted mb-3\">"
    ],
    [
     "<p v-if=\"!channels.length\" class=\"muted\">",
     "<p v-if=\"!loading && !channels.length\" class=\"muted\">"
    ],
    [
     "    <article v-for=\"c in channels\" :key=\"c.id\" class=\"card\">",
     "    <SkeletonCards v-if=\"loading\" :count=\"3\" :actions=\"isAdmin ? 4 : 1\" />\n\n    <article v-for=\"c in channels\" :key=\"c.id\" class=\"card\">"
    ],
    [
     "class=\"badge\" style=\"margin-left: 8px\"",
     "class=\"badge ml-2\""
    ],
    [
     "<p v-if=\"c.description\" class=\"muted\" style=\"margin: 6px 0 0\">",
     "<p v-if=\"c.description\" class=\"muted mt-2\">"
    ],
    [
     "<p style=\"margin: 8px 0 0\">",
     "<p class=\"mt-2\">"
    ],
    [
     "<p v-if=\"isAdmin\" class=\"muted\" style=\"margin: 8px 0 0\">",
     "<p v-if=\"isAdmin\" class=\"muted mt-2\">"
    ]
   ]
  },
  "pages/drafts.vue": {
   "marker": "const busy = ref(false)\nconst loading = ref(true)\n\nconst STATUS",
   "edits": [
    [
     "const busy = ref(false)\n\nconst STATUS",
     "const busy = ref(false)\nconst loading = ref(true)\n\nconst STATUS"
    ],
    [
     "async function load() {\n  channels.value = await api('/channels')\n  posts.value = await api('/posts', {\n    query: { status: 'draft,scheduled,publishing,failed', channel_id: channelId.value || undefined },\n  })\n}",
     "async function load() {\n  try {\n    channels.value = await api('/channels')\n    posts.value = await api('/posts', {\n      query: { status: 'draft,scheduled,publishing,failed', channel_id: channelId.value || undefined },\n    })\n  } finally {\n    loading.value = false\n  }\n}"
    ],
    [
     "watch(channelId, () => load().catch((e) => (error.value = e.message)))",
     "watch(channelId, () => {\n  loading.value = true\n  posts.value = []\n  load().catch((e) => (error.value = e.message))\n})"
    ],
    [
     "  <section>\n    <div class=\"row between head\">",
     "  <section :aria-busy=\"loading\">\n    <div class=\"row between head\">"
    ],
    [
     "<p v-if=\"!channels.length\" class=\"muted\">{{ isAdmin",
     "<p v-if=\"!loading && !channels.length\" class=\"muted\">{{ isAdmin"
    ],
    [
     "<p v-if=\"channels.length && !posts.length\" class=\"muted\">",
     "<p v-if=\"!loading && channels.length && !posts.length\" class=\"muted\">"
    ],
    [
     "    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">",
     "    <SkeletonCards v-if=\"loading\" :count=\"3\" :actions=\"4\" />\n\n    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">"
    ],
    [
     "<p v-if=\"p.scheduled_at\" class=\"muted\" style=\"margin: 0\">",
     "<p v-if=\"p.scheduled_at\" class=\"muted mt-2\">"
    ],
    [
     "<p v-if=\"p.author_name\" class=\"muted\" style=\"margin: 4px 0 0\">",
     "<p v-if=\"p.author_name\" class=\"muted mt-2\">"
    ],
    [
     "<p v-if=\"p.error\" class=\"error\" style=\"margin: 4px 0 0\">",
     "<p v-if=\"p.error\" class=\"error mt-2\">"
    ]
   ]
  },
  "pages/published.vue": {
   "marker": "const error = ref('')\nconst loading = ref(true)\n\nasync function load() {",
   "edits": [
    [
     "const error = ref('')\n\nasync function load() {",
     "const error = ref('')\nconst loading = ref(true)\n\nasync function load() {"
    ],
    [
     "  } catch (e: any) {\n    error.value = e.message\n  }\n}\n\nasync function remove",
     "  } catch (e: any) {\n    error.value = e.message\n  } finally {\n    loading.value = false\n  }\n}\n\nasync function remove"
    ],
    [
     "watch(channelId, load)",
     "watch(channelId, () => {\n  loading.value = true\n  posts.value = []\n  load()\n})"
    ],
    [
     "  <section>\n    <div class=\"row between head\">",
     "  <section :aria-busy=\"loading\">\n    <div class=\"row between head\">"
    ],
    [
     "<p v-if=\"!posts.length\" class=\"muted\">",
     "<p v-if=\"!loading && !posts.length\" class=\"muted\">"
    ],
    [
     "    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">",
     "    <SkeletonCards v-if=\"loading\" :count=\"3\" :actions=\"2\" />\n\n    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">"
    ],
    [
     "<p class=\"muted\" style=\"margin: 0\">Опубликовано:",
     "<p class=\"muted mt-2\">Опубликовано:"
    ]
   ]
  },
  "pages/account.vue": {
   "marker": "<p class=\"mb-3\">",
   "edits": [
    [
     "<p style=\"margin-top: 0\">",
     "<p class=\"mb-3\">"
    ],
    [
     "<p v-if=\"error\" class=\"error\" style=\"margin-top: 12px\">",
     "<p v-if=\"error\" class=\"error mt-3\">"
    ],
    [
     "<p v-if=\"done\" class=\"pos\" style=\"margin-top: 12px\">",
     "<p v-if=\"done\" class=\"pos mt-3\">"
    ]
   ]
  },
  "pages/login.vue": {
   "marker": "<p v-if=\"error\" class=\"error mt-3\">",
   "edits": [
    [
     "<p v-if=\"error\" class=\"error\" style=\"margin-top: 12px\">",
     "<p v-if=\"error\" class=\"error mt-3\">"
    ],
    [
     "<p v-if=\"!needsSetup && registration.open\" class=\"muted\" style=\"margin: 16px 0 0\">",
     "<p v-if=\"!needsSetup && registration.open\" class=\"muted mt-4\">"
    ]
   ]
  },
  "components/AccessPicker.vue": {
   "marker": "<p v-if=\"!options.length\" class=\"muted\">",
   "edits": [
    [
     "<p v-if=\"!options.length\" class=\"muted\" style=\"margin: 0 0 8px\">",
     "<p v-if=\"!options.length\" class=\"muted\">"
    ]
   ]
  },
  "components/PostForm.vue": {
   "marker": "<h2>",
   "edits": [
    [
     "<h2 style=\"margin-top: 0\">",
     "<h2>"
    ],
    [
     "<p v-if=\"uploadError\" class=\"error\" style=\"margin: 8px 0 0\">",
     "<p v-if=\"uploadError\" class=\"error mt-2\">"
    ]
   ]
  },
  "pages/metrics.vue": {
   "marker": "const error = ref('')\nconst loading = ref(true)\n\nlet requestId = 0",
   "edits": [
    [
     "const error = ref('')\n\nlet requestId = 0",
     "const error = ref('')\nconst loading = ref(true)\n\nlet requestId = 0"
    ],
    [
     "  } catch (e: any) {\n    if (current === requestId) error.value = e.message\n  }\n}",
     "  } catch (e: any) {\n    if (current === requestId) error.value = e.message\n  } finally {\n    if (current === requestId) loading.value = false\n  }\n}"
    ],
    [
     "watch(channelId, load)",
     "watch(channelId, () => {\n  loading.value = true\n  load()\n})"
    ],
    [
     "  <section>\n    <div class=\"row between head\">",
     "  <section :aria-busy=\"loading\">\n    <div class=\"row between head\">"
    ],
    [
     "    <div v-if=\"overview\" class=\"grid\">",
     "    <div v-if=\"loading\" class=\"grid\" aria-hidden=\"true\">\n      <div v-for=\"n in 5\" :key=\"n\" class=\"card stat\">\n        <Skeleton width=\"56%\" height=\"26px\" />\n        <Skeleton class=\"mt-2\" width=\"84%\" height=\"13px\" />\n      </div>\n    </div>\n    <div v-else-if=\"overview\" class=\"grid\">"
    ],
    [
     "    <div class=\"charts\">\n      <BarChart title=\"Публикации по дням\" :items=\"postsSeries\" :summary=\"postsTotal\" />\n      <BarChart title=\"Лайки по дням\" :items=\"likesSeries\" :summary=\"likesTotal\" />\n      <BarChart title=\"Подписчики\" :items=\"subsSeries\" :summary=\"subsLast\" from-min />\n    </div>",
     "    <div class=\"charts\">\n      <template v-if=\"loading\">\n        <SkeletonChart v-for=\"n in 3\" :key=\"n\" />\n      </template>\n      <template v-else>\n        <BarChart title=\"Публикации по дням\" :items=\"postsSeries\" :summary=\"postsTotal\" />\n        <BarChart title=\"Лайки по дням\" :items=\"likesSeries\" :summary=\"likesTotal\" />\n        <BarChart title=\"Подписчики\" :items=\"subsSeries\" :summary=\"subsLast\" from-min />\n      </template>\n    </div>"
    ],
    [
     "    <h2>{{ selected ? 'Канал' : 'Каналы' }}</h2>\n    <div class=\"card table-wrap\">",
     "    <h2>{{ selected ? 'Канал' : 'Каналы' }}</h2>\n    <SkeletonTable v-if=\"loading\" :rows=\"3\" :cols=\"6\" />\n    <div v-else class=\"card table-wrap\">"
    ],
    [
     "    <h2>Лучшие посты по лайкам</h2>\n    <div class=\"card table-wrap\">\n      <p v-if=\"!top.length\" class=\"muted\" style=\"margin: 0\">",
     "    <h2>Лучшие посты по лайкам</h2>\n    <SkeletonTable v-if=\"loading\" :rows=\"5\" :cols=\"4\" />\n    <div v-else class=\"card table-wrap\">\n      <p v-if=\"!top.length\" class=\"muted\">"
    ]
   ]
  },
  "pages/users.vue": {
   "marker": "const accessFor = ref<any | null>(null)\nconst loading = ref(true)\n",
   "edits": [
    [
     "const accessFor = ref<any | null>(null)\n",
     "const accessFor = ref<any | null>(null)\nconst loading = ref(true)\n"
    ],
    [
     "async function load() {\n  users.value = await api('/users')\n  channels.value = await api('/channels')\n  admins.value = isSuper.value ? await api('/users/admins') : []\n}",
     "async function load() {\n  try {\n    users.value = await api('/users')\n    channels.value = await api('/channels')\n    admins.value = isSuper.value ? await api('/users/admins') : []\n  } finally {\n    loading.value = false\n  }\n}"
    ],
    [
     "  <section>\n    <div class=\"row head\"><h1>Пользователи</h1></div>",
     "  <section :aria-busy=\"loading\">\n    <div class=\"row head\"><h1>Пользователи</h1></div>"
    ],
    [
     "    <h3 style=\"margin: 20px 0 8px\">Мои редакторы</h3>\n    <div class=\"card table-wrap\">\n      <p v-if=\"!users.length\" class=\"muted\" style=\"margin: 0\">",
     "    <h3 class=\"section-title\">Мои редакторы</h3>\n    <SkeletonTable v-if=\"loading\" :rows=\"3\" :cols=\"4\" />\n    <div v-else class=\"card table-wrap\">\n      <p v-if=\"!users.length\" class=\"muted\">"
    ],
    [
     "<h3 style=\"margin: 28px 0 8px\">Администраторы</h3>",
     "<h3 class=\"section-title\">Администраторы</h3>"
    ],
    [
     "<p class=\"muted\" style=\"margin-top: 0\">У каждого администратора",
     "<p class=\"muted mb-3\">У каждого администратора"
    ],
    [
     "      <div class=\"card table-wrap\">\n        <table class=\"stack\">\n          <thead><tr><th>Имя</th><th>Email</th><th>Каналов</th>",
     "      <SkeletonTable v-if=\"loading\" :rows=\"3\" :cols=\"5\" />\n      <div v-else class=\"card table-wrap\">\n        <table class=\"stack\">\n          <thead><tr><th>Имя</th><th>Email</th><th>Каналов</th>"
    ]
   ]
  },
  "pages/parser.vue": {
   "marker": "const creating = ref<number[]>([])\nconst booting = ref(true) // первая загрузка страницы\n",
   "edits": [
    [
     "const creating = ref<number[]>([])\n",
     "const creating = ref<number[]>([])\nconst booting = ref(true) // первая загрузка страницы\n"
    ],
    [
     "    targetId.value = channels.value[0]?.id ?? ''\n    await Promise.all([loadSources(), loadPosts()])\n  } catch (e: any) {\n    fail(e)\n  }\n})",
     "    targetId.value = channels.value[0]?.id ?? ''\n    await Promise.all([loadSources(), loadPosts()])\n  } catch (e: any) {\n    fail(e)\n  } finally {\n    booting.value = false\n  }\n})"
    ],
    [
     "  <section>\n    <div class=\"row head\"><h1>Парсер</h1></div>",
     "  <section :aria-busy=\"booting\">\n    <div class=\"row head\"><h1>Парсер</h1></div>"
    ],
    [
     "<p class=\"muted\" style=\"margin-top: 0\">\n        Укажите @username",
     "<p class=\"muted mb-3\">\n        Укажите @username"
    ],
    [
     "<p v-if=\"info\" class=\"pos\" style=\"margin: 0 0 12px\">",
     "<p v-if=\"info\" class=\"pos\">"
    ],
    [
     "      <p v-if=\"!sources.length\" class=\"muted\" style=\"margin: 0\">Каналов пока нет. Добавьте первый выше.</p>\n      <template v-else>",
     "      <div v-if=\"booting\" aria-hidden=\"true\">\n        <div v-for=\"n in 3\" :key=\"n\" class=\"src-row\">\n          <Skeleton width=\"18px\" height=\"18px\" radius=\"4px\" />\n          <div class=\"sk-cell\"><Skeleton :width=\"n === 2 ? '48%' : '64%'\" height=\"16px\" /></div>\n          <Skeleton width=\"84px\" height=\"41px\" radius=\"8px\" />\n        </div>\n      </div>\n      <p v-else-if=\"!sources.length\" class=\"muted\">Каналов пока нет. Добавьте первый выше.</p>\n      <template v-else>"
    ],
    [
     "<p class=\"muted\" style=\"margin: 8px 0 0; font-size: 13px\">Чем больше",
     "<p class=\"muted small mt-2\">Чем больше"
    ],
    [
     "<div class=\"row between head\" style=\"margin-top: 24px\">",
     "<div class=\"row between head mt-5\">"
    ],
    [
     "<label style=\"margin-top: 0\">Канал публикации",
     "<label>Канал публикации"
    ],
    [
     "      <select v-model=\"targetId\" :disabled=\"!channels.length\">\n        <option v-if=\"!channels.length\" value=\"\">Нет доступных каналов</option>",
     "      <select v-model=\"targetId\" :disabled=\"booting || !channels.length\">\n        <option v-if=\"!booting && !channels.length\" value=\"\">Нет доступных каналов</option>"
    ],
    [
     "<p v-if=\"!channels.length\" class=\"muted\" style=\"margin: 8px 0 0\">Каналов для публикации нет",
     "<p v-if=\"!booting && !channels.length\" class=\"muted mt-2\">Каналов для публикации нет"
    ],
    [
     "    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">",
     "    <SkeletonCards v-if=\"booting || (loadingPosts && !posts.length)\" :count=\"3\" :actions=\"2\" />\n\n    <article v-for=\"p in posts\" :key=\"p.id\" class=\"card\">"
    ]
   ]
  },
  "pages/bot.vue": {
   "marker": "  <section :aria-busy=\"!info && !error\">\n    <div class=\"row head\"><h1>Бот</h1></div>",
   "edits": [
    [
     "  <section>\n    <div class=\"row head\"><h1>Бот</h1></div>",
     "  <section :aria-busy=\"!info && !error\">\n    <div class=\"row head\"><h1>Бот</h1></div>"
    ],
    [
     "<p v-if=\"ok\" class=\"pos\" style=\"margin: 0 0 12px\">",
     "<p v-if=\"ok\" class=\"pos\">"
    ],
    [
     "      <p v-if=\"!info\" class=\"muted\" style=\"margin: 0\">Загрузка…</p>\n      <p v-else-if=\"!info.connected\" class=\"warn\" style=\"margin: 0\">",
     "      <div v-if=\"!info && !error\" aria-hidden=\"true\">\n        <Skeleton width=\"60%\" height=\"20px\" />\n        <Skeleton class=\"mt-2\" width=\"40%\" height=\"14px\" />\n      </div>\n      <p v-else-if=\"!info\" class=\"muted\">Статус недоступен.</p>\n      <p v-else-if=\"!info.connected\" class=\"warn\">"
    ],
    [
     "<p style=\"margin: 0\">\n          Подключён",
     "<p>\n          Подключён"
    ],
    [
     "<p v-if=\"info.source === 'env'\" class=\"muted\" style=\"margin: 8px 0 0\">",
     "<p v-if=\"info.source === 'env'\" class=\"muted mt-2\">"
    ],
    [
     "<p class=\"muted\" style=\"margin-top: 0\">\n        Создайте бота",
     "<p class=\"muted mb-3\">\n        Создайте бота"
    ],
    [
     "<ol style=\"margin: 0; padding-left: 20px; line-height: 1.7\">",
     "<ol class=\"steps\">"
    ],
    [
     "<p class=\"muted\" style=\"margin: 12px 0 0\">\n        Если заменить",
     "<p class=\"muted mt-3\">\n        Если заменить"
    ]
   ]
  },
  "pages/register.vue": {
   "marker": "<p v-if=\"error\" class=\"error mt-3\">",
   "edits": [
    [
     "<p v-if=\"error\" class=\"error\" style=\"margin-top: 12px\">",
     "<p v-if=\"error\" class=\"error mt-3\">"
    ],
    [
     "<p class=\"muted\" style=\"margin: 16px 0 0\">Уже есть аккаунт?",
     "<p class=\"muted mt-4\">Уже есть аккаунт?"
    ]
   ]
  },
  "app.vue": {
   "marker": "    <header v-if=\"showNav\" class=\"top\">\n      <button class=\"burger\" type=\"button\" :aria-expanded=\"menuOpen\" aria-controls=\"menu\" aria-label=\"Меню\" @click=\"menuOpen = !menuOpen\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\">\n          <path v-if=\"!menuOpen\" d=\"M4 7h16M4 12h16M4 17h16\" />\n          <path v-else d=\"M6 6l12 12M18 6L6 18\" />\n        </svg>\n      </button>\n      <div class=\"brand\">Менеджер каналов</div>\n      <div class=\"user\">\n        <NuxtLink to=\"/account\" class=\"who\">{{ user?.name }}</NuxtLink>\n        <button type=\"button\" @click=\"out\">Выйти</button>\n      </div>\n      <Transition name=\"menu\">\n        <nav v-show=\"menuOpen\" id=\"menu\" class=\"menu\" aria-label=\"Разделы\" @click=\"menuOpen = false\">\n          <NuxtLink to=\"/\">Каналы</NuxtLink>\n          <NuxtLink to=\"/parser\">Парсер</NuxtLink>\n          <NuxtLink to=\"/drafts\">Подготовка постов</NuxtLink>\n          <NuxtLink to=\"/published\">Опубликованные</NuxtLink>\n          <NuxtLink to=\"/metrics\">Метрики</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/bot\">Бот</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">Руководство пользователя</NuxtLink>\n        </nav>\n      </Transition>\n    </header>",
   "edits": [
    [
     "    <header v-if=\"showNav\" class=\"top\">\n      <div class=\"brand\">Менеджер каналов</div>\n      <button class=\"burger\" type=\"button\" :aria-expanded=\"menuOpen\" aria-controls=\"menu\" aria-label=\"Меню\" @click=\"menuOpen = !menuOpen\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\">\n          <path v-if=\"!menuOpen\" d=\"M4 7h16M4 12h16M4 17h16\" />\n          <path v-else d=\"M6 6l12 12M18 6L6 18\" />\n        </svg>\n      </button>\n      <div id=\"menu\" class=\"menu\" :class=\"{ open: menuOpen }\">\n        <nav>\n          <NuxtLink to=\"/\">Каналы</NuxtLink>\n          <NuxtLink to=\"/parser\">Парсер</NuxtLink>\n          <NuxtLink to=\"/drafts\">Подготовка постов</NuxtLink>\n          <NuxtLink to=\"/published\">Опубликованные</NuxtLink>\n          <NuxtLink to=\"/metrics\">Метрики</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/bot\">Бот</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n        </nav>\n        <div class=\"sp\" />\n        <NuxtLink to=\"/account\" class=\"who\">{{ user?.name }}</NuxtLink>\n        <button type=\"button\" @click=\"out\">Выйти</button>\n      </div>\n    </header>",
     "    <header v-if=\"showNav\" class=\"top\">\n      <button class=\"burger\" type=\"button\" :aria-expanded=\"menuOpen\" aria-controls=\"menu\" aria-label=\"Меню\" @click=\"menuOpen = !menuOpen\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\">\n          <path v-if=\"!menuOpen\" d=\"M4 7h16M4 12h16M4 17h16\" />\n          <path v-else d=\"M6 6l12 12M18 6L6 18\" />\n        </svg>\n      </button>\n      <div class=\"brand\">Менеджер каналов</div>\n      <div class=\"user\">\n        <NuxtLink to=\"/account\" class=\"who\">{{ user?.name }}</NuxtLink>\n        <button type=\"button\" @click=\"out\">Выйти</button>\n      </div>\n      <Transition name=\"menu\">\n        <nav v-show=\"menuOpen\" id=\"menu\" class=\"menu\" aria-label=\"Разделы\" @click=\"menuOpen = false\">\n          <NuxtLink to=\"/\">Каналы</NuxtLink>\n          <NuxtLink to=\"/parser\">Парсер</NuxtLink>\n          <NuxtLink to=\"/drafts\">Подготовка постов</NuxtLink>\n          <NuxtLink to=\"/published\">Опубликованные</NuxtLink>\n          <NuxtLink to=\"/metrics\">Метрики</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/bot\">Бот</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">Руководство пользователя</NuxtLink>\n        </nav>\n      </Transition>\n    </header>"
    ]
   ]
  }
 },
 "components": {
  "components/Skeleton.vue": "<script setup lang=\"ts\">\n// Базовый «скелет»: серый блок с мерцанием. Размеры — любые CSS-значения.\nwithDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {\n  width: '100%',\n  height: '16px',\n  radius: undefined,\n})\n</script>\n\n<template>\n  <span class=\"sk\" :style=\"{ width, height, borderRadius: radius }\" aria-hidden=\"true\" />\n</template>\n",
  "components/SkeletonCards.vue": "<script setup lang=\"ts\">\n// Заглушка списка карточек (каналы, посты) на время загрузки.\nwithDefaults(defineProps<{ count?: number; actions?: number }>(), { count: 3, actions: 2 })\n</script>\n\n<template>\n  <div aria-hidden=\"true\">\n    <article v-for=\"n in count\" :key=\"n\" class=\"card\">\n      <div class=\"row between\">\n        <Skeleton width=\"42%\" height=\"20px\" />\n        <Skeleton width=\"84px\" height=\"22px\" radius=\"99px\" />\n      </div>\n      <Skeleton class=\"mt-2\" width=\"92%\" height=\"14px\" />\n      <Skeleton class=\"mt-2\" width=\"68%\" height=\"14px\" />\n      <div class=\"actions\">\n        <Skeleton v-for=\"a in actions\" :key=\"a\" width=\"116px\" height=\"41px\" radius=\"8px\" />\n      </div>\n    </article>\n  </div>\n</template>\n",
  "components/SkeletonTable.vue": "<script setup lang=\"ts\">\n// Заглушка таблицы в карточке: строки с «ячейками» разной ширины.\nwithDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 4, cols: 4 })\nconst widths = ['70%', '90%', '55%', '80%', '65%', '75%']\n</script>\n\n<template>\n  <div class=\"card\" aria-hidden=\"true\">\n    <div v-for=\"r in rows\" :key=\"r\" class=\"sk-row\">\n      <div v-for=\"c in cols\" :key=\"c\" class=\"sk-cell\">\n        <Skeleton :width=\"widths[(r + c) % widths.length]\" height=\"16px\" />\n      </div>\n    </div>\n  </div>\n</template>\n",
  "components/SkeletonChart.vue": "<script setup lang=\"ts\">\n// Заглушка карточки с графиком — по размеру совпадает с BarChart (заголовок + число справа, столбики, подписи).\n</script>\n\n<template>\n  <div class=\"card chart\" aria-hidden=\"true\">\n    <div class=\"row between\">\n      <Skeleton class=\"mb-3\" width=\"45%\" height=\"18px\" />\n      <Skeleton class=\"mb-3\" width=\"48px\" height=\"18px\" />\n    </div>\n    <Skeleton height=\"120px\" />\n    <div class=\"axis\">\n      <Skeleton width=\"36px\" height=\"12px\" />\n      <Skeleton width=\"36px\" height=\"12px\" />\n    </div>\n  </div>\n</template>\n",
  "pages/guide.vue": "<script setup lang=\"ts\">\n// Руководство пользователя: содержание слева (на узких экранах сворачивается) и разделы справа.\nconst sections = [\n  { id: 'start', title: 'Быстрый старт' },\n  { id: 'roles', title: 'Роли и доступ' },\n  { id: 'bot', title: 'Бот' },\n  { id: 'channels', title: 'Каналы' },\n  { id: 'parser', title: 'Парсер' },\n  { id: 'drafts', title: 'Подготовка постов' },\n  { id: 'published', title: 'Опубликованные' },\n  { id: 'metrics', title: 'Метрики' },\n  { id: 'users', title: 'Пользователи' },\n  { id: 'account', title: 'Профиль' },\n  { id: 'faq', title: 'Частые вопросы' },\n]\n\nconst active = ref(sections[0].id)\nconst tocOpen = ref(false)\n\nlet wide: MediaQueryList | null = null\nlet spy: IntersectionObserver | null = null\nconst visible = new Set<string>()\n\nconst syncToc = () => (tocOpen.value = Boolean(wide?.matches)) // на широком экране содержание всегда раскрыто\n\nfunction onSummary(e: Event) {\n  if (wide?.matches) e.preventDefault() // на широком экране сворачивать содержание нельзя\n}\n\nfunction go(id: string) {\n  const el = document.getElementById(id)\n  if (!el) return\n  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches\n  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })\n  history.replaceState(history.state, '', `#${id}`)\n  active.value = id\n  if (!wide?.matches) tocOpen.value = false\n}\n\n// подсвечиваем в содержании раздел, который сейчас читают\nfunction onScroll() {\n  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2\n  if (atBottom) active.value = sections[sections.length - 1].id\n}\n\nonMounted(() => {\n  wide = window.matchMedia('(min-width: 981px)')\n  syncToc()\n  wide.addEventListener('change', syncToc)\n\n  spy = new IntersectionObserver(\n    (entries) => {\n      for (const e of entries) {\n        if (e.isIntersecting) visible.add(e.target.id)\n        else visible.delete(e.target.id)\n      }\n      const first = sections.find((s) => visible.has(s.id))\n      if (first) active.value = first.id\n    },\n    { rootMargin: '-80px 0px -60% 0px' },\n  )\n  for (const s of sections) {\n    const el = document.getElementById(s.id)\n    if (el) spy.observe(el)\n  }\n  window.addEventListener('scroll', onScroll, { passive: true })\n\n  const hash = location.hash.slice(1)\n  if (hash && sections.some((s) => s.id === hash)) nextTick(() => go(hash))\n})\n\nonBeforeUnmount(() => {\n  wide?.removeEventListener('change', syncToc)\n  spy?.disconnect()\n  window.removeEventListener('scroll', onScroll)\n})\n</script>\n\n<template>\n  <section>\n    <div class=\"row head\"><h1>Руководство пользователя</h1></div>\n\n    <div class=\"guide\">\n      <details class=\"card toc\" :open=\"tocOpen\" @toggle=\"tocOpen = ($event.target as HTMLDetailsElement).open\">\n        <summary @click=\"onSummary\">Содержание</summary>\n        <nav aria-label=\"Содержание руководства\">\n          <ul>\n            <li v-for=\"s in sections\" :key=\"s.id\">\n              <a :href=\"`#${s.id}`\" :class=\"{ active: active === s.id }\" :aria-current=\"active === s.id ? 'true' : undefined\" @click.prevent=\"go(s.id)\">{{ s.title }}</a>\n            </li>\n          </ul>\n        </nav>\n      </details>\n\n      <div class=\"guide-body\">\n        <section id=\"start\" class=\"card guide-section prose\">\n          <h2>Быстрый старт</h2>\n          <p>Чтобы опубликовать первый пост, пройдите шаги по порядку. Шаги 2–5 выполняет администратор: редактору достаточно, чтобы ему назначили канал.</p>\n          <ol class=\"guide-steps\">\n            <li><b>Войдите в приложение.</b> Администратор может зарегистрироваться сам, если регистрация включена. Аккаунт редактора создаёт администратор.</li>\n            <li><b>Подключите бота.</b> На странице «Бот» вставьте токен бота, созданного у @BotFather.</li>\n            <li><b>Добавьте бота в канал.</b> Назначьте его администратором канала с правом публикации сообщений.</li>\n            <li><b>Подключите канал.</b> На странице <NuxtLink to=\"/\">«Каналы»</NuxtLink> укажите @username или числовой id канала.</li>\n            <li><b>Дайте доступ редакторам.</b> Создайте редактора на странице «Пользователи» и закрепите за ним нужные каналы.</li>\n            <li><b>Подготовьте пост.</b> Напишите его в <NuxtLink to=\"/drafts\">«Подготовке постов»</NuxtLink> или возьмите готовый в <NuxtLink to=\"/parser\">«Парсере»</NuxtLink>.</li>\n            <li><b>Опубликуйте.</b> Выберите время или нажмите «Опубликовать сейчас». Результат смотрите в «Опубликованных» и «Метриках».</li>\n          </ol>\n        </section>\n\n        <section id=\"roles\" class=\"card guide-section prose\">\n          <h2>Роли и доступ</h2>\n          <dl class=\"defs\">\n            <dt><span class=\"badge\">Главный администратор</span></dt>\n            <dd>Работает как администратор и дополнительно создаёт других администраторов. Может удалить администратора вместе с его пространством.</dd>\n            <dt><span class=\"badge\">Администратор</span></dt>\n            <dd>Управляет своим изолированным пространством: свой бот, каналы, посты, метрики, источники парсера и редакторы. Данные других администраторов ему не видны.</dd>\n            <dt><span class=\"badge\">Редактор</span></dt>\n            <dd>Работает только с каналами, которые за ним закрепил администратор: готовит и публикует посты, смотрит метрики, пользуется парсером. Остальные каналы для него скрыты.</dd>\n          </dl>\n        </section>\n\n        <section id=\"bot\" class=\"card guide-section prose\">\n          <h2>Бот <span class=\"badge ml-2\">для администратора</span></h2>\n          <p>Публикации, статистика и кнопки «лайк» работают через вашего бота. У каждого администратора свой бот.</p>\n          <h3>Как подключить</h3>\n          <ol>\n            <li>В Telegram откройте @BotFather, создайте бота командой <code>/newbot</code> и скопируйте токен.</li>\n            <li>На странице «Бот» вставьте токен в поле «Токен бота» и нажмите «Сохранить».</li>\n          </ol>\n          <p class=\"callout\">Токен хранится на сервере в зашифрованном виде и после сохранения нигде не показывается. Один бот может быть подключён только к одному администратору.</p>\n          <h3>Замена и отключение</h3>\n          <p>Новый токен заменяет прежнего бота. После замены «лайки» под старыми постами перестанут работать, а нового бота нужно заново добавить администратором в каналы.</p>\n          <p class=\"callout callout-warn\">Если отключить бота, публикация и сбор статистики остановятся, а запланированные посты получат статус ошибки.</p>\n        </section>\n\n        <section id=\"channels\" class=\"card guide-section prose\">\n          <h2>Каналы</h2>\n          <p>На странице <NuxtLink to=\"/\">«Каналы»</NuxtLink> собраны каналы вашего пространства. Редактор видит только те, что за ним закреплены.</p>\n          <h3>Как подключить канал <span class=\"badge ml-2\">для администратора</span></h3>\n          <ol>\n            <li>Добавьте бота администратором канала с правом публикации сообщений.</li>\n            <li>В блоке «Подключить канал» введите @username или числовой id. У приватного канала id выглядит как <code>-1001234567890</code>.</li>\n            <li>Нажмите «Подключить».</li>\n          </ol>\n          <h3>Карточка канала</h3>\n          <p>В карточке видны число подписчиков, количество опубликованных постов и постов в подготовке. Администратор дополнительно видит, кому из редакторов доступен канал.</p>\n          <dl class=\"defs\">\n            <dt><b>Обновить данные</b></dt>\n            <dd>Подтягивает из Telegram название, описание и число подписчиков.</dd>\n            <dt><b>Доступ</b></dt>\n            <dd>Выбор редакторов, которые могут работать с каналом.</dd>\n            <dt><b>Отключить публикации</b></dt>\n            <dd>Канал остаётся в списке с пометкой «Отключён», запланированные посты в него не уходят. Включить публикации можно в любой момент.</dd>\n            <dt><b>Удалить</b></dt>\n            <dd>Убирает канал вместе с его постами и статистикой.</dd>\n          </dl>\n        </section>\n\n        <section id=\"parser\" class=\"card guide-section prose\">\n          <h2>Парсер</h2>\n          <p>Парсер собирает посты из публичных Telegram-каналов, чтобы вы могли быстро превратить их в свои черновики. Он читает открытую веб-версию канала (t.me/s/…), поэтому приватные каналы и каналы с отключённым просмотром не подойдут.</p>\n          <h3>Добавление канала-источника</h3>\n          <p>Введите @username или ссылку на канал и нажмите «Добавить». На одно пространство можно добавить до 50 источников.</p>\n          <h3>Загрузка постов</h3>\n          <ol>\n            <li>Отметьте нужные каналы в списке «Каналы для парсинга» или выберите все сразу.</li>\n            <li>Укажите, сколько последних постов загружать: 20, 50, 100 или 200.</li>\n            <li>Нажмите «Спарсить выбранные». За один раз можно обработать не более 20 каналов.</li>\n          </ol>\n          <p>Уже сохранённые посты не дублируются. Берутся текст, фото и видео. Из текста удаляются ссылки, @упоминания, хештеги и рекламные подписи, а посты без текста пропускаются.</p>\n          <h3>Спарсенные посты</h3>\n          <p>Список можно отфильтровать по источнику и найти нужный пост по тексту. Длинные тексты свёрнуты, их можно раскрыть кнопкой «Показать полностью».</p>\n          <h3>Как использовать пост</h3>\n          <ol>\n            <li>В блоке «Канал публикации» выберите канал, в который пойдёт пост.</li>\n            <li>Нажмите «Сформировать пост»: черновик появится в «Подготовке постов».</li>\n            <li>Отредактируйте его и опубликуйте или поставьте в график.</li>\n          </ol>\n          <p class=\"callout\">Если удалить источник, его спарсенные посты тоже удалятся. Уже созданные из них черновики останутся.</p>\n        </section>\n\n        <section id=\"drafts\" class=\"card guide-section prose\">\n          <h2>Подготовка постов</h2>\n          <p>Здесь создаются, редактируются и публикуются посты. Список обновляется сам раз в 30 секунд: опубликованные посты переезжают в раздел «Опубликованные».</p>\n          <h3>Новый пост</h3>\n          <p>Нажмите «Новый пост» и заполните форму:</p>\n          <ul>\n            <li><b>Канал</b> — куда будет опубликован пост.</li>\n            <li><b>Заголовок</b> — виден только вам и помогает искать пост в списке.</li>\n            <li><b>Текст</b> — до 4096 символов, а если к посту прикреплено фото или видео, то до 1024.</li>\n            <li><b>Изображение или видео</b> — вставьте ссылку или загрузите картинку с устройства (JPEG, PNG или WebP до 10 МБ).</li>\n            <li><b>Форматирование</b> — без форматирования, HTML или MarkdownV2.</li>\n          </ul>\n          <h3>Время публикации</h3>\n          <p>Выберите дату, часы и минуты (шаг 5 минут) или воспользуйтесь быстрыми вариантами: «Через час», «Сегодня в 18:00», «Завтра в 9:00». Время задаётся по часовому поясу вашего устройства. Если время не выбрано, пост сохранится как черновик. Если выбранное время уже прошло, пост опубликуется в течение минуты.</p>\n          <h3>Статусы</h3>\n          <dl class=\"defs\">\n            <dt><span class=\"badge\">Черновик</span></dt>\n            <dd>Пост сохранён, но не поставлен в график.</dd>\n            <dt><span class=\"badge scheduled\">В графике</span></dt>\n            <dd>Пост опубликуется в выбранное время.</dd>\n            <dt><span class=\"badge publishing\">Публикуется</span></dt>\n            <dd>Пост отправляется в канал. В это время его нельзя редактировать или удалить.</dd>\n            <dt><span class=\"badge failed\">Ошибка публикации</span></dt>\n            <dd>Причина показана в карточке. Исправьте её и опубликуйте пост снова.</dd>\n          </dl>\n          <h3>Действия с постом</h3>\n          <dl class=\"defs\">\n            <dt><b>Редактировать</b></dt>\n            <dd>Изменить любое поле, в том числе время публикации.</dd>\n            <dt><b>Опубликовать сейчас</b></dt>\n            <dd>Отправить пост в канал немедленно, после подтверждения.</dd>\n            <dt><b>Убрать из графика</b></dt>\n            <dd>Вернуть запланированный пост в черновики.</dd>\n            <dt><b>Удалить</b></dt>\n            <dd>Удалить пост из подготовки.</dd>\n          </dl>\n        </section>\n\n        <section id=\"published\" class=\"card guide-section prose\">\n          <h2>Опубликованные</h2>\n          <p>В разделе <NuxtLink to=\"/published\">«Опубликованные»</NuxtLink> собраны посты, уже отправленные в каналы. Список можно отфильтровать по каналу.</p>\n          <ul>\n            <li>Под каждым постом бот добавляет кнопку «лайк», а в карточке виден счётчик 👍.</li>\n            <li>Кнопка «Открыть в Telegram» ведёт к посту в канале. Она есть у каналов с публичным @username.</li>\n            <li>Опубликованный пост редактировать нельзя.</li>\n          </ul>\n          <p class=\"callout\">При удалении вас сначала спросят про запись в приложении, а затем про само сообщение в канале. Можно удалить только запись и оставить сообщение в канале.</p>\n        </section>\n\n        <section id=\"metrics\" class=\"card guide-section prose\">\n          <h2>Метрики</h2>\n          <p>Раздел <NuxtLink to=\"/metrics\">«Метрики»</NuxtLink> показывает, как живут ваши каналы. Выберите канал в фильтре или смотрите сводку по всем сразу.</p>\n          <ul>\n            <li><b>Сводка</b> — подписчики, опубликованные посты, лайки, посты в графике и черновики.</li>\n            <li><b>Динамика за 30 дней</b> — графики публикаций, лайков и подписчиков по дням.</li>\n            <li><b>Каналы</b> — таблица с подписчиками, ростом за 30 дней, числом постов, лайков и лайков на пост.</li>\n            <li><b>Лучшие посты</b> — публикации с наибольшим числом лайков.</li>\n          </ul>\n          <p class=\"callout\">Число подписчиков фиксируется раз в час, поэтому график подписчиков заполняется постепенно.</p>\n        </section>\n\n        <section id=\"users\" class=\"card guide-section prose\">\n          <h2>Пользователи <span class=\"badge ml-2\">для администратора</span></h2>\n          <p>На странице «Пользователи» администратор управляет своими редакторами.</p>\n          <ol>\n            <li>Укажите email, имя и пароль (не короче 8 символов) и нажмите «Добавить».</li>\n            <li>В таблице нажмите «Каналы» и выберите, к каким каналам у редактора будет доступ. Пока доступ не выдан, редактор ничего не увидит.</li>\n            <li>Если редактор забыл пароль, нажмите «Сбросить пароль» и задайте новый.</li>\n          </ol>\n          <p>Главный администратор дополнительно видит раздел «Администраторы»: в нём можно создать администратора, сбросить ему пароль или удалить его.</p>\n          <p class=\"callout callout-warn\">Удаление администратора безвозвратно стирает его каналы с постами и всех его редакторов.</p>\n        </section>\n\n        <section id=\"account\" class=\"card guide-section prose\">\n          <h2>Профиль</h2>\n          <p>Страница <NuxtLink to=\"/account\">«Профиль»</NuxtLink> открывается по имени в правом верхнем углу. Здесь видны ваше имя, email и роль, а ещё можно сменить пароль: введите текущий и новый (не короче 8 символов). Кнопка «Выйти» находится рядом с именем.</p>\n        </section>\n\n        <section id=\"faq\" class=\"card guide-section prose\">\n          <h2>Частые вопросы</h2>\n          <dl class=\"faq\">\n            <dt>Вижу «Бот не подключён»</dt>\n            <dd>Администратору нужно добавить токен бота на странице «Бот». Пока бота нет, публикация и сбор статистики не работают.</dd>\n            <dt>Пост получил статус «Ошибка публикации»</dt>\n            <dd>Прочитайте причину в карточке. Чаще всего бот не добавлен в администраторы канала или у него нет права публиковать сообщения, либо ссылка на файл недоступна. Исправьте это и нажмите «Опубликовать сейчас».</dd>\n            <dt>Вижу «Вам пока не назначены каналы»</dt>\n            <dd>Попросите администратора выдать вам доступ к каналам на странице «Пользователи».</dd>\n            <dt>Пост не ушёл в назначенное время</dt>\n            <dd>Проверьте, что канал не отключён на странице «Каналы», а бот остаётся администратором канала. Запланированные посты проверяются каждую минуту.</dd>\n            <dt>Не получается добавить канал в парсер</dt>\n            <dd>Парсер работает только с публичными каналами, у которых включён просмотр в веб-версии (t.me/s/…). Проверьте @username и доступность канала в браузере.</dd>\n            <dt>Текст не помещается в пост</dt>\n            <dd>Для текстового поста лимит 4096 символов, для поста с фото или видео — 1024. Сократите текст или уберите медиа.</dd>\n          </dl>\n        </section>\n      </div>\n    </div>\n  </section>\n</template>\n"
 },
 "css": {
  "new": ":root {\n  color-scheme: light dark;\n  --bg: #f2f5f7; --card: #ffffff; --text: #17252e; --muted: #64757f; --line: #dde4e8;\n  --accent: #0a7d8c; --ok: #1a8a4a; --warn: #b7791f; --bad: #c0392b;\n\n  /* отступы: единая шкала, все значения ниже берутся отсюда */\n  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;\n  --gutter: 24px;   /* боковой отступ страницы и шапки */\n  --page: 1040px;   /* максимальная ширина содержимого */\n  --header-h: 56px;\n  --edge: max(var(--gutter), calc((100% - var(--page)) / 2 + var(--gutter)));   /* от края окна до линии содержимого */\n}\n@media (prefers-color-scheme: dark) {\n  :root { --bg: #0e1a20; --card: #15252d; --text: #e4edf1; --muted: #8aa0ab; --line: #24383f; --accent: #3cb8c7; --ok: #4cc27f; --warn: #e0a64a; --bad: #ef6f60; }\n}\n* { box-sizing: border-box; }\nhtml { -webkit-text-size-adjust: 100%; }\nbody { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 \"Segoe UI\", system-ui, -apple-system, sans-serif; }\nimg { max-width: 100%; }\n\n/* ---------- шапка и меню ---------- */\n/* Бургер всегда слева перед логотипом, пользователь и «Выйти» справа. Края шапки и выпадающего меню лежат\n   на тех же вертикалях, что левый и правый край карточек (--edge), на любой ширине экрана. */\n.top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: var(--s-3); padding: 0 var(--edge); height: var(--header-h); background: var(--card); border-bottom: 1px solid var(--line); }\n.burger { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; padding: 0; }\n.burger svg { width: 20px; height: 20px; }\n.brand { flex: 0 1 auto; min-width: 0; font-weight: 700; font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.user { display: flex; align-items: center; gap: var(--s-3); flex: 0 1 auto; min-width: 0; margin-left: auto; }\n.user .who { min-width: 0; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); text-decoration: none; }\n.user .who:hover { color: var(--accent); }\n.user button { flex: none; white-space: nowrap; }\n\n.menu { position: absolute; top: calc(100% + var(--s-2)); left: var(--edge); width: min(320px, calc(100% - 2 * var(--edge))); display: flex; flex-direction: column; gap: var(--s-1); padding: var(--s-2); max-height: calc(100dvh - var(--header-h) - var(--s-4)); overflow-y: auto; background: var(--card); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 12px 24px rgba(0, 0, 0, .14); }\n.menu a { display: flex; align-items: center; min-height: 40px; padding: var(--s-2) var(--s-3); border-radius: 8px; color: var(--text); text-decoration: none; }\n.menu a:hover { background: color-mix(in srgb, var(--line) 55%, transparent); }\n.menu a.router-link-exact-active { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-weight: 600; }\n.menu-sep { width: 100%; height: 1px; margin: var(--s-1) 0; border: 0; background: var(--line); }\n.menu-enter-active, .menu-leave-active { transition: opacity .15s ease, transform .15s ease; }\n.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(calc(-1 * var(--s-2))); }\n@media (prefers-reduced-motion: reduce) { .menu-enter-active, .menu-leave-active { transition: none; } }\n.backdrop { position: fixed; inset: var(--header-h) 0 0 0; background: rgba(0, 0, 0, .35); z-index: 4; }\n\n/* ---------- основа ---------- */\nmain { max-width: var(--page); margin: var(--s-5) auto; padding: 0 var(--gutter) var(--s-7); }\nh1 { font-size: 22px; margin: 0; }\nh2 { font-size: 17px; margin: var(--s-5) 0 var(--s-3); }\nh3 { font-size: 14px; margin: 0 0 var(--s-3); color: var(--muted); font-weight: 600; }\nh2:first-child, h3:first-child { margin-top: 0; }\n/* абзацы: 12px снизу; внутри карточки отступ между строками задают классы .mt-* */\np { margin: 0 0 var(--s-3); }\np:last-child { margin-bottom: 0; }\n:where(.card) p { margin-bottom: 0; }\n:where(.card) p + p { margin-top: var(--s-3); } /* два абзаца подряд в карточке */\n.row { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; }\n.between { justify-content: space-between; }\n.head { margin-bottom: var(--s-4); min-height: 42px; } /* одинаковая высота шапки страницы с фильтром и без него: заголовок не «прыгает» */\n.filter { width: 210px; }\n.card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: var(--s-4); margin-bottom: var(--s-3); }\n.grid { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); margin-bottom: var(--s-3); }\n.grid .card { margin: 0; }\n.stat b { display: block; font-size: 26px; line-height: 1.2; }\n.stat span { color: var(--muted); font-size: 13px; }\n\ninput, select, textarea { width: 100%; padding: var(--s-2) var(--s-3); border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: inherit; font: inherit; }\ntextarea { min-height: 150px; resize: vertical; }\ninput:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }\nlabel { display: block; font-size: 13px; color: var(--muted); margin: var(--s-3) 0 var(--s-1); }\nlabel:first-child { margin-top: 0; }\nbutton { padding: var(--s-2) var(--s-4); border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: inherit; cursor: pointer; font: inherit; }\nbutton:hover:not(:disabled) { border-color: var(--accent); }\nbutton.primary { background: var(--accent); border-color: var(--accent); color: #fff; }\nbutton.danger { color: var(--bad); }\nbutton:disabled { opacity: .5; cursor: default; }\n\n.badge { padding: 2px 10px; border-radius: 99px; font-size: 12px; background: var(--line); color: var(--muted); white-space: nowrap; }\n.badge.scheduled { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }\n.badge.published { background: color-mix(in srgb, var(--ok) 18%, transparent); color: var(--ok); }\n.badge.failed { background: color-mix(in srgb, var(--bad) 18%, transparent); color: var(--bad); }\n.badge.publishing { background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); }\n.muted { color: var(--muted); }\n.warn { color: var(--warn); }\n.error { color: var(--bad); margin: 0 0 var(--s-3); }\n.pos { color: var(--ok); }\n.post-content { white-space: pre-wrap; overflow-wrap: anywhere; margin: var(--s-2) 0; }\n.thumb { display: block; max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid var(--line); margin: var(--s-2) 0; }\n.actions { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: var(--s-3); }\n.auth-card { max-width: 380px; margin: var(--s-8) auto; }\n.auth-card h1 { margin-bottom: var(--s-3); }\n\n/* вспомогательные отступы (идут после .error и т.п., чтобы переопределять их) */\n.mt-1 { margin-top: var(--s-1); }\n.mt-2 { margin-top: var(--s-2); }\n.mt-3 { margin-top: var(--s-3); }\n.mt-4 { margin-top: var(--s-4); }\n.mt-5 { margin-top: var(--s-5); }\n.mb-3 { margin-bottom: var(--s-3); }\n.ml-2 { margin-left: var(--s-2); }\n.small { font-size: 13px; }\n.section-title { margin: var(--s-5) 0 var(--s-2); }\n.steps { margin: 0; padding-left: var(--s-5); line-height: 1.7; }\n\n/* ---------- таблицы ---------- */\n.table-wrap { overflow-x: auto; }\ntable { width: 100%; border-collapse: collapse; }\nth, td { text-align: left; padding: var(--s-3) var(--s-2); border-bottom: 1px solid var(--line); white-space: nowrap; }\nth { color: var(--muted); font-weight: 500; font-size: 13px; }\ntd.num, th.num { text-align: right; }\ntd .danger { margin-left: var(--s-2); }\n\n/* ---------- графики ---------- */\n.charts { display: grid; gap: var(--s-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); }\n.chart { margin: 0; }\n.bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; }\n.bar { flex: 1; height: 100%; display: flex; align-items: flex-end; }\n.bar span { display: block; width: 100%; min-height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }\n.axis { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: var(--s-2); }\n\n/* ---------- выбор даты и времени ---------- */\n.dt { display: flex; gap: var(--s-2); align-items: center; flex-wrap: wrap; }\n.dt input[type='date'] { flex: 1 1 170px; width: auto; min-width: 0; }\n.dt-time { display: flex; align-items: center; gap: var(--s-2); }\n.dt-time select { width: 78px; }\n.chips { display: flex; gap: var(--s-2); flex-wrap: wrap; margin-top: var(--s-2); }\nbutton.chip { padding: var(--s-1) var(--s-3); border-radius: 99px; font-size: 13px; }\n.dt-summary { margin: var(--s-2) 0 0; font-size: 13px; }\n\n/* ---------- загрузка картинки ---------- */\n.upload { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; margin-top: var(--s-2); }\nlabel.filebtn { position: relative; display: inline-flex; align-items: center; margin: 0; padding: var(--s-2) var(--s-4); border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--text); font-size: 15px; cursor: pointer; }\nlabel.filebtn:hover { border-color: var(--accent); }\nlabel.filebtn:focus-within { outline: 2px solid var(--accent); outline-offset: 1px; }\nlabel.filebtn.busy { opacity: .6; pointer-events: none; }\n.filebtn input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }\n.preview { display: block; max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid var(--line); margin-top: var(--s-3); }\n\n/* ---------- закрепление каналов за пользователями ---------- */\ninput[type='checkbox'] { width: 18px; height: 18px; padding: 0; flex: none; accent-color: var(--accent); }\n.picker { margin-top: var(--s-3); padding: var(--s-4); border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }\n.picker h3 { margin-bottom: var(--s-2); }\nlabel.opt { display: flex; align-items: center; gap: var(--s-3); margin: 0; padding: var(--s-3) var(--s-1); font-size: 15px; color: var(--text); border-bottom: 1px solid var(--line); cursor: pointer; }\nlabel.opt.all { color: var(--muted); }\n.chips-inline { display: inline-flex; flex-wrap: wrap; gap: var(--s-2); vertical-align: middle; }\n.tagchip { padding: 2px 10px; border-radius: 99px; font-size: 12px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }\ntd.wrap { white-space: normal; min-width: 180px; }\n\n/* отступ между кнопками в колонке действий */\ntd.actions-cell button + button { margin-left: var(--s-2); }\n\n/* ---------- skeleton-загрузка ---------- */\n.sk { display: block; border-radius: 6px; background: linear-gradient(90deg, var(--line) 0%, color-mix(in srgb, var(--line) 50%, var(--card)) 50%, var(--line) 100%); background-size: 200% 100%; animation: sk-shimmer 1.4s ease-in-out infinite; }\n@keyframes sk-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }\n@media (prefers-reduced-motion: reduce) { .sk { animation: none; } }\n.sk-row { display: flex; gap: var(--s-4); padding: var(--s-3) var(--s-2); border-bottom: 1px solid var(--line); }\n.sk-row:last-child { border-bottom: 0; }\n.sk-cell { flex: 1; min-width: 0; }\n\n/* ---------- руководство пользователя ---------- */\n.guide { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: var(--s-5); align-items: start; }\n.guide-body > .card:last-child { margin-bottom: 0; }\n.guide-section { scroll-margin-top: calc(var(--header-h) + var(--s-4)); }\n\n/* содержание: слева, закреплено при прокрутке; на узких экранах сворачивается */\n.toc { position: sticky; top: calc(var(--header-h) + var(--s-4)); margin: 0; padding: var(--s-2); max-height: calc(100dvh - var(--header-h) - 2 * var(--s-4)); overflow-y: auto; }\n.toc summary { display: flex; align-items: center; justify-content: space-between; padding: var(--s-2) var(--s-3); font-size: 14px; font-weight: 600; color: var(--muted); list-style: none; pointer-events: none; }\n.toc summary::-webkit-details-marker { display: none; }\n.toc summary::after { content: ''; display: none; width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); transition: transform .15s ease; }\n.toc[open] summary::after { transform: rotate(-135deg); }\n.toc ul { margin: 0; padding: 0; list-style: none; }\n.toc li + li { margin-top: var(--s-1); }\n.toc a { display: block; padding: var(--s-2) var(--s-3); border-radius: 8px; color: var(--muted); text-decoration: none; }\n.toc a:hover { background: color-mix(in srgb, var(--line) 55%, transparent); color: var(--text); }\n.toc a.active { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-weight: 600; }\n\n/* текст разделов: единый вертикальный ритм */\n:where(.prose) :is(ul, ol, dl) { margin: 0; }\n.prose > * + * { margin-top: var(--s-3); }\n.prose > h3 { margin: var(--s-5) 0 0; font-size: 15px; color: var(--text); }\n.prose > h3 + * { margin-top: var(--s-2); }\n.prose ul, .prose ol { padding-left: var(--s-5); }\n.prose li + li { margin-top: var(--s-1); }\n.prose a { color: var(--accent); }\ncode { padding: 1px 6px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); font-size: 13px; }\n\n.callout { padding: var(--s-3) var(--s-4); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; background: color-mix(in srgb, var(--accent) 8%, transparent); }\n.callout.callout-warn { border-left-color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); }\n\n.prose .guide-steps { padding-left: 0; list-style: none; counter-reset: step; display: grid; gap: var(--s-3); }\n.prose .guide-steps > li { position: relative; min-height: 28px; padding-left: calc(28px + var(--s-3)); counter-increment: step; }\n.prose .guide-steps > li + li { margin-top: 0; }\n.prose .guide-steps > li::before { content: counter(step); position: absolute; left: 0; top: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-size: 13px; font-weight: 600; }\n\n.defs { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--s-3) var(--s-4); align-items: baseline; }\n.defs dt, .defs dd { margin: 0; }\n.defs dd { color: var(--muted); }\n.faq dt { font-weight: 600; }\n.faq dd { margin: var(--s-1) 0 0; color: var(--muted); }\n.faq dd + dt { margin-top: var(--s-4); }\n\n/* ---------- планшеты и телефоны ---------- */\n@media (max-width: 980px) {\n  :root { --gutter: 16px; }\n  .guide { grid-template-columns: minmax(0, 1fr); gap: var(--s-4); }\n  .toc { position: static; max-height: none; overflow: visible; }\n  .toc summary { cursor: pointer; pointer-events: auto; }\n  .toc summary::after { display: block; }\n  .toc[open] summary { margin-bottom: var(--s-1); }\n}\n\n/* ---------- телефоны ---------- */\n@media (max-width: 640px) {\n  main { margin: var(--s-4) auto; padding: 0 var(--gutter) var(--s-6); }\n  h1 { font-size: 20px; }\n  .brand { font-size: 16px; }\n  .defs { grid-template-columns: minmax(0, 1fr); gap: var(--s-1); }\n  .defs dd { margin-bottom: var(--s-2); }\n  .defs dd:last-child { margin-bottom: 0; }\n  input, select, textarea { font-size: 16px; line-height: 1.5; } /* iOS не приближает страницу при фокусе */\n  button { min-height: 42px; }\n  button.chip { min-height: 34px; }\n\n  .head { flex-direction: column; align-items: stretch; min-height: 0; }\n  .head > .row { width: 100%; }\n  .head .filter { width: 100%; flex: 1 1 100%; }\n  .head .row > button { flex: 1 1 100%; }\n\n  .actions > button, .actions > a, .actions > .sk { flex: 1 1 auto; }\n  .actions > a { display: flex; }\n  .actions > a button { width: 100%; }\n  .auth-card { margin: var(--s-5) auto; }\n  .dt-time { flex: 1 1 100%; }\n  .dt-time select { flex: 1; width: auto; }\n  .upload > * { flex: 1 1 auto; }\n  label.filebtn { justify-content: center; }\n\n  /* таблицы превращаются в список карточек */\n  table.stack, table.stack tbody, table.stack tr, table.stack td { display: block; width: 100%; }\n  table.stack thead { display: none; }\n  table.stack tr { padding: var(--s-3) 0; border-bottom: 1px solid var(--line); }\n  table.stack tr:last-child { border-bottom: 0; }\n  table.stack td { display: flex; justify-content: space-between; align-items: center; gap: var(--s-4); padding: var(--s-1) 0; border: 0; white-space: normal; text-align: right; }\n  table.stack td::before { content: attr(data-label); color: var(--muted); text-align: left; flex-shrink: 0; }\n  table.stack td.actions-cell { justify-content: flex-end; flex-wrap: wrap; gap: var(--s-2); padding-top: var(--s-2); }\n  table.stack td.actions-cell::before { display: none; }\n  table.stack td .danger { margin-left: 0; }\n  table.stack td select { max-width: 60%; }\n  table.stack td.actions-cell button + button { margin-left: 0; }\n}\n",
  "parserMarker": "/* ---------- парсер ---------- */",
  "origSha": "92165d565a5880b54c0c847869c8abdd0261a7ce12264e50436112931b848190",
  "parserBlock": "/* ---------- парсер ---------- */\n.src-row { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-3) var(--s-1); border-bottom: 1px solid var(--line); }\n.src-row label { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--s-3); margin: 0; font-size: 15px; color: var(--text); cursor: pointer; }\n.src-row .src-info { min-width: 0; overflow-wrap: anywhere; }\n.src-row .src-info .error { display: block; margin: var(--s-1) 0 0; font-size: 13px; }\nbutton.link { min-height: 0; padding: 0; border: 0; background: none; color: var(--accent); font-size: 14px; }\n.pre-line { white-space: pre-line; }\n.parse-bar { display: flex; gap: var(--s-3); align-items: center; flex-wrap: wrap; margin-top: var(--s-3); }\n.parse-bar select { width: auto; min-width: 190px; }\n@media (max-width: 640px) {\n  .src-row { align-items: flex-start; }\n  .parse-bar select, .parse-bar button { flex: 1 1 100%; }\n}\n",
  "parserOrig": "/* ---------- парсер ---------- */\n.src-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--line); }\n.src-row label { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; margin: 0; font-size: 15px; color: var(--text); cursor: pointer; }\n.src-row .src-info { min-width: 0; overflow-wrap: anywhere; }\n.src-row .src-info .error { display: block; margin: 2px 0 0; font-size: 13px; }\nbutton.link { min-height: 0; padding: 0; border: 0; background: none; color: var(--accent); font-size: 14px; }\n.pre-line { white-space: pre-line; }\n.parse-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 12px; }\n.parse-bar select { width: auto; min-width: 190px; }\n@media (max-width: 640px) {\n  .src-row { align-items: flex-start; }\n  .parse-bar select, .parse-bar button { flex: 1 1 100%; }\n}"
 }
}

const LEGACY = '.ui-polish-backup'
const BACKUP = '.ui-polish-backup-v2'

if (!existsSync('nuxt.config.ts') || !existsSync('pages') || !existsSync('assets/main.css')) {
  console.error('Запустите скрипт из корня проекта (там, где nuxt.config.ts).')
  process.exit(1)
}

const read = (p) => readFileSync(p, 'utf8')
const firstRun = !existsSync(BACKUP)
let failed = 0

function save(path, text, note) {
  if (existsSync(path)) {
    const bak = join(BACKUP, path)
    if (!existsSync(bak)) {
      mkdirSync(dirname(bak), { recursive: true })
      copyFileSync(path, bak)
    }
  }
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  console.log(`  обновлён: ${path}${note ? ` (${note})` : ''}`)
}

// источник: при первом запуске — версия из .ui-polish-backup (до затирания), иначе текущий файл
function source(path) {
  const legacy = join(LEGACY, path)
  if (firstRun && existsSync(legacy)) return { text: read(legacy), note: 'восстановлен из ' + LEGACY }
  return existsSync(path) ? { text: read(path), note: '' } : null
}

// ---------- страницы и компоненты с точечными правками ----------
for (const [path, spec] of Object.entries(DATA.files)) {
  const src = source(path)
  if (!src) {
    console.log(`  пропущен (файла нет): ${path}`)
    continue
  }
  let text = src.text
  if (text.includes(spec.marker)) {
    console.log(`  уже применено: ${path}`)
    continue
  }
  let ok = true
  for (const [oldStr, newStr] of spec.edits) {
    const n = text.split(oldStr).length - 1
    if (n !== 1) {
      console.warn(`  ВНИМАНИЕ ${path}: не найден (или найден ${n} раз) фрагмент «${oldStr.slice(0, 60).replace(/\n/g, '⏎')}…» — файл не изменён`)
      ok = false
      break
    }
    text = text.replace(oldStr, () => newStr)
  }
  if (ok) save(path, text, src.note)
  else failed++
}

// ---------- новые компоненты skeleton (наши собственные файлы) ----------
for (const [path, text] of Object.entries(DATA.components)) {
  if (existsSync(path) && read(path) === text) console.log(`  без изменений: ${path}`)
  else save(path, text)
}

// ---------- CSS: перенос стилей парсера и новая шкала отступов ----------
{
  const path = 'assets/main.css'
  const src = source(path)
  const css = DATA.css
  if (src.text.includes('--s-1:')) {
    // уже новая шкала: обновляем только нашу часть, блок парсера сохраняем
    const idx = src.text.indexOf(css.parserMarker)
    const parser = idx >= 0 ? src.text.slice(idx) : css.parserBlock
    const next = css.new + '\n' + parser
    if (next === src.text) console.log(`  без изменений: ${path}`)
    else save(path, next)
  } else {
    const idx = src.text.indexOf(css.parserMarker)
    const head = idx >= 0 ? src.text.slice(0, idx) : src.text
    const sha = createHash('sha256').update(head.trim()).digest('hex')
    if (sha !== css.origSha) {
      console.warn(`  ВНИМАНИЕ ${path}: в нём есть ваши правки помимо блока парсера — файл не изменён. Пришлите его, и я перенесу стили вручную.`)
      failed++
    } else {
      const tail = idx >= 0 ? src.text.slice(idx) : ''
      const parser = !tail || tail.trim() === css.parserOrig ? css.parserBlock : tail
      save(path, css.new + '\n' + parser, src.note)
    }
  }
}

console.log(failed ? `\nГотово с предупреждениями (${failed}): см. сообщения ВНИМАНИЕ выше.` : '\nГотово. Пересоберите приложение и проверьте страницы.')
process.exit(failed ? 2 : 0)
