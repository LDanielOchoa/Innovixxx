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
  refHardware?: any[]
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
  (e: 'focusAlert', alerta: any): void
  (e: 'solveAlert', token: string): void
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
  Alert02Icon,
  ArrowRight01Icon,
  Tick01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { solventarAlertaApi } from '../../servicios/services/servicios.api'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const solvingToken = ref<string | null>(null)

const handleSolventarAlerta = async (alerta: any) => {
  if (!alerta?.token || solvingToken.value === alerta.token) return

  solvingToken.value = alerta.token
  try {
    const res = await solventarAlertaApi(alerta.token)
    if (res?.done !== false) {
      toast.add({
        severity: 'success',
        summary: 'Alerta solventada',
        detail: 'La alerta ha sido solventada exitosamente',
        life: 3000
      })
      // Remover la alerta localmente y notificar globalmente a todas las pestañas
      if (activeAlertasItem.value && Array.isArray(activeAlertasItem.value.alertas)) {
        activeAlertasItem.value.alertas = activeAlertasItem.value.alertas.filter(
          (a: any) => a.token !== alerta.token
        )
      }
      emit('solveAlert', alerta.token)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: res?.msg || res?.message || 'No se pudo solventar la alerta',
        life: 4000
      })
    }
  } catch (err: any) {
    console.error('Error al solventar alerta:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.message || 'Error de conexión al solventar la alerta',
      life: 4000
    })
  } finally {
    solvingToken.value = null
  }
}

const showRecursosDrawer = ref(false)

const hoveredRecursosItem = ref<any | null>(null)
const recursosModalTop = ref<number>(80)

