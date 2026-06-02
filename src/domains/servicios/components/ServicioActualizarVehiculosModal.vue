<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  CpuIcon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import {
  fetchVehiculosSimplesApi,
  fetchHardwareSimplesApi,
  fetchServicioDashboardApi,
  actualizarVehiculosApi
} from '../services/servicios.api'
import type { Servicio, VehiculoSimple, HardwareSimple } from '../types/servicio'
import { SERVICIO_ESTADOS } from '../types/servicio'
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

const vehiculosDisponibles = ref<VehiculoSimple[]>([])
const hardware = ref<HardwareSimple[]>([])
const loadingVehiculos = ref(false)
const loadingHardware = ref(false)

const vehiculosActualesIds = ref<string[]>([])
const vehiculosActualesHardware = ref<Record<string, string[]>>({})

const selectedVehiculosIds = ref<string[]>([])
const vehiculosHardware = ref<Record<string, string[]>>({})
const vehiculoAsignandoHardware = ref<string | null>(null)

const searchVehiculosQuery = ref('')
const searchHardwareQuery = ref('')

const panelActivo = ref<'vehiculos' | 'hardware' | null>(null)
const btnVehiculos = ref<HTMLElement | null>(null)
const btnHardware = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})

const filteredVehiculos = computed(() => {
  const q = searchVehiculosQuery.value.toLowerCase().trim()
  if (!q) return vehiculosDisponibles.value
  return vehiculosDisponibles.value.filter(v =>
    v.nombre.toLowerCase().includes(q) ||
    v.placa.toLowerCase().includes(q) ||
    v.tipo.toLowerCase().includes(q)
  )
})

const filteredHardware = computed(() => {
  const q = searchHardwareQuery.value.toLowerCase().trim()
  if (!q) return hardware.value
  return hardware.value.filter(h =>
    h.nombre.toLowerCase().includes(q) ||
    h.familia.toLowerCase().includes(q)
  )
})

const vehiculosActualesLabels = computed(() => {
  return vehiculosActualesIds.value.map(id => {
    const v = vehiculosDisponibles.value.find(item => item.id_vehiculo === id)
    return v ? `${v.nombre} (${v.placa})` : id
  })
})

const vehiculosConHardwareCount = computed(() => {
  return selectedVehiculosIds.value.filter(id =>
    (vehiculosHardware.value[id] || []).length > 0
  ).length
})

const totalHardwareAsignado = computed(() => {
  return selectedVehiculosIds.value.reduce((acc, id) =>
    acc + (vehiculosHardware.value[id] || []).length, 0
  )
})

const currentVehiculoHardwareIds = computed(() => {
  if (!vehiculoAsignandoHardware.value) return []
  return vehiculosHardware.value[vehiculoAsignandoHardware.value] || []
})

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return

  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return

  const modalRect = modalEl.getBoundingClientRect()

  const panelWidth = 380
  const gap = 12
  const panelHeight = modalRect.height

  let left = modalRect.right + gap
  if (left + panelWidth > window.innerWidth - 16) {
    left = modalRect.left - panelWidth - gap
  }

  let top = modalRect.top
  if (top + panelHeight > window.innerHeight - 16) {
    top = window.innerHeight - panelHeight - 16
  }
  if (top < 8) top = 8

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    height: `${panelHeight}px`
  }
}

const abrirPanel = async (tipo: 'vehiculos' | 'hardware') => {
  if (panelActivo.value === tipo) {
    panelActivo.value = null
    return
  }
  if (tipo === 'hardware') {
    if (selectedVehiculosIds.value.length === 0) {
      modalMessage.value = { text: 'Primero seleccione al menos un vehículo', type: 'warning' }
      return
    }
    if (!vehiculoAsignandoHardware.value || !selectedVehiculosIds.value.includes(vehiculoAsignandoHardware.value)) {
      vehiculoAsignandoHardware.value = selectedVehiculosIds.value[0]
    }
  }
  panelActivo.value = tipo
  await nextTick()

  const refMap = {
    vehiculos: btnVehiculos.value,
    hardware: btnHardware.value
  }
  calcularPosicionPanel(refMap[tipo])
}

