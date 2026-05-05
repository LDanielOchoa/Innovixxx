<script setup lang="ts">
import { ref } from 'vue'
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

const isFocused = ref(false)
</script>

<template>
  <div class="space-y-2 w-full">
    <label 
      v-if="label" 
      class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
      :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isFocused }"
    >
      {{ label }}
    </label>
    
    <div 
      class="relative flex items-center group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden transition-all duration-300"
      :class="[
        { 'opacity-60 cursor-not-allowed': disabled },
        { 
          'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20': isFocused,
          'hover:border-slate-300 dark:hover:border-white/10': !isFocused && !disabled
        }
      ]"
    >
      <!-- Sombra inset 3D -->
      <div 
        class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
        :class="isFocused 
          ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
          : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
      ></div>

      <!-- Borde superior brillante en focus -->
      <div 
        class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300"
        :class="{ 'opacity-100 left-2 right-2': isFocused }"
      ></div>

      <div 
        v-if="icon" 
        class="relative z-10 pl-4 pr-2 text-slate-400 dark:text-slate-500 transition-all duration-300"
        :class="isFocused ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'group-hover/input:text-slate-500 dark:group-hover/input:text-slate-400'"
      >
        <HugeiconsIcon :icon="icon" :size="18" :stroke-width="1.8" />
      </div>
      
      <textarea
        v-if="type === 'textarea'"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows"
        class="relative z-10 w-full bg-transparent border-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 transition-colors duration-300 resize-none"
      ></textarea>
      
      <input
        v-else
        :type="type"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        class="relative z-10 w-full bg-transparent border-none px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 transition-colors duration-300"
        :class="{ 'pl-0': icon }"
      />
    </div>
  </div>
</template>
