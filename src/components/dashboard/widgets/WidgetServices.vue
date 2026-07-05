<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Calendar01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

const { t } = useI18n()

const props = defineProps<{
  ejecucion_ok?: number
  en_espera?: number
  precarga?: number
  ejecucion_fail?: number
  isLive?: boolean
}>()

const isLoading = ref(true)
const servicesFilter = ref('today')
const servicesData = ref({
  ejecucion_ok: 0,
  en_espera: 0,
  precarga: 0,
  ejecucion_fail: 0
})

const animateValue = (target: number, duration: number, callback: (val: number) => void) => {
  const startTime = performance.now()
  const startValue = 0

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const currentValue = Math.round(startValue + (target - startValue) * easeOut)
    callback(currentValue)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

watch(() => props.isLive, (newVal) => {
  if (newVal) {
    servicesData.value = { ejecucion_ok: 0, en_espera: 0, precarga: 0, ejecucion_fail: 0 }
    isLoading.value = true
  }
}, { immediate: true })

watch(() => props.ejecucion_ok, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 600, (val) => servicesData.value.ejecucion_ok = val)
  }
}, { immediate: true })

watch(() => props.en_espera, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 600, (val) => servicesData.value.en_espera = val)
  }
}, { immediate: true })

watch(() => props.precarga, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 600, (val) => servicesData.value.precarga = val)
  }
}, { immediate: true })

watch(() => props.ejecucion_fail, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 600, (val) => servicesData.value.ejecucion_fail = val)
  }
}, { immediate: true })
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.services.title')" :icon="Calendar01Icon" :loading="false">
    <!-- Skeleton Loader -->
    <div v-if="isLoading" class="animate-pulse space-y-6">
      <div class="h-9 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
      <div class="grid grid-cols-2 gap-2">
        <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
      </div>
    </div>

    <!-- Contenido Real -->
    <div v-else class="space-y-6">
      <!-- Selector de Filtro -->
      <div class="relative inline-block w-full">
        <select v-model="servicesFilter" class="w-full bg-slate-50/50 dark:bg-[#0F1115]/50 border border-slate-200/50 dark:border-white/5 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest outline-none cursor-pointer hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 transition-all appearance-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
          <option value="today">{{ t('dashboard.widgets.services.filter.today') }}</option>
          <option value="week">{{ t('dashboard.widgets.services.filter.week') }}</option>
          <option value="month">{{ t('dashboard.widgets.services.filter.month') }}</option>
        </select>
        <HugeiconsIcon :icon="ArrowDown01Icon" :size="12" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      
      <!-- Grid de Estados -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:scale-[1.02]">
          <p class="text-2xl font-black text-[#3b82f6] dark:text-[#5da6fc] tracking-tighter drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">{{servicesData.ejecucion_ok}}</p>
          <p class="text-[8px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5">Ejecución OK</p>
        </div>
        <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:scale-[1.02]">
          <p class="text-2xl font-black text-slate-700 dark:text-white tracking-tighter">{{servicesData.en_espera}}</p>
          <p class="text-[8px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5">En Espera</p>
        </div>
        <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:scale-[1.02]">
          <p class="text-2xl font-black text-slate-500 dark:text-slate-400 tracking-tighter">{{servicesData.precarga}}</p>
          <p class="text-[8px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5">Precarga</p>
        </div>
        <div class="bg-rose-500/5 dark:bg-[#0F1115]/80 rounded-xl border border-rose-500/20 dark:border-rose-500/10 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(244,63,94,0.05)] dark:shadow-[inset_0_2px_12px_rgba(244,63,94,0.15)] hover:shadow-[inset_0_4px_12px_rgba(244,63,94,0.1)] dark:hover:shadow-[inset_0_4px_16px_rgba(244,63,94,0.25)] hover:bg-rose-500/10 hover:scale-[1.02]">
          <p class="text-2xl font-black text-rose-500 dark:text-rose-400 tracking-tighter drop-shadow-[0_2px_10px_rgba(244,63,94,0.3)]">{{servicesData.ejecucion_fail}}</p>
          <p class="text-[8px] font-black text-rose-600/60 dark:text-rose-400/60 uppercase tracking-widest mt-1.5">Ejecución Fail</p>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>
