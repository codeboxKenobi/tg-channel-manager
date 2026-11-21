<script setup lang="ts">
// Панель эмодзи для текста поста. Вставляет обычные Unicode-эмодзи: Telegram показывает их как свои.
const emit = defineEmits<{ pick: [emoji: string] }>()
const { t } = useLocale()

const open = ref(false)
const cat = ref(0)

const CATS: { id: string; icons: string[] }[] = [
  { id: 'smileys', icons: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 😶 😐 😑 😬 🙄 😯 😴 🤤 😷 🤒 🤕 🤢 🤮 🤧 🤠 🤓 🧐 😈 👻 💀 🤖 💩'.split(' ') },
  { id: 'gestures', icons: '👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👋 🤚 ✋ 🖖 👏 🙌 🤝 🙏 💪 ✍️ 🫡 🫶 👀 👁 🧠 👤 👥 🗣'.split(' ') },
  { id: 'hearts', icons: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 😻 💋 💌'.split(' ') },
  { id: 'symbols', icons: '✅ ❌ ❎ ⭐ 🌟 ✨ 🔥 💥 💯 ⚡ ❗ ❓ ‼️ ⁉️ ⚠️ 🚫 ✔️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ ↗️ 🔔 📢 📣 🔝 🆕 🆓 🆗 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ▶️ ⏸ ⏩ 🔜 🔙 ♻️ 💲 ©️ ®️ ™️'.split(' ') },
  { id: 'objects', icons: '📌 📍 📎 🔗 📅 📆 🗓 ⏰ ⌛ 📝 📖 📚 📰 💡 💰 💳 💵 💎 🎁 🎉 🎊 🎯 🏆 🥇 🥈 🥉 🎬 🎵 🎧 🎤 📷 🎥 📱 💻 🖥 ⌨️ 🔒 🔑 🔍 🛒 📦 🚀 ✈️ 🚗 🏠 🏢 ⚙️ 🛠 📊 📈 📉 📋 📁 ✉️ 📧 📞'.split(' ') },
  { id: 'nature', icons: '☀️ 🌙 ⭐ 🌈 ☁️ ⛅ ❄️ ☃️ 🌊 🔥 🌹 🌸 🌼 🌻 🍀 🌿 🌳 🍁 🐶 🐱 🐭 🦊 🐻 🐼 🦁 🐯 🐸 🐵 🦄 🐝 🦋 🐠'.split(' ') },
  { id: 'food', icons: '🍎 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥑 🍅 🥕 🌽 🍕 🍔 🍟 🌭 🥪 🌮 🍣 🍜 🍝 🍰 🎂 🍩 🍪 🍫 🍿 ☕ 🍵 🍺 🍷 🥂 🍾 🧃 🥤'.split(' ') },
]

const cats = CATS
</script>

<template>
  <div class="emoji">
    <button type="button" class="emoji-toggle" :aria-expanded="open" @click="open = !open">😊 {{ t('post.emoji') }}</button>
    <div v-if="open" class="emoji-panel">
      <div class="emoji-tabs" role="tablist">
        <button
          v-for="(c, i) in cats"
          :key="c.id"
          type="button"
          role="tab"
          :aria-selected="cat === i"
          :class="{ on: cat === i }"
          :title="t('emoji.' + c.id)"
          :aria-label="t('emoji.' + c.id)"
          @click="cat = i"
        >{{ c.icons[0] }}</button>
      </div>
      <div class="emoji-grid">
        <button v-for="e in cats[cat].icons" :key="e" type="button" @click="emit('pick', e)">{{ e }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emoji { margin-top: 8px; }
.emoji-toggle { font-size: 14px; }
.emoji-panel { margin-top: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); }
.emoji-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px solid var(--line); }
.emoji-tabs button, .emoji-grid button { padding: 4px 6px; border: 1px solid transparent; border-radius: 6px; background: transparent; font-size: 22px; line-height: 1.2; font-family: inherit; }
.emoji-tabs button.on { border-color: var(--accent); }
.emoji-grid { display: flex; flex-wrap: wrap; gap: 2px; max-height: 190px; overflow-y: auto; }
.emoji-grid button:hover { background: var(--bg); }
</style>
