<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'glass'
  dot?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  dot: false
})
</script>

<template>
  <div 
    class="inline-flex !flex-row !items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-500 backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.1)] whitespace-nowrap min-w-fit"
    :class="{
      'bg-blue-500/10 dark:bg-[#3b82f6]/10 border-[#3b82f6]/20 dark:border-[#3b82f6]/30 text-[#3b82f6] dark:text-[#5da6fc]': variant === 'primary',
      'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400': variant === 'success',
      'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30 text-amber-600 dark:text-amber-400': variant === 'warning',
      'bg-red-500/10 dark:bg-red-500/10 border-red-500/20 dark:border-red-500/30 text-red-600 dark:text-red-400': variant === 'danger',
      'bg-slate-100/80 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-400': variant === 'info' || variant === 'glass',
    }"
  >
    <div v-if="dot" class="w-1.5 h-1.5 rounded-full animate-pulse" :class="{
      'bg-blue-500': variant === 'primary',
      'bg-emerald-500': variant === 'success',
      'bg-amber-500': variant === 'warning',
      'bg-red-500': variant === 'danger',
      'bg-slate-400': variant === 'info' || variant === 'glass',
    }"></div>
    <slot></slot>
  </div>
</template>
