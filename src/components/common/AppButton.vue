<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'glass'
  icon?: any
  iconSize?: number
  iconStroke?: number
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  iconSize: 18,
  iconStroke: 2,
  loading: false,
  disabled: false,
  type: 'button'
})

defineEmits(['click'])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    @click="$emit('click')"
    class="relative flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed group active:translate-y-[4px] active:shadow-none"
    :class="{
      // Primary (Blue 3D)
      'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] border border-[#2563eb]': variant === 'primary',
      
      // Secondary (White/Dark 3D)
      'bg-white dark:bg-[#1A1D24] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 shadow-[0_4px_0_rgba(0,0,0,0.05),0_8px_20px_rgba(0,0,0,0.05)]': variant === 'secondary',
      
      // Danger (Red 3D)
      'bg-gradient-to-b from-red-400 to-red-500 text-white shadow-[0_4px_0_#b91c1c,0_8px_20px_rgba(239,68,68,0.2)] border border-[#b91c1c]': variant === 'danger',
      
      // Glass (Minimalist)
      'bg-white/10 backdrop-blur-md text-slate-600 dark:text-slate-300 border border-white/20 hover:bg-white/20 shadow-none active:translate-y-0': variant === 'glass'
    }"
  >
    <div v-if="loading" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
    <HugeiconsIcon v-else-if="icon" :icon="icon" :size="iconSize" :stroke-width="iconStroke" class="transition-transform group-hover:scale-110" />
    <slot></slot>
  </button>
</template>


