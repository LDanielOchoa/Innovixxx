<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'
import { IconChevronLeft, IconMail, IconLock, IconEye, IconEyeOff, IconDeviceFloppy, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-vue'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const lang = computed(() => locale.value)
useTheme() // Ensures dark class is reactive on html element

const correo = ref('')
const nuevaClave = ref('')
const mostrarContrasena = ref(false)
const cargando = ref(false)
const exitoMensaje = ref('')
const errorMensaje = ref('')

const tokenRecover = computed(() => {
  // Captura el token incluso en URLs con parámetros mal formados como ?&token=
  const query = route.query
  return (query.token as string) || (query['&token'] as string) || ''
})

const recaptchaSiteKey = '6LcHvXMsAAAAAOeJeKmkj1zjpiWsOu__Po8Pu2lK'
const recaptchaReady = ref(false)

const cargarRecaptcha = () => {
  if (document.querySelector(`script[src*="recaptcha/api.js"]`)) {
    recaptchaReady.value = !!window.grecaptcha
    return
  }
  const script = document.createElement('script')
  script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
  script.async = true
  script.defer = true
  script.onload = () => {
    recaptchaReady.value = true
  }
  document.head.appendChild(script)
}

const obtenerTokenRecaptcha = async () => {
  if (!window.grecaptcha) {
    throw new Error('reCAPTCHA no está disponible.')
  }
  return await window.grecaptcha.execute(recaptchaSiteKey, { action: 'recover_pass_confirmed' })
}

const alternarContrasena = () => {
  mostrarContrasena.value = !mostrarContrasena.value
}

const restablecerClave = async () => {
  if (!correo.value || !nuevaClave.value) {
    errorMensaje.value = t('auth.missingAllFields')
    setTimeout(() => { errorMensaje.value = '' }, 3000)
    return
  }

  if (!tokenRecover.value) {
    errorMensaje.value = t('auth.invalidToken')
    setTimeout(() => { errorMensaje.value = '' }, 3000)
    return
  }

  cargando.value = true
  errorMensaje.value = ''
  exitoMensaje.value = ''

  try {
    if (!recaptchaReady.value) {
      throw new Error(t('errors.recaptchaNotReady'))
    }

    const gcToken = await obtenerTokenRecaptcha()

    const respuesta = await fetch('/api/v1/recover_pass_confirmed/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: correo.value,
        gcToken,
        token_recover: tokenRecover.value,
        new_pass: nuevaClave.value,
        lang: lang.value
      })
    })

    const data = await respuesta.json()

    if (!respuesta.ok || !data.done) {
      throw new Error(data.message || t('auth.resetError'))
    }

    exitoMensaje.value = data.message || t('auth.resetSuccessDefault')
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (error) {
    errorMensaje.value = error instanceof Error ? error.message : t('auth.recoverGenericError')
  } finally {
    cargando.value = false
  }
}

const mostrarBadgeRecaptcha = (visible: boolean) => {
  const badge = document.querySelector('.grecaptcha-badge') as HTMLElement | null
  if (badge) {
    badge.style.visibility = visible ? 'visible' : 'hidden'
    badge.style.opacity = visible ? '1' : '0'
  }
}

// Validar presencia de token al montar
onMounted(() => {
  cargarRecaptcha()
  if (window.grecaptcha) {
    recaptchaReady.value = true
  }
  
  if (!tokenRecover.value) {
    errorMensaje.value = t('auth.invalidToken') || 'Token de recuperación no encontrado o inválido.'
  }
  
  setTimeout(() => mostrarBadgeRecaptcha(true), 500)
})

onUnmounted(() => {
  mostrarBadgeRecaptcha(false)
})
</script>

