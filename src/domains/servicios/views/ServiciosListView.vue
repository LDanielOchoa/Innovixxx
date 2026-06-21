<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Calendar01Icon,
  CpuIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  MoreHorizontalIcon,
  Route01Icon,
  User02Icon,
  Car01Icon,
  Edit01Icon,
  FilterIcon,
  Clock01Icon
} from '@hugeicons/core-free-icons'
import {
  fetchServicioDashboardApi,
  fetchVehiculosSimplesApi,
  fetchHardwareSimplesApi
} from '../services/servicios.api'
import type { Servicio, ServicioDashboard, ServicioListPayload, VehiculoSimple, HardwareSimple } from '../types/servicio'
import { SERVICIO_ESTADOS, SERVICIO_ESTADOS_LABELS } from '../types/servicio'
import { useI18n } from 'vue-i18n'
import { fetchRutasApi } from '../../rutas/services/rutas.api'
import type { Ruta } from '../../rutas/types/ruta'
import { fetchEscoltasApi } from '../../escoltas/services/escoltas.api'
import type { Escolta } from '../../escoltas/types/escolta'
import * as XLSX from 'xlsx'

import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'
import ServicioCreateModal from '../components/ServicioCreateModal.vue'
import ServicioAsignarRecursosModal from '../components/ServicioAsignarRecursosModal.vue'
import ServicioCambiarRutaModal from '../components/ServicioCambiarRutaModal.vue'
import ServicioActualizarEscoltaModal from '../components/ServicioActualizarEscoltaModal.vue'
import ServicioActualizarVehiculosModal from '../components/ServicioActualizarVehiculosModal.vue'
import ServicioVerHistorialModal from '../components/ServicioVerHistorialModal.vue'
import ServicioCambiarEstadoModal from '../components/ServicioCambiarEstadoModal.vue'
import Column from 'primevue/column'

import PageHeader from '../../../components/shared/PageHeader.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const servicios = ref<any[]>([])
const catalogoVehiculos = ref<VehiculoSimple[]>([])
const catalogoHardware = ref<HardwareSimple[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const obtenerNombreRuta = (id: string): string => {
  const r = rutas.value.find(item => item.id_ruta === id)
  return r ? r.nombre : id
}

const obtenerNombreVehiculo = (id: string): string => {
  const v = catalogoVehiculos.value.find(item => item.id_vehiculo === id)
  return v ? `${v.placa} (${v.tipo})` : id
}

const obtenerNombreHardware = (id: string): string => {
  const h = catalogoHardware.value.find(item => item.id_hardware === id)
  return h ? h.nombre : id
}

const obtenerNombreEscolta = (id: string): string => {
  const e = escoltas.value.find(item => item.id_escolta === id)
  return e ? e.nombre : id
}

const obtenerCelularEscolta = (id: string): string => {
  const e = escoltas.value.find(item => item.id_escolta === id)
  return e && e.celular ? e.celular : ''
}

const obtenerLabelModoFin = (val: any): string => {
  const num = Number(val)
  if (num === 1) return 'Al llegar'
  if (num === 2) return 'Al descargar'
  return val || '---'
}

const obtenerLabelAlcance = (val: any): string => {
  const num = Number(val)
  if (num === 1) return 'Nacional'
  if (num === 2) return 'Departamental'
  if (num === 3) return 'Local'
  return val || 'ND'
}

const obtenerLabelNivelRiesgo = (val: any): string => {
  const num = Number(val)
  if (num === 1) return 'Bajo'
  if (num === 2) return 'Medio'
  if (num === 3) return 'Alto'
  return val || 'ND'
}

const obtenerLabelEstado = (val: any): string => {
  if (typeof val === 'number') {
    const entry = Object.entries(SERVICIO_ESTADOS).find(([_, value]) => value === val)
    return entry ? entry[0] : String(val)
  }
  return val || '---'
}

const currentPage = ref(1)
const itemsPerPage = 10

// Modales consolidados
const activeModal = ref<'create' | 'assign' | 'route' | 'escort' | 'vehicles' | 'history' | 'status' | null>(null)
const selectedServicio = ref<ServicioDashboard | null>(null)

const isCreateModalOpen = computed({
  get: () => activeModal.value === 'create',
  set: (val) => { if (!val) activeModal.value = null }
})
const isAsignarModalOpen = computed({
  get: () => activeModal.value === 'assign',
  set: (val) => { if (!val) activeModal.value = null }
})
const isCambiarRutaModalOpen = computed({
  get: () => activeModal.value === 'route',
  set: (val) => { if (!val) activeModal.value = null }
})
const isActualizarEscoltaModalOpen = computed({
  get: () => activeModal.value === 'escort',
  set: (val) => { if (!val) activeModal.value = null }
})
const isActualizarVehiculosModalOpen = computed({
  get: () => activeModal.value === 'vehicles',
  set: (val) => { if (!val) activeModal.value = null }
})
const isVerHistorialModalOpen = computed({
  get: () => activeModal.value === 'history',
  set: (val) => { if (!val) activeModal.value = null }
})
const isCambiarEstadoModalOpen = computed({
  get: () => activeModal.value === 'status',
  set: (val) => { if (!val) activeModal.value = null }
})

const openModal = (tipo: 'create' | 'assign' | 'route' | 'escort' | 'vehicles' | 'history' | 'status', servicio: ServicioDashboard | null = null) => {
  closeMenu()
  selectedServicio.value = servicio
  activeModal.value = tipo
}

// Menú de acciones
const openMenuId = ref<string | null>(null)
const activeMenuServicio = ref<ServicioDashboard | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })

