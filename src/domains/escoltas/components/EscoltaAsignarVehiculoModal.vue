<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Loading03Icon,
  User02Icon,
  Alert01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { asignarVehiculoEscoltaApi } from '../services/escoltas.api'
import { fetchVehiculosServicioSimpleApi } from '../../vehiculos-servicio/services/vehiculos-servicio.api'
import type { Escolta } from '../types/escolta'
import type { VehiculoServicioSimple } from '../../vehiculos-servicio/types/vehiculo-servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const groupStore = useGroupStore()
const toast = useToast()
const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  escolta: Escolta | null
}>()

const emit = defineEmits(['update:isOpen', 'assigned'])

const isInitializing = ref(true)
const asignando = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const vehiculosList = ref<VehiculoServicioSimple[]>([])
const loadingVehiculos = ref(false)
const selectedVehiculoId = ref<string | null>(null)
const vehiculoSearchQuery = ref('')

const filteredVehiculos = computed(() => {
  const q = vehiculoSearchQuery.value.toLowerCase().trim()
  let list = [...vehiculosList.value]
  if (q) {
    list = list.filter(v =>
      v.placa.toLowerCase().includes(q) ||
      v.tipo.toLowerCase().includes(q) ||
      (v.escolta && v.escolta.toLowerCase().includes(q))
    )
  }
  return list.sort((a, b) => {
    const aOcupado = (a.escolta && a.escolta.trim() !== '') ? 1 : 0
    const bOcupado = (b.escolta && b.escolta.trim() !== '') ? 1 : 0
    return aOcupado - bOcupado
  })
})

const vehiculoAsignado = computed(() => {
  if (!selectedVehiculoId.value) return null
  return vehiculosList.value.find(v => String(v.id_vehiculo) === selectedVehiculoId.value)
})

