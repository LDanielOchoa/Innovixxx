import { ref, watch } from 'vue'

// ─── Singleton: reads preference from localStorage or OS preference ───
const getInitialDark = (): boolean => {
  const saved = localStorage.getItem('app-theme')
  if (saved !== null) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const isDark = ref(getInitialDark())

// Apply .dark class to <html> immediately on module load (prevents FOUC)
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
}

applyTheme(isDark.value)

// Persist every change
watch(isDark, (val) => {
  applyTheme(val)
  localStorage.setItem('app-theme', val ? 'dark' : 'light')
})

// ─── Composable ───────────────────────────────────────────────────────
export function useTheme() {
  const toggle = () => {
    isDark.value = !isDark.value
  }

  const setDark = (value: boolean) => {
    isDark.value = value
  }

  return { isDark, toggle, setDark }
}
