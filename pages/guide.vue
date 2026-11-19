<script setup lang="ts">
// Руководство пользователя: содержание слева (на узких экранах сворачивается) и разделы справа.
// Текст разделов лежит в components/GuideRu.vue и components/GuideEn.vue, язык выбирается в профиле.
// id разделов одинаковые в обоих языках; при добавлении раздела добавьте его в оба компонента и в locales (guide.toc.<id>).
const sectionIds = ['start', 'roles', 'bot', 'channels', 'parser', 'drafts', 'published', 'metrics', 'users', 'account', 'language', 'mail', 'delete', 'faq']
const { t, locale } = useLocale()
const toc = computed(() => sectionIds.map((id) => ({ id, title: t(`guide.toc.${id}`) })))

const active = ref(sectionIds[0])
const tocOpen = ref(false)

let wide: MediaQueryList | null = null
let spy: IntersectionObserver | null = null
const visible = new Set<string>()

const syncToc = () => (tocOpen.value = Boolean(wide?.matches)) // на широком экране содержание всегда раскрыто

function onSummary(e: Event) {
  if (wide?.matches) e.preventDefault() // на широком экране сворачивать содержание нельзя
}

function go(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(history.state, '', `#${id}`)
  active.value = id
  if (!wide?.matches) tocOpen.value = false
}

// подсвечиваем в содержании раздел, который сейчас читают
function onScroll() {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
  if (atBottom) active.value = sectionIds[sectionIds.length - 1]
}

// разделы подключаются заново при смене языка (текст руководства — другой компонент)
function observe() {
  spy?.disconnect()
  visible.clear()
  spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id)
        else visible.delete(e.target.id)
      }
      const first = sectionIds.find((id) => visible.has(id))
      if (first) active.value = first
    },
    { rootMargin: '-80px 0px -60% 0px' },
  )
  for (const id of sectionIds) {
    const el = document.getElementById(id)
    if (el) spy.observe(el)
  }
}

onMounted(() => {
  wide = window.matchMedia('(min-width: 981px)')
  syncToc()
  wide.addEventListener('change', syncToc)

  observe()
  window.addEventListener('scroll', onScroll, { passive: true })

  const hash = location.hash.slice(1)
  if (hash && sectionIds.includes(hash)) nextTick(() => go(hash))
})
watch(locale, () => nextTick(observe))

onBeforeUnmount(() => {
  wide?.removeEventListener('change', syncToc)
  spy?.disconnect()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <section>
    <div class="row head"><h1>{{ t('guide.title') }}</h1></div>

    <div class="guide">
      <details class="card toc" :open="tocOpen" @toggle="tocOpen = ($event.target as HTMLDetailsElement).open">
        <summary @click="onSummary">{{ t('guide.toc') }}</summary>
        <nav :aria-label="t('guide.tocAria')">
          <ul>
            <li v-for="s in toc" :key="s.id">
              <a :href="`#${s.id}`" :class="{ active: active === s.id }" :aria-current="active === s.id ? 'true' : undefined" @click.prevent="go(s.id)">{{ s.title }}</a>
            </li>
          </ul>
        </nav>
      </details>

      <div class="guide-body">
        <GuideRu v-if="locale === 'ru'" />
        <GuideEn v-else />
      </div>
    </div>
  </section>
</template>
