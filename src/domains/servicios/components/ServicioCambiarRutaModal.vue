<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { cambiarRutaServicioApi } from '../services/servicios.api'
import type { ServicioDashboard, RutaSimple } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { servicioCambiarRutaSchema } from '../../../schemas/servicios.schema'
import { useToast } from 'primevue/usetoast'

const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: ServicioDashboard | null
  rutas: RutaSimple[]
}>()

const emit = defineEmits(['update:isOpen', 'assigned'])

const isInitializing = ref(true)
const cambiando = ref(false)

const { validate, getFirstError } = useFormValidator(servicioCambiarRutaSchema)
const { getError, clearErrors } = useFormError('servicio-cambiar-ruta')

const rutasList = ref<RutaSimple[]>([])
const selectedRutaId = ref<string | null>(null)
const rutaSearchQuery = ref('')

const filteredRutas = computed(() => {
  const q = rutaSearchQuery.value.toLowerCase().trim()
  return rutasList.value.filter(r => {
    // Excluir si es la ruta actual activa del servicio
    if (props.servicio?.id_ruta === r.id_ruta) return false

    if (!q) return true
    return r.nombre.toLowerCase().includes(q)
  })
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    cambiando.value = false
    clearErrors()
    selectedRutaId.value = null
    rutaSearchQuery.value = ''

    rutasList.value = props.rutas

    setTimeout(() => {
      isInitializing.value = false
    }, 400)
  }
})

const selectRuta = (id: string) => {
  selectedRutaId.value = id
}

const getRutaLabel = (id: string) => {
  if (!id) return 'Sin ruta asignada'
  const r = rutasList.value.find(item => item.id_ruta === id)
  return r ? r.nombre : id
}

const handleCambiar = async () => {
  if (cambiando.value) return
  clearErrors()

  const payload = {
    id_grupo: groupStore.selectedGroup?.id || '',
    id_servicio: props.servicio?.id_servicio || '',
    id_ruta_old: props.servicio?.id_ruta || '',
    id_ruta_new: selectedRutaId.value || ''
  }

  if (!validate(payload, 'servicio-cambiar-ruta')) {
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

  cambiando.value = true

  try {
    const data = await cambiarRutaServicioApi(payload)
    if (data.done) {
      handleClose()
      emit('assigned')
      toast.add({
        severity: 'success',
        summary: 'Ruta Cambiada',
        detail: data.message || 'La ruta ha sido actualizada con éxito.',
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.message || 'Error al cambiar ruta',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error cambiando ruta:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Error de conexión',
      life: 4000
    })
  } finally {
    cambiando.value = false
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
    @confirm="handleCambiar"
    title="Cambiar Ruta del Servicio"
    confirm-text="Confirmar Cambio"
    size="xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative p-1">
      <Transition name="fade">
        <div v-if="cambiando" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Cambiando Ruta...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-6">
          <div v-for="i in 2" :key="i" class="space-y-3">
            <div class="h-4 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-40 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
      </div>

      <!-- Panel Principal -->
      <div v-if="!isInitializing" class="flex flex-col gap-3">

        <!-- Grid principal plano y minimalista -->
        <div class="grid grid-cols-1 lg:grid-cols-2 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1117]">
          
          <!-- COLUMNA IZQUIERDA: COMPARACIÓN DE RUTA -->
          <div class="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 justify-center gap-4 bg-slate-50/50 dark:bg-slate-900/30 h-[320px]">
            <!-- Ruta Actual -->
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                Ruta Actual
              </span>
              <div class="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs">
                <div class="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <HugeiconsIcon :icon="Route01Icon" :size="16" />
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-slate-800 dark:text-slate-200 truncate">{{ getRutaLabel(servicio?.id_ruta || '') }}</p>
                  <span class="text-[10px] text-slate-400">Activa en el servicio</span>
                </div>
              </div>
            </div>

            <!-- Ruta Nueva -->
            <div class="space-y-1.5">
              <span class="text-xs font-semibold text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                Nueva Ruta Seleccionada
              </span>
              <div 
                v-if="selectedRutaId" 
                class="flex items-center justify-between gap-3 bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg p-3 text-xs"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 rounded-md bg-[#3b82f6]/15 flex items-center justify-center text-[#3b82f6] shrink-0">
                    <HugeiconsIcon :icon="Route01Icon" :size="16" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-[#3b82f6] dark:text-[#60a5fa] truncate">{{ getRutaLabel(selectedRutaId) }}</p>
                    <span class="text-[10px] text-[#3b82f6]/70 dark:text-[#60a5fa]/70">Pendiente de confirmación</span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="selectedRutaId = ''"
                  class="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px]"
                  title="Deshacer selección"
                >✕</button>
              </div>
              <div 
                v-else 
                class="flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-4 text-slate-400 text-xs text-center select-none"
              >
                <span>Selecciona una ruta del panel derecho</span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: RUTAS DISPONIBLES -->
          <div class="flex flex-col p-4 h-[320px]">
            <div class="flex justify-between items-center mb-3 shrink-0">
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Rutas Disponibles
              </span>
              <div class="relative w-40 shrink-0">
                <input
                  v-model="rutaSearchQuery"
                  type="text"
                  placeholder="Buscar..."
                  class="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-7 pr-2 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-[#3b82f6] transition-colors"
                />
                <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2.5 top-2 text-slate-400" />
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <div v-if="filteredRutas.length > 0" class="flex flex-col gap-1.5">
                <div
                  v-for="r in filteredRutas"
                  :key="r.id_ruta"
                  @click="selectRuta(r.id_ruta)"
                  class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                  :class="[
                    selectedRutaId === r.id_ruta
                      ? 'bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40'
                  ]"
                >
                  <div class="flex items-center gap-2 truncate">
                    <HugeiconsIcon :icon="Route01Icon" :size="14" class="shrink-0" />
                    <span class="truncate">{{ r.nombre }}</span>
                  </div>
                  <HugeiconsIcon v-if="selectedRutaId === r.id_ruta" :icon="Tick01Icon" :size="12" class="shrink-0 text-white" />
                </div>
              </div>

              <div v-if="filteredRutas.length === 0" class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10">
                <span>{{ rutaSearchQuery ? 'Sin coincidencias.' : 'Sin otras rutas disponibles.' }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Resumen de Cambios -->
        <div class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          <div class="flex gap-4 items-center">
            <span>Cambio: <strong class="text-[#3b82f6] dark:text-[#60a5fa] font-semibold">{{ selectedRutaId ? '1 ruta seleccionada' : 'Sin cambios' }}</strong></span>
          </div>
          <span class="text-[11px] text-slate-400">Presiona confirmar para actualizar la ruta del servicio</span>
        </div>

      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 10px;
}
</style>