<template>
  <div class="bg-white dark:bg-[#1E2228] font-sans text-slate-700 dark:text-slate-300 flex items-center justify-center min-h-screen transition-colors duration-500 relative overflow-hidden selection:bg-[#60a5fa]/30 dark:selection:bg-[#5da6fc]/30 selection:text-white">
    
    <!-- Background Decorators -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
      <div class="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#60a5fa]/8 dark:bg-[#5da6fc]/10 rounded-full blur-[150px] animate-[pulse_4s_ease-in-out_infinite] pointer-events-none z-0"></div>
      <div class="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-[#93c5fd]/6 dark:bg-[#A5C9FF]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>

    <!-- Contenedor Principal -->
    <div class="relative w-full min-h-screen flex flex-col items-center justify-center z-10 px-6 py-10">
      
      <div class="w-full max-w-[420px] mx-auto animate-fade-slide-right relative z-10">
        
        <button 
          @click="router.push('/login')" 
          class="absolute -top-12 left-0 text-slate-400 dark:text-slate-500 hover:text-[#60a5fa] dark:hover:text-[#5da6fc] transition-colors p-2 rounded-lg hover:bg-[#60a5fa]/8 dark:hover:bg-[#5da6fc]/10 flex items-center gap-1 group"
        >
          <IconChevronLeft :size="20" class="group-hover:-translate-x-1 transition-transform" />
          <span class="text-xs font-mono tracking-widest uppercase">{{ t('common.back') }}</span>
        </button>

        <!-- Greeting -->
        <div class="mb-10 text-center relative px-2 mt-8">
          <!-- Decorative Divider -->
          <div class="flex items-center justify-center gap-3 mb-4 opacity-50">
            <div class="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-400 dark:to-slate-500"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-[#60a5fa] dark:bg-[#5da6fc] shadow-[0_0_8px_rgba(96,165,250,0.8)] dark:shadow-[0_0_8px_rgba(93,166,252,0.8)]"></div>
            <div class="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-400 dark:to-slate-500"></div>
          </div>

          <h1
            :key="`title-${locale}`"
            class="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight transition-all duration-500 lang-swap leading-tight drop-shadow-sm"
          >
            {{ t('auth.resetTitle') }}
          </h1>
          <p
            :key="`subtitle-${locale}`"
            class="text-slate-500 dark:text-slate-400 font-mono text-[10px] md:text-[11px] leading-relaxed transition-all duration-500 max-w-[280px] mx-auto lang-swap tracking-[0.1em]"
            style="text-wrap: balance;"
          >
            <span class="text-[#60a5fa] dark:text-[#5da6fc] font-bold mr-1">//</span> {{ t('auth.resetSubtitle') }}
          </p>
        </div>

        <form @submit.prevent="restablecerClave" class="space-y-6 relative z-10 w-full">
          
          <!-- Email Field -->
          <div class="space-y-3 group/field relative transition-all duration-500">
            <label class="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 group-focus-within/field:text-[#60a5fa] dark:group-focus-within/field:text-[#5da6fc] transition-colors flex items-center gap-2 ml-1">
              <span :key="`emailLabel-${locale}`" class="inline-block lang-swap">{{ t('auth.recoverEmailLabel') }}</span>
            </label>
            <div class="relative flex items-center transition-all duration-300 ease-in-out rounded-[14px] bg-slate-100 dark:bg-[#16191E] border border-slate-200 dark:border-transparent group-focus-within/field:bg-white dark:group-focus-within/field:bg-[#1A1D24] group-focus-within/field:border-[#60a5fa]/40 dark:group-focus-within/field:border-[#5da6fc]/30 group-focus-within/field:ring-4 group-focus-within/field:ring-[#60a5fa]/10 dark:group-focus-within/field:ring-[#5da6fc]/10 hover:border-slate-300 dark:hover:border-slate-700/30">
              <div class="pl-5 pr-4 py-4 flex items-center justify-center transition-all duration-300 text-slate-400 dark:text-slate-500 group-focus-within/field:text-[#60a5fa] dark:group-focus-within/field:text-[#5da6fc]">
                <IconMail :size="18" stroke-width="1.5" />
              </div>
              <div class="h-6 w-[1px] bg-slate-300 dark:bg-white/5"></div>
              <input
                v-model="correo"
                class="w-full h-[52px] px-4 bg-transparent text-slate-700 dark:text-white font-mono text-[14px] font-bold tracking-wide outline-none transition-colors duration-300 ease-out placeholder:text-slate-400/80 dark:placeholder:text-slate-600"
                :placeholder="t('auth.recoverEmailPlaceholder')" type="email"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="space-y-3 group/field relative transition-all duration-500">
            <label class="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 group-focus-within/field:text-[#60a5fa] dark:group-focus-within/field:text-[#5da6fc] transition-colors flex items-center gap-2 ml-1">
              <span :key="`passLabel-${locale}`" class="inline-block lang-swap">{{ t('auth.resetPasswordLabel') }}</span>
            </label>
            <div class="relative flex items-center transition-all duration-300 ease-in-out rounded-[14px] bg-slate-100 dark:bg-[#16191E] border border-slate-200 dark:border-transparent group-focus-within/field:bg-white dark:group-focus-within/field:bg-[#1A1D24] group-focus-within/field:border-[#60a5fa]/40 dark:group-focus-within/field:border-[#5da6fc]/30 group-focus-within/field:ring-4 group-focus-within/field:ring-[#60a5fa]/10 dark:group-focus-within/field:ring-[#5da6fc]/10 hover:border-slate-300 dark:hover:border-slate-700/30">
              <div class="pl-5 pr-4 py-4 flex items-center justify-center transition-all duration-300 text-slate-400 dark:text-slate-500 group-focus-within/field:text-[#60a5fa] dark:group-focus-within/field:text-[#5da6fc]">
                <IconLock :size="18" stroke-width="1.5" />
              </div>
              <div class="h-6 w-[1px] bg-slate-300 dark:bg-white/5"></div>
              <input
                v-model="nuevaClave"
                :type="mostrarContrasena ? 'text' : 'password'"
                class="w-full h-[52px] px-4 bg-transparent text-slate-700 dark:text-white font-mono text-[14px] font-bold tracking-[0.25em] outline-none transition-colors duration-300 ease-out placeholder:text-slate-400/80 dark:placeholder:text-slate-600"
                :placeholder="mostrarContrasena ? t('auth.resetPasswordPlaceholder') : '••••••••'"
              />
              <button type="button" @click="alternarContrasena"
                class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#60a5fa] dark:hover:text-[#5da6fc] hover:bg-[#60a5fa]/10 dark:hover:bg-[#5da6fc]/10 rounded-xl transition-all"
              >
                <IconEyeOff v-if="mostrarContrasena" :size="18" stroke-width="1.5" />
                <IconEye v-else :size="18" stroke-width="1.5" />
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-8">
            <button
              type="submit" :disabled="cargando"
              class="w-full h-[52px] rounded-[14px] bg-[#60a5fa] hover:bg-[#3b82f6] dark:bg-[#5da6fc] dark:hover:bg-[#3b82f6] font-mono font-bold text-white text-[13px] tracking-[0.15em] uppercase flex items-center justify-center gap-3 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              <span v-if="cargando" class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                <span :key="`procesando-${locale}`" class="inline-block lang-swap">{{ t('auth.recoverProcessing') }}</span>
              </span>
              <span v-else class="flex items-center gap-3">
                <span :key="`submit-${locale}`" class="inline-block lang-swap">{{ t('auth.resetSubmit') }}</span>
                <IconDeviceFloppy :size="18" stroke-width="2.5" />
              </span>
            </button>
          </div>

          <!-- Alert Messages -->
          <div class="mt-4 relative w-full min-h-[48px]">
            <Transition name="hud-alert">
              <div v-if="errorMensaje || exitoMensaje"
                 :class="[
                   'w-full flex items-center justify-center text-[11px] font-mono font-bold tracking-[0.1em] gap-2 uppercase py-3.5 px-4 rounded-[14px] border transition-all duration-500 absolute',
                   errorMensaje
                     ? 'bg-red-50 dark:bg-[#2A1616] border-red-200 dark:border-[#4A2424] text-red-500 dark:text-[#FF6B6B]'
                     : 'bg-green-50 dark:bg-[#162A1F] border-green-200 dark:border-[#244A32] text-green-600 dark:text-[#4ADE80]'
                 ]"
              >
                <IconAlertTriangle v-if="errorMensaje" :size="16" />
                <IconCircleCheck v-else :size="16" />
                <span class="truncate">{{ errorMensaje || exitoMensaje }}</span>
              </div>
            </Transition>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

:global(.grecaptcha-badge) {
  bottom: 24px !important;
  right: -186px !important;
  z-index: 60;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
  filter: drop-shadow(0 4px 15px rgba(0,0,0,0.4));
  opacity: 0.6;
}

:global(.grecaptcha-badge:hover) {
  right: 0px !important;
  opacity: 1;
}

.hud-alert-enter-active {
  animation: hudAlertEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
}

.hud-alert-leave-active {
  animation: hudAlertLeave 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards;
}

@keyframes hudAlertEnter {
  0% { opacity: 0; transform: translateY(10px) scale(0.95); filter: blur(4px); }
  50% { opacity: 0.8; transform: translateY(-2px) scale(1.02); filter: blur(1px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes hudAlertLeave {
  0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.95); filter: blur(4px); }
}

@keyframes fadeSlideRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fade-slide-right {
  animation: fadeSlideRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.lang-swap {
  animation: langSwap 0.35s ease both;
}

@keyframes langSwap {
  0% { opacity: 0; transform: translateY(6px) scale(0.98); filter: blur(2px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
</style>


