<script setup lang="ts">
import { computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import AppInput from '../../../components/ui/AppInput.vue'
import {
  ChipIcon,
  Settings02Icon,
  UserGroupIcon,
  Car02Icon,
  Location01Icon,
  RefreshIcon,
  Search01Icon,
  BatteryCharging01Icon,
  MapsIcon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import type { HardwareWs } from '../types/tracking'

interface Props {
  activeTab: 'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS'
  searchQuery: string
  hardwareList: HardwareWs[]
  serviciosList: any[]
  escoltasList: any[]
  vehiculosList: any[]
  refEscoltas?: any[]
  refVehiculos?: any[]
  isLoadingSecondary: boolean
  wsStatus: 'disconnected' | 'connecting' | 'connected'
  wsError: string | null
  selectedItem: any | null
  showGeocercas?: boolean
  loadingGeocercas?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showGeocercas: false,
  loadingGeocercas: false
})

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'reconnect'): void
  (e: 'select', item: any): void
  (e: 'toggleGeocercas'): void
}>()

const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
})

const filteredItems = computed(() => {
  const query = props.searchQuery.toLowerCase()
  if (props.activeTab === 'HARDWARE') {
    if (!query) return props.hardwareList
    return props.hardwareList.filter(h => 
      h.nombre.toLowerCase().includes(query) || 
      h.serial.toLowerCase().includes(query) ||
      h.descripcion.toLowerCase().includes(query)
    )
  } else if (props.activeTab === 'SERVICIOS') {
    if (!query) return props.serviciosList
    return props.serviciosList.filter(s => 
      (s.id_servicio && s.id_servicio.toLowerCase().includes(query)) ||
      (s.estado && s.estado.toLowerCase().includes(query))
    )
  } else if (props.activeTab === 'ESCOLTAS') {
    if (!query) return props.escoltasList
    return props.escoltasList.filter(e => 
      (e.nombre && e.nombre.toLowerCase().includes(query)) ||
      (e.identificacion && e.identificacion.toLowerCase().includes(query))
    )
  }
  return []
})