const cerrarPanel = () => {
  panelActivo.value = null
}

const selectVehiculo = (id: string) => {
  const index = selectedVehiculosIds.value.indexOf(id)
  if (index > -1) {
    selectedVehiculosIds.value.splice(index, 1)
    delete vehiculosHardware.value[id]
    if (vehiculoAsignandoHardware.value === id) {
      vehiculoAsignandoHardware.value = selectedVehiculosIds.value[0] || null
    }
  } else {
    selectedVehiculosIds.value.push(id)
    if (!vehiculosHardware.value[id]) {
      vehiculosHardware.value[id] = []
    }
  }
}

const selectHardware = (id: string) => {
  if (!vehiculoAsignandoHardware.value) return
  const vehiculoId = vehiculoAsignandoHardware.value
  if (!vehiculosHardware.value[vehiculoId]) {
    vehiculosHardware.value[vehiculoId] = []
  }
  const arr = vehiculosHardware.value[vehiculoId]
  const index = arr.indexOf(id)
  if (index > -1) {
    arr.splice(index, 1)
  } else {
    arr.push(id)
  }
}

const getVehiculoLabel = (id: string) => {
  const v = vehiculosDisponibles.value.find(item => item.id_vehiculo === id)
  return v ? `${v.nombre} (${v.placa})` : id
}

const getHardwareLabel = (id: string) => {
  const h = hardware.value.find(item => item.id_hardware === id)
  return h ? h.nombre : id
}

const clearVehiculos = () => {
  selectedVehiculosIds.value = []
  vehiculosHardware.value = {}
  vehiculoAsignandoHardware.value = null
}

const selectAllVehiculos = () => {
  filteredVehiculos.value.forEach(v => {
    if (!selectedVehiculosIds.value.includes(v.id_vehiculo)) {
      selectedVehiculosIds.value.push(v.id_vehiculo)
      if (!vehiculosHardware.value[v.id_vehiculo]) {
        vehiculosHardware.value[v.id_vehiculo] = []
      }
    }
  })
}

const selectAllHardware = () => {
  if (!vehiculoAsignandoHardware.value) return
  const vehiculoId = vehiculoAsignandoHardware.value
  if (!vehiculosHardware.value[vehiculoId]) {
    vehiculosHardware.value[vehiculoId] = []
  }
  filteredHardware.value.forEach(h => {
    if (!vehiculosHardware.value[vehiculoId].includes(h.id_hardware)) {
      vehiculosHardware.value[vehiculoId].push(h.id_hardware)
    }
  })
}

const clearHardware = () => {
  if (!vehiculoAsignandoHardware.value) return
  vehiculosHardware.value[vehiculoAsignandoHardware.value] = []
}

const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement

  const panelEl = document.querySelector('.panel-flotante-recursos')
  if (panelEl && panelEl.contains(target)) return

  const botones = [btnVehiculos.value, btnHardware.value]
  if (botones.some(btn => btn && btn.contains(target))) return

  panelActivo.value = null
}

