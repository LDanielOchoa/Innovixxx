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
    class="inline-flex !flex-row !items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all duration-300 backdrop-blur-md shadow-sm whitespace-nowrap min-w-fit"
    :class="{
      'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200/50 dark:border-blue-500/10 text-blue-600 dark:text-blue-400': variant === 'primary',
      'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/10 text-emerald-600 dark:text-emerald-400': variant === 'success',
      'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/10 text-amber-600 dark:text-amber-400': variant === 'warning',
      'bg-red-50/50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/10 text-red-600 dark:text-red-400': variant === 'danger',
      'bg-slate-50/50 dark:bg-white/5 border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400': variant === 'info' || variant === 'glass',
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
