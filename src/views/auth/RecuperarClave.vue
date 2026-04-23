<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  Mail01Icon,
  Alert01Icon,
  CheckmarkCircle01Icon,
  SentIcon
} from '@hugeicons/core-free-icons'
import logoImg from '../../assets/logo.png'

const router = useRouter()
const { t, locale } = useI18n()
const lang = computed(() => locale.value)
useTheme() // Ensures dark class is reactive on html element

const correo = ref('')
const cargando = ref(false)
const exitoMensaje = ref('')
const errorMensaje = ref('')
const urlRecuperacion = ref('')

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
  return await window.grecaptcha.execute(recaptchaSiteKey, { action: 'recover_pass' })
}

const recuperarClave = async () => {
  if (!correo.value) {
    errorMensaje.value = t('auth.missingEmail')
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

    const respuesta = await fetch('/api/v1/recover_pass/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: correo.value,
        gcToken,
        lang: lang.value
      })
    })

    const data = await respuesta.json()

    if (!respuesta.ok || !data.done) {
      throw new Error(data.message || t('auth.recoverError'))
    }

    exitoMensaje.value = data.message || t('auth.recoverSuccess')
    
    if (data.data && data.data.url) {
      const urlObj = new URL(data.data.url)
      const token = urlObj.searchParams.get('token')
      if (token) {
        urlRecuperacion.value = `${window.location.origin}/recover_pass/?token=${token}`
      }
    }
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
    badge.style.setProperty('left', '4px', 'important')
    badge.style.setProperty('right', 'auto', 'important')
    badge.style.setProperty('bottom', '16px', 'important')
    badge.style.setProperty('z-index', '999999', 'important')
  }
}

const moverBadgeIzquierda = () => {
  const badge = document.querySelector('.grecaptcha-badge') as HTMLElement | null
  if (badge) {
    badge.style.setProperty('left', '4px', 'important')
    badge.style.setProperty('right', 'auto', 'important')
    badge.style.setProperty('bottom', '16px', 'important')
    badge.style.setProperty('z-index', '999999', 'important')
  }
}

onMounted(() => {
  cargarRecaptcha()
  if (window.grecaptcha) {
    recaptchaReady.value = true
  }
  setTimeout(() => mostrarBadgeRecaptcha(true), 500)
  setTimeout(moverBadgeIzquierda, 1000)
  setTimeout(moverBadgeIzquierda, 2000)
  setTimeout(moverBadgeIzquierda, 3000)
})

