<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Route01Icon } from '@hugeicons/core-free-icons'

const { t } = useI18n()

const isLoading = ref(true)
const kmData = ref({
  total: '0',
  today: '0'
})

let updateInterval: ReturnType<typeof setInterval> | null = null
const targetValues = { total: 124540, today: 342 }

const formatNumber = (num: number): string => {
  return num.toLocaleString('es-CO')
}

const animateValue = (target: number, duration: number, callback: (val: string) => void) => {
  const startTime = performance.now()
  const startValue = 0

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const currentValue = Math.round(startValue + (target - startValue) * easeOut)
    callback(formatNumber(currentValue))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    setTimeout(() => {
      animateValue(targetValues.total, 1500, (val) => kmData.value.total = val)
      animateValue(targetValues.today, 1000, (val) => kmData.value.today = val)

      updateInterval = setInterval(() => {
        const currentTotal = parseInt(kmData.value.total.replace(/[^0-9]/g, ''))
        const currentToday = parseInt(kmData.value.today.replace(/[^0-9]/g, ''))
        const newTotal = currentTotal + Math.floor(Math.random() * 3) + 1
        const newToday = currentToday + Math.floor(Math.random() * 2) + 1
        kmData.value.total = formatNumber(newTotal)
        kmData.value.today = formatNumber(newToday)
      }, 6000)
    }, 100)
  }, 400)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.kilometers.title')" :icon="Route01Icon" :loading="isLoading">
    <div class="space-y-3">
      <div class="bg-white/50 dark:bg-[#13161C]/60 rounded-xl border border-slate-200/60 dark:border-white/5 p-3 flex justify-between items-center group/item transition-all duration-300 hover:bg-white dark:hover:bg-white/5">
        <div>
          <p class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{{ t('dashboard.widgets.kilometers.history') }}</p>
          <p class="text-xl font-black text-slate-800 dark:text-white tracking-tighter">{{kmData.total}} <span class="text-[9px] text-slate-400 dark:text-slate-600">KM</span></p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-slate-700">
           <Route01Icon :size="18" />
        </div>
      </div>

      <div class="bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 rounded-xl border border-[#3b82f6]/20 dark:border-[#3b82f6]/10 p-3 flex justify-between items-center group/item transition-all duration-300 hover:bg-[#3b82f6]/10 shadow-[inset_0_2px_4px_rgba(59,130,246,0.05)]">
        <div>
          <p class="text-[8px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-widest mb-0.5">{{ t('dashboard.widgets.kilometers.today') }}</p>
          <p class="text-xl font-black text-[#3b82f6] dark:text-[#5da6fc] tracking-tighter">{{kmData.today}} <span class="text-[9px] opacity-60">KM</span></p>
        </div>
        <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6]">
           <Route01Icon :size="18" />
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

