<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadModuleMessages } from '../../../i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  Car01Icon,
  Search01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Loading03Icon,
  UserAdd01Icon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { actualizarConductoresApi } from '../services/servicios.api'
import { fetchConductoresApi } from '../../conductores/services/conductores.api'
import type { VehiculoSimple } from '../types/servicio'
import type { Conductor } from '../../conductores/types/conductor'
import AppModal from '../../../components/ui/AppModal.vue'
import AppAvatar from '../../../components/ui/AppAvatar.vue'
import { obtenerUrlImagen } from '../../../utils/imagenes'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { servicioActualizarConductoresSchema } from '../../../schemas/servicios.schema'
import { useToast } from 'primevue/usetoast'

loadModuleMessages('servicios')
const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  servicio: any | null
  vehiculos: VehiculoSimple[]
  conductores?: Conductor[]
}>()

const emit = defineEmits(['update:isOpen', 'updated'])

// Estados de carga y guardado
const isLoading = ref(true)
const saving = ref(false)

// Catálogo de conductores
const catalogoConductores = ref<Conductor[]>([])
const searchConductoresQuery = ref('')

// Vehículos del servicio
const vehiculosIds = ref<string[]>([])
const vehiculoSeleccionadoId = ref<string | null>(null)

// Mapa de asignaciones: vehiculoId -> string[] (array con id_conductor)
const vehiculosConductores = ref<Record<string, string[]>>({})
const inicialVehiculosConductores = ref<Record<string, string[]>>({})
const inicialesConductoresIds = ref<string[]>([])

const { validate, getFirstError } = useFormValidator(servicioActualizarConductoresSchema)
const { clearErrors } = useFormError('servicio-actualizar-conductores')

// Obtener objeto vehículo por ID
const getVehiculoObj = (vId: string): VehiculoSimple | undefined => {
  return props.vehiculos.find(v => String(v.id_vehiculo) === String(vId))
}

// Obtener nombre/placa legible del vehículo
const getVehiculoLabel = (vId: string): string => {
  const v = getVehiculoObj(vId)
  if (!v) return vId
  if (v.placa && v.nombre) return `${v.placa} - ${v.nombre}`
  return v.placa || v.nombre || vId
}

// Obtener objeto conductor por ID
const getConductorObj = (cId: string): Conductor | undefined => {
  return catalogoConductores.value.find(c => String(c.id_conductor) === String(cId))
}

// Vehículo al que está asignado un conductor actualmente en este modal
const getVehiculoAsignadoAConductor = (cId: string): string | null => {
  for (const [vId, cIds] of Object.entries(vehiculosConductores.value)) {
    if (cIds.includes(cId)) {
      return vId
    }
  }
  return null
}

// Cantidad de vehículos con conductor asignado
const totalVehiculosConductorAsignado = computed(() => {
  return Object.values(vehiculosConductores.value).filter(cIds => (cIds || []).length > 0).length
})

// Determinar si un conductor se puede seleccionar (está disponible o ya pertenece a este servicio)
const isConductorSeleccionable = (cId: string): boolean => {
  const cObj = catalogoConductores.value.find(c => String(c.id_conductor) === String(cId))
  const eraInicial = inicialesConductoresIds.value.includes(String(cId))
  const estaAsignadoActual = getVehiculoAsignadoAConductor(cId) !== null
  const estaDisponible = cObj?.estado?.toUpperCase() === 'DISPONIBLE'

  return estaDisponible || eraInicial || estaAsignadoActual
}

// Conductores filtrados por buscador (muestra todo el personal pero los no disponibles se inhabilitan)
const filteredConductores = computed(() => {
  const q = searchConductoresQuery.value.toLowerCase().trim()
  if (!q) return catalogoConductores.value
  return catalogoConductores.value.filter(c => {
    return (
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q)) ||
      (c.celular && c.celular.toLowerCase().includes(q)) ||
      (c.estado && c.estado.toLowerCase().includes(q))
    )
  })
})

// Seleccionar vehículo activo para configurar
const seleccionarVehiculo = (vId: string) => {
  vehiculoSeleccionadoId.value = vId
}

