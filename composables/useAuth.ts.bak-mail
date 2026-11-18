import type { Locale } from './useLocale'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'editor'
  is_super?: boolean
  lang?: Locale
}

export function useAuth() {
  const api = useApi()
  // undefined — ещё не проверяли, null — не вошёл
  const user = useState<AuthUser | null | undefined>('auth-user', () => undefined)
  const needsSetup = useState<boolean>('auth-needs-setup', () => false)
  const registration = useState<{ open: boolean; code_required: boolean }>('auth-registration', () => ({ open: false, code_required: false }))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSuper = computed(() => Boolean(user.value?.is_super))
  const { locale, isLocale, applyLocale, picked } = useLocale()

  // Язык аккаунта применяется при входе. Исключение: язык, который человек сам выбрал на странице входа, сохраняется в аккаунт.
  async function adoptLang(u: AuthUser | null) {
    if (!u) return
    if (picked.value && u.lang !== locale.value) {
      user.value = { ...u, lang: locale.value }
      await api('/auth/lang', { method: 'PUT', body: { lang: locale.value } }).catch(() => {})
    } else if (u.lang && isLocale(u.lang)) {
      applyLocale(u.lang)
    }
    picked.value = false
  }
  // Смена языка в профиле: интерфейс переключается сразу, потом язык сохраняется в аккаунте
  async function changeLang(lang: string) {
    if (!isLocale(lang)) return
    applyLocale(lang)
    picked.value = false
    await api('/auth/lang', { method: 'PUT', body: { lang } })
    if (user.value) user.value = { ...user.value, lang }
  }

  async function fetchMe() {
    const r = await api<{ user: AuthUser | null; needsSetup: boolean; registration?: { open: boolean; code_required: boolean } }>('/auth/me')
    user.value = r.user
    if (r.user?.lang && isLocale(r.user.lang)) applyLocale(r.user.lang)
    needsSetup.value = r.needsSetup
    registration.value = r.registration ?? { open: false, code_required: false }
  }
  async function login(email: string, password: string) {
    user.value = (await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, ...(await sealFields({ password })) } })).user
    await adoptLang(user.value)
  }
  async function setup(email: string, name: string, password: string) {
    user.value = (await api<{ user: AuthUser }>('/auth/setup', { method: 'POST', body: { email, name, lang: locale.value, ...(await sealFields({ password })) } })).user
    picked.value = false
    needsSetup.value = false
  }
  // самостоятельная регистрация администратора: свой аккаунт и изолированное пространство, вход выполняется сразу
  async function register(email: string, name: string, password: string, code = '') {
    user.value = (await api<{ user: AuthUser }>('/auth/register', { method: 'POST', body: { email, name, lang: locale.value, ...(await sealFields({ password, code })) } })).user
    picked.value = false
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
  }

  return { user, needsSetup, registration, isAdmin, isSuper, fetchMe, login, setup, register, logout, changeLang }
}
