#!/usr/bin/env node
// Панель эмодзи в форме поста («Подготовка постов»: создание и редактирование).
// Под полем текста появляется кнопка «😊 Эмодзи»: открывает панель с категориями, клик вставляет эмодзи в позицию курсора
// (или вместо выделенного текста). Вставляются обычные Unicode-эмодзи, Telegram показывает их как свои; работает с любым форматированием.
// Учитывается лимит текста (4096 / 1024 символов с вложением): сверх лимита эмодзи не вставляется.
//
// Запуск из корня проекта:  node add-emoji-picker.mjs [путь/к/проекту]
// Создаёт components/EmojiPicker.vue, правит PostForm.vue и переводы. Всё или ничего; повторный запуск безопасен; копии: *.bak-emoji.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = (f) => path.join(root, f);
const dec = (s) => Buffer.from(s, 'base64').toString('utf8');

const NEW_FILES = {
  'components/EmojiPicker.vue': dec('PHNjcmlwdCBzZXR1cCBsYW5nPSJ0cyI+Ci8vINCf0LDQvdC10LvRjCDRjdC80L7QtNC30Lgg0LTQu9GPINGC0LXQutGB0YLQsCDQv9C+0YHRgtCwLiDQktGB0YLQsNCy0LvRj9C10YIg0L7QsdGL0YfQvdGL0LUgVW5pY29kZS3RjdC80L7QtNC30Lg6IFRlbGVncmFtINC/0L7QutCw0LfRi9Cy0LDQtdGCINC40YUg0LrQsNC6INGB0LLQvtC4Lgpjb25zdCBlbWl0ID0gZGVmaW5lRW1pdHM8eyBwaWNrOiBbZW1vamk6IHN0cmluZ10gfT4oKQpjb25zdCB7IHQgfSA9IHVzZUxvY2FsZSgpCgpjb25zdCBvcGVuID0gcmVmKGZhbHNlKQpjb25zdCBjYXQgPSByZWYoMCkKCmNvbnN0IENBVFM6IHsgaWQ6IHN0cmluZzsgaWNvbnM6IHN0cmluZ1tdIH1bXSA9IFsKICB7IGlkOiAnc21pbGV5cycsIGljb25zOiAn8J+YgCDwn5iDIPCfmIQg8J+YgSDwn5iGIPCfmIUg8J+YgiDwn6SjIPCfmIog8J+YhyDwn5mCIPCfmIkg8J+YjSDwn6WwIPCfmJgg8J+YiyDwn5iOIPCfpKkg8J+lsyDwn5iPIPCfmJIg8J+YniDwn5iUIPCfmJ8g8J+YlSDwn5mBIPCfmKMg8J+YliDwn5irIPCfmKkg8J+luiDwn5iiIPCfmK0g8J+YpCDwn5igIPCfmKEg8J+krCDwn6SvIPCfmLMg8J+ltSDwn6W2IPCfmLEg8J+YqCDwn5iwIPCfmKUg8J+YkyDwn6SXIPCfpJQg8J+krSDwn6SrIPCfmLYg8J+YkCDwn5iRIPCfmKwg8J+ZhCDwn5ivIPCfmLQg8J+kpCDwn5i3IPCfpJIg8J+klSDwn6SiIPCfpK4g8J+kpyDwn6SgIPCfpJMg8J+nkCDwn5iIIPCfkbsg8J+SgCDwn6SWIPCfkqknLnNwbGl0KCcgJykgfSwKICB7IGlkOiAnZ2VzdHVyZXMnLCBpY29uczogJ/CfkY0g8J+RjiDwn5GMIOKcjO+4jyDwn6SeIPCfpJ8g8J+kmCDwn6SZIPCfkYgg8J+RiSDwn5GGIPCfkYcg4pid77iPIPCfkYsg8J+kmiDinIsg8J+WliDwn5GPIPCfmYwg8J+knSDwn5mPIPCfkqog4pyN77iPIPCfq6Eg8J+rtiDwn5GAIPCfkYEg8J+noCDwn5GkIPCfkaUg8J+Xoycuc3BsaXQoJyAnKSB9LAogIHsgaWQ6ICdoZWFydHMnLCBpY29uczogJ+KdpO+4jyDwn6ehIPCfkpsg8J+SmiDwn5KZIPCfkpwg8J+WpCDwn6SNIPCfpI4g8J+SlCDinaPvuI8g8J+SlSDwn5KeIPCfkpMg8J+SlyDwn5KWIPCfkpgg8J+SnSDwn5KfIOKZpe+4jyDwn5i7IPCfkosg8J+SjCcuc3BsaXQoJyAnKSB9LAogIHsgaWQ6ICdzeW1ib2xzJywgaWNvbnM6ICfinIUg4p2MIOKdjiDirZAg8J+MnyDinKgg8J+UpSDwn5KlIPCfkq8g4pqhIOKdlyDinZMg4oC877iPIOKBie+4jyDimqDvuI8g8J+aqyDinJTvuI8g4p6VIOKeliDinqHvuI8g4qyF77iPIOKshu+4jyDirIfvuI8g4oaX77iPIPCflJQg8J+ToiDwn5OjIPCflJ0g8J+GlSDwn4aTIPCfhpcg8J+UtCDwn5+gIPCfn6Eg8J+foiDwn5S1IPCfn6Mg4pqrIOKaqiDilrbvuI8g4o+4IOKPqSDwn5ScIPCflJkg4pm777iPIPCfkrIgwqnvuI8gwq7vuI8g4oSi77iPJy5zcGxpdCgnICcpIH0sCiAgeyBpZDogJ29iamVjdHMnLCBpY29uczogJ/Cfk4wg8J+TjSDwn5OOIPCflJcg8J+ThSDwn5OGIPCfl5Mg4o+wIOKMmyDwn5OdIPCfk5Yg8J+TmiDwn5OwIPCfkqEg8J+SsCDwn5KzIPCfkrUg8J+SjiDwn46BIPCfjokg8J+OiiDwn46vIPCfj4Yg8J+lhyDwn6WIIPCfpYkg8J+OrCDwn461IPCfjqcg8J+OpCDwn5O3IPCfjqUg8J+TsSDwn5K7IPCflqUg4oyo77iPIPCflJIg8J+UkSDwn5SNIPCfm5Ig8J+TpiDwn5qAIOKciO+4jyDwn5qXIPCfj6Ag8J+PoiDimpnvuI8g8J+boCDwn5OKIPCfk4gg8J+TiSDwn5OLIPCfk4Eg4pyJ77iPIPCfk6cg8J+Tnicuc3BsaXQoJyAnKSB9LAogIHsgaWQ6ICduYXR1cmUnLCBpY29uczogJ+KYgO+4jyDwn4yZIOKtkCDwn4yIIOKYge+4jyDim4Ug4p2E77iPIOKYg++4jyDwn4yKIPCflKUg8J+MuSDwn4y4IPCfjLwg8J+MuyDwn42AIPCfjL8g8J+MsyDwn42BIPCfkLYg8J+QsSDwn5CtIPCfpoog8J+QuyDwn5C8IPCfpoEg8J+QryDwn5C4IPCfkLUg8J+mhCDwn5CdIPCfposg8J+QoCcuc3BsaXQoJyAnKSB9LAogIHsgaWQ6ICdmb29kJywgaWNvbnM6ICfwn42OIPCfjYog8J+NiyDwn42MIPCfjYkg8J+NhyDwn42TIPCfjZIg8J+NkSDwn6WRIPCfjYUg8J+llSDwn4y9IPCfjZUg8J+NlCDwn42fIPCfjK0g8J+lqiDwn4yuIPCfjaMg8J+NnCDwn42dIPCfjbAg8J+OgiDwn42pIPCfjaog8J+NqyDwn42/IOKYlSDwn421IPCfjbog8J+NtyDwn6WCIPCfjb4g8J+ngyDwn6WkJy5zcGxpdCgnICcpIH0sCl0KCmNvbnN0IGNhdHMgPSBDQVRTCjwvc2NyaXB0PgoKPHRlbXBsYXRlPgogIDxkaXYgY2xhc3M9ImVtb2ppIj4KICAgIDxidXR0b24gdHlwZT0iYnV0dG9uIiBjbGFzcz0iZW1vamktdG9nZ2xlIiA6YXJpYS1leHBhbmRlZD0ib3BlbiIgQGNsaWNrPSJvcGVuID0gIW9wZW4iPvCfmIoge3sgdCgncG9zdC5lbW9qaScpIH19PC9idXR0b24+CiAgICA8ZGl2IHYtaWY9Im9wZW4iIGNsYXNzPSJlbW9qaS1wYW5lbCI+CiAgICAgIDxkaXYgY2xhc3M9ImVtb2ppLXRhYnMiIHJvbGU9InRhYmxpc3QiPgogICAgICAgIDxidXR0b24KICAgICAgICAgIHYtZm9yPSIoYywgaSkgaW4gY2F0cyIKICAgICAgICAgIDprZXk9ImMuaWQiCiAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICByb2xlPSJ0YWIiCiAgICAgICAgICA6YXJpYS1zZWxlY3RlZD0iY2F0ID09PSBpIgogICAgICAgICAgOmNsYXNzPSJ7IG9uOiBjYXQgPT09IGkgfSIKICAgICAgICAgIDp0aXRsZT0idCgnZW1vamkuJyArIGMuaWQpIgogICAgICAgICAgOmFyaWEtbGFiZWw9InQoJ2Vtb2ppLicgKyBjLmlkKSIKICAgICAgICAgIEBjbGljaz0iY2F0ID0gaSIKICAgICAgICA+e3sgYy5pY29uc1swXSB9fTwvYnV0dG9uPgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iZW1vamktZ3JpZCI+CiAgICAgICAgPGJ1dHRvbiB2LWZvcj0iZSBpbiBjYXRzW2NhdF0uaWNvbnMiIDprZXk9ImUiIHR5cGU9ImJ1dHRvbiIgQGNsaWNrPSJlbWl0KCdwaWNrJywgZSkiPnt7IGUgfX08L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC90ZW1wbGF0ZT4KCjxzdHlsZSBzY29wZWQ+Ci5lbW9qaSB7IG1hcmdpbi10b3A6IDhweDsgfQouZW1vamktdG9nZ2xlIHsgZm9udC1zaXplOiAxNHB4OyB9Ci5lbW9qaS1wYW5lbCB7IG1hcmdpbi10b3A6IDhweDsgcGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1saW5lKTsgYm9yZGVyLXJhZGl1czogOHB4OyBiYWNrZ3JvdW5kOiB2YXIoLS1jYXJkKTsgfQouZW1vamktdGFicyB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtd3JhcDogd3JhcDsgZ2FwOiA0cHg7IHBhZGRpbmctYm90dG9tOiA2cHg7IG1hcmdpbi1ib3R0b206IDZweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWxpbmUpOyB9Ci5lbW9qaS10YWJzIGJ1dHRvbiwgLmVtb2ppLWdyaWQgYnV0dG9uIHsgcGFkZGluZzogNHB4IDZweDsgYm9yZGVyOiAxcHggc29saWQgdHJhbnNwYXJlbnQ7IGJvcmRlci1yYWRpdXM6IDZweDsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGZvbnQtc2l6ZTogMjJweDsgbGluZS1oZWlnaHQ6IDEuMjsgZm9udC1mYW1pbHk6IGluaGVyaXQ7IH0KLmVtb2ppLXRhYnMgYnV0dG9uLm9uIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1hY2NlbnQpOyB9Ci5lbW9qaS1ncmlkIHsgZGlzcGxheTogZmxleDsgZmxleC13cmFwOiB3cmFwOyBnYXA6IDJweDsgbWF4LWhlaWdodDogMTkwcHg7IG92ZXJmbG93LXk6IGF1dG87IH0KLmVtb2ppLWdyaWQgYnV0dG9uOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tYmcpOyB9Cjwvc3R5bGU+Cg=='),
};

