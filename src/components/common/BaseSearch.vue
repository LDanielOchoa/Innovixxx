<template>
  <div class="relative flex items-center group/search bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6] dark:focus-within:ring-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] w-full sm:w-80">
    <div class="pl-3.5 pr-2 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] dark:group-focus-within/search:text-[#5da6fc] transition-colors flex-shrink-0">
      <HugeiconsIcon :icon="Search01Icon" :size="18" />
    </div>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      type="text"
      :placeholder="placeholder || $t('common.search', 'Buscar...')"
      class="w-full bg-transparent border-none py-2.5 pr-4 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0"
    >
  </div>
</template>

<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import { Search01Icon } from '@hugeicons/core-free-icons'

defineProps<{
  modelValue: string
  placeholder?: string
}>()

defineEmits(['update:modelValue'])
</script>


