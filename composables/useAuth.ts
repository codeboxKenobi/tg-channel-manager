export interface AuthUser {
  id: number
  email: string
  name: string
  role: 'admin' | 'editor'
  is_super?: boolean
}

export function useAuth() {
  const api = useApi()
  // undefined — ещё не проверяли, null — не вошёл
  const user = useState<AuthUser | null | undefined>('auth-user', () => undefined)
  const needsSetup = useState<boolean>('auth-needs-setup', () => false)
  const registration = useState<{ open: boolean; code_required: boolean }>('auth-registration', () => ({ open: false, code_required: false }))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSuper = computed(() => Boolean(user.value?.is_super))

  async function fetchMe() {
    const r = await api<{ user: AuthUser | null; needsSetup: boolean; registration?: { open: boolean; code_required: boolean } }>('/auth/me')
    user.value = r.user
    needsSetup.value = r.needsSetup
    registration.value = r.registration ?? { open: false, code_required: false }
  }
  async function login(email: string, password: string) {
    user.value = (await api<{ user: AuthUser }>('/auth/login', { method: 'POST', body: { email, ...(await sealFields({ password })) } })).user
  }
  async function setup(email: string, name: string, password: string) {
    user.value = (await api<{ user: AuthUser }>('/auth/setup', { method: 'POST', body: { email, name, ...(await sealFields({ password })) } })).user
    needsSetup.value = false
  }
  // самостоятельная регистрация администратора: свой аккаунт и изолированное пространство, вход выполняется сразу
  async function register(email: string, name: string, password: string, code = '') {
    user.value = (await api<{ user: AuthUser }>('/auth/register', { method: 'POST', body: { email, name, ...(await sealFields({ password, code })) } })).user
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
  }

  return { user, needsSetup, registration, isAdmin, isSuper, fetchMe, login, setup, register, logout }
}