const getAlertInfo = (tipo: number) => {
  switch (tipo) {
    case 1:
      return { label: 'Exceso de velocidad', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
    case 2:
      return { label: 'SOS / Emergencia', colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20' }
    case 3:
      return { label: 'Salida de ruta', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
    case 4:
      return { label: 'Candado abierto', colorClass: 'text-orange-500 bg-orange-500/10 border-orange-500/20' }
    case 5:
      return { label: 'Candado cerrado', colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
    case 6:
      return { label: 'Retorno Ruta', colorClass: 'text-teal-400 bg-teal-500/10 border-teal-500/20' }
    default:
      return { label: `Alerta tipo ${tipo}`, colorClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
  }
}

const activeAlertasItem = computed(() => hoveredAlertasItem.value || props.selectedItem)

const alertasDelServicio = computed(() => {
  const activeItem = activeAlertasItem.value
  if (!activeItem || props.activeTab !== 'SERVICIOS') return []
  if (Array.isArray(activeItem.alertas)) {
    return activeItem.alertas
  }
  return []
})

const hardwareDelServicio = computed(() => {
  const activeItem = hoveredRecursosItem.value || props.selectedItem
  if (!activeItem) return []
  const servId = String(activeItem.id_servicio || '').trim().toLowerCase()
  if (!servId) return []

  const mapHw = new Map<string, any>()

  // Helper para obtener una clave única canonical del hardware
  const getCanonicalKey = (idOrSerial: string) => {
    if (!idOrSerial) return ''
    const foundRef = props.refHardware?.find(r => r.id_hardware === idOrSerial || r.serial === idOrSerial)
    const foundWs = props.hardwareList.find(h => h.id_hardware === idOrSerial || h.serial === idOrSerial)
    return foundRef?.id_hardware || foundWs?.id_hardware || foundRef?.serial || foundWs?.serial || idOrSerial
  }

  // 1. Hardware proveniente de la lista en vivo de tracking (WebSocket / HardwareWs)
  props.hardwareList.forEach(h => {
    if (String(h.id_servicio || '').trim().toLowerCase() === servId) {
      const canonicalKey = getCanonicalKey(h.id_hardware || h.serial)
      const foundRefHw = props.refHardware?.find(r => r.id_hardware === canonicalKey || r.serial === canonicalKey)
      const nombreFinal = (h.nombre && h.nombre !== canonicalKey) ? h.nombre : (foundRefHw?.nombre || h.nombre || canonicalKey)
      mapHw.set(canonicalKey, { ...h, id_hardware: canonicalKey, nombre: nombreFinal })
    }
  })

  // 2. Si el servicio trae un arreglo de vehículos o hardware asignados
  const vehiculosItem = activeItem.vehiculos || activeItem.hardware || activeItem.vehiculos_id || []
  if (Array.isArray(vehiculosItem)) {
    vehiculosItem.forEach((v: any) => {
      const rawId = typeof v === 'string' ? v : (v.id_hardware || v.serial)
      if (rawId) {
        const canonicalKey = getCanonicalKey(rawId)
        const foundWs = props.hardwareList.find(h => h.id_hardware === canonicalKey || h.serial === canonicalKey)
        const foundRefHw = props.refHardware?.find(r => r.id_hardware === canonicalKey || r.serial === canonicalKey)
        const foundRefVeh = props.refVehiculos?.find(r => r.id_hardware === canonicalKey || r.serial === canonicalKey || r.id_vehiculo === canonicalKey)

        const nombreFinal = (foundWs?.nombre && foundWs.nombre !== canonicalKey)
          ? foundWs.nombre
          : (foundRefHw?.nombre || foundRefVeh?.nombre || foundRefVeh?.placa || (typeof v === 'object' && v.nombre && v.nombre !== canonicalKey ? v.nombre : canonicalKey))

        if (!mapHw.has(canonicalKey)) {
          mapHw.set(canonicalKey, {
            serial: canonicalKey,
            id_hardware: canonicalKey,
            nombre: nombreFinal,
            descripcion: foundWs?.descripcion || foundRefHw?.descripcion || foundRefVeh?.descripcion || (typeof v === 'object' ? v.descripcion : `ID: ${canonicalKey}`),
            battery: foundWs?.battery ?? (typeof v === 'object' ? v.battery : undefined),
            speed: foundWs?.speed ?? (typeof v === 'object' ? v.speed : 0),
            status_lock: foundWs?.status_lock || (typeof v === 'object' ? v.status_lock : '')
          })
        } else {
          const existing = mapHw.get(canonicalKey)
          if (existing && (!existing.nombre || existing.nombre === canonicalKey) && nombreFinal !== canonicalKey) {
            existing.nombre = nombreFinal
          }
        }
      }
    })
  }

  return Array.from(mapHw.values())
})

const getNombreHardware = (hw: any) => {
  if (!hw) return 'Hardware'
  if (hw.nombre && hw.nombre !== hw.id_hardware) return hw.nombre
  const foundWs = props.hardwareList.find(h => h.id_hardware === hw.id_hardware || h.serial === hw.serial)
  const foundRefHw = props.refHardware?.find(r => r.id_hardware === hw.id_hardware || r.serial === hw.serial)
  const foundRefVeh = props.refVehiculos?.find(r => r.id_hardware === hw.id_hardware || r.serial === hw.serial)
  const resolved = foundWs?.nombre || foundRefHw?.nombre || foundRefVeh?.nombre || foundRefVeh?.placa
  return (resolved && resolved !== hw.id_hardware) ? resolved : (hw.nombre || hw.id_hardware || 'Hardware')
}

const vehiculosDelServicio = computed(() => {
  const activeItem = hoveredRecursosItem.value || props.selectedItem
  if (!activeItem) return []
  const servId = String(activeItem.id_servicio || '').trim().toLowerCase()
  if (!servId) return []

  const mapVeh = new Map<string, any>()

  // 1. Buscar en vehiculosList y refVehiculos por id_servicio
  props.refVehiculos?.forEach(v => {
    if (String(v.id_servicio || '').trim().toLowerCase() === servId) {
      const key = v.id_vehiculo || v.placa || v.id_hardware
      mapVeh.set(key, { ...v })
    }
  })
  props.vehiculosList?.forEach(v => {
    if (String(v.id_servicio || '').trim().toLowerCase() === servId) {
      const key = v.id_vehiculo || v.placa || v.id_hardware
      mapVeh.set(key, { ...mapVeh.get(key), ...v })
    }
  })

  // 2. Resolver desde la propiedad `vehiculos` o `vehiculo` o `vehiculos_id` del objeto servicio
  const vehiculosItem = activeItem.vehiculos || activeItem.vehiculo || activeItem.vehiculos_id || []
  const arrayVeh = Array.isArray(vehiculosItem) ? vehiculosItem : [vehiculosItem]

  arrayVeh.forEach((item: any) => {
    if (!item) return
    const vId = typeof item === 'string' ? item : (item.id_vehiculo || item.placa || item.id_hardware)
    if (vId) {
      const foundRef = props.refVehiculos?.find(r => r.id_vehiculo === vId || r.placa === vId || r.id_hardware === vId)
      const foundList = props.vehiculosList?.find(vl => vl.id_vehiculo === vId || vl.placa === vId || vl.id_hardware === vId)

      const placaReal = (typeof item === 'object' && item.placa) ? item.placa : (foundRef?.placa || foundList?.placa || vId)
      const tipoReal = (typeof item === 'object' && item.tipo) ? item.tipo : (foundRef?.tipo || foundRef?.tipo_vehiculo || foundList?.tipo || '')
      const marcaReal = (typeof item === 'object' && item.marca) ? item.marca : (foundRef?.marca || foundList?.marca || '')
      const colorReal = (typeof item === 'object' && item.color) ? item.color : (foundRef?.color || foundList?.color || '')

      if (!mapVeh.has(vId)) {
        mapVeh.set(vId, {
          id_vehiculo: vId,
          placa: placaReal,
          tipo: tipoReal,
          marca: marcaReal,
          color: colorReal,
          descripcion: [tipoReal, marcaReal, colorReal].filter(Boolean).join(' - ') || `Placa / ID: ${placaReal}`
        })
      } else {
        const existing = mapVeh.get(vId)
        if (existing.placa === vId && placaReal !== vId) existing.placa = placaReal
        if (!existing.tipo && tipoReal) existing.tipo = tipoReal
      }
    }
  })

  return Array.from(mapVeh.values())
})

const escoltasDelServicio = computed(() => {
  const activeItem = hoveredRecursosItem.value || props.selectedItem
  if (!activeItem) return []
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
  const escoltasItem = activeItem.escoltas || activeItem.escolta || activeItem.escoltas_id || []
  const arrayEsc = Array.isArray(escoltasItem) ? escoltasItem : [escoltasItem]

  arrayEsc.forEach((item: any) => {
    if (!item) return
    const escId = typeof item === 'string' ? item : (item.id_escolta || item.identificacion)
    if (escId) {
      const foundWs = props.escoltasList.find(e => e.id_escolta === escId || e.identificacion === escId)
      const foundRef = props.refEscoltas?.find(r => r.id_escolta === escId || r.identificacion === escId || r.nombres === escId || r.nombre === escId)
      const key = escId

      const nombreReal = (foundRef?.nombre || foundRef?.nombres)
        ? (foundRef.nombre || foundRef.nombres)
        : (foundWs?.nombre && foundWs.nombre !== escId ? foundWs.nombre : (typeof item === 'object' && item.nombre && item.nombre !== escId ? item.nombre : escId))

      const celularReal = foundWs?.celular || foundRef?.celular || foundRef?.telefono || (typeof item === 'object' ? item.celular : '')

      if (!mapEsc.has(key)) {
        mapEsc.set(key, {
          id_escolta: escId,
          nombre: nombreReal,
          identificacion: foundRef?.identificacion || foundWs?.identificacion || (typeof item === 'object' ? item.identificacion : escId),
          celular: celularReal
        })
      } else {
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

  return Array.from(mapEsc.values())
})

const activeRecursosItem = computed(() => hoveredRecursosItem.value || props.selectedItem)

const showAlertasDrawer = ref(false)
const hoveredAlertasItem = ref<any | null>(null)
const alertasModalTop = ref<number>(80)

let leaveTimeout: any = null

// Controladores para el botón "Ver Recursos"
const onRecursosButtonHover = (event: MouseEvent, item: any) => {
  if (props.activeTab !== 'SERVICIOS') return
  if (leaveTimeout) clearTimeout(leaveTimeout)
  showAlertasDrawer.value = false
  hoveredRecursosItem.value = item
  showRecursosDrawer.value = true
  const card = (event.currentTarget as HTMLElement).closest('.group') as HTMLElement
  if (card) {
    recursosModalTop.value = card.offsetTop
  }
}

const onRecursosButtonLeave = () => {
  leaveTimeout = setTimeout(() => {
    showRecursosDrawer.value = false
    hoveredRecursosItem.value = null
  }, 150)
}

const onModalMouseEnter = () => {
  if (leaveTimeout) clearTimeout(leaveTimeout)
}

const onModalMouseLeave = () => {
  onRecursosButtonLeave()
}

// Controladores para el botón "Alertas"
const onAlertasBadgeHover = (event: MouseEvent, item: any) => {
  if (props.activeTab !== 'SERVICIOS') return
  if (leaveTimeout) clearTimeout(leaveTimeout)
  showRecursosDrawer.value = false
  hoveredAlertasItem.value = item
  showAlertasDrawer.value = true
  const card = (event.currentTarget as HTMLElement).closest('.group') as HTMLElement
  if (card) {
    alertasModalTop.value = card.offsetTop
  }
}

const onAlertasBadgeLeave = () => {
  leaveTimeout = setTimeout(() => {
    showAlertasDrawer.value = false
    hoveredAlertasItem.value = null
  }, 150)
}

const onAlertasModalMouseEnter = () => {
  if (leaveTimeout) clearTimeout(leaveTimeout)
}

const onAlertasModalMouseLeave = () => {
  onAlertasBadgeLeave()
}

const isItemSelected = (item: any) => {
  if (!props.selectedItem) return false
  if (props.activeTab === 'HARDWARE') {
    return (item.serial && props.selectedItem.serial === item.serial) ||
           (item.id_hardware && props.selectedItem.id_hardware === item.id_hardware)
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

      <!-- Buscador -->
      <div class="relative flex items-center gap-2">
        <AppInput 
          v-model="localSearchQuery"
          placeholder="Buscar..."
          :icon="Search01Icon"
          class="w-full"
        />
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
              {{ activeTab === 'SERVICIOS' ? (item.id_servicio ? `Servicio ${item.id_servicio}` : item.nombre) : (item.nombre || item.serial || item.id_hardware || item.placa) }}
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
            </template>

            <!-- Otros ítems -->
            <template v-else>
              <p class="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {{ item.descripcion || item.serial || item.celular || item.email || item.identificacion || 'Sin descripción' }}
              </p>
            </template>
          </div>

          <!-- Right: Badges, Botón Alertas y Botón Ver Recursos -->
          <div class="flex flex-col items-end gap-1.5 shrink-0 relative z-10">
            <div class="flex items-center gap-1.5">
              <span v-if="item.sos" class="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 leading-none select-none tracking-wide animate-pulse">
                SOS
              </span>
              <span v-if="item.battery !== undefined" class="text-[10px] font-bold text-emerald-550 dark:text-emerald-450 flex items-center gap-0.5 leading-none select-none tracking-wide">
                <HugeiconsIcon :icon="BatteryCharging01Icon" :size="10.5" class="opacity-80" />
                {{ item.battery }}%
              </span>
              <span v-if="item.lat && item.lon" class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="GPS Activo"></span>
            </div>

            <template v-if="activeTab === 'SERVICIOS'">
              <!-- Botón Alertas (Hover abre modal de alertas) -->
              <span 
                v-if="item.alertas && item.alertas.length > 0" 
                @mouseenter.stop="onAlertasBadgeHover($event, item)"
                @mouseleave.stop="onAlertasBadgeLeave"
                class="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1 animate-pulse cursor-pointer hover:bg-rose-500/25 transition-colors text-[9.5px] font-bold shadow-sm"
              >
                <HugeiconsIcon :icon="Alert02Icon" :size="11" />
                {{ item.alertas.length }} {{ item.alertas.length === 1 ? 'Alerta' : 'Alertas' }}
              </span>

              <!-- Botón Ver Recursos (Abajo de las alertas, Hover abre modal de recursos) -->
              <button
                @mouseenter.stop="onRecursosButtonHover($event, item)"
                @mouseleave.stop="onRecursosButtonLeave"
                class="flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold rounded-lg transition-colors shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-[#3b82f6] hover:text-white dark:hover:bg-[#3b82f6] cursor-pointer"
              >
                <span>Ver recursos</span>
                <HugeiconsIcon :icon="ArrowRight01Icon" :size="10" />
              </button>
            </template>
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
        @mouseenter="onModalMouseEnter"
        @mouseleave="onModalMouseLeave"
        :style="{ top: recursosModalTop + 'px' }"
        class="absolute left-[100%] ml-2 w-[270px] bg-white dark:bg-[#13161C] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col"
      >
        <!-- Header Mini Modal Recursos -->
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

        <!-- Contenido Compacto Recursos -->
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
                      {{ (props.refHardware?.find(r => r.id_hardware === hw.id_hardware)?.nombre) || hw.nombre || hw.id_hardware }}
                    </span>
                    <span v-if="hw.status_lock" class="text-[8px] font-bold px-1 py-0.2 rounded" :class="hw.status_lock === 'CERRADA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'">
                      {{ hw.status_lock }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Vehículos -->
          <div>
            <div class="flex items-center gap-1 mb-1.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <HugeiconsIcon :icon="Car02Icon" :size="11" class="text-blue-500" />
              <span>Vehículos ({{ vehiculosDelServicio.length }})</span>
            </div>

            <div v-if="vehiculosDelServicio.length === 0" class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-center">
              <span class="text-[9.5px] text-slate-400">Sin vehículos asignados</span>
            </div>

            <div v-else class="space-y-1">
              <div 
                v-for="veh in vehiculosDelServicio" 
                :key="veh.id_vehiculo || veh.placa"
                class="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2"
              >
                <div class="w-6 h-6 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center text-[9px] font-bold shrink-0">
                  <HugeiconsIcon :icon="Car02Icon" :size="12" />
                </div>
                <div class="min-w-0 flex-1">
                  <span class="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate block">{{ veh.placa || veh.id_vehiculo }}</span>
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

    <!-- MINI MODAL COMPACTO EXCLUSIVO DE ALERTAS -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="scale-95 opacity-0 -translate-x-2"
      enter-to-class="scale-100 opacity-100 translate-x-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="scale-100 opacity-100 translate-x-0"
      leave-to-class="scale-95 opacity-0 -translate-x-2"
    >
      <div 
        v-if="showAlertasDrawer && activeAlertasItem && activeTab === 'SERVICIOS'"
        @mouseenter="onAlertasModalMouseEnter"
        @mouseleave="onAlertasModalMouseLeave"
        :style="{ top: alertasModalTop + 'px' }"
        class="absolute left-[100%] ml-2 w-[270px] bg-white dark:bg-[#13161C] border border-rose-500/30 dark:border-rose-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        <!-- Header Mini Modal Alertas -->
        <div class="p-3 px-3.5 border-b border-rose-500/20 dark:border-rose-500/20 flex items-center justify-between bg-rose-500/5">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <HugeiconsIcon :icon="Alert02Icon" :size="13" />
            </div>
            <div>
              <h3 class="text-[11px] font-bold text-slate-800 dark:text-white leading-none">Alertas del Servicio</h3>
              <p class="text-[9px] text-slate-400 font-mono mt-0.5">{{ activeAlertasItem?.id_servicio }}</p>
            </div>
          </div>
          <button 
            @click="showAlertasDrawer = false"
            class="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="12" />
          </button>
        </div>

        <!-- Lista de Alertas -->
        <div class="max-h-[340px] overflow-y-auto custom-scrollbar p-3 space-y-2">
          <div v-if="alertasDelServicio.length === 0" class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-center">
            <span class="text-[9.5px] text-slate-400">Sin alertas activas</span>
          </div>

          <div 
            v-for="(alerta, idx) in alertasDelServicio" 
            :key="alerta.token || idx"
            class="p-2.5 rounded-xl bg-slate-50 dark:bg-[#16181F] border border-slate-200/70 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition-all flex flex-col gap-2 shadow-sm"
          >
            <!-- Top: Badge + Timestamp -->
            <div class="flex items-center justify-between gap-2">
              <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider uppercase" :class="getAlertInfo(alerta.tipo).colorClass">
                {{ getAlertInfo(alerta.tipo).label }}
              </span>
              <span v-if="alerta.fecha_hora" class="text-[8.5px] font-mono text-slate-400 dark:text-slate-500">
                {{ alerta.fecha_hora.split(' ')[1] || alerta.fecha_hora }}
              </span>
            </div>

            <!-- Acciones parte inferior: Ver en mapa & Solventar -->
            <div class="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200/50 dark:border-white/[0.05]">
              <button
                v-if="alerta.lat && alerta.lon"
                type="button"
                @click.stop="emit('focusAlert', alerta)"
                class="inline-flex items-center gap-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors"
              >
                <HugeiconsIcon :icon="Location01Icon" :size="10" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <span>Ver mapa</span>
              </button>

              <button
                type="button"
                @click.stop="handleSolventarAlerta(alerta)"
                :disabled="solvingToken === alerta.token"
                class="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white dark:hover:text-white border border-emerald-500/25 text-[9.5px] font-bold transition-all disabled:opacity-50"
              >
                <HugeiconsIcon v-if="solvingToken === alerta.token" :icon="Loading03Icon" :size="9" class="animate-spin" />
                <HugeiconsIcon v-else :icon="Tick01Icon" :size="9" />
                <span>Solventar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tracking-sidebar {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
</style>