const EDITS = {
  'components/PostForm.vue': [
    [
      "const limit = computed(() => (form.media_url ? 1024 : 4096))\n",
      `const limit = computed(() => (form.media_url ? 1024 : 4096))
const textEl = ref<HTMLTextAreaElement | null>(null)

/** Вставляет эмодзи в позицию курсора (или вместо выделения) и возвращает фокус в поле. */
function insertEmoji(emoji: string) {
  const el = textEl.value
  const v = form.content
  const start = el?.selectionStart ?? v.length
  const end = el?.selectionEnd ?? v.length
  const next = v.slice(0, start) + emoji + v.slice(end)
  if (next.length > limit.value) return
  form.content = next
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(start + emoji.length, start + emoji.length)
  })
}
`,
    ],
    [
      `    <textarea v-model="form.content" required :maxlength="limit" />\n`,
      `    <textarea ref="textEl" v-model="form.content" required :maxlength="limit" />\n    <EmojiPicker @pick="insertEmoji" />\n`,
    ],
  ],
  'locales/ru.ts': [
    [
      "  'post.new': 'Новый пост',\n",
      "  'post.new': 'Новый пост',\n  'post.emoji': 'Эмодзи',\n  'emoji.smileys': 'Смайлы',\n  'emoji.gestures': 'Жесты и люди',\n  'emoji.hearts': 'Сердца',\n  'emoji.symbols': 'Символы',\n  'emoji.objects': 'Предметы',\n  'emoji.nature': 'Природа и животные',\n  'emoji.food': 'Еда и напитки',\n",
    ],
  ],
  'locales/en.ts': [
    [
      "  'post.new': 'New post',\n",
      "  'post.new': 'New post',\n  'post.emoji': 'Emoji',\n  'emoji.smileys': 'Smileys',\n  'emoji.gestures': 'Gestures and people',\n  'emoji.hearts': 'Hearts',\n  'emoji.symbols': 'Symbols',\n  'emoji.objects': 'Objects',\n  'emoji.nature': 'Nature and animals',\n  'emoji.food': 'Food and drink',\n",
    ],
  ],
};

