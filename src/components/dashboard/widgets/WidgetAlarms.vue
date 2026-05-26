<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Alert02Icon } from '@hugeicons/core-free-icons'

const { t } = useI18n()

const isLoading = ref(true)
const alarmsData = ref({
  today: 0,
  targetToday: 30,
  list: [] as { time: string; car: string; issue: string; id: number }[]
})

const alarmTemplates = [
  { car: 'ABC-123', issue: 'overspeed' },
  { car: 'XYZ-987', issue: 'hardBraking' },
  { car: 'JKL-456', issue: 'routeDeviation' },
  { car: 'MNO-654', issue: 'engineOff' },
  { car: 'PQR-321', issue: 'lowBattery' },
  { car: 'STU-987', issue: 'acceleration' },
  { car: 'VWX-654', issue: 'overspeed' },
  { car: 'DEF-111', issue: 'doorOpen' },
]

const issues = ['overspeed', 'hardBraking', 'routeDeviation', 'engineOff', 'lowBattery']

const getAlarmLabel = (issueKey: string) => {
  return t(`dashboard.widgets.alarms.alarmTypes.${issueKey}`)
}

let alarmInterval: ReturnType<typeof setInterval> | null = null
let todayInterval: ReturnType<typeof setInterval> | null = null
let idCounter = 0

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const period = date.getHours() >= 12 ? 'P.M.' : 'A.M.'
  return `${hours}:${minutes} ${period}`
}

const animateTodayValue = () => {
  const duration = 1500
  const startTime = performance.now()
  const target = alarmsData.value.targetToday

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOut = 1 - Math.pow(1 - progress, 3)
    alarmsData.value.today = Math.round(target * easeOut)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const addAlarm = () => {
  const template = alarmTemplates[Math.floor(Math.random() * alarmTemplates.length)]!
  const randomIssue = issues[Math.floor(Math.random() * issues.length)]
  const issue = randomIssue || template.issue
  const now = new Date()

  const newAlarm = {
    id: idCounter++,
    time: formatTime(now),
    car: template.car,
    issue: issue
  }

  alarmsData.value.list.unshift(newAlarm)
  if (alarmsData.value.list.length > 5) alarmsData.value.list.pop()
}

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    animateTodayValue()
    setTimeout(() => addAlarm(), 500)
    setTimeout(() => addAlarm(), 1200)

    alarmInterval = setInterval(() => {
      if (Math.random() > 0.3) addAlarm()
    }, 4000)

    todayInterval = setInterval(() => {
      alarmsData.value.today += Math.random() > 0.5 ? 1 : 0
    }, 8000)
  }, 350)
})

onUnmounted(() => {
  if (alarmInterval) clearInterval(alarmInterval)
  if (todayInterval) clearInterval(todayInterval)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.alarms.title')" :icon="Alert02Icon" :loading="isLoading" class="h-full">
    <div class="flex flex-col gap-4 h-full">
      <!-- Resumen Crítico -->
      <div class="flex items-center gap-3 bg-red-500/5 dark:bg-[#0F1115]/80 rounded-xl border border-red-500/20 dark:border-red-500/10 p-3 relative overflow-hidden group/alert transition-all duration-300 shadow-[inset_0_2px_8px_rgba(239,68,68,0.05)] dark:shadow-[inset_0_2px_12px_rgba(239,68,68,0.15)] hover:shadow-[inset_0_4px_12px_rgba(239,68,68,0.1)] dark:hover:shadow-[inset_0_4px_16px_rgba(239,68,68,0.25)] hover:bg-red-500/10">
        <div class="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] group-hover/alert:scale-105 transition-transform duration-500">
          <span class="text-xl font-black">{{alarmsData.today}}</span>
          <div class="absolute inset-0 rounded-xl border border-red-400 animate-ping opacity-20"></div>
        </div>
        <div>
          <p class="text-xs font-black text-slate-800 dark:text-white tracking-tight">{{ t('dashboard.widgets.alarms.criticalAlerts') }}</p>
          <p class="text-[8px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mt-0.5">{{ t('dashboard.widgets.alarms.attentionRequired') }}</p>
        </div>
        <!-- Shine -->
        <div class="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] group-hover/alert:left-[100%] transition-all duration-1000"></div>
      </div>

      <!-- Lista de Alarmas -->
      <div class="flex-1 relative overflow-hidden">
        <TransitionGroup name="alarm-card" tag="div" class="flex flex-col gap-1.5 h-full overflow-y-auto custom-scrollbar pr-1">
          <div v-for="alarm in alarmsData.list" :key="alarm.id" class="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-lg border border-slate-200/50 dark:border-white/5 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:translate-x-1 hover:border-[#3b82f6]/30">
            <div class="flex items-center gap-2.5">
               <div class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
               <span class="text-slate-400 dark:text-slate-500 text-[9px] font-black w-10 uppercase tracking-tighter">{{alarm.time}}</span>
               <span class="text-slate-700 dark:text-white font-black text-xs tracking-tight">{{alarm.car}}</span>
            </div>
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-[0.1em] backdrop-blur-md transition-colors duration-300"
                  :class="[
                    'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 dark:border-red-500/10 hover:bg-red-500/20'
                  ]">
              {{ getAlarmLabel(alarm.issue) }}
            </span>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </WidgetCard>
</template>

<style scoped>
.alarm-card-enter-active { transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.alarm-card-leave-active { transition: all 0.3s ease-out; position: absolute; width: 100%; }
.alarm-card-enter-from { opacity: 0; transform: translateX(-20px) scale(0.95); }
.alarm-card-leave-to { opacity: 0; transform: translateX(20px) scale(0.95); }
.alarm-card-move { transition: transform 0.4s ease; }
</style>

