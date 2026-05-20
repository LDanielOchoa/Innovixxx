<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ArrowDown01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'

interface Option {
  value: string
  label: string
}

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  icon?: any
  options: Option[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const isFocused = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  const opt = props.options.find(o => o.value === props.modelValue)
  return opt ? opt.label : ''
})

const toggle = () => {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    isFocused.value = true
  }
}

const selectOption = (value: string) => {
  emit('update:modelValue', value)
  isOpen.value = false
  isFocused.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
    isFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="space-y-2 w-full relative">
    <label 
      v-if="label" 
      class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
      :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isFocused }"
    >
      {{ label }}
    </label>
    
    <div class="relative">
      <!-- Trigger Button -->
      <button
        type="button"
        @click="toggle"
        :disabled="disabled"
        class="relative flex items-center w-full group/input bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden transition-all duration-300"
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
        
        <span 
          class="relative z-10 flex-1 text-left px-4 py-3 text-sm font-medium truncate"
          :class="selectedLabel 
            ? 'text-slate-800 dark:text-slate-200' 
            : 'text-slate-400 dark:text-slate-600'"
        >
          {{ selectedLabel || placeholder || 'Seleccionar...' }}
        </span>

        <!-- Arrow Icon -->
        <div class="relative z-10 pr-4 text-slate-400 dark:text-slate-500 transition-all duration-300"
          :class="isFocused ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''"
        >
          <HugeiconsIcon 
            :icon="ArrowDown01Icon" 
            :size="18" 
            :stroke-width="2" 
            class="transition-transform duration-300"
            :class="{ 'rotate-180': isOpen }"
          />
        </div>
      </button>

      <!-- Dropdown List -->
      <Transition name="dropdown">
        <div 
          v-if="isOpen" 
          class="absolute z-50 w-full mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          <div class="max-h-60 overflow-y-auto custom-scrollbar py-1.5">
            <button
              v-for="option in options"
              :key="option.value"
              type="button"
              @click="selectOption(option.value)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium transition-all duration-200 group/option"
              :class="modelValue === option.value
                ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
            >
              <span class="flex-1 truncate">{{ option.label }}</span>
              <HugeiconsIcon 
                v-if="modelValue === option.value" 
                :icon="CheckmarkCircle01Icon" 
                :size="16" 
                :stroke-width="2.5" 
                class="shrink-0"
              />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.dropdown-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2A313A;
}
</style>
