<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'
import { Search01Icon } from '@hugeicons/core-free-icons'

interface Props {
  modelValue: string
  placeholder?: string
}

defineProps<Props>()
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex items-center gap-4 w-full">
    <div class="relative flex items-center group/search flex-1">
      <!-- Ícono de búsqueda -->
      <div class="absolute left-4 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] dark:group-focus-within/search:text-[#5da6fc] transition-all duration-300 pointer-events-none">
        <HugeiconsIcon :icon="Search01Icon" :size="18" :stroke-width="2.5" />
      </div>

      <!-- Input -->
      <input 
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text" 
        :placeholder="placeholder" 
        class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 dark:focus:ring-[#5da6fc]/5 transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
      />
    </div>

    <!-- Espacio para botones extra -->
    <div v-if="$slots.extra" class="flex items-center">
      <slot name="extra"></slot>
    </div>
  </div>
</template>


