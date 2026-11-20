<script setup lang="ts">
const props = defineProps<{ channels: any[]; post?: any | null }>()
const emit = defineEmits<{ save: [payload: any]; cancel: [] }>()
const api = useApi()
const { t } = useLocale()

const UPLOAD_PREFIX = '/api/uploads/'

const form = reactive({
  channel_id: props.post?.channel_id ?? props.channels[0]?.id ?? null,
  title: props.post?.title ?? '',
  content: props.post?.content ?? '',
  media_url: (props.post?.media_url ?? '') as string,
  media_name: (props.post?.media_name ?? '') as string,
  parse_mode: props.post?.parse_mode ?? '',
  scheduled_at: (props.post?.scheduled_at ?? null) as string | null,
})

const isUploaded = computed(() => form.media_url.startsWith(UPLOAD_PREFIX))
const showPreview = computed(() => isUploaded.value || /^https?:\/\//i.test(form.media_url))
const isVideo = computed(() => isVideoUrl(form.media_url))
const isDoc = computed(() => isDocUrl(form.media_url))
const limit = computed(() => (form.media_url ? 1024 : 4096))
const uploading = ref(false)
const progress = ref(0)
const uploadError = ref('')

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // чтобы тот же файл можно было выбрать повторно
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  progress.value = 0
  try {
    const docType = docTypeOf(file)
    if (docType) {
      // PDF, TXT, Excel: уходит как есть, вместе с исходным именем
      if (!file.size) throw new Error(t('post.err.empty'))
      if (file.size > MAX_VIDEO_BYTES) throw new Error(t('post.err.fileTooBig', { mb: Math.ceil(file.size / 1048576) }))
      const res = await uploadFile(file, docType, (p) => (progress.value = p), file.name)
      form.media_url = res.url
      form.media_name = res.name || file.name
    } else if (looksLikeVideo(file)) {
      // видео уходит как есть (без перекодирования), с индикатором прогресса
      if (!isMp4File(file)) throw new Error(t('post.err.mp4Only'))
      if (!file.size) throw new Error(t('post.err.empty'))
      if (file.size > MAX_VIDEO_BYTES) throw new Error(t('post.err.videoTooBig', { mb: Math.ceil(file.size / 1048576) }))
      form.media_url = (await uploadFile(file, 'video/mp4', (p) => (progress.value = p))).url
      form.media_name = ''
    } else {
      const blob = await toJpeg(file)
      const { url } = await api<{ url: string }>('/uploads', {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      })
      form.media_url = url
      form.media_name = ''
    }
  } catch (err: any) {
    if (err?.status === 401) {
      useState('auth-user').value = null
      await navigateTo('/login')
    }
    uploadError.value = err.message
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function submit() {
  emit('save', {
    channel_id: form.channel_id,
    title: form.title,
    content: form.content,
    media_url: form.media_url || null,
    media_name: form.media_name || null,
    parse_mode: form.parse_mode || null,
    scheduled_at: form.scheduled_at,
  })
}
</script>

<template>
  <form @submit.prevent="submit">
    <h2>{{ post ? t('post.edit') : t('post.new') }}</h2>

    <label>{{ t('common.channel') }}</label>
    <select v-model="form.channel_id" required>
      <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
    </select>

    <label>{{ t('post.titleLabel') }}</label>
    <input v-model="form.title" required maxlength="200" />

    <label>{{ t('post.textLabel', { len: form.content.length, limit }) }}</label>
    <textarea v-model="form.content" required :maxlength="limit" />

    <div class="row" style="align-items: flex-start">
      <div style="flex: 2; min-width: 220px">
        <label>{{ t('post.mediaLabel') }}</label>
        <input v-if="!isUploaded" v-model="form.media_url" type="url" placeholder="https://…" />
        <input v-else :value="isDoc ? form.media_name || t('post.fileSaved') : isVideo ? t('post.videoSaved') : t('post.uploadedFromDevice')" readonly disabled />

        <div class="upload">
          <label class="filebtn" :class="{ busy: uploading }">
            {{ uploading ? (progress ? t('post.uploadingPct', { p: progress }) : t('post.uploading')) : t('post.upload') }}
            <input type="file" accept="image/*,video/mp4,.mp4,.pdf,.txt,.xlsx,.xls,application/pdf,text/plain" :disabled="uploading" @change="onFile" />
          </label>
          <button v-if="form.media_url" type="button" class="danger" @click="form.media_url = ''; form.media_name = ''">{{ isDoc ? t('post.removeFile') : isVideo ? t('post.removeVideo') : t('post.removeImage') }}</button>
        </div>
        <progress v-if="uploading && progress" class="upload-progress" :value="progress" max="100" />
        <p class="muted" style="margin: 8px 0 0; font-size: 13px">{{ t('post.mediaHint') }}</p>
        <p v-if="uploadError" class="error mt-2">{{ uploadError }}</p>
        <video v-if="showPreview && isVideo" :key="form.media_url" :src="form.media_url" class="preview" controls playsinline preload="metadata" />
        <a v-else-if="showPreview && isDoc" :key="form.media_url" :href="form.media_url" :download="form.media_name || true" class="file-chip">📎 {{ form.media_name || t('post.file') }}</a>
        <img v-else-if="showPreview" :key="form.media_url" :src="form.media_url" class="preview" :alt="t('post.previewAlt')" />
      </div>
      <div style="flex: 1; min-width: 160px">
        <label>{{ t('post.format') }}</label>
        <select v-model="form.parse_mode">
          <option value="">{{ t('post.formatNone') }}</option>
          <option value="HTML">HTML</option>
          <option value="MarkdownV2">MarkdownV2</option>
        </select>
      </div>
    </div>

    <label>{{ t('post.timeLabel') }}</label>
    <DateTimePicker v-model="form.scheduled_at" />

    <div class="actions">
      <button class="primary" type="submit" :disabled="uploading">{{ form.scheduled_at ? t('post.schedule') : t('post.saveDraft') }}</button>
      <button type="button" @click="emit('cancel')">{{ t('common.cancel') }}</button>
    </div>
  </form>
</template>
