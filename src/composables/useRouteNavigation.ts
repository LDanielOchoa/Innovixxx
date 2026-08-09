import { ref } from 'vue'

const isRouteNavigating = ref(false)

export function useRouteNavigation() {
  const startNavigation = () => {
    isRouteNavigating.value = true
  }

  const finishNavigation = () => {
    isRouteNavigating.value = false
  }

  return {
    isRouteNavigating,
    startNavigation,
    finishNavigation
  }
}