const handleResize = () => {
  if (!panelActivo.value) return
  const refMap = {
    vehiculos: btnVehiculos.value,
    hardware: btnHardware.value
  }
  calcularPosicionPanel(refMap[panelActivo.value])
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null

    vehiculosActualesIds.value = []
    vehiculosActualesHardware.value = {}
    selectedVehiculosIds.value = []
    vehiculosHardware.value = {}
    vehiculoAsignandoHardware.value = null
    searchVehiculosQuery.value = ''
    searchHardwareQuery.value = ''
    panelActivo.value = null

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    loadingVehiculos.value = true
    loadingHardware.value = true
    try {
      const [vehiculosData, hardwareData, dashboardData] = await Promise.all([
        fetchVehiculosSimplesApi(groupStore.selectedGroup.id),
        fetchHardwareSimplesApi(groupStore.selectedGroup.id),
        fetchServicioDashboardApi({
          id_grupo: groupStore.selectedGroup.id,
          id_servicio: props.servicio.id_servicio,
          estado: SERVICIO_ESTADOS.EJECUCION_FAIL
        })
      ])

      vehiculosDisponibles.value = vehiculosData
      hardware.value = hardwareData

      if (dashboardData.done && dashboardData.data.servicios.length > 0) {
        const servicioData = dashboardData.data.servicios[0]
        vehiculosActualesIds.value = Object.keys(servicioData.vehiculos || {})
        vehiculosActualesHardware.value = servicioData.vehiculos || {}
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
      modalMessage.value = { text: 'Error al cargar los datos del servicio.', type: 'error' }
    } finally {
      loadingVehiculos.value = false
      loadingHardware.value = false
      isLoading.value = false
    }
  } else {
    panelActivo.value = null
  }
})

