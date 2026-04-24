<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../../stores/theme.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  Mail01Icon,
  Alert01Icon,
  CheckmarkCircle01Icon,
  SentIcon,
  Sun01Icon,
  Moon01Icon
} from '@hugeicons/core-free-icons'
import logoImg from '../../assets/logo.png'
import bannerImg from '../../assets/Banner_principal_V2.d1597e1e.svg'

const router = useRouter()
const { t, locale } = useI18n()
const lang = computed(() => locale.value)
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const { toggle } = themeStore

const correo = ref('')
const cargando = ref(false)
const exitoMensaje = ref('')
const errorMensaje = ref('')
const urlRecuperacion = ref('')


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
    const respuesta = await fetch('/api/v1/recover_pass/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: correo.value,
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

// 3D Tilt Logic
const cardRef = ref<HTMLElement | null>(null)
const rotateX = ref(0)
const rotateY = ref(0)

const bannerCardRef = ref<HTMLElement | null>(null)
const bannerRotateX = ref(0)
const bannerRotateY = ref(0)

const handleMouseMove = (e: MouseEvent) => {
  if (!cardRef.value) return
  const card = cardRef.value
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  rotateX.value = -((y - centerY) / 40)
  rotateY.value = (x - centerX) / 40
}

const handleMouseLeave = () => {
  rotateX.value = 0
  rotateY.value = 0
}

const handleBannerMouseMove = (e: MouseEvent) => {
  if (!bannerCardRef.value) return
  const card = bannerCardRef.value
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  bannerRotateX.value = -((y - centerY) / 35)
  bannerRotateY.value = (x - centerX) / 35
}

const handleBannerMouseLeave = () => {
  bannerRotateX.value = 0
  bannerRotateY.value = 0
}


onMounted(() => {
})

onUnmounted(() => {
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0B0D11] text-slate-800 dark:text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
    
    <!-- Background Decorators -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Dark/light subtle grid -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <!-- Center ambient glow -->
      <div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>

    <!-- Top-right Controls: Theme Toggle -->
    <div class="fixed top-6 right-6 md:top-10 md:right-10 flex items-center z-50">
      <button
        @click="toggle"
        type="button"
        class="w-10 h-10 flex items-center justify-center rounded-[12px] border transition-all duration-500 ease-in-out bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:border-[#3b82f6]/40 dark:hover:border-[#5da6fc]/30 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
      >
        <Transition name="theme-icon" mode="out-in">
          <HugeiconsIcon v-if="isDark" :key="'sun'" :icon="Sun01Icon" class="text-[18px]" />
          <HugeiconsIcon v-else :key="'moon'" :icon="Moon01Icon" class="text-[18px]" />
        </Transition>
      </button>
    </div>

    <!-- Main Content -->
    <div class="relative z-10 w-full max-w-[480px] flex flex-col items-center px-4 animate-fade-in mt-12 md:mt-0" style="perspective: 1500px;">
      
      <!-- Huge Background Number/Text mimicking "24/7" from image -->
      <div 
        class="absolute -top-16 left-1/2 -translate-x-1/2 text-[10rem] md:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-200/40 to-transparent dark:from-white/[0.04] dark:to-transparent tracking-tighter select-none pointer-events-none z-0 leading-none transition-transform duration-500 ease-out will-change-transform"
        :style="{ transform: `translateX(calc(-50% + ${-rotateY * 1.5}px)) translateY(${-rotateX * 1.5}px)` }"
      >
        AUTH
      </div>

      <!-- Typography Header -->
      <div class="text-center relative mb-8 w-full flex flex-col items-center z-10 pt-16 md:pt-20">
        <!-- Logo -->
        <div class="mb-6 animate-logo-float">
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
      <div 
        ref="cardRef"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
        class="w-full bg-white/80 dark:bg-[#15171C]/85 backdrop-blur-lg border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative z-10 transition-transform duration-500 ease-out overflow-hidden group will-change-transform"
        :style="{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }"
      >
        
        <button 
          @click="router.push('/login')" 
          class="absolute -top-12 left-2 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors p-2 flex items-center gap-1 group font-bold z-20"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" class="text-[20px] group-hover:-translate-x-1 transition-transform" />
          <span class="text-[12px] tracking-widest uppercase">{{ t('common.back') }}</span>
        </button>

        <form @submit.prevent="recuperarClave" class="space-y-6 relative z-10">
          
          <!-- Email Field -->
          <div class="space-y-2">
            <label class="text-[13px] font-bold text-slate-700 dark:text-slate-200 ml-1 block">{{ t('auth.recoverEmailLabel') }}</label>
            <div class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-[16px] overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-2 focus-within:ring-[#3b82f6]/20 dark:focus-within:ring-[#5da6fc]/20 transition-all duration-500 ease-out shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
              <div class="pl-4 pr-3 flex items-center text-slate-400 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors duration-500">
                <HugeiconsIcon :icon="Mail01Icon" class="text-[18px] group-focus-within/input:scale-110 group-focus-within/input:-translate-y-[1px] transition-transform duration-500 ease-out" />
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
              class="w-full h-[56px] rounded-[16px] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-500 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] hover:shadow-[0_6px_0_#2563eb,0_12px_25px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_6px_0_#1d4ed8,0_12px_25px_rgba(93,166,252,0.3)] hover:-translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)]"
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

        <!-- Back to Login Link -->
        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
          <p class="text-slate-500 dark:text-slate-400 text-[13px]">
            {{ t('auth.rememberPassword') }}
            <button 
              @click="router.push('/login')"
              class="text-[#3b82f6] dark:text-[#5da6fc] font-bold hover:underline ml-1 transition-all"
            >
              {{ t('auth.backToLogin') }}
            </button>
          </p>
        </div>
      </div>

      <!-- Copyright Footer -->
      <div class="mt-8 mb-4 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
        Copyright © 2025 InnovixIng. All Rights Reserved.
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}


/* Theme icon swap animation */
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.theme-icon-enter-from { opacity: 0; transform: rotate(-45deg) scale(0.6); }
.theme-icon-leave-to  { opacity: 0; transform: rotate(45deg) scale(0.6); }

@keyframes logoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
.animate-logo-float {
  animation: logoFloat 4s ease-in-out infinite;
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


