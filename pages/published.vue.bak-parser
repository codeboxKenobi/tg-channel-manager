<script setup lang="ts">
const api = useApi()
const channels = ref<any[]>([])
const posts = ref<any[]>([])
const channelId = ref<number | ''>('')
const error = ref('')

async function load() {
  error.value = ''
  try {
    channels.value = await api('/channels')
    posts.value = await api('/posts', { query: { status: 'published', channel_id: channelId.value || undefined } })
  } catch (e: any) {
    error.value = e.message
  }
}

async function remove(p: any) {
  if (!confirm(`Удалить запись «${p.title}»?`)) return
  const fromTelegram = Boolean(p.tg_message_id) && confirm('Удалить и само сообщение из канала?')
  try {
    await api(`/posts/${p.id}`, { method: 'DELETE', query: { tg: fromTelegram ? 1 : undefined } })
  } catch (e: any) {
    error.value = e.message
  }
  await load()
}

const link = (p: any) => (p.channel_username && p.tg_message_id ? `https://t.me/${p.channel_username}/${p.tg_message_id}` : null)

onMounted(load)
watch(channelId, load)
</script>

<template>
  <section>
    <div class="row between head">
      <h1>Опубликованные</h1>
      <select v-model="channelId" class="filter">
        <option value="">Все каналы</option>
        <option v-for="c in channels" :key="c.id" :value="c.id">{{ c.title }}</option>
      </select>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!posts.length" class="muted">Опубликованных постов пока нет.</p>

    <article v-for="p in posts" :key="p.id" class="card">
      <div class="row between">
        <div>
          <strong>{{ p.title }}</strong>
          <span class="muted"> · {{ p.channel_title }}</span>
        </div>
        <span class="badge published">👍 {{ fmtNum(p.likes_count) }}</span>
      </div>
      <p class="post-content">{{ p.content }}</p>
      <img v-if="p.media_url" :src="p.media_url" class="thumb" alt="" loading="lazy" @error="($event.target as HTMLImageElement).style.display = 'none'" />
      <p class="muted" style="margin: 0">Опубликовано: {{ fmtDate(p.published_at) }}<span v-if="p.author_name"> · автор: {{ p.author_name }}</span></p>
      <div class="actions">
        <a v-if="link(p)" :href="link(p)!" target="_blank" rel="noopener"><button>Открыть в Telegram</button></a>
        <button class="danger" @click="remove(p)">Удалить</button>
      </div>
    </article>
  </section>
</template>