const vehiculosDisponiblesList = computed(() => {
  return filteredVehiculos.value.filter(v => String(v.id_vehiculo) !== selectedVehiculoId.value)
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
    asignando.value = false
    modalMessage.value = null
    selectedVehiculoId.value = (props.escolta && props.escolta.id_vehiculo) ? String(props.escolta.id_vehiculo) : null
    vehiculoSearchQuery.value = ''

    if (groupStore.selectedGroup?.id) {
      loadingVehiculos.value = true
      try {
        vehiculosList.value = await fetchVehiculosServicioSimpleApi(groupStore.selectedGroup.id)
      } catch (error) {
        console.error('Error cargando vehículos:', error)
        showMessage('Error al cargar vehículos de servicio', 'error')
      } finally {
        loadingVehiculos.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

const selectVehiculo = (id: string) => {
  if (asignando.value) return
  const v = vehiculosList.value.find(item => item.id_vehiculo === id)
  if (v && v.escolta && v.escolta.trim() !== '') {
    toast.add({
      severity: 'warn',
      summary: 'Vehículo Ocupado',
      detail: `Este vehículo ya tiene asignado al escolta: ${v.escolta}`,
      life: 4000
    })
    return
  }
  selectedVehiculoId.value = id
}

const handleAsignar = async () => {
  if (asignando.value) return
  if (!props.escolta?.id_escolta || !groupStore.selectedGroup?.id) {
    showMessage('Datos del escolta inválidos', 'error')
    return
  }
  if (!selectedVehiculoId.value) {
    showMessage('Debe seleccionar un vehículo', 'error')
    return
  }

  asignando.value = true
  modalMessage.value = null

  try {
    const data = await asignarVehiculoEscoltaApi({
      id_grupo: groupStore.selectedGroup.id,
      id_escolta: props.escolta.id_escolta,
      id_vehiculo: selectedVehiculoId.value
    })
    if (data.done) {
      toast.add({
        severity: 'success',
        summary: t('escoltas.alertSuccessAssignVehicleTitle', 'Vehículo Asignado'),
        detail: data.message || t('escoltas.alertSuccessAssignVehicleDetail', 'El vehículo ha sido asignado exitosamente al escolta.'),
        life: 4000
      })
      emit('assigned')
      handleClose()
    } else {
      showMessage(data.message || 'Error al asignar vehículo', 'error')
    }
  } catch (error: any) {
    console.error('Error asignando vehículo:', error)
    showMessage(error.message || 'Error de conexión', 'error')
  } finally {
    asignando.value = false
  }
}

const handleClose = () => {
  if (asignando.value) return
  emit('update:isOpen', false)
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleAsignar"
    :close-on-click-outside="!asignando"
    title="Asignar Vehículo al Escolta"
    :confirm-text="'Confirmar Asignación'"
    size="xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <Transition name="fade">
        <div v-if="asignando" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Asignando Vehículo...</span>
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

      <div v-if="!isInitializing" class="animate-fade-in space-y-6">
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
              <HugeiconsIcon :icon="User02Icon" :size="18" />
            </div>
            <div>
              <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Escolta</span>
              <p class="text-[14px] font-semibold text-slate-800 dark:text-white">{{ escolta?.nombre || '---' }}</p>
            </div>
          </div>

          <div class="space-y-3">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-400 dark:text-slate-500">
              Vehículo de Servicio
            </label>
            <div class="relative">
              <div class="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2" :class="{ 'opacity-60 cursor-not-allowed': asignando }">
                <HugeiconsIcon :icon="Search01Icon" :size="16" class="text-slate-400 shrink-0" />
                <input
                  v-model="vehiculoSearchQuery"
                  type="text"
                  placeholder="Buscar por placa, tipo o escolta..."
                  :disabled="asignando"
                  class="flex-1 bg-transparent border-none text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none disabled:cursor-not-allowed"
                />
                <button
                  v-if="vehiculoSearchQuery && !asignando"
                  type="button"
                  @click="vehiculoSearchQuery = ''"
                  class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
                >
                  <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
                </button>
              </div>
            </div>
          </div>

          <!-- VEHÍCULO ASIGNADO (ARRIBA) -->
          <div class="space-y-3">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5 animate-none shrink-0">
              <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
              Vehículo Asignado
            </span>
            <div v-if="vehiculoAsignado" class="flex flex-wrap gap-2.5 items-start bg-slate-900/5 dark:bg-[#12141c]/30 border border-slate-200 dark:border-white/5 p-4 rounded-2xl shrink-0">
              <div
                class="card-recurso relative flex flex-col gap-0.5 px-3.5 py-2 rounded-xl transition-all cursor-default border bg-[#3b82f6] text-white border-blue-500 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)] select-none"
              >
                <div class="flex items-center gap-1.5">
                  <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                  <span class="text-xs font-semibold truncate max-w-[120px]">{{ vehiculoAsignado.placa }}</span>
                </div>
                <div class="flex justify-between items-center mt-0.5 w-full">
                  <span class="text-[9px] font-mono opacity-80 mr-2">{{ vehiculoAsignado.tipo }}</span>
                </div>
                <!-- Botón Quitar Flotante -->
                <button
                  type="button"
                  @click.stop="selectedVehiculoId = null"
                  class="abs-close-btn flex items-center justify-center rounded-full bg-slate-900/80 hover:bg-red-600 text-white dark:bg-slate-950 dark:hover:bg-red-500 transition-all !w-4 !h-4 !min-w-[16px] !min-h-[16px] !p-0"
                  title="Quitar vehículo"
                >
                  <span class="text-[8px] font-black leading-none">✕</span>
                </button>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-900/5 dark:bg-[#12141c]/10 text-xs text-slate-500 shrink-0">
              <HugeiconsIcon :icon="Car01Icon" :size="20" class="opacity-20 mb-1" />
              <span>Sin vehículo asignado. Seleccione uno de la lista de abajo.</span>
            </div>
          </div>

          <!-- VEHÍCULOS DISPONIBLES (ABAJO) -->
          <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-col">
            <span class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-400 dark:text-slate-500 shrink-0">
              Vehículos Disponibles (Flota)
            </span>
            
            <div class="max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              <div v-if="vehiculosDisponiblesList.length > 0" class="flex flex-wrap gap-2.5 items-start">
                <div
                  v-for="v in vehiculosDisponiblesList"
                  :key="v.id_vehiculo"
                  @click="selectVehiculo(v.id_vehiculo)"
                  class="card-recurso relative flex flex-col gap-0.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer border select-none bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 hover:text-[#3b82f6]"
                  :class="[
                    v.escolta ? 'opacity-50 cursor-not-allowed bg-amber-500/5' : ''
                  ]"
                >
                  <div class="flex items-center gap-1.5">
                    <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                    <span class="text-xs font-semibold truncate max-w-[120px]">{{ v.placa }}</span>
                  </div>
                  <div class="flex justify-between items-center mt-0.5 w-full">
                    <span class="text-[9px] font-mono opacity-60 mr-2">{{ v.tipo }}</span>
                    <span v-if="v.escolta" class="text-amber-500 dark:text-amber-400 font-bold text-[8px] uppercase tracking-wide">
                      Ocupado: {{ v.escolta }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="vehiculosDisponiblesList.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
                <HugeiconsIcon :icon="Car01Icon" :size="32" class="opacity-30 mb-2" />
                <span class="text-[12px] font-medium">Sin vehículos disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-col sm:flex-row w-full gap-3 justify-end">
        <button
          type="button"
          :disabled="asignando"
          @click="handleClose"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="asignando"
          @click="handleAsignar"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          Confirmar Asignación
        </button>
      </div>
    </template>
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

.card-recurso {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 140px;
}
.card-recurso:hover:not(.opacity-50) {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
}

.abs-close-btn {
  position: absolute !important;
  top: -6px !important;
  right: -6px !important;
  width: 16px !important;
  height: 16px !important;
  min-width: 16px !important;
  min-height: 16px !important;
  padding: 0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 10;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 9999px !important;
}
</style>
