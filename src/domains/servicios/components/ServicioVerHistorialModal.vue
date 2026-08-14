<script setup lang="ts">
import { ref, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Clock01Icon,
  Alert01Icon,
  Tick02Icon,
  UserMultipleIcon,
  Route01Icon,
  HardDriveIcon,
  Car01Icon,
  UserArrowLeftRightIcon,
  UserAdd01Icon,
  ArrowTurnBackwardIcon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { verHistorialServicioApi } from '../services/servicios.api'
import type { Servicio, ServicioHistorialItem } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | null
}>()

const emit = defineEmits(['update:isOpen'])

const isLoading = ref(true)
const historial = ref<ServicioHistorialItem[]>([])
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

type IconType = typeof Clock01Icon

const eventoLabels: Record<number, string> = {
  1: 'Servicio creado',
  2: 'Recursos asignados',
  3: 'Ruta modificada',
  4: 'Hardware actualizado',
  5: 'Vehículo actualizado',
  6: 'Escolta actualizado',
  7: 'Escolta agregado',
  8: 'Estado actualizado'
}

const eventoBadgeColors: Record<number, string> = {
  1: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  2: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  3: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
  4: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  5: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  6: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  7: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
  8: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
}

const eventoNodeStyles: Record<number, string> = {
  1: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  2: 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400',
  3: 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
  4: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400',
  5: 'bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400',
  6: 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400',
  7: 'bg-teal-50 dark:bg-teal-500/15 border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400',
  8: 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
}

const eventoIconos: Record<number, IconType> = {
  1: Tick02Icon,
  2: UserMultipleIcon,
  3: Route01Icon,
  4: HardDriveIcon,
  5: Car01Icon,
  6: UserArrowLeftRightIcon,
  7: UserAdd01Icon,
  8: ArrowTurnBackwardIcon
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] || ''
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year} ${timePart.substring(0, 5)}`
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    modalMessage.value = null
    historial.value = []

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    try {
      const data = await verHistorialServicioApi({
        id_grupo: groupStore.selectedGroup.id,
        id_servicio: props.servicio.id_servicio
      })

      if (data.done) {
        historial.value = data.data || []
      } else {
        modalMessage.value = { text: data.message || 'Error al cargar el historial.', type: 'error' }
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
      modalMessage.value = { text: 'Error de conexión con el servidor.', type: 'error' }
    } finally {
      isLoading.value = false
    }
  }
})

const obtenerDiferenciaTiempo = (fechaReciente: string, fechaAntigua: string): string => {
  if (!fechaReciente || !fechaAntigua) return ''
  try {
    const parseDate = (str: string): Date => {
      const parts = str.split(' ')
      const dateParts = parts[0].split('-')
      const timeParts = (parts[1] || '00:00:00').split(':')
      return new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
        parseInt(timeParts[2] || '0')
      )
    }

    const d1 = parseDate(fechaReciente)
    const d2 = parseDate(fechaAntigua)
    const diffMs = d1.getTime() - d2.getTime()
    if (diffMs <= 0) return ''

    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) {
      const diffSecs = Math.floor(diffMs / 1000)
      return `${diffSecs}s`
    }
    
    if (diffMins < 60) {
      return `${diffMins} min`
    }
    
    const diffHours = Math.floor(diffMins / 60)
    const remainingMins = diffMins % 60
    
    if (diffHours < 24) {
      return remainingMins > 0 ? `${diffHours}h ${remainingMins}m` : `${diffHours}h`
    }
    
    const diffDays = Math.floor(diffHours / 24)
    const remainingHours = diffHours % 24
    if (remainingHours > 0) {
      return `${diffDays}d ${remainingHours}h`
    }
    return `${diffDays}d`
  } catch (e) {
    return ''
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    title="Historial del Servicio"
    confirm-text="Cerrar"
    size="md"
    :show-footer="true"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Clock01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative p-1">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-3 animate-pulse py-2">
        <div v-for="i in 3" :key="i" class="p-3 bg-slate-100/50 dark:bg-white/[0.03] rounded-xl space-y-2">
          <div class="h-3 w-1/4 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-2.5 w-2/3 bg-slate-200/40 dark:bg-white/[0.04] rounded-full"></div>
        </div>
      </div>

      <!-- Alert Message -->
      <div
        v-if="modalMessage"
        class="flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold"
        :class="{
          'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400': modalMessage.type === 'error',
          'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400': modalMessage.type === 'warning',
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400': modalMessage.type === 'success'
        }"
      >
        <HugeiconsIcon
          :icon="modalMessage.type === 'error' || modalMessage.type === 'warning' ? Alert01Icon : Clock01Icon"
          :size="16"
          class="shrink-0"
        />
        <span class="flex-1">{{ modalMessage.text }}</span>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && historial.length === 0 && !modalMessage" class="py-10 text-center">
        <p class="text-xs font-medium text-slate-400 dark:text-slate-500">No hay registros de historial para este servicio.</p>
      </div>

      <!-- Lista de Historial -->
      <div v-if="!isLoading && historial.length > 0" class="max-h-[460px] overflow-y-auto custom-scrollbar space-y-4 pr-1 py-1">
        <div
          v-for="(item, index) in historial"
          :key="index"
          class="relative flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#13161C]/50"
        >
          <!-- Badge de diferencia de tiempo centrado entre dos tarjetas -->
          <div
            v-if="index < historial.length - 1 && obtenerDiferenciaTiempo(item.created_at, historial[index + 1].created_at)"
            class="absolute left-1/2 -bottom-3 -translate-x-1/2 z-20 pointer-events-none"
          >
            <span class="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold tracking-wider bg-white dark:bg-[#1A1D24] text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10 px-2 py-0.5 rounded-full shadow-xs">
              <HugeiconsIcon :icon="Clock01Icon" :size="10" />
              +{{ obtenerDiferenciaTiempo(item.created_at, historial[index + 1].created_at) }}
            </span>
          </div>

          <!-- Icono del Evento -->
          <div
            :class="[
              'w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border text-slate-600 dark:text-slate-300',
              eventoNodeStyles[item.evento] || 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'
            ]"
          >
            <HugeiconsIcon :icon="eventoIconos[item.evento] || Alert01Icon" :size="17" :stroke-width="2" />
          </div>

          <div class="flex-1 min-w-0 flex flex-col gap-1">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span
                :class="[
                  'text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border',
                  eventoBadgeColors[item.evento] || 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                ]"
              >
                {{ eventoLabels[item.evento] || `Evento ${item.evento}` }}
              </span>

              <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {{ formatDate(item.created_at) }}
              </span>
            </div>

            <p v-if="item.descripcion" class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {{ item.descripcion }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