onUnmounted(() => {
  mostrarBadgeRecaptcha(false)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0B0D11] text-slate-800 dark:text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
    
    <!-- Background Decorators -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Dark/light subtle grid -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <!-- Center ambient glow behind form -->
      <div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>

    <!-- Main Content -->
    <div class="relative z-10 w-full max-w-[480px] flex flex-col items-center px-4 animate-fade-in mt-8 md:mt-0">
      
      <!-- Typography Header -->
      <div class="text-center relative mb-8 w-full flex flex-col items-center z-10 pt-10">
        <!-- Logo -->
        <div class="mb-6">
          <div
            class="w-40 h-12 bg-slate-800 dark:bg-white transition-all duration-500"
            :style="{
              WebkitMaskImage: `url(${logoImg})`, maskImage: `url(${logoImg})`,
              WebkitMaskSize: 'contain', maskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center', maskPosition: 'center'
            }"
          ></div>
        </div>

        <h1 class="text-3xl md:text-4xl lg:text-5xl font-black mb-3 tracking-tight flex flex-col gap-1 leading-tight">
          <span class="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] dark:from-[#5da6fc] dark:to-[#93c5fd] bg-clip-text text-transparent uppercase drop-shadow-sm">{{ t('auth.recoverTitle') }}</span>
        </h1>
        <p class="text-slate-500 dark:text-slate-400 font-medium text-[13px] md:text-[15px] max-w-[400px] mt-2">
          {{ t('auth.recoverSubtitle') }}
        </p>
      </div>

      <!-- Form Container -->
      <div class="w-full bg-white/70 dark:bg-[#15171C]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/5 p-6 md:p-8 rounded-[24px] shadow-2xl dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative z-10">
        
        <button 
          @click="router.push('/login')" 
          class="absolute -top-12 left-2 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors p-2 flex items-center gap-1 group font-bold"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" class="text-[20px] group-hover:-translate-x-1 transition-transform" />
          <span class="text-[12px] tracking-widest uppercase">{{ t('common.back') }}</span>
        </button>

        <form @submit.prevent="recuperarClave" class="space-y-6">
          
          <!-- Email Field -->
          <div class="space-y-2">
            <label class="text-[13px] font-bold text-slate-700 dark:text-slate-200 ml-1 block">{{ t('auth.recoverEmailLabel') }}</label>
            <div class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-[16px] overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6] dark:focus-within:ring-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
              <div class="pl-4 pr-3 flex items-center text-slate-400 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors duration-300">
                <HugeiconsIcon :icon="Mail01Icon" class="text-[18px] group-focus-within/input:scale-110 group-focus-within/input:-translate-y-[1px] transition-transform duration-300 ease-out" />
              </div>
              <input
                v-model="correo"
                class="w-full h-[54px] bg-transparent text-slate-700 dark:text-white font-medium text-[14px] outline-none placeholder:text-slate-400/70 shadow-none border-none focus:ring-0"
                :placeholder="t('auth.recoverEmailPlaceholder')" type="email"
              />
            </div>
          </div>

          <!-- Alert Messages -->
          <Transition name="hud-alert">
            <div v-if="errorMensaje || exitoMensaje"
               :class="[
                 'w-full flex items-center justify-center text-[12px] font-bold tracking-wide gap-2 py-3 px-4 rounded-[12px] border transition-all duration-500',
                 errorMensaje
                   ? 'bg-red-50 dark:bg-[#2A1616] border-red-200 dark:border-[#4A2424] text-red-500 dark:text-[#FF6B6B]'
                   : 'bg-green-50 dark:bg-[#162A1F] border-green-200 dark:border-[#244A32] text-green-600 dark:text-[#4ADE80]'
               ]"
            >
              <HugeiconsIcon v-if="errorMensaje" :icon="Alert01Icon" class="text-[16px]" />
              <HugeiconsIcon v-else :icon="CheckmarkCircle01Icon" class="text-[16px]" />
              <span class="truncate">{{ errorMensaje || exitoMensaje }}</span>
            </div>
          </Transition>

          <!-- Submit Button -->
          <div class="pt-4">
            <button
              type="submit" :disabled="cargando"
              class="w-full h-[56px] rounded-[16px] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)]"
            >
              <span v-if="cargando" class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                <span>{{ t('auth.recoverProcessing') }}</span>
              </span>
              <span v-else class="flex items-center gap-2">
                <span>{{ t('auth.recoverSubmit') }}</span>
                <HugeiconsIcon :icon="SentIcon" class="text-[18px]" />
              </span>
            </button>
          </div>

          <!-- Test Link (dev only) -->
          <Transition name="hud-alert">
            <div v-if="exitoMensaje && urlRecuperacion" class="mt-4">
              <a :href="urlRecuperacion" target="_blank" class="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 p-3 rounded-[12px] hover:border-[#3b82f6]/40 dark:hover:border-[#5da6fc]/40 break-all transition-all shadow-sm block text-center">
                <span class="text-[#3b82f6] dark:text-[#5da6fc]">></span> {{ t('auth.testLink') }}: <span class="opacity-60">{{ urlRecuperacion }}</span>
              </a>
            </div>
          </Transition>

        </form>
      </div>

      <!-- Copyright Footer -->
      <div class="mt-8 mb-4 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
        Copyright © 2026 InnovixIng. All Rights Reserved.
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

:global(.grecaptcha-badge) {
  width: 70px !important;
  overflow: hidden !important;
  transition: all 0.3s ease !important;
  left: 4px !important;
  right: auto !important;
  bottom: 16px !important;
  z-index: 999999 !important;
  border-radius: 8px !important;
}

:global(.grecaptcha-badge:hover) {
  width: 256px !important;
  overflow: visible !important;
}

:global(.grecaptcha-badge.grecaptcha-badge:hover) {
  width: 256px !important;
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

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}
</style>


