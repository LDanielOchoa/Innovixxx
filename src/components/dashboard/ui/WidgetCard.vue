<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  title: string
  icon?: any
  loading?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="relative group/widget overflow-hidden rounded-[24px] bg-white/40 dark:bg-[#13161C]/40 backdrop-blur-2xl border border-slate-200/80 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
    
    <!-- Header -->
    <div class="px-5 pt-4 pb-1 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div v-if="icon" class="w-7 h-7 rounded-lg bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20 group-hover/widget:scale-110 transition-transform duration-500">
           <HugeiconsIcon :icon="icon" :size="14" :stroke-width="2.5" />
        </div>
        <h3 class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">{{ title }}</h3>
      </div>
      
      <!-- Indicador de Actividad -->
      <div class="flex gap-1">
        <div class="w-1 h-1 rounded-full bg-[#3b82f6] animate-pulse"></div>
        <div class="w-1 h-1 rounded-full bg-[#3b82f6]/40 animate-pulse [animation-delay:0.2s]"></div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-5 pb-5 pt-2">
      <div v-if="loading" class="animate-pulse space-y-4">
        <div class="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl w-full"></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
          <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
        </div>
      </div>
      <div v-else class="animate-fade-in">
        <slot></slot>
      </div>
    </div>

    <!-- Shine Effect -->
    <div class="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/widget:opacity-100 transition-opacity duration-700"></div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>

