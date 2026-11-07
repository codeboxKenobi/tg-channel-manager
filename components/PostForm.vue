<script setup lang="ts">
const props = defineProps<{ channels: any[]; post?: any | null }>()
const emit = defineEmits<{ save: [payload: any]; cancel: [] }>()

// ISO → значение для <input type="datetime-local"> в локальном часовом поясе
const toLocal = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = reactive({
  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,
  title: props.post?.title ?? '',
  content: props.post?.content ?? '',
  media_url: props.post?.media_url ?? '',
  parse_mode: props.post?.parse_mode ?? '',
  scheduled_local: toLocal(props.post?.scheduled_at),
})

const limit = computed(() => (form.media_url ? 1024 : 4096))

function submit() {
  emit('save', {
    channel_id: form.channel_id,
    title: form.title,
    content: form.content,
    media_url: form.media_url || null,
    parse_mode: form.parse_mode || null,
    scheduled_at: form.scheduled_local ? new Date(form.scheduled_local).toISOString() : null,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <h2 style="margin-top: 0">{{ post ? 'Редактирование поста' : 'Новый пост' }}</h2>

    <label>Канал</label>
    <select v-model="form.channel_id" required>
      <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
    </select>

    <label>Заголовок (виден только вам)</label>
    <input v-model="form.title" required maxlength="200" />

    <label>Текст поста ({{ form.content.length }} / {{ limit }})</label>
    <textarea v-model="form.content" required :maxlength="limit" />

    <div class="row" style="align-items: flex-start">
      <div style="flex: 2; min-width: 220px">
        <label>Ссылка на изображение (необязательно)</label>
        <input v-model="form.media_url" type="url" placeholder="https://…" />
      </div>
      <div style="flex: 1; min-width: 160px">
        <label>Форматирование</label>
        <select v-model="form.parse_mode">
          <option value="">Без форматирования</option>
          <option value="HTML">HTML</option>
          <option value="MarkdownV2">MarkdownV2</option>
        </select>
      </div>
    </div>

    <label>Время публикации (пусто — сохранить как черновик)</label>
    <input v-model="form.scheduled_local" type="datetime-local" />

    <div class="actions">
      <button class="primary" type="submit">{{ form.scheduled_local ? 'Запланировать' : 'Сохранить черновик' }}</button>
      <button type="button" @click="emit('cancel')">Отмена</button>
    </div>
  </form>
</template>