const handleActualizar = async () => {
  if (saving.value) return

  if (selectedVehiculosIds.value.length === 0) {
    modalMessage.value = { text: 'Seleccione al menos un vehículo que va a entrar.', type: 'warning' }
    return
  }

  for (const vehiculoId of selectedVehiculosIds.value) {
    const hwIds = vehiculosHardware.value[vehiculoId] || []
    if (hwIds.length === 0) {
      const label = getVehiculoLabel(vehiculoId)
      modalMessage.value = { text: `Debe asignar hardware al vehículo: ${label}`, type: 'warning' }
      return
    }
  }

  saving.value = true
  modalMessage.value = null

  const ids_entran: Record<string, string[]> = {}
  for (const vehiculoId of selectedVehiculosIds.value) {
    ids_entran[vehiculoId] = vehiculosHardware.value[vehiculoId] || []
  }

  try {
    const data = await actualizarVehiculosApi({
      id_grupo: groupStore.selectedGroup.id,
      id_servicio: props.servicio!.id_servicio,
      ids_salen: vehiculosActualesIds.value,
      ids_entran
    })

    if (data.done) {
      isSuccess.value = true
      emit('updated')
    } else {
      modalMessage.value = { text: data.message || 'Error al actualizar vehículos.', type: 'error' }
    }
  } catch (error: any) {
    console.error('Error en actualizarVehiculosApi:', error)
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
    @confirm="handleActualizar"
    title="Actualizar Vehículos"
    confirm-text="Confirmar Cambio"
    size="md"
    :show-footer="!isSuccess && !isLoading"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
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
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Actualizando Vehículos...</span>
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
          <div class="grid grid-cols-2 gap-4">
            <div v-for="i in 2" :key="i" class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
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
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">Vehículos Actualizados Correctamente</h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            Los vehículos y hardware han sido actualizados exitosamente en el servicio.
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
            <!-- VEHÍCULOS ACTUALES -->
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                Vehículos Actuales
              </label>
              <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
                <div class="flex items-center gap-3 px-4 py-3.5">
                  <div class="text-slate-400 dark:text-slate-500 shrink-0">
                    <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                  </div>
                  <div class="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px]">
                    <template v-if="vehiculosActualesLabels.length > 0">
                      <div
                        v-for="(label, idx) in vehiculosActualesLabels"
                        :key="vehiculosActualesIds[idx]"
                        class="badge-recurso badge-recurso--readonly"
                      >
                        <span class="truncate max-w-[150px]">{{ label }}</span>
                      </div>
                    </template>
                    <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                      Sin vehículos asignados
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SECCIÓN: NUEVOS VEHÍCULOS Y HARDWARE -->
            <div class="pt-6 border-t border-white/5 space-y-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                  <HugeiconsIcon :icon="CpuIcon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">Nuevos Vehículos y Hardware</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">Seleccionar vehículos entrantes y asignar dispositivos de rastreo.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

                <!-- VEHÍCULOS -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'vehiculos' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    Vehículos Disponibles
                  </label>
                  <button
                    ref="btnVehiculos"
                    type="button"
                    @click="abrirPanel('vehiculos')"
                    :disabled="loadingVehiculos"
                    class="selector-btn bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]"
                    :class="[
                      loadingVehiculos ? 'opacity-60 cursor-not-allowed' : '',
                      panelActivo === 'vehiculos' ? 'panel-on' : ''
                    ]"
                  >
                    <div
                      class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300 animate-none pointer-events-none"
                      :class="{ 'opacity-100 left-2 right-2': panelActivo === 'vehiculos' }"
                    ></div>

                    <div
                      class="relative z-10 text-slate-400 dark:text-slate-500 transition-colors duration-300 mr-2 shrink-0"
                      :class="panelActivo === 'vehiculos' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''"
                    >
                      <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                    </div>
                    <div class="relative z-10 flex-1 flex flex-wrap gap-1.5 py-0.5 min-h-[28px] items-center">
                      <template v-if="selectedVehiculosIds.length > 0">
                        <template v-if="selectedVehiculosIds.length <= 2">
                          <div
                            v-for="id in selectedVehiculosIds"
                            :key="id"
                            class="badge-recurso"
                          >
                            <span class="truncate max-w-[80px]">{{ getVehiculoLabel(id) }}</span>
                            <button type="button" @click.stop="selectVehiculo(id)" class="hover:text-red-400 transition-colors shrink-0">
                              <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                            </button>
                          </div>
                        </template>
                        <template v-else>
                          <div class="badge-recurso">
                            <span>{{ selectedVehiculosIds.length }} vehículos</span>
                            <button type="button" @click.stop="clearVehiculos" class="hover:text-red-400 transition-colors shrink-0">
                              <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                            </button>
                          </div>
                        </template>
                      </template>
                      <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        {{ loadingVehiculos ? 'Cargando...' : 'Seleccione vehículos' }}
                      </span>
                    </div>
                    <div
                      class="relative z-10 text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-all duration-300"
                      :class="[
                        panelActivo === 'vehiculos' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : '',
                        { 'rotate-180': panelActivo === 'vehiculos' }
                      ]"
                    >
                      <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                    </div>
                  </button>
                </div>

                <!-- HARDWARE -->
                <div class="space-y-2">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    Dispositivos de Hardware
                  </label>
                  <button
                    ref="btnHardware"
                    type="button"
                    @click="abrirPanel('hardware')"
                    :disabled="loadingHardware || selectedVehiculosIds.length === 0"
                    class="selector-btn bg-slate-50 border border-slate-200 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:bg-[#0F1115] dark:border-white/5 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]"
                    :class="[
                      loadingHardware || selectedVehiculosIds.length === 0 ? 'opacity-60 cursor-not-allowed' : '',
                      panelActivo === 'hardware' ? 'panel-on' : ''
                    ]"
                  >
                    <div
                      class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300 animate-none pointer-events-none"
                      :class="{ 'opacity-100 left-2 right-2': panelActivo === 'hardware' }"
                    ></div>

                    <div
                      class="relative z-10 text-slate-400 dark:text-slate-500 transition-colors duration-300 mr-2 shrink-0"
                      :class="panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : ''"
                    >
                      <HugeiconsIcon :icon="CpuIcon" :size="18" :stroke-width="1.8" />
                    </div>
                    <div class="relative z-10 flex-1 flex flex-wrap gap-1.5 py-0.5 min-h-[28px] items-center">
                      <template v-if="selectedVehiculosIds.length > 0 && totalHardwareAsignado > 0">
                        <div class="badge-recurso">
                          <span>{{ vehiculosConHardwareCount }}/{{ selectedVehiculosIds.length }} vehículos</span>
                        </div>
                        <div class="badge-recurso">
                          <span>{{ totalHardwareAsignado }} dispositivos</span>
                        </div>
                      </template>
                      <span v-else-if="selectedVehiculosIds.length === 0" class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        Seleccione vehículos primero
                      </span>
                      <span v-else class="text-slate-400 dark:text-slate-600 text-sm font-medium">
                        {{ loadingHardware ? 'Cargando...' : 'Asignar hardware a vehículos' }}
                      </span>
                    </div>
                    <div
                      class="relative z-10 text-slate-400 dark:text-slate-500 pl-2 shrink-0 transition-all duration-300"
                      :class="[
                        panelActivo === 'hardware' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : '',
                        { 'rotate-180': panelActivo === 'hardware' }
                      ]"
                    >
                      <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>

  <!-- PANEL FLOTANTE DE SELECCIÓN — Teleport fuera del modal -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isSuccess && !isLoading"
        class="panel-flotante-recursos fixed z-[200] flex flex-col overflow-hidden"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <!-- Franja superior de color -->
        <div class="panel-acento shrink-0" />

        <!-- ========== CABECERA ========== -->
        <div class="panel-head px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="panel-head-icon">
              <HugeiconsIcon
                :icon="panelActivo === 'vehiculos' ? Car01Icon : CpuIcon"
                :size="17"
              />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-white tracking-tight">
                {{ panelActivo === 'vehiculos' ? 'Vehículos disponibles' : 'Hardware disponible' }}
              </h4>
              <p class="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {{
                  panelActivo === 'vehiculos'
                    ? `${filteredVehiculos.length} en flota`
                    : `${filteredHardware.length} dispositivos`
                }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="cerrarPanel"
            class="panel-close-btn"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <!-- ========== BUSCADOR ========== -->
        <div class="px-4 pb-3 shrink-0">
          <!-- Selector de vehículo (solo para panel de hardware) -->
          <div v-if="panelActivo === 'hardware'" class="mb-3 space-y-2">
            <span class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Asignar hardware a:</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="vehiculoId in selectedVehiculosIds"
                :key="vehiculoId"
                type="button"
                @click.stop="vehiculoAsignandoHardware = vehiculoId"
                class="vehiculo-tab"
                :class="vehiculoAsignandoHardware === vehiculoId ? 'vehiculo-tab--active' : 'vehiculo-tab--inactive'"
              >
                <HugeiconsIcon :icon="Car01Icon" :size="12" />
                <span class="truncate max-w-[100px]">{{ getVehiculoLabel(vehiculoId) }}</span>
                <span v-if="(vehiculosHardware[vehiculoId] || []).length > 0" class="vehiculo-tab-count">
                  {{ (vehiculosHardware[vehiculoId] || []).length }}
                </span>
              </button>
            </div>
          </div>
          <div class="panel-search-wrap">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-if="panelActivo === 'vehiculos'"
              v-model="searchVehiculosQuery"
              type="text"
              placeholder="Nombre, placa o tipo..."
              class="panel-search-input"
              @click.stop
            />
            <input
              v-else
              v-model="searchHardwareQuery"
              type="text"
              placeholder="Nombre o familia..."
              class="panel-search-input"
              @click.stop
            />
            <button
              v-if="(panelActivo === 'vehiculos' && searchVehiculosQuery) || (panelActivo === 'hardware' && searchHardwareQuery)"
              type="button"
              @click.stop="panelActivo === 'vehiculos' ? searchVehiculosQuery = '' : searchHardwareQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <!-- ========== BARRA CONTROL ========== -->
        <div class="px-4 py-1.5 flex items-center justify-between shrink-0 border-y border-white/5">
          <span class="text-[10px] font-bold tabular-nums text-blue-500 dark:text-blue-400">
            <template v-if="panelActivo === 'vehiculos'">
              {{ selectedVehiculosIds.length }} seleccionados
            </template>
            <template v-else>
              {{ currentVehiculoHardwareIds.length }} seleccionados
            </template>
          </span>
          <div class="flex items-center gap-3 text-[10px] font-semibold">
            <button
              type="button"
              @click.stop="panelActivo === 'vehiculos' ? selectAllVehiculos() : selectAllHardware()"
              class="text-slate-400 hover:text-[#5da6fc] transition-colors"
            >
              Todos
            </button>
            <span class="w-px h-3 bg-white/10"></span>
            <button
              type="button"
              @click.stop="panelActivo === 'vehiculos' ? clearVehiculos() : clearHardware()"
              class="text-slate-400 hover:text-red-400 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        <!-- ========== LISTADO ========== -->
        <div class="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-1">
          <!-- Vehículos -->
          <template v-if="panelActivo === 'vehiculos'">
            <button
              v-for="v in filteredVehiculos"
              :key="v.id_vehiculo"
              type="button"
              @click="selectVehiculo(v.id_vehiculo)"
              class="panel-row group/row"
              :class="selectedVehiculosIds.includes(v.id_vehiculo) ? 'panel-row--on' : 'panel-row--off'"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="selectedVehiculosIds.includes(v.id_vehiculo) ? 'panel-row-dot--on' : 'panel-row-dot--off'"
              >
                <HugeiconsIcon v-if="selectedVehiculosIds.includes(v.id_vehiculo)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <span class="text-[12px] font-semibold truncate leading-snug">
                  {{ v.nombre }}
                  <span class="text-[10px] font-mono opacity-50 ml-1">{{ v.placa }}</span>
                </span>
                <span class="text-[10px] truncate leading-none mt-0.5 text-slate-400">{{ v.tipo }}</span>
              </div>
            </button>
            <div v-if="filteredVehiculos.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="Car01Icon" :size="24" class="opacity-30 mb-2" />
              <span>{{ searchVehiculosQuery ? 'No se encontraron vehículos.' : 'Sin vehículos disponibles' }}</span>
            </div>
          </template>

          <!-- Hardware -->
          <template v-else>
            <button
              v-for="h in filteredHardware"
              :key="h.id_hardware"
              type="button"
              @click="selectHardware(h.id_hardware)"
              class="panel-row group/row"
              :class="currentVehiculoHardwareIds.includes(h.id_hardware) ? 'panel-row--on' : 'panel-row--off'"
            >
              <div
                class="panel-row-dot shrink-0"
                :class="currentVehiculoHardwareIds.includes(h.id_hardware) ? 'panel-row-dot--on' : 'panel-row-dot--off'"
              >
                <HugeiconsIcon v-if="currentVehiculoHardwareIds.includes(h.id_hardware)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
              </div>
              <div class="flex flex-col flex-1 min-w-0 text-left">
                <span class="text-[12px] font-semibold truncate leading-snug">{{ h.nombre }}</span>
                <span class="text-[10px] truncate leading-none mt-0.5 text-slate-400">{{ h.familia || 'Sin familia' }}</span>
              </div>
            </button>
            <div v-if="filteredHardware.length === 0" class="panel-empty">
              <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-30 mb-2" />
              <span>{{ searchHardwareQuery ? 'No se encontraron dispositivos.' : 'Sin hardware disponible' }}</span>
            </div>
          </template>
        </div>

        <!-- ========== FOOTER ========== -->
        <div class="px-4 py-3.5 shrink-0 panel-footer">
          <button
            type="button"
            @click="cerrarPanel"
            class="panel-confirm-btn"
          >
            <HugeiconsIcon :icon="Tick01Icon" :size="14" />
            Confirmar Selección
            <template v-if="panelActivo === 'vehiculos'">({{ selectedVehiculosIds.length }})</template>
            <template v-else-if="panelActivo === 'hardware'">({{ currentVehiculoHardwareIds.length }})</template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* =====================================================
   SELECTOR BUTTONS (dentro del formulario)
