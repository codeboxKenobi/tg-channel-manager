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
