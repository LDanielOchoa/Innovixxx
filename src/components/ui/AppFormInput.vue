<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: string
  icon?: any
  disabled?: boolean
  error?: string
}

defineProps<Props>()
defineEmits(['update:modelValue'])
defineSlots<{ icon?: () => any }>()
</script>

<template>
  <div class="space-y-2 w-full">
    <label v-if="label" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
      {{ label }}
    </label>
    
    <div 
      class="relative flex items-center group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] overflow-hidden focus-within:border-[#3b82f6]/40 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
      :class="[
        disabled && 'opacity-60 bg-slate-100/50 dark:bg-[#0D1116]',
        error && 'border-red-500/50 focus-within:border-red-500'
      ]"
    >
      <!-- Slot icon has priority over :icon prop -->
      <div v-if="$slots.icon || icon" class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors flex items-center">
        <slot name="icon">
          <HugeiconsIcon :icon="icon" :size="18" :stroke-width="2.2" />
        </slot>
      </div>
      
      <input
        :type="type || 'text'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full bg-transparent border-none py-3.5 pr-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
      />
    </div>
    
    <p v-if="error" class="text-[10px] font-bold text-red-500 ml-1.5 mt-1 transition-all animate-fade-in">
      {{ error }}
    </p>
  </div>
</template>
