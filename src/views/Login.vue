<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../stores/theme.store'
import { storeToRefs } from 'pinia'
import { CookieAuth } from '../utils/cookie-auth'
import { useFormValidator } from '../composables/useFormValidator'
import { loginSchema } from '../schemas/auth.schema'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import logoImg from '../assets/logo.png'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Sun01Icon,
  Moon01Icon,
  Mail01Icon,
  LockPasswordIcon,
  ViewIcon,
  ViewOffSlashIcon,
  Alert01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import bannerImg from '../assets/Banner_principal_V2.d1597e1e.svg'

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const router = useRouter()
const correo = ref('global_1@mail.com')
const contrasena = ref('123456')
const mostrarContrasena = ref(false)
const errorVisible = ref(false)
const errorMensaje = ref('')
const exitoMensaje = ref('')
const cargando = ref(false)
const { t, locale } = useI18n()
const lang = computed(() => locale.value)

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const { toggle } = themeStore

const recaptchaSiteKey = '6LcHvXMsAAAAAOeJeKmkj1zjpiWsOu__Po8Pu2lK'
const recaptchaReady = ref(false)

const alternarContrasena = () => {
  mostrarContrasena.value = !mostrarContrasena.value
}

const setLocale = (value: 'es' | 'en') => {
  locale.value = value
  localStorage.setItem('app-locale', value)
}

