<script setup lang="ts">
const { user, isAdmin, logout } = useAuth()
const { t, locale } = useLocale()
// заголовок вкладки и атрибут lang страницы следуют за языком интерфейса
useHead(computed(() => ({ title: t('app.name'), htmlAttrs: { lang: locale.value } })))
const route = useRoute()
const menuOpen = ref(false)
const showNav = computed(() => Boolean(user.value) && !['/login', '/register'].includes(route.path))

watch(() => route.fullPath, () => (menuOpen.value = false))
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') menuOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

async function out() {
  menuOpen.value = false
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <header v-if="showNav" class="top">
      <button class="burger" type="button" :aria-expanded="menuOpen" aria-controls="menu" :aria-label="t('nav.menu')" @click="menuOpen = !menuOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div class="brand">{{ t('app.name') }}</div>
      <div class="user">
        <NuxtLink to="/account" class="who">{{ user?.name }}</NuxtLink>
        <button type="button" @click="out">{{ t('nav.logout') }}</button>
      </div>
      <Transition name="menu">
        <nav v-show="menuOpen" id="menu" class="menu" :aria-label="t('nav.sections')" @click="menuOpen = false">
          <NuxtLink to="/">{{ t('nav.channels') }}</NuxtLink>
          <NuxtLink to="/parser">{{ t('nav.parser') }}</NuxtLink>
          <NuxtLink to="/drafts">{{ t('nav.drafts') }}</NuxtLink>
          <NuxtLink to="/published">{{ t('nav.published') }}</NuxtLink>
          <NuxtLink to="/metrics">{{ t('nav.metrics') }}</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/bot">{{ t('nav.bot') }}</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/users">{{ t('nav.users') }}</NuxtLink>
          <hr class="menu-sep" />
          <NuxtLink to="/guide">{{ t('nav.guide') }}</NuxtLink>
          <NuxtLink to="/support">{{ t('nav.support') }}</NuxtLink>
        </nav>
      </Transition>
    </header>
    <div v-if="showNav && menuOpen" class="backdrop" @click="menuOpen = false" />
    <main><NuxtPage /></main>
    <AppDialog />
  </div>
</template>
