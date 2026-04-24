<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore } from '../stores/theme.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  Sun01Icon,
  Moon01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'

const router = useRouter()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0B0D11] text-slate-800 dark:text-slate-200 font-sans flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
    
    <!-- Decoradores de Fondo -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <!-- Grid sutil -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <!-- Resplandor central -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
    </div>

    <!-- Toggle de Tema -->
    <div class="fixed top-6 right-6 md:top-10 md:right-10 flex items-center z-50">
      <button
        @click="themeStore.toggle()"
        type="button"
        class="w-10 h-10 flex items-center justify-center rounded-xl border transition-all duration-500 ease-in-out bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:border-[#3b82f6]/40 dark:hover:border-[#5da6fc]/30 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
      >
        <HugeiconsIcon :icon="isDark ? Sun01Icon : Moon01Icon" class="text-[18px]" />
      </button>
    </div>

    <!-- Contenido Principal -->
    <div class="relative z-10 w-full px-6 flex flex-col items-center animate-fade-in">
      
      <!-- Contenedor Glassmorphic -->
      <div class="w-full max-w-[500px] bg-white/70 dark:bg-[#0F1115]/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/5 shadow-[10px_0_40px_rgba(0,0,0,0.02)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.2)] p-10 md:p-14 rounded-3xl flex flex-col items-center text-center">
        
        <!-- Ícono flotante -->
        <div class="mb-6 animate-logo-float">
          <div class="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
            <HugeiconsIcon :icon="Search01Icon" :size="36" class="text-[#3b82f6] dark:text-[#5da6fc]" />
          </div>
        </div>

        <!-- 404 Texto Gigante -->
        <h1 class="text-7xl md:text-8xl font-black mb-2 tracking-tighter">
          <span class="bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] dark:from-[#5da6fc] dark:to-[#93c5fd] bg-clip-text text-transparent drop-shadow-sm">404</span>
        </h1>
        
        <!-- Título y Subtítulo -->
        <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-3">
          Página no encontrada
        </h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium mb-10 max-w-[320px] mx-auto leading-relaxed">
          Parece que te has perdido. La página que estás buscando no existe, ha sido movida o no tienes permisos para verla.
        </p>

        <!-- Botón Físico 3D -->
        <button
          @click="router.push('/')"
          class="w-full relative group flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-4 text-sm font-bold text-white transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)]"
        >
          <HugeiconsIcon :icon="ArrowLeft01Icon" :size="18" :stroke-width="2.5" class="group-hover:-translate-x-1 transition-transform" />
          <span>Volver al inicio</span>
        </button>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
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
  50% { transform: translateY(-8px); }
}

.animate-logo-float {
  animation: logoFloat 4s ease-in-out infinite;
}
</style>
