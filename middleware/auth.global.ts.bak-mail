export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isAdmin, fetchMe } = useAuth()
  if (user.value === undefined) await fetchMe()

  if (to.path === '/login' || to.path === '/register') return user.value ? navigateTo('/') : undefined
  if (!user.value) return navigateTo('/login')
  if (to.path.startsWith('/users') && !isAdmin.value) return navigateTo('/')
})
