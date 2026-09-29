import { useState, useNuxtApp, onNuxtReady } from '#imports'

// Barra de progresso fina de navegação — substitui o antigo `isRouteLoading`
// (ref de módulo setado no router.beforeEach/afterEach). Hooks nativos do
// Nuxt (page:start/page:finish) disparam só no client durante a navegação.
//
// Os hooks só são ligados depois que o app hidratou (onNuxtReady): o
// `page:start` da navegação inicial acendia a barra durante a hidratação e o
// HTML do SSR (barra apagada) deixava de bater com a 1ª renderização do client.
export function usePageLoading() {
  const isLoading = useState('page-loading', () => false)

  if (import.meta.client) {
    const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & { _pageLoadingHooked?: boolean }
    if (!nuxtApp._pageLoadingHooked) {
      nuxtApp._pageLoadingHooked = true
      onNuxtReady(() => {
        nuxtApp.hook('page:start', () => { isLoading.value = true })
        nuxtApp.hook('page:finish', () => { isLoading.value = false })
      })
    }
  }

  return isLoading
}
