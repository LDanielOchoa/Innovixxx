<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Calendar01Icon,
  Clock01Icon,
  Car01Icon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  ServiceIcon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { registrarServicioApi, fetchRutasSimplesApi, fetchVehiculosSimplesApi } from '../services/servicios.api'
import type { ServicioCreatePayload, RutaSimple, VehiculoSimple } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import AppButton from '../../../components/ui/AppButton.vue'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['update:isOpen', 'created'])

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)
const rutas = ref<RutaSimple[]>([])
const loadingRutas = ref(false)

const fechaInicio = ref('')
const horaInicio = ref('')

// Estados de Vehículos
const vehiculos = ref<VehiculoSimple[]>([])
const loadingVehiculos = ref(false)
const selectedVehiculosIds = ref<string[]>([])
const isVehiculosDropdownOpen = ref(false)
const vehiculosDropdownRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')

const filteredVehiculos = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return vehiculos.value
  return vehiculos.value.filter(v => 
    v.nombre.toLowerCase().includes(q) || 
    v.placa.toLowerCase().includes(q) || 
    v.tipo.toLowerCase().includes(q)
  )
})

const formData = reactive({
  id_ruta: '',
  fecha_hora_inicio: '',
  modo_fin: ''
})

watch([fechaInicio, horaInicio], ([nuevaFecha, nuevaHora]) => {
  if (nuevaFecha && nuevaHora) {
    formData.fecha_hora_inicio = `${nuevaFecha} ${nuevaHora}`
  } else if (nuevaFecha) {
    formData.fecha_hora_inicio = `${nuevaFecha} 00:00`
  } else {
    formData.fecha_hora_inicio = ''
  }
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    rutas.value = []
    loadingRutas.value = false
    vehiculos.value = []
    loadingVehiculos.value = false
    selectedVehiculosIds.value = []
    isVehiculosDropdownOpen.value = false
    searchQuery.value = ''
    fechaInicio.value = ''
    horaInicio.value = ''
    formData.id_ruta = ''
    formData.fecha_hora_inicio = ''
    formData.modo_fin = ''

    if (groupStore.selectedGroup?.id) {
      loadingRutas.value = true
      loadingVehiculos.value = true
      try {
        const [rutasData, vehiculosData] = await Promise.all([
          fetchRutasSimplesApi(groupStore.selectedGroup.id),
          fetchVehiculosSimplesApi(groupStore.selectedGroup.id)
        ])
        rutas.value = rutasData
        vehiculos.value = vehiculosData
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        loadingRutas.value = false
        loadingVehiculos.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

const toggleVehiculosDropdown = () => {
  if (loadingVehiculos.value) return
  isVehiculosDropdownOpen.value = !isVehiculosDropdownOpen.value
}

const selectVehiculo = (id: string) => {
  const index = selectedVehiculosIds.value.indexOf(id)
  if (index > -1) {
    selectedVehiculosIds.value.splice(index, 1)
  } else {
    selectedVehiculosIds.value.push(id)
  }
}

const getVehiculoLabel = (id: string) => {
  const v = vehiculos.value.find(item => item.id_vehiculo === id)
  return v ? `${v.nombre} (${v.placa})` : id
}

const handleClickOutsideVehiculos = (event: MouseEvent) => {
  if (vehiculosDropdownRef.value && !vehiculosDropdownRef.value.contains(event.target as Node)) {
    isVehiculosDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutsideVehiculos)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutsideVehiculos)
})

const handleCreate = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione un grupo valido', type: 'error' }
    return
  }

  if (!formData.id_ruta) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione una ruta', type: 'error' }
    return
  }

  if (!formData.fecha_hora_inicio.trim()) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'La fecha y hora de inicio es requerida', type: 'error' }
    return
  }

  if (!formData.modo_fin.trim()) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'El modo fin es requerido', type: 'error' }
    return
  }

  if (selectedVehiculosIds.value.length === 0) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione al menos un vehiculo', type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload: ServicioCreatePayload = {
    id_grupo: groupStore.selectedGroup.id,
    id_ruta: formData.id_ruta,
    fecha_hora_inicio: formData.fecha_hora_inicio.replace('T', ' ').trim(),
    modo_fin: parseInt(formData.modo_fin.trim(), 10),
    vehiculos_id: selectedVehiculosIds.value
  }

  try {
    const data = await registrarServicioApi(payload)
    if (data.done) {
      isSuccess.value = true
      emit('created')
    } else {
      modalMessage.value = { text: data.message || (t('common.error') || 'Error al registrar'), type: 'error' }
    }
  } catch (error: any) {
    console.error('Error creating servicio:', error)
    modalMessage.value = { text: error.message || (t('common.errorNetwork') || 'Error de conexion'), type: 'error' }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const confirmText = computed(() => {
  if (isSuccess.value) return t('common.close') || 'Cerrar'
  return t('servicios.btnRegister') || 'Registrar Servicio'
})

const rutaOptions = computed(() => {
  return rutas.value.map(r => ({
    value: r.id_ruta,
    label: r.nombre
  }))
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    :title="t('servicios.modalTitleCreate') || 'Registrar Servicio'"
    size="xl"
    :show-footer="false"
    :confirm-text="confirmText"
    @confirm="isSuccess ? handleClose() : handleCreate()"
  >
    <template #icon>
      <HugeiconsIcon :icon="ServiceIcon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- OVERLAY DE CARGA -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('common.saving') || 'Guardando' }}</span>
            <div class="flex gap-1">
              <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse">
        <div class="space-y-3">
          <div class="h-2 w-16 bg-slate-100 dark:bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="h-2 w-24 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
          <div class="space-y-3">
            <div class="h-2 w-20 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-2 w-28 bg-slate-100 dark:bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        </div>
      </div>

      <!-- SUCCESS STATE -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">{{ t('servicios.alertSuccessCreate') || 'Servicio Registrado' }}</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[260px]">
            {{ t('servicios.successCreateMsg') || 'El servicio ha sido registrado exitosamente.' }}
          </p>
        </div>

        <!-- FORM CONTENT -->
        <div v-else class="animate-fade-in">
          <!-- Card Glassmorphic -->
          <div class="space-y-5 bg-gradient-to-b from-white/90 to-white/50 dark:from-[#1A1D24]/90 dark:to-[#0F1115]/90 backdrop-blur-2xl p-5 rounded-[24px] border border-white dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative group/form">
            <!-- Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5 rounded-full blur-3xl group-hover/form:bg-[#3b82f6]/10 transition-colors duration-700 pointer-events-none"></div>

            <!-- Header del Form -->
            <div class="flex items-center gap-3 relative z-10">
              <div class="w-9 h-9 rounded-[12px] bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/5 flex items-center justify-center text-[#3b82f6] border border-blue-200/60 dark:border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <HugeiconsIcon :icon="Route01Icon" :size="18" class="drop-shadow-sm" />
              </div>
              <h3 class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em] drop-shadow-sm">{{ t('servicios.formSectionData') || 'Datos del Servicio' }}</h3>
            </div>

            <!-- Feedback Message -->
            <Transition name="fade">
              <div v-if="modalMessage"
                   class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border animate-fade-in-up relative z-10"
                   :class="modalMessage.type === 'error'
                     ? 'bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                     : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#3b82f6] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : Tick01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <!-- Fields -->
            <div class="space-y-4 relative z-10">
              <!-- Ruta (Custom Dropdown) -->
              <AppSelect
                v-model="formData.id_ruta"
                :label="t('servicios.labelRoute') || 'Ruta'"
                :placeholder="loadingRutas ? (t('common.loading') || 'Cargando...') : (t('servicios.placeholderRoute') || 'Seleccione una ruta')"
                :icon="Route01Icon"
                :options="rutaOptions"
                :disabled="loadingRutas"
              />

              <!-- Fecha, Hora y Modo Fin (3 Columnas) -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AppInput
                  v-model="fechaInicio"
                  type="date"
                  :label="t('servicios.labelDate') || 'Fecha Inicio'"
                  :icon="Calendar01Icon"
                  class="custom-datetime-input"
                />

                <AppInput
                  v-model="horaInicio"
                  type="time"
                  :label="t('servicios.labelTime') || 'Hora Inicio'"
                  :icon="Clock01Icon"
                  class="custom-datetime-input"
                />

                <AppInput
                  v-model="formData.modo_fin"
                  :label="t('servicios.labelEndMode') || 'Modo Fin'"
                  :placeholder="t('servicios.placeholderEndMode') || 'Ej: 1'"
                  :icon="Clock01Icon"
                />
              </div>

              <!-- Vehiculos (MultiSelect Dropdown) -->
              <div ref="vehiculosDropdownRef" class="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-2 relative">
                <label 
                  class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                  :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isVehiculosDropdownOpen }"
                >
                  {{ t('servicios.labelVehicles') || 'Vehículos Disponibles' }}
                </label>
                
                <div class="relative">
                  <!-- Trigger del dropdown -->
                  <button
                    type="button"
                    @click="toggleVehiculosDropdown"
                    :disabled="loadingVehiculos"
                    class="relative flex items-center w-full min-h-[48px] bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 overflow-hidden transition-all duration-300 text-left"
                    :class="[
                      { 'opacity-60 cursor-not-allowed': loadingVehiculos },
                      { 
                        'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20': isVehiculosDropdownOpen,
                        'hover:border-slate-300 dark:hover:border-white/10': !isVehiculosDropdownOpen && !loadingVehiculos
                      }
                    ]"
                  >
                    <!-- Icono izquierda -->
                    <div class="text-slate-400 dark:text-slate-500 pr-2 shrink-0">
                      <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                    </div>

                    <!-- Contenido del trigger (Badges de seleccionados) -->
                    <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 overflow-hidden">
                      <template v-if="selectedVehiculosIds.length > 0">
                        <div 
                          v-for="id in selectedVehiculosIds" 
                          :key="id"
                          class="flex items-center gap-1 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30"
                        >
                          <span>{{ getVehiculoLabel(id) }}</span>
                          <button 
                            type="button" 
                            @click.stop="selectVehiculo(id)"
                            class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
                          >
                            <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                          </button>
                        </div>
                      </template>
                      <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        {{ loadingVehiculos ? (t('common.loading') || 'Cargando...') : (t('servicios.placeholderVehicles') || 'Seleccione uno o más vehículos') }}
                      </span>
                    </div>

                    <!-- Icono Flecha Derecha -->
                    <div class="text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isVehiculosDropdownOpen }">
                      <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
                    </div>
                  </button>

                  <!-- Listado desplegable -->
                  <Transition name="dropdown">
                    <div 
                      v-if="isVehiculosDropdownOpen" 
                      class="absolute z-[200] w-full mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
                    >
                      <!-- Buscador -->
                      <div class="px-3 py-2 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#15181F]/50">
                        <div class="relative flex items-center bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6]/20 transition-all duration-300">
                          <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                          <input 
                            v-model="searchQuery"
                            type="text"
                            :placeholder="t('common.search') || 'Buscar vehículo...'"
                            class="w-full bg-transparent border-none text-[12px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 p-0"
                            @click.stop
                          />
                          <button 
                            v-if="searchQuery" 
                            type="button" 
                            @click.stop="searchQuery = ''"
                            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 shrink-0"
                          >
                            <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
                          </button>
                        </div>
                      </div>

                      <div class="max-h-60 overflow-y-auto custom-scrollbar py-1.5">
                        <button
                          v-for="v in filteredVehiculos"
                          :key="v.id_vehiculo"
                          type="button"
                          @click="selectVehiculo(v.id_vehiculo)"
                          class="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-all duration-200 group/option"
                          :class="selectedVehiculosIds.includes(v.id_vehiculo)
                            ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                        >
                          <div class="flex flex-col flex-1 min-w-0">
                            <span class="text-[13px] font-bold truncate">
                              {{ v.nombre }} <span class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pl-1">[{{ v.placa }}]</span>
                            </span>
                            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                              {{ v.tipo }}
                            </span>
                          </div>
                          
                          <HugeiconsIcon 
                            v-if="selectedVehiculosIds.includes(v.id_vehiculo)" 
                            :icon="CheckmarkCircle01Icon" 
                            :size="16" 
                            :stroke-width="2.5" 
                            class="shrink-0"
                          />
                        </button>
                        <div v-if="filteredVehiculos.length === 0" class="px-4 py-6 text-center text-slate-400 dark:text-slate-600 text-[12px] font-bold">
                          {{ searchQuery ? 'No se encontraron vehículos.' : (t('servicios.noVehiclesAvailable') || 'No hay vehículos disponibles.') }}
                        </div>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.cancel') || 'Cancelar' }}
            </AppButton>
            <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleCreate">
              {{ t('servicios.btnRegister') || 'Registrar Servicio' }}
            </AppButton>
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

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
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

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Estilos premium para inputs de fecha y hora */
:deep(.custom-datetime-input input[type="date"]),
:deep(.custom-datetime-input input[type="time"]) {
  position: relative;
  cursor: pointer;
}

/* Hace que al hacer click en cualquier parte del input se abra el selector interactivo */
:deep(.custom-datetime-input input[type="date"]::-webkit-calendar-picker-indicator),
:deep(.custom-datetime-input input[type="time"]::-webkit-calendar-picker-indicator) {
  background: transparent;
  bottom: 0;
  color: transparent;
  cursor: pointer;
  height: auto;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: auto;
  z-index: 10;
}
</style>
