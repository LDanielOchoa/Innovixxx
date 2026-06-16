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

    <div class="flex flex-col gap-5 relative p-1">
      <div v-if="isLoading" class="space-y-4 animate-pulse p-2">
        <div v-for="i in 5" :key="i" class="flex items-start gap-4">
          <div class="w-10 h-10 bg-slate-200/60 dark:bg-white/[0.06] rounded-xl"></div>
          <div class="flex-1 space-y-2 pt-1">
            <div class="h-3 w-3/4 bg-slate-200/50 dark:bg-white/[0.04] rounded-full"></div>
            <div class="h-2 w-1/2 bg-slate-200/40 dark:bg-white/[0.03] rounded-full"></div>
          </div>
        </div>
      </div>

      <Transition name="message-fade">
        <div v-if="modalMessage"
             class="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border mb-4"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
             }">
          <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
          <HugeiconsIcon v-else :icon="Clock01Icon" :size="18" class="text-[#3b82f6]" />
          {{ modalMessage.text }}
        </div>
      </Transition>

      <div v-if="!isLoading && historial.length === 0 && !modalMessage" class="py-12 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <HugeiconsIcon :icon="Clock01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </div>
        <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Sin historial</h3>
        <p class="text-[13px] text-slate-400 mt-1">No hay registros de eventos para este servicio.</p>
      </div>

      <div v-if="!isLoading && historial.length > 0" class="relative max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pl-1 py-1">
        <div
          v-if="historial.length > 1"
          class="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-slate-200 via-slate-200/70 to-transparent dark:from-white/10 dark:via-white/[0.06]"
          aria-hidden="true"
        ></div>

        <div
          v-for="(item, index) in historial"
          :key="index"
          class="relative flex items-start gap-4 pb-7 last:pb-0 group"
        >
          <!-- Diferencia de tiempo con el evento anterior -->
          <div
            v-if="index < historial.length - 1 && obtenerDiferenciaTiempo(item.created_at, historial[index + 1].created_at)"
            class="absolute left-[20px] bottom-[-2px] h-[20px] -translate-x-1/2 flex items-center justify-center z-[20] pointer-events-none"
          >
            <span class="text-[8.5px] font-black tracking-widest bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded-full scale-[0.85] origin-center shadow-md whitespace-nowrap flex items-center gap-0.5">
              <HugeiconsIcon :icon="Clock01Icon" :size="9" />
              {{ obtenerDiferenciaTiempo(item.created_at, historial[index + 1].created_at) }}
            </span>
          </div>

          <div
            :class="[
              'relative z-10 w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border-2 shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:shadow',
              eventoNodeStyles[item.evento] || 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'
            ]"
          >
            <HugeiconsIcon :icon="eventoIconos[item.evento] || Alert01Icon" :size="18" :stroke-width="2" />
          </div>

          <div class="flex-1 min-w-0 pt-0.5">
            <div class="flex items-center justify-between gap-2 flex-wrap mb-1.5">
              <span
                :class="[
                  'inline-flex items-center text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border',
                  eventoBadgeColors[item.evento] || 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                ]"
              >
                {{ eventoLabels[item.evento] || `Evento ${item.evento}` }}
              </span>
              <span class="text-[10.5px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium tabular-nums">
                <HugeiconsIcon :icon="Clock01Icon" :size="11" />
                {{ formatDate(item.created_at) }}
              </span>
            </div>
            <p
              v-if="item.descripcion"
              class="text-[12.5px] text-slate-600 dark:text-slate-400 leading-relaxed"
            >
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