const toggleMenu = (servicio: ServicioDashboard, event: MouseEvent) => {
  if (openMenuId.value === servicio.id_servicio) {
    closeMenu()
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
  openMenuId.value = servicio.id_servicio
  activeMenuServicio.value = servicio
}

const closeMenu = () => {
  openMenuId.value = null
  activeMenuServicio.value = null
}

// Filtros y Dropdowns en Barra
const activeDropdown = ref<'ruta' | 'escolta' | 'estado' | null>(null)

const rutaDropdownRef = ref<HTMLElement | null>(null)
const escoltaDropdownRef = ref<HTMLElement | null>(null)
const estadoDropdownRef = ref<HTMLElement | null>(null)

const toggleDropdown = (type: 'ruta' | 'escolta' | 'estado') => {
  activeDropdown.value = activeDropdown.value === type ? null : type
}

const selectRuta = (id: string) => {
  filtros.value.id_ruta = id
  activeDropdown.value = null
}

const selectEscolta = (id: string) => {
  filtros.value.id_escolta = id
  activeDropdown.value = null
}

const selectEstado = (estado: number) => {
  filtros.value.estado = estado
  activeDropdown.value = null
}

const getRutaLabel = (): string => {
  if (filtros.value.id_ruta === 'all') return 'Todas las Rutas'
  const ruta = rutas.value.find(r => r.id_ruta === filtros.value.id_ruta)
  return ruta?.nombre || '---'
}

const getEscoltaLabel = (): string => {
  if (filtros.value.id_escolta === 'all') return 'Todos los Escoltas'
  const escolta = escoltas.value.find(e => e.id_escolta === filtros.value.id_escolta)
  return escolta?.nombre || '---'
}

const getEstadoLabel = (): string => {
  return SERVICIO_ESTADOS_LABELS[filtros.value.estado] || '---'
}

const estadoOptions = [
  { value: 1, label: 'PRERCARGA' },
  { value: 2, label: 'EN ESPERA' },
  { value: 3, label: 'EJECUCION OK' },
  { value: 4, label: 'EJECUCION FAIL' }
]

// Estado del tooltip
const tooltipVisible = ref(false)
const tooltipData = ref<any>(null)
const tooltipTipo = ref<'rutas' | 'vehiculos' | 'escoltas'>('rutas')
const tooltipPos = ref({ top: '0px', left: '0px' })
let tooltipTimer: ReturnType<typeof setTimeout> | null = null

const tooltipIcon = computed(() => {
  if (tooltipTipo.value === 'rutas') return Route01Icon
  if (tooltipTipo.value === 'vehiculos') return Car01Icon
  return User02Icon
})

const tooltipTitulo = computed(() => {
  if (tooltipTipo.value === 'rutas') return 'Rutas del Servicio'
  if (tooltipTipo.value === 'vehiculos') return 'Vehículos y Hardware'
  return 'Escoltas Asignados'
})

const mostrarTooltip = (event: MouseEvent, data: any, tipo: 'rutas' | 'vehiculos' | 'escoltas') => {
  if (tooltipTimer) clearTimeout(tooltipTimer)
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const tooltipWidth = tipo === 'vehiculos' ? 260 : 210
  let left = rect.left + rect.width / 2 - tooltipWidth / 2
  if (left < 8) left = 8
  if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8
  tooltipPos.value = {
    top: `${rect.top + window.scrollY - 8}px`,
    left: `${left}px`
  }
  tooltipData.value = data
  tooltipTipo.value = tipo
  tooltipVisible.value = true
}

const ocultarTooltip = () => {
  tooltipTimer = setTimeout(() => {
    tooltipVisible.value = false
    tooltipData.value = null
  }, 80)
}

const getLastWeekDates = () => {
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)
  
  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return {
    start: formatDate(lastWeek),
    end: formatDate(today)
  }
}

