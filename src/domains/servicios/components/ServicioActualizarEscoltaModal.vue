<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import {
  actualizarEscoltasApi
} from '../services/servicios.api'
import type { ServicioDashboard, EscoltaSimple } from '../types/servicio'
import type { Escolta } from '../../escoltas/types/escolta'
import AppModal from '../../../components/ui/AppModal.vue'

import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { servicioActualizarEscoltaSchema } from '../../../schemas/servicios.schema'
import { useToast } from 'primevue/usetoast'

const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: ServicioDashboard | null
  escoltas: Escolta[]
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

const isLoading = ref(true)
const saving = ref(false)

const { validate, getFirstError } = useFormValidator(servicioActualizarEscoltaSchema)
const { getError, clearErrors } = useFormError('servicio-actualizar-escolta')

const escoltasDisponibles = ref<EscoltaSimple[]>([])
const escoltasCompletos = ref<Escolta[]>([])

const escoltasActualesIds = ref<string[]>([])
const escoltasSalenIds = ref<string[]>([])
const escoltasEntranIds = ref<string[]>([])
const searchEscoltasQuery = ref('')

const filteredEscoltas = computed(() => {
  const q = searchEscoltasQuery.value.toLowerCase().trim()
  return escoltasDisponibles.value.filter(e => {
    // Excluir si ya está asignado actualmente (y no marcado para salir)
    const estaAsignadoActual = escoltasActualesIds.value.includes(e.id_escolta) && !escoltasSalenIds.value.includes(e.id_escolta)
    if (estaAsignadoActual) return false

    if (!q) return true
    return (
      e.nombre.toLowerCase().includes(q) ||
      e.celular.toLowerCase().includes(q)
    )
  })
})

const getEscoltaLabel = (id: string) => {
  const eSimple = escoltasDisponibles.value.find(item => item.id_escolta === id)
  if (eSimple) return eSimple.nombre
  const eCompleto = escoltasCompletos.value.find(item => item.id_escolta === id)
  if (eCompleto) return eCompleto.nombre
  return id
}

const alternarSalidaEscolta = (id: string) => {
  const index = escoltasSalenIds.value.indexOf(id)
  if (index > -1) {
    escoltasSalenIds.value.splice(index, 1)
  } else {
    escoltasSalenIds.value.push(id)
  }
}

const alternarEntradaEscolta = (id: string) => {
  const index = escoltasEntranIds.value.indexOf(id)
  if (index > -1) {
    escoltasEntranIds.value.splice(index, 1)
  } else {
    escoltasEntranIds.value.push(id)
  }
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    clearErrors()

    escoltasActualesIds.value = []
    escoltasSalenIds.value = []
    escoltasEntranIds.value = []
    searchEscoltasQuery.value = ''
    escoltasCompletos.value = []

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    try {
      escoltasCompletos.value = props.escoltas
      escoltasDisponibles.value = props.escoltas.filter(e => e.estado === 'DISPONIBLE')
      escoltasActualesIds.value = props.servicio.escoltas || []
    } catch (error) {
      console.error('Error al inicializar datos:', error)
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al cargar los datos del servicio.',
        life: 4000
      })
    } finally {
      isLoading.value = false
    }
  }
})

