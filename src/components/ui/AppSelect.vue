<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

interface Props {
  modelValue: string | number
  label?: string
  options: { label: string; value: string | number }[]
  placeholder?: string
  disabled?: boolean
}

defineProps<Props>()
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-2 w-full">
    <label v-if="label" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5 flex items-center gap-2">
      {{ label }}
    </label>
    
    <div class="relative group/select">
      <select 
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        :disabled="disabled"
        class="w-full h-[46px] bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-xl px-4 text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-[#3b82f6] dark:focus:border-[#5da6fc] focus:ring-4 focus:ring-[#3b82f6]/5 dark:focus:ring-[#5da6fc]/5 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option v-if="placeholder" value="" disabled selected>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      
      <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-600 group-focus-within/select:text-[#3b82f6] dark:group-focus-within/select:text-[#5da6fc] transition-colors">
        <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" />
      </div>
    </div>
  </div>
</template>

<style scoped>
select {
  background-image: none !important;
}

/* Estilizar las opciones para modo oscuro */
option {
  @apply bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 py-2;
}
</style>
