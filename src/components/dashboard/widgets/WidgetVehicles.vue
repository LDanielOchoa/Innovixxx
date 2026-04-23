<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Car01Icon, Search01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

const { t } = useI18n()

const isLoading = ref(true)
const vehicleSearch = ref('')
const vehiclesList = ref([
  { plate: 'ABC-123', status: 'onRoute', hasAlarm: false },
  { plate: 'XYZ-987', status: 'stoppedAlarm', hasAlarm: true },
  { plate: 'JKL-456', status: 'onRoute', hasAlarm: false },
  { plate: 'MNO-654', status: 'workshop', hasAlarm: false },
  { plate: 'PQR-321', status: 'onRouteAlarm', hasAlarm: true },
  { plate: 'STU-987', status: 'inactive', hasAlarm: false },
  { plate: 'VWX-654', status: 'onRoute', hasAlarm: false },
])

const statusOptions = [
  { status: 'onRoute', hasAlarm: false },
  { status: 'stoppedAlarm', hasAlarm: true },
  { status: 'workshop', hasAlarm: false },
  { status: 'onRouteAlarm', hasAlarm: true },
  { status: 'inactive', hasAlarm: false },
]

const getStatusLabel = (statusKey: string) => {
  return t(`dashboard.widgets.vehicles.status.${statusKey}`)
}

let updateInterval: ReturnType<typeof setInterval> | null = null

const filteredVehicles = computed(() => {
  if (!vehicleSearch.value) return vehiclesList.value
  const q = vehicleSearch.value.toLowerCase()
  return vehiclesList.value.filter(v => v.plate.toLowerCase().includes(q))
})

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
    updateInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * vehiclesList.value.length)
      const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)]!
      const vehicle = vehiclesList.value[randomIndex]!
      vehicle.status = randomStatus.status
      vehicle.hasAlarm = randomStatus.hasAlarm
    }, 8000)
  }, 400)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.vehicles.title')" :icon="Car01Icon" :loading="isLoading">
    <div class="flex flex-col gap-4">
      <!-- Buscador Compacto -->
      <div class="relative group/search">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#3b82f6] transition-colors">
          <Search01Icon :size="14" />
        </div>
        <input 
          v-model="vehicleSearch" 
          type="text" 
          :placeholder="t('dashboard.widgets.vehicles.searchPlaceholder')"
          class="w-full bg-slate-50/50 dark:bg-[#13161C]/60 border border-slate-200/60 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[11px] font-black text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-[#3b82f6]/5 transition-all placeholder-slate-400 dark:placeholder-slate-700 uppercase tracking-widest"
        />
      </div>

      <!-- Lista de Vehículos -->
      <div class="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
        <div 
          v-for="(car, i) in filteredVehicles" 
          :key="i"
          class="flex items-center justify-between p-3 bg-white/50 dark:bg-[#13161C]/60 rounded-xl border border-slate-200/60 dark:border-white/5 transition-all duration-300 hover:translate-x-1 hover:border-[#3b82f6]/30 group/item cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <div :class="[
              'w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]',
              car.hasAlarm ? 'bg-red-500 shadow-red-500/50 animate-pulse' : 'bg-emerald-500 shadow-emerald-500/50'
            ]"></div>
            <div>
              <p class="text-xs font-black text-slate-700 dark:text-white tracking-widest uppercase">{{car.plate}}</p>
              <p class="text-[8px] font-black uppercase tracking-widest mt-0.5" :class="car.hasAlarm ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'">
                {{ getStatusLabel(car.status) }}
              </p>
            </div>
          </div>
          <ArrowRight01Icon :size="14" class="text-slate-300 dark:text-slate-700 group-hover/item:text-[#3b82f6] transition-colors" />
        </div>
      </div>
    </div>
  </WidgetCard>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(93, 166, 252, 0.2); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(93, 166, 252, 0.4); }
</style>

