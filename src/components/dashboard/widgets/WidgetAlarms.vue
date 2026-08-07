<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import WidgetCard from '../ui/WidgetCard.vue'
import { Alert02Icon } from '@hugeicons/core-free-icons'

interface AlertaResumen {
  SOS: number
  velocidad: number
  ruta_alejamiento: number
  candado_open: number
  candado_close: number
  ruta_retorno: number
}

interface AlertaDetalle {
  id_grupo: number
  id_servicio: number
  id_hardware: number
  tipo: number
  lat: string
  lon: string
  fecha_hora: string
  token: string
  in_main_db: boolean
  ws_sync: boolean
}

const props = defineProps<{
  alertas?: AlertaResumen | null
  alertasDetalle?: AlertaDetalle[]
  isLive?: boolean
}>()

const { t } = useI18n()
const isLoading = ref(true)

const emit = defineEmits<{
  (e: 'selectAlert', alerta: AlertaDetalle): void
}>()

const getNombreTipoAlerta = (tipo: number): string => {
  switch (tipo) {
    case 1:
      return t('dashboard.tacticalMap.overspeed') || 'Exceso de velocidad'
    case 2:
      return t('dashboard.tacticalMap.sos') || 'SOS / Emergencia'
    case 3:
      return t('dashboard.tacticalMap.routeDeviation') || 'Alejamiento de ruta'
    case 4:
      return t('dashboard.tacticalMap.lockOpen') || 'Candado abierto'
    case 5:
      return t('dashboard.tacticalMap.lockClose') || 'Candado cerrado'
    case 6:
      return t('dashboard.tacticalMap.routeReturn') || 'Retorno Ruta'
    default:
      return `Alerta tipo ${tipo}`
  }
}

// Suma total de alertas críticas
const totalAlertasCount = computed(() => {
  if (!props.alertas) return 0
  const a = props.alertas
  return (a.SOS || 0) + (a.velocidad || 0) + (a.ruta_alejamiento || 0) + (a.candado_open || 0) + (a.candado_close || 0) + (a.ruta_retorno || 0)
})

// Lista procesada de alertas_detalle reales ordenada de más reciente a menos reciente
const alarmList = computed(() => {
  if (!props.alertasDetalle || props.alertasDetalle.length === 0) return []
  
  // Ordenar copia por fecha_hora descendente (más reciente primero)
  const ordenadas = [...props.alertasDetalle].sort((a, b) => {
    const fechaA = new Date(a.fecha_hora).getTime()
    const fechaB = new Date(b.fecha_hora).getTime()
    if (!isNaN(fechaA) && !isNaN(fechaB)) {
      return fechaB - fechaA
    }
    return 0
  })

  return ordenadas.map((alerta, index) => {
    let horaFormatted = ''
    if (alerta.fecha_hora) {
      const parts = alerta.fecha_hora.split(' ')
      if (parts.length > 1) {
        horaFormatted = parts[1] || alerta.fecha_hora
      } else {
        horaFormatted = alerta.fecha_hora
      }
    }

    return {
      id: `${alerta.id_hardware}-${alerta.fecha_hora}-${index}`,
      time: horaFormatted || '--:--',
      car: `HW #${alerta.id_hardware}`,
      issue: getNombreTipoAlerta(alerta.tipo),
      tipo: alerta.tipo,
      alertaOriginal: alerta
    }
  })
})

watch(() => props.isLive, (newVal) => {
  if (newVal) {
    isLoading.value = true
  }
}, { immediate: true })

watch(() => props.alertas, (newVal) => {
  if (newVal && (newVal.SOS !== undefined || newVal.velocidad !== undefined)) {
    isLoading.value = false
  }
}, { immediate: true })

watch(() => props.alertasDetalle, (newVal) => {
  if (newVal && newVal.length > 0) {
    isLoading.value = false
  }
}, { immediate: true })

onMounted(() => {
  // Sincronizar esqueleto visual con los demás widgets
  setTimeout(() => {
    if (props.alertas || (props.alertasDetalle && props.alertasDetalle.length > 0) || !props.isLive) {
      isLoading.value = false
    }
  }, 600)
})
</script>

<template>
  <WidgetCard :title="t('dashboard.widgets.alarms.title')" :icon="Alert02Icon" :loading="isLoading" class="h-full">
    <div class="flex flex-col gap-4 h-full">
      <!-- Resumen Crítico -->
      <div class="flex items-center gap-3 bg-red-500/5 dark:bg-[#0F1115]/80 rounded-xl border border-red-500/20 dark:border-red-500/10 p-3 relative overflow-hidden group/alert transition-all duration-300 shadow-[inset_0_2px_8px_rgba(239,68,68,0.05)] dark:shadow-[inset_0_2px_12px_rgba(239,68,68,0.15)] hover:shadow-[inset_0_4px_12px_rgba(239,68,68,0.1)] dark:hover:shadow-[inset_0_4px_16px_rgba(239,68,68,0.25)] hover:bg-red-500/10">
        <div class="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] group-hover/alert:scale-105 transition-transform duration-500">
          <span class="text-xl font-black">{{ totalAlertasCount }}</span>
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
          <div v-for="alarm in alarmList" :key="alarm.id" @click="emit('selectAlert', alarm.alertaOriginal)" class="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-[#0F1115]/50 rounded-lg border border-slate-200/50 dark:border-white/5 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] dark:hover:shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] hover:bg-slate-100/50 dark:hover:bg-[#0A0C10]/50 hover:translate-x-1 hover:border-[#3b82f6]/50 cursor-pointer">
            <div class="flex items-center gap-2.5">
               <div class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
               <span class="text-slate-400 dark:text-slate-500 text-[9px] font-black w-14 uppercase tracking-tighter">{{ alarm.time }}</span>
            </div>
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-[0.1em] backdrop-blur-md transition-colors duration-300 bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20 dark:border-red-500/10 hover:bg-red-500/20">
              {{ alarm.issue }}
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

