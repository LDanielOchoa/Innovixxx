<script setup lang="ts">
import { ref, watch } from 'vue'
import WidgetCard from '../ui/WidgetCard.vue'
import { Car01Icon } from '@hugeicons/core-free-icons'

const props = defineProps<{
  total?: number
  isLive?: boolean
}>()

const isLoading = ref(true)
const vehiculosTotal = ref(0)

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
    vehiculosTotal.value = 0
    isLoading.value = true
  }
}, { immediate: true })

watch(() => props.total, (newVal) => {
  if (newVal !== undefined) {
    isLoading.value = false
    animateValue(newVal, 800, (val) => vehiculosTotal.value = val)
  }
}, { immediate: true })
</script>

<template>
  <WidgetCard title="Vehículos" :icon="Car01Icon" :loading="false">
    <!-- Skeleton Loader -->
    <div v-if="isLoading" class="animate-pulse">
      <div class="h-[68px] bg-slate-100 dark:bg-white/5 rounded-xl"></div>
    </div>

    <!-- Contenido Real -->
    <div v-else>
      <div class="bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-xl border border-slate-200/50 dark:border-white/5 p-3 text-center transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 group/device">
        <div class="flex flex-col items-center">
          <p class="text-3xl font-black text-slate-700 dark:text-white leading-none tracking-tighter group-hover/device:scale-110 transition-transform duration-500">
            {{ vehiculosTotal }}
          </p>
          <div class="flex items-center gap-1.5 mt-2.5">
            <p class="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-black">
              Total Vehículos
            </p>
          </div>
        </div>
      </div>
    </div>
  </WidgetCard>
</template>