const defaultDates = getLastWeekDates()

const filtros = ref({
  estado: 1,
  fecha_registro_inicial: defaultDates.start,
  fecha_registro_final: defaultDates.end,
  id_ruta: 'all',
  id_escolta: 'all'
})

const fechaRango = ref({
  start: defaultDates.start,
  end: defaultDates.end
})

watch(fechaRango, (newVal) => {
  filtros.value.fecha_registro_inicial = newVal.start
  filtros.value.fecha_registro_final = newVal.end
}, { deep: true })

const tieneFiltrosActivos = computed(() => {
  return (
    filtros.value.id_ruta !== 'all' ||
    filtros.value.id_escolta !== 'all' ||
    filtros.value.estado !== 1 ||
    fechaRango.value.start !== defaultDates.start ||
    fechaRango.value.end !== defaultDates.end
  )
})

const rutas = ref<Ruta[]>([])
const escoltas = ref<Escolta[]>([])

const estadoColors: Record<string, string> = {
  PRERCARGA: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  EN_ESPERA: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  EJECUCION_OK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  EJECUCION_FAIL: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  FINALIZADO: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
}

const riesgoColors: Record<string, string> = {
  ND: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10',
  BAJO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  MEDIO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  ALTO: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  CRITICO: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/30'
}

const fetchServicios = async () => {
  if (!selectedGroup.value?.id) {
    servicios.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const payload = {
      id_grupo: selectedGroup.value.id,
      id_servicio: 'all',
      estado: filtros.value.estado
    }
    const respuesta = await fetchServicioDashboardApi(payload)
    if (respuesta.done && respuesta.data?.servicios) {
      servicios.value = respuesta.data.servicios
    } else {
      servicios.value = []
    }
  } catch (error) {
    console.error('Error al cargar servicios:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchFiltrosData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const [rutasData, escoltasData, vehiculosData, hardwareData] = await Promise.all([
      fetchRutasApi(selectedGroup.value.id),
      fetchEscoltasApi(selectedGroup.value.id),
      fetchVehiculosSimplesApi(selectedGroup.value.id, 0),
      fetchHardwareSimplesApi(selectedGroup.value.id, 0)
    ])
    rutas.value = rutasData
    escoltas.value = escoltasData
    catalogoVehiculos.value = vehiculosData
    catalogoHardware.value = hardwareData
  } catch (error) {
    console.error('Error al cargar datos de filtros y catálogos:', error)
  }
}

