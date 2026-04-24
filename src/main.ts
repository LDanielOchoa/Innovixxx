import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { vSanitize } from './directives/v-sanitize'

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.directive('sanitize', vSanitize)

app.use(pinia)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark'
    }
  }
})

app.use(router)
app.use(i18n)

app.mount('#app')

const minTimePromise = new Promise(resolve => setTimeout(resolve, 1000))
const resourcesPromise = new Promise(resolve => {
  if (document.readyState === 'complete') {
    resolve(null)
  } else {
    window.addEventListener('load', resolve)
  }
})

Promise.all([minTimePromise, resourcesPromise]).then(() => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.style.transition = 'opacity 0.8s ease'
    loader.style.opacity = '0'
    setTimeout(() => {
      loader.remove()
    }, 800)
  }
})
