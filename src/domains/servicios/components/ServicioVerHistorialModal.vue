<script setup lang="ts">
import { ref, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Clock01Icon,
  Cancel01Icon,
  Loading03Icon,
  Alert01Icon
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

const eventoLabels: Record<number, string> = {
  1: 'Servicio creado',
  2: 'En espera',
  3: 'En ejecución',
  4: 'Ejecución fallida',
  5: 'Finalizado',
  6: 'Recurso asignado',
  7: 'Recurso removido',
  8: 'Novedad',
  9: 'Ruta cambiada',
  10: 'Escolta actualizado',
  11: 'Vehículo actualizado'
}

const eventoColors: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  2: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  3: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  4: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  5: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
  6: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  7: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  8: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  9: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
  10: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
  11: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/20'
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
      <Transition name="fade">
        <div v-if="isLoading" class="space-y-4 animate-pulse p-2">
          <div v-for="i in 5" :key="i" class="flex items-start gap-3">
            <div class="w-16 h-5 bg-slate-200/60 dark:bg-white/[0.06] rounded-lg"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 w-3/4 bg-slate-200/50 dark:bg-white/[0.04] rounded-full"></div>
              <div class="h-2 w-1/2 bg-slate-200/40 dark:bg-white/[0.03] rounded-full"></div>
            </div>
          </div>
        </div>
      </Transition>

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

      <div v-if="!isLoading && historial.length > 0" class="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        <div
          v-for="(item, index) in historial"
          :key="index"
          class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div class="flex flex-col items-center">
            <div class="w-2 h-2 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] shrink-0"></div>
            <div v-if="index < historial.length - 1" class="w-px flex-1 bg-slate-200 dark:bg-white/10 mt-1"></div>
          </div>
          <div class="flex-1 min-w-0 pb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                :class="eventoColors[item.evento] || 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'"
              >
                {{ eventoLabels[item.evento] || `Evento ${item.evento}` }}
              </span>
              <span class="text-[10px] text-slate-400 flex items-center gap-1">
                <HugeiconsIcon :icon="Clock01Icon" :size="10" />
                {{ formatDate(item.created_at) }}
              </span>
            </div>
            <p v-if="item.descripcion" class="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
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