const handleActualizar = async () => {
  if (saving.value) return
  clearErrors()

  const payload = {
    id_grupo: groupStore.selectedGroup?.id || '',
    id_servicio: props.servicio?.id_servicio || '',
    salen: escoltasSalenIds.value,
    entran: escoltasEntranIds.value
  }

  if (!validate(payload, 'servicio-actualizar-escolta')) {
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

  if (escoltasSalenIds.value.length === 0 && escoltasEntranIds.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Sin cambios',
      detail: 'No se detectaron cambios para actualizar.',
      life: 4000
    })
    return
  }

  saving.value = true

  try {
    const data = await actualizarEscoltasApi(payload)

    if (data.done) {
      handleClose()
      emit('updated')
      toast.add({
        severity: 'success',
        summary: 'Escoltas Actualizados',
        detail: data.message || 'Los escoltas asignados al servicio se actualizaron exitosamente.',
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.message || 'Error al actualizar escoltas.',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error en actualizarEscoltasApi:', error)
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
    @confirm="handleActualizar"
    title="Actualizar Escoltas"
    confirm-text="Confirmar Cambios"
    size="xl"
    :show-footer="!isLoading"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="User02Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative p-1">
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Guardando Cambios...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <div v-if="isLoading" class="space-y-6 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-6">
          <div v-for="i in 2" :key="i" class="space-y-3">
            <div class="h-4 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-40 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isLoading" class="flex flex-col gap-3">

          <!-- Grid principal de cuadrantes plano y minimalista -->
          <div class="grid grid-cols-1 lg:grid-cols-2 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1117]">
            
            <!-- COLUMNA IZQUIERDA: ESCOLTAS ASIGNADOS Y PENDIENTES -->
            <div class="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 h-[320px] bg-slate-50/50 dark:bg-slate-900/30">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                  Escoltas Asignados
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Activos: {{ escoltasActualesIds.filter(id => !escoltasSalenIds.includes(id)).length }}
                </span>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div v-if="escoltasActualesIds.length > 0 || escoltasEntranIds.length > 0" class="flex flex-wrap gap-2 items-start">
                  <!-- Escoltas actuales -->
                  <div
                    v-for="eId in escoltasActualesIds"
                    :key="eId"
                    @click="alternarSalidaEscolta(eId)"
                    class="relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                    :class="[
                      escoltasSalenIds.includes(eId)
                        ? 'opacity-50 border-dashed border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-600 line-through'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40'
                    ]"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon :icon="User02Icon" :size="13" class="shrink-0" />
                      <span class="truncate max-w-[120px]">{{ getEscoltaLabel(eId) }}</span>
                    </div>
                    
                    <!-- Botón Marcar Salida / Deshacer -->
                    <button
                      type="button"
                      @click.stop="alternarSalidaEscolta(eId)"
                      class="w-4 h-4 ml-1 flex items-center justify-center rounded transition-colors text-[10px]"
                      :class="escoltasSalenIds.includes(eId) ? 'text-[#3b82f6] dark:text-[#60a5fa] hover:bg-[#3b82f6]/10' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
                      :title="escoltasSalenIds.includes(eId) ? 'Deshacer eliminación' : 'Marcar para salir'"
                    >
                      <HugeiconsIcon v-if="escoltasSalenIds.includes(eId)" :icon="Tick01Icon" :size="10" />
                      <span v-else>✕</span>
                    </button>
                  </div>

                  <!-- Escoltas entrantes (pendientes de asignar) -->
                  <div
                    v-for="eId in escoltasEntranIds"
                    :key="'entrante-' + eId"
                    @click="alternarEntradaEscolta(eId)"
                    class="relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border-dashed border-[#3b82f6]/30 dark:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon :icon="User02Icon" :size="13" class="shrink-0" />
                      <span class="truncate max-w-[90px]">{{ getEscoltaLabel(eId) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-[9px] font-semibold uppercase tracking-wide opacity-60">Nuevo</span>
                      <button
                        type="button"
                        @click.stop="alternarEntradaEscolta(eId)"
                        class="w-4 h-4 flex items-center justify-center rounded transition-colors text-[10px] text-[#3b82f6]/60 hover:text-red-500 dark:hover:text-red-400"
                        title="Quitar escolta"
                      >✕</button>
                    </div>
                  </div>
                </div>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10" v-else>
                  <span>Sin escoltas en servicio.</span>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: ESCOLTAS DISPONIBLES -->
            <div class="flex flex-col p-4 h-[320px]">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Escoltas Disponibles
                </span>
                <div class="relative w-40 shrink-0">
                  <input
                    v-model="searchEscoltasQuery"
                    type="text"
                    placeholder="Buscar..."
                    class="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-7 pr-2 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-[#3b82f6] transition-colors"
                  />
                  <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div v-if="filteredEscoltas.length > 0" class="flex flex-wrap gap-2 items-start">
                  <div
                    v-for="e in filteredEscoltas"
                    :key="e.id_escolta"
                    @click="alternarEntradaEscolta(e.id_escolta)"
                    class="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                    :class="[
                      escoltasEntranIds.includes(e.id_escolta)
                        ? 'bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40'
                    ]"
                  >
                    <div class="flex items-center gap-1.5">
                      <HugeiconsIcon :icon="User02Icon" :size="13" class="shrink-0" />
                      <span class="font-medium truncate max-w-[120px]">{{ e.nombre }}</span>
                    </div>
                    <span class="text-[10px] opacity-70 ml-4.5 font-normal">{{ e.celular }}</span>
                  </div>
                </div>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10" v-else>
                  <span>{{ searchEscoltasQuery ? 'Sin coincidencias.' : 'Sin escoltas disponibles.' }}</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Resumen de Cambios -->
          <div class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <div class="flex gap-4 items-center">
              <span>Salen: <strong class="text-[#3b82f6] dark:text-[#60a5fa] font-semibold">{{ escoltasSalenIds.length }}</strong></span>
              <span class="w-px h-3 bg-slate-200 dark:bg-slate-800"></span>
              <span>Entran: <strong class="text-[#3b82f6] dark:text-[#60a5fa] font-semibold">{{ escoltasEntranIds.length }}</strong></span>
            </div>
            <span class="text-[11px] text-slate-400">Presiona confirmar para guardar los cambios</span>
          </div>

        </div>
      </Transition>
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
