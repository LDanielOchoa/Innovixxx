<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Calendar01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/vue'

const { t } = useI18n()

const isLoading = ref(true)
const servicesFilter = ref('today')
const servicesData = ref({
  executing: 0,
  scheduled: 0,
  planned: 0,
  finished: 0
})

const targetValues = { executing: 5, scheduled: 12, planned: 8, finished: 45 }
let updateInterval: ReturnType<typeof setInterval> | null = null

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

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    setTimeout(() => {
      animateValue(targetValues.executing, 1000, (val) => servicesData.value.executing = val)
      animateValue(targetValues.scheduled, 1200, (val) => servicesData.value.scheduled = val)
      animateValue(targetValues.planned, 1100, (val) => servicesData.value.planned = val)
      animateValue(targetValues.finished, 1400, (val) => servicesData.value.finished = val)

      updateInterval = setInterval(() => {
        const change = Math.random() > 0.5 ? 1 : -1
        if (Math.random() > 0.6) servicesData.value.executing = Math.max(0, servicesData.value.executing + change)
        if (Math.random() > 0.7) servicesData.value.scheduled = Math.max(0, servicesData.value.scheduled + change)
        if (Math.random() > 0.8) servicesData.value.planned = Math.max(0, servicesData.value.planned + change)
        servicesData.value.finished += Math.floor(Math.random() * 2) + 1
      }, 7000)
    }, 100)
  }, 350)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.services.title')" :icon="Calendar01Icon" :loading="isLoading">
    <div class="space-y-6">
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
          <p class="text-2xl font-black text-[#3b82f6] dark:text-[#5da6fc] tracking-tighter drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">{{servicesData.executing}}</p>
          <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{{ t('dashboard.widgets.services.executing') }}</p>
        </div>
        <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:scale-[1.02]">
          <p class="text-2xl font-black text-slate-700 dark:text-white tracking-tighter">{{servicesData.scheduled}}</p>
          <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{{ t('dashboard.widgets.services.scheduled') }}</p>
        </div>
        <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:scale-[1.02]">
          <p class="text-2xl font-black text-slate-500 dark:text-slate-400 tracking-tighter">{{servicesData.planned}}</p>
          <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">{{ t('dashboard.widgets.services.planned') }}</p>
        </div>
        <div class="bg-emerald-500/5 dark:bg-[#0F1115]/80 rounded-xl border border-emerald-500/20 dark:border-emerald-500/10 p-3 flex flex-col items-center group/stat transition-all duration-300 shadow-[inset_0_2px_4px_rgba(16,185,129,0.05)] dark:shadow-[inset_0_2px_12px_rgba(16,185,129,0.15)] hover:shadow-[inset_0_4px_12px_rgba(16,185,129,0.1)] dark:hover:shadow-[inset_0_4px_16px_rgba(16,185,129,0.25)] hover:bg-emerald-500/10 hover:scale-[1.02]">
          <p class="text-2xl font-black text-emerald-500 dark:text-emerald-400 tracking-tighter drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]">{{servicesData.finished}}</p>
          <p class="text-[8px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mt-1.5">{{ t('dashboard.widgets.services.finished') }}</p>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

