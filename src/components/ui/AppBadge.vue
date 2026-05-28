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
    class="inline-flex !flex-row !items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-normal transition-all duration-300 whitespace-nowrap min-w-fit border"
    :class="{
      'bg-[#E5F1FF] dark:bg-[#3b82f6]/10 border-blue-200/50 dark:border-[#3b82f6]/20 text-[#0066FF] dark:text-[#5da6fc]': variant === 'primary',
      'bg-[#EAF8F2] dark:bg-[#10b981]/10 border-emerald-200/40 dark:border-[#10b981]/20 text-[#10B981] dark:text-[#34D399]': variant === 'success',
      'bg-[#FFF5EA] dark:bg-[#f59e0b]/10 border-amber-200/40 dark:border-[#f59e0b]/20 text-[#F59E0B] dark:text-[#FBBF24]': variant === 'warning',
      'bg-[#FEEBEB] dark:bg-[#ef4444]/10 border-red-200/40 dark:border-[#ef4444]/20 text-[#EF4444] dark:text-[#F87171]': variant === 'danger',
      'bg-[#F1F5F9] dark:bg-white/[0.04] border-slate-200/50 dark:border-white/5 text-[#475569] dark:text-[#94A3B8]': variant === 'info' || variant === 'glass',
    }"
  >
    <div v-if="dot" class="w-1.5 h-1.5 rounded-full" :class="{
      'bg-[#0066FF]': variant === 'primary',
      'bg-[#10B981]': variant === 'success',
      'bg-[#F59E0B]': variant === 'warning',
      'bg-[#EF4444]': variant === 'danger',
      'bg-[#475569] dark:bg-[#94A3B8]': variant === 'info' || variant === 'glass',
    }"></div>
    <slot></slot>
  </div>
</template>
