<script setup lang="ts">
// Реквизиты для пожертвований.
// ВНИМАНИЕ: адреса и номер ниже ВЫДУМАННЫЕ (для примера) — перед запуском замените их на свои.
const wallets = [
  { id: 'gram', name: 'Gram', value: 'UQBYjsCeWqBBbJbxFDjLzzWWEuNaAtAp1Ovvw0KmbJCd7itE' },
  { id: 'btc', name: 'Bitcoin', value: 'bc1qrrvydsjvmrnjc390qy6qjud9gtrt454tpc4yyc' },
  { id: 'eth', name: 'Ethereum', value: '0x5a9a6A3C145CAAE503cEA0fab036175e1f5Ed384' },
  { id: 'sbp', name: 'СБП (Служба быстрых платежей)', value: '+7 978 513-63-16' },
]

const copiedId = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

// navigator.clipboard работает только на HTTPS и localhost, а сайт может открываться по http — тогда копируем через textarea
async function writeClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('copy failed')
}

async function copy(w: { id: string; value: string }) {
  try {
    await writeClipboard(w.value)
    copiedId.value = w.id
    clearTimeout(timer)
    timer = setTimeout(() => (copiedId.value = ''), 1800)
  } catch {
    copiedId.value = '' // не вышло — значение можно выделить и скопировать вручную (клик по нему выделяет всё)
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section>
    <div class="row head"><h1>Поддержать проект</h1></div>

    <div class="card prose">
      <p>«Менеджер каналов» — бесплатный проект. Им может пользоваться каждый, платить ничего не нужно, а развивает и поддерживает его один разработчик.</p>
      <p>Если сервис вам полезен, вы можете по желанию поддержать проект пожертвованием. Это добровольно: на доступ к возможностям сервиса пожертвование никак не влияет.</p>
    </div>

    <div class="card">
      <h2>Реквизиты для пожертвований</h2>
      <ul class="wallets">
        <li v-for="w in wallets" :key="w.id" class="wallet">
          <div class="wallet-name">{{ w.name }}</div>
          <div class="wallet-row">
            <code class="wallet-value">{{ w.value }}</code>
            <button type="button" :aria-label="`Скопировать: ${w.name}`" @click="copy(w)">{{ copiedId === w.id ? 'Скопировано' : 'Копировать' }}</button>
          </div>
        </li>
      </ul>
      <p class="muted mt-3">Перед переводом сверьте адрес или номер: переводы в криптовалютах необратимы. Спасибо за поддержку!</p>
    </div>
  </section>
</template>