===================================================== */
.selector-btn {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: 0.5rem 1rem;
  text-align: left;
  transition: all 0.2s ease;
  overflow: visible;
}
.selector-btn:hover:not(:disabled) {
  border-color: #cbd5e1 !important;
}
:global(.dark) .selector-btn:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.15) !important;
}
.selector-btn.panel-on {
  border-color: #3b82f6 !important;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(59,130,246,0.2) !important;
}
:global(.dark) .selector-btn.panel-on {
  border-color: #5da6fc !important;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(93,166,252,0.2) !important;
}

.badge-recurso {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(59,130,246,0.25);
}

.badge-recurso--readonly {
  background: rgba(148, 163, 184, 0.1);
  color: #64748b;
  border-color: rgba(148, 163, 184, 0.2);
}

:global(.dark) .badge-recurso--readonly {
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border-color: rgba(255, 255, 255, 0.08);
}

/* Tabs de vehículo para hardware */
.vehiculo-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
}
.vehiculo-tab--inactive {
  background: rgba(255,255,255,0.03);
  color: #94a3b8;
  border-color: rgba(255,255,255,0.06);
}
.vehiculo-tab--inactive:hover {
  background: rgba(255,255,255,0.06);
  color: #cbd5e1;
}
.vehiculo-tab--active {
  background: rgba(59,130,246,0.12);
  color: #5da6fc;
  border-color: rgba(59,130,246,0.25);
}
.vehiculo-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  background: rgba(59,130,246,0.2);
  color: #5da6fc;
}

