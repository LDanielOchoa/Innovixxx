<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

interface Props {
  modelValue: { start: string; end: string }
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Seleccionar rango de fechas'
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const viewDate = ref(new Date())
const selectingStart = ref(true)
const dropdownStyle = ref({ top: '0px', left: '0px' })
const buttonRef = ref<HTMLElement | null>(null)

const selectedStart = computed(() => {
  if (!props.modelValue.start) return null
  return new Date(props.modelValue.start + 'T00:00:00')
})

const selectedEnd = computed(() => {
  if (!props.modelValue.end) return null
  return new Date(props.modelValue.end + 'T00:00:00')
})

const currentMonth = computed(() => viewDate.value.toLocaleString('es', { month: 'long' }))
const currentYear = computed(() => viewDate.value.getFullYear())

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

const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const isToday = (day: number) => {
  const today = new Date()
  return day === today.getDate() && viewDate.value.getMonth() === today.getMonth() && viewDate.value.getFullYear() === today.getFullYear()
}

const isInRange = (day: number | null) => {
  if (!day || !selectedStart.value || !selectedEnd.value) return false
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
  return date > selectedStart.value && date < selectedEnd.value
}

const isStartOrEnd = (day: number | null) => {
  if (!day) return false
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
  return (selectedStart.value && date.getTime() === selectedStart.value.getTime()) ||
         (selectedEnd.value && date.getTime() === selectedEnd.value.getTime())
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

const displayValue = computed(() => {
  if (props.modelValue.start && props.modelValue.end) {
    return `${formatDate(props.modelValue.start)} - ${formatDate(props.modelValue.end)}`
  }
  if (props.modelValue.start) {
    return `${formatDate(props.modelValue.start)} - ...`
  }
  return ''
})

const selectDay = (day: number) => {
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayStr = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${dayStr}`

  if (selectingStart.value) {
    emit('update:modelValue', { start: dateStr, end: props.modelValue.end })
    selectingStart.value = false
  } else {
    if (props.modelValue.start && dateStr < props.modelValue.start) {
      emit('update:modelValue', { start: dateStr, end: props.modelValue.start })
    } else {
      emit('update:modelValue', { start: props.modelValue.start, end: dateStr })
    }
    selectingStart.value = true
    isOpen.value = false
  }
}

const prevMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

const goToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  emit('update:modelValue', { start: dateStr, end: dateStr })
  selectingStart.value = true
  isOpen.value = false
}

const clearDate = () => {
  emit('update:modelValue', { start: '', end: '' })
  selectingStart.value = true
  isOpen.value = false
}

const openDropdown = async () => {
  if (props.modelValue.start) {
    viewDate.value = new Date(props.modelValue.start + 'T00:00:00')
  } else {
    viewDate.value = new Date()
  }
  selectingStart.value = !props.modelValue.start || !!props.modelValue.end
  isOpen.value = true
  
  await nextTick()
  if (buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    dropdownStyle.value = {
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`
    }
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

watch(() => props.modelValue.start, (newStart) => {
  if (newStart && !props.modelValue.end) {
    selectingStart.value = false
  }
})

const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value && buttonRef.value && !buttonRef.value.contains(event.target as Node)) {
    closeDropdown()
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
  <div class="space-y-2 w-full relative">
    <label
      v-if="label"
      class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-1 transition-colors duration-300"
    >
      {{ label }}
    </label>

    <div class="relative">
      <button
        ref="buttonRef"
        type="button"
        @click="openDropdown"
        class="relative flex items-center w-full bg-slate-50/50 dark:bg-[#0A0C10]/50 border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group/input hover:border-slate-300 dark:hover:border-white/10"
        :class="[
          isOpen
            ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
            : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'
        ]"
      >
        <div class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300" :class="{ 'opacity-100 left-2 right-2': isOpen }"></div>
        <HugeiconsIcon :icon="Calendar01Icon" :size="18" :stroke-width="1.8" class="text-slate-400 dark:text-slate-500 mr-3 transition-colors duration-300" :class="isOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'group-hover/input:text-slate-500 dark:group-hover/input:text-slate-400'" />
        <span class="flex-1 text-left" :class="modelValue.start ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'">
          {{ displayValue || placeholder }}
        </span>
        <HugeiconsIcon :icon="ArrowRight01Icon" :size="14" :stroke-width="2" class="text-slate-400 dark:text-slate-500 transition-transform duration-300" :class="isOpen ? 'rotate-90 text-[#3b82f6]' : ''" />
      </button>

      <!-- Dropdown -->
      <Teleport to="body">
        <Transition name="date-dropdown">
          <div v-if="isOpen" class="fixed z-[9999]" :style="dropdownStyle" @click.stop>
            <div class="bg-white dark:bg-[#13161C] border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                 :style="{ width: '320px' }">
              <!-- Header -->
              <div class="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <button type="button" @click="prevMonth" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-white dark:hover:bg-white/5 transition-all">
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" :stroke-width="2" />
                </button>
                <div class="text-center">
                  <span class="text-[13px] font-bold text-slate-800 dark:text-white uppercase tracking-wide">{{ currentMonth }}</span>
                  <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 ml-2">{{ currentYear }}</span>
                </div>
                <button type="button" @click="nextMonth" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-white dark:hover:bg-white/5 transition-all">
                  <HugeiconsIcon :icon="ArrowRight01Icon" :size="16" :stroke-width="2" />
                </button>
              </div>

              <!-- Selection indicator -->
              <div class="px-4 py-2.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-center gap-3 bg-white dark:bg-[#13161C]">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                      :class="selectingStart ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10' : 'text-slate-400 dark:text-slate-500'">
                  Inicio
                </span>
                <svg class="w-3 h-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                      :class="!selectingStart ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10' : 'text-slate-400 dark:text-slate-500'">
                  Fin
                </span>
              </div>

              <!-- Week days -->
              <div class="grid grid-cols-7 px-3 pt-3 pb-1">
                <div v-for="wd in weekDays" :key="wd" class="text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1.5">{{ wd }}</div>
              </div>

              <!-- Days grid -->
              <div class="grid grid-cols-7 px-3 pb-3 gap-0.5">
                <div v-for="(day, i) in daysInMonth" :key="i" class="aspect-square flex items-center justify-center relative">
                  <!-- Range background -->
                  <div v-if="isInRange(day)" class="absolute inset-0 bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10"></div>
                  <button
                    v-if="day !== null"
                    type="button"
                    @click="selectDay(day)"
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-semibold transition-all duration-200 relative z-10"
                    :class="[
                      isStartOrEnd(day)
                        ? 'bg-[#3b82f6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.4)]'
                        : isToday(day)
                          ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    ]"
                  >
                    {{ day }}
                  </button>
                </div>
              </div>

              <!-- Footer actions -->
              <div class="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <button type="button" @click="clearDate" class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">Limpiar</button>
                <button type="button" @click="goToday" class="text-[11px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider hover:text-[#2563eb] transition-colors px-2 py-1 rounded hover:bg-[#3b82f6]/10 dark:hover:bg-[#5da6fc]/10">Hoy</button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
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
  transform: translateY(-8px) scale(0.98);
}
.date-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