// Asignar o desasignar conductor al vehículo seleccionado
const toggleConductor = (conductorId: string) => {
  if (!isConductorSeleccionable(conductorId)) {
    const cObj = catalogoConductores.value.find(c => String(c.id_conductor) === String(conductorId))
    toast.add({
      severity: 'warn',
      summary: t('servicios.toastOccupiedDriverSummary') || 'Conductor no disponible',
      detail: t('servicios.toastOccupiedDriverInUse', { estado: cObj?.estado || 'NO DISPONIBLE' }),
      life: 3000
    })
    return
  }

  if (!vehiculoSeleccionadoId.value) {
    if (vehiculosIds.value.length > 0) {
      vehiculoSeleccionadoId.value = vehiculosIds.value[0]
    } else {
      return
    }
  }

  const vId = vehiculoSeleccionadoId.value
  const vehiculoAsignadoPrevio = getVehiculoAsignadoAConductor(conductorId)

  // Si ya está asignado al vehículo actual seleccionado, lo desasignamos (toggle off)
  if (vehiculoAsignadoPrevio === vId) {
    vehiculosConductores.value[vId] = (vehiculosConductores.value[vId] || []).filter(id => id !== conductorId)
    return
  }

  // Si está asignado a otro vehículo de este servicio, quitarlo del vehículo anterior
  if (vehiculoAsignadoPrevio && vehiculoAsignadoPrevio !== vId) {
    vehiculosConductores.value[vehiculoAsignadoPrevio] = (vehiculosConductores.value[vehiculoAsignadoPrevio] || []).filter(id => id !== conductorId)
  }

  // Asignamos el conductor al vehículo seleccionado agregándolo a su lista (soporta múltiples conductores)
  const listaActual = vehiculosConductores.value[vId] || []
  if (!listaActual.includes(conductorId)) {
    vehiculosConductores.value[vId] = [...listaActual, conductorId]
  }
}

// Quitar conductor específico de un vehículo o todos si no se pasa cId
const quitarConductor = (vId: string, cId?: string) => {
  if (cId) {
    vehiculosConductores.value[vId] = (vehiculosConductores.value[vId] || []).filter(id => id !== cId)
  } else {
    vehiculosConductores.value[vId] = []
  }
}

// Observador para abrir y resetear el modal
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isLoading.value = true
    saving.value = false
    clearErrors()
    searchConductoresQuery.value = ''
    vehiculosConductores.value = {}
    inicialVehiculosConductores.value = {}
    inicialesConductoresIds.value = []
    vehiculosIds.value = []
    vehiculoSeleccionadoId.value = null

    if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
      isLoading.value = false
      return
    }

    try {
      // 1. Cargar catálogo de conductores
      const condList = await fetchConductoresApi(groupStore.selectedGroup.id)
      catalogoConductores.value = Array.isArray(condList) ? condList : []

      // 2. Extraer lista de vehículos asignados al servicio
      if (props.servicio.vehiculos && typeof props.servicio.vehiculos === 'object') {
        vehiculosIds.value = Object.keys(props.servicio.vehiculos).map(String)
      } else {
        vehiculosIds.value = []
      }

      // 3. Extraer conductores asignados actualmente
      const condExistentes = props.servicio.vehiculos_conductores || props.servicio.conductores || {}
      const mapaInicial: Record<string, string[]> = {}

      vehiculosIds.value.forEach(vId => {
        const cIds = condExistentes[vId] || []
        mapaInicial[vId] = Array.isArray(cIds) ? [...cIds] : [String(cIds)]
      })

      vehiculosConductores.value = JSON.parse(JSON.stringify(mapaInicial))
      inicialVehiculosConductores.value = JSON.parse(JSON.stringify(mapaInicial))
      inicialesConductoresIds.value = Object.values(mapaInicial).flat().map(String)

      if (vehiculosIds.value.length > 0) {
        vehiculoSeleccionadoId.value = vehiculosIds.value[0]
      }
    } catch (error) {
      console.error('Error al inicializar modal de actualización de conductores:', error)
      toast.add({
        severity: 'error',
        summary: t('servicios.toastError'),
        detail: t('servicios.toastServiceLoadError'),
        life: 4000
      })
    } finally {
      isLoading.value = false
    }
  }
})

