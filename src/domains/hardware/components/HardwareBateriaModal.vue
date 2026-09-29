<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  BatteryCharging01Icon,
  BatteryFullIcon,
  BatteryMedium01Icon,
  BatteryLowIcon,
  BatteryEmptyIcon,
  FlashOffIcon,
  RefreshIcon,
  Alert01Icon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons'
import { consultarEstadoCargaHardwareApi } from '../services/hardware.api'
import type { Hardware } from '../types/hardware'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import AppModal from '../../../components/ui/AppModal.vue'

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const { t } = useI18n()
const groupStore = useGroupStore()

interface EstadoCarga {
  estaCargando: boolean
  horaServidor?: string
  cargando: boolean
  error: boolean
}

const estadoCarga = ref<EstadoCarga>({
  estaCargando: false,
  cargando: false,
  error: false
})

const MAX_INTENTOS = 6
const RETRY_DELAY_MS = 1500

const esFamiliaGL800 = computed(() => {
  if (!props.hardware) return false
  const fam = String(props.hardware.familia || '').toUpperCase().trim()
  const name = String(props.hardware.nombre || '').toUpperCase().trim()
  return fam.includes('GL800') || fam.includes('GL 800') || fam.includes('GL-800') || name.includes('GL800')
})

const nivelBateria = computed(() => {
  if (!props.hardware || props.hardware.bateria === undefined || props.hardware.bateria === null || props.hardware.bateria === '') {
    return null
  }
  const num = Number(props.hardware.bateria)
  return isNaN(num) ? null : Math.min(Math.max(num, 0), 100)
})

const getBatteryIcon = (nivel: number | null) => {
  if (nivel === null) return BatteryEmptyIcon
  if (nivel >= 75) return BatteryFullIcon
  if (nivel >= 40) return BatteryMedium01Icon
  if (nivel >= 15) return BatteryLowIcon
  return BatteryEmptyIcon
}

const getBatteryColorClass = (nivel: number | null) => {
  if (nivel === null) return 'text-slate-400 dark:text-slate-500'
  if (nivel >= 50) return 'text-emerald-500 dark:text-emerald-400'
  if (nivel >= 20) return 'text-amber-500 dark:text-amber-400'
  return 'text-rose-500 dark:text-rose-400'
}

const getBatteryBgClass = (nivel: number | null) => {
  if (nivel === null) return 'bg-slate-400 dark:bg-slate-600'
  if (nivel >= 50) return 'bg-emerald-500'
  if (nivel >= 20) return 'bg-amber-500'
  return 'bg-rose-500'
}

// Consulta el estado de carga en tiempo real para dispositivos GL800
const consultarEstado = async (intento = 1) => {
  if (!props.hardware || !groupStore.selectedGroup?.id || !esFamiliaGL800.value) return

  const idHardware = props.hardware.id_hardware
  const idGrupo = groupStore.selectedGroup.id

  if (intento === 1) {
    estadoCarga.value = {
      estaCargando: false,
      cargando: true,
      error: false
    }
  }

  try {
    const res = await consultarEstadoCargaHardwareApi({
      id_grupo: idGrupo,
      id_hardware: idHardware
    })

    if (!props.isOpen || props.hardware?.id_hardware !== idHardware) return

    if (res.done && res.data) {
      if (res.data.server_time === null || res.data.server_time === undefined || res.data.server_time === '') {
        if (intento < MAX_INTENTOS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
          if (!props.isOpen || props.hardware?.id_hardware !== idHardware) return
          return consultarEstado(intento + 1)
        }
      }

      estadoCarga.value = {
        estaCargando: Boolean(res.data.is_charging),
        horaServidor: res.data.server_time || undefined,
        cargando: false,
        error: false
      }
    } else {
      estadoCarga.value = {
        estaCargando: false,
        cargando: false,
        error: true
      }
    }
  } catch {
    if (!props.isOpen || props.hardware?.id_hardware !== idHardware) return
    if (intento < MAX_INTENTOS) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      if (!props.isOpen || props.hardware?.id_hardware !== idHardware) return
      return consultarEstado(intento + 1)
    }
    estadoCarga.value = {
      estaCargando: false,
      cargando: false,
      error: true
    }
  }
}

watch(() => props.isOpen, (abierto) => {
  if (abierto) {
    estadoCarga.value = {
      estaCargando: false,
      cargando: false,
      error: false
    }
    if (esFamiliaGL800.value) {
      consultarEstado()
    }
  }
})