/* =====================================================
   PANEL FLOTANTE — Estructura
   ===================================================== */
.panel-flotante-recursos {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.5),
    0 8px 24px -4px rgba(0,0,0,0.3);
}
:global(.dark) .panel-flotante-recursos {
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  border-color: rgba(255,255,255,0.07);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.55),
    0 8px 24px -4px rgba(0,0,0,0.3);
}

/* Franja de acento superior */
.panel-acento {
  height: 3px;
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #3b82f6, #5da6fc);
}

/* Cabecera */
.panel-head {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.panel-head-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59,130,246,0.1);
  color: #3b82f6;
  border: 1px solid rgba(59,130,246,0.2);
}

.panel-close-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.panel-close-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

/* Buscador */
.panel-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0f1115;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 14px;
  transition: all 0.3s ease;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.25);
}
.panel-search-wrap:focus-within {
  border-color: #5da6fc;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(93,166,252,0.2);
}

.panel-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  outline: none;
  box-shadow: none;
  padding: 0;
}
.panel-search-input::placeholder { color: #475569; }

/* Filas del listado */
.panel-row {
  width: calc(100% - 24px);
  margin: 4px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  color: #cbd5e1;
}

.panel-row--off {
  background: rgba(255, 255, 255, 0.01);
  border-color: rgba(255, 255, 255, 0.02);
}
.panel-row--off:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}

.panel-row--on {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
}
.panel-row--on:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.25);
  transform: translateY(-1px);
}

/* Indicador circular de selección */
.panel-row-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-row-dot--off {
  border: 1.5px solid rgba(148, 163, 184, 0.3);
  background: transparent;
}

.panel-row-dot--on {
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 2px 6px rgba(59,130,246,0.4);
}

/* Estado vacío */
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

/* Footer */
.panel-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.panel-confirm-btn {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}
.panel-confirm-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}
.panel-confirm-btn:active { transform: translateY(1px); }

/* Animaciones */
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

/* Animación del panel flotante */
.panel-flotante-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-flotante-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* Scrollbar del panel */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1A1D24;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}

/* Overrides para inputs dentro del modal - estilo glassmorphism dark */
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