const cargarRecaptcha = () => {
  if (document.querySelector(`script[src*="recaptcha/api.js"]`)) return
  const script = document.createElement('script')
  script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`
  script.async = true
  script.defer = true
  script.onload = () => { recaptchaReady.value = true }
  document.head.appendChild(script)
}

const obtenerTokenRecaptcha = async () => {
  if (!window.grecaptcha) throw new Error('reCAPTCHA no está disponible.')
  return await window.grecaptcha.execute(recaptchaSiteKey, { action: 'login' })
}

const { validate, getFirstError, resetErrors } = useFormValidator(loginSchema)

const iniciarSesion = async () => {
  resetErrors('login-form')
  if (!validate({ email: correo.value, password: contrasena.value }, 'login-form')) {
    errorMensaje.value = getFirstError('login-form') || ''
    errorVisible.value = true
    setTimeout(() => { errorVisible.value = false }, 3000)
    return
  }
  cargando.value = true
  errorMensaje.value = ''
  try {
    if (!recaptchaReady.value) throw new Error(t('errors.recaptchaNotReady'))
    const gcToken = await obtenerTokenRecaptcha()
    const respuesta = await fetch('/api/v1/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo.value, password: contrasena.value, lang: lang.value, gcToken })
    })
    if (!respuesta.ok) {
      const errorData = await respuesta.json().catch(() => null)
      throw new Error(errorData?.message || t('errors.loginFailed'))
    }
    const data = await respuesta.json()
    if (data?.data?.token) CookieAuth.setToken(data.data.token)
    if (data?.data?.grupo) localStorage.setItem('auth-grupo', data.data.grupo)
    if (typeof data?.data?.id_grupo === 'string' && data.data.id_grupo.trim().length === 8) {
      const idGrupo = data.data.id_grupo.trim()
      localStorage.setItem('auth-grupo-id', idGrupo)
      localStorage.setItem('auth-grupo-obj', JSON.stringify({
        id: idGrupo,
        nombre: data?.data?.grupo || ''
      }))
    }
    router.push('/dashboard')
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al iniciar sesión.'
    errorMensaje.value = mensaje.toLowerCase().includes('invalid credentials')
      ? t('errors.invalidCredentials')
      : mensaje
  } finally {
    cargando.value = false
  }
}

const mostrarBadgeRecaptcha = (visible: boolean) => {
  const badge = document.querySelector('.grecaptcha-badge') as HTMLElement | null
  if (badge) {
    badge.style.visibility = visible ? 'visible' : 'hidden'
    badge.style.setProperty('right', '0', 'important')
    badge.style.setProperty('left', 'auto', 'important')
  }
}

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
  
  // Subtle 3D tilt based on mouse position
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
  cargarRecaptcha()
  if (window.grecaptcha) recaptchaReady.value = true
  setTimeout(() => mostrarBadgeRecaptcha(true), 500)
})

onUnmounted(() => { mostrarBadgeRecaptcha(false) })
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0B0D11] text-slate-800 dark:text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
    
    <!-- Background Decorators matching image aesthetics -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Dark/light subtle grid -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <!-- Center ambient glow behind form -->
      <div class="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>



    <!-- Main Content Grid -->
    <div class="relative z-10 w-full px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-20 items-center animate-fade-in mt-12 lg:mt-0">
      
      <!-- Left Column: Login Form (Centered in its space) -->
      <div class="w-full max-w-[480px] mx-auto flex flex-col items-center relative" style="perspective: 1500px;">
        
        <!-- Huge Background Number/Text mimicking "24/7" from image -->
        <div 
          class="absolute -top-16 lg:-top-24 left-1/2 -translate-x-1/2 text-[10rem] md:text-[14rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-300/80 to-transparent dark:from-white/[0.04] dark:to-transparent tracking-tighter select-none pointer-events-none z-0 leading-none transition-transform duration-500 ease-out will-change-transform"
          :style="{ transform: `translateX(calc(-50% + ${-rotateY * 1.5}px)) translateY(${-rotateX * 1.5}px)` }"
        >
          LOGIN
        </div>

        <!-- Typography Header -->
        <div class="text-center relative mb-8 w-full flex flex-col items-center z-10 pt-16 md:pt-20 lg:pt-0">
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
            <span class="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] dark:from-[#5da6fc] dark:to-[#93c5fd] bg-clip-text text-transparent uppercase drop-shadow-sm">{{ t('login.title') }}</span>
          </h1>
          <p class="text-slate-500 dark:text-slate-400 font-medium text-[13px] md:text-[15px] max-w-[400px] mt-2">
            {{ t('login.subtitle') }}
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


          <form @submit.prevent="iniciarSesion" class="space-y-6 relative z-10">
            
            <!-- Email Field -->
            <div class="space-y-2">
              <label class="text-[13px] font-bold text-slate-700 dark:text-slate-200 ml-1 block">{{ t('login.userLabel') }}</label>
              <div class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-[16px] overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-2 focus-within:ring-[#3b82f6]/20 dark:focus-within:ring-[#5da6fc]/20 transition-all duration-500 ease-out shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
                <div class="pl-4 pr-3 flex items-center text-slate-400 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors duration-500">
                  <HugeiconsIcon :icon="Mail01Icon" class="text-[18px] group-focus-within/input:scale-110 group-focus-within/input:-translate-y-[1px] transition-transform duration-500 ease-out" />
                </div>
                <InputText
                  v-model="correo"
                  unstyled
                  class="w-full h-[54px] bg-transparent text-slate-700 dark:text-white font-medium text-[14px] outline-none placeholder:text-slate-400/70 shadow-none border-none focus:ring-0"
                  :placeholder="t('login.userPlaceholder')" type="email"
                />
              </div>
            </div>

            <!-- Password Field -->
            <div class="space-y-2">
              <label class="text-[13px] font-bold text-slate-700 dark:text-slate-200 ml-1 block">{{ t('login.passwordLabel') }}</label>
              <div class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-[16px] overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-2 focus-within:ring-[#3b82f6]/20 dark:focus-within:ring-[#5da6fc]/20 transition-all duration-500 ease-out shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
                <div class="pl-4 pr-3 flex items-center text-slate-400 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors duration-500">
                  <HugeiconsIcon :icon="LockPasswordIcon" class="text-[18px] group-focus-within/input:scale-110 group-focus-within/input:-translate-y-[1px] transition-transform duration-500 ease-out" />
                </div>
                <InputText
                  v-model="contrasena"
                  :type="mostrarContrasena ? 'text' : 'password'"
                  unstyled
                  class="w-full h-[54px] bg-transparent text-slate-700 dark:text-white font-medium text-[14px] tracking-widest outline-none placeholder:text-slate-400/70 placeholder:tracking-normal shadow-none border-none focus:ring-0"
                  :placeholder="mostrarContrasena ? t('login.passwordPlaceholder') : '••••••••'"
                />
                <button type="button" @click="alternarContrasena" class="absolute right-4 text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-300 hover:scale-110 active:scale-90">
                  <HugeiconsIcon v-if="mostrarContrasena" :icon="ViewOffSlashIcon" class="text-[18px]" />
                  <HugeiconsIcon v-else :icon="ViewIcon" class="text-[18px]" />
                </button>
              </div>
              
              <div class="flex justify-end mt-2 pt-1">
                <router-link to="/login/recuperar" class="text-[12px] font-bold text-[#3b82f6] dark:text-[#5da6fc] hover:text-[#2563eb] dark:hover:text-[#93c5fd] transition-all duration-300 hover:translate-x-1 inline-block">
                  {{ t('login.forgotPassword') }}
                </router-link>
              </div>
            </div>

            <!-- Alert Messages -->
            <Transition name="hud-alert">
              <div v-if="errorVisible || errorMensaje || exitoMensaje"
                 :class="[
                   'w-full flex items-center justify-center text-[12px] font-bold tracking-wide gap-2 py-3 px-4 rounded-[12px] border transition-all duration-500',
                   errorVisible || errorMensaje
                     ? 'bg-red-50 dark:bg-[#2A1616] border-red-200 dark:border-[#4A2424] text-red-500 dark:text-[#FF6B6B]'
                     : 'bg-green-50 dark:bg-[#162A1F] border-green-200 dark:border-[#244A32] text-green-600 dark:text-[#4ADE80]'
                 ]"
              >
                <HugeiconsIcon v-if="errorVisible" :icon="Alert01Icon" class="text-[16px]" />
                <HugeiconsIcon v-else-if="errorMensaje" :icon="CancelCircleIcon" class="text-[16px]" />
                <HugeiconsIcon v-else-if="exitoMensaje" :icon="CheckmarkCircle01Icon" class="text-[16px]" />
                <span class="truncate">{{ errorVisible ? t('errors.missingFields') : (errorMensaje || exitoMensaje) }}</span>
              </div>
            </Transition>

            <!-- Submit Button -->
            <div class="pt-4">
              <Button
                type="submit" :disabled="cargando"
                unstyled
                :pt="{
                  root: { class: 'w-full h-[56px] rounded-[16px] bg-[#3b82f6] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all duration-500 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] hover:shadow-[0_6px_0_#2563eb,0_12px_25px_rgba(59,130,246,0.5)] dark:hover:shadow-[0_6px_0_#1d4ed8,0_12px_25px_rgba(93,166,252,0.3)] hover:-translate-y-[2px] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)]' }
                }"
              >
                <span v-if="cargando" class="flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  <span>{{ t('login.validating') }}</span>
                </span>
                <span v-else>
                  {{ t('login.submit') }}
                </span>
              </Button>
            </div>

          </form>

          <!-- Settings: Language & Theme -->
          <div class="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5 flex flex-col items-center gap-4 relative z-10">
            <div class="flex items-center gap-1 bg-slate-100/50 dark:bg-[#0F1115] p-1 rounded-full border border-slate-200/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
              <button
                type="button"
                @click="setLocale('es')"
                class="flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-500 ease-in-out active:scale-95"
                :class="locale === 'es' ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] dark:text-[#5da6fc] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-200/50 dark:border-white/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:bg-slate-200/30 dark:hover:bg-white/5'"
              >
                <img src="https://flagcdn.com/co.svg" alt="Colombia" class="w-4 h-auto rounded-[2px] transition-all duration-500" :class="locale !== 'es' && 'opacity-40 saturate-0'" />
                <span>Español</span>
              </button>
              <button
                type="button"
                @click="setLocale('en')"
                class="flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-500 ease-in-out active:scale-95"
                :class="locale === 'en' ? 'bg-white dark:bg-[#1A1D24] text-[#3b82f6] dark:text-[#5da6fc] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-200/50 dark:border-white/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:bg-slate-200/30 dark:hover:bg-white/5'"
              >
                <img src="https://flagcdn.com/us.svg" alt="United States" class="w-4 h-auto rounded-[2px] transition-all duration-500" :class="locale !== 'en' && 'opacity-40 saturate-0'" />
                <span>English</span>
              </button>
            </div>

            <!-- Theme Selector -->
            <div class="flex items-center gap-1 bg-slate-100/50 dark:bg-[#0F1115] p-1 rounded-full border border-slate-200/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]">
              <button
                @click="toggle"
                type="button"
                class="flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[12px] font-bold transition-all duration-500 ease-in-out text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent hover:bg-slate-200/30 dark:hover:bg-white/5 active:scale-95"
              >
                <Transition name="theme-icon" mode="out-in">
                  <HugeiconsIcon v-if="isDark" :key="'sun'" :icon="Sun01Icon" class="text-[16px]" />
                  <HugeiconsIcon v-else :key="'moon'" :icon="Moon01Icon" class="text-[16px]" />
                </Transition>
                <span>{{ isDark ? 'Modo Claro' : 'Modo Oscuro' }}</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Copyright Footer -->
        <div class="mt-8 mb-4 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
          Copyright © 2025 InnovixIng. All Rights Reserved.
        </div>
      </div>

      <!-- Right Column: Banner Image (More 3D) -->
      <div 
        class="hidden lg:flex w-full h-full min-h-[600px] justify-start items-center relative group"
        style="perspective: 2000px;"
      >
        <!-- Dynamic Ambient Glow behind image -->
        <div 
          class="absolute -inset-10 bg-[#3b82f6]/15 dark:bg-[#5da6fc]/10 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out pointer-events-none"
          :style="{ transform: `translateX(${bannerRotateY * 2}px) translateY(${bannerRotateX * 2}px)` }"
        ></div>
        
        <div 
          ref="bannerCardRef"
          @mousemove="handleBannerMouseMove"
          @mouseleave="handleBannerMouseLeave"
          class="relative w-full h-full max-h-[850px] rounded-[56px] overflow-hidden border border-white/20 dark:border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out bg-[#0F1115] will-change-transform"
          :style="{ transform: `rotateX(${bannerRotateX}deg) rotateY(${bannerRotateY}deg)` }"
        >
          <img 
            :src="bannerImg" alt="Innovix Banner" 
            class="w-full h-full object-cover object-[100%] transition-transform duration-700 group-hover:scale-320" 
            :style="{ transform: `translateZ(20px)` }"
          />
          
          <!-- Intense Dynamic Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 pointer-events-none"></div>
          
          <!-- Glassmorphism Reflection effect -->
          <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

/* reCAPTCHA badge positioning and animation */
:global(.grecaptcha-badge) {
  width: 70px !important;
  overflow: hidden !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  right: 0 !important;
  bottom: 16px !important;
  z-index: 999999 !important;
  border-radius: 8px 0 0 8px !important;
  box-shadow: 0 4px 15px rgba(0,0,0,0.15) !important;
}

:global(.grecaptcha-badge:hover) {
  width: 256px !important;
}

/* Theme icon swap animation */
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.theme-icon-enter-from { opacity: 0; transform: rotate(-45deg) scale(0.6); }
.theme-icon-leave-to  { opacity: 0; transform: rotate(45deg) scale(0.6); }

/* HUD alert animation */
.hud-alert-enter-active {
  animation: hudAlertEnter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
}
.hud-alert-leave-active {
  animation: hudAlertLeave 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards;
}

@keyframes hudAlertEnter {
  0%   { opacity: 0; transform: translateY(10px) scale(0.95); filter: blur(4px); }
  50%  { opacity: 0.8; transform: translateY(-2px) scale(1.02); filter: blur(1px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes hudAlertLeave {
  0%   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.95); filter: blur(4px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}
.animate-logo-float {
  animation: logoFloat 4s ease-in-out infinite;
}
</style>


