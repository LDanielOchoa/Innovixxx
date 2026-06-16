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

      <Transition name="fade-slide" mode="out-in">
        <div v-if="!isInitializing" class="animate-fade-in flex flex-col gap-4">
          <div class="tablero-trabajo grid grid-cols-1 lg:grid-cols-2 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-900/10 dark:bg-[#0c0d12]/40 backdrop-blur-md">
            
            <!-- COLUMNA IZQUIERDA: COMPARACIÓN DE RUTA -->
            <div class="flex flex-col border-r border-slate-200/80 dark:border-white/10">
              <div class="flex flex-col p-5 h-[360px] bg-slate-900/5 dark:bg-[#12141c]/30 gap-6 justify-center">
                <!-- Ruta Actual -->
                <div class="space-y-2">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                    Ruta Actual
                  </span>
                  <div class="flex items-center gap-3 bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
                    <div class="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-400 border border-slate-500/10 shrink-0">
                      <HugeiconsIcon :icon="Route01Icon" :size="18" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{{ getRutaLabel(servicio?.id_ruta || '') }}</p>
                      <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Activa en el servicio</span>
                    </div>
                  </div>
                </div>

                <!-- Ruta Nueva -->
                <div class="space-y-2">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] ml-1">
                    Nueva Ruta Seleccionada
                  </span>
                  <div 
                    v-if="selectedRutaId" 
                    class="flex items-center gap-3 bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border border-[#3b82f6]/20 dark:border-[#3b82f6]/30 rounded-xl px-4 py-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all"
                  >
                    <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/30 shrink-0">
                      <HugeiconsIcon :icon="Route01Icon" :size="18" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-[13px] font-semibold text-[#3b82f6] dark:text-[#5da6fc] truncate">{{ getRutaLabel(selectedRutaId) }}</p>
                      <span class="text-[9px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider">Pendiente de confirmación</span>
                    </div>
                  </div>
                  <div 
                    v-else 
                    class="flex items-center justify-center border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-5 text-slate-400 text-xs font-semibold text-center select-none"
                  >
                    <span>Seleccione una ruta de la lista derecha</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: RUTAS DISPONIBLES -->
            <div class="flex flex-col">
              <div class="flex flex-col p-5 h-[360px]">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    Rutas Disponibles (Grupo)
                  </span>
                  <div class="relative w-44 shrink-0" :class="getError('id_ruta_new') ? '!border-red-500/50' : ''">
                    <input
                      v-model="rutaSearchQuery"
                      type="text"
                      placeholder="Buscar ruta..."
                      class="w-full text-[11px] bg-slate-100 dark:bg-slate-950/35 border border-slate-200/50 dark:border-white/5 rounded-lg pl-7 pr-2 py-1 outline-none text-slate-800 dark:text-white placeholder-slate-500 focus:border-[#3b82f6]/50 transition-all"
                    />
                    <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2 top-2 text-slate-500" />
                  </div>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                  <button
                    v-for="r in filteredRutas"
                    :key="r.id_ruta"
                    type="button"
                    @click="selectRuta(r.id_ruta)"
                    class="w-full card-recurso flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 border"
                    :class="selectedRutaId === r.id_ruta
                      ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/15 border-[#3b82f6]/30'
                      : 'bg-slate-50 dark:bg-[#0F1115]/50 border-slate-200/60 dark:border-white/5 hover:border-[#3b82f6]/40 dark:hover:border-[#3b82f6]/30'"
                  >
                    <div
                      class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                      :class="selectedRutaId === r.id_ruta
                        ? 'bg-[#3b82f6] shadow-[0_2px_6px_rgba(59,130,246,0.4)]'
                        : 'border-2 border-slate-300 dark:border-slate-600'"
                    >
                      <HugeiconsIcon v-if="selectedRutaId === r.id_ruta" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
                    </div>
                    <div class="flex flex-col flex-1 min-w-0">
                      <span class="text-[13px] font-semibold truncate" :class="selectedRutaId === r.id_ruta ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-800 dark:text-slate-200'">
                        {{ r.nombre }}
                      </span>
                    </div>
                    <HugeiconsIcon :icon="Route01Icon" :size="16" class="shrink-0" :class="selectedRutaId === r.id_ruta ? 'text-[#3b82f6]' : 'text-slate-400'" />
                  </button>

                  <div v-if="filteredRutas.length === 0" class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-12">
                    <HugeiconsIcon :icon="Route01Icon" :size="24" class="opacity-20 mb-1" />
                    <span>{{ rutaSearchQuery ? 'Sin coincidencias.' : 'Sin otras rutas en este grupo.' }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Resumen de Cambios -->
          <div class="mt-2 flex items-center justify-between px-4 py-3 bg-slate-100/50 dark:bg-[#0c0d12]/50 border border-slate-200/50 dark:border-white/5 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
            <div class="flex gap-4 items-center">
              <span class="flex items-center gap-1.5 font-semibold">Cambio: <strong class="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{{ selectedRutaId ? '1 programado' : '0' }}</strong></span>
            </div>
            <span class="text-[10px] text-slate-400 italic">Presione confirmar para actualizar la ruta del servicio</span>
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