import { ref } from 'vue'
import {
  Cancel01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'

const showRecursosDrawer = ref(false)

const hoveredRecursosItem = ref<any | null>(null)
const recursosModalTop = ref<number>(80)

const hardwareDelServicio = computed(() => {
  const activeItem = hoveredRecursosItem.value || props.selectedItem
  if (!activeItem || props.activeTab !== 'SERVICIOS') return []
  const servId = String(activeItem.id_servicio || '').trim().toLowerCase()
  if (!servId) return []

  const mapHw = new Map<string, any>()

  // 1. Hardware proveniente de la lista en vivo de tracking (WebSocket / HardwareWs)
  props.hardwareList.forEach(h => {
    if (String(h.id_servicio || '').trim().toLowerCase() === servId) {
      const key = h.id_hardware || h.serial
      mapHw.set(key, { ...h })
    }
  })

  // 2. Si el servicio seleccionado trae un arreglo de vehículos o hardware asignados
  const vehiculosItem = activeItem.vehiculos || activeItem.hardware || activeItem.vehiculos_id || []
  if (Array.isArray(vehiculosItem)) {
    vehiculosItem.forEach((v: any) => {
      const hwId = typeof v === 'string' ? v : (v.id_hardware || v.serial || v.id_vehiculo)
      if (hwId) {
        const foundWs = props.hardwareList.find(h => h.id_hardware === hwId || h.serial === hwId)
        const foundRef = props.refVehiculos?.find(r => r.id_hardware === hwId || r.serial === hwId || r.id_vehiculo === hwId)
        if (!mapHw.has(hwId)) {
          mapHw.set(hwId, {
            serial: hwId,
            id_hardware: hwId,
            nombre: foundWs?.nombre || foundRef?.nombre || foundRef?.placa || (typeof v === 'object' ? (v.nombre || v.id_vehiculo) : hwId),
            descripcion: foundWs?.descripcion || foundRef?.descripcion || (typeof v === 'object' ? v.descripcion : `Dispositivo ${hwId}`),
            battery: foundWs?.battery ?? (typeof v === 'object' ? v.battery : undefined),
            speed: foundWs?.speed ?? (typeof v === 'object' ? v.speed : 0),
            status_lock: foundWs?.status_lock || (typeof v === 'object' ? v.status_lock : '')
          })
        }
      }
    })
  }

  return Array.from(mapHw.values())
})

const escoltasDelServicio = computed(() => {
  const activeItem = hoveredRecursosItem.value || props.selectedItem
  if (!activeItem || props.activeTab !== 'SERVICIOS') return []
  const servId = String(activeItem.id_servicio || '').trim().toLowerCase()
  if (!servId) return []

  const mapEsc = new Map<string, any>()

  // 1. Escoltas en vivo desde la lista de tracking
  props.escoltasList.forEach(e => {
    if (String(e.id_servicio || '').trim().toLowerCase() === servId) {
      const key = e.id_escolta || e.identificacion || e.nombre
      mapEsc.set(key, { ...e })
    }
  })

  // 2. Resolver desde la lista de referencia refEscoltas o escoltas del item
  const escoltasItem = activeItem.escoltas || activeItem.escoltas_id || []
  if (Array.isArray(escoltasItem)) {
    escoltasItem.forEach((item: any) => {
      const escId = typeof item === 'string' ? item : (item.id_escolta || item.identificacion)
      if (escId) {
        const foundWs = props.escoltasList.find(e => e.id_escolta === escId || e.identificacion === escId)
        const foundRef = props.refEscoltas?.find(r => r.id_escolta === escId || r.identificacion === escId)
        const key = escId
        
        const nombreReal = foundWs?.nombre !== escId ? foundWs?.nombre : (foundRef?.nombre || foundRef?.nombres || (typeof item === 'object' && item.nombre !== escId ? item.nombre : escId))
        const celularReal = foundWs?.celular || foundRef?.celular || foundRef?.telefono || (typeof item === 'object' ? item.celular : '')

        if (!mapEsc.has(key)) {
          mapEsc.set(key, {
            id_escolta: escId,
            nombre: nombreReal,
            identificacion: foundRef?.identificacion || foundWs?.identificacion || (typeof item === 'object' ? item.identificacion : escId),
            celular: celularReal
          })
        } else {
          // Si ya existe pero tenía solo el código simple (ej: "JOal7vmK"), enriquecerlo con el nombre real
          const existing = mapEsc.get(key)
          if (existing.nombre === escId && nombreReal !== escId) {
            existing.nombre = nombreReal
          }
          if (!existing.celular && celularReal) {
            existing.celular = celularReal
          }
        }
      }
    })
  }

  return Array.from(mapEsc.values())
})

const activeRecursosItem = computed(() => hoveredRecursosItem.value || props.selectedItem)

const onServiceHover = (event: MouseEvent, item: any) => {
  if (props.activeTab !== 'SERVICIOS') return
  hoveredRecursosItem.value = item
  const target = event.currentTarget as HTMLElement
  if (target) {
    recursosModalTop.value = target.offsetTop
  }
}

const onServiceLeave = () => {
  hoveredRecursosItem.value = null
}

const openRecursosForItem = (event: MouseEvent, item: any) => {
  const target = (event.currentTarget as HTMLElement).closest('.group') as HTMLElement
  if (target) {
    recursosModalTop.value = target.offsetTop
  }
  if (isItemSelected(item)) {
    showRecursosDrawer.value = !showRecursosDrawer.value
  } else {
    emit('select', item)
    showRecursosDrawer.value = true
  }
}

const getNombreHardware = (hw: any) => {
  if (hw.nombre && hw.nombre !== hw.id_hardware && hw.nombre !== hw.serial) return hw.nombre
  const foundWs = props.hardwareList.find(h => h.id_hardware === hw.id_hardware || h.serial === hw.serial)
  if (foundWs?.nombre && foundWs.nombre !== hw.id_hardware) return foundWs.nombre
  if (props.refVehiculos) {
    const v = props.refVehiculos.find(veh => veh.id_hardware === hw.id_hardware || veh.serial === hw.serial)
    if (v?.nombre || v?.placa) return v.nombre || v.placa
  }
  return hw.nombre || hw.serial || hw.id_hardware || 'Hardware'
}

const isItemSelected = (item: any) => {
  if (!props.selectedItem) return false
  if (props.activeTab === 'HARDWARE') {
    return props.selectedItem.serial === item.serial
  } else if (props.activeTab === 'SERVICIOS') {
    return props.selectedItem.id_servicio === item.id_servicio
  } else if (props.activeTab === 'ESCOLTAS') {
    return props.selectedItem.id_escolta === item.id_escolta
  }
  return false
}
</script>

<template>
  <div class="absolute top-0 bottom-0 left-0 w-[320px] md:w-[350px] lg:w-[380px] bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 z-30 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] tracking-sidebar">
    
    <!-- Cabecera Panel -->
    <div class="p-4 border-b border-slate-200/70 dark:border-white/5 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div 
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            :class="[
              activeTab === 'SERVICIOS' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
              activeTab === 'HARDWARE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
              'bg-purple-500/10 text-purple-600 dark:text-purple-400'
            ]"
          >
            <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="16" />
            <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="16" />
            <HugeiconsIcon v-else :icon="UserGroupIcon" :size="16" />
          </div>
          <div>
            <h2 class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight capitalize">{{ activeTab.toLowerCase() }}</h2>
            <span class="text-[9px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-wider block mt-0.5">
              {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'elemento' : 'elementos' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Buscador y Acciones -->
      <div class="relative flex items-center gap-2">
        <AppInput 
          v-model="localSearchQuery"
          placeholder="Buscar..."
          :icon="Search01Icon"
          class="flex-1"
        />
        <button 
          v-if="activeTab === 'HARDWARE'"
          @click="emit('reconnect')"
          title="Reconectar"
          class="w-10 h-10 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 shrink-0"
        >
          <HugeiconsIcon :icon="RefreshIcon" :size="14" :class="{ 'animate-spin': wsStatus === 'connecting' }" />
        </button>
      </div>
    </div>

    <!-- Cuerpo / Lista -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/50 dark:bg-[#13161C]/50">
      <!-- Error de sesión / credenciales -->
      <div v-if="wsError && activeTab === 'HARDWARE'" class="mx-1 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2">
        <p class="text-[10px] font-bold text-rose-400">{{ wsError }}</p>
        <button @click="emit('reconnect')" class="text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:underline self-start">
          Reintentar
        </button>
      </div>

      <!-- Skeletons de Carga (Diseño limpio y fluido) -->
      <div v-if="isLoadingSecondary || (activeTab === 'HARDWARE' && wsStatus === 'connecting' && hardwareList.length === 0)" class="space-y-2">
        <div 
          v-for="i in 5" 
          :key="i" 
          class="w-full p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] flex items-center gap-3 bg-white/40 dark:bg-white/[0.02] animate-pulse"
        >
          <!-- Icon Circle Skeleton -->
          <div class="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/[0.06] shrink-0"></div>

          <!-- Text lines -->
          <div class="flex-1 space-y-1.5 min-w-0">
            <div class="h-3.5 bg-slate-200/50 dark:bg-white/[0.06] rounded-md w-3/5"></div>
            <div class="h-2.5 bg-slate-100 dark:bg-white/[0.03] rounded-md w-2/5"></div>
          </div>
        </div>
      </div>

      <!-- Lista Vacía -->
      <div v-else-if="filteredItems.length === 0 && !wsError" class="py-16 text-center flex flex-col items-center gap-2">
        <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-white/20">
          <HugeiconsIcon :icon="Location01Icon" :size="20" />
        </div>
        <p class="text-[11px] font-bold text-slate-450 dark:text-white/30">No se encontraron elementos</p>
      </div>

      <!-- Elementos -->
      <template v-else>
        <button
          v-for="item in filteredItems"
          :key="item.serial || item.id_servicio || item.id_escolta || item.placa"
          @click="emit('select', item)"
          @mouseenter="onServiceHover($event, item)"
          @mouseleave="onServiceLeave"
          class="group w-full text-left p-2.5 px-3 rounded-xl transition-colors border outline-none flex items-center justify-between gap-3 relative select-none"
          :class="[
            isItemSelected(item)
              ? (activeTab === 'SERVICIOS' 
                  ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 dark:bg-[#3b82f6]/15 dark:border-[#3b82f6]/40'
                  : activeTab === 'HARDWARE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-500/15 dark:border-emerald-500/40'
                    : 'bg-purple-500/10 border-purple-500/30 dark:bg-purple-500/15 dark:border-purple-500/40')
              : (item.sos 
                  ? 'bg-rose-500/5 hover:bg-rose-500/10 border-red-500/15'
                  : 'bg-white dark:bg-[#13161C] border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700')
          ]"
        >
          <!-- Left: Icono interactivo -->
          <div 
            class="w-8 h-8 flex items-center justify-center shrink-0 transition-colors rounded-lg relative z-10"
            :class="[
              isItemSelected(item) 
                ? (activeTab === 'SERVICIOS' ? 'bg-[#3b82f6]/15 text-[#3b82f6] dark:text-[#60a5fa]' :
                   activeTab === 'HARDWARE' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                   'bg-purple-500/15 text-purple-600 dark:text-purple-400')
                : (item.sos 
                    ? 'bg-rose-500/10 text-rose-500 dark:text-rose-450'
                    : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200/60 dark:group-hover:bg-white/10')
            ]"
          >
            <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="15" />
            <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="15" />
            <HugeiconsIcon v-else :icon="UserGroupIcon" :size="15" />
          </div>

          <!-- Center: Textos -->
          <div class="min-w-0 flex-1 relative z-10">
            <h3
              class="text-[12px] font-bold tracking-tight truncate transition-colors duration-200"
              :class="[
                isItemSelected(item)
                  ? (activeTab === 'SERVICIOS' ? 'text-blue-600 dark:text-blue-400' :
                     activeTab === 'HARDWARE' ? 'text-emerald-600 dark:text-emerald-400' :
                     'text-purple-600 dark:text-purple-400')
                  : (item.sos ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200')
              ]"
            >
              {{ item.id_servicio ? `Servicio ${item.id_servicio}` : (item.nombre || item.placa) }}
            </h3>
            
            <!-- Detalles de Servicio -->
            <template v-if="activeTab === 'SERVICIOS'">
              <p class="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
                {{ item.nombre_ruta || item.id_ruta || 'Sin Ruta' }}
              </p>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap text-[9px] font-bold">
                <span v-if="item.nivel_riesgo !== undefined" class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Riesgo {{ item.nivel_riesgo }}
                </span>
                <span v-if="item.alcance !== undefined" class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {{ item.alcance === 1 ? 'Nacional' : (item.alcance === 2 ? 'Departamental' : 'Local') }}
                </span>
                <span v-if="item.modo_fin !== undefined" class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {{ item.modo_fin === 1 ? 'Al llegar' : 'Al descargar' }}
                </span>
              </div>

              <!-- Botón Ver Recursos (Disponible siempre) -->
              <div class="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex justify-end">
                <button
                  @click.stop="openRecursosForItem($event, item)"
                  class="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors shadow-sm"
                  :class="isItemSelected(item) && showRecursosDrawer
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#3b82f6] hover:text-white dark:hover:bg-[#3b82f6]'"
                >
                  <span>Ver recursos</span>
                  <HugeiconsIcon :icon="ArrowRight01Icon" :size="12" />
                </button>
              </div>
            </template>

            <!-- Otros ítems -->
            <template v-else>
              <p class="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {{ item.descripcion || item.serial || item.celular || item.email || item.identificacion || 'Sin descripción' }}
              </p>
            </template>
          </div>

          <!-- Right: Badges e Indicador GPS -->
          <div class="flex flex-col items-end gap-1.5 shrink-0 relative z-10">
            <div class="flex items-center gap-1.5">
              <span v-if="item.sos" class="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 leading-none select-none tracking-wide animate-pulse">
                SOS
              </span>
              <span v-if="item.battery !== undefined" class="text-[10px] font-bold text-emerald-550 dark:text-emerald-450 flex items-center gap-0.5 leading-none select-none tracking-wide">
                <HugeiconsIcon :icon="BatteryCharging01Icon" :size="10.5" class="opacity-80" />
                {{ item.battery }}%
              </span>
            </div>
            <span v-if="item.lat && item.lon" class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="GPS Activo"></span>
          </div>
        </button>
      </template>
    </div>

    <!-- MINI MODAL COMPACTO DE RECURSOS -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="scale-95 opacity-0 -translate-x-2"
      enter-to-class="scale-100 opacity-100 translate-x-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="scale-100 opacity-100 translate-x-0"
      leave-to-class="scale-95 opacity-0 -translate-x-2"
    >
      <div 
        v-if="showRecursosDrawer && activeRecursosItem && activeTab === 'SERVICIOS'"
        :style="{ top: recursosModalTop + 'px' }"
        class="absolute left-[100%] ml-2 w-[270px] bg-white dark:bg-[#13161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
      >
        <!-- Header Mini Modal -->
        <div class="p-3 px-3.5 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center">
              <HugeiconsIcon :icon="ChipIcon" :size="13" />
            </div>
            <div>
              <h3 class="text-[11px] font-bold text-slate-800 dark:text-white leading-none">Recursos</h3>
              <p class="text-[9px] text-slate-400 font-mono mt-0.5">{{ activeRecursosItem?.id_servicio }}</p>
            </div>
          </div>
          <button 
            @click="showRecursosDrawer = false"
            class="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
          </button>
        </div>

        <!-- Contenido Compacto -->
        <div class="max-h-[320px] overflow-y-auto custom-scrollbar p-3 space-y-3">
          <!-- Hardware -->
          <div>
            <div class="flex items-center gap-1 mb-1.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <HugeiconsIcon :icon="ChipIcon" :size="11" class="text-emerald-500" />
              <span>Hardware ({{ hardwareDelServicio.length }})</span>
            </div>
            
            <div v-if="hardwareDelServicio.length === 0" class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-center">
              <span class="text-[9.5px] text-slate-400">Sin hardware activo</span>
            </div>

            <div v-else class="space-y-1">
              <div 
                v-for="hw in hardwareDelServicio" 
                :key="hw.serial || hw.id_hardware"
                class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1">
                    <span class="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {{ getNombreHardware(hw) }}
                    </span>
                    <span v-if="hw.status_lock" class="text-[8px] font-bold px-1 py-0.2 rounded" :class="hw.status_lock === 'CERRADA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'">
                      {{ hw.status_lock }}
                    </span>
                  </div>
                  <p class="text-[9px] text-slate-400 truncate mt-0.5">{{ hw.descripcion || hw.serial || hw.id_hardware }}</p>
                </div>
                <div class="text-right shrink-0">
                  <span v-if="hw.battery !== undefined" class="text-[8.5px] font-bold text-emerald-500 flex items-center gap-0.5 justify-end">
                    <HugeiconsIcon :icon="BatteryCharging01Icon" :size="9" />
                    {{ hw.battery }}%
                  </span>
                  <span class="text-[8px] font-medium text-slate-400 block mt-0.5">{{ hw.speed || 0 }} km/h</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Escoltas -->
          <div>
            <div class="flex items-center gap-1 mb-1.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <HugeiconsIcon :icon="UserGroupIcon" :size="11" class="text-purple-500" />
              <span>Escoltas ({{ escoltasDelServicio.length }})</span>
            </div>

            <div v-if="escoltasDelServicio.length === 0" class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-center">
              <span class="text-[9.5px] text-slate-400">Sin escoltas asignados</span>
            </div>

            <div v-else class="space-y-1">
              <div 
                v-for="esc in escoltasDelServicio" 
                :key="esc.id_escolta || esc.identificacion"
                class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2"
              >
                <div class="w-6 h-6 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {{ (esc.nombre || 'E').charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <span class="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate block">{{ esc.nombre || 'Escolta' }}</span>
                  <span class="text-[9px] text-slate-400 truncate block mt-0.5">{{ esc.celular || esc.identificacion || 'Sin contacto' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.tracking-sidebar {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
</style>

