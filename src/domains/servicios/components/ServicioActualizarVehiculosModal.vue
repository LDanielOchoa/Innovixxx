<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  CpuIcon,
  Cancel01Icon,
  Search01Icon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import {
  actualizarVehiculosApi
} from '../services/servicios.api'
import type { ServicioDashboard, VehiculoSimple, HardwareSimple } from '../types/servicio'
import { SERVICIO_ESTADOS } from '../types/servicio'
import AppModal from '../../../components/ui/AppModal.vue'

import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { servicioActualizarVehiculosSchema } from '../../../schemas/servicios.schema'
import { useToast } from 'primevue/usetoast'

const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: ServicioDashboard | null
  vehiculos: VehiculoSimple[]
  hardware: HardwareSimple[]
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

// Estados de carga y guardar
const isLoading = ref(true)
const saving = ref(false)


const { validate, getFirstError } = useFormValidator(servicioActualizarVehiculosSchema)
const { getError, clearErrors } = useFormError('servicio-actualizar-vehiculos')

// Catálogos cargados de la API
const vehiculosDisponibles = ref<VehiculoSimple[]>([])
const hardwareDisponibles = ref<HardwareSimple[]>([])
const loadingVehiculos = ref(false)
const loadingHardware = ref(false)

// Cuadrante Superior Izquierdo y Derecho (Vehículos actuales y su hardware asignado)
const vehiculosActualesIds = ref<string[]>([])
const vehiculosActualesHardwareOriginal = ref<Record<string, string[]>>({})
const vehiculosActualesHardwareModificado = ref<Record<string, string[]>>({})
const vehiculosSalenIds = ref<string[]>([])
const vehiculoActualSeleccionadoId = ref<string | null>(null)

// Cuadrante Inferior Izquierdo y Derecho (Vehículos entrantes y su nuevo hardware)
const vehiculosEntranIds = ref<string[]>([])
const vehiculosEntranHardware = ref<Record<string, string[]>>({})
const vehiculoNuevoSeleccionadoId = ref<string | null>(null)

// Buscadores locales
const filtroVehiculosDisponiblesQuery = ref('')
const filtroHardwareDisponibleQuery = ref('')

// Hover de hardware para resaltado bidireccional
const hardwareHoveredId = ref<string | null>(null)

// Obtener vehículo asociado a un ID de hardware
const obtenerVehiculoAsociado = (hwId: string): string | null => {
  // Buscar en vehículos actuales activos (que no estén marcados para salir)
  for (const vId of vehiculosActualesIds.value) {
    if (!vehiculosSalenIds.value.includes(vId)) {
      const hwList = vehiculosActualesHardwareModificado.value[vId] || []
      if (hwList.includes(hwId)) return vId
    }
  }
  // Buscar en vehículos nuevos entrantes
  for (const vId of vehiculosEntranIds.value) {
    const hwList = vehiculosEntranHardware.value[vId] || []
    if (hwList.includes(hwId)) return vId
  }
  return null
}

const vehiculoEstaOpacado = (vId: string) => {
  if (!hardwareHoveredId.value) return false
  const asociado = obtenerVehiculoAsociado(hardwareHoveredId.value)
  return asociado !== null && asociado !== vId
}

const vehiculoEstaResaltado = (vId: string) => {
  if (!hardwareHoveredId.value) return false
  return obtenerVehiculoAsociado(hardwareHoveredId.value) === vId
}

// Filtrado de vehículos disponibles (los que no están asignados actualmente ni seleccionados para entrar)
const vehiculosDisponiblesFiltrados = computed(() => {
  const query = filtroVehiculosDisponiblesQuery.value.toLowerCase().trim()
  return vehiculosDisponibles.value.filter(v => {
    // Excluir si ya está asignado actualmente (y no marcado para salir)
    const estaAsignadoActual = vehiculosActualesIds.value.includes(v.id_vehiculo) && !vehiculosSalenIds.value.includes(v.id_vehiculo)
    if (estaAsignadoActual) return false

    // Filtro de texto
    if (!query) return true
    return (
      v.placa.toLowerCase().includes(query) ||
      v.tipo.toLowerCase().includes(query)
    )
  })
})

// Filtrado de todos los hardware de la flota
const hardwareDisponiblesFiltrados = computed(() => {
  const query = filtroHardwareDisponibleQuery.value.toLowerCase().trim()
  return hardwareDisponibles.value.filter(h => {
    if (!query) return true
    return (
      h.nombre.toLowerCase().includes(query) ||
      h.familia.toLowerCase().includes(query)
    )
  })
})

