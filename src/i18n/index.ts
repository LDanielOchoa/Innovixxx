import { createI18n } from 'vue-i18n'
import { messages } from './messages'

const savedLocale = localStorage.getItem('app-locale') || 'es'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'es',
  messages
})
