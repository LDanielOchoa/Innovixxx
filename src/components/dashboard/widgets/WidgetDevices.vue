<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { CpuIcon } from '@hugeicons/core-free-icons'

const { t } = useI18n()

const props = defineProps<{
  online?: number
  inactive?: number
  total?: number
  isLive?: boolean
}>()

const isLoading = ref(true)
const linkedDevices = ref({ online: 0, inactive: 0, total: 0 })

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
    linkedDevices.value = { online: 0, inactive: 0, total: 0 }
    isLoading.value = true
  }
}, { immediate: true })

watch(() => props.online, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 800, (val) => linkedDevices.value.online = val)
  }
}, { immediate: true })

watch(() => props.inactive, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 800, (val) => linkedDevices.value.inactive = val)
  }
}, { immediate: true })

watch(() => props.total, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 800, (val) => linkedDevices.value.total = val)
  }
}, { immediate: true })
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.devices.title')" :icon="CpuIcon" :loading="false">
    <!-- Skeleton Loader -->
    <div v-if="isLoading" class="animate-pulse grid grid-cols-3 gap-1.5">
      <div class="h-[68px] bg-slate-100 dark:bg-white/5 rounded-xl"></div>
      <div class="h-[68px] bg-slate-100 dark:bg-white/5 rounded-xl"></div>
      <div class="h-[68px] bg-slate-100 dark:bg-white/5 rounded-xl"></div>
    </div>

    <!-- Contenido Real -->
    <div v-else class="grid grid-cols-3 gap-1.5">
      <!-- Activos -->
      <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-2 text-center transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 group/device">
        <div class="flex flex-col items-center">
          <p class="text-2xl font-black text-[#3b82f6] dark:text-[#5da6fc] leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500 drop-shadow-[0_2px_10px_rgba(59,130,246,0.3)]">{{linkedDevices.online}}</p>
          <div class="flex items-center gap-1 mt-2.5">
            <span class="w-1 h-1 rounded-full bg-[#3b82f6] animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
            <p class="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-black">Activos</p>
          </div>
        </div>
      </div>

      <!-- Inactivos -->
      <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-2 text-center transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 group/device">
        <div class="flex flex-col items-center">
          <p class="text-2xl font-black text-rose-500 dark:text-rose-400 leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500 drop-shadow-[0_2px_10px_rgba(244,63,94,0.3)]">{{linkedDevices.inactive}}</p>
          <div class="flex items-center gap-1 mt-2.5">
            <span class="w-1 h-1 rounded-full bg-rose-500"></span>
            <p class="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-black">Inactivos</p>
          </div>
        </div>
      </div>

      <!-- Total -->
      <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-2 text-center transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 group/device">
        <div class="flex flex-col items-center">
          <p class="text-2xl font-black text-slate-700 dark:text-white leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500">{{linkedDevices.total}}</p>
          <div class="flex items-center gap-1 mt-2.5">
            <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <p class="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-black">Total</p>
          </div>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>
