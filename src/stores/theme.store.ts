import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const getInitialDark = (): boolean => {
  const saved = localStorage.getItem('app-theme')
  if (saved !== null) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(getInitialDark())

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark)
  }

  // Inicializar inmediatamente
  applyTheme(isDark.value)

  watch(isDark, (val) => {
    applyTheme(val)
  })

  const toggle = () => {
    isDark.value = !isDark.value
  }

  const setDark = (value: boolean) => {
    isDark.value = value
  }

  return { isDark, toggle, setDark }
}, {
  persist: {
    key: 'app-theme',
    // La customización de storage no es estrictamente necesaria aquí porque
    // usamos la lógica de applyTheme, pero definimos cómo se guarda:
    storage: localStorage,
    pick: ['isDark'] // Solo persistimos isDark
  }
})
