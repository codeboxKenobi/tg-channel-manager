// Фронтенд и API — один origin, поэтому cookie сессии отправляется автоматически
export function useApi() {
  return async <T = any>(path: string, opts: Record<string, any> = {}): Promise<T> => {
    try {
      return await $fetch<T>('/api' + path, opts)
    } catch (e: any) {
      const status = e?.status ?? e?.statusCode ?? e?.response?.status
      if (status === 401 && !path.startsWith('/auth/')) {
        useState('auth-user').value = null
        await navigateTo('/login')
      }
      throw new Error(e?.data?.error || e.message || 'Ошибка запроса')
    }
  }
}
