<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon,
  Calendar01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { cambiarRutaServicioApi, fetchRutasSimplesApi } from '../services/servicios.api'
import type { Servicio, RutaSimple } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | null
}>()

const emit = defineEmits(['update:isOpen', 'assigned'])

const isInitializing = ref(true)
const cambiando = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const rutasList = ref<RutaSimple[]>([])
const loadingRutas = ref(false)
const selectedRutaId = ref<string | null>(null)
const rutaSearchQuery = ref('')

const filteredRutas = computed(() => {
  const q = rutaSearchQuery.value.toLowerCase().trim()
  if (!q) return rutasList.value
  return rutasList.value.filter(r => r.nombre.toLowerCase().includes(q))
})

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    cambiando.value = false
    modalMessage.value = null
    selectedRutaId.value = null
    rutaSearchQuery.value = ''

    if (groupStore.selectedGroup?.id) {
      loadingRutas.value = true
      try {
        rutasList.value = await fetchRutasSimplesApi(groupStore.selectedGroup.id)
      } catch (error) {
        console.error('Error cargando rutas:', error)
        showMessage('Error al cargar rutas', 'error')
      } finally {
        loadingRutas.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

const selectRuta = (id: string) => {
  selectedRutaId.value = id
}

const getRutaLabel = (id: string) => {
  const r = rutasList.value.find(item => item.id_ruta === id)
  return r ? r.nombre : id
}

const handleCambiar = async () => {
  if (cambiando.value) return
  if (!props.servicio?.id_servicio || !groupStore.selectedGroup?.id) {
    showMessage('Datos del servicio inválidos', 'error')
    return
  }
  if (!selectedRutaId.value) {
    showMessage('Debe seleccionar una nueva ruta', 'error')
    return
  }

  cambiando.value = true
  modalMessage.value = null

  try {
    const data = await cambiarRutaServicioApi({
      id_grupo: groupStore.selectedGroup.id,
      id_servicio: props.servicio.id_servicio,
      id_ruta_old: props.servicio.id_ruta || '',
      id_ruta_new: selectedRutaId.value
    })
    if (data.done) {
      isSuccess.value = true
      emit('assigned')
    } else {
      showMessage(data.message || 'Error al cambiar ruta', 'error')
    }
  } catch (error: any) {
    console.error('Error cambiando ruta:', error)
    showMessage(error.message || 'Error de conexión', 'error')
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
    :confirm-text="'Confirmar Cambio'"
    size="xl"
    :show-footer="!isSuccess && !isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
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
        <div class="space-y-3">
          <div class="h-2 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-14 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
        <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-64 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
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
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Ruta Cambiada Correctamente</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            La ruta del servicio ha sido actualizada exitosamente.
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

        <div v-else-if="!isInitializing" class="animate-fade-in space-y-6">
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
            <div class="flex items-center gap-3 bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl px-4 py-3">
              <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#3b82f6]">
                <HugeiconsIcon :icon="Calendar01Icon" :size="18" />
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Servicio</span>
                <p class="text-[14px] font-semibold text-slate-800 dark:text-white">{{ servicio?.id_servicio || '---' }}</p>
              </div>
            </div>

            <div v-if="servicio?.id_ruta" class="flex items-center gap-3 bg-slate-50/50 dark:bg-[#0F1115]/50 border border-slate-200/40 dark:border-white/5 rounded-xl px-4 py-3">
              <div class="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
                <HugeiconsIcon :icon="Route01Icon" :size="16" />
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Ruta Actual</span>
                <p class="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{{ getRutaLabel(servicio.id_ruta) }}</p>
              </div>
            </div>

            <div class="space-y-3">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-400 dark:text-slate-500">
                Nueva Ruta
              </label>
              <div class="relative">
                <div class="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2">
                  <HugeiconsIcon :icon="Search01Icon" :size="16" class="text-slate-400 shrink-0" />
                  <input
                    v-model="rutaSearchQuery"
                    type="text"
                    placeholder="Buscar por nombre..."
                    class="flex-1 bg-transparent border-none text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                  />
                  <button
                    v-if="rutaSearchQuery"
                    type="button"
                    @click="rutaSearchQuery = ''"
                    class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
                  >
                    <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <div class="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              <button
                v-for="r in filteredRutas"
                :key="r.id_ruta"
                type="button"
                @click="selectRuta(r.id_ruta)"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 border"
                :class="selectedRutaId === r.id_ruta
                  ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/15 border-[#3b82f6]/30'
                  : 'bg-slate-50 dark:bg-[#0F1115] border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'"
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
              <div v-if="filteredRutas.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
                <HugeiconsIcon :icon="Route01Icon" :size="32" class="opacity-30 mb-2" />
                <span class="text-[12px] font-medium">Sin rutas disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.animate-fade-in {
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

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2A313A;
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
:deep(.modal-card .placeholder-slate-600) {
  color: #475569 !important;
}
:deep(.modal-card .text-slate-700) {
  color: #e2e8f0 !important;
}
:deep(.modal-card .bg-white) {
  background: linear-gradient(180deg, rgba(26,29,36,0.98) 0%, rgba(15,17,21,0.99) 100%) !important;
}
</style>
