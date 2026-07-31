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

// Verificar si un hardware está ocupado en OTRO servicio (no en el actual)
const esHardwareOcupadoEnOtroServicio = (h: HardwareSimple): boolean => {
  if (!h.id_servicio) return false
  return h.id_servicio !== props.servicio?.id_servicio
}

// Filtrado de todos los hardware del catálogo (incluye ocupados para mostrarlos en gris)
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
  vehiculoNuevoSeleccionadoId.value = null // Deseleccionar vehículo nuevo
  vehiculoActualSeleccionadoId.value = id
}

const alternarEliminarVehiculoActual = (id: string) => {
  const index = vehiculosSalenIds.value.indexOf(id)
  if (index > -1) {
    // Cancelar la eliminación
    vehiculosSalenIds.value.splice(index, 1)
    if (!vehiculoActualSeleccionadoId.value && !vehiculoNuevoSeleccionadoId.value) {
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
    vehiculoActualSeleccionadoId.value = null // Deseleccionar vehículo actual
  }
}

const seleccionarVehiculoNuevo = (id: string) => {
  vehiculoActualSeleccionadoId.value = null
  vehiculoNuevoSeleccionadoId.value = id
}

// Determinar si un hardware está asignado al vehículo actualmente enfocado/seleccionado
const esHardwareAsignadoAVehiculoSeleccionado = (hardwareId: string): boolean => {
  if (vehiculoActualSeleccionadoId.value) {
    const hwList = vehiculosActualesHardwareModificado.value[vehiculoActualSeleccionadoId.value] || []
    return hwList.includes(hardwareId)
  }
  if (vehiculoNuevoSeleccionadoId.value) {
    const hwList = vehiculosEntranHardware.value[vehiculoNuevoSeleccionadoId.value] || []
    return hwList.includes(hardwareId)
  }
  return false
}

// Asignar/desasignar hardware al vehículo seleccionado (sea actual o nuevo)
const alternarHardwareVehiculo = (hardwareId: string) => {
  if (vehiculoActualSeleccionadoId.value) {
    const vId = vehiculoActualSeleccionadoId.value
    const lista = vehiculosActualesHardwareModificado.value[vId] || []
    const index = lista.indexOf(hardwareId)
    if (index > -1) {
      lista.splice(index, 1)
    } else {
      lista.push(hardwareId)
    }
  } else if (vehiculoNuevoSeleccionadoId.value) {
    const vId = vehiculoNuevoSeleccionadoId.value
    const lista = vehiculosEntranHardware.value[vId] || []
    const index = lista.indexOf(hardwareId)
    if (index > -1) {
      lista.splice(index, 1)
    } else {
      lista.push(hardwareId)
    }
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

      <!-- Panel de 4 Cuadrantes -->
      <div v-if="!isLoading" class="flex flex-col gap-3">

        <!-- Grid principal de 4 cuadrantes plano y minimalista -->
        <div class="grid grid-cols-1 lg:grid-cols-2 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1117]">
          
          <!-- COLUMNA IZQUIERDA: VEHÍCULOS -->
          <div class="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
            <!-- Cuadrante 1: Vehículos ya Asignados (Arriba Izquierda) -->
            <div class="flex flex-col p-4 h-[230px] border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  Vehículos Asignados
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Activos: {{ vehiculosActualesIds.filter(id => !vehiculosSalenIds.includes(id)).length }}
                </span>
              </div>
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div v-if="vehiculosActualesIds.length > 0 || vehiculosEntranIds.length > 0" class="flex flex-wrap gap-2 items-start">
                  <!-- Vehículos actuales del servicio -->
                  <div
                    v-for="vId in vehiculosActualesIds"
                    :key="vId"
                    @click="seleccionarVehiculoActual(vId)"
                    class="relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                    :class="[
                      vehiculosSalenIds.includes(vId)
                        ? 'opacity-50 border-dashed border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-600 line-through'
                        : vehiculoActualSeleccionadoId === vId
                          ? 'bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40',
                      vehiculoEstaOpacado(vId) ? 'opacity-30' : '',
                      vehiculoEstaResaltado(vId) ? 'ring-1 ring-[#3b82f6]' : ''
                    ]"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                      <span class="truncate max-w-[110px]">{{ getVehiculoLabel(vId) }}</span>
                    </div>
                    
                    <!-- Botón Marcar Salida/Deshacer -->
                    <button
                      type="button"
                      @click.stop="alternarEliminarVehiculoActual(vId)"
                      class="w-4 h-4 ml-1 flex items-center justify-center rounded transition-colors text-[10px]"
                      :class="vehiculosSalenIds.includes(vId) ? 'text-[#3b82f6] dark:text-[#60a5fa] hover:bg-[#3b82f6]/10' : vehiculoActualSeleccionadoId === vId ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800'"
                      :title="vehiculosSalenIds.includes(vId) ? 'Deshacer eliminación' : 'Marcar para salir'"
                    >
                      <HugeiconsIcon v-if="vehiculosSalenIds.includes(vId)" :icon="Tick01Icon" :size="10" />
                      <span v-else>✕</span>
                    </button>
                  </div>

                  <!-- Vehículos entrantes (pendientes de asignar) -->
                  <div
                    v-for="vId in vehiculosEntranIds"
                    :key="'entrante-' + vId"
                    @click="seleccionarVehiculoNuevo(vId)"
                    class="relative flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                    :class="[
                      vehiculoNuevoSeleccionadoId === vId
                        ? 'bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                        : 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border-dashed border-[#3b82f6]/30 dark:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10'
                    ]"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                      <span class="truncate max-w-[80px]">{{ getVehiculoLabel(vId) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-[9px] font-semibold uppercase tracking-wide opacity-60">Nuevo</span>
                      <!-- Botón quitar vehículo entrante -->
                      <button
                        type="button"
                        @click.stop="alternarVehiculoNuevo(vId)"
                        class="w-4 h-4 flex items-center justify-center rounded transition-colors text-[10px]"
                        :class="vehiculoNuevoSeleccionadoId === vId ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-[#3b82f6]/60 hover:text-red-500 dark:hover:text-red-400'"
                        title="Quitar vehículo"
                      >✕</button>
                    </div>
                  </div>
                </div>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-8" v-else>
                  <span>Sin vehículos en servicio.</span>
                </div>
              </div>
            </div>

            <!-- Cuadrante 3: Vehículos Disponibles (Abajo Izquierda) -->
            <div class="flex flex-col p-4 h-[250px]">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Vehículos Disponibles
                </span>
                <div class="relative w-40 shrink-0">
                  <input
                    v-model="filtroVehiculosDisponiblesQuery"
                    type="text"
                    placeholder="Buscar..."
                    class="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-7 pr-2 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-blue-500 transition-colors"
                  />
                  <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div v-if="vehiculosDisponiblesFiltrados.length > 0" class="flex flex-wrap gap-2 items-start">
                  <div
                    v-for="v in vehiculosDisponiblesFiltrados"
                    :key="v.id_vehiculo"
                    @click="alternarVehiculoNuevo(v.id_vehiculo)"
                    class="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors"
                    :class="[
                      vehiculosEntranIds.includes(v.id_vehiculo)
                        ? vehiculoNuevoSeleccionadoId === v.id_vehiculo
                          ? 'bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                          : 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#60a5fa] border-[#3b82f6]/20 dark:border-[#3b82f6]/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40',
                      vehiculoEstaOpacado(v.id_vehiculo) ? 'opacity-30' : '',
                      vehiculoEstaResaltado(v.id_vehiculo) ? 'ring-1 ring-[#3b82f6]' : ''
                    ]"
                  >
                    <div class="flex items-center gap-1.5">
                      <HugeiconsIcon :icon="Car01Icon" :size="13" class="shrink-0" />
                      <span class="font-medium truncate max-w-[120px]">{{ v.placa }}</span>
                    </div>
                    <span class="text-[10px] opacity-70 ml-4.5 font-normal">{{ v.tipo }}</span>
                  </div>
                </div>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10" v-else>
                  <span>{{ filtroVehiculosDisponiblesQuery ? 'Sin coincidencias.' : 'Sin vehículos disponibles.' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: HARDWARE -->
          <div class="flex flex-col">
            <!-- Cuadrante 2: Hardware Asignado al Vehículo (Arriba Derecha) -->
            <div class="flex flex-col p-4 h-[230px] border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Hardware de los Vehículos
                </span>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Total: {{ todosLosHardwareAsignados.length }}
                </span>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div v-if="todosLosHardwareAsignados.length > 0" class="flex flex-wrap gap-2 items-start">
                  <div
                    v-for="hwItem in todosLosHardwareAsignados"
                    :key="hwItem.id_hardware"
                    @mouseenter="hardwareHoveredId = hwItem.id_hardware"
                    @mouseleave="hardwareHoveredId = null"
                    class="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 select-none transition-colors"
                    :class="[
                      (vehiculoActualSeleccionadoId && hwItem.id_vehiculo !== vehiculoActualSeleccionadoId) ||
                      (vehiculoNuevoSeleccionadoId && hwItem.id_vehiculo !== vehiculoNuevoSeleccionadoId)
                        ? 'opacity-30'
                        : ''
                    ]"
                  >
                    <div class="flex items-center gap-1.5 truncate">
                      <HugeiconsIcon :icon="CpuIcon" :size="13" class="shrink-0 text-blue-500" />
                      <span class="truncate max-w-[120px]">{{ getHardwareLabel(hwItem.id_hardware) }}</span>
                    </div>
                    
                    <!-- Botón Quitar Hardware -->
                    <button
                      type="button"
                      @click.stop="removerHardwareVehiculoActual(hwItem.id_hardware)"
                      class="w-4 h-4 ml-1 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px]"
                      title="Remover dispositivo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-8" v-else>
                  <span>Sin hardware asignado.</span>
                </div>
              </div>
            </div>

            <!-- Cuadrante 4: Catálogo Completo de Hardware (Abajo Derecha) -->
            <div class="flex flex-col p-4 h-[250px]">
              <div class="flex justify-between items-center mb-3 shrink-0">
                <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Hardware Disponible
                </span>
                <div class="relative w-40 shrink-0">
                  <input
                    v-model="filtroHardwareDisponibleQuery"
                    type="text"
                    placeholder="Buscar..."
                    class="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-7 pr-2 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-blue-500 transition-colors"
                  />
                  <HugeiconsIcon :icon="Search01Icon" :size="12" class="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
              
              <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <template v-if="vehiculoActualSeleccionadoId || vehiculoNuevoSeleccionadoId">
                  <div class="text-xs text-[#3b82f6] dark:text-[#3b82f6] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border border-[#3b82f6]/25 dark:border-[#3b82f6]/25 px-3 py-1 rounded-md mb-2 flex items-center justify-between gap-2 select-none shrink-0">
                    <span class="truncate">Asignando a: <strong>{{ getVehiculoLabel(vehiculoActualSeleccionadoId || vehiculoNuevoSeleccionadoId || '') }}</strong></span>
                    <span class="text-[10px] uppercase font-semibold text-[#3b82f6] dark:text-[#3b82f6] shrink-0">
                      {{ vehiculoActualSeleccionadoId ? 'Actual' : 'Nuevo' }}
                    </span>
                  </div>
                  <div v-if="hardwareDisponiblesFiltrados.length > 0" class="flex flex-wrap gap-2 items-start">
                    <div
                      v-for="h in hardwareDisponiblesFiltrados"
                      :key="h.id_hardware"
                      @click="!esHardwareOcupadoEnOtroServicio(h) && alternarHardwareVehiculo(h.id_hardware)"
                      @mouseenter="!esHardwareOcupadoEnOtroServicio(h) && (hardwareHoveredId = h.id_hardware)"
                      @mouseleave="hardwareHoveredId = null"
                      class="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg border text-xs select-none transition-colors"
                      :class="[
                        esHardwareOcupadoEnOtroServicio(h)
                          ? 'cursor-not-allowed opacity-40 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                          : esHardwareAsignadoAVehiculoSeleccionado(h.id_hardware)
                            ? 'cursor-pointer bg-[#3b82f6]/90 text-white font-medium border-[#3b82f6]/80'
                            : obtenerVehiculoAsociado(h.id_hardware) && !esHardwareAsignadoAVehiculoSeleccionado(h.id_hardware)
                              ? 'cursor-pointer opacity-40 border-dashed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              : 'cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#3b82f6]/50 dark:hover:border-[#3b82f6]/40'
                      ]"
                    >
                      <div class="flex items-center gap-1.5">
                        <HugeiconsIcon :icon="CpuIcon" :size="13" class="shrink-0" />
                        <span class="font-medium truncate max-w-[120px]">{{ h.nombre }}</span>
                      </div>
                      <div class="flex items-center gap-1 ml-[18px]">
                        <span class="text-[10px] opacity-70 font-normal">{{ h.familia || 'Sin familia' }}</span>
                        <span v-if="esHardwareOcupadoEnOtroServicio(h)" class="text-[9px] font-semibold uppercase tracking-wide opacity-60">· Ocupado</span>
                      </div>
                    </div>
                  </div>
                  <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 py-10" v-else>
                    <span>No hay dispositivos disponibles.</span>
                  </div>
                </template>
                <div class="h-full flex flex-col items-center justify-center text-xs text-slate-400 text-center px-6 py-10" v-else>
                  <span>Selecciona un vehículo a la izquierda para administrar sus dispositivos.</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Resumen de Cambios en la transacción -->
        <div class="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
          <div class="flex gap-4 items-center">
            <span>Salen: <strong class="text-blue-600 dark:text-blue-400 font-semibold">{{ vehiculosSalenIds.length }}</strong></span>
            <span class="w-px h-3 bg-slate-200 dark:bg-slate-800"></span>
            <span>Entran: <strong class="text-blue-600 dark:text-blue-400 font-semibold">{{ vehiculosEntranIds.length }}</strong></span>
          </div>
          <span class="text-[11px] text-slate-400">Presiona confirmar para guardar los cambios</span>
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
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
