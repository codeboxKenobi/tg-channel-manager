<script setup lang="ts">
// Заглушка карточки с графиком — по размеру совпадает с BarChart (заголовок + число справа, столбики, подписи).
</script>

<template>
  <div class="card chart" aria-hidden="true">
    <div class="row between">
      <Skeleton class="mb-3" width="45%" height="18px" />
      <Skeleton class="mb-3" width="48px" height="18px" />
    </div>
    <Skeleton height="120px" />
    <div class="axis">
      <Skeleton width="36px" height="12px" />
      <Skeleton width="36px" height="12px" />
    </div>
  </div>
</template>
