<script setup lang="ts">
// Заглушка таблицы в карточке: строки с «ячейками» разной ширины.
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 4, cols: 4 })
const widths = ['70%', '90%', '55%', '80%', '65%', '75%']
</script>

<template>
  <div class="card" aria-hidden="true">
    <div v-for="r in rows" :key="r" class="sk-row">
      <div v-for="c in cols" :key="c" class="sk-cell">
        <Skeleton :width="widths[(r + c) % widths.length]" height="16px" />
      </div>
    </div>
  </div>
</template>
