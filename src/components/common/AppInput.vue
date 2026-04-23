<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue'

interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: string
  icon?: any
  required?: boolean
  disabled?: boolean
  rows?: number
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  rows: 4
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="space-y-2 w-full">
    <label v-if="label" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
      {{ label }}
    </label>
    
    <div 
      class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
      :class="{ 'opacity-60 cursor-not-allowed': disabled }"
    >
      <div v-if="icon" class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors duration-300">
        <HugeiconsIcon :icon="icon" :size="18" :stroke-width="1.8" />
      </div>
      
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows"
        class="w-full bg-transparent border-none p-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0 transition-all resize-none"
      ></textarea>
      
      <input
        v-else
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        class="w-full bg-transparent border-none py-4 px-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0 transition-all"
        :class="{ 'pl-0': icon }"
      />
    </div>
  </div>
</template>


