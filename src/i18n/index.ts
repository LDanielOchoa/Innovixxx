import { createI18n } from 'vue-i18n'
import { baseMessages, moduleMessageLoaders } from './messages'

const savedLocale = localStorage.getItem('app-locale') || 'es'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'es',
  messages: baseMessages
})

const loadedModules = new Set<string>()

export async function loadModuleMessages(moduleName: string) {
  if (loadedModules.has(moduleName)) return
  const loader = moduleMessageLoaders[moduleName]
  if (!loader) return

  try {
    const modMessages = await loader()
    if (modMessages.es) {
      i18n.global.mergeLocaleMessage('es', { [moduleName]: modMessages.es })
    }
    if (modMessages.en) {
      i18n.global.mergeLocaleMessage('en', { [moduleName]: modMessages.en })
    }
    loadedModules.add(moduleName)
  } catch (err) {
    console.warn(`Failed to lazy load i18n messages for module: ${moduleName}`, err)
  }
}

