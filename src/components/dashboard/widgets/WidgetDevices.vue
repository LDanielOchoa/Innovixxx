<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { CpuIcon } from '@hugeicons/core-free-icons'

const { t } = useI18n()

const isLoading = ref(true)
const linkedDevices = ref({ online: 0, total: 0 })
const targetValues = { online: 124, total: 150 }

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

let updateInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    setTimeout(() => {
      animateValue(targetValues.online, 1200, (val) => linkedDevices.value.online = val)
      animateValue(targetValues.total, 1400, (val) => linkedDevices.value.total = val)

      updateInterval = setInterval(() => {
        const onlineChange = Math.random() > 0.5 ? 1 : -1
        linkedDevices.value.online = Math.max(0, linkedDevices.value.online + onlineChange)
        if (Math.random() > 0.7) {
          linkedDevices.value.total = Math.max(linkedDevices.value.online, linkedDevices.value.total + 1)
        }
      }, 5000)
    }, 100)
  }, 400)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.devices.title')" :icon="CpuIcon" :loading="isLoading">
    <div class="flex justify-between items-stretch gap-4">
      <div class="flex-1 bg-white/50 dark:bg-[#13161C]/60 rounded-xl border border-slate-200/60 dark:border-white/5 p-3.5 text-center transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-white/10 shadow-sm group/device">
        <div class="flex flex-col items-center">
          <p class="text-3xl font-black text-[#3b82f6] dark:text-[#5da6fc] leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500">{{linkedDevices.online}}</p>
          <div class="flex items-center gap-1.5 mt-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-black">{{ t('dashboard.widgets.devices.online') }}</p>
          </div>
        </div>
      </div>
      <div class="flex-1 bg-white/50 dark:bg-[#13161C]/60 rounded-xl border border-slate-200/60 dark:border-white/5 p-3.5 text-center transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-white/10 shadow-sm group/device">
        <div class="flex flex-col items-center">
          <p class="text-3xl font-black text-slate-700 dark:text-white leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500">{{linkedDevices.total}}</p>
          <div class="flex items-center gap-1.5 mt-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-black">{{ t('dashboard.widgets.devices.linked') }}</p>
          </div>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

