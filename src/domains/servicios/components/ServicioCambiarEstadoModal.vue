<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowRight01Icon,
  Loading03Icon,
  Alert01Icon,
  Edit01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { cambiarEstadoServicioApi } from '../services/servicios.api'
import type { ServicioDashboard } from '../types/servicio'
import {
  SERVICIO_ESTADOS_LABELS,
  SERVICIO_ESTADOS_VALID_NEXT_PROD,
  SERVICIO_ESTADOS_VALID_NEXT_DEV
} from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { servicioCambiarEstadoSchema } from '../../../schemas/servicios.schema'
import { useToast } from 'primevue/usetoast'

const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: ServicioDashboard | null
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

const isLoading = ref(true)
const saving = ref(false)
const estadoDesconocido = ref(false)


const { validate, getFirstError } = useFormValidator(servicioCambiarEstadoSchema)
const { getError, clearErrors } = useFormError('servicio-cambiar-estado')

const estadoActual = ref<number>(0)
const nuevoEstado = ref<number>(0)
const descripcion = ref('')

const USE_DEV_MODE = true

const validNextStates = computed(() => {
  const map = USE_DEV_MODE ? SERVICIO_ESTADOS_VALID_NEXT_DEV : SERVICIO_ESTADOS_VALID_NEXT_PROD
  return map[estadoActual.value] || []
})

const estadoActualLabel = computed(() => {
  return SERVICIO_ESTADOS_LABELS[estadoActual.value] || 'Sin estado'
})

const estadoActualColor = computed(() => {
  const colors: Record<number, string> = {
    1: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    2: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    3: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    4: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
    5: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
    6: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/20'
  }
  return colors[estadoActual.value] || 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
})

const estadoKeyToNumber = (estado: string | number): number => {
  if (estado === null || estado === undefined) return 0
  if (typeof estado === 'number') {
    return Number.isInteger(estado) && estado >= 1 && estado <= 6 ? estado : 0
  }

  const trimmed = String(estado).trim()
  if (!trimmed) return 0

  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    if (n >= 1 && n <= 6) return n
  }

  const normalized = trimmed
    .toUpperCase()
    .replace(/^ESTADO_/, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')

  const map: Record<string, number> = {
    PRERCARGA: 1,
    EN_ESPERA: 2,
    EJECUCION_OK: 3,
    EJECUCION_FAIL: 4,
    EJECUCION_NOVEDAD: 4,
    FINALIZADO: 5,
    CANCELADO: 6
  }

  return map[normalized] || 0
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    estadoDesconocido.value = false
    clearErrors()
    descripcion.value = ''
    nuevoEstado.value = 0
    estadoActual.value = 0

    if (props.servicio) {
      const parsed = estadoKeyToNumber(props.servicio.estado)
      estadoActual.value = parsed
      estadoDesconocido.value = parsed === 0
    }
    isLoading.value = false
  }
})

const handleCambiarEstado = async () => {
  if (saving.value) return
  if (estadoDesconocido.value) {
    toast.add({
      severity: 'warn',
      summary: 'Estado no reconocido',
      detail: 'No se puede cambiar el estado porque el estado actual es desconocido.',
      life: 4000
    })
    return
  }
  clearErrors()

  const payload = {
    id_grupo: groupStore.selectedGroup?.id || '',
    id_servicio: props.servicio?.id_servicio || '',
    old_state: estadoActual.value,
    new_state: nuevoEstado.value,
    descripcion: descripcion.value
  }

  if (!validate(payload, 'servicio-cambiar-estado')) {
    const firstErr = getFirstError()
    if (firstErr) {
      toast.add({
        severity: 'warn',
        summary: 'Validación',
        detail: firstErr,
        life: 4000
      })
    }
    return
  }

  saving.value = true

  try {
    const data = await cambiarEstadoServicioApi(payload)

    if (data.done) {
      handleClose()
      emit('updated')
      toast.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: data.message || 'El estado del servicio ha sido cambiado exitosamente.',
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.message || 'Error al cambiar el estado.',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en cambiarEstadoServicioApi:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Error de conexión con el servidor.',
      life: 4000
    })
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
    :show-footer="!isLoading && !estadoDesconocido"
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

      <div v-if="!isLoading && estadoDesconocido" class="flex items-start gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <HugeiconsIcon :icon="Alert01Icon" :size="18" class="shrink-0 mt-0.5" />
        <div>
          <p class="font-bold">Estado no reconocido</p>
          <p class="text-[12px] font-medium opacity-80 mt-0.5">El estado actual del servicio (código: {{ props.servicio?.estado }}) no está dentro del catálogo válido. No es posible continuar.</p>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isLoading && !estadoDesconocido" class="animate-fade-in space-y-6">

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
                  :class="[
                    nuevoEstado === estadoId
                      ? 'bg-[#3b82f6]/10 border-[#3b82f6]/40 text-[#3b82f6] dark:bg-[#3b82f6]/15 dark:border-[#5da6fc]/40 dark:text-[#5da6fc]'
                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#0F1115] dark:border-white/5 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10',
                    getError('new_state') ? '!border-red-500/50' : ''
                  ]"
                >
                  {{ SERVICIO_ESTADOS_LABELS[estadoId] }}
                </button>
              </div>
              <span v-if="getError('new_state')" class="text-xs text-red-500 font-bold block ml-1 mt-1">{{ getError('new_state') }}</span>
              <div v-if="validNextStates.length === 0" class="text-[12px] text-amber-500 ml-1">
                No hay transiciones disponibles desde el estado actual.
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
                :class="getError('descripcion') ? '!border-red-500/50' : ''"
              />
              <span v-if="getError('descripcion')" class="text-xs text-red-500 font-bold block ml-1 mt-1">{{ getError('descripcion') }}</span>
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
