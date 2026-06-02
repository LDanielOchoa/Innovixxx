<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Loading03Icon,
  Alert01Icon,
  Tick01Icon,
  Edit01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { cambiarEstadoServicioApi, fetchServicioDashboardApi } from '../services/servicios.api'
import type { Servicio } from '../types/servicio'
import {
  SERVICIO_ESTADOS,
  SERVICIO_ESTADOS_LABELS,
  SERVICIO_ESTADOS_VALID_NEXT_PROD,
  SERVICIO_ESTADOS_VALID_NEXT_DEV
} from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | null
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

const isLoading = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const estadoActual = ref<number>(0)
const nuevoEstado = ref<number>(0)
const descripcion = ref('')

const USE_DEV_MODE = false

const validNextStates = computed(() => {
  const map = USE_DEV_MODE ? SERVICIO_ESTADOS_VALID_NEXT_DEV : SERVICIO_ESTADOS_VALID_NEXT_PROD
  return map[estadoActual.value] || []
})

const estadoActualLabel = computed(() => {
  return SERVICIO_ESTADOS_LABELS[estadoActual.value] || 'Desconocido'
})

const estadoActualColor = computed(() => {
  const colors: Record<number, string> = {
    1: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    2: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    3: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    4: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
    5: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
    6: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20'
  }
  return colors[estadoActual.value] || colors[1]
})

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const estadoKeyToNumber = (estadoStr: string): number => {
  const map: Record<string, number> = {
    'PRERCARGA': 1,
    'EN_ESPERA': 2,
    'EJECUCION_OK': 3,
    'EJECUCION_FAIL': 4,
    'FINALIZADO': 5,
    'EJECUCION NOVEDAD': 4
  }
  return map[estadoStr.toUpperCase()] || 0
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    descripcion.value = ''
    nuevoEstado.value = 0
    estadoActual.value = 0

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    try {
      const dashboardData = await fetchServicioDashboardApi({
        id_grupo: groupStore.selectedGroup.id,
        id_servicio: props.servicio.id_servicio,
        estado: 0
      })

      if (dashboardData.done && dashboardData.data.servicios.length > 0) {
        const servicioData = dashboardData.data.servicios[0]
        estadoActual.value = estadoKeyToNumber(servicioData.estado)
      } else {
        estadoActual.value = estadoKeyToNumber(props.servicio.estado)
      }
    } catch (error) {
      console.error('Error al cargar estado actual:', error)
      estadoActual.value = estadoKeyToNumber(props.servicio.estado)
    } finally {
      isLoading.value = false
    }
  }
})

const handleCambiarEstado = async () => {
  if (saving.value) return

  if (!nuevoEstado.value) {
    modalMessage.value = { text: 'Seleccione el nuevo estado del servicio.', type: 'warning' }
    return
  }

  saving.value = true
  modalMessage.value = null

  try {
    const data = await cambiarEstadoServicioApi({
      id_grupo: groupStore.selectedGroup!.id,
      id_servicio: props.servicio!.id_servicio,
      old_state: estadoActual.value,
      new_state: nuevoEstado.value,
      descripcion: descripcion.value
    })

    if (data.done) {
      isSuccess.value = true
      emit('updated')
    } else {
      modalMessage.value = { text: data.message || 'Error al cambiar el estado.', type: 'error' }
    }
  } catch (error: any) {
    console.error('Error en cambiarEstadoServicioApi:', error)
    modalMessage.value = { text: error.message || 'Error de conexión con el servidor.', type: 'error' }
  } finally {
    saving.value = false
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
    @confirm="handleCambiarEstado"
    title="Cambiar Estado del Servicio"
    confirm-text="Confirmar Cambio"
    size="md"
    :show-footer="!isSuccess && !isLoading"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Edit01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Cambiando Estado...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="isLoading" class="space-y-6 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-4">
          <div v-for="i in 2" :key="i" class="space-y-3">
            <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Estado Actualizado Correctamente</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            El estado del servicio ha sido cambiado exitosamente.
          </p>
          <div class="pt-4">
            <button
              @click="handleClose"
              class="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 px-6 py-3 text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] transition-all duration-300 shadow-sm active:scale-[0.98]"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="16" :stroke-width="2" />
              Cerrar Ventana
            </button>
          </div>
        </div>

        <div v-else-if="!isLoading" class="animate-fade-in space-y-6">
          <Transition name="message-fade">
            <div v-if="modalMessage"
                 class="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border mb-4"
                 :class="{
                   'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
                   'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
                   'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
                 }">
              <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
              <HugeiconsIcon v-else :icon="Tick01Icon" :size="18" class="text-[#3b82f6]" />
              {{ modalMessage.text }}
            </div>
          </Transition>

          <div class="space-y-5">
            <!-- ESTADO ACTUAL -->
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                Estado Actual
              </label>
              <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
                <div class="flex items-center gap-3 px-4 py-3.5">
                  <div class="text-slate-400 dark:text-slate-500 shrink-0">
                    <HugeiconsIcon :icon="Edit01Icon" :size="18" :stroke-width="1.8" />
                  </div>
                  <div class="flex-1">
                    <span
                      class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                      :class="estadoActualColor"
                    >
                      {{ estadoActualLabel }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- FLECHA -->
            <div class="flex items-center justify-center py-2">
              <div class="w-10 h-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                <HugeiconsIcon :icon="ArrowRight01Icon" :size="20" class="text-[#3b82f6]" />
              </div>
            </div>

            <!-- NUEVO ESTADO -->
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                Nuevo Estado
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="estadoId in validNextStates"
                  :key="estadoId"
                  type="button"
                  @click="nuevoEstado = estadoId"
                  class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-[12px] font-bold uppercase tracking-wider transition-all duration-200"
                  :class="nuevoEstado === estadoId
                    ? 'bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#3b82f6] dark:bg-[#3b82f6]/15 dark:border-[#5da6fc]/40 dark:text-[#5da6fc]'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#0F1115] dark:border-white/5 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10'"
                >
                  {{ SERVICIO_ESTADOS_LABELS[estadoId] }}
                </button>
              </div>
              <div v-if="validNextStates.length === 0" class="text-[12px] text-amber-500 ml-1">
                Este estado es terminal, no se pueden realizar más cambios.
              </div>
            </div>

            <!-- DESCRIPCION -->
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                Descripción (opcional)
              </label>
              <textarea
                v-model="descripcion"
                rows="3"
                placeholder="Agregue una descripción del cambio de estado..."
                class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 resize-none"
              />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(12px);
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

:deep(.modal-card .bg-slate-50) {
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
}

:deep(.modal-card .border-slate-200) {
  border-color: rgba(255,255,255,0.08) !important;
}

:deep(.modal-card .text-slate-800) {
  color: #e2e8f0 !important;
}

:deep(.modal-card .placeholder-slate-400) {
  color: #475569 !important;
}

:deep(.modal-card .text-slate-700) {
  color: #e2e8f0 !important;
}

:deep(.modal-card .bg-white) {
  background: linear-gradient(180deg, rgba(26,29,36,0.98) 0%, rgba(15,17,21,0.99) 100%) !important;
}
</style>