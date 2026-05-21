<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Calendar01Icon,
  Clock01Icon,
  Car01Icon,
  CpuIcon,
  User02Icon,
  Cancel01Icon,
  Search01Icon,
  CheckmarkCircle01Icon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon,
  FloppyDiskIcon,
  ArrowDown01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import {
  fetchRutasSimplesApi,
  fetchVehiculosSimplesApi,
  fetchHardwareSimplesApi,
  fetchEscoltasSimplesApi,
  asignarRecursosServicioApi
} from '../services/servicios.api'
import type {
  Servicio,
  ServicioAsignarRecursosPayload,
  RutaSimple,
  VehiculoSimple,
  HardwareSimple,
  EscoltaSimple
} from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import AppButton from '../../../components/ui/AppButton.vue'

const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  servicio: Servicio | null
}>()

const emit = defineEmits(['update:isOpen', 'assigned'])

// Estados de carga e inicialización
const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

// Datos maestros cargados desde la API
const rutas = ref<RutaSimple[]>([])
const vehiculos = ref<VehiculoSimple[]>([])
const hardware = ref<HardwareSimple[]>([])
const escoltas = ref<EscoltaSimple[]>([])

// Estados de carga individuales
const loadingRutas = ref(false)
const loadingVehiculos = ref(false)
const loadingHardware = ref(false)
const loadingEscoltas = ref(false)

// Campos del formulario
const selectedRutaId = ref('')
const fechaInicio = ref('')
const horaInicio = ref('')
const modoFin = ref('1') // 1: Al llegar, 2: Al descargar
const nivelRiesgo = ref('1') // 1: Bajo, 2: Medio, 3: Alto

// Selecciones múltiples de recursos
const selectedVehiculosIds = ref<string[]>([])
const selectedHardwareIds = ref<string[]>([])
const selectedEscoltasIds = ref<string[]>([])

// Estados de control de apertura para dropdowns personalizados de multiselección
const isVehiculosDropdownOpen = ref(false)
const isHardwareDropdownOpen = ref(false)
const isEscoltasDropdownOpen = ref(false)

// Referencias HTML para detectar clics fuera y cerrar los dropdowns
const vehiculosDropdownRef = ref<HTMLElement | null>(null)
const hardwareDropdownRef = ref<HTMLElement | null>(null)
const escoltasDropdownRef = ref<HTMLElement | null>(null)

// Consultas de búsqueda local
const searchVehiculosQuery = ref('')
const searchHardwareQuery = ref('')
const searchEscoltasQuery = ref('')

// Opciones estáticas para selectores simples
const modoFinOptions = [
  { value: '1', label: 'Al llegar' },
  { value: '2', label: 'Al descargar' }
]

const nivelRiesgoOptions = [
  { value: '1', label: 'Bajo' },
  { value: '2', label: 'Medio' },
  { value: '3', label: 'Alto' }
]

// Rutas mapeadas para AppSelect
const rutaOptions = computed(() => {
  return rutas.value.map(r => ({
    value: r.id_ruta,
    label: r.nombre
  }))
})

// Filtrado reactivo de vehículos por búsqueda
const filteredVehiculos = computed(() => {
  const q = searchVehiculosQuery.value.toLowerCase().trim()
  if (!q) return vehiculos.value
  return vehiculos.value.filter(v =>
    v.nombre.toLowerCase().includes(q) ||
    v.placa.toLowerCase().includes(q) ||
    v.tipo.toLowerCase().includes(q)
  )
})

// Filtrado reactivo de hardware por búsqueda
const filteredHardware = computed(() => {
  const q = searchHardwareQuery.value.toLowerCase().trim()
  if (!q) return hardware.value
  return hardware.value.filter(h =>
    h.nombre.toLowerCase().includes(q) ||
    h.familia.toLowerCase().includes(q)
  )
})