// Obtener todos los hardware asignados del servicio
const todosLosHardwareAsignados = computed(() => {
  const result: { id_hardware: string; id_vehiculo: string }[] = []
  for (const vId of vehiculosActualesIds.value) {
    if (!vehiculosSalenIds.value.includes(vId)) {
      const hwList = vehiculosActualesHardwareModificado.value[vId] || []
      for (const hwId of hwList) {
        result.push({ id_hardware: hwId, id_vehiculo: vId })
      }
    }
  }
  for (const vId of vehiculosEntranIds.value) {
    const hwList = vehiculosEntranHardware.value[vId] || []
    for (const hwId of hwList) {
      result.push({ id_hardware: hwId, id_vehiculo: vId })
    }
  }
  return result
})

// Obtener etiquetas descriptivas
const getVehiculoLabel = (id: string) => {
  const v = vehiculosDisponibles.value.find(item => item.id_vehiculo === id)
  return v ? `${v.placa} (${v.tipo})` : id
}

const getHardwareLabel = (id: string) => {
  const h = hardwareDisponibles.value.find(item => item.id_hardware === id)
  return h ? h.nombre : id
}

// Acciones sobre vehículos actuales
const seleccionarVehiculoActual = (id: string) => {
  if (vehiculosSalenIds.value.includes(id)) return // No se puede seleccionar si está marcado para salir
  vehiculoActualSeleccionadoId.value = id
}

const alternarEliminarVehiculoActual = (id: string) => {
  const index = vehiculosSalenIds.value.indexOf(id)
  if (index > -1) {
    // Cancelar la eliminación
    vehiculosSalenIds.value.splice(index, 1)
    if (!vehiculoActualSeleccionadoId.value) {
      vehiculoActualSeleccionadoId.value = id
    }
  } else {
    // Marcar para eliminación
    vehiculosSalenIds.value.push(id)
    if (vehiculoActualSeleccionadoId.value === id) {
      // Buscar otro vehículo actual activo para seleccionar
      const siguienteActivo = vehiculosActualesIds.value.find(vId => !vehiculosSalenIds.value.includes(vId))
      vehiculoActualSeleccionadoId.value = siguienteActivo || null
    }
  }
}

// Remover hardware de un vehículo actual
const removerHardwareVehiculoActual = (hardwareId: string) => {
  if (!vehiculoActualSeleccionadoId.value) return
  const vId = vehiculoActualSeleccionadoId.value
  const lista = vehiculosActualesHardwareModificado.value[vId] || []
  const index = lista.indexOf(hardwareId)
  if (index > -1) {
    lista.splice(index, 1)
  }
}

// Acciones sobre vehículos nuevos (entrantes)
const alternarVehiculoNuevo = (id: string) => {
  const estaSeleccionado = vehiculosEntranIds.value.includes(id)
  
  // Limpiar selecciones previas de vehículos nuevos
  vehiculosEntranIds.value = []
  vehiculosEntranHardware.value = {}
  vehiculoNuevoSeleccionadoId.value = null

  if (!estaSeleccionado) {
    // Seleccionar vehículo nuevo único
    vehiculosEntranIds.value.push(id)
    vehiculosEntranHardware.value[id] = []
    vehiculoNuevoSeleccionadoId.value = id
  }
}

// Asignar/desasignar hardware a un vehículo nuevo
const alternarHardwareVehiculoNuevo = (hardwareId: string) => {
  if (!vehiculoNuevoSeleccionadoId.value) return
  const vId = vehiculoNuevoSeleccionadoId.value
  const lista = vehiculosEntranHardware.value[vId] || []
  const index = lista.indexOf(hardwareId)
  if (index > -1) {
    lista.splice(index, 1)
  } else {
    lista.push(hardwareId)
  }
}