const limpiarFiltros = () => {
  const dates = getLastWeekDates()
  fechaRango.value = { start: dates.start, end: dates.end }
  filtros.value = {
    estado: 1,
    fecha_registro_inicial: dates.start,
    fecha_registro_final: dates.end,
    id_ruta: 'all',
    id_escolta: 'all'
  }
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] || ''
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}${timePart ? ' ' + timePart.substring(0, 5) : ''}`
}

const filteredServicios = computed(() => {
  if (!searchQuery.value) return servicios.value
  const query = searchQuery.value.toLowerCase()
  return servicios.value.filter(s => {
    const idMatches = s.id_servicio?.toLowerCase().includes(query)
    const estadoLabel = obtenerLabelEstado(s.estado).toLowerCase()
    const estadoMatches = estadoLabel.includes(query)
    const modoFinLabel = obtenerLabelModoFin(s.modo_fin).toLowerCase()
    const modoFinMatches = modoFinLabel.includes(query)
    return idMatches || estadoMatches || modoFinMatches
  })
})

const exportToExcel = () => {
  const dataToExport = filteredServicios.value.map(s => ({
    'ID Servicio': s.id_servicio,
    'Fecha Inicio': formatDate(s.fecha_inicio),
    'Modo Fin': obtenerLabelModoFin(s.modo_fin),
    'Alcance': obtenerLabelAlcance(s.alcance),
    'Nivel Riesgo': obtenerLabelNivelRiesgo(s.nivel_riesgo),
    'Rutas': (s.rutas || []).map((rId: string) => obtenerNombreRuta(rId)).join(', '),
    'Escoltas': (s.escoltas || []).map((eId: string) => obtenerNombreEscolta(eId)).join(', '),
    'Estado': obtenerLabelEstado(s.estado)
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')
  XLSX.writeFile(workbook, 'Listado_Servicios.xlsx')
}

// Watcher de filtros para recargar automáticamente al cambiar cualquier parámetro
watch(filtros, () => {
  currentPage.value = 1
  fetchServicios()
}, { deep: true })

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    currentPage.value = 1
    await fetchFiltrosData()
    await fetchServicios()
  } else {
    servicios.value = []
  }
}, { immediate: true })

const handleDocumentClick = (e: MouseEvent) => {
  closeMenu()
  if (activeDropdown.value) {
    const refMap: Record<string, HTMLElement | null> = {
      ruta: rutaDropdownRef.value,
      escolta: escoltaDropdownRef.value,
      estado: estadoDropdownRef.value
    }
    const currentRef = refMap[activeDropdown.value]
    if (currentRef && !currentRef.contains(e.target as Node)) {
      activeDropdown.value = null
    }
  }
}

const handleScrollOrResize = () => {
  closeMenu()
  ocultarTooltip()
}

onMounted(() => {
  fetchFiltrosData()
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('servicios.title')" 
      :count="filteredServicios.length" 
      :icon="Calendar01Icon"
    />

    <!-- Toolbar: Buscador y Filtros (izquierda) + Botones (derecha) -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
      <div class="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-80">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('servicios.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all h-[38px]"
          />
          <div class="absolute left-3.5 top-3 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Rango de Fechas -->
        <div class="w-full sm:w-auto min-w-[240px] h-[38px] flex items-center date-picker-container">
          <AppDateRangePicker
            v-model="fechaRango"
            label=""
            placeholder="Rango de Fechas"
            class="w-full"
          />
        </div>

        <!-- Ruta Dropdown -->
        <div ref="rutaDropdownRef" class="relative w-full sm:w-auto min-w-[170px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('ruta')"
            class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtros.id_ruta !== 'all' ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="Route01Icon" :size="14" class="opacity-70" />
            <span class="truncate flex-1 text-left">{{ getRutaLabel() }}</span>
            <span v-if="filtros.id_ruta !== 'all'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200" :class="activeDropdown === 'ruta' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'ruta'"
              class="absolute left-0 z-50 mt-1.5 w-[260px] bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar"
            >
              <button
                @click="selectRuta('all')"
                class="w-full flex items-center px-4 py-2.5 text-left text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtros.id_ruta === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Todas las Rutas</span>
                <svg v-if="filtros.id_ruta === 'all'" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                v-for="ruta in rutas"
                :key="ruta.id_ruta"
                @click="selectRuta(ruta.id_ruta)"
                class="w-full flex items-center px-4 py-2.5 text-left text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5"
                :class="filtros.id_ruta === ruta.id_ruta ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span class="truncate">{{ ruta.nombre }}</span>
                <svg v-if="filtros.id_ruta === ruta.id_ruta" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Escolta Dropdown -->
        <div ref="escoltaDropdownRef" class="relative w-full sm:w-auto min-w-[170px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('escolta')"
            class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtros.id_escolta !== 'all' ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="User02Icon" :size="14" class="opacity-70" />
            <span class="truncate flex-1 text-left">{{ getEscoltaLabel() }}</span>
            <span v-if="filtros.id_escolta !== 'all'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200" :class="activeDropdown === 'escolta' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'escolta'"
              class="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar"
            >
              <button
                @click="selectEscolta('all')"
                class="w-full flex items-center px-4 py-2.5 text-left text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtros.id_escolta === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Todos los Escoltas</span>
                <svg v-if="filtros.id_escolta === 'all'" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                v-for="escolta in escoltas"
                :key="escolta.id_escolta"
                @click="selectEscolta(escolta.id_escolta)"
                class="w-full flex items-center px-4 py-2.5 text-left text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5"
                :class="filtros.id_escolta === escolta.id_escolta ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span class="truncate">{{ escolta.nombre }}</span>
                <svg v-if="filtros.id_escolta === escolta.id_escolta" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Estado Dropdown -->
        <div ref="estadoDropdownRef" class="relative w-full sm:w-auto min-w-[150px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('estado')"
            class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtros.estado !== 1 ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="Edit01Icon" :size="14" class="opacity-70" />
            <span class="truncate flex-1 text-left">{{ getEstadoLabel() }}</span>
            <span v-if="filtros.estado !== 1" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200" :class="activeDropdown === 'estado' ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'estado'"
              class="absolute left-0 right-0 z-50 mt-1.5 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[220px] overflow-y-auto custom-scrollbar"
            >
              <button
                v-for="opt in estadoOptions"
                :key="opt.value"
                @click="selectEstado(opt.value)"
                class="w-full flex items-center px-4 py-2.5 text-left text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5 first:border-t-0"
                :class="filtros.estado === opt.value ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>{{ opt.label }}</span>
                <svg v-if="filtros.estado === opt.value" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Botón de Limpiar Filtros Estilo Premium Glass-Rose -->
        <button
          v-if="tieneFiltrosActivos"
          @click="limpiarFiltros"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-red-600 dark:text-red-400 border border-red-200/20 dark:border-rose-500/10 active:scale-95 transition-all text-xs font-bold h-[38px] cursor-pointer shadow-sm shadow-red-500/5 select-none animate-fade-in shrink-0"
        >
          <HugeiconsIcon :icon="Cancel01Icon" :size="14" :stroke-width="2.5" />
          <span>Limpiar</span>
        </button>
      </div>

      <!-- Derecha: Botones Exportar y Nuevo Servicio -->
      <div class="flex items-center gap-3 w-full xl:w-auto justify-start xl:justify-end shrink-0">
        <button 
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all h-[38px]"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>

        <button 
          @click="openModal('create')"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10 h-[38px]"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('servicios.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <AppTableCard>
      <AppTable
        :value="filteredServicios"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('servicios.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="fecha_inicio" :header="t('servicios.thDateStart', 'Fecha Inicio')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="Calendar01Icon" :size="14" class="text-slate-400 dark:text-slate-500 shrink-0" />
              <span class="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                {{ formatDate(data.fecha_inicio) }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="modo_fin" :header="t('servicios.thEndMode', 'Modo Fin')" sortable>
          <template #body="{ data }">
            <span class="text-[12px] text-slate-600 dark:text-slate-300 font-medium">
              {{ obtenerLabelModoFin(data.modo_fin) }}
            </span>
          </template>
        </Column>

        <Column field="alcance" :header="t('servicios.thScope', 'Alcance')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
               :class="obtenerLabelAlcance(data.alcance) === 'ND'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'">
              {{ obtenerLabelAlcance(data.alcance) }}
            </span>
          </template>
        </Column>

        <Column field="nivel_riesgo" :header="t('servicios.thRiskLevel', 'Nivel Riesgo')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="riesgoColors[obtenerLabelNivelRiesgo(data.nivel_riesgo).toUpperCase()] || riesgoColors.ND">
              {{ obtenerLabelNivelRiesgo(data.nivel_riesgo) }}
            </span>
          </template>
        </Column>

        <!-- Columna Única de Asignaciones Consolidada -->
        <Column :header="'Asignaciones'">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <!-- Botón Rutas -->
              <button
                class="w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-help"
                :class="[
                  (data.rutas || []).length > 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-500 dark:text-blue-400'
                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-100/60 dark:border-white/[0.03] text-slate-350 dark:text-slate-600'
                ]"
                @mouseenter="mostrarTooltip($event, data, 'rutas')"
                @mouseleave="ocultarTooltip"
              >
                <HugeiconsIcon :icon="Route01Icon" :size="13" :stroke-width="2.5" />
              </button>

              <!-- Botón Vehículos -->
              <button
                class="w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-help"
                :class="[
                  Object.keys(data.vehiculos || {}).length > 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-500 dark:text-blue-400'
                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-100/60 dark:border-white/[0.03] text-slate-350 dark:text-slate-600'
                ]"
                @mouseenter="mostrarTooltip($event, data, 'vehiculos')"
                @mouseleave="ocultarTooltip"
              >
                <HugeiconsIcon :icon="Car01Icon" :size="13" :stroke-width="2.5" />
              </button>

              <!-- Botón Escoltas -->
              <button
                class="w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-150 cursor-help"
                :class="[
                  (data.escoltas || []).length > 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20 text-blue-500 dark:text-blue-400'
                    : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-100/60 dark:border-white/[0.03] text-slate-350 dark:text-slate-600'
                ]"
                @mouseenter="mostrarTooltip($event, data, 'escoltas')"
                @mouseleave="ocultarTooltip"
              >
                <HugeiconsIcon :icon="User02Icon" :size="13" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </Column>

        <Column field="estado" :header="t('servicios.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0"
                :class="{
                  'bg-blue-500': obtenerLabelEstado(data.estado) === 'PRERCARGA',
                  'bg-amber-500': obtenerLabelEstado(data.estado) === 'EN_ESPERA',
                  'bg-emerald-500': obtenerLabelEstado(data.estado) === 'EJECUCION_OK',
                  'bg-red-500': obtenerLabelEstado(data.estado) === 'EJECUCION_FAIL',
                  'bg-slate-400': obtenerLabelEstado(data.estado) === 'FINALIZADO',
                  'bg-slate-350': obtenerLabelEstado(data.estado) === 'CANCELADO'
                }"></span>
              <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                :class="estadoColors[obtenerLabelEstado(data.estado)] || estadoColors.PRERCARGA">
                {{ obtenerLabelEstado(data.estado) }}
              </span>
            </div>
          </template>
        </Column>

        <Column :header="t('servicios.thActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data, $event)"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <Teleport to="body">
        <!-- Tooltip Global Consolidado -->
        <Transition name="tooltip-fade">
          <div
            v-if="tooltipVisible && tooltipData"
            class="fixed z-[99999] pointer-events-none"
            :style="{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateY(-100%)' }"
          >
            <div 
              class="bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl text-slate-700 dark:text-slate-300 text-[12px] rounded-[18px] border border-slate-200/80 dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-medium overflow-hidden mb-2"
              :class="tooltipTipo === 'vehiculos' ? 'w-[240px]' : 'w-[220px]'"
            >
              <div class="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                <HugeiconsIcon :icon="tooltipIcon" :size="12" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <span class="text-[10px] font-black uppercase tracking-wider text-[#3b82f6] dark:text-[#5da6fc]">
                  {{ tooltipTitulo }}
                </span>
              </div>
              <div class="max-h-[220px] overflow-y-auto custom-scrollbar p-2.5">
                <!-- Rutas -->
                <div v-if="tooltipTipo === 'rutas'" class="space-y-1">
                  <template v-if="(tooltipData.rutas || []).length > 0">
                    <div v-for="rId in tooltipData.rutas" :key="rId" class="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-white/5 last:border-0">
                      <div class="w-1 h-1 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] shrink-0"></div>
                      <span class="truncate text-slate-700 dark:text-slate-300 text-[11px] font-medium">{{ obtenerNombreRuta(rId) }}</span>
                    </div>
                  </template>
                  <div v-else class="py-1 text-slate-400 dark:text-slate-500 italic text-[11px] text-center">Sin ruta asignada</div>
                </div>

                <!-- Vehículos -->
                <div v-else-if="tooltipTipo === 'vehiculos'" class="space-y-2">
                  <template v-if="Object.keys(tooltipData.vehiculos || {}).length > 0">
                    <div v-for="(hwIds, vId) in tooltipData.vehiculos" :key="vId" class="py-1 border-b border-slate-100 dark:border-white/5 last:border-0">
                      <div class="text-[11px] font-bold text-[#3b82f6] dark:text-[#5da6fc] truncate mb-0.5">
                        {{ obtenerNombreVehiculo(String(vId)) }}
                      </div>
                      <div class="pl-2.5 space-y-0.5">
                        <template v-if="(hwIds as string[]).length > 0">
                          <div v-for="hwId in (hwIds as string[])" :key="hwId" class="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <span class="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                            <span class="truncate font-medium">{{ obtenerNombreHardware(hwId) }}</span>
                          </div>
                        </template>
                        <div v-else class="text-[10px] text-slate-400 dark:text-slate-500 italic">Sin hardware asignado</div>
                      </div>
                    </div>
                  </template>
                  <div v-else class="py-1 text-slate-400 dark:text-slate-500 italic text-[11px] text-center">Sin vehículos asignados</div>
                </div>

                <!-- Escoltas -->
                <div v-else-if="tooltipTipo === 'escoltas'" class="space-y-1">
                  <template v-if="(tooltipData.escoltas || []).length > 0">
                    <div v-for="eId in tooltipData.escoltas" :key="eId" class="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-white/5 last:border-0">
                      <div class="w-1 h-1 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] shrink-0"></div>
                      <span class="truncate text-slate-700 dark:text-slate-300 text-[11px] font-medium">{{ obtenerNombreEscolta(eId) }}<span v-if="obtenerCelularEscolta(eId)" class="text-slate-400 dark:text-slate-500 font-normal ml-1">({{ obtenerCelularEscolta(eId) }})</span></span>
                    </div>
                  </template>
                  <div v-else class="py-1 text-slate-400 dark:text-slate-500 italic text-[11px] text-center">Sin escoltas asignados</div>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Menú de Acciones -->
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              @click="openModal('assign', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="CpuIcon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('servicios.btnAssign', 'Asignar Recursos') }}</span>
            </button>
            <button
              @click="openModal('route', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Route01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Cambiar Ruta</span>
            </button>
            <button
              @click="openModal('escort', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="User02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Actualizar Escolta</span>
            </button>
            <button
              @click="openModal('vehicles', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Car01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Actualizar Vehículos</span>
            </button>
            <button
              @click="openModal('history', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Clock01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Ver Historial</span>
            </button>
            <button
              @click="openModal('status', activeMenuServicio)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Cambiar Estado</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- Paginador -->
      <AppPagination
        :totalRecords="filteredServicios.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <ServicioCreateModal
      v-model:is-open="isCreateModalOpen"
      @created="fetchServicios"
    />

    <ServicioAsignarRecursosModal
      v-model:is-open="isAsignarModalOpen"
      :servicio="selectedServicio"
      @assigned="fetchServicios"
    />

    <ServicioCambiarRutaModal
      v-model:is-open="isCambiarRutaModalOpen"
      :servicio="selectedServicio"
      :rutas="rutas"
      @assigned="fetchServicios"
    />

    <ServicioActualizarEscoltaModal
      v-model:is-open="isActualizarEscoltaModalOpen"
      :servicio="selectedServicio"
      :escoltas="escoltas"
      @updated="fetchServicios"
    />

    <ServicioActualizarVehiculosModal
      v-model:is-open="isActualizarVehiculosModalOpen"
      :servicio="selectedServicio"
      :vehiculos="catalogoVehiculos"
      :hardware="catalogoHardware"
      @updated="fetchServicios"
    />

    <ServicioVerHistorialModal
      v-model:is-open="isVerHistorialModalOpen"
      :servicio="selectedServicio"
    />

    <ServicioCambiarEstadoModal
      v-model:is-open="isCambiarEstadoModalOpen"
      :servicio="selectedServicio"
      @updated="fetchServicios"
    />
  </div>
</template>

<style scoped>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 2.5rem;
}

:global(.dark) select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}

.tooltip-fade-enter-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.tooltip-fade-leave-active {
  transition: opacity 0.1s ease;
}
.tooltip-fade-enter-from {
  opacity: 0;
  transform: translateY(calc(-100% + 6px));
}
.tooltip-fade-leave-to {
  opacity: 0;
}

.dropdown-menu-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-menu-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-menu-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.custom-dropdown-enter-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.custom-dropdown-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 1, 1);
}
.custom-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
.custom-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.98);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

/* Forzar la alineación y altura del date picker button al mismo tamaño de la barra de filtros */
.date-picker-container :deep(button) {
  height: 38px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 0.75rem !important; /* text-xs */
  background-color: transparent !important;
  border-color: rgba(226, 232, 240, 0.7) !important; /* border-slate-200/70 en claro */
}
:global(.dark) .date-picker-container :deep(button) {
  background-color: rgba(19, 22, 28, 0.7) !important;
  border-color: rgba(255, 255, 255, 0.08) !important; /* border-white/[0.08] en oscuro */
}
</style>