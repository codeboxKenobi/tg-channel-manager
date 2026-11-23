export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isAdmin, isSuper, fetchMe } = useAuth()
  if (user.value === undefined) await fetchMe()

  if (to.path === '/login' || to.path === '/register' || to.path === '/forgot') return user.value ? navigateTo('/') : undefined
  if (!user.value) return navigateTo('/login')
  if (to.path.startsWith('/users') && !isAdmin.value) return navigateTo('/')
  if (to.path.startsWith('/monitoring') && !isSuper.value) return navigateTo('/')
})
