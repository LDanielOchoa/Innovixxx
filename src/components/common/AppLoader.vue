<script setup lang="ts">
defineProps<{
  text?: string
  glass?: boolean
}>()
</script>

<template>
  <div :class="[
    'flex flex-col items-center justify-center gap-5 transition-all duration-500 h-full w-full',
    glass ? 'absolute inset-0 z-50 bg-white/40 dark:bg-[#09090b]/60 backdrop-blur-xl rounded-2xl' : ''
  ]">
    <div class="relative flex items-center justify-center">
      <!-- Minimalist Aesthetic Spinner -->
      <div class="w-12 h-12 border-[2px] border-slate-200/50 dark:border-white/5 rounded-full"></div>
      <div class="absolute w-12 h-12 border-[2px] border-transparent border-t-[#3b82f6] rounded-full animate-spin"></div>
      
      <!-- Center Soft Glow -->
      <div class="absolute w-2 h-2 bg-[#3b82f6] rounded-full blur-[2px] opacity-50 animate-pulse"></div>
    </div>
    
    <p v-if="text" class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse">
      {{ text }}
    </p>
  </div>
</template>
