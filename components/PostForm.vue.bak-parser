<script setup lang="ts">
const props = defineProps<{ channels: any[]; post?: any | null }>()
const emit = defineEmits<{ save: [payload: any]; cancel: [] }>()
const api = useApi()

const UPLOAD_PREFIX = '/api/uploads/'

const form = reactive({
  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,
  title: props.post?.title ?? '',
  content: props.post?.content ?? '',
  media_url: (props.post?.media_url ?? '') as string,
  parse_mode: props.post?.parse_mode ?? '',
  scheduled_at: (props.post?.scheduled_at ?? null) as string | null,
})

const isUploaded = computed(() => form.media_url.startsWith(UPLOAD_PREFIX))
const showPreview = computed(() => isUploaded.value || /^https?:\/\//i.test(form.media_url))
const limit = computed(() => (form.media_url ? 1024 : 4096))
const uploading = ref(false)
const uploadError = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // чтобы тот же файл можно было выбрать повторно
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const blob = await toJpeg(file)
    const { url } = await api<{ url: string }>('/uploads', {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
    })
    form.media_url = url
  } catch (err: any) {
    uploadError.value = err.message
  } finally {
    uploading.value = false
  }
}

function submit() {
  emit('save', {
    channel_id: form.channel_id,
    title: form.title,
    content: form.content,
    media_url: form.media_url || null,
    parse_mode: form.parse_mode || null,
    scheduled_at: form.scheduled_at,
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
        <input v-if="!isUploaded" v-model="form.media_url" type="url" placeholder="https://…" />
        <input v-else value="Загружено с устройства" readonly disabled />

        <div class="upload">
          <label class="filebtn" :class="{ busy: uploading }">
            {{ uploading ? 'Загрузка…' : 'Загрузить с устройства' }}
            <input type="file" accept="image/*" :disabled="uploading" @change="onFile" />
          </label>
          <button v-if="form.media_url" type="button" class="danger" @click="form.media_url = ''">Убрать картинку</button>
        </div>
        <p v-if="uploadError" class="error" style="margin: 8px 0 0">{{ uploadError }}</p>
        <img v-if="showPreview" :key="form.media_url" :src="form.media_url" class="preview" alt="Предпросмотр картинки" />
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

    <label>Время публикации (не выбрано — сохранить как черновик)</label>
    <DateTimePicker v-model="form.scheduled_at" />

    <div class="actions">
      <button class="primary" type="submit" :disabled="uploading">{{ form.scheduled_at ? 'Запланировать' : 'Сохранить черновик' }}</button>
      <button type="button" @click="emit('cancel')">Отмена</button>
    </div>
  </form>
</template>
