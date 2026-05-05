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
      class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6] dark:focus-within:ring-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
      :class="{ 'opacity-60 cursor-not-allowed': disabled }"
    >
      <div v-if="icon" class="pl-4 pr-2 text-slate-400 dark:text-slate-500 group-focus-within/input:text-[#3b82f6] dark:group-focus-within/input:text-[#5da6fc] transition-colors duration-300">
        <HugeiconsIcon :icon="icon" :size="20" :stroke-width="1.8" />
      </div>
      
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows"
        class="w-full bg-transparent border-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 transition-all resize-none"
      ></textarea>
      
      <input
        v-else
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        class="w-full bg-transparent border-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 transition-all"
        :class="{ 'pl-0': icon }"
      />
    </div>
  </div>
</template>


