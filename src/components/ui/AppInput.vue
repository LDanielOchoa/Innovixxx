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
const showPassword = ref(false)
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
        :type="type === 'password' && showPassword ? 'text' : type"
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

      <button
        v-if="type === 'password'"
        type="button"
        @click="showPassword = !showPassword"
        class="relative z-20 pr-4 pl-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors focus:outline-none cursor-pointer flex items-center justify-center shrink-0"
      >
        <svg v-if="showPassword" class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <svg v-else class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
        </svg>
      </button>
    </div>
  </div>
</template>
