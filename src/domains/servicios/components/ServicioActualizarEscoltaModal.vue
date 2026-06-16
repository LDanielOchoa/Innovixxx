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
        <div v-if="!isLoading" class="animate-fade-in flex flex-col gap-4">
          <div class="tablero-trabajo grid grid-cols-1 lg:grid-cols-2 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-900/10 dark:bg-[#0c0d12]/40 backdrop-blur-md">
            
            <!-- COLUMNA IZQUIERDA: ESCOLTAS ASIGNADOS -->
            <div class="flex flex-col border-r border-slate-200/80 dark:border-white/10">
              <div class="flex flex-col p-5 h-[360px] bg-slate-900/5 dark:bg-[#12141c]/30">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
                    Escoltas Asignados
                  </span>
                  <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                    Activos: {{ escoltasActualesIds.filter(id => !escoltasSalenIds.includes(id)).length }}
                  </span>
                </div>
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-if="escoltasActualesIds.length > 0" class="flex flex-wrap gap-2.5 items-start">
                    <div
                      v-for="eId in escoltasActualesIds"
                      :key="eId"
                      @click="alternarSalidaEscolta(eId)"
                      class="card-recurso relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer select-none"
                      :class="[
                        escoltasSalenIds.includes(eId)
                          ? 'opacity-40 border border-dashed border-[#3b82f6]/30 bg-blue-950/10 text-blue-400 line-through'
                          : 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border border-blue-200/50 dark:border-blue-500/20'
                      ]"
                    >
                      <HugeiconsIcon :icon="User02Icon" :size="14" class="shrink-0" />
                      <span class="text-xs truncate max-w-[150px] font-semibold">{{ getEscoltaLabel(eId) }}</span>
                      
                      <!-- Botón Eliminar Flotante -->
                      <button
                        type="button"
                        @click.stop="alternarSalidaEscolta(eId)"
                        class="abs-close-btn flex items-center justify-center rounded-full transition-all"
                        :class="escoltasSalenIds.includes(eId) ? 'bg-[#3b82f6] text-white hover:bg-blue-600' : 'bg-slate-900/80 hover:bg-red-600 text-white dark:bg-slate-950 dark:hover:bg-red-500'"
                        :title="escoltasSalenIds.includes(eId) ? 'Deshacer eliminación' : 'Marcar para salir'"
                      >
                        <HugeiconsIcon v-if="escoltasSalenIds.includes(eId)" :icon="Tick01Icon" :size="8" :stroke-width="3" />
                        <span v-else class="text-[8px] font-black leading-none">✕</span>
                      </button>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-10" v-else>
                    <HugeiconsIcon :icon="User02Icon" :size="24" class="opacity-20 mb-1" />
                    <span>Sin escoltas en servicio.</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: ESCOLTAS DISPONIBLES (FLOTA) -->
            <div class="flex flex-col">
              <div class="flex flex-col p-5 h-[360px]">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    Escoltas Disponibles (Flota)
                  </span>
                  <div class="relative w-44 shrink-0">
                    <input
                      v-model="searchEscoltasQuery"
                      type="text"
                      placeholder="Buscar escolta..."
                      class="w-full text-[11px] bg-slate-100 dark:bg-slate-950/35 border border-slate-200/50 dark:border-white/5 rounded-lg pl-7 pr-2 py-1 outline-none text-slate-800 dark:text-white placeholder-slate-500 focus:border-[#3b82f6]/50 transition-all"
                    />
                    <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2 top-2 text-slate-500" />
                  </div>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-if="filteredEscoltas.length > 0" class="flex flex-wrap gap-2.5 items-start">
                    <div
                      v-for="e in filteredEscoltas"
                      :key="e.id_escolta"
                      @click="alternarEntradaEscolta(e.id_escolta)"
                      class="card-recurso relative flex flex-col gap-0.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer border select-none"
                      :class="[
                        escoltasEntranIds.includes(e.id_escolta)
                          ? 'bg-[#3b82f6] text-white border-blue-500 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 hover:text-[#3b82f6]'
                      ]"
                    >
                      <div class="flex items-center gap-1.5">
                        <HugeiconsIcon :icon="User02Icon" :size="13" class="shrink-0" />
                        <span class="text-xs font-semibold truncate max-w-[120px]">{{ e.nombre }}</span>
                      </div>
                      <span class="text-[9px] font-mono opacity-60 ml-4.5">{{ e.celular }}</span>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-12" v-else>
                    <HugeiconsIcon :icon="User02Icon" :size="24" class="opacity-20 mb-1" />
                    <span>{{ searchEscoltasQuery ? 'Sin coincidencias.' : 'Sin escoltas disponibles en la flota.' }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Resumen de Cambios -->
          <div class="mt-2 flex items-center justify-between px-4 py-3 bg-slate-100/50 dark:bg-[#0c0d12]/50 border border-slate-200/50 dark:border-white/5 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
            <div class="flex gap-4 items-center">
              <span class="flex items-center gap-1.5 font-semibold">Salen: <strong class="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{{ escoltasSalenIds.length }}</strong></span>
              <span class="w-px h-3.5 bg-slate-200 dark:bg-white/10"></span>
              <span class="flex items-center gap-1.5 font-semibold">Entran: <strong class="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{{ escoltasEntranIds.length }}</strong></span>
            </div>
            <span class="text-[10px] text-slate-400 italic">Presiona el botón de confirmar para guardar la nueva configuración de escoltas</span>
          </div>

        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.tablero-trabajo {
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

.card-recurso {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 140px;
}
.card-recurso:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
}

.abs-close-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 15px;
  height: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.15);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>