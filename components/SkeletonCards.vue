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
