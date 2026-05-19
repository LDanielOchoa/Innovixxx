import { ref } from 'vue'

const isPanelOpen = ref(false)

export function useVehiculosServicioPanel() {
  return {
    isPanelOpen
  }
}
