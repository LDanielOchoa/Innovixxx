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
  <div class="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-white/50 dark:bg-[#15171C]/50 backdrop-blur-xl p-3 rounded-[20px] border border-slate-200/60 dark:border-white/5 shadow-sm w-full">
    <div class="relative flex-1 group/search">
      <HugeiconsIcon :icon="Search01Icon" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] transition-colors" />
      <input 
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text" 
        :placeholder="placeholder" 
        class="w-full bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
      />
    </div>
    <slot name="extra"></slot>
  </div>
</template>


