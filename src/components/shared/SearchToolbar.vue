<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
  searchWidth?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar...',
  searchWidth: 'sm:w-80'
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-end gap-3 mb-6">
    <div class="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
      <!-- Search Input -->
      <div class="relative w-full" :class="searchWidth">
        <input 
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          type="text" 
          :placeholder="placeholder"
          class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-650 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
        />
        <div class="absolute left-3.5 top-3 text-slate-400 pointer-events-none transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <!-- Extra Buttons Slot -->
      <div class="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <slot name="extra"></slot>
      </div>
    </div>
  </div>
</template>