// Cerrar modal
const handleClose = () => {
  emit('update:isOpen', false)
}

// Guardar cambios
const handleGuardar = async () => {
  if (saving.value) return
  clearErrors()

  if (!groupStore.selectedGroup?.id || !props.servicio?.id_servicio) {
    return
  }

  const payload = {
    id_grupo: groupStore.selectedGroup.id,
    id_servicio: props.servicio.id_servicio,
    vehiculos_conductores: vehiculosConductores.value
  }

  if (!validate(payload, 'servicio-actualizar-conductores')) {
    const firstErr = getFirstError()
    if (firstErr) {
      toast.add({
        severity: 'warn',
        summary: t('servicios.toastValidation'),
        detail: firstErr,
        life: 4000
      })
    }
    return
  }

  saving.value = true
  try {
    const res = await actualizarConductoresApi(payload)
    if (res.done) {
      toast.add({
        severity: 'success',
        summary: t('servicios.toastDriversUpdatedSuccess'),
        detail: res.message || t('servicios.toastDriversUpdatedDetail'),
        life: 3500
      })
      emit('updated')
      handleClose()
    } else {
      toast.add({
        severity: 'error',
        summary: t('servicios.toastError'),
        detail: res.message || t('servicios.toastDriversUpdateError'),
        life: 4000
      })
    }
  } catch (error: any) {
    console.error('Error al actualizar conductores:', error)
    toast.add({
      severity: 'error',
      summary: t('servicios.toastError'),
      detail: error?.message || t('servicios.toastDriversUpdateError'),
      life: 4000
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleGuardar"
    :title="t('servicios.modalTitleUpdateDrivers')"
    :confirm-text="t('servicios.btnConfirmChanges')"
    size="xl"
    max-width="58rem"
    :show-footer="!isLoading"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/60 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/60 dark:border-blue-500/20">
        <HugeiconsIcon :icon="User02Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-3 relative p-1">
      <!-- Overlay de carga al guardar -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/70 dark:bg-[#13161C]/70 backdrop-blur-md rounded-2xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="42" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-4 flex flex-col items-center">
            <span class="text-[11px] font-black text-[#3b82f6] uppercase tracking-wider mb-1">{{ t('common.saving') || 'Guardando cambios...' }}</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Skeleton de Carga inicial -->
      <div v-if="isLoading" class="space-y-4 animate-pulse p-2">
        <div class="grid grid-cols-2 gap-4">
          <div v-for="i in 2" :key="i" class="space-y-3">
            <div class="h-4 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
            <div class="h-64 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
          </div>
        </div>
      </div>

      <!-- Contenido Principal -->
      <div v-else class="flex flex-col gap-3">
        <!-- Barra superior contextual: ID del servicio y estado de asignación -->
        <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-xs">
          <div class="flex items-center gap-2">
            <span class="font-medium text-slate-500 dark:text-slate-400">{{ t('servicios.thId') }}:</span>
            <span class="font-bold text-slate-800 dark:text-slate-100 font-mono">{{ servicio?.id_servicio }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-400 dark:text-slate-500 text-[11px]">Asignados:</span>
            <span class="px-2 py-0.5 rounded-md font-bold text-[11px]" :class="totalVehiculosConductorAsignado === vehiculosIds.length ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'">
              {{ totalVehiculosConductorAsignado }} / {{ vehiculosIds.length }} vehículos
            </span>
          </div>
        </div>

        <!-- Grid de dos paneles integrados -->
        <div class="grid grid-cols-1 lg:grid-cols-2 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#0f1117]">
          
          <!-- PANEL IZQUIERDO: VEHÍCULOS ASIGNADOS AL SERVICIO -->
          <div class="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/20 p-4 h-[440px]">
            <div class="flex justify-between items-center mb-3 shrink-0">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  {{ t('servicios.assignedVehiclesSection') }}
                </span>
              </div>
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-white/5 px-2 py-0.5 rounded-md">
                {{ vehiculosIds.length }}
              </span>
            </div>

            <p class="text-[11px] text-slate-400 dark:text-slate-500 mb-3 shrink-0">
              {{ t('servicios.selectVehicleToAssignDriver') }}
            </p>

            <div v-if="vehiculosIds.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400 italic">
              {{ t('servicios.noVehiclesInService') }}
            </div>

            <!-- Lista de vehículos scrolleable -->
            <div v-else class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5">
              <div
                v-for="vId in vehiculosIds"
                :key="vId"
                @click="seleccionarVehiculo(vId)"
                class="p-3 rounded-xl border transition-all duration-200 cursor-pointer relative"
                :class="[
                  vehiculoSeleccionadoId === vId
                    ? 'bg-blue-500/[0.04] dark:bg-blue-500/10 border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/30 shadow-sm'
                    : 'bg-white dark:bg-[#13161C] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
                ]"
              >
                <!-- Cabecera del Vehículo -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0">
                      <HugeiconsIcon :icon="Car01Icon" :size="13" />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-xs font-black text-slate-800 dark:text-slate-100 tracking-wide">
                          {{ getVehiculoObj(vId)?.placa || vId }}
                        </span>
                        <span 
                          v-if="getVehiculoObj(vId)?.tipo"
                          class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5"
                        >
                          {{ getVehiculoObj(vId)?.tipo }}
                        </span>
                      </div>
                      <span v-if="getVehiculoObj(vId)?.nombre && getVehiculoObj(vId)?.nombre !== getVehiculoObj(vId)?.placa" class="text-[10px] text-slate-400 dark:text-slate-500 truncate block mt-0.5">
                        {{ getVehiculoObj(vId)?.nombre }}
                      </span>
                    </div>
                  </div>

                  <span
                    v-if="vehiculoSeleccionadoId === vId"
                    class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#3b82f6] text-white shrink-0 tracking-wide"
                  >
                    {{ t('servicios.activeVehicleConfiguring') }}
                  </span>
                </div>

                <!-- Conductor(es) asignados -->
                <div class="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                  <template v-if="(vehiculosConductores[vId] || []).length > 0">
                    <div
                      v-for="cId in vehiculosConductores[vId]"
                      :key="cId"
                      class="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <AppAvatar
                          :image="obtenerUrlImagen(getConductorObj(cId)?.foto)"
                          :label="getConductorObj(cId)?.nombre || cId"
                          size="small"
                        />
                        <div class="min-w-0">
                          <div class="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 truncate">
                            {{ getConductorObj(cId)?.nombre || cId }}
                          </div>
                          <div class="text-[9.5px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5 mt-0.5 font-medium">
                            <span v-if="getConductorObj(cId)?.cedula">CC: {{ getConductorObj(cId)?.cedula }}</span>
                            <span v-if="getConductorObj(cId)?.cedula && getConductorObj(cId)?.celular" class="opacity-40">·</span>
                            <span v-if="getConductorObj(cId)?.celular">Tel: {{ getConductorObj(cId)?.celular }}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        @click.stop="quitarConductor(vId, cId)"
                        type="button"
                        :title="t('servicios.removeDriverPrompt')"
                        class="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                      >
                        <HugeiconsIcon :icon="Cancel01Icon" :size="13" />
                      </button>
                    </div>
                  </template>

                  <!-- Placeholder elegante sin conductor asignado -->
                  <div
                    v-else
                    class="flex items-center justify-between p-2 rounded-lg bg-slate-100/60 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#3b82f6]/50 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors"
                  >
                    <span class="text-[10.5px] italic font-medium flex items-center gap-1.5">
                      <HugeiconsIcon :icon="UserAdd01Icon" :size="12" />
                      {{ t('servicios.noDriverAssignedVehicle') }}
                    </span>
                    <span class="text-[9.5px] font-bold underline">{{ t('servicios.assignDriverPrompt') }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PANEL DERECHO: CATÁLOGO DE CONDUCTORES DISPONIBLES -->
          <div class="flex flex-col bg-white dark:bg-[#0f1117] p-4 h-[440px]">
            <div class="flex justify-between items-center mb-3 shrink-0">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  {{ t('servicios.availableDriversSection') }}
                </span>
              </div>
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                {{ filteredConductores.length }}
              </span>
            </div>

            <!-- Buscador integrado y elegante -->
            <div class="relative mb-3 shrink-0">
              <input
                v-model="searchConductoresQuery"
                type="text"
                :placeholder="t('servicios.searchDriversPlaceholder')"
                class="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-2 focus:ring-[#3b82f6]/10 transition-all h-[36px]"
              />
              <div class="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
                <HugeiconsIcon :icon="Search01Icon" :size="14" />
              </div>
              <button
                v-if="searchConductoresQuery"
                @click="searchConductoresQuery = ''"
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <HugeiconsIcon :icon="Cancel01Icon" :size="13" />
              </button>
            </div>

            <!-- Lista scrolleable de conductores -->
            <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
              <div
                v-if="filteredConductores.length === 0"
                class="flex flex-col items-center justify-center text-center p-8 text-xs text-slate-400 italic"
              >
                {{ t('servicios.noDriversFound') }}
              </div>

              <div
                v-for="conductor in filteredConductores"
                :key="conductor.id_conductor"
                @click="toggleConductor(conductor.id_conductor)"
                class="flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all duration-200 select-none group"
                :class="[
                  !isConductorSeleccionable(conductor.id_conductor)
                    ? 'opacity-40 bg-slate-50/50 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/5 cursor-not-allowed'
                    : vehiculoSeleccionadoId && (vehiculosConductores[vehiculoSeleccionadoId] || []).includes(conductor.id_conductor)
                      ? 'bg-blue-500/10 dark:bg-blue-500/20 border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/30 cursor-pointer'
                      : getVehiculoAsignadoAConductor(conductor.id_conductor)
                        ? 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-80 cursor-pointer'
                        : 'bg-white dark:bg-white/[0.02] border-slate-200/70 dark:border-white/5 hover:border-[#3b82f6]/50 dark:hover:border-[#5da6fc]/50 hover:bg-blue-50/30 dark:hover:bg-white/[0.04] cursor-pointer'
                ]"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <AppAvatar
                    :image="obtenerUrlImagen(conductor.foto)"
                    :label="conductor.nombre"
                    size="small"
                  />
                  <div class="min-w-0">
                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {{ conductor.nombre }}
                    </div>
                    <div class="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1.5 mt-0.5 font-medium">
                      <span v-if="conductor.cedula">CC: {{ conductor.cedula }}</span>
                      <span v-if="conductor.cedula && conductor.celular" class="opacity-40">·</span>
                      <span v-if="conductor.celular">Tel: {{ conductor.celular }}</span>
                    </div>
                  </div>
                </div>

                <!-- Insignia de estado o asignación -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Conductor asignado al vehículo actualmente activo -->
                  <span
                    v-if="vehiculoSeleccionadoId && (vehiculosConductores[vehiculoSeleccionadoId] || []).includes(conductor.id_conductor)"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-[#3b82f6] text-white shadow-sm"
                  >
                    <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="11" />
                    <span>Asignado</span>
                  </span>

                  <!-- Conductor asignado a otro vehículo en este servicio -->
                  <span
                    v-else-if="getVehiculoAsignadoAConductor(conductor.id_conductor)"
                    class="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    En: {{ getVehiculoObj(getVehiculoAsignadoAConductor(conductor.id_conductor)!)?.placa || getVehiculoAsignadoAConductor(conductor.id_conductor) }}
                  </span>

                  <!-- Estado DISPONIBLE -->
                  <span
                    v-else-if="conductor.estado?.toUpperCase() === 'DISPONIBLE'"
                    class="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    DISPONIBLE
                  </span>

                  <!-- Estado No disponible / Ocupado -->
                  <span
                    v-else
                    class="px-2 py-0.5 rounded-md text-[9.5px] font-semibold bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-white/5"
                  >
                    {{ conductor.estado || 'NO DISPONIBLE' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