const handleClose = () => {
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    :title="t('hardware.batteryModalTitle')"
    size="md"
    :show-footer="false"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="BatteryCharging01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 p-1">
      <!-- Dispositivo Seleccionado -->
      <div class="bg-slate-50 dark:bg-[#0F1115] border border-slate-200/80 dark:border-white/5 rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h4 class="text-sm font-bold text-slate-800 dark:text-white truncate">
              {{ hardware?.nombre || 'Dispositivo' }}
            </h4>
            <p v-if="hardware?.descripcion" class="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
              {{ hardware.descripcion }}
            </p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span v-if="hardware?.familia" class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#3b82f6] dark:text-[#5da6fc] border border-blue-200/50 dark:border-blue-500/20">
              {{ hardware.familia }}
            </span>
          </div>
        </div>
      </div>

      <!-- Nivel de Batería -->
      <div class="bg-white dark:bg-[#13161C] border border-slate-200/70 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {{ t('hardware.batteryLevel') }}
          </span>
          <div class="flex items-center gap-1.5">
            <HugeiconsIcon :icon="getBatteryIcon(nivelBateria)" :size="18" :class="getBatteryColorClass(nivelBateria)" />
            <span class="text-lg font-black tracking-tight" :class="getBatteryColorClass(nivelBateria)">
              {{ nivelBateria !== null ? `${nivelBateria}%` : '---' }}
            </span>
          </div>
        </div>

        <div class="w-full h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/5">
          <div 
            class="h-full rounded-full transition-all duration-500"
            :class="getBatteryBgClass(nivelBateria)"
            :style="{ width: `${nivelBateria !== null ? nivelBateria : 0}%` }"
          ></div>
        </div>
      </div>

      <!-- Estado de Carga -->
      <div v-if="esFamiliaGL800" class="bg-white dark:bg-[#13161C] border border-slate-200/70 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {{ t('hardware.chargingStatus') }}
          </span>
          <button
            v-if="!estadoCarga.cargando"
            type="button"
            @click="consultarEstado(1)"
            class="p-1.5 rounded-lg text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            :title="t('hardware.btnRefreshStatus')"
          >
            <HugeiconsIcon :icon="RefreshIcon" :size="14" />
          </button>
        </div>

        <!-- Consultando... -->
        <div v-if="estadoCarga.cargando" class="flex items-center gap-3 py-3 px-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
          <HugeiconsIcon :icon="RefreshIcon" :size="16" class="animate-spin text-[#3b82f6]" />
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {{ t('hardware.consultingCharging') }}
          </span>
        </div>

        <!-- Está Cargando -->
        <div v-else-if="estadoCarga.estaCargando" class="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <div class="flex items-center gap-3">
            <HugeiconsIcon :icon="BatteryCharging01Icon" :size="20" class="animate-pulse shrink-0 text-emerald-500" />
            <div>
              <p class="text-xs font-bold">{{ t('hardware.charging') }}</p>
              <p v-if="estadoCarga.horaServidor" class="text-[10px] opacity-75 font-mono mt-0.5">
                {{ t('hardware.lastReportTime') }}: {{ estadoCarga.horaServidor }}
              </p>
            </div>
          </div>
        </div>

        <!-- Sin Carga -->
        <div v-else-if="!estadoCarga.error" class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300">
          <div class="flex items-center gap-3">
            <HugeiconsIcon :icon="FlashOffIcon" :size="20" class="opacity-70 shrink-0" />
            <div>
              <p class="text-xs font-bold">{{ t('hardware.notCharging') }}</p>
              <p v-if="estadoCarga.horaServidor" class="text-[10px] opacity-75 font-mono mt-0.5">
                {{ t('hardware.lastReportTime') }}: {{ estadoCarga.horaServidor }}
              </p>
            </div>
          </div>
        </div>

        <!-- Error al consultar -->
        <div v-else class="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <div class="flex items-center gap-2">
            <HugeiconsIcon :icon="Alert01Icon" :size="16" class="shrink-0" />
            <span class="text-xs font-semibold">Error al consultar carga</span>
          </div>
          <button
            type="button"
            @click="consultarEstado(1)"
            class="text-[11px] font-bold underline hover:opacity-80 cursor-pointer"
          >
            {{ t('hardware.retry') }}
          </button>
        </div>
      </div>

      <!-- Info para otras familias -->
      <div v-else class="flex items-center gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-slate-400 dark:text-slate-500">
        <HugeiconsIcon :icon="InformationCircleIcon" :size="16" class="shrink-0 opacity-70" />
        <span class="text-[11px] font-medium leading-tight">
          {{ t('hardware.chargingNotSupported') }}
        </span>
      </div>

      <!-- Botón de Cerrar -->
      <div class="pt-2 flex justify-end">
        <button
          type="button"
          @click="handleClose"
          class="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-all cursor-pointer"
        >
          {{ t('hardware.btnClose', 'Cerrar') }}
        </button>
      </div>
    </div>
  </AppModal>
</template>
