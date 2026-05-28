<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  label: string
  icon?: any
  iconSize?: number
  iconStrokeWidth?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  iconSize: 12,
  iconStrokeWidth: 2.5
})
</script>

<template>
  <span 
    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide"
    :class="{
      'bg-blue-50 text-blue-600 dark:bg-[#3b82f6]/10 dark:text-[#5da6fc] border border-blue-100/50 dark:border-blue-500/20': variant === 'primary',
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20': variant === 'success',
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100/50 dark:border-amber-500/20': variant === 'warning',
      'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100/50 dark:border-red-500/20': variant === 'danger',
      'bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200/50 dark:border-white/5': variant === 'info' || variant === 'default'
    }"
  >
    <HugeiconsIcon v-if="icon" :icon="icon" :size="iconSize" :stroke-width="iconStrokeWidth" />
    {{ label }}
  </span>
</template>