// Filtrado reactivo de escoltas por búsqueda
const filteredEscoltas = computed(() => {
  const q = searchEscoltasQuery.value.toLowerCase().trim()
  if (!q) return escoltas.value
  return escoltas.value.filter(e =>
    e.nombre.toLowerCase().includes(q) ||
    e.celular.toLowerCase().includes(q)
  )
})

// Escuchador del estado del modal para cargar datos dinámicos al abrirse
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null

    // Reiniciar selecciones y campos
    selectedRutaId.value = ''
    selectedVehiculosIds.value = []
    selectedHardwareIds.value = []
    selectedEscoltasIds.value = []
    fechaInicio.value = ''
    horaInicio.value = ''
    modoFin.value = '1'
    nivelRiesgo.value = '1'

    searchVehiculosQuery.value = ''
    searchHardwareQuery.value = ''
    searchEscoltasQuery.value = ''

    isVehiculosDropdownOpen.value = false
    isHardwareDropdownOpen.value = false
    isEscoltasDropdownOpen.value = false

    // Pre-cargar fecha e inicio si el servicio ya posee estos datos
    if (props.servicio) {
      if (props.servicio.fecha_inicio) {
        const partes = props.servicio.fecha_inicio.split(' ')
        fechaInicio.value = partes[0] || ''
        if (partes[1]) {
          horaInicio.value = partes[1].substring(0, 5)
        }
      }
    }

    // Carga paralela de todos los recursos simples necesarios
    if (groupStore.selectedGroup?.id) {
      loadingRutas.value = true
      loadingVehiculos.value = true
      loadingHardware.value = true
      loadingEscoltas.value = true

      try {
        const [rutasData, vehiculosData, hardwareData, escoltasData] = await Promise.all([
          fetchRutasSimplesApi(groupStore.selectedGroup.id),
          fetchVehiculosSimplesApi(groupStore.selectedGroup.id),
          fetchHardwareSimplesApi(groupStore.selectedGroup.id),
          fetchEscoltasSimplesApi(groupStore.selectedGroup.id)
        ])
        rutas.value = rutasData
        vehiculos.value = vehiculosData
        hardware.value = hardwareData
        escoltas.value = escoltasData
      } catch (error) {
        console.error('Error al cargar datos maestros del grupo:', error)
        modalMessage.value = { text: 'Error al inicializar los recursos disponibles del grupo.', type: 'error' }
      } finally {
        loadingRutas.value = false
        loadingVehiculos.value = false
        loadingHardware.value = false
        loadingEscoltas.value = false
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

// Controladores para abrir/cerrar desplegables
const toggleVehiculosDropdown = () => {
  if (loadingVehiculos.value) return
  isVehiculosDropdownOpen.value = !isVehiculosDropdownOpen.value
  isHardwareDropdownOpen.value = false
  isEscoltasDropdownOpen.value = false
}

const toggleHardwareDropdown = () => {
  if (loadingHardware.value) return
  isHardwareDropdownOpen.value = !isHardwareDropdownOpen.value
  isVehiculosDropdownOpen.value = false
  isEscoltasDropdownOpen.value = false
}

const toggleEscoltasDropdown = () => {
  if (loadingEscoltas.value) return
  isEscoltasDropdownOpen.value = !isEscoltasDropdownOpen.value
  isVehiculosDropdownOpen.value = false
  isHardwareDropdownOpen.value = false
}

// Métodos de selección múltiple interactiva
const selectVehiculo = (id: string) => {
  const index = selectedVehiculosIds.value.indexOf(id)
  if (index > -1) {
    selectedVehiculosIds.value.splice(index, 1)
  } else {
    selectedVehiculosIds.value.push(id)
  }
}

const selectHardware = (id: string) => {
  const index = selectedHardwareIds.value.indexOf(id)
  if (index > -1) {
    selectedHardwareIds.value.splice(index, 1)
  } else {
    selectedHardwareIds.value.push(id)
  }
}

const selectEscolta = (id: string) => {
  const index = selectedEscoltasIds.value.indexOf(id)
  if (index > -1) {
    selectedEscoltasIds.value.splice(index, 1)
  } else {
    selectedEscoltasIds.value.push(id)
  }
}

// Helpers para obtener etiquetas de los badges seleccionados
const getVehiculoLabel = (id: string) => {
  const v = vehiculos.value.find(item => item.id_vehiculo === id)
  return v ? `${v.nombre} (${v.placa})` : id
}

const getHardwareLabel = (id: string) => {
  const h = hardware.value.find(item => item.id_hardware === id)
  return h ? h.nombre : id
}

const getEscoltaLabel = (id: string) => {
  const e = escoltas.value.find(item => item.id_escolta === id)
  return e ? e.nombre : id
}

const selectAllVehiculos = () => {
  filteredVehiculos.value.forEach(v => {
    if (!selectedVehiculosIds.value.includes(v.id_vehiculo)) {
      selectedVehiculosIds.value.push(v.id_vehiculo)
    }
  })
}

const clearVehiculos = () => {
  selectedVehiculosIds.value = []
}

const selectAllHardware = () => {
  filteredHardware.value.forEach(h => {
    if (!selectedHardwareIds.value.includes(h.id_hardware)) {
      selectedHardwareIds.value.push(h.id_hardware)
    }
  })
}

const clearHardware = () => {
  selectedHardwareIds.value = []
}

const selectAllEscoltas = () => {
  filteredEscoltas.value.forEach(e => {
    if (!selectedEscoltasIds.value.includes(e.id_escolta)) {
      selectedEscoltasIds.value.push(e.id_escolta)
    }
  })
}

const clearEscoltas = () => {
  selectedEscoltasIds.value = []
}

// Escucha clics fuera para cerrar dropdowns de multiselección
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (vehiculosDropdownRef.value && !vehiculosDropdownRef.value.contains(target)) {
    isVehiculosDropdownOpen.value = false
  }
  if (hardwareDropdownRef.value && !hardwareDropdownRef.value.contains(target)) {
    isHardwareDropdownOpen.value = false
  }
  if (escoltasDropdownRef.value && !escoltasDropdownRef.value.contains(target)) {
    isEscoltasDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Guardar y enviar la asignación de recursos a la API
const handleAsignar = async () => {
  if (saving.value) return

  if (!groupStore.selectedGroup?.id) {
    modalMessage.value = { text: 'Seleccione un grupo válido', type: 'error' }
    return
  }

  if (!props.servicio?.id_servicio) {
    modalMessage.value = { text: 'El servicio seleccionado es inválido', type: 'error' }
    return
  }

  if (!selectedRutaId.value) {
    modalMessage.value = { text: 'Debe seleccionar una ruta de viaje', type: 'error' }
    return
  }

  if (!fechaInicio.value || !horaInicio.value) {
    modalMessage.value = { text: 'La fecha y hora de inicio son requeridas', type: 'error' }
    return
  }

  if (selectedVehiculosIds.value.length === 0) {
    modalMessage.value = { text: 'Debe seleccionar al menos un vehículo', type: 'error' }
    return
  }

  if (selectedHardwareIds.value.length === 0) {
    modalMessage.value = { text: 'Debe seleccionar al menos un dispositivo de hardware', type: 'error' }
    return
  }

  if (selectedEscoltasIds.value.length === 0) {
    modalMessage.value = { text: 'Debe seleccionar al menos un escolta', type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload: ServicioAsignarRecursosPayload = {
    id_grupo: groupStore.selectedGroup.id,
    id_servicio: props.servicio.id_servicio,
    fecha_hora_inicio: `${fechaInicio.value} ${horaInicio.value}`,
    modo_fin: parseInt(modoFin.value, 10),
    nivel_riesgo: parseInt(nivelRiesgo.value, 10),
    id_ruta: selectedRutaId.value,
    vehiculos_id: selectedVehiculosIds.value,
    hardware_id: selectedHardwareIds.value,
    escoltas_id: selectedEscoltasIds.value
  }

  try {
    const data = await asignarRecursosServicioApi(payload)
    if (data.done) {
      isSuccess.value = true
      emit('assigned')
    } else {
      modalMessage.value = { text: data.message || 'Error al asignar recursos al servicio.', type: 'error' }
    }
  } catch (error: any) {
    console.error('Error en asignarRecursosServicioApi:', error)
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
    title="Asignar Recursos al Servicio"
    size="xl"
    :show-footer="false"
  >
    <template #icon>
      <HugeiconsIcon :icon="CpuIcon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- PANTALLA DE CARGA GLOBAL -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Asignando Recursos...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON CARGANDO INICIALIZACIÓN -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse p-4">
        <div class="space-y-3">
          <div class="h-2 w-16 bg-slate-100 dark:bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-3">
            <div class="h-2 w-20 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-6 pt-4">
          <div v-for="i in 3" :key="i" class="h-32 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        </div>
      </div>

      <!-- VISTA DE ÉXITO AL ASIGNAR -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Recursos Asignados Correctamente</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            Los vehículos, hardware y escoltas han sido programados para este servicio.
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cerrar Ventana
            </AppButton>
          </div>
        </div>

        <!-- FORMULARIO DE ASIGNACIÓN -->
        <div v-else class="animate-fade-in space-y-5">
          <!-- Tarjeta de Contenedor Principal (Glassmorphism) -->
          <div class="space-y-6 bg-gradient-to-b from-white/90 to-white/50 dark:from-[#1A1D24]/90 dark:to-[#0F1115]/90 backdrop-blur-2xl p-6 rounded-[24px] border border-white dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.3)] relative z-20 group/form">
            <!-- Brillo de ambiente superior derecho -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5 rounded-full blur-3xl group-hover/form:bg-[#3b82f6]/10 transition-colors duration-700 pointer-events-none"></div>

            <!-- Cabecera de Datos Generales -->
            <div class="flex items-center gap-3 relative z-10 border-b border-slate-100 dark:border-white/5 pb-4">
              <div class="w-9 h-9 rounded-[12px] bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/5 flex items-center justify-center text-[#3b82f6] border border-blue-200/60 dark:border-blue-500/30">
                <HugeiconsIcon :icon="Route01Icon" :size="18" class="drop-shadow-sm" />
              </div>
              <div>
                <h3 class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">Datos Operativos del Servicio</h3>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Asignar parámetros de inicio, ruta y modos finales.</p>
              </div>
            </div>

            <!-- Alertas de Validación / Error -->
            <Transition name="fade">
              <div v-if="modalMessage"
                   class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold border animate-fade-in-up relative z-10"
                   :class="modalMessage.type === 'error'
                     ? 'bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 shadow-[0_4px_12px_rgba(239,68,68,0.05)]'
                     : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#3b82f6] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : Tick01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <div class="space-y-4 relative z-10">
              <!-- Selección de Ruta (Ancho Completo) -->
              <AppSelect
                v-model="selectedRutaId"
                label="Ruta de Viaje"
                :placeholder="loadingRutas ? 'Cargando rutas...' : 'Seleccione una ruta de destino'"
                :icon="Route01Icon"
                :options="rutaOptions"
                :disabled="loadingRutas"
              />

              <!-- Grid de 4 Columnas: Fecha, Hora, Modo Fin, Nivel Riesgo -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AppInput
                  v-model="fechaInicio"
                  type="date"
                  label="Fecha de Inicio"
                  :icon="Calendar01Icon"
                  class="custom-datetime-input"
                />

                <AppInput
                  v-model="horaInicio"
                  type="time"
                  label="Hora de Inicio"
                  :icon="Clock01Icon"
                  class="custom-datetime-input"
                />

                <AppSelect
                  v-model="modoFin"
                  label="Modo Fin"
                  placeholder="Modo de Finalización"
                  :icon="Clock01Icon"
                  :options="modoFinOptions"
                />

                <AppSelect
                  v-model="nivelRiesgo"
                  label="Nivel de Riesgo"
                  placeholder="Nivel de Riesgo"
                  :icon="Alert01Icon"
                  :options="nivelRiesgoOptions"
                />
              </div>
            </div>

            <!-- SECCIÓN: SELECTORES MULTIPLE (GRID DE 3 COLUMNAS - XL) -->
            <div class="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-[12px] bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-500/20 dark:to-indigo-600/5 flex items-center justify-center text-indigo-500 border border-indigo-200/60 dark:border-indigo-500/30">
                  <HugeiconsIcon :icon="CpuIcon" :size="18" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">Asignación de Recursos</h3>
                  <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Asociar vehículos, hardware de rastreo y escoltas de seguridad.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-30">
                <!-- 1. VEHÍCULOS DISPONIBLES -->
                <div ref="vehiculosDropdownRef" class="space-y-2 relative transition-all duration-300" :class="{ 'z-50': isVehiculosDropdownOpen }">
                  <label
                    class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isVehiculosDropdownOpen }"
                  >
                    Vehículos Disponibles
                  </label>

                  <div class="relative">
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
                      <div class="text-slate-400 dark:text-slate-500 pr-2 shrink-0">
                        <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                      </div>

                      <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                        <template v-if="selectedVehiculosIds.length > 0">
                          <template v-if="selectedVehiculosIds.length <= 3">
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
                          <template v-else>
                            <div class="flex items-center gap-1.5 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30 animate-fade-in">
                              <span>{{ selectedVehiculosIds.length }} vehículos</span>
                              <button
                                type="button"
                                @click.stop="clearVehiculos"
                                class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 ml-0.5"
                              >
                                <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                              </button>
                            </div>
                          </template>
                        </template>
                        <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                          {{ loadingVehiculos ? 'Cargando...' : 'Seleccione vehículos' }}
                        </span>
                      </div>

                      <div class="text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isVehiculosDropdownOpen }">
                        <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
                      </div>
                    </button>

                    <!-- Listado Desplegable Vehículos -->
                    <Transition name="dropdown">
                      <div
                        v-if="isVehiculosDropdownOpen"
                        class="absolute z-[250] w-full mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
                      >
                        <!-- Buscador Interno -->
                        <div class="px-3 py-2 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#15181F]/50">
                          <div class="relative flex items-center bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6]/20 transition-all duration-300">
                            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                            <input
                              v-model="searchVehiculosQuery"
                              type="text"
                              placeholder="Buscar vehículo..."
                              class="w-full bg-transparent border-none text-[12px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 p-0"
                              @click.stop
                            />
                            <button
                              v-if="searchVehiculosQuery"
                              type="button"
                              @click.stop="searchVehiculosQuery = ''"
                              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 shrink-0"
                            >
                              <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
                            </button>
                          </div>
                        </div>

                        <!-- Barra de Control de Selección Múltiple y Contador -->
                        <div class="px-3.5 py-1.5 bg-slate-50/60 dark:bg-[#15181F]/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
                          <span>
                            {{ filteredVehiculos.length === vehiculos.length ? `${vehiculos.length} disponibles` : `${filteredVehiculos.length} de ${vehiculos.length}` }}
                          </span>
                          <div class="flex gap-2">
                            <button
                              type="button"
                              @click.stop="selectAllVehiculos"
                              class="text-[#3b82f6] dark:text-[#5da6fc] hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              :disabled="filteredVehiculos.length === 0"
                            >
                              Marcar todos
                            </button>
                            <span class="text-slate-300 dark:text-white/10">|</span>
                            <button
                              type="button"
                              @click.stop="clearVehiculos"
                              class="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              :disabled="selectedVehiculosIds.length === 0"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        <div class="max-h-72 overflow-y-auto custom-scrollbar py-1.5">
                          <button
                            v-for="v in filteredVehiculos"
                            :key="v.id_vehiculo"
                            type="button"
                            @click="selectVehiculo(v.id_vehiculo)"
                            class="w-full flex items-center justify-between gap-3 px-4 py-2 text-left transition-all duration-200 group/option"
                            :class="selectedVehiculosIds.includes(v.id_vehiculo)
                              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                          >
                            <div class="flex flex-col flex-1 min-w-0">
                              <span class="text-[12px] font-bold truncate">
                                {{ v.nombre }} <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 pl-1">[{{ v.placa }}]</span>
                              </span>
                              <span class="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate leading-tight">
                                {{ v.tipo }}
                              </span>
                            </div>
                            <HugeiconsIcon
                              v-if="selectedVehiculosIds.includes(v.id_vehiculo)"
                              :icon="CheckmarkCircle01Icon"
                              :size="14"
                              :stroke-width="2.5"
                              class="shrink-0 text-[#3b82f6] dark:text-[#5da6fc]"
                            />
                          </button>
                          <div v-if="filteredVehiculos.length === 0" class="px-4 py-6 text-center text-slate-400 dark:text-slate-600 text-[11px] font-bold">
                            No se encontraron vehículos disponibles.
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>

                <!-- 2. DISPOSITIVOS DE HARDWARE -->
                <div ref="hardwareDropdownRef" class="space-y-2 relative transition-all duration-300" :class="{ 'z-50': isHardwareDropdownOpen }">
                  <label
                    class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isHardwareDropdownOpen }"
                  >
                    Dispositivos de Hardware
                  </label>

                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleHardwareDropdown"
                      :disabled="loadingHardware"
                      class="relative flex items-center w-full min-h-[48px] bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 overflow-hidden transition-all duration-300 text-left"
                      :class="[
                        { 'opacity-60 cursor-not-allowed': loadingHardware },
                        {
                          'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20': isHardwareDropdownOpen,
                          'hover:border-slate-300 dark:hover:border-white/10': !isHardwareDropdownOpen && !loadingHardware
                        }
                      ]"
                    >
                      <div class="text-slate-400 dark:text-slate-500 pr-2 shrink-0">
                        <HugeiconsIcon :icon="CpuIcon" :size="18" :stroke-width="1.8" />
                      </div>

                      <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                        <template v-if="selectedHardwareIds.length > 0">
                          <template v-if="selectedHardwareIds.length <= 3">
                            <div
                              v-for="id in selectedHardwareIds"
                              :key="id"
                              class="flex items-center gap-1 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30"
                            >
                              <span>{{ getHardwareLabel(id) }}</span>
                              <button
                                type="button"
                                @click.stop="selectHardware(id)"
                                class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
                              >
                                <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                              </button>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex items-center gap-1.5 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30 animate-fade-in">
                              <span>{{ selectedHardwareIds.length }} dispositivos</span>
                              <button
                                type="button"
                                @click.stop="clearHardware"
                                class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 ml-0.5"
                              >
                                <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                              </button>
                            </div>
                          </template>
                        </template>
                        <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                          {{ loadingHardware ? 'Cargando...' : 'Seleccione hardware' }}
                        </span>
                      </div>

                      <div class="text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isHardwareDropdownOpen }">
                        <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
                      </div>
                    </button>

                    <!-- Listado Desplegable Hardware -->
                    <Transition name="dropdown">
                      <div
                        v-if="isHardwareDropdownOpen"
                        class="absolute z-[250] w-full mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
                      >
                        <!-- Buscador Interno -->
                        <div class="px-3 py-2 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#15181F]/50">
                          <div class="relative flex items-center bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6]/20 transition-all duration-300">
                            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                            <input
                              v-model="searchHardwareQuery"
                              type="text"
                              placeholder="Buscar hardware..."
                              class="w-full bg-transparent border-none text-[12px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 p-0"
                              @click.stop
                            />
                            <button
                              v-if="searchHardwareQuery"
                              type="button"
                              @click.stop="searchHardwareQuery = ''"
                              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 shrink-0"
                            >
                              <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
                            </button>
                          </div>
                        </div>

                        <!-- Barra de Control de Selección Múltiple y Contador -->
                        <div class="px-3.5 py-1.5 bg-slate-50/60 dark:bg-[#15181F]/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
                          <span>
                            {{ filteredHardware.length === hardware.length ? `${hardware.length} disponibles` : `${filteredHardware.length} de ${hardware.length}` }}
                          </span>
                          <div class="flex gap-2">
                            <button
                              type="button"
                              @click.stop="selectAllHardware"
                              class="text-[#3b82f6] dark:text-[#5da6fc] hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              :disabled="filteredHardware.length === 0"
                            >
                              Marcar todos
                            </button>
                            <span class="text-slate-300 dark:text-white/10">|</span>
                            <button
                              type="button"
                              @click.stop="clearHardware"
                              class="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              :disabled="selectedHardwareIds.length === 0"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        <div class="max-h-72 overflow-y-auto custom-scrollbar py-1.5">
                          <button
                            v-for="h in filteredHardware"
                            :key="h.id_hardware"
                            type="button"
                            @click="selectHardware(h.id_hardware)"
                            class="w-full flex items-center justify-between gap-3 px-4 py-2 text-left transition-all duration-200 group/option"
                            :class="selectedHardwareIds.includes(h.id_hardware)
                              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                          >
                            <div class="flex flex-col flex-1 min-w-0">
                              <span class="text-[12px] font-bold truncate">
                                {{ h.nombre }}
                              </span>
                              <span class="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate leading-tight">
                                Familia: {{ h.familia || 'No especificada' }}
                              </span>
                            </div>
                            <HugeiconsIcon
                              v-if="selectedHardwareIds.includes(h.id_hardware)"
                              :icon="CheckmarkCircle01Icon"
                              :size="14"
                              :stroke-width="2.5"
                              class="shrink-0 text-[#3b82f6] dark:text-[#5da6fc]"
                            />
                          </button>
                          <div v-if="filteredHardware.length === 0" class="px-4 py-6 text-center text-slate-400 dark:text-slate-600 text-[11px] font-bold">
                            No se encontraron dispositivos de hardware.
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>

                <!-- 3. ESCOLTAS DISPONIBLES -->
                <div ref="escoltasDropdownRef" class="space-y-2 relative transition-all duration-300" :class="{ 'z-50': isEscoltasDropdownOpen }">
                  <label
                    class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="{ 'text-[#3b82f6] dark:text-[#5da6fc]': isEscoltasDropdownOpen }"
                  >
                    Escoltas Disponibles
                  </label>

                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleEscoltasDropdown"
                      :disabled="loadingEscoltas"
                      class="relative flex items-center w-full min-h-[48px] bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2 overflow-hidden transition-all duration-300 text-left"
                      :class="[
                        { 'opacity-60 cursor-not-allowed': loadingEscoltas },
                        {
                          'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20': isEscoltasDropdownOpen,
                          'hover:border-slate-300 dark:hover:border-white/10': !isEscoltasDropdownOpen && !loadingEscoltas
                        }
                      ]"
                    >
                      <div class="text-slate-400 dark:text-slate-500 pr-2 shrink-0">
                        <HugeiconsIcon :icon="User02Icon" :size="18" :stroke-width="1.8" />
                      </div>

                      <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                        <template v-if="selectedEscoltasIds.length > 0">
                          <template v-if="selectedEscoltasIds.length <= 3">
                            <div
                              v-for="id in selectedEscoltasIds"
                              :key="id"
                              class="flex items-center gap-1 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30"
                            >
                              <span>{{ getEscoltaLabel(id) }}</span>
                              <button
                                type="button"
                                @click.stop="selectEscolta(id)"
                                class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
                              >
                                <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                              </button>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex items-center gap-1.5 bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#3b82f6]/20 dark:border-[#3b82f6]/30 animate-fade-in">
                              <span>{{ selectedEscoltasIds.length }} escoltas</span>
                              <button
                                type="button"
                                @click.stop="clearEscoltas"
                                class="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 ml-0.5"
                              >
                                <HugeiconsIcon :icon="Cancel01Icon" :size="10" :stroke-width="3" />
                              </button>
                            </div>
                          </template>
                        </template>
                        <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                          {{ loadingEscoltas ? 'Cargando...' : 'Seleccione escoltas' }}
                        </span>
                      </div>

                      <div class="text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isEscoltasDropdownOpen }">
                        <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" />
                      </div>
                    </button>

                    <!-- Listado Desplegable Escoltas -->
                    <Transition name="dropdown">
                      <div
                        v-if="isEscoltasDropdownOpen"
                        class="absolute z-[250] w-full mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
                      >
                        <!-- Buscador Interno -->
                        <div class="px-3 py-2 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-[#15181F]/50">
                          <div class="relative flex items-center bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 focus-within:border-[#3b82f6] dark:focus-within:border-[#5da6fc] focus-within:ring-1 focus-within:ring-[#3b82f6]/20 transition-all duration-300">
                            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                            <input
                              v-model="searchEscoltasQuery"
                              type="text"
                              placeholder="Buscar escolta..."
                              class="w-full bg-transparent border-none text-[12px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-0 p-0"
                              @click.stop
                            />
                            <button
                              v-if="searchEscoltasQuery"
                              type="button"
                              @click.stop="searchEscoltasQuery = ''"
                              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 shrink-0"
                            >
                              <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
                            </button>
                          </div>
                        </div>

                        <!-- Barra de Control de Selección Múltiple y Contador -->
                        <div class="px-3.5 py-1.5 bg-slate-50/60 dark:bg-[#15181F]/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none">
                          <span>
                            {{ filteredEscoltas.length === escoltas.length ? `${escoltas.length} disponibles` : `${filteredEscoltas.length} de ${escoltas.length}` }}
                          </span>
                          <div class="flex gap-2">
                            <button
                              type="button"
                              @click.stop="selectAllEscoltas"
                              class="text-[#3b82f6] dark:text-[#5da6fc] hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              :disabled="filteredEscoltas.length === 0"
                            >
                              Marcar todos
                            </button>
                            <span class="text-slate-300 dark:text-white/10">|</span>
                            <button
                              type="button"
                              @click.stop="clearEscoltas"
                              class="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              :disabled="selectedEscoltasIds.length === 0"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        <div class="max-h-72 overflow-y-auto custom-scrollbar py-1.5">
                          <button
                            v-for="e in filteredEscoltas"
                            :key="e.id_escolta"
                            type="button"
                            @click="selectEscolta(e.id_escolta)"
                            class="w-full flex items-center justify-between gap-3 px-4 py-2 text-left transition-all duration-200 group/option"
                            :class="selectedEscoltasIds.includes(e.id_escolta)
                              ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                          >
                            <div class="flex flex-col flex-1 min-w-0">
                              <span class="text-[12px] font-bold truncate uppercase">
                                {{ e.nombre }}
                              </span>
                              <span class="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate leading-tight">
                                Celular: {{ e.celular || 'Sin contacto' }}
                              </span>
                            </div>
                            <HugeiconsIcon
                              v-if="selectedEscoltasIds.includes(e.id_escolta)"
                              :icon="CheckmarkCircle01Icon"
                              :size="14"
                              :stroke-width="2.5"
                              class="shrink-0 text-[#3b82f6] dark:text-[#5da6fc]"
                            />
                          </button>
                          <div v-if="filteredEscoltas.length === 0" class="px-4 py-6 text-center text-slate-400 dark:text-slate-600 text-[11px] font-bold">
                            No se encontraron escoltas disponibles.
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTONES DE ACCIÓN EN EL FOOTER DEL MODAL -->
          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cancelar
            </AppButton>
            <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleAsignar">
              Confirmar Asignación
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

.dropdown-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}

/* Estilos para scrollbars internos de los dropdowns */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}

/* Estilos premium para inputs nativos de fecha y hora */
:deep(.custom-datetime-input input[type="date"]),
:deep(.custom-datetime-input input[type="time"]) {
  position: relative;
  cursor: pointer;
}

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
