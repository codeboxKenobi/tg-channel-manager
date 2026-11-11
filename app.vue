<script setup lang="ts">
const { user, isAdmin, logout } = useAuth()
const route = useRoute()
const menuOpen = ref(false)
const showNav = computed(() => Boolean(user.value) && route.path !== '/login')

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
      <div class="brand">Менеджер каналов</div>
      <button class="burger" type="button" :aria-expanded="menuOpen" aria-controls="menu" aria-label="Меню" @click="menuOpen = !menuOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div id="menu" class="menu" :class="{ open: menuOpen }">
        <nav>
          <NuxtLink to="/">Каналы</NuxtLink>
          <NuxtLink to="/parser">Парсер</NuxtLink>
          <NuxtLink to="/drafts">Подготовка постов</NuxtLink>
          <NuxtLink to="/published">Опубликованные</NuxtLink>
          <NuxtLink to="/metrics">Метрики</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/users">Пользователи</NuxtLink>
        </nav>
        <div class="sp" />
        <NuxtLink to="/account" class="who">{{ user?.name }}</NuxtLink>
        <button type="button" @click="out">Выйти</button>
      </div>
    </header>
    <div v-if="showNav && menuOpen" class="backdrop" @click="menuOpen = false" />
    <main><NuxtPage /></main>
  </div>
</template>