// Carga inicial de datos
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    clearErrors()

    // Reiniciar estados
    vehiculosActualesIds.value = []
    vehiculosActualesHardwareOriginal.value = {}
    vehiculosActualesHardwareModificado.value = {}
    vehiculosSalenIds.value = []
    vehiculoActualSeleccionadoId.value = null

    vehiculosEntranIds.value = []
    vehiculosEntranHardware.value = {}
    vehiculoNuevoSeleccionadoId.value = null

    filtroVehiculosDisponiblesQuery.value = ''
    filtroHardwareDisponibleQuery.value = ''

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    try {
      vehiculosDisponibles.value = props.vehiculos
      hardwareDisponibles.value = props.hardware

      if (props.servicio) {
        vehiculosActualesIds.value = Object.keys(props.servicio.vehiculos || {})
        vehiculosActualesHardwareOriginal.value = JSON.parse(JSON.stringify(props.servicio.vehiculos || {}))
        vehiculosActualesHardwareModificado.value = JSON.parse(JSON.stringify(props.servicio.vehiculos || {}))
        
        // Seleccionar por defecto el primer vehículo activo
        if (vehiculosActualesIds.value.length > 0) {
          vehiculoActualSeleccionadoId.value = vehiculosActualesIds.value[0] || null
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
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

// Enviar actualización
const handleActualizar = async () => {
  if (saving.value) return
  clearErrors()

  // Validar que cada vehículo nuevo seleccionado tenga al menos un hardware asignado
  for (const vehiculoId of vehiculosEntranIds.value) {
    const hwIds = vehiculosEntranHardware.value[vehiculoId] || []
    if (hwIds.length === 0) {
      const label = getVehiculoLabel(vehiculoId)
      toast.add({
        severity: 'warn',
        summary: 'Validación',
        detail: `Debe asignar hardware al vehículo entrante: ${label}`,
        life: 4000
      })
      return
    }
  }

  // Validar que los vehículos actuales activos no se queden sin hardware si han sido modificados
  for (const vehiculoId of vehiculosActualesIds.value) {
    if (vehiculosSalenIds.value.includes(vehiculoId)) continue
    const hwIds = vehiculosActualesHardwareModificado.value[vehiculoId] || []
    if (hwIds.length === 0) {
      const label = getVehiculoLabel(vehiculoId)
      toast.add({
        severity: 'warn',
        summary: 'Validación',
        detail: `El vehículo actual ${label} no puede quedarse sin hardware.`,
        life: 4000
      })
      return
    }
  }

  // Construir payload
  const idsSalenSet = new Set<string>(vehiculosSalenIds.value)
  const ids_entran: Record<string, string[]> = {}

  // Agregar vehículos nuevos a registrar
  for (const vehiculoId of vehiculosEntranIds.value) {
    ids_entran[vehiculoId] = vehiculosEntranHardware.value[vehiculoId] || []
  }

  // Identificar si algún vehículo actual sufrió modificaciones en su hardware
  for (const vehiculoId of vehiculosActualesIds.value) {
    if (idsSalenSet.has(vehiculoId)) continue

    const orig = vehiculosActualesHardwareOriginal.value[vehiculoId] || []
    const mod = vehiculosActualesHardwareModificado.value[vehiculoId] || []

    const haCambiado = orig.length !== mod.length || orig.some(hwId => !mod.includes(hwId))
    if (haCambiado) {
      // Para actualizar la configuración de hardware de un vehículo actual, lo sacamos y lo volvemos a meter con el hardware nuevo
      idsSalenSet.add(vehiculoId)
      ids_entran[vehiculoId] = mod
    }
  }

  const final_ids_salen = Array.from(idsSalenSet)

  const payload = {
    id_grupo: groupStore.selectedGroup?.id || '',
    id_servicio: props.servicio?.id_servicio || '',
    ids_salen: final_ids_salen,
    ids_entran
  }

  if (!validate(payload, 'servicio-actualizar-vehiculos')) {
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

  if (final_ids_salen.length === 0 && Object.keys(ids_entran).length === 0) {
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
    const data = await actualizarVehiculosApi(payload)

    if (data.done) {
      handleClose()
      emit('updated')
      toast.add({
        severity: 'success',
        summary: 'Vehículos Actualizados',
        detail: data.message || 'La flota de vehículos asignada y la distribución de sus dispositivos de hardware se guardaron correctamente.',
        life: 4000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.message || 'Error al actualizar vehículos.',
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error al actualizar vehículos:', error)
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
    title="Actualizar Vehículos y Hardware"
    confirm-text="Confirmar Cambios"
    size="xl"
    :show-footer="!isLoading"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative p-1">
      <!-- Pantalla de carga mientras se actualiza -->
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

      <!-- Esqueleto de Carga inicial -->
      <div v-if="isLoading" class="space-y-6 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-6">
          <div v-for="i in 2" :key="i" class="space-y-3">
            <div class="h-4 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-40 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
      </div>

      <Transition name="fade-slide" mode="out-in">
        <!-- Panel de 4 Cuadrantes -->
        <div v-if="!isLoading" class="animate-fade-in flex flex-col gap-4">

          <!-- Grid principal de 4 cuadrantes estilo tablero de trabajo -->
          <div class="tablero-trabajo grid grid-cols-1 lg:grid-cols-2 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-900/10 dark:bg-[#0c0d12]/40 backdrop-blur-md">
            
            <!-- COLUMNA IZQUIERDA: VEHÍCULOS -->
            <div class="flex flex-col border-r border-slate-200/80 dark:border-white/10">
              <!-- Cuadrante 1: Vehículos ya Asignados (Arriba Izquierda) -->
              <div class="flex flex-col p-5 h-[260px] border-b border-slate-200/80 dark:border-white/10 bg-slate-900/5 dark:bg-[#12141c]/30">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
                    Vehículos Asignados
                  </span>
                  <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                    Activos: {{ vehiculosActualesIds.filter(id => !vehiculosSalenIds.includes(id)).length }}
                  </span>
                </div>
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-if="vehiculosActualesIds.length > 0" class="flex flex-wrap gap-2.5 items-start">
                    <div
                      v-for="vId in vehiculosActualesIds"
                      :key="vId"
                      @click="seleccionarVehiculoActual(vId)"
                      class="card-recurso relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer select-none"
                      :class="[
                        vehiculosSalenIds.includes(vId)
                          ? 'opacity-40 border border-dashed border-[#3b82f6]/30 bg-blue-950/10 text-blue-400 line-through'
                          : vehiculoActualSeleccionadoId === vId
                            ? 'bg-[#3b82f6] text-white font-bold border border-[#2563eb] dark:border-[#60a5fa] shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                            : 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border border-blue-200/50 dark:border-blue-500/20',
                        vehiculoEstaOpacado(vId) ? 'opacity-25 scale-95' : '',
                        vehiculoEstaResaltado(vId) ? 'ring-2 ring-[#3b82f6] scale-105 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10' : ''
                      ]"
                    >
                      <HugeiconsIcon :icon="Car01Icon" :size="14" class="shrink-0" />
                      <span class="text-xs truncate max-w-[120px] font-semibold">{{ getVehiculoLabel(vId) }}</span>
                      
                      <!-- Botón Eliminar Flotante -->
                      <button
                        type="button"
                        @click.stop="alternarEliminarVehiculoActual(vId)"
                        class="abs-close-btn flex items-center justify-center rounded-full transition-all"
                        :class="vehiculosSalenIds.includes(vId) ? 'bg-[#3b82f6] text-white hover:bg-blue-600' : 'bg-slate-900/80 hover:bg-red-600 text-white dark:bg-slate-950 dark:hover:bg-red-500'"
                        :title="vehiculosSalenIds.includes(vId) ? 'Deshacer eliminación' : 'Marcar para salir'"
                      >
                        <HugeiconsIcon v-if="vehiculosSalenIds.includes(vId)" :icon="Tick01Icon" :size="8" :stroke-width="3" />
                        <span v-else class="text-[8px] font-black leading-none">✕</span>
                      </button>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-10" v-else>
                    <HugeiconsIcon :icon="Car01Icon" :size="24" class="opacity-20 mb-1" />
                    <span>Sin vehículos en servicio.</span>
                  </div>
                </div>
              </div>

              <!-- Cuadrante 3: Vehículos Disponibles (Abajo Izquierda) -->
              <div class="flex flex-col p-5 h-[300px]">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    Vehículos Disponibles (Flota)
                  </span>
                  <div class="relative w-44 shrink-0">
                    <input
                      v-model="filtroVehiculosDisponiblesQuery"
                      type="text"
                      placeholder="Buscar vehículo..."
                      class="w-full text-[11px] bg-slate-100 dark:bg-slate-950/35 border border-slate-200/50 dark:border-white/5 rounded-lg pl-7 pr-2 py-1 outline-none text-slate-800 dark:text-white placeholder-slate-500 focus:border-[#3b82f6]/50 transition-all"
                    />
                    <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2 top-2 text-slate-500" />
                  </div>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-if="vehiculosDisponiblesFiltrados.length > 0" class="flex flex-wrap gap-2.5 items-start">
                    <div
                      v-for="v in vehiculosDisponiblesFiltrados"
                      :key="v.id_vehiculo"
                      @click="alternarVehiculoNuevo(v.id_vehiculo)"
                      class="card-recurso relative flex flex-col gap-0.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer border select-none"
                      :class="[
                        vehiculosEntranIds.includes(v.id_vehiculo)
                          ? vehiculoNuevoSeleccionadoId === v.id_vehiculo
                            ? 'bg-[#3b82f6] text-white border-blue-500 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                            : 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border border-blue-200/50 dark:border-blue-500/20'
                          : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 hover:text-[#3b82f6]',
                        vehiculoEstaOpacado(v.id_vehiculo) ? 'opacity-25 scale-95' : '',
                        vehiculoEstaResaltado(v.id_vehiculo) ? 'ring-2 ring-[#3b82f6] scale-105 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10' : ''
                      ]"
                    >
                      <div class="flex items-center gap-1.5">
                        <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                        <span class="text-xs font-semibold truncate max-w-[120px]">{{ v.placa }}</span>
                      </div>
                      <span class="text-[9px] font-mono opacity-60 ml-4.5">{{ v.tipo }}</span>

                      <!-- Badge Configurar en caso de estar activo -->
                      <button
                        v-if="vehiculosEntranIds.includes(v.id_vehiculo)"
                        type="button"
                        @click.stop="vehiculoNuevoSeleccionadoId = v.id_vehiculo"
                        class="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-900 text-white hover:bg-[#3b82f6] border border-white/10 transition-colors shadow-sm uppercase tracking-wide"
                      >
                        HW
                      </button>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-12" v-else>
                    <HugeiconsIcon :icon="Car01Icon" :size="24" class="opacity-20 mb-1" />
                    <span>{{ filtroVehiculosDisponiblesQuery ? 'Sin coincidencias.' : 'Sin vehículos en la flota.' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: HARDWARE -->
            <div class="flex flex-col">
              <!-- Cuadrante 2: Hardware Asignado al Vehículo (Arriba Derecha) -->
              <div class="flex flex-col p-5 h-[260px] border-b border-slate-200/80 dark:border-white/10 bg-slate-900/5 dark:bg-[#12141c]/30">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
                    Hardware de los Vehículos
                  </span>
                  <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                    Total: {{ todosLosHardwareAsignados.length }}
                  </span>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-if="todosLosHardwareAsignados.length > 0" class="flex flex-wrap gap-2.5 items-start">
                    <div
                      v-for="hwItem in todosLosHardwareAsignados"
                      :key="hwItem.id_hardware"
                      @mouseenter="hardwareHoveredId = hwItem.id_hardware"
                      @mouseleave="hardwareHoveredId = null"
                      class="card-recurso relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border border-blue-200/50 dark:border-blue-500/20 font-semibold select-none shadow-sm transition-all duration-300 hover:bg-[#3b82f6]/20"
                      :class="[
                        (vehiculoActualSeleccionadoId && hwItem.id_vehiculo !== vehiculoActualSeleccionadoId) ||
                        (vehiculoNuevoSeleccionadoId && hwItem.id_vehiculo !== vehiculoNuevoSeleccionadoId)
                          ? 'opacity-20'
                          : ''
                      ]"
                    >
                      <HugeiconsIcon :icon="CpuIcon" :size="13" class="shrink-0" />
                      <span class="text-xs truncate max-w-[120px]">{{ getHardwareLabel(hwItem.id_hardware) }}</span>
                      
                      <!-- Botón Quitar Hardware -->
                      <button
                        type="button"
                        @click.stop="removerHardwareVehiculoActual(hwItem.id_hardware)"
                        class="abs-close-btn flex items-center justify-center rounded-full bg-slate-900/80 hover:bg-red-600 text-white dark:bg-slate-950 dark:hover:bg-red-500 transition-all"
                        title="Remover dispositivo"
                      >
                        <span class="text-[8px] font-black leading-none">✕</span>
                      </button>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-10" v-else>
                    <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-20 mb-1" />
                    <span>No hay hardware asignado en este servicio.</span>
                  </div>
                </div>
              </div>

              <!-- Cuadrante 4: Catálogo Completo de Hardware (Abajo Derecha) -->
              <div class="flex flex-col p-5 h-[300px]">
                <div class="flex justify-between items-center mb-4 shrink-0">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6] dark:text-[#60a5fa] flex items-center gap-1.5">
                    Hardware Disponible
                  </span>
                  <div class="relative w-44 shrink-0">
                    <input
                      v-model="filtroHardwareDisponibleQuery"
                      type="text"
                      placeholder="Buscar hardware..."
                      class="w-full text-[11px] bg-slate-100 dark:bg-slate-950/35 border border-slate-200/50 dark:border-white/5 rounded-lg pl-7 pr-2 py-1 outline-none text-slate-800 dark:text-white placeholder-slate-500 focus:border-[#3b82f6]/50 transition-all"
                    />
                    <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2 top-2 text-slate-500" />
                  </div>
                </div>
                
                <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <template v-if="vehiculoNuevoSeleccionadoId">
                    <div class="text-[9px] font-black text-[#3b82f6] dark:text-[#60a5fa] bg-[#3b82f6]/10 border border-blue-500/20 px-3 py-1.5 rounded-lg mb-3 truncate flex items-center justify-center gap-1.5 select-none shrink-0">
                      <HugeiconsIcon :icon="Car01Icon" :size="12" />
                      ASIGNANDO A: {{ getVehiculoLabel(vehiculoNuevoSeleccionadoId) }}
                    </div>
                    <div v-if="hardwareDisponiblesFiltrados.length > 0" class="flex flex-wrap gap-2.5 items-start">
                      <div
                        v-for="h in hardwareDisponiblesFiltrados"
                        :key="h.id_hardware"
                        @click="alternarHardwareVehiculoNuevo(h.id_hardware)"
                        @mouseenter="hardwareHoveredId = h.id_hardware"
                        @mouseleave="hardwareHoveredId = null"
                        class="card-recurso relative flex flex-col gap-0.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer border select-none"
                        :class="[
                          (vehiculosEntranHardware[vehiculoNuevoSeleccionadoId] || []).includes(h.id_hardware)
                            ? 'bg-[#3b82f6] text-white border-blue-500 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-blue-500/40 dark:hover:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 hover:text-[#3b82f6]',
                          obtenerVehiculoAsociado(h.id_hardware) && !(vehiculosEntranHardware[vehiculoNuevoSeleccionadoId] || []).includes(h.id_hardware)
                            ? 'opacity-60 border-dashed border-[#3b82f6]/40 bg-blue-950/5 text-slate-400 dark:text-slate-400'
                            : ''
                        ]"
                      >
                        <div class="flex items-center gap-1.5">
                          <HugeiconsIcon :icon="CpuIcon" :size="13" class="shrink-0" />
                          <span class="text-xs font-semibold truncate max-w-[120px]">{{ h.nombre }}</span>
                        </div>
                        <div class="flex justify-between items-center mt-0.5">
                          <span class="text-[9px] opacity-60">{{ h.familia || 'Sin familia' }}</span>
                          <span v-if="obtenerVehiculoAsociado(h.id_hardware)" class="text-[8px] font-bold text-[#3b82f6] dark:text-[#60a5fa] ml-2">
                            Asociado
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 py-10" v-else>
                      <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-20 mb-1" />
                      <span>No hay dispositivos de hardware libres.</span>
                    </div>
                  </template>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-500 text-center px-6 py-10" v-else>
                    <HugeiconsIcon :icon="CpuIcon" :size="28" class="opacity-20 mb-2 animate-bounce" />
                    <span>Selecciona un vehículo nuevo a la izquierda para poder asignarle dispositivos.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Resumen de Cambios en la transacción -->
          <div class="mt-2 flex items-center justify-between px-4 py-3 bg-slate-100/50 dark:bg-[#0c0d12]/50 border border-slate-200/50 dark:border-white/5 rounded-2xl text-xs text-slate-500 dark:text-slate-400">
            <div class="flex gap-4 items-center">
              <span class="flex items-center gap-1.5 font-semibold">Salen: <strong class="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{{ vehiculosSalenIds.length }}</strong></span>
              <span class="w-px h-3.5 bg-slate-200 dark:bg-white/10"></span>
              <span class="flex items-center gap-1.5 font-semibold">Entran: <strong class="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{{ vehiculosEntranIds.length }}</strong></span>
            </div>
            <span class="text-[10px] text-slate-400 italic">Presiona el botón de confirmar para guardar la nueva configuración de flota</span>
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

/* Estilos específicos de las cards del modal */
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

/* Animaciones */
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

.message-fade-enter-from, .message-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.message-fade-enter-active, .message-fade-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>