<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

interface Props {
  modelValue: Date | null
  label?: string
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Seleccione fecha',
  disabled: false
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const viewDate = ref(new Date())

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const currentMonth = computed(() => monthNames[viewDate.value.getMonth()])
const currentYear = computed(() => viewDate.value.getFullYear())

const displayValue = computed(() => {
  if (!props.modelValue) return ''
  const d = props.modelValue
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
})

const daysInMonth = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (number | null)[] = []

  const startDay = firstDay.getDay()
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(d)
  }
  return days
})

const isToday = (day: number) => {
  const today = new Date()
  return day === today.getDate() && viewDate.value.getMonth() === today.getMonth() && viewDate.value.getFullYear() === today.getFullYear()
}

const isSelected = (day: number) => {
  if (!props.modelValue) return false
  return day === props.modelValue.getDate() && viewDate.value.getMonth() === props.modelValue.getMonth() && viewDate.value.getFullYear() === props.modelValue.getFullYear()
}

const selectDay = (day: number) => {
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day, 0, 0, 0, 0)
  emit('update:modelValue', date)
  isOpen.value = false
}

const prevMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

const goToday = () => {
  const now = new Date()
  viewDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  emit('update:modelValue', today)
  isOpen.value = false
}

const clearDate = () => {
  emit('update:modelValue', null)
  isOpen.value = false
}

const openDropdown = () => {
  if (props.disabled) return
  if (props.modelValue) {
    viewDate.value = new Date(props.modelValue.getFullYear(), props.modelValue.getMonth(), 1)
  } else {
    viewDate.value = new Date()
  }
  isOpen.value = true
}

const handleClickOutside = (event: MouseEvent) => {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    isOpen.value = false
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
  <div ref="pickerRef" class="space-y-2 w-full relative">
    <label
      v-if="label"
      class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
      :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isOpen }"
    >
      {{ label }}
    </label>

    <div class="relative">
      <button
        type="button"
        @click="openDropdown"
        :disabled="disabled"
        class="relative flex items-center w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 group/input"
        :class="[
          { 'opacity-60 cursor-not-allowed': disabled },
          isOpen
            ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
            : 'hover:border-slate-300 dark:hover:border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'
        ]"
      >
        <div class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300" :class="{ 'opacity-100 left-2 right-2': isOpen }"></div>
        <HugeiconsIcon :icon="Calendar01Icon" :size="18" :stroke-width="1.8" class="text-slate-400 dark:text-slate-500 mr-3 transition-colors duration-300" :class="isOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'group-hover/input:text-slate-500 dark:group-hover/input:text-slate-400'" />
        <span class="flex-1 text-left" :class="modelValue ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
          {{ displayValue || placeholder }}
        </span>
      </button>

      <Transition name="date-dropdown">
        <div v-if="isOpen" class="absolute bottom-full left-0 mb-2 z-[9999] w-72">
          <div class="bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">

            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <button type="button" @click="prevMonth" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" :stroke-width="2" />
              </button>
              <div class="text-center">
                <span class="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wide">{{ currentMonth }}</span>
                <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-2">{{ currentYear }}</span>
              </div>
              <button type="button" @click="nextMonth" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                <HugeiconsIcon :icon="ArrowRight01Icon" :size="16" :stroke-width="2" />
              </button>
            </div>

            <div class="grid grid-cols-7 px-3 pt-3 pb-1">
              <div v-for="wd in weekDays" :key="wd" class="text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">{{ wd }}</div>
            </div>

            <div class="grid grid-cols-7 px-3 pb-3 gap-0.5">
              <div v-for="(day, i) in daysInMonth" :key="i" class="aspect-square flex items-center justify-center">
                <button
                  v-if="day !== null"
                  type="button"
                  @click="selectDay(day)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-200"
                  :class="[
                    isSelected(day)
                      ? 'bg-[#3b82f6] text-white shadow-[0_2px_12px_rgba(59,130,246,0.45)]'
                      : isToday(day)
                        ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  ]"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <button type="button" @click="clearDate" class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-red-500 transition-colors">Limpiar</button>
              <button type="button" @click="goToday" class="text-[11px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider hover:text-[#2563eb] transition-colors">Hoy</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.date-dropdown-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.date-dropdown-leave-active {
  transition: all 0.2s ease;
}
.date-dropdown-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
.date-dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
