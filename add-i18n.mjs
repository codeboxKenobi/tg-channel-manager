#!/usr/bin/env node
// Многоязычность интерфейса: английский язык, переключатель языка в профиле и раздел в руководстве.
//
// Запуск из корня проекта:   node add-i18n.mjs            (применить)
//                            node add-i18n.mjs --dry-run  (только проверить, ничего не менять)
//                            node add-i18n.mjs --force    (перезаписать pages/guide.vue, даже если он изменён)
//
// Что делает:
//   • locales/ru.ts, locales/en.ts — тексты интерфейса, locales/server-errors.ts — перевод сообщений сервера;
//   • composables/useLocale.ts — выбор языка, t(), форматы дат и чисел; components/LangSwitch.vue — переключатель;
//   • все страницы и компоненты берут тексты из словаря, форматы дат и чисел зависят от языка;
//   • язык хранится в аккаунте: колонка users.lang (добавляется при старте сервера), PUT /api/auth/lang;
//   • переключатель — в «Профиле» (блок «Язык интерфейса») и кнопками RU/EN на страницах входа и регистрации;
//   • руководство: components/GuideRu.vue и GuideEn.vue, новый раздел «Язык интерфейса», вопросы в «Частых вопросах».
//
// Скрипт безопасен: сначала проверяет все правки, и если хоть одна не подходит, ничего не меняет.
// Перед первым изменением файла рядом сохраняется копия *.bak-i18n. Повторный запуск ничего не ломает.
// После применения перезапустите сервер (npm run dev / pm2 restart): миграция users.lang выполнится при старте.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DATA = {
 "edits": [
  {
   "file": "app.vue",
   "hunks": [
    {
     "old": "<script setup lang=\"ts\">\nconst { user, isAdmin, logout } = useAuth()",
     "new": "<script setup lang=\"ts\">\nconst { user, isAdmin, logout } = useAuth()\nconst { t, locale } = useLocale()\n// заголовок вкладки и атрибут lang страницы следуют за языком интерфейса\nuseHead(computed(() => ({ title: t('app.name'), htmlAttrs: { lang: locale.value } })))",
     "count": 1
    },
    {
     "old": "aria-label=\"Меню\" @click=\"menuOpen = !menuOpen\">",
     "new": ":aria-label=\"t('nav.menu')\" @click=\"menuOpen = !menuOpen\">",
     "count": 1
    },
    {
     "old": "<div class=\"brand\">Менеджер каналов</div>",
     "new": "<div class=\"brand\">{{ t('app.name') }}</div>",
     "count": 1
    },
    {
     "old": "<button type=\"button\" @click=\"out\">Выйти</button>",
     "new": "<button type=\"button\" @click=\"out\">{{ t('nav.logout') }}</button>",
     "count": 1
    },
    {
     "old": "aria-label=\"Разделы\" @click=\"menuOpen = false\">\n          <NuxtLink to=\"/\">Каналы</NuxtLink>\n          <NuxtLink to=\"/parser\">Парсер</NuxtLink>\n          <NuxtLink to=\"/drafts\">Подготовка постов</NuxtLink>\n          <NuxtLink to=\"/published\">Опубликованные</NuxtLink>\n          <NuxtLink to=\"/metrics\">Метрики</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/bot\">Бот</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/users\">Пользователи</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">Руководство пользователя</NuxtLink>\n          <NuxtLink to=\"/support\">Поддержать проект</NuxtLink>",
     "new": ":aria-label=\"t('nav.sections')\" @click=\"menuOpen = false\">\n          <NuxtLink to=\"/\">{{ t('nav.channels') }}</NuxtLink>\n          <NuxtLink to=\"/parser\">{{ t('nav.parser') }}</NuxtLink>\n          <NuxtLink to=\"/drafts\">{{ t('nav.drafts') }}</NuxtLink>\n          <NuxtLink to=\"/published\">{{ t('nav.published') }}</NuxtLink>\n          <NuxtLink to=\"/metrics\">{{ t('nav.metrics') }}</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/bot\">{{ t('nav.bot') }}</NuxtLink>\n          <NuxtLink v-if=\"isAdmin\" to=\"/users\">{{ t('nav.users') }}</NuxtLink>\n          <hr class=\"menu-sep\" />\n          <NuxtLink to=\"/guide\">{{ t('nav.guide') }}</NuxtLink>\n          <NuxtLink to=\"/support\">{{ t('nav.support') }}</NuxtLink>",
     "count": 1
    }
   ]
  },
  {
   "file": "composables/useAuth.ts",
   "hunks": [
    {
     "old": "  is_super?: boolean\n}",
     "new": "  is_super?: boolean\n  lang?: Locale\n}",
     "count": 1
    },
    {
     "old": "export interface AuthUser {",
     "new": "import type { Locale } from './useLocale'\n\nexport interface AuthUser {",
     "count": 1
    },
    {
     "old": "  const isSuper = computed(() => Boolean(user.value?.is_super))",
     "new": "  const isSuper = computed(() => Boolean(user.value?.is_super))\n  const { locale, isLocale, applyLocale, picked } = useLocale()\n\n  // Язык аккаунта применяется при входе. Исключение: язык, который человек сам выбрал на странице входа, сохраняется в аккаунт.\n  async function adoptLang(u: AuthUser | null) {\n    if (!u) return\n    if (picked.value && u.lang !== locale.value) {\n      user.value = { ...u, lang: locale.value }\n      await api('/auth/lang', { method: 'PUT', body: { lang: locale.value } }).catch(() => {})\n    } else if (u.lang && isLocale(u.lang)) {\n      applyLocale(u.lang)\n    }\n    picked.value = false\n  }\n  // Смена языка в профиле: интерфейс переключается сразу, потом язык сохраняется в аккаунте\n  async function changeLang(lang: string) {\n    if (!isLocale(lang)) return\n    applyLocale(lang)\n    picked.value = false\n    await api('/auth/lang', { method: 'PUT', body: { lang } })\n    if (user.value) user.value = { ...user.value, lang }\n  }",
     "count": 1
    },
    {
     "old": "    user.value = r.user\n    needsSetup.value = r.needsSetup",
     "new": "    user.value = r.user\n    if (r.user?.lang && isLocale(r.user.lang)) applyLocale(r.user.lang)\n    needsSetup.value = r.needsSetup",
     "count": 1
    },
    {
     "old": "    user.value = (await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, ...(await sealFields({ password })) } })).user\n  }",
     "new": "    user.value = (await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, ...(await sealFields({ password })) } })).user\n    await adoptLang(user.value)\n  }",
     "count": 1
    },
    {
     "old": "    user.value = (await api<{ user: AuthUser }>('/auth/setup', { method: 'POST', body: { email, name, ...(await sealFields({ password })) } })).user\n    needsSetup.value = false",
     "new": "    user.value = (await api<{ user: AuthUser }>('/auth/setup', { method: 'POST', body: { email, name, lang: locale.value, ...(await sealFields({ password })) } })).user\n    picked.value = false\n    needsSetup.value = false",
     "count": 1
    },
    {
     "old": "    user.value = (await api<{ user: AuthUser }>('/auth/register', { method: 'POST', body: { email, name, ...(await sealFields({ password, code })) } })).user",
     "new": "    user.value = (await api<{ user: AuthUser }>('/auth/register', { method: 'POST', body: { email, name, lang: locale.value, ...(await sealFields({ password, code })) } })).user\n    picked.value = false",
     "count": 1
    },
    {
     "old": "  return { user, needsSetup, registration, isAdmin, isSuper, fetchMe, login, setup, register, logout }",
     "new": "  return { user, needsSetup, registration, isAdmin, isSuper, fetchMe, login, setup, register, logout, changeLang }",
     "count": 1
    }
   ]
  },
  {
   "file": "composables/useApi.ts",
   "hunks": [
    {
     "old": "      throw new Error(e?.data?.error || e.message || 'Ошибка запроса')",
     "new": "      const { t, tServer } = useLocale()\n      throw new Error(tServer(e?.data?.error) || e.message || t('common.requestError'))",
     "count": 1
    }
   ]
  },
  {
   "file": "utils/format.ts",
   "hunks": [
    {
     "old": "export const fmtDate = (d?: string | null) =>\n  d ? new Date(d).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'\n\nexport const fmtNum = (n?: number | null) => new Intl.NumberFormat('ru-RU').format(n ?? 0)",
     "new": "import { useLocale } from '../composables/useLocale'\n\n// Формат даты и чисел зависит от языка интерфейса (ru-RU / en-GB)\nexport const fmtDate = (d?: string | null) =>\n  d ? new Date(d).toLocaleString(useLocale().intlLocale.value, { dateStyle: 'medium', timeStyle: 'short' }) : '—'\n\nexport const fmtNum = (n?: number | null) => new Intl.NumberFormat(useLocale().intlLocale.value).format(n ?? 0)",
     "count": 1
    }
   ]
  },
  {
   "file": "components/AppDialog.vue",
   "hunks": [
    {
     "old": "const { current, close } = useDialog()",
     "new": "const { current, close } = useDialog()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "current.opts.confirmText ?? 'Подтвердить'",
     "new": "current.opts.confirmText ?? t('common.confirm')",
     "count": 1
    },
    {
     "old": "current.opts.cancelText ?? 'Отмена'",
     "new": "current.opts.cancelText ?? t('common.cancel')",
     "count": 1
    }
   ]
  },
  {
   "file": "components/AuthBrand.vue",
   "hunks": [
    {
     "old": "<template>\n  <div class=\"auth-brand\">\n    <img src=\"/logo.png\" alt=\"\" class=\"auth-logo\" />\n    <span>Менеджер каналов</span>",
     "new": "<script setup lang=\"ts\">\nconst { t } = useLocale()\n</script>\n\n<template>\n  <div class=\"auth-brand\">\n    <img src=\"/logo.png\" alt=\"\" class=\"auth-logo\" />\n    <span>{{ t('app.name') }}</span>",
     "count": 1
    }
   ]
  },
  {
   "file": "components/BarChart.vue",
   "hunks": [
    {
     "old": "const min = computed(",
     "new": "const { t } = useLocale()\nconst min = computed(",
     "count": 1
    },
    {
     "old": "<p v-if=\"!items.length\" class=\"muted\">Данных пока нет</p>",
     "new": "<p v-if=\"!items.length\" class=\"muted\">{{ t('chart.empty') }}</p>",
     "count": 1
    }
   ]
  },
  {
   "file": "components/AccessPicker.vue",
   "hunks": [
    {
     "old": "const emit = defineEmits<{ save: [ids: number[]]; cancel: [] }>()",
     "new": "const emit = defineEmits<{ save: [ids: number[]]; cancel: [] }>()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "<span>Выбрать все</span>",
     "new": "<span>{{ t('common.selectAll') }}</span>",
     "count": 1
    },
    {
     "old": "@click=\"emit('save', picked)\">Сохранить</button>\n      <button type=\"button\" @click=\"emit('cancel')\">Отмена</button>",
     "new": "@click=\"emit('save', picked)\">{{ t('common.save') }}</button>\n      <button type=\"button\" @click=\"emit('cancel')\">{{ t('common.cancel') }}</button>",
     "count": 1
    }
   ]
  },
  {
   "file": "components/DateTimePicker.vue",
   "hunks": [
    {
     "old": "const pad = (n: number) => String(n).padStart(2, '0')",
     "new": "const { t, intlLocale } = useLocale()\nconst pad = (n: number) => String(n).padStart(2, '0')",
     "count": 1
    },
    {
     "old": "toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'short' })",
     "new": "toLocaleString(intlLocale.value, { dateStyle: 'full', timeStyle: 'short' })",
     "count": 1
    },
    {
     "old": "aria-label=\"Дата публикации\"",
     "new": ":aria-label=\"t('dt.dateAria')\"",
     "count": 1
    },
    {
     "old": "aria-label=\"Часы\" :disabled=\"!state.date\">\n          <option value=\"\" disabled>чч</option>",
     "new": ":aria-label=\"t('dt.hoursAria')\" :disabled=\"!state.date\">\n          <option value=\"\" disabled>{{ t('dt.hh') }}</option>",
     "count": 1
    },
    {
     "old": "aria-label=\"Минуты\" :disabled=\"!state.date\">\n          <option value=\"\" disabled>мм</option>",
     "new": ":aria-label=\"t('dt.minutesAria')\" :disabled=\"!state.date\">\n          <option value=\"\" disabled>{{ t('dt.mm') }}</option>",
     "count": 1
    },
    {
     "old": "@click=\"preset('hour')\">Через час</button>\n      <button type=\"button\" class=\"chip\" @click=\"preset('evening')\">Сегодня в 18:00</button>\n      <button type=\"button\" class=\"chip\" @click=\"preset('morning')\">Завтра в 9:00</button>\n      <button v-if=\"state.date\" type=\"button\" class=\"chip\" @click=\"load(null)\">Очистить</button>",
     "new": "@click=\"preset('hour')\">{{ t('dt.inHour') }}</button>\n      <button type=\"button\" class=\"chip\" @click=\"preset('evening')\">{{ t('dt.today18') }}</button>\n      <button type=\"button\" class=\"chip\" @click=\"preset('morning')\">{{ t('dt.tomorrow9') }}</button>\n      <button v-if=\"state.date\" type=\"button\" class=\"chip\" @click=\"load(null)\">{{ t('dt.clear') }}</button>",
     "count": 1
    },
    {
     "old": "{{ inPast ? 'Время уже прошло: пост опубликуется в течение минуты. ' : 'Опубликуется: ' }}{{ summary }}",
     "new": "{{ inPast ? t('dt.pastWarn') : t('dt.willPublish') }} {{ summary }}",
     "count": 1
    }
   ]
  },
  {
   "file": "utils/upload.ts",
   "hunks": [
    {
     "old": "/** Лимит Telegram для бота при отправке файла (видео). Совпадает с серверным. */",
     "new": "import { useLocale } from '../composables/useLocale'\n\n/** Лимит Telegram для бота при отправке файла (видео). Совпадает с серверным. */",
     "count": 1
    },
    {
     "old": "    const fail = (message: string, status?: number) => reject(",
     "new": "    const { t, tServer } = useLocale()\n    const fail = (message: string, status?: number) => reject(",
     "count": 1
    },
    {
     "old": "      if (data?.error) return fail(data.error, xhr.status)\n      if (xhr.status === 413) return fail('Файл отклонен как слишком большой.', 413)\n      if (xhr.status === 401) return fail('Сессия истекла. Войдите заново', 401)\n      fail(`Не удалось загрузить файл (код ${xhr.status})`, xhr.status)\n    }\n    xhr.onerror = () => fail('Не удалось загрузить файл: проблема с соединением')\n    xhr.ontimeout = () => fail('Загрузка заняла слишком много времени')\n    xhr.onabort = () => fail('Загрузка прервана')",
     "new": "      if (data?.error) return fail(tServer(data.error), xhr.status)\n      if (xhr.status === 413) return fail(t('upload.err.tooBig'), 413)\n      if (xhr.status === 401) return fail(t('upload.err.session'), 401)\n      fail(t('upload.err.failed', { status: xhr.status }), xhr.status)\n    }\n    xhr.onerror = () => fail(t('upload.err.network'))\n    xhr.ontimeout = () => fail(t('upload.err.timeout'))\n    xhr.onabort = () => fail(t('upload.err.aborted'))",
     "count": 1
    }
   ]
  },
  {
   "file": "utils/image.ts",
   "hunks": [
    {
     "old": "/** Уменьшает фото до maxSide пикселей по длинной стороне и сжимает в JPEG (быстрее загрузка, нет проблем с лимитами). */",
     "new": "import { useLocale } from '../composables/useLocale'\n\n/** Уменьшает фото до maxSide пикселей по длинной стороне и сжимает в JPEG (быстрее загрузка, нет проблем с лимитами). */",
     "count": 1
    },
    {
     "old": "  if (!file.type.startsWith('image/')) throw new Error('Выберите файл изображения')",
     "new": "  const { t } = useLocale()\n  if (!file.type.startsWith('image/')) throw new Error(t('image.err.notImage'))",
     "count": 1
    },
    {
     "old": "throw new Error('Не удалось прочитать изображение. Попробуйте JPEG, PNG или WebP')",
     "new": "throw new Error(t('image.err.unreadable'))",
     "count": 1
    },
    {
     "old": "reject(new Error('Не удалось обработать изображение'))",
     "new": "reject(new Error(t('image.err.processing')))",
     "count": 1
    }
   ]
  },
  {
   "file": "utils/sealed.ts",
   "hunks": [
    {
     "old": "// Шифрование паролей перед отправкой: RSA-OAEP (SHA-256) публичным ключом сервера.",
     "new": "import { useLocale } from '../composables/useLocale'\n\n// Шифрование паролей перед отправкой: RSA-OAEP (SHA-256) публичным ключом сервера.",
     "count": 1
    },
    {
     "old": "throw new Error('Сообщение слишком длинное для RSA-блока')",
     "new": "throw new Error(useLocale().t('sealed.err.tooLong'))",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/login.vue",
   "hunks": [
    {
     "old": "<script setup lang=\"ts\">\nconst { needsSetup, login, setup, registration } = useAuth()",
     "new": "<script setup lang=\"ts\">\nconst { needsSetup, login, setup, registration } = useAuth()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "    <AuthBrand />\n    <h1>{{ needsSetup ? 'Создание администратора' : 'Вход' }}</h1>\n    <p v-if=\"needsSetup\" class=\"muted\">Пользователей пока нет. Эта учётная запись станет администратором.</p>\n\n    <label>Email</label>",
     "new": "    <LangSwitch variant=\"buttons\" />\n    <AuthBrand />\n    <h1>{{ needsSetup ? t('login.titleSetup') : t('login.title') }}</h1>\n    <p v-if=\"needsSetup\" class=\"muted\">{{ t('login.noUsers') }}</p>\n\n    <label>{{ t('field.email') }}</label>",
     "count": 1
    },
    {
     "old": "      <label>Имя</label>",
     "new": "      <label>{{ t('field.name') }}</label>",
     "count": 1
    },
    {
     "old": "    <label>Пароль{{ needsSetup ? ' (не короче 8 символов)' : '' }}</label>",
     "new": "    <label>{{ needsSetup ? t('field.passwordMin') : t('field.password') }}</label>",
     "count": 1
    },
    {
     "old": "{{ needsSetup ? 'Создать и войти' : 'Войти' }}",
     "new": "{{ needsSetup ? t('login.createAndSignIn') : t('login.submit') }}",
     "count": 1
    },
    {
     "old": "      Нет аккаунта? <NuxtLink to=\"/register\">Зарегистрироваться</NuxtLink>",
     "new": "      {{ t('login.noAccount') }} <NuxtLink to=\"/register\">{{ t('login.register') }}</NuxtLink>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/register.vue",
   "hunks": [
    {
     "old": "<script setup lang=\"ts\">\nconst { registration, register } = useAuth()",
     "new": "<script setup lang=\"ts\">\nconst { registration, register } = useAuth()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "error.value = 'Пароли не совпадают'",
     "new": "error.value = t('register.mismatch')",
     "count": 1
    },
    {
     "old": "    <AuthBrand />",
     "new": "    <LangSwitch variant=\"buttons\" />\n    <AuthBrand />",
     "count": 2
    },
    {
     "old": "<h1>Регистрация</h1>\n    <p class=\"muted\">\n      Вы получите собственное изолированное пространство: свои каналы, редакторов и источники парсера.\n      Публиковать посты будет ваш бот, токен которого вы подключите после регистрации.\n    </p>\n\n    <label>Email</label>",
     "new": "<h1>{{ t('register.title') }}</h1>\n    <p class=\"muted\">{{ t('register.intro') }}</p>\n\n    <label>{{ t('field.email') }}</label>",
     "count": 1
    },
    {
     "old": "    <label>Имя</label>\n    <input v-model=\"name\" required autocomplete=\"name\" />\n\n    <label>Пароль (не короче 8 символов)</label>",
     "new": "    <label>{{ t('field.name') }}</label>\n    <input v-model=\"name\" required autocomplete=\"name\" />\n\n    <label>{{ t('field.passwordMin') }}</label>",
     "count": 1
    },
    {
     "old": "    <label>Повторите пароль</label>",
     "new": "    <label>{{ t('field.repeatPassword') }}</label>",
     "count": 1
    },
    {
     "old": "      <label>Код приглашения</label>",
     "new": "      <label>{{ t('field.inviteCode') }}</label>",
     "count": 1
    },
    {
     "old": "{{ busy ? 'Создаю…' : 'Зарегистрироваться' }}",
     "new": "{{ busy ? t('register.busy') : t('register.submit') }}",
     "count": 1
    },
    {
     "old": "    <p class=\"muted mt-4\">Уже есть аккаунт? <NuxtLink to=\"/login\">Войти</NuxtLink></p>",
     "new": "    <p class=\"muted mt-4\">{{ t('register.haveAccount') }} <NuxtLink to=\"/login\">{{ t('login.submit') }}</NuxtLink></p>",
     "count": 1
    },
    {
     "old": "    <h1>Регистрация</h1>\n    <p class=\"muted\">Самостоятельная регистрация отключена. Попросите администратора создать для вас аккаунт.</p>\n    <p class=\"muted\"><NuxtLink to=\"/login\">Войти</NuxtLink></p>",
     "new": "    <h1>{{ t('register.title') }}</h1>\n    <p class=\"muted\">{{ t('register.disabled') }}</p>\n    <p class=\"muted\"><NuxtLink to=\"/login\">{{ t('login.submit') }}</NuxtLink></p>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/index.vue",
   "hunks": [
    {
     "old": "const { isAdmin } = useAuth()",
     "new": "const { isAdmin } = useAuth()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "    title: 'Удалить канал?',\n    message: `Канал «${c.title}» будет удалён вместе со всеми его постами.`,\n    confirmText: 'Удалить',",
     "new": "    title: t('channels.deleteTitle'),\n    message: t('channels.deleteMsg', { title: c.title }),\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "<h1>Каналы</h1>",
     "new": "<h1>{{ t('channels.title') }}</h1>",
     "count": 1
    },
    {
     "old": "      <h3>Подключить канал</h3>\n      <p class=\"muted mb-3\">\n        Добавьте бота администратором канала с правом публикации, затем укажите @username или числовой id канала.\n      </p>\n      <div class=\"row\">\n        <input v-model=\"chat\" required placeholder=\"@my_channel или -1001234567890\" style=\"flex: 2; min-width: 220px\" />\n        <input v-model=\"title\" placeholder=\"Название (если бот не подключён к API)\" style=\"flex: 2; min-width: 220px\" />\n        <button class=\"primary\" :disabled=\"busy\">Подключить</button>",
     "new": "      <h3>{{ t('channels.connectTitle') }}</h3>\n      <p class=\"muted mb-3\">{{ t('channels.connectHint') }}</p>\n      <div class=\"row\">\n        <input v-model=\"chat\" required :placeholder=\"t('channels.chatPlaceholder')\" style=\"flex: 2; min-width: 220px\" />\n        <input v-model=\"title\" :placeholder=\"t('channels.titlePlaceholder')\" style=\"flex: 2; min-width: 220px\" />\n        <button class=\"primary\" :disabled=\"busy\">{{ t('channels.connect') }}</button>",
     "count": 1
    },
    {
     "old": "      {{ isAdmin ? 'Каналов пока нет. Подключите первый выше.' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}",
     "new": "      {{ isAdmin ? t('channels.emptyAdmin') : t('channels.emptyEditor') }}",
     "count": 1
    },
    {
     "old": "{{ c.username ? '@' + c.username : 'приватный канал' }}</span>\n          <span v-if=\"!c.is_active\" class=\"badge ml-2\">Отключён</span>\n        </div>\n        <div class=\"muted\">{{ fmtNum(c.subscribers_count) }} подписчиков</div>",
     "new": "{{ c.username ? '@' + c.username : t('channels.private') }}</span>\n          <span v-if=\"!c.is_active\" class=\"badge ml-2\">{{ t('channels.disabled') }}</span>\n        </div>\n        <div class=\"muted\">{{ t('channels.subscribers', { n: fmtNum(c.subscribers_count) }, c.subscribers_count) }}</div>",
     "count": 1
    },
    {
     "old": "        Опубликовано: <b>{{ c.published_count }}</b> · В подготовке: <b>{{ c.pending_count }}</b>",
     "new": "        {{ t('channels.published') }}: <b>{{ c.published_count }}</b> · {{ t('channels.pending') }}: <b>{{ c.pending_count }}</b>",
     "count": 1
    },
    {
     "old": "        Доступ:\n        <span v-if=\"!c.assigned_users.length\">только администраторы</span>",
     "new": "        {{ t('channels.access') }}:\n        <span v-if=\"!c.assigned_users.length\">{{ t('channels.adminsOnly') }}</span>",
     "count": 1
    },
    {
     "old": "@click=\"refresh(c)\">Обновить данные</button>",
     "new": "@click=\"refresh(c)\">{{ t('channels.refresh') }}</button>",
     "count": 1
    },
    {
     "old": "@click=\"accessFor = accessFor === c.id ? null : c.id\">Доступ</button>\n        <button v-if=\"isAdmin\" :disabled=\"busy\" @click=\"toggle(c)\">{{ c.is_active ? 'Отключить публикации' : 'Включить публикации' }}</button>\n        <button v-if=\"isAdmin\" class=\"danger\" :disabled=\"busy\" @click=\"remove(c)\">Удалить</button>",
     "new": "@click=\"accessFor = accessFor === c.id ? null : c.id\">{{ t('channels.access') }}</button>\n        <button v-if=\"isAdmin\" :disabled=\"busy\" @click=\"toggle(c)\">{{ c.is_active ? t('channels.disablePosting') : t('channels.enablePosting') }}</button>\n        <button v-if=\"isAdmin\" class=\"danger\" :disabled=\"busy\" @click=\"remove(c)\">{{ t('common.delete') }}</button>",
     "count": 1
    },
    {
     "old": "        title=\"Кому доступен канал\"",
     "new": "        :title=\"t('channels.accessTitle')\"",
     "count": 1
    },
    {
     "old": "        empty=\"Редакторов пока нет. Добавьте их на странице «Пользователи».\"",
     "new": "        :empty=\"t('channels.noEditors')\"",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/drafts.vue",
   "hunks": [
    {
     "old": "const { isAdmin } = useAuth()",
     "new": "const { isAdmin } = useAuth()\nconst { t, tServer } = useLocale()",
     "count": 1
    },
    {
     "old": "\nconst STATUS: Record<string, string> = {\n  draft: 'Черновик',\n  scheduled: 'В графике',\n  publishing: 'Публикуется',\n  failed: 'Ошибка публикации',\n}\n",
     "new": "",
     "count": 1
    },
    {
     "old": "    title: 'Опубликовать пост?',\n    message: `Пост «${p.title}» будет сразу опубликован в канале «${p.channel_title}».`,\n    confirmText: 'Опубликовать',",
     "new": "    title: t('drafts.publishTitle'),\n    message: t('drafts.publishMsg', { title: p.title, channel: p.channel_title }),\n    confirmText: t('drafts.publishConfirm'),",
     "count": 1
    },
    {
     "old": "    title: 'Удалить пост?',\n    message: `Пост «${p.title}» будет удалён.`,\n    confirmText: 'Удалить',",
     "new": "    title: t('drafts.deleteTitle'),\n    message: t('drafts.deleteMsg', { title: p.title }),\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "<h1>Подготовка постов</h1>",
     "new": "<h1>{{ t('drafts.title') }}</h1>",
     "count": 1
    },
    {
     "old": "<option value=\"\">Все каналы</option>",
     "new": "<option value=\"\">{{ t('common.allChannels') }}</option>",
     "count": 1
    },
    {
     "old": "@click=\"startCreate\">Новый пост</button>",
     "new": "@click=\"startCreate\">{{ t('post.new') }}</button>",
     "count": 1
    },
    {
     "old": "{{ isAdmin ? 'Сначала подключите канал на странице «Каналы».' : 'Вам пока не назначены каналы. Обратитесь к администратору.' }}",
     "new": "{{ isAdmin ? t('drafts.noChannelsAdmin') : t('channels.emptyEditor') }}",
     "count": 1
    },
    {
     "old": "class=\"muted\">Постов в подготовке нет. Создайте новый.</p>",
     "new": "class=\"muted\">{{ t('drafts.empty') }}</p>",
     "count": 1
    },
    {
     "old": "{{ STATUS[p.status] }}",
     "new": "{{ t('status.' + p.status) }}",
     "count": 1
    },
    {
     "old": "class=\"muted mt-2\">Публикация: {{ fmtDate(p.scheduled_at) }}</p>\n      <p v-if=\"p.author_name\" class=\"muted mt-2\">Автор: {{ p.author_name }}</p>\n      <p v-if=\"p.error\" class=\"error mt-2\">{{ p.error }}</p>",
     "new": "class=\"muted mt-2\">{{ t('drafts.publishAt') }}: {{ fmtDate(p.scheduled_at) }}</p>\n      <p v-if=\"p.author_name\" class=\"muted mt-2\">{{ t('common.author') }}: {{ p.author_name }}</p>\n      <p v-if=\"p.error\" class=\"error mt-2\">{{ tServer(p.error) }}</p>",
     "count": 1
    },
    {
     "old": "@click=\"startEdit(p)\">Редактировать</button>\n        <button class=\"primary\" :disabled=\"busy || p.status === 'publishing'\" @click=\"publishNow(p)\">Опубликовать сейчас</button>\n        <button v-if=\"p.status === 'scheduled'\" :disabled=\"busy\" @click=\"unschedule(p)\">Убрать из графика</button>\n        <button class=\"danger\" :disabled=\"busy || p.status === 'publishing'\" @click=\"remove(p)\">Удалить</button>",
     "new": "@click=\"startEdit(p)\">{{ t('drafts.edit') }}</button>\n        <button class=\"primary\" :disabled=\"busy || p.status === 'publishing'\" @click=\"publishNow(p)\">{{ t('drafts.publishNow') }}</button>\n        <button v-if=\"p.status === 'scheduled'\" :disabled=\"busy\" @click=\"unschedule(p)\">{{ t('drafts.unschedule') }}</button>\n        <button class=\"danger\" :disabled=\"busy || p.status === 'publishing'\" @click=\"remove(p)\">{{ t('common.delete') }}</button>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/published.vue",
   "hunks": [
    {
     "old": "const dialog = useDialog()",
     "new": "const dialog = useDialog()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "    title: 'Удалить запись?',\n    message: `Запись «${p.title}» будет удалена.`,\n    option: hasMessage ? { label: 'Удалить и само сообщение из канала', checked: false } : undefined,\n    confirmText: 'Удалить',",
     "new": "    title: t('published.deleteTitle'),\n    message: t('published.deleteMsg', { title: p.title }),\n    option: hasMessage ? { label: t('published.deleteFromTg'), checked: false } : undefined,\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "<h1>Опубликованные</h1>\n      <select v-model=\"channelId\" class=\"filter\">\n        <option value=\"\">Все каналы</option>",
     "new": "<h1>{{ t('published.title') }}</h1>\n      <select v-model=\"channelId\" class=\"filter\">\n        <option value=\"\">{{ t('common.allChannels') }}</option>",
     "count": 1
    },
    {
     "old": "class=\"muted\">Опубликованных постов пока нет.</p>",
     "new": "class=\"muted\">{{ t('published.empty') }}</p>",
     "count": 1
    },
    {
     "old": "Опубликовано: {{ fmtDate(p.published_at) }}<span v-if=\"p.author_name\"> · автор: {{ p.author_name }}</span></p>",
     "new": "{{ t('common.published') }}: {{ fmtDate(p.published_at) }}<span v-if=\"p.author_name\"> · {{ t('published.byAuthor', { name: p.author_name }) }}</span></p>",
     "count": 1
    },
    {
     "old": "<button>Открыть в Telegram</button></a>\n        <button class=\"danger\" @click=\"remove(p)\">Удалить</button>",
     "new": "<button>{{ t('published.openInTg') }}</button></a>\n        <button class=\"danger\" @click=\"remove(p)\">{{ t('common.delete') }}</button>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/metrics.vue",
   "hunks": [
    {
     "old": "const api = useApi()\nconst overview",
     "new": "const api = useApi()\nconst { t, locale } = useLocale()\nconst overview",
     "count": 1
    },
    {
     "old": "    const [o, c, t, s, tp] = await Promise.all([",
     "new": "    const [o, c, tl, s, tp] = await Promise.all([",
     "count": 1
    },
    {
     "old": "    timeline.value = t",
     "new": "    timeline.value = tl",
     "count": 1
    },
    {
     "old": "// 'YYYY-MM-DD' -> 'DD.MM' (одинаковые подписи у всех графиков)\nconst fmtDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`",
     "new": "// 'YYYY-MM-DD' -> 'DD.MM' (en: 'DD/MM'); одинаковые подписи у всех графиков\nconst fmtDay = (day: string) => `${day.slice(8, 10)}${locale.value === 'ru' ? '.' : '/'}${day.slice(5, 7)}`",
     "count": 1
    },
    {
     "old": "const scopeLabel = computed(() => (selected.value ? `«${selected.value.title}»` : 'во всех каналах'))",
     "new": "const scopeLabel = computed(() => (selected.value ? t('metrics.scopeOne', { title: selected.value.title }) : t('metrics.scopeAll')))",
     "count": 1
    },
    {
     "old": "      <h1>Метрики</h1>\n      <select v-model=\"channelId\" class=\"filter\">\n        <option value=\"\">Все каналы</option>",
     "new": "      <h1>{{ t('metrics.title') }}</h1>\n      <select v-model=\"channelId\" class=\"filter\">\n        <option value=\"\">{{ t('common.allChannels') }}</option>",
     "count": 1
    },
    {
     "old": "<span>Подписчиков {{ scopeLabel }}</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.published) }}</b><span>Опубликовано постов</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.likes) }}</b><span>Лайков всего</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.scheduled) }}</b><span>В графике</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.drafts) }}</b><span>Черновиков</span></div>",
     "new": "<span>{{ t('metrics.subscribersScope', { scope: scopeLabel }) }}</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.published) }}</b><span>{{ t('metrics.publishedPosts') }}</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.likes) }}</b><span>{{ t('metrics.likesTotal') }}</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.scheduled) }}</b><span>{{ t('metrics.scheduled') }}</span></div>\n      <div class=\"card stat\"><b>{{ fmtNum(overview.drafts) }}</b><span>{{ t('metrics.drafts') }}</span></div>",
     "count": 1
    },
    {
     "old": "<h2>Динамика за 30 дней</h2>",
     "new": "<h2>{{ t('metrics.dynamics') }}</h2>",
     "count": 1
    },
    {
     "old": "        <BarChart title=\"Публикации по дням\" :items=\"postsSeries\" :summary=\"postsTotal\" />\n        <BarChart title=\"Лайки по дням\" :items=\"likesSeries\" :summary=\"likesTotal\" />\n        <BarChart title=\"Подписчики\" :items=\"subsSeries\"",
     "new": "        <BarChart :title=\"t('metrics.chartPosts')\" :items=\"postsSeries\" :summary=\"postsTotal\" />\n        <BarChart :title=\"t('metrics.chartLikes')\" :items=\"likesSeries\" :summary=\"likesTotal\" />\n        <BarChart :title=\"t('metrics.chartSubs')\" :items=\"subsSeries\"",
     "count": 1
    },
    {
     "old": "<h2>{{ selected ? 'Канал' : 'Каналы' }}</h2>",
     "new": "<h2>{{ selected ? t('metrics.channelOne') : t('metrics.channelMany') }}</h2>",
     "count": 1
    },
    {
     "old": "            <th>Канал</th><th class=\"num\">Подписчики</th><th class=\"num\">Рост за 30 дней</th>\n            <th class=\"num\">Постов</th><th class=\"num\">Лайков</th><th class=\"num\">Лайков на пост</th>",
     "new": "            <th>{{ t('metrics.col.channel') }}</th><th class=\"num\">{{ t('metrics.col.subscribers') }}</th><th class=\"num\">{{ t('metrics.col.growth') }}</th>\n            <th class=\"num\">{{ t('metrics.col.posts') }}</th><th class=\"num\">{{ t('metrics.col.likes') }}</th><th class=\"num\">{{ t('metrics.col.likesPerPost') }}</th>",
     "count": 1
    },
    {
     "old": "            <td data-label=\"Канал\">{{ c.title }}</td>\n            <td class=\"num\" data-label=\"Подписчики\">",
     "new": "            <td :data-label=\"t('metrics.col.channel')\">{{ c.title }}</td>\n            <td class=\"num\" :data-label=\"t('metrics.col.subscribers')\">",
     "count": 1
    },
    {
     "old": "<td class=\"num\" data-label=\"Рост за 30 дней\" :class=",
     "new": "<td class=\"num\" :data-label=\"t('metrics.col.growth')\" :class=",
     "count": 1
    },
    {
     "old": "<td class=\"num\" data-label=\"Постов\">{{ fmtNum(c.posts) }}</td>\n            <td class=\"num\" data-label=\"Лайков\">{{ fmtNum(c.likes) }}</td>\n            <td class=\"num\" data-label=\"Лайков на пост\">{{ c.avg_likes }}</td>",
     "new": "<td class=\"num\" :data-label=\"t('metrics.col.posts')\">{{ fmtNum(c.posts) }}</td>\n            <td class=\"num\" :data-label=\"t('metrics.col.likes')\">{{ fmtNum(c.likes) }}</td>\n            <td class=\"num\" :data-label=\"t('metrics.col.likesPerPost')\">{{ c.avg_likes }}</td>",
     "count": 1
    },
    {
     "old": "<h2>Лучшие посты по лайкам</h2>",
     "new": "<h2>{{ t('metrics.topPosts') }}</h2>",
     "count": 1
    },
    {
     "old": "<p v-if=\"!top.length\" class=\"muted\">Опубликованных постов пока нет.</p>\n      <table v-else class=\"stack\">\n        <thead><tr><th>Пост</th><th>Канал</th><th>Дата</th><th class=\"num\">Лайки</th></tr></thead>",
     "new": "<p v-if=\"!top.length\" class=\"muted\">{{ t('published.empty') }}</p>\n      <table v-else class=\"stack\">\n        <thead><tr><th>{{ t('metrics.col.post') }}</th><th>{{ t('metrics.col.channel') }}</th><th>{{ t('metrics.col.date') }}</th><th class=\"num\">{{ t('metrics.col.likesShort') }}</th></tr></thead>",
     "count": 1
    },
    {
     "old": "            <td data-label=\"Пост\">{{ p.title }}</td>\n            <td data-label=\"Канал\">{{ p.channel_title }}</td>\n            <td data-label=\"Дата\">{{ fmtDate(p.published_at) }}</td>\n            <td class=\"num\" data-label=\"Лайки\">",
     "new": "            <td :data-label=\"t('metrics.col.post')\">{{ p.title }}</td>\n            <td :data-label=\"t('metrics.col.channel')\">{{ p.channel_title }}</td>\n            <td :data-label=\"t('metrics.col.date')\">{{ fmtDate(p.published_at) }}</td>\n            <td class=\"num\" :data-label=\"t('metrics.col.likesShort')\">",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/bot.vue",
   "hunks": [
    {
     "old": "const dialog = useDialog()",
     "new": "const dialog = useDialog()\nconst { t, th } = useLocale()",
     "count": 1
    },
    {
     "old": "  }, 'Бот подключён.')",
     "new": "  }, t('bot.connectedOk'))",
     "count": 1
    },
    {
     "old": "    title: 'Отключить бота?',\n    message:\n      'Публикация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.',\n    confirmText: 'Отключить',",
     "new": "    title: t('bot.disconnectTitle'),\n    message: t('bot.disconnectMsg'),\n    confirmText: t('bot.disconnect'),",
     "count": 1
    },
    {
     "old": "{ method: 'DELETE' }), 'Бот отключён.')",
     "new": "{ method: 'DELETE' }), t('bot.disconnectedOk'))",
     "count": 1
    },
    {
     "old": "<h1>Бот</h1>",
     "new": "<h1>{{ t('bot.title') }}</h1>",
     "count": 1
    },
    {
     "old": "    <p v-if=\"info && !info.secrets_configured\" class=\"error\">\n      На сервере не задан <code>SECRETS_KEY</code>: токен бота негде безопасно хранить, подключить его пока нельзя. Обратитесь к владельцу сервера.\n    </p>",
     "new": "    <p v-if=\"info && !info.secrets_configured\" class=\"error\" v-html=\"th('bot.noSecrets')\"></p>",
     "count": 1
    },
    {
     "old": "      <h3>Статус</h3>",
     "new": "      <h3>{{ t('bot.status') }}</h3>",
     "count": 1
    },
    {
     "old": "class=\"muted\">Статус недоступен.</p>\n      <p v-else-if=\"!info.connected\" class=\"warn\">\n        Бот не подключён: публикация, сбор статистики и подключение каналов по @username недоступны.\n      </p>\n      <template v-else>\n        <p>\n          Подключён",
     "new": "class=\"muted\">{{ t('bot.statusUnavailable') }}</p>\n      <p v-else-if=\"!info.connected\" class=\"warn\">{{ t('bot.notConnected') }}</p>\n      <template v-else>\n        <p>\n          {{ t('bot.connectedLabel') }}",
     "count": 1
    },
    {
     "old": "<span v-if=\"info.updated_at\" class=\"muted\"> · обновлён {{ fmtDate(info.updated_at) }}</span>\n        </p>\n        <p v-if=\"info.source === 'env'\" class=\"muted mt-2\">\n          Используется бот по умолчанию из настроек сервера. Подключите своего бота ниже, и он заменит его.\n        </p>\n        <p v-if=\"info.mode === 'webhook'\" style=\"margin: 8px 0 0\">\n          События от Telegram: <b>webhook</b>\n          <span v-if=\"info.webhook?.registered\" class=\"pos\"> · зарегистрирован</span>\n          <span v-else class=\"warn\"> · не зарегистрирован</span>\n          <span v-if=\"info.webhook?.pending\" class=\"muted\"> · в очереди: {{ info.webhook.pending }}</span>\n        </p>\n        <p v-if=\"info.webhook?.error\" class=\"error\" style=\"margin: 8px 0 0\">Не удалось зарегистрировать webhook: {{ info.webhook.error }}</p>\n        <p v-if=\"info.webhook?.last_error\" class=\"warn\" style=\"margin: 8px 0 0\">\n          Последняя ошибка доставки: {{ info.webhook.last_error.message }}",
     "new": "<span v-if=\"info.updated_at\" class=\"muted\"> · {{ t('bot.updatedAt', { date: fmtDate(info.updated_at) }) }}</span>\n        </p>\n        <p v-if=\"info.source === 'env'\" class=\"muted mt-2\">{{ t('bot.defaultBot') }}</p>\n        <p v-if=\"info.mode === 'webhook'\" style=\"margin: 8px 0 0\">\n          {{ t('bot.updatesFrom') }}: <b>webhook</b>\n          <span v-if=\"info.webhook?.registered\" class=\"pos\"> · {{ t('bot.webhookRegistered') }}</span>\n          <span v-else class=\"warn\"> · {{ t('bot.webhookNotRegistered') }}</span>\n          <span v-if=\"info.webhook?.pending\" class=\"muted\"> · {{ t('bot.webhookPending', { n: info.webhook.pending }) }}</span>\n        </p>\n        <p v-if=\"info.webhook?.error\" class=\"error\" style=\"margin: 8px 0 0\">{{ t('bot.webhookError', { error: info.webhook.error }) }}</p>\n        <p v-if=\"info.webhook?.last_error\" class=\"warn\" style=\"margin: 8px 0 0\">\n          {{ t('bot.lastError') }}: {{ info.webhook.last_error.message }}",
     "count": 1
    },
    {
     "old": "<span class=\"muted\">Telegram должен достучаться до сервера по HTTPS: проверьте PUBLIC_URL, сертификат и прокси.</span>\n        </p>\n        <p v-else-if=\"info.mode === 'polling'\" class=\"muted\" style=\"margin: 8px 0 0\">\n          События от Telegram: polling (режим для разработки). Чтобы перейти на webhook, владельцу сервера нужно задать <code>PUBLIC_URL</code> с https://.\n        </p>",
     "new": "<span class=\"muted\">{{ t('bot.webhookHint') }}</span>\n        </p>\n        <p v-else-if=\"info.mode === 'polling'\" class=\"muted\" style=\"margin: 8px 0 0\" v-html=\"th('bot.pollingHint')\"></p>",
     "count": 1
    },
    {
     "old": "      <h3>{{ info?.source === 'own' ? 'Заменить бота' : 'Подключить бота' }}</h3>\n      <p class=\"muted mb-3\">\n        Создайте бота у @BotFather и вставьте его токен. Токен хранится на сервере в зашифрованном виде, виден только вам и не показывается после сохранения.\n        У каждого администратора свой бот, поэтому ваши каналы и публикации недоступны другим.\n      </p>",
     "new": "      <h3>{{ info?.source === 'own' ? t('bot.replaceTitle') : t('bot.connectTitle') }}</h3>\n      <p class=\"muted mb-3\">{{ t('bot.tokenHelp') }}</p>",
     "count": 1
    },
    {
     "old": "          <label>Токен бота</label>",
     "new": "          <label>{{ t('bot.tokenLabel') }}</label>",
     "count": 1
    },
    {
     "old": "{{ busy ? 'Проверяю…' : 'Сохранить' }}</button>\n        <button v-if=\"info?.source === 'own'\" type=\"button\" class=\"danger\" :disabled=\"busy\" @click=\"remove\">Отключить</button>",
     "new": "{{ busy ? t('common.checking') : t('common.save') }}</button>\n        <button v-if=\"info?.source === 'own'\" type=\"button\" class=\"danger\" :disabled=\"busy\" @click=\"remove\">{{ t('bot.disconnect') }}</button>",
     "count": 1
    },
    {
     "old": "      <h3>Как подключить канал</h3>\n      <ol class=\"steps\">\n        <li>Подключите бота выше.</li>\n        <li>Добавьте этого бота администратором своего канала с правом публикации сообщений.</li>\n        <li>На странице «Каналы» укажите @username или числовой id канала.</li>\n      </ol>\n      <p class=\"muted mt-3\">\n        Если заменить бота, под старыми постами «лайки» работать перестанут (кнопки привязаны к прежнему боту), а новый бот нужно заново добавить администратором в каналы.\n      </p>",
     "new": "      <h3>{{ t('bot.howTitle') }}</h3>\n      <ol class=\"steps\">\n        <li>{{ t('bot.step1') }}</li>\n        <li>{{ t('bot.step2') }}</li>\n        <li>{{ t('bot.step3') }}</li>\n      </ol>\n      <p class=\"muted mt-3\">{{ t('bot.replaceNote') }}</p>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/users.vue",
   "hunks": [
    {
     "old": "const { user: me, isSuper } = useAuth()",
     "new": "const { user: me, isSuper } = useAuth()\nconst { t } = useLocale()",
     "count": 1
    },
    {
     "old": "    title: 'Сброс пароля',\n    message: `Новый пароль для ${u.email}.`,\n    input: { label: 'Новый пароль (не короче 8 символов)', type: 'password', minlength: 8, autocomplete: 'new-password' },\n    confirmText: 'Сменить пароль',",
     "new": "    title: t('users.resetTitle'),\n    message: t('users.resetMsg', { email: u.email }),\n    input: { label: t('field.newPassword'), type: 'password', minlength: 8, autocomplete: 'new-password' },\n    confirmText: t('users.resetConfirm'),",
     "count": 1
    },
    {
     "old": "    title: 'Удалить редактора?',\n    message: `Редактор ${u.email} будет удалён.`,\n    confirmText: 'Удалить',",
     "new": "    title: t('users.removeEditorTitle'),\n    message: t('users.removeEditorMsg', { email: u.email }),\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "    title: 'Удалить администратора?',\n    message: [\n      `Администратор ${u.email} будет удалён.`,\n      `Вместе с ним будут безвозвратно удалены его каналы (${u.channels_count}) с постами и его редакторы (${u.editors_count}).`,\n    ],\n    confirmText: 'Удалить',",
     "new": "    title: t('users.removeAdminTitle'),\n    message: [\n      t('users.removeAdminMsg1', { email: u.email }),\n      t('users.removeAdminMsg2', { channels: u.channels_count, editors: u.editors_count }),\n    ],\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "<h1>Пользователи</h1>",
     "new": "<h1>{{ t('users.title') }}</h1>",
     "count": 1
    },
    {
     "old": "      <h3>Новый редактор</h3>\n      <div class=\"row\" style=\"align-items: flex-end\">\n        <div style=\"flex: 2; min-width: 200px\"><label>Email</label><input v-model=\"editorForm.email\" type=\"email\" required /></div>\n        <div style=\"flex: 1; min-width: 150px\"><label>Имя</label><input v-model=\"editorForm.name\" required /></div>\n        <div style=\"flex: 1; min-width: 150px\"><label>Пароль</label><input v-model=\"editorForm.password\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" /></div>\n        <button class=\"primary\" :disabled=\"busy\">Добавить</button>",
     "new": "      <h3>{{ t('users.newEditor') }}</h3>\n      <div class=\"row\" style=\"align-items: flex-end\">\n        <div style=\"flex: 2; min-width: 200px\"><label>{{ t('field.email') }}</label><input v-model=\"editorForm.email\" type=\"email\" required /></div>\n        <div style=\"flex: 1; min-width: 150px\"><label>{{ t('field.name') }}</label><input v-model=\"editorForm.name\" required /></div>\n        <div style=\"flex: 1; min-width: 150px\"><label>{{ t('field.password') }}</label><input v-model=\"editorForm.password\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" /></div>\n        <button class=\"primary\" :disabled=\"busy\">{{ t('common.add') }}</button>",
     "count": 1
    },
    {
     "old": "        :title=\"'Каналы редактора ' + accessFor.name\"",
     "new": "        :title=\"t('users.channelsOf', { name: accessFor.name })\"",
     "count": 1
    },
    {
     "old": "        empty=\"Каналов пока нет. Подключите канал на странице «Каналы».\"",
     "new": "        :empty=\"t('users.noChannels')\"",
     "count": 1
    },
    {
     "old": "<h3 class=\"section-title\">Мои редакторы</h3>",
     "new": "<h3 class=\"section-title\">{{ t('users.myEditors') }}</h3>",
     "count": 1
    },
    {
     "old": "class=\"muted\">Редакторов пока нет.</p>\n      <table v-else class=\"stack\">\n        <thead><tr><th>Имя</th><th>Email</th><th>Каналы</th><th>Создан</th><th /></tr></thead>\n        <tbody>\n          <tr v-for=\"u in users\" :key=\"u.id\">\n            <td data-label=\"Имя\">{{ u.name }}</td>\n            <td data-label=\"Email\">{{ u.email }}</td>\n            <td class=\"wrap\" data-label=\"Каналы\">\n              <span v-if=\"!u.channels.length\" class=\"warn\">нет доступа</span>",
     "new": "class=\"muted\">{{ t('users.noEditors') }}</p>\n      <table v-else class=\"stack\">\n        <thead><tr><th>{{ t('users.col.name') }}</th><th>{{ t('field.email') }}</th><th>{{ t('users.col.channels') }}</th><th>{{ t('users.col.created') }}</th><th /></tr></thead>\n        <tbody>\n          <tr v-for=\"u in users\" :key=\"u.id\">\n            <td :data-label=\"t('users.col.name')\">{{ u.name }}</td>\n            <td :data-label=\"t('field.email')\">{{ u.email }}</td>\n            <td class=\"wrap\" :data-label=\"t('users.col.channels')\">\n              <span v-if=\"!u.channels.length\" class=\"warn\">{{ t('users.noAccess') }}</span>",
     "count": 1
    },
    {
     "old": "            <td data-label=\"Создан\">{{ fmtDate(u.created_at) }}</td>\n            <td class=\"num actions-cell\">\n              <button :disabled=\"busy\" @click=\"accessFor = u\">Каналы</button>\n              <button :disabled=\"busy\" @click=\"resetPassword(u)\">Сбросить пароль</button>\n              <button class=\"danger\" :disabled=\"busy\" @click=\"removeEditor(u)\">Удалить</button>",
     "new": "            <td :data-label=\"t('users.col.created')\">{{ fmtDate(u.created_at) }}</td>\n            <td class=\"num actions-cell\">\n              <button :disabled=\"busy\" @click=\"accessFor = u\">{{ t('users.channelsBtn') }}</button>\n              <button :disabled=\"busy\" @click=\"resetPassword(u)\">{{ t('users.resetPassword') }}</button>\n              <button class=\"danger\" :disabled=\"busy\" @click=\"removeEditor(u)\">{{ t('common.delete') }}</button>",
     "count": 1
    },
    {
     "old": "      <h3 class=\"section-title\">Администраторы</h3>\n      <form class=\"card\" @submit.prevent=\"create('admin', adminForm)\">\n        <h3>Новый администратор</h3>\n        <p class=\"muted mb-3\">У каждого администратора своё изолированное пространство: свои каналы, редакторы и источники парсера. Вы их не увидите.</p>\n        <div class=\"row\" style=\"align-items: flex-end\">\n          <div style=\"flex: 2; min-width: 200px\"><label>Email</label><input v-model=\"adminForm.email\" type=\"email\" required /></div>\n          <div style=\"flex: 1; min-width: 150px\"><label>Имя</label><input v-model=\"adminForm.name\" required /></div>\n          <div style=\"flex: 1; min-width: 150px\"><label>Пароль</label><input v-model=\"adminForm.password\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" /></div>\n          <button class=\"primary\" :disabled=\"busy\">Добавить</button>",
     "new": "      <h3 class=\"section-title\">{{ t('users.admins') }}</h3>\n      <form class=\"card\" @submit.prevent=\"create('admin', adminForm)\">\n        <h3>{{ t('users.newAdmin') }}</h3>\n        <p class=\"muted mb-3\">{{ t('users.newAdminHint') }}</p>\n        <div class=\"row\" style=\"align-items: flex-end\">\n          <div style=\"flex: 2; min-width: 200px\"><label>{{ t('field.email') }}</label><input v-model=\"adminForm.email\" type=\"email\" required /></div>\n          <div style=\"flex: 1; min-width: 150px\"><label>{{ t('field.name') }}</label><input v-model=\"adminForm.name\" required /></div>\n          <div style=\"flex: 1; min-width: 150px\"><label>{{ t('field.password') }}</label><input v-model=\"adminForm.password\" type=\"password\" required minlength=\"8\" autocomplete=\"new-password\" /></div>\n          <button class=\"primary\" :disabled=\"busy\">{{ t('common.add') }}</button>",
     "count": 1
    },
    {
     "old": "          <thead><tr><th>Имя</th><th>Email</th><th>Каналов</th><th>Редакторов</th><th>Создан</th><th /></tr></thead>\n          <tbody>\n            <tr v-for=\"a in admins\" :key=\"a.id\">\n              <td data-label=\"Имя\">\n                {{ a.name }}\n                <span v-if=\"a.id === me?.id\" class=\"tagchip\">вы</span>\n                <span v-else-if=\"a.is_super\" class=\"tagchip\">главный</span>\n              </td>\n              <td data-label=\"Email\">{{ a.email }}</td>\n              <td data-label=\"Каналов\">{{ a.channels_count }}</td>\n              <td data-label=\"Редакторов\">{{ a.editors_count }}</td>\n              <td data-label=\"Создан\">{{ fmtDate(a.created_at) }}</td>\n              <td class=\"num actions-cell\">\n                <template v-if=\"a.id !== me?.id && !a.is_super\">\n                  <button :disabled=\"busy\" @click=\"resetPassword(a)\">Сбросить пароль</button>\n                  <button class=\"danger\" :disabled=\"busy\" @click=\"removeAdmin(a)\">Удалить</button>",
     "new": "          <thead><tr><th>{{ t('users.col.name') }}</th><th>{{ t('field.email') }}</th><th>{{ t('users.col.channelsCount') }}</th><th>{{ t('users.col.editorsCount') }}</th><th>{{ t('users.col.created') }}</th><th /></tr></thead>\n          <tbody>\n            <tr v-for=\"a in admins\" :key=\"a.id\">\n              <td :data-label=\"t('users.col.name')\">\n                {{ a.name }}\n                <span v-if=\"a.id === me?.id\" class=\"tagchip\">{{ t('users.you') }}</span>\n                <span v-else-if=\"a.is_super\" class=\"tagchip\">{{ t('users.main') }}</span>\n              </td>\n              <td :data-label=\"t('field.email')\">{{ a.email }}</td>\n              <td :data-label=\"t('users.col.channelsCount')\">{{ a.channels_count }}</td>\n              <td :data-label=\"t('users.col.editorsCount')\">{{ a.editors_count }}</td>\n              <td :data-label=\"t('users.col.created')\">{{ fmtDate(a.created_at) }}</td>\n              <td class=\"num actions-cell\">\n                <template v-if=\"a.id !== me?.id && !a.is_super\">\n                  <button :disabled=\"busy\" @click=\"resetPassword(a)\">{{ t('users.resetPassword') }}</button>\n                  <button class=\"danger\" :disabled=\"busy\" @click=\"removeAdmin(a)\">{{ t('common.delete') }}</button>",
     "count": 1
    },
    {
     "old": "    <p class=\"muted\">\n      Администратор работает в своём изолированном пространстве: видит только свои каналы, посты, метрики и источники парсера, и управляет только своими редакторами.\n      Редактор работает только с каналами, которые за ним закреплены.\n      <template v-if=\"isSuper\">Главный администратор дополнительно создаёт других администраторов и может удалить их вместе с их пространством.</template>\n    </p>",
     "new": "    <p class=\"muted\">\n      {{ t('users.footer') }}\n      <template v-if=\"isSuper\">{{ t('users.footerSuper') }}</template>\n    </p>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/support.vue",
   "hunks": [
    {
     "old": "const wallets = [",
     "new": "const { t } = useLocale()\nconst wallets = computed(() => [",
     "count": 1
    },
    {
     "old": "name: 'СБП (Служба быстрых платежей)', value: '+7 978 513-63-16' },\n]",
     "new": "name: t('support.sbp'), value: '+7 978 513-63-16' },\n])",
     "count": 1
    },
    {
     "old": "<h1>Поддержать проект</h1>",
     "new": "<h1>{{ t('support.title') }}</h1>",
     "count": 1
    },
    {
     "old": "      <p>«Менеджер каналов» — бесплатный проект. Им может пользоваться каждый, платить ничего не нужно, а развивает и поддерживает его один разработчик.</p>\n      <p>Если сервис вам полезен, вы можете по желанию поддержать проект пожертвованием. Это добровольно: на доступ к возможностям сервиса пожертвование никак не влияет.</p>",
     "new": "      <p>{{ t('support.p1') }}</p>\n      <p>{{ t('support.p2') }}</p>",
     "count": 1
    },
    {
     "old": "<h2>Реквизиты для пожертвований</h2>",
     "new": "<h2>{{ t('support.walletsTitle') }}</h2>",
     "count": 1
    },
    {
     "old": ":aria-label=\"`Скопировать: ${w.name}`\" @click=\"copy(w)\">{{ copiedId === w.id ? 'Скопировано' : 'Копировать' }}</button>",
     "new": ":aria-label=\"t('support.copyAria', { name: w.name })\" @click=\"copy(w)\">{{ copiedId === w.id ? t('support.copied') : t('support.copy') }}</button>",
     "count": 1
    },
    {
     "old": "class=\"muted mt-3\">Перед переводом сверьте адрес или номер: переводы в криптовалютах необратимы. Спасибо за поддержку!</p>",
     "new": "class=\"muted mt-3\">{{ t('support.note') }}</p>",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/account.vue",
   "hunks": [
    {
     "old": "const { user } = useAuth()\nconst current = ref('')\nconst next = ref('')\nconst done = ref('')",
     "new": "const { user, changeLang } = useAuth()\nconst { t, th } = useLocale()\nconst current = ref('')\nconst next = ref('')\nconst done = ref(false)",
     "count": 1
    },
    {
     "old": "  done.value = ''\n  try {",
     "new": "  done.value = false\n  try {",
     "count": 1
    },
    {
     "old": "    done.value = 'Пароль изменён. На других устройствах потребуется войти заново.'",
     "new": "    done.value = true",
     "count": 1
    },
    {
     "old": "// ---- удаление аккаунта ----",
     "new": "// ---- язык интерфейса ----\n// Интерфейс переключается сразу; если сохранить язык в аккаунте не вышло, он всё равно остаётся выбранным в этом браузере\nconst langBusy = ref(false)\nconst langSaved = ref(false)\nconst langError = ref('')\n\nasync function onLang(code: string) {\n  langSaved.value = false\n  langError.value = ''\n  langBusy.value = true\n  try {\n    await changeLang(code)\n    langSaved.value = true\n  } catch (e: any) {\n    langError.value = e.message\n  } finally {\n    langBusy.value = false\n  }\n}\n\n// ---- удаление аккаунта ----",
     "count": 1
    },
    {
     "old": "      ? `Будут безвозвратно удалены ваш аккаунт, все ваши каналы с постами и статистикой, источники парсера, подключённый бот и редакторы (${info.value.editors ?? 0}). Сообщения, уже опубликованные в Telegram, останутся.`\n      : 'Ваш аккаунт будет безвозвратно удалён. Посты, которые вы создали, останутся у администратора.'\n  const sure = await dialog.confirm({\n    title: 'Удалить аккаунт?',\n    message: [what, 'Отменить это будет нельзя.'],\n    confirmText: 'Удалить аккаунт',",
     "new": "      ? t('account.confirmMsgAdmin', { editors: info.value.editors ?? 0 })\n      : t('account.confirmMsgEditor')\n  const sure = await dialog.confirm({\n    title: t('account.confirmTitle'),\n    message: [what, t('account.confirmIrreversible')],\n    confirmText: t('account.deleteBtn'),",
     "count": 1
    },
    {
     "old": "<h1>Профиль</h1>",
     "new": "<h1>{{ t('account.title') }}</h1>",
     "count": 1
    },
    {
     "old": "{{ user?.role === 'admin' ? 'администратор' : 'редактор' }}</span>\n      </p>\n      <h3>Смена пароля</h3>\n      <label>Текущий пароль</label>\n      <input v-model=\"current\" type=\"password\" required autocomplete=\"current-password\" />\n      <label>Новый пароль (не короче 8 символов)</label>",
     "new": "{{ user?.role === 'admin' ? t('role.admin') : t('role.editor') }}</span>\n      </p>\n      <h3>{{ t('account.passwordTitle') }}</h3>\n      <label>{{ t('field.currentPassword') }}</label>\n      <input v-model=\"current\" type=\"password\" required autocomplete=\"current-password\" />\n      <label>{{ t('field.newPassword') }}</label>",
     "count": 1
    },
    {
     "old": "<p v-if=\"done\" class=\"pos mt-3\">{{ done }}</p>\n      <div class=\"actions\"><button class=\"primary\">Сменить пароль</button></div>\n    </form>\n\n    <div class=\"card\" style=\"max-width: 420px\">\n      <h3>Удаление аккаунта</h3>\n      <p v-if=\"info?.inactive_days\" class=\"muted\" style=\"margin-top: 0\">\n        Если в аккаунт не заходить {{ info.inactive_days }} дн. подряд, он удаляется автоматически.\n      </p>\n      <p v-if=\"info?.is_super\" class=\"muted\">Главный администратор не может удалить аккаунт.</p>\n      <form v-else-if=\"info\" @submit.prevent=\"deleteMyAccount\">\n        <p v-if=\"info.role === 'admin'\" class=\"warn\">\n          Вместе с аккаунтом удалятся ваши каналы (<b>{{ info.channels }}</b>) с постами и статистикой, источники парсера, бот и редакторы (<b>{{ info.editors }}</b>).\n        </p>\n        <p v-else class=\"muted\">Удалится только ваш аккаунт. Созданные вами посты останутся у администратора.</p>\n        <label>Пароль для подтверждения</label>",
     "new": "<p v-if=\"done\" class=\"pos mt-3\">{{ t('account.passwordChanged') }}</p>\n      <div class=\"actions\"><button class=\"primary\">{{ t('account.changePassword') }}</button></div>\n    </form>\n\n    <div class=\"card\" style=\"max-width: 420px\">\n      <h3>{{ t('account.languageTitle') }}</h3>\n      <label for=\"lang-select\">{{ t('account.languageLabel') }}</label>\n      <LangSwitch id=\"lang-select\" :disabled=\"langBusy\" @change=\"onLang\" />\n      <p class=\"muted mt-3\">{{ t('account.languageHint') }}</p>\n      <p v-if=\"langError\" class=\"error mt-3\">{{ t('account.languageSaveFailed', { error: langError }) }}</p>\n      <p v-else-if=\"langSaved\" class=\"pos mt-3\" role=\"status\">{{ t('account.languageSaved') }}</p>\n    </div>\n\n    <div class=\"card\" style=\"max-width: 420px\">\n      <h3>{{ t('account.deleteTitle') }}</h3>\n      <p v-if=\"info?.inactive_days\" class=\"muted\" style=\"margin-top: 0\">\n        {{ t('account.inactiveInfo', { n: info.inactive_days }, info.inactive_days) }}\n      </p>\n      <p v-if=\"info?.is_super\" class=\"muted\">{{ t('account.superNoDelete') }}</p>\n      <form v-else-if=\"info\" @submit.prevent=\"deleteMyAccount\">\n        <p v-if=\"info.role === 'admin'\" class=\"warn\" v-html=\"th('account.adminWarn', { channels: info.channels, editors: info.editors })\"></p>\n        <p v-else class=\"muted\">{{ t('account.editorWarn') }}</p>\n        <label>{{ t('account.confirmPassword') }}</label>",
     "count": 1
    },
    {
     "old": "{{ delBusy ? 'Удаляю…' : 'Удалить аккаунт' }}",
     "new": "{{ delBusy ? t('account.deleting') : t('account.deleteBtn') }}",
     "count": 1
    }
   ]
  },
  {
   "file": "pages/parser.vue",
   "hunks": [
    {
     "old": "const dialog = useDialog()\nconst PAGE = 30",
     "new": "const dialog = useDialog()\nconst { t, tServer } = useLocale()\nconst PAGE = 30",
     "count": 1
    },
    {
     "old": "    say(`Канал @${s.username} добавлен. Загружено новых постов: ${s.added}.`)",
     "new": "    say(t('parser.added', { username: s.username, added: s.added }))",
     "count": 1
    },
    {
     "old": "    say(ok.length ? `Готово: каналов — ${ok.length}, новых постов — ${added}.` : '')\n    if (bad.length) error.value = bad.map((r) => `@${r.username}: ${r.error}`).join('\\n')",
     "new": "    say(ok.length ? t('parser.done', { channels: ok.length, added }) : '')\n    if (bad.length) error.value = bad.map((r) => `@${r.username}: ${tServer(r.error)}`).join('\\n')",
     "count": 1
    },
    {
     "old": "    title: 'Удалить канал?',\n    message: `Канал @${s.username} и ${s.posts_count} спарсенных постов будут удалены. Уже созданные черновики останутся.`,\n    confirmText: 'Удалить',",
     "new": "    title: t('channels.deleteTitle'),\n    message: t('parser.deleteMsg', { username: s.username, n: s.posts_count }, s.posts_count),\n    confirmText: t('common.delete'),",
     "count": 1
    },
    {
     "old": "    say(`Канал @${s.username} удалён.`)",
     "new": "    say(t('parser.removed', { username: s.username }))",
     "count": 1
    },
    {
     "old": "fail(new Error('Выберите канал для публикации'))",
     "new": "fail(new Error(t('parser.pickChannel')))",
     "count": 1
    },
    {
     "old": "    say(`Пост добавлен в «Подготовку постов».${r.note ? ' ' + r.note + '.' : ''}`, true)",
     "new": "    say(`${t('parser.draftAdded')}${r.note ? ' ' + tServer(r.note) + '.' : ''}`, true)",
     "count": 1
    },
    {
     "old": "<h1>Парсер</h1>",
     "new": "<h1>{{ t('parser.title') }}</h1>",
     "count": 1
    },
    {
     "old": "      <h3>Добавить канал</h3>\n      <p class=\"muted mb-3\">\n        Укажите @username или ссылку на публичный канал. Парсится его открытая веб-версия (t.me/s/…), поэтому приватные каналы и каналы с отключённым просмотром не подойдут.\n      </p>\n      <div class=\"row\">\n        <input v-model=\"channelInput\" required placeholder=\"@channel_name или https://t.me/channel_name\" style=\"flex: 1; min-width: 240px\" />\n        <button class=\"primary\" :disabled=\"adding || parsing\">{{ adding ? 'Проверяю…' : 'Добавить' }}</button>",
     "new": "      <h3>{{ t('parser.addTitle') }}</h3>\n      <p class=\"muted mb-3\">{{ t('parser.addHint') }}</p>\n      <div class=\"row\">\n        <input v-model=\"channelInput\" required :placeholder=\"t('parser.addPlaceholder')\" style=\"flex: 1; min-width: 240px\" />\n        <button class=\"primary\" :disabled=\"adding || parsing\">{{ adding ? t('common.checking') : t('common.add') }}</button>",
     "count": 1
    },
    {
     "old": "<NuxtLink v-if=\"draftLink\" to=\"/drafts\">Открыть «Подготовка постов»</NuxtLink>",
     "new": "<NuxtLink v-if=\"draftLink\" to=\"/drafts\">{{ t('parser.openDrafts') }}</NuxtLink>",
     "count": 1
    },
    {
     "old": "<h3>Каналы для парсинга</h3>",
     "new": "<h3>{{ t('parser.sourcesTitle') }}</h3>",
     "count": 1
    },
    {
     "old": "class=\"muted\">Каналов пока нет. Добавьте первый выше.</p>\n      <template v-else>\n        <label class=\"opt all\"><input type=\"checkbox\" :checked=\"allSelected\" @change=\"toggleAll\" /><span>Выбрать все</span></label>",
     "new": "class=\"muted\">{{ t('parser.noSources') }}</p>\n      <template v-else>\n        <label class=\"opt all\"><input type=\"checkbox\" :checked=\"allSelected\" @change=\"toggleAll\" /><span>{{ t('common.selectAll') }}</span></label>",
     "count": 1
    },
    {
     "old": " @{{ s.username }} · постов: {{ fmtNum(s.posts_count) }} · {{ s.last_parsed_at ? 'обновлён ' + fmtDate(s.last_parsed_at) : 'ещё не парсился' }}</span>\n              <span v-if=\"s.last_error\" class=\"error\">{{ s.last_error }}</span>",
     "new": " @{{ s.username }} · {{ t('parser.postsCount', { n: fmtNum(s.posts_count) }) }} · {{ s.last_parsed_at ? t('parser.updatedAt', { date: fmtDate(s.last_parsed_at) }) : t('parser.neverParsed') }}</span>\n              <span v-if=\"s.last_error\" class=\"error\">{{ tServer(s.last_error) }}</span>",
     "count": 1
    },
    {
     "old": "@click=\"removeSource(s)\">Удалить</button>\n        </div>\n        <div class=\"parse-bar\">\n          <select v-model.number=\"limit\" aria-label=\"Сколько постов загружать\">\n            <option :value=\"20\">20 последних постов</option>\n            <option :value=\"50\">50 последних постов</option>\n            <option :value=\"100\">100 последних постов</option>\n            <option :value=\"200\">200 последних постов</option>\n          </select>",
     "new": "@click=\"removeSource(s)\">{{ t('common.delete') }}</button>\n        </div>\n        <div class=\"parse-bar\">\n          <select v-model.number=\"limit\" :aria-label=\"t('parser.limitAria')\">\n            <option v-for=\"n in [20, 50, 100, 200]\" :key=\"n\" :value=\"n\">{{ t('parser.limitOption', { n }) }}</option>\n          </select>",
     "count": 1
    },
    {
     "old": "            {{ parsing ? 'Парсинг…' : `Спарсить выбранные (${selected.length})` }}\n          </button>\n        </div>\n        <p class=\"muted small mt-2\">Чем больше постов, тем дольше загрузка. Уже сохранённые посты не дублируются. Берутся текст, фото и видео. Из текста удаляются ссылки, @упоминания, хештеги и рекламные подписи; посты без текста пропускаются.</p>",
     "new": "            {{ parsing ? t('parser.parsing') : t('parser.parseBtn', { n: selected.length }) }}\n          </button>\n        </div>\n        <p class=\"muted small mt-2\">{{ t('parser.parseNote') }}</p>",
     "count": 1
    },
    {
     "old": ">Спарсенные посты<span v-if=\"total\"",
     "new": ">{{ t('parser.postsTitle') }}<span v-if=\"total\"",
     "count": 1
    },
    {
     "old": "aria-label=\"Фильтр по каналу-источнику\">\n          <option value=\"\">Все источники</option>",
     "new": ":aria-label=\"t('parser.filterAria')\">\n          <option value=\"\">{{ t('parser.allSources') }}</option>",
     "count": 1
    },
    {
     "old": "placeholder=\"Поиск по тексту\" class=\"filter\" />",
     "new": ":placeholder=\"t('parser.searchPlaceholder')\" class=\"filter\" />",
     "count": 1
    },
    {
     "old": "      <label>Канал публикации для кнопки «Сформировать пост»</label>\n      <select v-model=\"targetId\" :disabled=\"booting || !channels.length\">\n        <option v-if=\"!booting && !channels.length\" value=\"\">Нет доступных каналов</option>",
     "new": "      <label>{{ t('parser.targetLabel') }}</label>\n      <select v-model=\"targetId\" :disabled=\"booting || !channels.length\">\n        <option v-if=\"!booting && !channels.length\" value=\"\">{{ t('parser.noTargets') }}</option>",
     "count": 1
    },
    {
     "old": "class=\"muted mt-2\">Каналов для публикации нет: подключите канал на странице «Каналы» или попросите администратора выдать доступ.</p>",
     "new": "class=\"muted mt-2\">{{ t('parser.noTargetsHint') }}</p>",
     "count": 1
    },
    {
     "old": "      {{ search || filterSource ? 'По фильтру ничего не найдено.' : 'Спарсенных постов пока нет. Выберите каналы и нажмите «Спарсить выбранные».' }}",
     "new": "      {{ search || filterSource ? t('parser.noMatches') : t('parser.noPosts') }}",
     "count": 1
    },
    {
     "old": "{{ p.media_type === 'video' ? '🎬 видео · ' : '' }}",
     "new": "{{ p.media_type === 'video' ? t('parser.videoLabel') + ' · ' : '' }}",
     "count": 1
    },
    {
     "old": "{{ expanded.includes(p.id) ? 'Свернуть' : 'Показать полностью' }}",
     "new": "{{ expanded.includes(p.id) ? t('parser.collapse') : t('parser.expand') }}",
     "count": 1
    },
    {
     "old": "{{ creating.includes(p.id) ? 'Формирую…' : 'Сформировать пост' }}",
     "new": "{{ creating.includes(p.id) ? t('parser.making') : t('parser.makeDraft') }}",
     "count": 1
    },
    {
     "old": "<button>Уже в «Подготовке постов»</button></NuxtLink>\n        <span v-else class=\"badge published\" style=\"align-self: center\">Уже опубликован</span>",
     "new": "<button>{{ t('parser.inDrafts') }}</button></NuxtLink>\n        <span v-else class=\"badge published\" style=\"align-self: center\">{{ t('parser.alreadyPublished') }}</span>",
     "count": 1
    },
    {
     "old": "<button>Открыть оригинал</button>",
     "new": "<button>{{ t('parser.openOriginal') }}</button>",
     "count": 1
    },
    {
     "old": "{{ loadingPosts ? 'Загрузка…' : 'Показать ещё' }}",
     "new": "{{ loadingPosts ? t('common.loading') : t('parser.loadMore') }}",
     "count": 1
    }
   ]
  },
  {
   "file": "components/PostForm.vue",
   "hunks": [
    {
     "old": "const api = useApi()\n\nconst UPLOAD_PREFIX",
     "new": "const api = useApi()\nconst { t } = useLocale()\n\nconst UPLOAD_PREFIX",
     "count": 1
    },
    {
     "old": "throw new Error('Поддерживается только видео MP4 (H.264). Видео с iPhone (.mov) и другие форматы сначала сохраните или экспортируйте как MP4')\n      if (!file.size) throw new Error('Файл пустой')\n      if (file.size > MAX_VIDEO_BYTES) throw new Error(`Видео ${Math.ceil(file.size / 1048576)} МБ: Telegram принимает от бота файлы до 50 МБ`)",
     "new": "throw new Error(t('post.err.mp4Only'))\n      if (!file.size) throw new Error(t('post.err.empty'))\n      if (file.size > MAX_VIDEO_BYTES) throw new Error(t('post.err.videoTooBig', { mb: Math.ceil(file.size / 1048576) }))",
     "count": 1
    },
    {
     "old": "{{ post ? 'Редактирование поста' : 'Новый пост' }}</h2>\n\n    <label>Канал</label>",
     "new": "{{ post ? t('post.edit') : t('post.new') }}</h2>\n\n    <label>{{ t('common.channel') }}</label>",
     "count": 1
    },
    {
     "old": "    <label>Заголовок (виден только вам)</label>",
     "new": "    <label>{{ t('post.titleLabel') }}</label>",
     "count": 1
    },
    {
     "old": "    <label>Текст поста ({{ form.content.length }} / {{ limit }})</label>",
     "new": "    <label>{{ t('post.textLabel', { len: form.content.length, limit }) }}</label>",
     "count": 1
    },
    {
     "old": "        <label>Ссылка на изображение или видео (необязательно)</label>\n        <input v-if=\"!isUploaded\" v-model=\"form.media_url\" type=\"url\" placeholder=\"https://…\" />\n        <input v-else :value=\"isVideo ? 'Видео сохранено' : 'Загружено с устройства'\" readonly disabled />",
     "new": "        <label>{{ t('post.mediaLabel') }}</label>\n        <input v-if=\"!isUploaded\" v-model=\"form.media_url\" type=\"url\" placeholder=\"https://…\" />\n        <input v-else :value=\"isVideo ? t('post.videoSaved') : t('post.uploadedFromDevice')\" readonly disabled />",
     "count": 1
    },
    {
     "old": "            {{ uploading ? (progress ? `Загрузка… ${progress}%` : 'Загрузка…') : 'Загрузить с устройства' }}",
     "new": "            {{ uploading ? (progress ? t('post.uploadingPct', { p: progress }) : t('post.uploading')) : t('post.upload') }}",
     "count": 1
    },
    {
     "old": "{{ isVideo ? 'Убрать видео' : 'Убрать картинку' }}",
     "new": "{{ isVideo ? t('post.removeVideo') : t('post.removeImage') }}",
     "count": 1
    },
    {
     "old": "font-size: 13px\">Картинка (JPEG, PNG, WebP) или видео MP4 до 50 МБ</p>",
     "new": "font-size: 13px\">{{ t('post.mediaHint') }}</p>",
     "count": 1
    },
    {
     "old": "alt=\"Предпросмотр картинки\" />",
     "new": ":alt=\"t('post.previewAlt')\" />",
     "count": 1
    },
    {
     "old": "        <label>Форматирование</label>\n        <select v-model=\"form.parse_mode\">\n          <option value=\"\">Без форматирования</option>",
     "new": "        <label>{{ t('post.format') }}</label>\n        <select v-model=\"form.parse_mode\">\n          <option value=\"\">{{ t('post.formatNone') }}</option>",
     "count": 1
    },
    {
     "old": "    <label>Время публикации (не выбрано — сохранить как черновик)</label>",
     "new": "    <label>{{ t('post.timeLabel') }}</label>",
     "count": 1
    },
    {
     "old": "{{ form.scheduled_at ? 'Запланировать' : 'Сохранить черновик' }}</button>\n      <button type=\"button\" @click=\"emit('cancel')\">Отмена</button>",
     "new": "{{ form.scheduled_at ? t('post.schedule') : t('post.saveDraft') }}</button>\n      <button type=\"button\" @click=\"emit('cancel')\">{{ t('common.cancel') }}</button>",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/schema.js",
   "hunks": [
    {
     "old": "create index if not exists users_last_active_idx on users (last_active_at);\n`;",
     "new": "create index if not exists users_last_active_idx on users (last_active_at);\n\n-- язык интерфейса пользователя (ru | en); применяется после входа на любом устройстве\nalter table users add column if not exists lang text not null default 'ru';\n`;",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/auth.js",
   "hunks": [
    {
     "old": "    `select u.id, u.email, u.name, u.role, u.owner_id, u.is_super",
     "new": "    `select u.id, u.email, u.name, u.role, u.owner_id, u.is_super, u.lang",
     "count": 1
    },
    {
     "old": "export function cleanUserInput(body = {}) {",
     "new": "// Языки интерфейса (users.lang). Клиентская часть: composables/useLocale.ts и locales/\nexport const LANGS = ['ru', 'en'];\nexport const normalizeLang = (v) => (LANGS.includes(v) ? v : null);\n\nexport function cleanUserInput(body = {}) {",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/routes/auth.js",
   "hunks": [
    {
     "old": "  assertPassword, cleanUserInput, createSession, currentUser, destroySession,\n  hashPassword, readToken, requireAuth, sha, verifyPassword,",
     "new": "  assertPassword, cleanUserInput, createSession, currentUser, destroySession,\n  hashPassword, normalizeLang, readToken, requireAuth, sha, verifyPassword,",
     "count": 1
    },
    {
     "old": "const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, is_super: Boolean(u.is_super) });",
     "new": "const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, is_super: Boolean(u.is_super), lang: normalizeLang(u.lang) ?? 'ru' });",
     "count": 1
    },
    {
     "old": "    `insert into users (email, name, password_hash, role, is_super)\n     select $1, $2, $3, 'admin', true where not exists (select 1 from users)\n     returning id, email, name, role, is_super`,\n    [email, name, await hashPassword(password)],",
     "new": "    `insert into users (email, name, password_hash, role, is_super, lang)\n     select $1, $2, $3, 'admin', true, $4 where not exists (select 1 from users)\n     returning id, email, name, role, is_super, lang`,\n    [email, name, await hashPassword(password), normalizeLang(req.body?.lang) ?? 'ru'],",
     "count": 1
    },
    {
     "old": "    `insert into users (email, name, password_hash, role, is_super) values ($1, $2, $3, 'admin', false)\n     returning id, email, name, role, is_super`,\n    [email, name, await hashPassword(password)],",
     "new": "    `insert into users (email, name, password_hash, role, is_super, lang) values ($1, $2, $3, 'admin', false, $4)\n     returning id, email, name, role, is_super, lang`,\n    [email, name, await hashPassword(password), normalizeLang(req.body?.lang) ?? 'ru'],",
     "count": 1
    },
    {
     "old": "// Сведения для страницы «Профиль»: можно ли удалить аккаунт",
     "new": "// Язык интерфейса аккаунта (страница «Профиль»)\nr.put('/lang', requireAuth, async (req, res) => {\n  const lang = normalizeLang(req.body?.lang);\n  if (!lang) throw httpError('Неподдерживаемый язык');\n  await q('update users set lang = $2 where id = $1', [req.user.id, lang]);\n  res.json({ lang });\n});\n\n// Сведения для страницы «Профиль»: можно ли удалить аккаунт",
     "count": 1
    }
   ]
  },
  {
   "file": "server/express/routes/users.js",
   "hunks": [
    {
     "old": "import { assertPassword, cleanUserInput, hashPassword, requireRole, requireSuper } from '../auth.js';",
     "new": "import { assertPassword, cleanUserInput, hashPassword, normalizeLang, requireRole, requireSuper } from '../auth.js';",
     "count": 1
    },
    {
     "old": "    `insert into users (email, name, password_hash, role, owner_id) values ($1, $2, $3, $4, $5)\n     returning id, email, name, role, created_at`,\n    [email, name, await hashPassword(password), role, role === 'editor' ? req.user.id : null],",
     "new": "    `insert into users (email, name, password_hash, role, owner_id, lang) values ($1, $2, $3, $4, $5, $6)\n     returning id, email, name, role, created_at`,\n    // новый пользователь начинает с языком создавшего его администратора (сменить можно в профиле)\n    [email, name, await hashPassword(password), role, role === 'editor' ? req.user.id : null, normalizeLang(req.user.lang) ?? 'ru'],",
     "count": 1
    }
   ]
  },
  {
   "file": "assets/main.css",
   "hunks": [
    {
     "old": "progress.upload-progress { display: block; width: 100%; height: 8px; margin-top: 10px; accent-color: var(--accent); }",
     "new": "progress.upload-progress { display: block; width: 100%; height: 8px; margin-top: 10px; accent-color: var(--accent); }\n\n/* переключатель языка на страницах входа и регистрации */\n.lang-buttons { display: flex; justify-content: flex-end; gap: var(--s-1); margin-bottom: var(--s-3); }\n.lang-buttons button { padding: 2px var(--s-3); border-radius: 99px; font-size: 13px; color: var(--muted); }\n.lang-buttons button.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); font-weight: 600; }",
     "count": 1
    }
   ]
  },
  {
   "file": "README.md",
   "hunks": [
    {
     "old": "pages/ components/ composables/ middleware/   интерфейс Nuxt\n```",
     "new": "pages/ components/ composables/ middleware/   интерфейс Nuxt\nlocales/                   тексты интерфейса (ru.ts, en.ts) и перевод сообщений сервера\n```\n\n## Язык интерфейса\n\nИнтерфейс работает на русском и английском. Язык выбирается на странице «Профиль» (блок «Язык интерфейса») и хранится в аккаунте (`users.lang`), поэтому на другом устройстве интерфейс откроется на том же языке. На страницах входа и регистрации язык переключается кнопками RU / EN; язык, выбранный там, сохраняется в аккаунт. Новый пользователь, которого создаёт администратор, начинает с языком администратора. Язык по умолчанию — русский.\n\n- Тексты лежат в `locales/ru.ts` и `locales/en.ts` (ключи общие, русский — основной), логика — в `composables/useLocale.ts`: `t('ключ', { имя: значение })`, для множественного числа третий параметр — число.\n- Сообщения об ошибках сервер по-прежнему пишет по-русски; для других языков клиент переводит их по таблице `locales/server-errors.ts`. Добавили сообщение в `server/express` — добавьте его и в таблицу, иначе оно останется русским.\n- Руководство пользователя написано отдельно для каждого языка: `components/GuideRu.vue` и `components/GuideEn.vue`. Правьте оба.\n- Чтобы добавить язык: `locales/<код>.ts`, запись в `composables/useLocale.ts`, код в `LANGS` в `server/express/auth.js` и перевод руководства.\n- Названия каналов, тексты постов и сообщения, которые бот пишет в Telegram, не переводятся.",
     "count": 1
    }
   ]
  }
 ],
 "files": {
  "locales/types.ts": "export type Locale = 'ru' | 'en'\n\n/** Формы множественного числа (ключи Intl.PluralRules); other обязателен. */\nexport interface PluralForms {\n  one?: string\n  few?: string\n  many?: string\n  other: string\n}\n\nexport type Entry = string | PluralForms\nexport type Messages = Record<string, Entry>\n",
  "locales/ru.ts": "// Тексты интерфейса: русский. Ключи у обоих языков одинаковые (locales/ru.ts — основной).\n// {имя} — подстановка; значение-объект — формы множественного числа (выбираются по числу, переданному в t(ключ, параметры, число)).\nimport type { Messages } from './types'\n\nconst ru: Messages = {\n  'app.name': 'Менеджер каналов',\n  'lang.label': 'Язык интерфейса',\n  'nav.menu': 'Меню',\n  'nav.sections': 'Разделы',\n  'nav.logout': 'Выйти',\n  'nav.channels': 'Каналы',\n  'nav.parser': 'Парсер',\n  'nav.drafts': 'Подготовка постов',\n  'nav.published': 'Опубликованные',\n  'nav.metrics': 'Метрики',\n  'nav.bot': 'Бот',\n  'nav.users': 'Пользователи',\n  'nav.guide': 'Руководство пользователя',\n  'nav.support': 'Поддержать проект',\n  'common.cancel': 'Отмена',\n  'common.confirm': 'Подтвердить',\n  'common.save': 'Сохранить',\n  'common.delete': 'Удалить',\n  'common.add': 'Добавить',\n  'common.selectAll': 'Выбрать все',\n  'common.allChannels': 'Все каналы',\n  'common.channel': 'Канал',\n  'common.checking': 'Проверяю…',\n  'common.loading': 'Загрузка…',\n  'common.requestError': 'Ошибка запроса',\n  'common.author': 'Автор',\n  'common.published': 'Опубликовано',\n  'field.email': 'Email',\n  'field.name': 'Имя',\n  'field.password': 'Пароль',\n  'field.passwordMin': 'Пароль (не короче 8 символов)',\n  'field.repeatPassword': 'Повторите пароль',\n  'field.inviteCode': 'Код приглашения',\n  'field.currentPassword': 'Текущий пароль',\n  'field.newPassword': 'Новый пароль (не короче 8 символов)',\n  'role.admin': 'администратор',\n  'role.editor': 'редактор',\n  'login.titleSetup': 'Создание администратора',\n  'login.title': 'Вход',\n  'login.noUsers': 'Пользователей пока нет. Эта учётная запись станет администратором.',\n  'login.createAndSignIn': 'Создать и войти',\n  'login.submit': 'Войти',\n  'login.noAccount': 'Нет аккаунта?',\n  'login.register': 'Зарегистрироваться',\n  'register.title': 'Регистрация',\n  'register.intro': 'Вы получите собственное изолированное пространство: свои каналы, редакторов и источники парсера. Публиковать посты будет ваш бот, токен которого вы подключите после регистрации.',\n  'register.mismatch': 'Пароли не совпадают',\n  'register.busy': 'Создаю…',\n  'register.submit': 'Зарегистрироваться',\n  'register.haveAccount': 'Уже есть аккаунт?',\n  'register.disabled': 'Самостоятельная регистрация отключена. Попросите администратора создать для вас аккаунт.',\n  'channels.title': 'Каналы',\n  'channels.connectTitle': 'Подключить канал',\n  'channels.connectHint': 'Добавьте бота администратором канала с правом публикации, затем укажите @username или числовой id канала.',\n  'channels.chatPlaceholder': '@my_channel или -1001234567890',\n  'channels.titlePlaceholder': 'Название (если бот не подключён к API)',\n  'channels.connect': 'Подключить',\n  'channels.emptyAdmin': 'Каналов пока нет. Подключите первый выше.',\n  'channels.emptyEditor': 'Вам пока не назначены каналы. Обратитесь к администратору.',\n  'channels.private': 'приватный канал',\n  'channels.disabled': 'Отключён',\n  'channels.subscribers': '{n} подписчиков',\n  'channels.published': 'Опубликовано',\n  'channels.pending': 'В подготовке',\n  'channels.access': 'Доступ',\n  'channels.adminsOnly': 'только администраторы',\n  'channels.refresh': 'Обновить данные',\n  'channels.disablePosting': 'Отключить публикации',\n  'channels.enablePosting': 'Включить публикации',\n  'channels.accessTitle': 'Кому доступен канал',\n  'channels.noEditors': 'Редакторов пока нет. Добавьте их на странице «Пользователи».',\n  'channels.deleteTitle': 'Удалить канал?',\n  'channels.deleteMsg': 'Канал «{title}» будет удалён вместе со всеми его постами.',\n  'drafts.title': 'Подготовка постов',\n  'status.draft': 'Черновик',\n  'status.scheduled': 'В графике',\n  'status.publishing': 'Публикуется',\n  'status.failed': 'Ошибка публикации',\n  'drafts.noChannelsAdmin': 'Сначала подключите канал на странице «Каналы».',\n  'drafts.empty': 'Постов в подготовке нет. Создайте новый.',\n  'drafts.publishTitle': 'Опубликовать пост?',\n  'drafts.publishMsg': 'Пост «{title}» будет сразу опубликован в канале «{channel}».',\n  'drafts.publishConfirm': 'Опубликовать',\n  'drafts.deleteTitle': 'Удалить пост?',\n  'drafts.deleteMsg': 'Пост «{title}» будет удалён.',\n  'drafts.publishAt': 'Публикация',\n  'drafts.edit': 'Редактировать',\n  'drafts.publishNow': 'Опубликовать сейчас',\n  'drafts.unschedule': 'Убрать из графика',\n  'published.title': 'Опубликованные',\n  'published.empty': 'Опубликованных постов пока нет.',\n  'published.deleteTitle': 'Удалить запись?',\n  'published.deleteMsg': 'Запись «{title}» будет удалена.',\n  'published.deleteFromTg': 'Удалить и само сообщение из канала',\n  'published.byAuthor': 'автор: {name}',\n  'published.openInTg': 'Открыть в Telegram',\n  'metrics.title': 'Метрики',\n  'metrics.scopeAll': 'во всех каналах',\n  'metrics.scopeOne': '«{title}»',\n  'metrics.subscribersScope': 'Подписчиков {scope}',\n  'metrics.publishedPosts': 'Опубликовано постов',\n  'metrics.likesTotal': 'Лайков всего',\n  'metrics.scheduled': 'В графике',\n  'metrics.drafts': 'Черновиков',\n  'metrics.dynamics': 'Динамика за 30 дней',\n  'metrics.chartPosts': 'Публикации по дням',\n  'metrics.chartLikes': 'Лайки по дням',\n  'metrics.chartSubs': 'Подписчики',\n  'metrics.channelOne': 'Канал',\n  'metrics.channelMany': 'Каналы',\n  'metrics.col.channel': 'Канал',\n  'metrics.col.subscribers': 'Подписчики',\n  'metrics.col.growth': 'Рост за 30 дней',\n  'metrics.col.posts': 'Постов',\n  'metrics.col.likes': 'Лайков',\n  'metrics.col.likesPerPost': 'Лайков на пост',\n  'metrics.topPosts': 'Лучшие посты по лайкам',\n  'metrics.col.post': 'Пост',\n  'metrics.col.date': 'Дата',\n  'metrics.col.likesShort': 'Лайки',\n  'chart.empty': 'Данных пока нет',\n  'bot.title': 'Бот',\n  'bot.connectedOk': 'Бот подключён.',\n  'bot.disconnectedOk': 'Бот отключён.',\n  'bot.disconnectTitle': 'Отключить бота?',\n  'bot.disconnectMsg': 'Публикация и статистика ваших каналов остановятся, запланированные посты будут помечены как неудавшиеся, а кнопки «лайк» под уже опубликованными постами перестанут работать.',\n  'bot.disconnect': 'Отключить',\n  'bot.noSecrets': 'На сервере не задан <code>SECRETS_KEY</code>: токен бота негде безопасно хранить, подключить его пока нельзя. Обратитесь к владельцу сервера.',\n  'bot.status': 'Статус',\n  'bot.statusUnavailable': 'Статус недоступен.',\n  'bot.notConnected': 'Бот не подключён: публикация, сбор статистики и подключение каналов по @username недоступны.',\n  'bot.connectedLabel': 'Подключён',\n  'bot.updatedAt': 'обновлён {date}',\n  'bot.defaultBot': 'Используется бот по умолчанию из настроек сервера. Подключите своего бота ниже, и он заменит его.',\n  'bot.updatesFrom': 'События от Telegram',\n  'bot.webhookRegistered': 'зарегистрирован',\n  'bot.webhookNotRegistered': 'не зарегистрирован',\n  'bot.webhookPending': 'в очереди: {n}',\n  'bot.webhookError': 'Не удалось зарегистрировать webhook: {error}',\n  'bot.lastError': 'Последняя ошибка доставки',\n  'bot.webhookHint': 'Telegram должен достучаться до сервера по HTTPS: проверьте PUBLIC_URL, сертификат и прокси.',\n  'bot.pollingHint': 'События от Telegram: polling (режим для разработки). Чтобы перейти на webhook, владельцу сервера нужно задать <code>PUBLIC_URL</code> с https://.',\n  'bot.replaceTitle': 'Заменить бота',\n  'bot.connectTitle': 'Подключить бота',\n  'bot.tokenHelp': 'Создайте бота у @BotFather и вставьте его токен. Токен хранится на сервере в зашифрованном виде, виден только вам и не показывается после сохранения. У каждого администратора свой бот, поэтому ваши каналы и публикации недоступны другим.',\n  'bot.tokenLabel': 'Токен бота',\n  'bot.howTitle': 'Как подключить канал',\n  'bot.step1': 'Подключите бота выше.',\n  'bot.step2': 'Добавьте этого бота администратором своего канала с правом публикации сообщений.',\n  'bot.step3': 'На странице «Каналы» укажите @username или числовой id канала.',\n  'bot.replaceNote': 'Если заменить бота, под старыми постами «лайки» работать перестанут (кнопки привязаны к прежнему боту), а новый бот нужно заново добавить администратором в каналы.',\n  'users.title': 'Пользователи',\n  'users.newEditor': 'Новый редактор',\n  'users.channelsOf': 'Каналы редактора {name}',\n  'users.noChannels': 'Каналов пока нет. Подключите канал на странице «Каналы».',\n  'users.myEditors': 'Мои редакторы',\n  'users.noEditors': 'Редакторов пока нет.',\n  'users.col.name': 'Имя',\n  'users.col.channels': 'Каналы',\n  'users.col.created': 'Создан',\n  'users.col.channelsCount': 'Каналов',\n  'users.col.editorsCount': 'Редакторов',\n  'users.noAccess': 'нет доступа',\n  'users.channelsBtn': 'Каналы',\n  'users.resetPassword': 'Сбросить пароль',\n  'users.resetTitle': 'Сброс пароля',\n  'users.resetMsg': 'Новый пароль для {email}.',\n  'users.resetConfirm': 'Сменить пароль',\n  'users.removeEditorTitle': 'Удалить редактора?',\n  'users.removeEditorMsg': 'Редактор {email} будет удалён.',\n  'users.removeAdminTitle': 'Удалить администратора?',\n  'users.removeAdminMsg1': 'Администратор {email} будет удалён.',\n  'users.removeAdminMsg2': 'Вместе с ним будут безвозвратно удалены его каналы ({channels}) с постами и его редакторы ({editors}).',\n  'users.admins': 'Администраторы',\n  'users.newAdmin': 'Новый администратор',\n  'users.newAdminHint': 'У каждого администратора своё изолированное пространство: свои каналы, редакторы и источники парсера. Вы их не увидите.',\n  'users.you': 'вы',\n  'users.main': 'главный',\n  'users.footer': 'Администратор работает в своём изолированном пространстве: видит только свои каналы, посты, метрики и источники парсера, и управляет только своими редакторами. Редактор работает только с каналами, которые за ним закреплены.',\n  'users.footerSuper': 'Главный администратор дополнительно создаёт других администраторов и может удалить их вместе с их пространством.',\n  'parser.title': 'Парсер',\n  'parser.addTitle': 'Добавить канал',\n  'parser.addHint': 'Укажите @username или ссылку на публичный канал. Парсится его открытая веб-версия (t.me/s/…), поэтому приватные каналы и каналы с отключённым просмотром не подойдут.',\n  'parser.addPlaceholder': '@channel_name или https://t.me/channel_name',\n  'parser.added': 'Канал @{username} добавлен. Загружено новых постов: {added}.',\n  'parser.done': 'Готово: каналов — {channels}, новых постов — {added}.',\n  'parser.deleteMsg': 'Канал @{username} и {n} спарсенных постов будут удалены. Уже созданные черновики останутся.',\n  'parser.removed': 'Канал @{username} удалён.',\n  'parser.pickChannel': 'Выберите канал для публикации',\n  'parser.draftAdded': 'Пост добавлен в «Подготовку постов».',\n  'parser.openDrafts': 'Открыть «Подготовка постов»',\n  'parser.sourcesTitle': 'Каналы для парсинга',\n  'parser.noSources': 'Каналов пока нет. Добавьте первый выше.',\n  'parser.postsCount': 'постов: {n}',\n  'parser.updatedAt': 'обновлён {date}',\n  'parser.neverParsed': 'ещё не парсился',\n  'parser.limitAria': 'Сколько постов загружать',\n  'parser.limitOption': '{n} последних постов',\n  'parser.parseBtn': 'Спарсить выбранные ({n})',\n  'parser.parsing': 'Парсинг…',\n  'parser.parseNote': 'Чем больше постов, тем дольше загрузка. Уже сохранённые посты не дублируются. Берутся текст, фото и видео. Из текста удаляются ссылки, @упоминания, хештеги и рекламные подписи; посты без текста пропускаются.',\n  'parser.postsTitle': 'Спарсенные посты',\n  'parser.allSources': 'Все источники',\n  'parser.filterAria': 'Фильтр по каналу-источнику',\n  'parser.searchPlaceholder': 'Поиск по тексту',\n  'parser.targetLabel': 'Канал публикации для кнопки «Сформировать пост»',\n  'parser.noTargets': 'Нет доступных каналов',\n  'parser.noTargetsHint': 'Каналов для публикации нет: подключите канал на странице «Каналы» или попросите администратора выдать доступ.',\n  'parser.noMatches': 'По фильтру ничего не найдено.',\n  'parser.noPosts': 'Спарсенных постов пока нет. Выберите каналы и нажмите «Спарсить выбранные».',\n  'parser.videoLabel': '🎬 видео',\n  'parser.collapse': 'Свернуть',\n  'parser.expand': 'Показать полностью',\n  'parser.makeDraft': 'Сформировать пост',\n  'parser.making': 'Формирую…',\n  'parser.inDrafts': 'Уже в «Подготовке постов»',\n  'parser.alreadyPublished': 'Уже опубликован',\n  'parser.openOriginal': 'Открыть оригинал',\n  'parser.loadMore': 'Показать ещё',\n  'account.title': 'Профиль',\n  'account.passwordTitle': 'Смена пароля',\n  'account.passwordChanged': 'Пароль изменён. На других устройствах потребуется войти заново.',\n  'account.changePassword': 'Сменить пароль',\n  'account.languageTitle': 'Язык интерфейса',\n  'account.languageLabel': 'Язык',\n  'account.languageHint': 'Язык применяется сразу и сохраняется в вашем аккаунте: на других устройствах интерфейс откроется на том же языке. Названия каналов и тексты постов не переводятся.',\n  'account.languageSaved': 'Язык сохранён.',\n  'account.languageSaveFailed': 'Язык изменён, но сохранить его в аккаунте не удалось: {error}',\n  'account.deleteTitle': 'Удаление аккаунта',\n  'account.inactiveInfo': 'Если в аккаунт не заходить {n} дн. подряд, он удаляется автоматически.',\n  'account.superNoDelete': 'Главный администратор не может удалить аккаунт.',\n  'account.adminWarn': 'Вместе с аккаунтом удалятся ваши каналы (<b>{channels}</b>) с постами и статистикой, источники парсера, бот и редакторы (<b>{editors}</b>).',\n  'account.editorWarn': 'Удалится только ваш аккаунт. Созданные вами посты останутся у администратора.',\n  'account.confirmPassword': 'Пароль для подтверждения',\n  'account.deleting': 'Удаляю…',\n  'account.deleteBtn': 'Удалить аккаунт',\n  'account.confirmTitle': 'Удалить аккаунт?',\n  'account.confirmMsgAdmin': 'Будут безвозвратно удалены ваш аккаунт, все ваши каналы с постами и статистикой, источники парсера, подключённый бот и редакторы ({editors}). Сообщения, уже опубликованные в Telegram, останутся.',\n  'account.confirmMsgEditor': 'Ваш аккаунт будет безвозвратно удалён. Посты, которые вы создали, останутся у администратора.',\n  'account.confirmIrreversible': 'Отменить это будет нельзя.',\n  'support.title': 'Поддержать проект',\n  'support.p1': '«Менеджер каналов» — бесплатный проект. Им может пользоваться каждый, платить ничего не нужно, а развивает и поддерживает его один разработчик.',\n  'support.p2': 'Если сервис вам полезен, вы можете по желанию поддержать проект пожертвованием. Это добровольно: на доступ к возможностям сервиса пожертвование никак не влияет.',\n  'support.walletsTitle': 'Реквизиты для пожертвований',\n  'support.sbp': 'СБП (Служба быстрых платежей)',\n  'support.copy': 'Копировать',\n  'support.copied': 'Скопировано',\n  'support.copyAria': 'Скопировать: {name}',\n  'support.note': 'Перед переводом сверьте адрес или номер: переводы в криптовалютах необратимы. Спасибо за поддержку!',\n  'post.new': 'Новый пост',\n  'post.edit': 'Редактирование поста',\n  'post.titleLabel': 'Заголовок (виден только вам)',\n  'post.textLabel': 'Текст поста ({len} / {limit})',\n  'post.mediaLabel': 'Ссылка на изображение или видео (необязательно)',\n  'post.videoSaved': 'Видео сохранено',\n  'post.uploadedFromDevice': 'Загружено с устройства',\n  'post.uploading': 'Загрузка…',\n  'post.uploadingPct': 'Загрузка… {p}%',\n  'post.upload': 'Загрузить с устройства',\n  'post.removeVideo': 'Убрать видео',\n  'post.removeImage': 'Убрать картинку',\n  'post.mediaHint': 'Картинка (JPEG, PNG, WebP) или видео MP4 до 50 МБ',\n  'post.previewAlt': 'Предпросмотр картинки',\n  'post.format': 'Форматирование',\n  'post.formatNone': 'Без форматирования',\n  'post.timeLabel': 'Время публикации (не выбрано — сохранить как черновик)',\n  'post.schedule': 'Запланировать',\n  'post.saveDraft': 'Сохранить черновик',\n  'post.err.mp4Only': 'Поддерживается только видео MP4 (H.264). Видео с iPhone (.mov) и другие форматы сначала сохраните или экспортируйте как MP4',\n  'post.err.empty': 'Файл пустой',\n  'post.err.videoTooBig': 'Видео {mb} МБ: Telegram принимает от бота файлы до 50 МБ',\n  'dt.dateAria': 'Дата публикации',\n  'dt.hoursAria': 'Часы',\n  'dt.minutesAria': 'Минуты',\n  'dt.hh': 'чч',\n  'dt.mm': 'мм',\n  'dt.inHour': 'Через час',\n  'dt.today18': 'Сегодня в 18:00',\n  'dt.tomorrow9': 'Завтра в 9:00',\n  'dt.clear': 'Очистить',\n  'dt.pastWarn': 'Время уже прошло: пост опубликуется в течение минуты.',\n  'dt.willPublish': 'Опубликуется:',\n  'upload.err.tooBig': 'Файл отклонен как слишком большой.',\n  'upload.err.session': 'Сессия истекла. Войдите заново',\n  'upload.err.failed': 'Не удалось загрузить файл (код {status})',\n  'upload.err.network': 'Не удалось загрузить файл: проблема с соединением',\n  'upload.err.timeout': 'Загрузка заняла слишком много времени',\n  'upload.err.aborted': 'Загрузка прервана',\n  'image.err.notImage': 'Выберите файл изображения',\n  'image.err.unreadable': 'Не удалось прочитать изображение. Попробуйте JPEG, PNG или WebP',\n  'image.err.processing': 'Не удалось обработать изображение',\n  'sealed.err.tooLong': 'Сообщение слишком длинное для RSA-блока',\n  'guide.title': 'Руководство пользователя',\n  'guide.toc': 'Содержание',\n  'guide.tocAria': 'Содержание руководства',\n  'guide.toc.start': 'Быстрый старт',\n  'guide.toc.roles': 'Роли и доступ',\n  'guide.toc.bot': 'Бот',\n  'guide.toc.channels': 'Каналы',\n  'guide.toc.parser': 'Парсер',\n  'guide.toc.drafts': 'Подготовка постов',\n  'guide.toc.published': 'Опубликованные',\n  'guide.toc.metrics': 'Метрики',\n  'guide.toc.users': 'Пользователи',\n  'guide.toc.account': 'Профиль',\n  'guide.toc.language': 'Язык интерфейса',\n  'guide.toc.delete': 'Удаление аккаунта',\n  'guide.toc.faq': 'Частые вопросы',\n}\n\nexport default ru\n",
  "locales/en.ts": "// Тексты интерфейса: английский. Ключи у обоих языков одинаковые (locales/ru.ts — основной).\n// {имя} — подстановка; значение-объект — формы множественного числа (выбираются по числу, переданному в t(ключ, параметры, число)).\nimport type { Messages } from './types'\n\nconst en: Messages = {\n  'app.name': 'Channel Manager',\n  'lang.label': 'Interface language',\n  'nav.menu': 'Menu',\n  'nav.sections': 'Sections',\n  'nav.logout': 'Sign out',\n  'nav.channels': 'Channels',\n  'nav.parser': 'Parser',\n  'nav.drafts': 'Post preparation',\n  'nav.published': 'Published',\n  'nav.metrics': 'Metrics',\n  'nav.bot': 'Bot',\n  'nav.users': 'Users',\n  'nav.guide': 'User guide',\n  'nav.support': 'Support the project',\n  'common.cancel': 'Cancel',\n  'common.confirm': 'Confirm',\n  'common.save': 'Save',\n  'common.delete': 'Delete',\n  'common.add': 'Add',\n  'common.selectAll': 'Select all',\n  'common.allChannels': 'All channels',\n  'common.channel': 'Channel',\n  'common.checking': 'Checking…',\n  'common.loading': 'Loading…',\n  'common.requestError': 'Request failed',\n  'common.author': 'Author',\n  'common.published': 'Published',\n  'field.email': 'Email',\n  'field.name': 'Name',\n  'field.password': 'Password',\n  'field.passwordMin': 'Password (at least 8 characters)',\n  'field.repeatPassword': 'Repeat password',\n  'field.inviteCode': 'Invitation code',\n  'field.currentPassword': 'Current password',\n  'field.newPassword': 'New password (at least 8 characters)',\n  'role.admin': 'administrator',\n  'role.editor': 'editor',\n  'login.titleSetup': 'Create the administrator',\n  'login.title': 'Sign in',\n  'login.noUsers': 'There are no users yet. This account will become the administrator.',\n  'login.createAndSignIn': 'Create and sign in',\n  'login.submit': 'Sign in',\n  'login.noAccount': 'No account yet?',\n  'login.register': 'Sign up',\n  'register.title': 'Sign up',\n  'register.intro': 'You will get your own isolated workspace: your own channels, editors and parser sources. Posts are published by your bot, whose token you connect after signing up.',\n  'register.mismatch': 'Passwords do not match',\n  'register.busy': 'Creating…',\n  'register.submit': 'Sign up',\n  'register.haveAccount': 'Already have an account?',\n  'register.disabled': 'Self-registration is disabled. Ask an administrator to create an account for you.',\n  'channels.title': 'Channels',\n  'channels.connectTitle': 'Connect a channel',\n  'channels.connectHint': 'Add the bot as a channel administrator with permission to post, then enter the channel @username or numeric id.',\n  'channels.chatPlaceholder': '@my_channel or -1001234567890',\n  'channels.titlePlaceholder': 'Title (if the bot is not connected to the API)',\n  'channels.connect': 'Connect',\n  'channels.emptyAdmin': 'No channels yet. Connect the first one above.',\n  'channels.emptyEditor': 'No channels have been assigned to you yet. Contact an administrator.',\n  'channels.private': 'private channel',\n  'channels.disabled': 'Disabled',\n  'channels.subscribers': { one: '{n} subscriber', other: '{n} subscribers' },\n  'channels.published': 'Published',\n  'channels.pending': 'In preparation',\n  'channels.access': 'Access',\n  'channels.adminsOnly': 'administrators only',\n  'channels.refresh': 'Refresh data',\n  'channels.disablePosting': 'Disable publishing',\n  'channels.enablePosting': 'Enable publishing',\n  'channels.accessTitle': 'Who can access this channel',\n  'channels.noEditors': 'There are no editors yet. Add them on the “Users” page.',\n  'channels.deleteTitle': 'Delete the channel?',\n  'channels.deleteMsg': 'The channel “{title}” will be deleted along with all its posts.',\n  'drafts.title': 'Post preparation',\n  'status.draft': 'Draft',\n  'status.scheduled': 'Scheduled',\n  'status.publishing': 'Publishing',\n  'status.failed': 'Publishing failed',\n  'drafts.noChannelsAdmin': 'First connect a channel on the “Channels” page.',\n  'drafts.empty': 'There are no posts in preparation. Create a new one.',\n  'drafts.publishTitle': 'Publish the post?',\n  'drafts.publishMsg': 'The post “{title}” will be published to the channel “{channel}” right away.',\n  'drafts.publishConfirm': 'Publish',\n  'drafts.deleteTitle': 'Delete the post?',\n  'drafts.deleteMsg': 'The post “{title}” will be deleted.',\n  'drafts.publishAt': 'Publish at',\n  'drafts.edit': 'Edit',\n  'drafts.publishNow': 'Publish now',\n  'drafts.unschedule': 'Remove from schedule',\n  'published.title': 'Published',\n  'published.empty': 'There are no published posts yet.',\n  'published.deleteTitle': 'Delete the entry?',\n  'published.deleteMsg': 'The entry “{title}” will be deleted.',\n  'published.deleteFromTg': 'Also delete the message from the channel',\n  'published.byAuthor': 'author: {name}',\n  'published.openInTg': 'Open in Telegram',\n  'metrics.title': 'Metrics',\n  'metrics.scopeAll': 'across all channels',\n  'metrics.scopeOne': 'of “{title}”',\n  'metrics.subscribersScope': 'Subscribers {scope}',\n  'metrics.publishedPosts': 'Posts published',\n  'metrics.likesTotal': 'Total likes',\n  'metrics.scheduled': 'Scheduled',\n  'metrics.drafts': 'Drafts',\n  'metrics.dynamics': 'Last 30 days',\n  'metrics.chartPosts': 'Posts per day',\n  'metrics.chartLikes': 'Likes per day',\n  'metrics.chartSubs': 'Subscribers',\n  'metrics.channelOne': 'Channel',\n  'metrics.channelMany': 'Channels',\n  'metrics.col.channel': 'Channel',\n  'metrics.col.subscribers': 'Subscribers',\n  'metrics.col.growth': '30-day growth',\n  'metrics.col.posts': 'Posts',\n  'metrics.col.likes': 'Likes',\n  'metrics.col.likesPerPost': 'Likes per post',\n  'metrics.topPosts': 'Top posts by likes',\n  'metrics.col.post': 'Post',\n  'metrics.col.date': 'Date',\n  'metrics.col.likesShort': 'Likes',\n  'chart.empty': 'No data yet',\n  'bot.title': 'Bot',\n  'bot.connectedOk': 'The bot is connected.',\n  'bot.disconnectedOk': 'The bot has been disconnected.',\n  'bot.disconnectTitle': 'Disconnect the bot?',\n  'bot.disconnectMsg': 'Publishing and statistics for your channels will stop, scheduled posts will be marked as failed, and the “like” buttons under already published posts will stop working.',\n  'bot.disconnect': 'Disconnect',\n  'bot.noSecrets': '<code>SECRETS_KEY</code> is not set on the server, so the bot token cannot be stored securely and the bot cannot be connected yet. Contact the server owner.',\n  'bot.status': 'Status',\n  'bot.statusUnavailable': 'Status unavailable.',\n  'bot.notConnected': 'The bot is not connected: publishing, statistics collection and connecting channels by @username are unavailable.',\n  'bot.connectedLabel': 'Connected',\n  'bot.updatedAt': 'updated {date}',\n  'bot.defaultBot': 'The default bot from the server settings is in use. Connect your own bot below and it will replace it.',\n  'bot.updatesFrom': 'Updates from Telegram',\n  'bot.webhookRegistered': 'registered',\n  'bot.webhookNotRegistered': 'not registered',\n  'bot.webhookPending': 'queued: {n}',\n  'bot.webhookError': 'Could not register the webhook: {error}',\n  'bot.lastError': 'Last delivery error',\n  'bot.webhookHint': 'Telegram must be able to reach the server over HTTPS: check PUBLIC_URL, the certificate and the proxy.',\n  'bot.pollingHint': 'Updates from Telegram: polling (development mode). To switch to a webhook, the server owner needs to set <code>PUBLIC_URL</code> with https://.',\n  'bot.replaceTitle': 'Replace the bot',\n  'bot.connectTitle': 'Connect the bot',\n  'bot.tokenHelp': 'Create a bot with @BotFather and paste its token. The token is stored on the server in encrypted form, is visible only to you and is not shown after saving. Each administrator has their own bot, so your channels and posts are not accessible to others.',\n  'bot.tokenLabel': 'Bot token',\n  'bot.howTitle': 'How to connect a channel',\n  'bot.step1': 'Connect the bot above.',\n  'bot.step2': 'Add this bot as an administrator of your channel with permission to post messages.',\n  'bot.step3': 'On the “Channels” page, enter the channel @username or numeric id.',\n  'bot.replaceNote': 'If you replace the bot, “like” buttons under old posts will stop working (they are tied to the previous bot), and you will need to add the new bot as an administrator to your channels again.',\n  'users.title': 'Users',\n  'users.newEditor': 'New editor',\n  'users.channelsOf': 'Channels of editor {name}',\n  'users.noChannels': 'There are no channels yet. Connect a channel on the “Channels” page.',\n  'users.myEditors': 'My editors',\n  'users.noEditors': 'There are no editors yet.',\n  'users.col.name': 'Name',\n  'users.col.channels': 'Channels',\n  'users.col.created': 'Created',\n  'users.col.channelsCount': 'Channels',\n  'users.col.editorsCount': 'Editors',\n  'users.noAccess': 'no access',\n  'users.channelsBtn': 'Channels',\n  'users.resetPassword': 'Reset password',\n  'users.resetTitle': 'Reset password',\n  'users.resetMsg': 'New password for {email}.',\n  'users.resetConfirm': 'Change password',\n  'users.removeEditorTitle': 'Delete the editor?',\n  'users.removeEditorMsg': 'The editor {email} will be deleted.',\n  'users.removeAdminTitle': 'Delete the administrator?',\n  'users.removeAdminMsg1': 'The administrator {email} will be deleted.',\n  'users.removeAdminMsg2': 'Their channels ({channels}) with posts and their editors ({editors}) will be permanently deleted along with the account.',\n  'users.admins': 'Administrators',\n  'users.newAdmin': 'New administrator',\n  'users.newAdminHint': 'Each administrator has their own isolated workspace: their own channels, editors and parser sources. You will not see them.',\n  'users.you': 'you',\n  'users.main': 'main',\n  'users.footer': 'An administrator works in their own isolated workspace: they see only their own channels, posts, metrics and parser sources, and manage only their own editors. An editor works only with the channels assigned to them.',\n  'users.footerSuper': 'The main administrator can also create other administrators and delete them together with their workspace.',\n  'parser.title': 'Parser',\n  'parser.addTitle': 'Add a channel',\n  'parser.addHint': 'Enter the @username or link of a public channel. Its public web version (t.me/s/…) is parsed, so private channels and channels with the public preview disabled will not work.',\n  'parser.addPlaceholder': '@channel_name or https://t.me/channel_name',\n  'parser.added': 'Channel @{username} added. New posts loaded: {added}.',\n  'parser.done': 'Done: channels — {channels}, new posts — {added}.',\n  'parser.deleteMsg': { one: 'Channel @{username} and {n} parsed post will be deleted. Drafts that were already created will stay.', other: 'Channel @{username} and {n} parsed posts will be deleted. Drafts that were already created will stay.' },\n  'parser.removed': 'Channel @{username} removed.',\n  'parser.pickChannel': 'Select a channel to publish to',\n  'parser.draftAdded': 'The post was added to “Post preparation”.',\n  'parser.openDrafts': 'Open “Post preparation”',\n  'parser.sourcesTitle': 'Channels to parse',\n  'parser.noSources': 'There are no channels yet. Add the first one above.',\n  'parser.postsCount': 'posts: {n}',\n  'parser.updatedAt': 'updated {date}',\n  'parser.neverParsed': 'not parsed yet',\n  'parser.limitAria': 'How many posts to load',\n  'parser.limitOption': '{n} latest posts',\n  'parser.parseBtn': 'Parse selected ({n})',\n  'parser.parsing': 'Parsing…',\n  'parser.parseNote': 'The more posts, the longer it takes. Posts that are already saved are not duplicated. Text, photos and videos are collected. Links, @mentions, hashtags and promotional signatures are removed from the text; posts without text are skipped.',\n  'parser.postsTitle': 'Parsed posts',\n  'parser.allSources': 'All sources',\n  'parser.filterAria': 'Filter by source channel',\n  'parser.searchPlaceholder': 'Search by text',\n  'parser.targetLabel': 'Publishing channel for the “Create post” button',\n  'parser.noTargets': 'No channels available',\n  'parser.noTargetsHint': 'There are no channels to publish to: connect a channel on the “Channels” page or ask an administrator to grant you access.',\n  'parser.noMatches': 'Nothing matches the filter.',\n  'parser.noPosts': 'There are no parsed posts yet. Select channels and click “Parse selected”.',\n  'parser.videoLabel': '🎬 video',\n  'parser.collapse': 'Collapse',\n  'parser.expand': 'Show full text',\n  'parser.makeDraft': 'Create post',\n  'parser.making': 'Creating…',\n  'parser.inDrafts': 'Already in “Post preparation”',\n  'parser.alreadyPublished': 'Already published',\n  'parser.openOriginal': 'Open original',\n  'parser.loadMore': 'Show more',\n  'account.title': 'Profile',\n  'account.passwordTitle': 'Change password',\n  'account.passwordChanged': 'Password changed. You will need to sign in again on your other devices.',\n  'account.changePassword': 'Change password',\n  'account.languageTitle': 'Interface language',\n  'account.languageLabel': 'Language',\n  'account.languageHint': 'The language is applied immediately and saved in your account, so the interface opens in the same language on your other devices. Channel names and post texts are not translated.',\n  'account.languageSaved': 'Language saved.',\n  'account.languageSaveFailed': 'The language was changed, but saving it to your account failed: {error}',\n  'account.deleteTitle': 'Delete account',\n  'account.inactiveInfo': { one: 'If you do not sign in to your account for {n} day in a row, it is deleted automatically.', other: 'If you do not sign in to your account for {n} days in a row, it is deleted automatically.' },\n  'account.superNoDelete': 'The main administrator cannot delete their account.',\n  'account.adminWarn': 'Deleting the account also deletes your channels (<b>{channels}</b>) with their posts and statistics, parser sources, the bot and editors (<b>{editors}</b>).',\n  'account.editorWarn': 'Only your account will be deleted. The posts you created will stay with the administrator.',\n  'account.confirmPassword': 'Password to confirm',\n  'account.deleting': 'Deleting…',\n  'account.deleteBtn': 'Delete account',\n  'account.confirmTitle': 'Delete the account?',\n  'account.confirmMsgAdmin': 'Your account, all your channels with their posts and statistics, parser sources, the connected bot and editors ({editors}) will be permanently deleted. Messages already published in Telegram will remain.',\n  'account.confirmMsgEditor': 'Your account will be permanently deleted. The posts you created will stay with the administrator.',\n  'account.confirmIrreversible': 'This cannot be undone.',\n  'support.title': 'Support the project',\n  'support.p1': '“Channel Manager” is a free project. Anyone can use it, there is nothing to pay, and it is developed and maintained by a single developer.',\n  'support.p2': 'If you find the service useful, you can support the project with a donation if you wish. It is voluntary: a donation has no effect on access to the service’s features.',\n  'support.walletsTitle': 'Donation details',\n  'support.sbp': 'SBP (Faster Payments System, Russia)',\n  'support.copy': 'Copy',\n  'support.copied': 'Copied',\n  'support.copyAria': 'Copy: {name}',\n  'support.note': 'Check the address or number before sending: cryptocurrency transfers are irreversible. Thank you for your support!',\n  'post.new': 'New post',\n  'post.edit': 'Edit post',\n  'post.titleLabel': 'Title (visible only to you)',\n  'post.textLabel': 'Post text ({len} / {limit})',\n  'post.mediaLabel': 'Link to an image or video (optional)',\n  'post.videoSaved': 'Video saved',\n  'post.uploadedFromDevice': 'Uploaded from your device',\n  'post.uploading': 'Uploading…',\n  'post.uploadingPct': 'Uploading… {p}%',\n  'post.upload': 'Upload from device',\n  'post.removeVideo': 'Remove video',\n  'post.removeImage': 'Remove image',\n  'post.mediaHint': 'Image (JPEG, PNG, WebP) or MP4 video up to 50 MB',\n  'post.previewAlt': 'Image preview',\n  'post.format': 'Formatting',\n  'post.formatNone': 'No formatting',\n  'post.timeLabel': 'Publication time (if not set, saved as a draft)',\n  'post.schedule': 'Schedule',\n  'post.saveDraft': 'Save draft',\n  'post.err.mp4Only': 'Only MP4 (H.264) video is supported. Save or export iPhone (.mov) and other formats as MP4 first',\n  'post.err.empty': 'The file is empty',\n  'post.err.videoTooBig': 'The video is {mb} MB: Telegram accepts files up to 50 MB from a bot',\n  'dt.dateAria': 'Publication date',\n  'dt.hoursAria': 'Hours',\n  'dt.minutesAria': 'Minutes',\n  'dt.hh': 'hh',\n  'dt.mm': 'mm',\n  'dt.inHour': 'In one hour',\n  'dt.today18': 'Today at 18:00',\n  'dt.tomorrow9': 'Tomorrow at 9:00',\n  'dt.clear': 'Clear',\n  'dt.pastWarn': 'This time has already passed: the post will be published within a minute.',\n  'dt.willPublish': 'Will be published:',\n  'upload.err.tooBig': 'The file was rejected as too large.',\n  'upload.err.session': 'Your session has expired. Sign in again',\n  'upload.err.failed': 'Could not upload the file (code {status})',\n  'upload.err.network': 'Could not upload the file: connection problem',\n  'upload.err.timeout': 'The upload took too long',\n  'upload.err.aborted': 'The upload was aborted',\n  'image.err.notImage': 'Choose an image file',\n  'image.err.unreadable': 'Could not read the image. Try JPEG, PNG or WebP',\n  'image.err.processing': 'Could not process the image',\n  'sealed.err.tooLong': 'The message is too long for an RSA block',\n  'guide.title': 'User guide',\n  'guide.toc': 'Contents',\n  'guide.tocAria': 'Guide contents',\n  'guide.toc.start': 'Quick start',\n  'guide.toc.roles': 'Roles and access',\n  'guide.toc.bot': 'Bot',\n  'guide.toc.channels': 'Channels',\n  'guide.toc.parser': 'Parser',\n  'guide.toc.drafts': 'Post preparation',\n  'guide.toc.published': 'Published',\n  'guide.toc.metrics': 'Metrics',\n  'guide.toc.users': 'Users',\n  'guide.toc.account': 'Profile',\n  'guide.toc.language': 'Interface language',\n  'guide.toc.delete': 'Deleting an account',\n  'guide.toc.faq': 'Frequently asked questions',\n}\n\nexport default en\n",
  "locales/server-errors.ts": "// Сообщения об ошибках приходят с сервера на русском (так они написаны в server/express/*). Для других языков\n// клиент переводит их по этой таблице; неизвестное сообщение показывается как есть.\n// Добавляете новое сообщение на сервере: добавьте его сюда (точная строка или шаблон).\n\ntype Rule = [RegExp, (m: RegExpMatchArray) => string]\ninterface Table {\n  exact: Record<string, string>\n  patterns: Rule[]\n}\n\nconst MEDIA: Record<string, string> = { Видео: 'Video', Картинка: 'Image' }\n\nconst en: Table = {\n  exact: {\n    'Канал не найден': 'Channel not found',\n    'Нет доступа к этому каналу': 'You do not have access to this channel',\n    'Главный администратор не может быть удалён': 'The main administrator cannot be deleted',\n    'Не найдено': 'Not found',\n    'Такая запись уже существует': 'This record already exists',\n    'Связанная запись не найдена': 'Related record not found',\n    'Внутренняя ошибка сервера': 'Internal server error',\n    'Пароль — не короче 8 символов': 'The password must be at least 8 characters long',\n    'Пароль слишком длинный': 'The password is too long',\n    'Некорректный email': 'Invalid email address',\n    'Укажите имя': 'Enter a name',\n    'Требуется вход': 'Sign-in required',\n    'Недостаточно прав': 'Insufficient permissions',\n    'Запрос с чужого origin отклонён': 'Request from a foreign origin rejected',\n    'Telegram не принял токен: проверьте, что он скопирован целиком': 'Telegram rejected the token: make sure it was copied in full',\n    'Бот не подключён: администратор должен добавить токен бота на странице «Бот»': 'The bot is not connected: an administrator must add the bot token on the “Bot” page',\n    'Бот не подключён': 'The bot is not connected',\n    'Ссылки-приглашения не подходят: нужен публичный канал с @username': 'Invite links do not work: a public channel with an @username is required',\n    'Укажите @username публичного канала (латиница, цифры и _, 4–32 символа)': 'Enter the @username of a public channel (Latin letters, digits and _, 4–32 characters)',\n    'Telegram просит подождать (429). Повторите позже': 'Telegram asks you to wait (429). Try again later',\n    'Канал не найден или у него отключён публичный просмотр': 'Channel not found, or its public preview is disabled',\n    'Недопустимый адрес файла': 'Invalid file address',\n    'Неподдерживаемый тип файла': 'Unsupported file type',\n    'Файл повреждён или имеет другой формат': 'The file is corrupted or has a different format',\n    'Ключ шифрования устарел. Повторите попытку': 'The encryption key has expired. Try again',\n    'Запрос устарел или уже использован. Повторите попытку': 'The request has expired or has already been used. Try again',\n    'Пароль должен передаваться в зашифрованном виде. Обновите страницу (Ctrl+F5)': 'The password must be sent in encrypted form. Refresh the page (Ctrl+F5)',\n    'Не удалось расшифровать данные. Обновите страницу и повторите попытку': 'Could not decrypt the data. Refresh the page and try again',\n    'На сервере не задан SECRETS_KEY (32 байта, например: openssl rand -base64 32)': 'SECRETS_KEY is not set on the server (32 bytes, for example: openssl rand -base64 32)',\n    'Неизвестный формат секрета': 'Unknown secret format',\n    'Не удалось расшифровать токен: изменился SECRETS_KEY или запись повреждена': 'Could not decrypt the token: SECRETS_KEY has changed or the record is corrupted',\n    'Администратор уже создан': 'The administrator has already been created',\n    'Регистрация отключена': 'Registration is disabled',\n    'Слишком много попыток регистрации. Повторите позже': 'Too many registration attempts. Try again later',\n    'Неверный код приглашения': 'Invalid invitation code',\n    'Сначала нужно создать первого администратора': 'The first administrator must be created first',\n    'Этот email уже зарегистрирован': 'This email is already registered',\n    'Слишком много попыток. Повторите через 15 минут': 'Too many attempts. Try again in 15 minutes',\n    'Неверный email или пароль': 'Incorrect email or password',\n    'Текущий пароль неверен': 'The current password is incorrect',\n    'Главный администратор не может удалить аккаунт': 'The main administrator cannot delete their account',\n    'Пароль неверен': 'Incorrect password',\n    'Неподдерживаемый язык': 'Unsupported language',\n    'На сервере не задан SECRETS_KEY: токены ботов негде безопасно хранить. Обратитесь к владельцу сервера': 'SECRETS_KEY is not set on the server, so bot tokens cannot be stored securely. Contact the server owner',\n    'Токен выглядит неверно: ожидается вид 123456789:AA… от @BotFather': 'The token looks wrong: expected something like 123456789:AA… from @BotFather',\n    'Это токен не бота': 'This is not a bot token',\n    'Этот бот уже подключён к другому администратору': 'This bot is already connected to another administrator',\n    'Укажите @username или id канала': 'Enter the channel @username or id',\n    'Бот не подключён (страница «Бот»): укажите числовой id и название': 'The bot is not connected (“Bot” page): enter the numeric id and the title',\n    'Этот канал уже подключён': 'This channel is already connected',\n    'Укажите название': 'Enter a title',\n    'Бот не подключён: администратор должен добавить токен на странице «Бот»': 'The bot is not connected: an administrator must add the token on the “Bot” page',\n    'Этот канал уже добавлен': 'This channel has already been added',\n    'Выберите хотя бы один канал': 'Select at least one channel',\n    'Канал уже парсится': 'The channel is already being parsed',\n    'Выберите канал для публикации': 'Select a channel to publish to',\n    'Пост не найден': 'Post not found',\n    'Пост уже сформирован': 'The post has already been created',\n    'После удаления ссылок и упоминаний в посте не осталось текста': 'No text is left in the post after removing links and mentions',\n    'Выберите канал': 'Select a channel',\n    'Укажите заголовок': 'Enter a title',\n    'Текст поста не может быть пустым': 'The post text cannot be empty',\n    'Подпись к фото или видео — не более 1024 символов': 'A photo or video caption can be at most 1024 characters',\n    'Текст — не более 4096 символов': 'The text can be at most 4096 characters',\n    'Некорректная ссылка на файл': 'Invalid file link',\n    'Некорректный parse_mode': 'Invalid parse_mode',\n    'Некорректная дата публикации': 'Invalid publication date',\n    'Опубликованный пост редактировать нельзя': 'A published post cannot be edited',\n    'Пост не найден или уже публикуется': 'Post not found or is already being published',\n    'Не удалось опубликовать': 'Could not publish',\n    'Файл не похож на видео MP4': 'The file does not look like an MP4 video',\n    'Формат QuickTime (.mov) не поддерживается: экспортируйте видео в MP4 (H.264)': 'QuickTime (.mov) is not supported: export the video as MP4 (H.264)',\n    'Видео больше 50 МБ: Telegram принимает от бота файлы до 50 МБ': 'The video is larger than 50 MB: Telegram accepts files up to 50 MB from a bot',\n    'Файл пустой': 'The file is empty',\n    'Загрузите изображение (JPEG, PNG, WebP до 10 МБ) или видео MP4 (до 50 МБ)': 'Upload an image (JPEG, PNG, WebP up to 10 MB) or an MP4 video (up to 50 MB)',\n    'Файл не похож на изображение': 'The file does not look like an image',\n    'Пользователь не найден': 'User not found',\n    'Некорректная роль': 'Invalid role',\n    'Создавать администраторов может только главный администратор': 'Only the main administrator can create administrators',\n    'Роль изменить нельзя: создайте пользователя заново': 'The role cannot be changed: create the user again',\n    'Каналы закрепляются только за редакторами': 'Channels can only be assigned to editors',\n  },\n  patterns: [\n    [/^Не удалось связаться с Telegram: (.+)$/s, (m) => `Could not reach Telegram: ${m[1]}`],\n    [/^Не удалось отправить (видео|фото): (.+)$/s, (m) => `Could not send the ${m[1] === 'видео' ? 'video' : 'photo'}: ${m[2]}`],\n    [/^Telegram ответил (\\d+)$/, (m) => `Telegram responded with ${m[1]}`],\n    [/^Не удалось загрузить t\\.me: (.+)$/s, (m) => `Could not load t.me: ${m[1]}`],\n    [/^t\\.me ответил (\\d+)$/, (m) => `t.me responded with ${m[1]}`],\n    [/^Файл недоступен \\((\\d+)\\)$/, (m) => `File unavailable (${m[1]})`],\n    [/^Файл больше (\\d+) МБ$/, (m) => `The file is larger than ${m[1]} MB`],\n    [/^Не больше (\\d+) каналов-источников: удалите ненужные$/, (m) => `No more than ${m[1]} source channels: remove the ones you do not need`],\n    [/^За один раз — не более (\\d+) каналов$/, (m) => `No more than ${m[1]} channels at a time`],\n    [/^(Видео|Картинка) не добавлено: текст длиннее 1024 символов \\(лимит подписи в Telegram\\)$/, (m) => `${MEDIA[m[1]]} was not added: the text is longer than 1024 characters (the Telegram caption limit)`],\n    [/^(Видео|Картинка) не добавлено: (.+)\\. Добавьте вручную$/s, (m) => `${MEDIA[m[1]]} was not added: ${translateServerMessage(m[2], 'en')}. Add it manually`],\n    [/^У администратора есть данные \\(каналов: (\\d+), редакторов: (\\d+)\\)\\. Они будут удалены вместе с ним, подтвердите удаление$/, (m) => `The administrator has data (channels: ${m[1]}, editors: ${m[2]}). It will be deleted along with the account, please confirm the deletion`],\n  ],\n}\n\nconst TABLES: Record<string, Table> = { en }\n\n/** Переводит сообщение сервера на язык locale (для ru и неизвестных сообщений возвращает как есть). */\nexport function translateServerMessage(message: string, locale: string): string {\n  const table = TABLES[locale]\n  if (!table || !message) return message\n  const exact = table.exact[message]\n  if (exact !== undefined) return exact\n  for (const [re, fn] of table.patterns) {\n    const m = message.match(re)\n    if (m) return fn(m)\n  }\n  return message\n}\n",
  "composables/useLocale.ts": "// Язык интерфейса. Тексты лежат в locales/ru.ts и locales/en.ts, ключи у них общие.\n// Выбранный язык хранится в аккаунте (users.lang) и дублируется в localStorage, чтобы страницы входа открывались на нём же.\nimport { computed, ref } from 'vue'\nimport ru from '../locales/ru'\nimport en from '../locales/en'\nimport { translateServerMessage } from '../locales/server-errors'\nimport type { Entry, Locale, Messages } from '../locales/types'\n\nexport type { Locale } from '../locales/types'\n\ntype Params = Record<string, string | number | null | undefined>\n\nconst STORAGE_KEY = 'tgm-lang'\nconst DICTS: Record<Locale, Messages> = { ru, en }\n// Язык по умолчанию — русский; чтобы добавить язык: locales/<код>.ts, записи здесь, LANGS на сервере (server/express/auth.js) и руководство\nconst OPTIONS: { code: Locale; name: string }[] = [\n  { code: 'ru', name: 'Русский' },\n  { code: 'en', name: 'English' },\n]\nconst INTL: Record<Locale, string> = { ru: 'ru-RU', en: 'en-GB' }\n\nconst isLocale = (v: unknown): v is Locale => typeof v === 'string' && Object.prototype.hasOwnProperty.call(DICTS, v)\n\nfunction readStored(): Locale {\n  try {\n    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null\n    if (isLocale(v)) return v\n  } catch {\n    /* localStorage недоступен (например, приватный режим) — остаётся язык по умолчанию */\n  }\n  return 'ru'\n}\n\n// SPA (ssr: false): состояние живёт на уровне модуля, как в useDialog\nconst locale = ref<Locale>(readStored())\n// true, если язык выбрали вручную (например, на странице входа) и он ещё не сохранён в аккаунте\nconst picked = ref(false)\n\n/** Применяет язык без пометки «выбран вручную» (например, язык из аккаунта). */\nfunction applyLocale(code: Locale) {\n  locale.value = code\n  try {\n    localStorage.setItem(STORAGE_KEY, code)\n  } catch {\n    /* не страшно: язык просто не запомнится в браузере */\n  }\n}\n\n/** Язык, выбранный пользователем вручную. */\nfunction pickLocale(code: string) {\n  if (!isLocale(code)) return\n  applyLocale(code)\n  picked.value = true\n}\n\nconst rules: Partial<Record<Locale, Intl.PluralRules>> = {}\nconst pluralForm = (count: number) => (rules[locale.value] ??= new Intl.PluralRules(INTL[locale.value])).select(count)\n\nfunction choose(entry: Entry | undefined, count?: number): string | undefined {\n  if (entry === undefined) return undefined\n  if (typeof entry === 'string') return entry\n  const form = count === undefined ? 'other' : pluralForm(count)\n  return entry[form as keyof typeof entry] ?? entry.other\n}\n\nconst escapeHtml = (s: string) => s.replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' })[c]!)\n\nfunction render(key: string, params: Params | undefined, count: number | undefined, escape: boolean): string {\n  const text = choose(DICTS[locale.value][key], count) ?? choose(DICTS.ru[key], count) ?? key\n  if (!params) return text\n  return text.replace(/\\{(\\w+)\\}/g, (whole, name: string) => {\n    if (!(name in params)) return whole\n    const v = String(params[name] ?? '')\n    return escape ? escapeHtml(v) : v\n  })\n}\n\n/** Текст по ключу. {имя} подставляется из params; count выбирает форму множественного числа. */\nconst t = (key: string, params?: Params, count?: number) => render(key, params, count, false)\n/** То же для v-html: сам текст — доверенный HTML из словаря (<b>, <code>), а подставляемые значения экранируются. */\nconst th = (key: string, params?: Params, count?: number) => render(key, params, count, true)\n/** Сообщение сервера (он пишет по-русски) на текущем языке. */\nconst tServer = (message?: string | null) => (message ? translateServerMessage(message, locale.value) : '')\n\nexport function useLocale() {\n  return {\n    locale,\n    locales: OPTIONS,\n    /** Код для Intl и toLocaleString: ru-RU, en-GB */\n    intlLocale: computed(() => INTL[locale.value]),\n    picked,\n    isLocale,\n    applyLocale,\n    pickLocale,\n    t,\n    th,\n    tServer,\n  }\n}\n",
  "components/LangSwitch.vue": "<script setup lang=\"ts\">\n// Переключатель языка интерфейса: variant=\"select\" — выпадающий список (профиль), variant=\"buttons\" — компактные кнопки (вход, регистрация).\n// Сам только меняет язык в браузере; сохранить его в аккаунте (если нужно) должен родитель по событию change.\nwithDefaults(defineProps<{ variant?: 'select' | 'buttons'; disabled?: boolean }>(), { variant: 'select', disabled: false })\nconst emit = defineEmits<{ change: [code: string] }>()\nconst { t, locale, locales, pickLocale } = useLocale()\n\nfunction pick(code: string) {\n  if (code === locale.value) return\n  pickLocale(code)\n  emit('change', code)\n}\n</script>\n\n<template>\n  <div v-if=\"variant === 'buttons'\" class=\"lang-buttons\" role=\"group\" :aria-label=\"t('lang.label')\">\n    <button\n      v-for=\"l in locales\"\n      :key=\"l.code\"\n      type=\"button\"\n      :class=\"{ active: l.code === locale }\"\n      :aria-pressed=\"l.code === locale\"\n      :lang=\"l.code\"\n      :title=\"l.name\"\n      @click=\"pick(l.code)\"\n    >\n      {{ l.code.toUpperCase() }}\n    </button>\n  </div>\n  <select v-else :value=\"locale\" :disabled=\"disabled\" :aria-label=\"t('lang.label')\" @change=\"pick(($event.target as HTMLSelectElement).value)\">\n    <option v-for=\"l in locales\" :key=\"l.code\" :value=\"l.code\" :lang=\"l.code\">{{ l.name }}</option>\n  </select>\n</template>\n",
  "components/GuideRu.vue": "<template>\n  <section id=\"start\" class=\"card guide-section prose\">\n    <h2>Быстрый старт</h2>\n    <p>Чтобы опубликовать первый пост, пройдите шаги по порядку. Шаги 2–5 выполняет администратор: редактору достаточно, чтобы ему назначили канал.</p>\n    <ol class=\"guide-steps\">\n      <li><b>Войдите в приложение.</b> Администратор может зарегистрироваться сам, если регистрация включена. Аккаунт редактора создаёт администратор.</li>\n      <li><b>Подключите бота.</b> На странице «Бот» вставьте токен бота, созданного у @BotFather.</li>\n      <li><b>Добавьте бота в канал.</b> Назначьте его администратором канала с правом публикации сообщений.</li>\n      <li><b>Подключите канал.</b> На странице <NuxtLink to=\"/\">«Каналы»</NuxtLink> укажите @username или числовой id канала.</li>\n      <li><b>Дайте доступ редакторам.</b> Создайте редактора на странице «Пользователи» и закрепите за ним нужные каналы.</li>\n      <li><b>Подготовьте пост.</b> Напишите его в <NuxtLink to=\"/drafts\">«Подготовке постов»</NuxtLink> или возьмите готовый в <NuxtLink to=\"/parser\">«Парсере»</NuxtLink>.</li>\n      <li><b>Опубликуйте.</b> Выберите время или нажмите «Опубликовать сейчас». Результат смотрите в «Опубликованных» и «Метриках».</li>\n    </ol>\n  </section>\n\n  <section id=\"roles\" class=\"card guide-section prose\">\n    <h2>Роли и доступ</h2>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Главный администратор</span></dt>\n      <dd>Работает как администратор и дополнительно создаёт других администраторов. Может удалить администратора вместе с его пространством.</dd>\n      <dt><span class=\"badge\">Администратор</span></dt>\n      <dd>Управляет своим изолированным пространством: свой бот, каналы, посты, метрики, источники парсера и редакторы. Данные других администраторов ему не видны.</dd>\n      <dt><span class=\"badge\">Редактор</span></dt>\n      <dd>Работает только с каналами, которые за ним закрепил администратор: готовит и публикует посты, смотрит метрики, пользуется парсером. Остальные каналы для него скрыты.</dd>\n    </dl>\n  </section>\n\n  <section id=\"bot\" class=\"card guide-section prose\">\n    <h2>Бот <span class=\"badge ml-2\">для администратора</span></h2>\n    <p>Публикации, статистика и кнопки «лайк» работают через вашего бота. У каждого администратора свой бот.</p>\n    <h3>Как подключить</h3>\n    <ol>\n      <li>В Telegram откройте @BotFather, создайте бота командой <code>/newbot</code> и скопируйте токен.</li>\n      <li>На странице «Бот» вставьте токен в поле «Токен бота» и нажмите «Сохранить».</li>\n    </ol>\n    <p class=\"callout\">Токен хранится на сервере в зашифрованном виде и после сохранения нигде не показывается. Один бот может быть подключён только к одному администратору.</p>\n    <h3>Замена и отключение</h3>\n    <p>Новый токен заменяет прежнего бота. После замены «лайки» под старыми постами перестанут работать, а нового бота нужно заново добавить администратором в каналы.</p>\n    <p class=\"callout callout-warn\">Если отключить бота, публикация и сбор статистики остановятся, а запланированные посты получат статус ошибки.</p>\n  </section>\n\n  <section id=\"channels\" class=\"card guide-section prose\">\n    <h2>Каналы</h2>\n    <p>На странице <NuxtLink to=\"/\">«Каналы»</NuxtLink> собраны каналы вашего пространства. Редактор видит только те, что за ним закреплены.</p>\n    <h3>Как подключить канал <span class=\"badge ml-2\">для администратора</span></h3>\n    <ol>\n      <li>Добавьте бота администратором канала с правом публикации сообщений.</li>\n      <li>В блоке «Подключить канал» введите @username или числовой id. У приватного канала id выглядит как <code>-1001234567890</code>.</li>\n      <li>Нажмите «Подключить».</li>\n    </ol>\n    <h3>Карточка канала</h3>\n    <p>В карточке видны число подписчиков, количество опубликованных постов и постов в подготовке. Администратор дополнительно видит, кому из редакторов доступен канал.</p>\n    <dl class=\"defs\">\n      <dt><b>Обновить данные</b></dt>\n      <dd>Подтягивает из Telegram название, описание и число подписчиков.</dd>\n      <dt><b>Доступ</b></dt>\n      <dd>Выбор редакторов, которые могут работать с каналом.</dd>\n      <dt><b>Отключить публикации</b></dt>\n      <dd>Канал остаётся в списке с пометкой «Отключён», запланированные посты в него не уходят. Включить публикации можно в любой момент.</dd>\n      <dt><b>Удалить</b></dt>\n      <dd>Убирает канал вместе с его постами и статистикой.</dd>\n    </dl>\n  </section>\n\n  <section id=\"parser\" class=\"card guide-section prose\">\n    <h2>Парсер</h2>\n    <p>Парсер собирает посты из публичных Telegram-каналов, чтобы вы могли быстро превратить их в свои черновики. Он читает открытую веб-версию канала (t.me/s/…), поэтому приватные каналы и каналы с отключённым просмотром не подойдут.</p>\n    <h3>Добавление канала-источника</h3>\n    <p>Введите @username или ссылку на канал и нажмите «Добавить». На одно пространство можно добавить до 50 источников.</p>\n    <h3>Загрузка постов</h3>\n    <ol>\n      <li>Отметьте нужные каналы в списке «Каналы для парсинга» или выберите все сразу.</li>\n      <li>Укажите, сколько последних постов загружать: 20, 50, 100 или 200.</li>\n      <li>Нажмите «Спарсить выбранные». За один раз можно обработать не более 20 каналов.</li>\n    </ol>\n    <p>Уже сохранённые посты не дублируются. Берутся текст, фото и видео. Из текста удаляются ссылки, @упоминания, хештеги и рекламные подписи, а посты без текста пропускаются.</p>\n    <h3>Спарсенные посты</h3>\n    <p>Список можно отфильтровать по источнику и найти нужный пост по тексту. Длинные тексты свёрнуты, их можно раскрыть кнопкой «Показать полностью».</p>\n    <h3>Как использовать пост</h3>\n    <ol>\n      <li>В блоке «Канал публикации» выберите канал, в который пойдёт пост.</li>\n      <li>Нажмите «Сформировать пост»: черновик появится в «Подготовке постов».</li>\n      <li>Отредактируйте его и опубликуйте или поставьте в график.</li>\n    </ol>\n    <p class=\"callout\">Если удалить источник, его спарсенные посты тоже удалятся. Уже созданные из них черновики останутся.</p>\n  </section>\n\n  <section id=\"drafts\" class=\"card guide-section prose\">\n    <h2>Подготовка постов</h2>\n    <p>Здесь создаются, редактируются и публикуются посты. Список обновляется сам раз в 30 секунд: опубликованные посты переезжают в раздел «Опубликованные».</p>\n    <h3>Новый пост</h3>\n    <p>Нажмите «Новый пост» и заполните форму:</p>\n    <ul>\n      <li><b>Канал</b> — куда будет опубликован пост.</li>\n      <li><b>Заголовок</b> — виден только вам и помогает искать пост в списке.</li>\n      <li><b>Текст</b> — до 4096 символов, а если к посту прикреплено фото или видео, то до 1024.</li>\n      <li><b>Изображение или видео</b> — вставьте ссылку или загрузите картинку с устройства (JPEG, PNG или WebP до 10 МБ).</li>\n      <li><b>Форматирование</b> — без форматирования, HTML или MarkdownV2.</li>\n    </ul>\n    <h3>Время публикации</h3>\n    <p>Выберите дату, часы и минуты (шаг 5 минут) или воспользуйтесь быстрыми вариантами: «Через час», «Сегодня в 18:00», «Завтра в 9:00». Время задаётся по часовому поясу вашего устройства. Если время не выбрано, пост сохранится как черновик. Если выбранное время уже прошло, пост опубликуется в течение минуты.</p>\n    <h3>Статусы</h3>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Черновик</span></dt>\n      <dd>Пост сохранён, но не поставлен в график.</dd>\n      <dt><span class=\"badge scheduled\">В графике</span></dt>\n      <dd>Пост опубликуется в выбранное время.</dd>\n      <dt><span class=\"badge publishing\">Публикуется</span></dt>\n      <dd>Пост отправляется в канал. В это время его нельзя редактировать или удалить.</dd>\n      <dt><span class=\"badge failed\">Ошибка публикации</span></dt>\n      <dd>Причина показана в карточке. Исправьте её и опубликуйте пост снова.</dd>\n    </dl>\n    <h3>Действия с постом</h3>\n    <dl class=\"defs\">\n      <dt><b>Редактировать</b></dt>\n      <dd>Изменить любое поле, в том числе время публикации.</dd>\n      <dt><b>Опубликовать сейчас</b></dt>\n      <dd>Отправить пост в канал немедленно, после подтверждения.</dd>\n      <dt><b>Убрать из графика</b></dt>\n      <dd>Вернуть запланированный пост в черновики.</dd>\n      <dt><b>Удалить</b></dt>\n      <dd>Удалить пост из подготовки.</dd>\n    </dl>\n  </section>\n\n  <section id=\"published\" class=\"card guide-section prose\">\n    <h2>Опубликованные</h2>\n    <p>В разделе <NuxtLink to=\"/published\">«Опубликованные»</NuxtLink> собраны посты, уже отправленные в каналы. Список можно отфильтровать по каналу.</p>\n    <ul>\n      <li>Под каждым постом бот добавляет кнопку «лайк», а в карточке виден счётчик 👍.</li>\n      <li>Кнопка «Открыть в Telegram» ведёт к посту в канале. Она есть у каналов с публичным @username.</li>\n      <li>Опубликованный пост редактировать нельзя.</li>\n    </ul>\n    <p class=\"callout\">При удалении вас сначала спросят про запись в приложении, а затем про само сообщение в канале. Можно удалить только запись и оставить сообщение в канале.</p>\n  </section>\n\n  <section id=\"metrics\" class=\"card guide-section prose\">\n    <h2>Метрики</h2>\n    <p>Раздел <NuxtLink to=\"/metrics\">«Метрики»</NuxtLink> показывает, как живут ваши каналы. Выберите канал в фильтре или смотрите сводку по всем сразу.</p>\n    <ul>\n      <li><b>Сводка</b> — подписчики, опубликованные посты, лайки, посты в графике и черновики.</li>\n      <li><b>Динамика за 30 дней</b> — графики публикаций, лайков и подписчиков по дням.</li>\n      <li><b>Каналы</b> — таблица с подписчиками, ростом за 30 дней, числом постов, лайков и лайков на пост.</li>\n      <li><b>Лучшие посты</b> — публикации с наибольшим числом лайков.</li>\n    </ul>\n    <p class=\"callout\">Число подписчиков фиксируется раз в час, поэтому график подписчиков заполняется постепенно.</p>\n  </section>\n\n  <section id=\"users\" class=\"card guide-section prose\">\n    <h2>Пользователи <span class=\"badge ml-2\">для администратора</span></h2>\n    <p>На странице «Пользователи» администратор управляет своими редакторами.</p>\n    <ol>\n      <li>Укажите email, имя и пароль (не короче 8 символов) и нажмите «Добавить».</li>\n      <li>В таблице нажмите «Каналы» и выберите, к каким каналам у редактора будет доступ. Пока доступ не выдан, редактор ничего не увидит.</li>\n      <li>Если редактор забыл пароль, нажмите «Сбросить пароль» и задайте новый.</li>\n    </ol>\n    <p>Главный администратор дополнительно видит раздел «Администраторы»: в нём можно создать администратора, сбросить ему пароль или удалить его.</p>\n    <p class=\"callout callout-warn\">Удаление администратора безвозвратно стирает его каналы с постами и всех его редакторов.</p>\n  </section>\n\n  <section id=\"account\" class=\"card guide-section prose\">\n    <h2>Профиль</h2>\n    <p>Страница <NuxtLink to=\"/account\">«Профиль»</NuxtLink> открывается по имени в правом верхнем углу. Здесь видны ваше имя, email и роль, а ещё можно сменить пароль: введите текущий и новый (не короче 8 символов). В блоке «Язык интерфейса» выбирается язык приложения — подробнее в разделе «Язык интерфейса». Кнопка «Выйти» находится рядом с именем. Здесь же можно удалить аккаунт — подробнее в разделе «Удаление аккаунта».</p>\n  </section>\n\n  <section id=\"language\" class=\"card guide-section prose\">\n    <h2>Язык интерфейса</h2>\n    <p>Приложение работает на русском и английском языках. Язык выбирается для каждого аккаунта отдельно и сохраняется на сервере, поэтому на другом устройстве или в другом браузере интерфейс откроется на том же языке. Это руководство тоже показывается на выбранном языке.</p>\n    <h3>Как переключить язык</h3>\n    <ol>\n      <li>Откройте <NuxtLink to=\"/account\">«Профиль»</NuxtLink> (имя в правом верхнем углу).</li>\n      <li>В блоке «Язык интерфейса» выберите в списке «Русский» или «English».</li>\n      <li>Язык сменится сразу, страницу перезагружать не нужно. Кнопки «Сохранить» нет: выбор запоминается автоматически.</li>\n    </ol>\n    <p>На страницах входа и регистрации язык переключается кнопками RU и EN над формой. Язык, выбранный там, применяется к новому аккаунту, а при входе в существующий аккаунт сохраняется в нём.</p>\n    <p class=\"callout\">Переводится только интерфейс и это руководство. Названия каналов, заголовки и тексты постов, а также сообщения, которые бот публикует в Telegram, остаются такими, какими вы их написали.</p>\n    <p>Редактор, которого создаёт администратор, начинает с языком администратора и может сменить его в своём профиле.</p>\n  </section>\n\n  <section id=\"delete\" class=\"card guide-section prose\">\n    <h2>Удаление аккаунта</h2>\n    <p>Аккаунт можно удалить самому, а если в него долго не заходить, он удалится автоматически. В обоих случаях данные стираются безвозвратно, восстановить их из приложения нельзя.</p>\n\n    <h3>Удаление по вашему желанию</h3>\n    <ol>\n      <li>Откройте <NuxtLink to=\"/account\">«Профиль»</NuxtLink> (имя в правом верхнем углу) и найдите блок «Удаление аккаунта».</li>\n      <li>Введите свой пароль и нажмите «Удалить аккаунт».</li>\n      <li>Прочитайте предупреждение и подтвердите удаление. После этого вы выйдете из приложения.</li>\n    </ol>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Редактор</span></dt>\n      <dd>Удаляется только сам аккаунт и его доступ к каналам. Посты, которые вы создали, остаются у администратора.</dd>\n      <dt><span class=\"badge\">Администратор</span></dt>\n      <dd>Вместе с аккаунтом удаляется всё его пространство: каналы с постами, лайками и статистикой, источники парсера, загруженные картинки, все его редакторы и подключённый бот. Сообщения, которые уже опубликованы в Telegram-каналах, остаются на месте.</dd>\n      <dt><span class=\"badge\">Главный администратор</span></dt>\n      <dd>Не может удалить аккаунт сам: блока с кнопкой удаления в его профиле нет.</dd>\n    </dl>\n    <p class=\"callout callout-warn\">Администратор, удаляя аккаунт, удаляет и аккаунты своих редакторов. Предупредите их заранее.</p>\n\n    <h3>Автоматическое удаление при бездействии</h3>\n    <p>Если в аккаунт не заходили и не пользовались им 90 дней подряд, он удаляется автоматически. Проверка выполняется раз в сутки, ночью по времени сервера. Активностью считается любая работа в приложении под своим аккаунтом: достаточно войти и открыть любую страницу.</p>\n    <ul>\n      <li><b>Редактор</b> удаляется, если сам не заходил 90 дней.</li>\n      <li><b>Администратор</b> удаляется, только если 90 дней не заходил ни он сам, ни один из его редакторов. Пока кто-то из команды работает в пространстве, оно сохраняется.</li>\n    </ul>\n    <p class=\"callout callout-warn\">Приложение не отправляет писем, поэтому предупреждения перед удалением нет. Если аккаунт нужен, заходите в него хотя бы раз в 90 дней. Запланированные публикации сами по себе активностью не считаются.</p>\n    <p>Действующий срок написан в блоке «Удаление аккаунта» вашего профиля.</p>\n  </section>\n\n  <section id=\"faq\" class=\"card guide-section prose\">\n    <h2>Частые вопросы</h2>\n    <dl class=\"faq\">\n      <dt>Вижу «Бот не подключён»</dt>\n      <dd>Администратору нужно добавить токен бота на странице «Бот». Пока бота нет, публикация и сбор статистики не работают.</dd>\n      <dt>Пост получил статус «Ошибка публикации»</dt>\n      <dd>Прочитайте причину в карточке. Чаще всего бот не добавлен в администраторы канала или у него нет права публиковать сообщения, либо ссылка на файл недоступна. Исправьте это и нажмите «Опубликовать сейчас».</dd>\n      <dt>Вижу «Вам пока не назначены каналы»</dt>\n      <dd>Попросите администратора выдать вам доступ к каналам на странице «Пользователи».</dd>\n      <dt>Пост не ушёл в назначенное время</dt>\n      <dd>Проверьте, что канал не отключён на странице «Каналы», а бот остаётся администратором канала. Запланированные посты проверяются каждую минуту.</dd>\n      <dt>Не получается добавить канал в парсер</dt>\n      <dd>Парсер работает только с публичными каналами, у которых включён просмотр в веб-версии (t.me/s/…). Проверьте @username и доступность канала в браузере.</dd>\n      <dt>Текст не помещается в пост</dt>\n      <dd>Для текстового поста лимит 4096 символов, для поста с фото или видео — 1024. Сократите текст или уберите медиа.</dd>\n      <dt>Мой аккаунт удалили, хотя я его не удалял</dt>\n      <dd>Вероятно, в него не заходили 90 дней подряд, и он удалился автоматически. Восстановить его из приложения нельзя: зарегистрируйтесь заново (если регистрация включена) или попросите администратора создать аккаунт. Данные администратора можно вернуть только из резервной копии базы, это может сделать владелец сервера.</dd>\n      <dt>В профиле нет кнопки удаления аккаунта</dt>\n      <dd>Её нет у главного администратора: он не может удалить аккаунт сам. У остальных блок «Удаление аккаунта» находится внизу страницы «Профиль».</dd>\n      <dt>Как переключить язык интерфейса?</dt>\n      <dd>Откройте «Профиль» и выберите язык в блоке «Язык интерфейса»: Русский или English. Язык меняется сразу и сохраняется в аккаунте. Подробнее — в разделе «Язык интерфейса».</dd>\n      <dt>Часть текста осталась не на моём языке</dt>\n      <dd>Названия каналов, заголовки и тексты постов, а также названия источников парсера не переводятся: они остаются такими, как их задали вы или Telegram. Сообщения, которые приходят от самого Telegram, всегда на английском.</dd>\n      <dt>Страница входа открылась на другом языке</dt>\n      <dd>Страницы входа и регистрации открываются на языке, выбранном в этом браузере в последний раз (по умолчанию на русском). Переключите его кнопками RU и EN над формой. После входа применится язык вашего аккаунта, а если вы выбрали язык вручную, он сохранится в аккаунте.</dd>\n    </dl>\n  </section>\n</template>\n",
  "components/GuideEn.vue": "<template>\n  <section id=\"start\" class=\"card guide-section prose\">\n    <h2>Quick start</h2>\n    <p>To publish your first post, go through the steps in order. Steps 2–5 are done by an administrator: an editor only needs a channel to be assigned to them.</p>\n    <ol class=\"guide-steps\">\n      <li><b>Sign in.</b> An administrator can sign up on their own if registration is enabled. An editor account is created by an administrator.</li>\n      <li><b>Connect the bot.</b> On the “Bot” page, paste the token of the bot you created with @BotFather.</li>\n      <li><b>Add the bot to the channel.</b> Make it a channel administrator with permission to post messages.</li>\n      <li><b>Connect the channel.</b> On the <NuxtLink to=\"/\">“Channels”</NuxtLink> page, enter the channel @username or numeric id.</li>\n      <li><b>Give editors access.</b> Create an editor on the “Users” page and assign the channels they need.</li>\n      <li><b>Prepare a post.</b> Write it in <NuxtLink to=\"/drafts\">“Post preparation”</NuxtLink> or take a ready-made one from the <NuxtLink to=\"/parser\">“Parser”</NuxtLink>.</li>\n      <li><b>Publish.</b> Choose a time or click “Publish now”. See the result in “Published” and “Metrics”.</li>\n    </ol>\n  </section>\n\n  <section id=\"roles\" class=\"card guide-section prose\">\n    <h2>Roles and access</h2>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Main administrator</span></dt>\n      <dd>Works as an administrator and can also create other administrators. Can delete an administrator together with their workspace.</dd>\n      <dt><span class=\"badge\">Administrator</span></dt>\n      <dd>Manages their own isolated workspace: their own bot, channels, posts, metrics, parser sources and editors. The data of other administrators is not visible to them.</dd>\n      <dt><span class=\"badge\">Editor</span></dt>\n      <dd>Works only with the channels an administrator has assigned to them: prepares and publishes posts, views metrics, uses the parser. All other channels are hidden from them.</dd>\n    </dl>\n  </section>\n\n  <section id=\"bot\" class=\"card guide-section prose\">\n    <h2>Bot <span class=\"badge ml-2\">for administrators</span></h2>\n    <p>Publishing, statistics and “like” buttons work through your bot. Each administrator has their own bot.</p>\n    <h3>How to connect it</h3>\n    <ol>\n      <li>In Telegram, open @BotFather, create a bot with the <code>/newbot</code> command and copy the token.</li>\n      <li>On the “Bot” page, paste the token into the “Bot token” field and click “Save”.</li>\n    </ol>\n    <p class=\"callout\">The token is stored on the server in encrypted form and is not shown anywhere after saving. One bot can be connected to only one administrator.</p>\n    <h3>Replacing and disconnecting</h3>\n    <p>A new token replaces the previous bot. After the replacement, “like” buttons under old posts stop working, and you need to add the new bot as an administrator to your channels again.</p>\n    <p class=\"callout callout-warn\">If you disconnect the bot, publishing and statistics collection stop, and scheduled posts get the failed status.</p>\n  </section>\n\n  <section id=\"channels\" class=\"card guide-section prose\">\n    <h2>Channels</h2>\n    <p>The <NuxtLink to=\"/\">“Channels”</NuxtLink> page lists the channels of your workspace. An editor sees only the channels assigned to them.</p>\n    <h3>How to connect a channel <span class=\"badge ml-2\">for administrators</span></h3>\n    <ol>\n      <li>Add the bot as a channel administrator with permission to post messages.</li>\n      <li>In the “Connect a channel” block, enter the @username or numeric id. For a private channel the id looks like <code>-1001234567890</code>.</li>\n      <li>Click “Connect”.</li>\n    </ol>\n    <h3>The channel card</h3>\n    <p>The card shows the number of subscribers, the number of published posts and of posts in preparation. An administrator also sees which editors have access to the channel.</p>\n    <dl class=\"defs\">\n      <dt><b>Refresh data</b></dt>\n      <dd>Pulls the title, description and subscriber count from Telegram.</dd>\n      <dt><b>Access</b></dt>\n      <dd>Choose which editors can work with the channel.</dd>\n      <dt><b>Disable publishing</b></dt>\n      <dd>The channel stays in the list marked “Disabled”, and scheduled posts are not sent to it. You can enable publishing again at any time.</dd>\n      <dt><b>Delete</b></dt>\n      <dd>Removes the channel together with its posts and statistics.</dd>\n    </dl>\n  </section>\n\n  <section id=\"parser\" class=\"card guide-section prose\">\n    <h2>Parser</h2>\n    <p>The parser collects posts from public Telegram channels so you can quickly turn them into your own drafts. It reads the channel’s public web version (t.me/s/…), so private channels and channels with the public preview disabled will not work.</p>\n    <h3>Adding a source channel</h3>\n    <p>Enter the @username or link of a channel and click “Add”. You can add up to 50 sources per workspace.</p>\n    <h3>Loading posts</h3>\n    <ol>\n      <li>Tick the channels you need in the “Channels to parse” list, or select all at once.</li>\n      <li>Choose how many latest posts to load: 20, 50, 100 or 200.</li>\n      <li>Click “Parse selected”. Up to 20 channels can be processed at a time.</li>\n    </ol>\n    <p>Posts that are already saved are not duplicated. Text, photos and videos are collected. Links, @mentions, hashtags and promotional signatures are removed from the text, and posts without text are skipped.</p>\n    <h3>Parsed posts</h3>\n    <p>You can filter the list by source and find a post by its text. Long texts are collapsed; expand them with the “Show full text” button.</p>\n    <h3>How to use a post</h3>\n    <ol>\n      <li>In the “Publishing channel” block, choose the channel the post will go to.</li>\n      <li>Click “Create post”: a draft appears in “Post preparation”.</li>\n      <li>Edit it and publish it or put it on the schedule.</li>\n    </ol>\n    <p class=\"callout\">If you delete a source, its parsed posts are deleted too. Drafts already created from them stay.</p>\n  </section>\n\n  <section id=\"drafts\" class=\"card guide-section prose\">\n    <h2>Post preparation</h2>\n    <p>This is where posts are created, edited and published. The list refreshes itself every 30 seconds: published posts move to the “Published” section.</p>\n    <h3>New post</h3>\n    <p>Click “New post” and fill in the form:</p>\n    <ul>\n      <li><b>Channel</b>: where the post will be published.</li>\n      <li><b>Title</b>: visible only to you, it helps you find the post in the list.</li>\n      <li><b>Text</b>: up to 4096 characters, or up to 1024 if a photo or video is attached to the post.</li>\n      <li><b>Image or video</b>: paste a link or upload a picture from your device (JPEG, PNG or WebP up to 10 MB).</li>\n      <li><b>Formatting</b>: no formatting, HTML or MarkdownV2.</li>\n    </ul>\n    <h3>Publication time</h3>\n    <p>Choose a date, hours and minutes (in 5-minute steps) or use the quick options: “In one hour”, “Today at 18:00”, “Tomorrow at 9:00”. The time is set in the time zone of your device. If no time is chosen, the post is saved as a draft. If the chosen time has already passed, the post is published within a minute.</p>\n    <h3>Statuses</h3>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Draft</span></dt>\n      <dd>The post is saved but not put on the schedule.</dd>\n      <dt><span class=\"badge scheduled\">Scheduled</span></dt>\n      <dd>The post will be published at the chosen time.</dd>\n      <dt><span class=\"badge publishing\">Publishing</span></dt>\n      <dd>The post is being sent to the channel. It cannot be edited or deleted at this time.</dd>\n      <dt><span class=\"badge failed\">Publishing failed</span></dt>\n      <dd>The reason is shown in the card. Fix it and publish the post again.</dd>\n    </dl>\n    <h3>Actions on a post</h3>\n    <dl class=\"defs\">\n      <dt><b>Edit</b></dt>\n      <dd>Change any field, including the publication time.</dd>\n      <dt><b>Publish now</b></dt>\n      <dd>Send the post to the channel immediately, after confirmation.</dd>\n      <dt><b>Remove from schedule</b></dt>\n      <dd>Return a scheduled post to drafts.</dd>\n      <dt><b>Delete</b></dt>\n      <dd>Delete the post from preparation.</dd>\n    </dl>\n  </section>\n\n  <section id=\"published\" class=\"card guide-section prose\">\n    <h2>Published</h2>\n    <p>The <NuxtLink to=\"/published\">“Published”</NuxtLink> section lists posts that have already been sent to channels. You can filter the list by channel.</p>\n    <ul>\n      <li>Under each post the bot adds a “like” button, and the card shows a 👍 counter.</li>\n      <li>The “Open in Telegram” button leads to the post in the channel. It is available for channels with a public @username.</li>\n      <li>A published post cannot be edited.</li>\n    </ul>\n    <p class=\"callout\">When you delete, you are first asked about the entry in the app and then about the message in the channel. You can delete only the entry and leave the message in the channel.</p>\n  </section>\n\n  <section id=\"metrics\" class=\"card guide-section prose\">\n    <h2>Metrics</h2>\n    <p>The <NuxtLink to=\"/metrics\">“Metrics”</NuxtLink> section shows how your channels are doing. Choose a channel in the filter or view the summary for all of them at once.</p>\n    <ul>\n      <li><b>Summary</b>: subscribers, published posts, likes, scheduled posts and drafts.</li>\n      <li><b>Last 30 days</b>: charts of posts, likes and subscribers by day.</li>\n      <li><b>Channels</b>: a table with subscribers, 30-day growth, the number of posts, likes and likes per post.</li>\n      <li><b>Top posts</b>: the posts with the most likes.</li>\n    </ul>\n    <p class=\"callout\">The subscriber count is recorded once an hour, so the subscribers chart fills up gradually.</p>\n  </section>\n\n  <section id=\"users\" class=\"card guide-section prose\">\n    <h2>Users <span class=\"badge ml-2\">for administrators</span></h2>\n    <p>On the “Users” page an administrator manages their editors.</p>\n    <ol>\n      <li>Enter the email, name and password (at least 8 characters) and click “Add”.</li>\n      <li>In the table, click “Channels” and choose which channels the editor will have access to. Until access is granted, the editor will see nothing.</li>\n      <li>If an editor forgets their password, click “Reset password” and set a new one.</li>\n    </ol>\n    <p>The main administrator also sees the “Administrators” section, where you can create an administrator, reset their password or delete them.</p>\n    <p class=\"callout callout-warn\">Deleting an administrator permanently erases their channels with posts and all their editors.</p>\n  </section>\n\n  <section id=\"account\" class=\"card guide-section prose\">\n    <h2>Profile</h2>\n    <p>The <NuxtLink to=\"/account\">“Profile”</NuxtLink> page opens by clicking your name in the top right corner. It shows your name, email and role, and lets you change your password: enter the current one and the new one (at least 8 characters). In the “Interface language” block you choose the language of the app; see the “Interface language” section for details. The “Sign out” button is next to your name. You can also delete your account here; see the “Deleting an account” section for details.</p>\n  </section>\n\n  <section id=\"language\" class=\"card guide-section prose\">\n    <h2>Interface language</h2>\n    <p>The app is available in Russian and English. The language is set per account and saved on the server, so on another device or in another browser the interface opens in the same language. This guide is shown in the selected language too.</p>\n    <h3>How to switch the language</h3>\n    <ol>\n      <li>Open <NuxtLink to=\"/account\">“Profile”</NuxtLink> (your name in the top right corner).</li>\n      <li>In the “Interface language” block, choose “Русский” or “English” from the list.</li>\n      <li>The language changes immediately and there is no need to reload the page. There is no “Save” button: the choice is remembered automatically.</li>\n    </ol>\n    <p>On the sign-in and sign-up pages, use the RU and EN buttons above the form. A language chosen there is used for a new account, and when you sign in to an existing account it is saved to that account.</p>\n    <p class=\"callout\">Only the interface and this guide are translated. Channel names, post titles and texts, and the messages the bot publishes to Telegram stay as you wrote them.</p>\n    <p>An editor created by an administrator starts with the administrator’s language and can change it in their own profile.</p>\n  </section>\n\n  <section id=\"delete\" class=\"card guide-section prose\">\n    <h2>Deleting an account</h2>\n    <p>You can delete your account yourself, and if you do not sign in for a long time it is deleted automatically. In both cases the data is erased permanently and cannot be restored from the app.</p>\n\n    <h3>Deleting at your own request</h3>\n    <ol>\n      <li>Open <NuxtLink to=\"/account\">“Profile”</NuxtLink> (your name in the top right corner) and find the “Delete account” block.</li>\n      <li>Enter your password and click “Delete account”.</li>\n      <li>Read the warning and confirm the deletion. After that you are signed out of the app.</li>\n    </ol>\n    <dl class=\"defs\">\n      <dt><span class=\"badge\">Editor</span></dt>\n      <dd>Only the account itself and its access to channels are deleted. The posts you created stay with the administrator.</dd>\n      <dt><span class=\"badge\">Administrator</span></dt>\n      <dd>The whole workspace is deleted along with the account: channels with posts, likes and statistics, parser sources, uploaded pictures, all their editors and the connected bot. Messages already published in Telegram channels stay where they are.</dd>\n      <dt><span class=\"badge\">Main administrator</span></dt>\n      <dd>Cannot delete the account themselves: there is no block with a delete button in their profile.</dd>\n    </dl>\n    <p class=\"callout callout-warn\">When an administrator deletes their account, the accounts of their editors are deleted too. Warn them in advance.</p>\n\n    <h3>Automatic deletion after inactivity</h3>\n    <p>If nobody has signed in to or used an account for 90 days in a row, it is deleted automatically. The check runs once a day, at night in the server’s time. Any work in the app under your own account counts as activity: signing in and opening any page is enough.</p>\n    <ul>\n      <li>An <b>editor</b> is deleted if they have not signed in themselves for 90 days.</li>\n      <li>An <b>administrator</b> is deleted only if neither they nor any of their editors have signed in for 90 days. While someone from the team works in the workspace, it is kept.</li>\n    </ul>\n    <p class=\"callout callout-warn\">The app does not send emails, so there is no warning before deletion. If you need the account, sign in at least once every 90 days. Scheduled publications do not count as activity on their own.</p>\n    <p>The current period is shown in the “Delete account” block of your profile.</p>\n  </section>\n\n  <section id=\"faq\" class=\"card guide-section prose\">\n    <h2>Frequently asked questions</h2>\n    <dl class=\"faq\">\n      <dt>I see “The bot is not connected”</dt>\n      <dd>An administrator needs to add the bot token on the “Bot” page. Until there is a bot, publishing and statistics collection do not work.</dd>\n      <dt>A post got the “Publishing failed” status</dt>\n      <dd>Read the reason in the card. Most often the bot is not a channel administrator or lacks permission to post messages, or the file link is unavailable. Fix it and click “Publish now”.</dd>\n      <dt>I see “No channels have been assigned to you yet”</dt>\n      <dd>Ask an administrator to give you access to channels on the “Users” page.</dd>\n      <dt>A post was not sent at the scheduled time</dt>\n      <dd>Check that the channel is not disabled on the “Channels” page and that the bot is still a channel administrator. Scheduled posts are checked every minute.</dd>\n      <dt>I cannot add a channel to the parser</dt>\n      <dd>The parser works only with public channels that have the web preview enabled (t.me/s/…). Check the @username and that the channel opens in a browser.</dd>\n      <dt>The text does not fit in a post</dt>\n      <dd>A text post is limited to 4096 characters, and a post with a photo or video to 1024. Shorten the text or remove the media.</dd>\n      <dt>My account was deleted although I did not delete it</dt>\n      <dd>Most likely nobody signed in to it for 90 days in a row, and it was deleted automatically. It cannot be restored from the app: sign up again (if registration is enabled) or ask an administrator to create an account. An administrator’s data can only be recovered from a database backup, which the server owner can do.</dd>\n      <dt>There is no delete account button in my profile</dt>\n      <dd>The main administrator does not have it: they cannot delete their account themselves. For everyone else, the “Delete account” block is at the bottom of the “Profile” page.</dd>\n      <dt>How do I switch the interface language?</dt>\n      <dd>Open “Profile” and choose the language in the “Interface language” block: Русский or English. The language changes immediately and is saved in your account. See the “Interface language” section for details.</dd>\n      <dt>Some of the text is not in my language</dt>\n      <dd>Channel names, post titles and texts, and parser source names are not translated: they stay as you or Telegram set them. Messages that come from Telegram itself are always in English.</dd>\n      <dt>The sign-in page opened in a different language</dt>\n      <dd>The sign-in and sign-up pages open in the language last chosen in this browser (Russian by default). Switch it with the RU and EN buttons above the form. After you sign in, your account’s language is applied, and if you chose a language manually, it is saved to your account.</dd>\n    </dl>\n  </section>\n</template>\n"
 },
 "replace": {
  "pages/guide.vue": {
   "from": "5441720c52798cdc9fd9e75a2fdeaf123ce9c04f4d41c064add3878f549a58ec",
   "content": "<script setup lang=\"ts\">\n// Руководство пользователя: содержание слева (на узких экранах сворачивается) и разделы справа.\n// Текст разделов лежит в components/GuideRu.vue и components/GuideEn.vue, язык выбирается в профиле.\n// id разделов одинаковые в обоих языках; при добавлении раздела добавьте его в оба компонента и в locales (guide.toc.<id>).\nconst sectionIds = ['start', 'roles', 'bot', 'channels', 'parser', 'drafts', 'published', 'metrics', 'users', 'account', 'language', 'delete', 'faq']\nconst { t, locale } = useLocale()\nconst toc = computed(() => sectionIds.map((id) => ({ id, title: t(`guide.toc.${id}`) })))\n\nconst active = ref(sectionIds[0])\nconst tocOpen = ref(false)\n\nlet wide: MediaQueryList | null = null\nlet spy: IntersectionObserver | null = null\nconst visible = new Set<string>()\n\nconst syncToc = () => (tocOpen.value = Boolean(wide?.matches)) // на широком экране содержание всегда раскрыто\n\nfunction onSummary(e: Event) {\n  if (wide?.matches) e.preventDefault() // на широком экране сворачивать содержание нельзя\n}\n\nfunction go(id: string) {\n  const el = document.getElementById(id)\n  if (!el) return\n  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches\n  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })\n  history.replaceState(history.state, '', `#${id}`)\n  active.value = id\n  if (!wide?.matches) tocOpen.value = false\n}\n\n// подсвечиваем в содержании раздел, который сейчас читают\nfunction onScroll() {\n  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2\n  if (atBottom) active.value = sectionIds[sectionIds.length - 1]\n}\n\n// разделы подключаются заново при смене языка (текст руководства — другой компонент)\nfunction observe() {\n  spy?.disconnect()\n  visible.clear()\n  spy = new IntersectionObserver(\n    (entries) => {\n      for (const e of entries) {\n        if (e.isIntersecting) visible.add(e.target.id)\n        else visible.delete(e.target.id)\n      }\n      const first = sectionIds.find((id) => visible.has(id))\n      if (first) active.value = first\n    },\n    { rootMargin: '-80px 0px -60% 0px' },\n  )\n  for (const id of sectionIds) {\n    const el = document.getElementById(id)\n    if (el) spy.observe(el)\n  }\n}\n\nonMounted(() => {\n  wide = window.matchMedia('(min-width: 981px)')\n  syncToc()\n  wide.addEventListener('change', syncToc)\n\n  observe()\n  window.addEventListener('scroll', onScroll, { passive: true })\n\n  const hash = location.hash.slice(1)\n  if (hash && sectionIds.includes(hash)) nextTick(() => go(hash))\n})\nwatch(locale, () => nextTick(observe))\n\nonBeforeUnmount(() => {\n  wide?.removeEventListener('change', syncToc)\n  spy?.disconnect()\n  window.removeEventListener('scroll', onScroll)\n})\n</script>\n\n<template>\n  <section>\n    <div class=\"row head\"><h1>{{ t('guide.title') }}</h1></div>\n\n    <div class=\"guide\">\n      <details class=\"card toc\" :open=\"tocOpen\" @toggle=\"tocOpen = ($event.target as HTMLDetailsElement).open\">\n        <summary @click=\"onSummary\">{{ t('guide.toc') }}</summary>\n        <nav :aria-label=\"t('guide.tocAria')\">\n          <ul>\n            <li v-for=\"s in toc\" :key=\"s.id\">\n              <a :href=\"`#${s.id}`\" :class=\"{ active: active === s.id }\" :aria-current=\"active === s.id ? 'true' : undefined\" @click.prevent=\"go(s.id)\">{{ s.title }}</a>\n            </li>\n          </ul>\n        </nav>\n      </details>\n\n      <div class=\"guide-body\">\n        <GuideRu v-if=\"locale === 'ru'\" />\n        <GuideEn v-else />\n      </div>\n    </div>\n  </section>\n</template>\n"
  }
 }
}

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry-run')
const FORCE = args.has('--force')
const BAK = '.bak-i18n'
const root = process.cwd()
const abs = (f) => path.join(root, f)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const count = (t, s) => (s === '' ? 0 : t.split(s).length - 1)

if (!fs.existsSync(abs('package.json')) || !fs.existsSync(abs('pages')) || !fs.existsSync(abs('server/express'))) {
  console.error('Запустите скрипт из корня проекта tg-channel-manager (рядом с package.json).')
  process.exit(1)
}

const errors = []
const writes = [] // { file, text, backup }
const log = []

// 1. Точечные правки существующих файлов
for (const { file, hunks } of DATA.edits) {
  if (!fs.existsSync(abs(file))) { errors.push(`${file}: файл не найден`); continue }
  const original = fs.readFileSync(abs(file), 'utf8')
  let text = original
  let applied = 0
  let skipped = 0
  hunks.forEach((h, i) => {
    const n = h.count ?? 1
    const done = h.new === '' ? count(text, h.old) === 0 : text.includes(h.new)
    if (done) { skipped++; return }
    const found = count(text, h.old)
    if (found !== n) {
      errors.push(`${file}, правка ${i + 1}: ожидалось вхождений: ${n}, найдено: ${found}. Начало фрагмента: ${JSON.stringify(h.old.slice(0, 70))}`)
      return
    }
    text = text.split(h.old).join(h.new)
    applied++
  })
  if (applied) writes.push({ file, text, backup: true })
  log.push(`${applied ? 'изменён ' : 'без изменений'} ${file}${applied ? ` (правок: ${applied}${skipped ? `, уже было: ${skipped}` : ''})` : ''}`)
}

// 2. Файлы целиком, которые заменяют существующие (с проверкой исходного содержимого)
for (const [file, { from, content }] of Object.entries(DATA.replace)) {
  if (!fs.existsSync(abs(file))) { errors.push(`${file}: файл не найден`); continue }
  const cur = fs.readFileSync(abs(file), 'utf8')
  if (cur === content) { log.push(`без изменений ${file}`); continue }
  if (sha(cur) !== from && !FORCE) {
    errors.push(`${file}: файл отличается от версии, под которую написан скрипт. Если изменения в нём не нужны, запустите с --force (останется копия ${file}${BAK})`)
    continue
  }
  writes.push({ file, text: content, backup: true })
  log.push(`заменён  ${file}`)
}

// 3. Новые файлы
for (const [file, content] of Object.entries(DATA.files)) {
  if (!fs.existsSync(abs(file))) { writes.push({ file, text: content, backup: false }); log.push(`создан   ${file}`); continue }
  const cur = fs.readFileSync(abs(file), 'utf8')
  log.push(cur === content ? `без изменений ${file}` : `пропущен ${file} (уже есть и отличается: не перезаписываю ваши правки)`)
}

if (errors.length) {
  console.error('Ничего не изменено. Проблемы:\n')
  for (const e of errors) console.error('  • ' + e)
  console.error('\nПохоже, файлы проекта отличаются от тех, под которые написан скрипт. Пришлите их, и я подгоню правки.')
  process.exit(1)
}

for (const l of log) console.log('  ' + l)
if (DRY) { console.log('\nПроверка пройдена, файлы не менялись (--dry-run).'); process.exit(0) }

for (const { file, text, backup } of writes) {
  if (backup && !fs.existsSync(abs(file + BAK))) fs.copyFileSync(abs(file), abs(file + BAK))
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true })
  fs.writeFileSync(abs(file), text)
}

console.log(writes.length ? `\nГотово: записано файлов — ${writes.length}.` : '\nНичего не изменилось: правки уже применены.')
console.log('Дальше: перезапустите сервер, чтобы выполнилась миграция users.lang, и обновите страницу (Ctrl+F5).')
console.log('Язык переключается в «Профиле» → «Язык интерфейса» (на страницах входа — кнопки RU / EN).')
