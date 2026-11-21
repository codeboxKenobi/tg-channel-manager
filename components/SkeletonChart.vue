<script setup lang="ts">
// Заглушка карточки с графиком — по размеру совпадает с BarChart (шапка, шкала + столбики, подписи оси).
</script>

<template>
  <div class="card chart" aria-hidden="true">
    <div class="chart-head">
      <Skeleton width="45%" height="18px" />
      <Skeleton width="64px" height="18px" />
    </div>
    <div class="plot-grid">
      <Skeleton width="40px" height="120px" />
      <Skeleton height="120px" />
      <span />
      <div class="axis">
        <Skeleton width="36px" height="12px" />
        <Skeleton width="36px" height="12px" />
      </div>
    </div>
  </div>
</template>
