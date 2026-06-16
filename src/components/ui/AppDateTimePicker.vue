<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

interface Props {
  modelValue: Date | null
  label?: string
  placeholder?: string
  disabled?: boolean
  onlyDate?: boolean
  disablePast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'Seleccione fecha',
  disabled: false,
  onlyDate: false,
  disablePast: false
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const viewDate = ref(new Date())

// Floating position for the teleported dropdown
const dropdownStyle = ref<{
  position: string
  top?: string
  bottom?: string
  left: string
  width: string
  zIndex: string
}>({
  position: 'fixed',
  top: '0px',
  left: '0px',
  width: '288px',
  zIndex: '99999'
})

const computeDropdownPosition = async () => {
  await nextTick()
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const DROPDOWN_HEIGHT = 380 // approximate height of the calendar
  const GAP = 6
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top

  const DROPDOWN_WIDTH = 288
  const newStyle: typeof dropdownStyle.value = {
    position: 'fixed',
    left: `${Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 8)}px`,
    width: `${DROPDOWN_WIDTH}px`,
    zIndex: '99999'
  }

  if (spaceBelow >= DROPDOWN_HEIGHT || spaceBelow >= spaceAbove) {
    // Open downward
    newStyle.top = `${rect.bottom + GAP}px`
  } else {
    // Open upward
    newStyle.bottom = `${viewportHeight - rect.top + GAP}px`
  }

  dropdownStyle.value = newStyle
}

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
  if (props.onlyDate) {
    return `${day}/${month}/${year}`
  }
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
})

const currentHour = computed(() => {
  if (!props.modelValue) return '00'
  return String(props.modelValue.getHours()).padStart(2, '0')
})

const currentMinute = computed(() => {
  if (!props.modelValue) return '00'
  return String(props.modelValue.getMinutes()).padStart(2, '0')
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

const isPastDay = (day: number) => {
  if (!props.disablePast) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day, 0, 0, 0, 0)
  return date < today
}

const isToday = (day: number) => {
  const today = new Date()
  return day === today.getDate() && viewDate.value.getMonth() === today.getMonth() && viewDate.value.getFullYear() === today.getFullYear()
}

const isSelected = (day: number) => {
  if (!props.modelValue) return false
  return day === props.modelValue.getDate() && viewDate.value.getMonth() === props.modelValue.getMonth() && viewDate.value.getFullYear() === props.modelValue.getFullYear()
}

const selectDay = (day: number) => {
  if (isPastDay(day)) return
  const currentH = props.onlyDate ? 0 : (props.modelValue ? props.modelValue.getHours() : 0)
  const currentM = props.onlyDate ? 0 : (props.modelValue ? props.modelValue.getMinutes() : 0)
  const date = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day, currentH, currentM, 0, 0)
  emit('update:modelValue', date)
}

const updateHour = (value: string) => {
  const h = parseInt(value, 10)
  if (isNaN(h) || h < 0 || h > 23) return
  const current = props.modelValue || new Date()
  const date = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, current.getMinutes(), 0, 0)
  emit('update:modelValue', date)
}

const updateMinute = (value: string) => {
  const m = parseInt(value, 10)
  if (isNaN(m) || m < 0 || m > 59) return
  const current = props.modelValue || new Date()
  const date = new Date(current.getFullYear(), current.getMonth(), current.getDate(), current.getHours(), m, 0, 0)
  emit('update:modelValue', date)
}

const confirmSelection = () => {
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
  const today = props.onlyDate
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)
  emit('update:modelValue', today)
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
  computeDropdownPosition()
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  // Also allow clicks inside the teleported dropdown (which is outside pickerRef in the DOM)
  const teleportedEl = document.querySelector('.date-picker-teleport')
  if (teleportedEl && teleportedEl.contains(target)) return
  if (pickerRef.value && !pickerRef.value.contains(target)) {
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
  <div ref="pickerRef" class="space-y-2 w-full">
    <label
      v-if="label"
      class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
      :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isOpen }"
    >
      {{ label }}
    </label>

    <div class="relative">
      <button
        ref="triggerRef"
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

      <!-- Teleport calendar to body so modal overflow:hidden never clips it -->
      <Teleport to="body">
      <Transition name="date-dropdown">
        <div v-if="isOpen" :style="dropdownStyle" class="date-picker-teleport">
          <div class="bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">

            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <button type="button" @click="prevMonth" class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#3b82f6] hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" :stroke-width="2" />
              </button>
              <div class="flex items-center gap-1">
                <!-- Month Select -->
                <select
                  :value="viewDate.getMonth()"
                  @change="viewDate = new Date(viewDate.getFullYear(), parseInt(($event.target as HTMLSelectElement).value), 1)"
                  class="bg-transparent border-none text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider outline-none cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                >
                  <option
                    v-for="(name, index) in monthNames"
                    :key="index"
                    :value="index"
                    class="bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 normal-case font-bold"
                  >
                    {{ name }}
                  </option>
                </select>

                <!-- Year Select -->
                <select
                  :value="viewDate.getFullYear()"
                  @change="viewDate = new Date(parseInt(($event.target as HTMLSelectElement).value), viewDate.getMonth(), 1)"
                  class="bg-transparent border-none text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider outline-none cursor-pointer p-0.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                >
                  <option
                    v-for="year in Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - 20 + i)"
                    :key="year"
                    :value="year"
                    class="bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200 font-bold"
                  >
                    {{ year }}
                  </option>
                </select>
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
                  :disabled="isPastDay(day)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold transition-all duration-200"
                  :class="[
                    isSelected(day)
                      ? 'bg-[#3b82f6] text-white shadow-[0_2px_12px_rgba(59,130,246,0.45)]'
                      : isPastDay(day)
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-30'
                        : isToday(day)
                          ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  ]"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <div v-if="!onlyDate" class="flex items-center justify-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02]">
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hora:</span>
              <input
                type="number"
                min="0"
                max="23"
                :value="currentHour"
                @change="updateHour(($event.target as HTMLInputElement).value)"
                class="w-14 px-2 py-1.5 text-center text-[13px] font-bold bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 focus:border-[#3b82f6] dark:focus:border-[#5da6fc] focus:ring-1 focus:ring-[#3b82f6]/20 outline-none transition-all"
              />
              <span class="text-slate-400 font-bold">:</span>
              <input
                type="number"
                min="0"
                max="59"
                :value="currentMinute"
                @change="updateMinute(($event.target as HTMLInputElement).value)"
                class="w-14 px-2 py-1.5 text-center text-[13px] font-bold bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 focus:border-[#3b82f6] dark:focus:border-[#5da6fc] focus:ring-1 focus:ring-[#3b82f6]/20 outline-none transition-all"
              />
            </div>

            <div class="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
              <button type="button" @click="clearDate" class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-red-500 transition-colors">Limpiar</button>
              <div class="flex items-center gap-2">
                <button type="button" @click="goToday" class="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Hoy</button>
                <button type="button" @click="confirmSelection" class="text-[11px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider hover:text-[#2563eb] transition-colors">Listo</button>
              </div>
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
  transform: translateY(8px) scale(0.98);
}
.date-dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
