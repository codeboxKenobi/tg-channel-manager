<script setup lang="ts">
const { user, isAdmin, logout } = useAuth()
const route = useRoute()
const showNav = computed(() => Boolean(user.value) && route.path !== '/login')

async function out() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <header v-if="showNav" class="top">
      <div class="brand">Менеджер каналов</div>
      <nav>
        <NuxtLink to="/">Каналы</NuxtLink>
        <NuxtLink to="/drafts">Подготовка постов</NuxtLink>
        <NuxtLink to="/published">Опубликованные</NuxtLink>
        <NuxtLink to="/metrics">Метрики</NuxtLink>
        <NuxtLink v-if="isAdmin" to="/users">Пользователи</NuxtLink>
      </nav>
      <div class="sp" />
      <NuxtLink to="/account" class="who">{{ user?.name }}</NuxtLink>
      <button @click="out">Выйти</button>
    </header>
    <main><NuxtPage /></main>
  </div>
</template>