const count = (s, sub) => s.split(sub).length - 1;
const plan = [];
const problems = [];
for (const [file, text] of Object.entries(NEW_FILES)) {
  if (fs.existsSync(p(file)) && fs.readFileSync(p(file), 'utf8') !== text) problems.push(`${file}: файл уже существует и отличается от создаваемого`);
  else if (!fs.existsSync(p(file))) plan.push([file, text, true]);
}
for (const [file, edits] of Object.entries(EDITS)) {
  if (!fs.existsSync(p(file))) { problems.push(`${file}: файл не найден`); continue; }
  let text = fs.readFileSync(p(file), 'utf8');
  let changed = false;
  edits.forEach(([from, to], i) => {
    if (count(text, to) >= 1) return;
    const n = count(text, from);
    if (n !== 1) { problems.push(`${file}: правка №${i + 1}: якорь найден ${n} раз(а), ожидался 1:\n    ${from.trim().split('\n')[0].slice(0, 110)}`); return; }
    text = text.replace(from, () => to);
    changed = true;
  });
  if (changed) plan.push([file, text, false]);
}
if (problems.length) { console.error('Ничего не изменено. Проблемы:\n  - ' + problems.join('\n  - ')); process.exit(1); }
if (!plan.length) { console.log('Уже применено: изменений нет.'); process.exit(0); }
for (const [file, text, isNew] of plan) {
  if (!isNew) {
    const bak = p(file + '.bak-emoji');
    if (!fs.existsSync(bak)) fs.copyFileSync(p(file), bak);
  }
  fs.writeFileSync(p(file), text);
  console.log((isNew ? 'создан: ' : 'изменён: ') + file);
}
console.log('\nГотово. Перезапустите приложение.');
