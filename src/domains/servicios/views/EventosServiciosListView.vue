<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Calendar01Icon,
  Search01Icon,
  RefreshIcon,
  Clock01Icon,
  User02Icon,
  MapsIcon,
  EyeIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Download01Icon,
  FilterIcon,
  InformationCircleIcon,
  Add01Icon,
  ServiceIcon,
  Route01Icon,
  Car01Icon,
  CpuIcon,
  Edit01Icon,
  UserAdd01Icon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'
import { fetchServicioEventosApi, fetchServiciosDropdownApi } from '../services/servicios.api'
import type { ServicioEventoItem, Servicio } from '../types/servicio'
import { SERVICIO_ESTADOS_LABELS } from '../types/servicio'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'
import ServicioEventoCreateModal from '../components/ServicioEventoCreateModal.vue'
import * as XLSX from 'xlsx'

const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const eventos = ref<ServicioEventoItem[]>([])
const catalogoServicios = ref<Servicio[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedEventoModal = ref<ServicioEventoItem | null>(null)
const isDetailModalOpen = ref(false)
const isCreateModalOpen = ref(false)

// Dropdowns de la barra de filtros
const activeDropdown = ref<'servicio' | 'tipo' | 'visibilidad' | null>(null)
const servicioDropdownRef = ref<HTMLElement | null>(null)
const tipoDropdownRef = ref<HTMLElement | null>(null)
const visibilidadDropdownRef = ref<HTMLElement | null>(null)
const searchServicioFilter = ref('')

// Filtros específicos
const filtroIdServicio = ref<string>('all')
const filtroTipoEvento = ref<number | 'all'>('all')
const filtroVisibilidad = ref<'all' | 'visible' | 'hidden'>('all')
const filtroAutor = ref<string>('')

// Helper de fechas por defecto (últimos 30 días hasta hoy)
const getDefaultDates = () => {
  const today = new Date()
  const pastDate = new Date(today)
  pastDate.setDate(today.getDate() - 30)

  const formatDate = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    start: formatDate(pastDate),
    end: formatDate(today)
  }
}

const defaultDates = getDefaultDates()

const fechaRango = ref({
  start: defaultDates.start,
  end: defaultDates.end
})

const currentPage = ref(1)
const itemsPerPage = ref(10)

const eventTypeConfigs = [
  { value: 1, label: '1 - Registro', fullName: 'Registro de Servicio', icon: Calendar01Icon, badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { value: 2, label: '2 - Asignación Recursos', fullName: 'Asignación de Recursos', icon: ServiceIcon, badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { value: 3, label: '3 - Cambio Ruta', fullName: 'Cambio de Ruta', icon: Route01Icon, badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { value: 4, label: '4 - Cambio Hardware', fullName: 'Cambio de Hardware', icon: CpuIcon, badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { value: 5, label: '5 - Cambio Vehículo', fullName: 'Cambio de Vehículo', icon: Car01Icon, badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  { value: 6, label: '6 - Cambio Escolta', fullName: 'Cambio de Escolta', icon: User02Icon, badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { value: 7, label: '7 - Agregar Escolta', fullName: 'Agregar Escolta', icon: UserAdd01Icon, badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  { value: 8, label: '8 - Cambio Estado', fullName: 'Cambio de Estado', icon: Edit01Icon, badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
]

const toggleDropdown = (type: 'servicio' | 'tipo' | 'visibilidad') => {
  activeDropdown.value = activeDropdown.value === type ? null : type
}

const formatDateForPayload = (dateStr: string, isEnd: boolean = false): string => {
  if (!dateStr) return ''
  const time = isEnd ? '23:59:59' : '00:00:01'
  return `${dateStr} ${time}`
}

const cargarServiciosCatalogo = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const list = await fetchServiciosDropdownApi(selectedGroup.value.id)
    catalogoServicios.value = list
  } catch (error) {
    console.error('Error al cargar catálogo de servicios:', error)
  }
}

const cargarEventos = async () => {
  if (!selectedGroup.value?.id) {
    eventos.value = []
    return
  }

  isLoading.value = true
  try {
    const payload = {
      id_grupo: selectedGroup.value.id,
      desde: formatDateForPayload(fechaRango.value.start, false),
      hasta: formatDateForPayload(fechaRango.value.end, true),
      id_servicio: filtroIdServicio.value === 'all' ? '' : filtroIdServicio.value.trim(),
      autor: filtroAutor.value.trim()
    }

    const res = await fetchServicioEventosApi(payload)
    if (res.done && Array.isArray(res.data)) {
      eventos.value = res.data
    } else {
      eventos.value = []
    }
  } catch (error) {
    console.error('Error al cargar eventos de servicio:', error)
    eventos.value = []
  } finally {
    isLoading.value = false
  }
}

const recargar = () => {
  cargarEventos()
  cargarServiciosCatalogo()
}

const selectServicioFiltro = (id: string) => {
  filtroIdServicio.value = id
  activeDropdown.value = null
  searchServicioFilter.value = ''
  currentPage.value = 1
  cargarEventos()
}

const selectTipoFiltro = (tipo: number | 'all') => {
  filtroTipoEvento.value = tipo
  activeDropdown.value = null
  currentPage.value = 1
}

const selectVisibilidadFiltro = (vis: 'all' | 'visible' | 'hidden') => {
  filtroVisibilidad.value = vis
  activeDropdown.value = null
  currentPage.value = 1
}

const limpiarFiltros = () => {
  const dates = getDefaultDates()
  fechaRango.value = { start: dates.start, end: dates.end }
  filtroIdServicio.value = 'all'
  filtroAutor.value = ''
  filtroTipoEvento.value = 'all'
  filtroVisibilidad.value = 'all'
  searchQuery.value = ''
  searchServicioFilter.value = ''
  activeDropdown.value = null
  currentPage.value = 1
  cargarEventos()
}

const tieneFiltrosActivos = computed(() => {
  return (
    filtroIdServicio.value !== 'all' ||
    filtroAutor.value.trim() !== '' ||
    filtroTipoEvento.value !== 'all' ||
    filtroVisibilidad.value !== 'all' ||
    searchQuery.value.trim() !== '' ||
    fechaRango.value.start !== defaultDates.start ||
    fechaRango.value.end !== defaultDates.end
  )
})

const getEstadoLabel = (estado: any): string => {
  if (typeof estado === 'number') {
    return SERVICIO_ESTADOS_LABELS[estado] || String(estado)
  }
  if (typeof estado === 'string') {
    const num = Number(estado)
    if (!isNaN(num) && SERVICIO_ESTADOS_LABELS[num]) {
      return SERVICIO_ESTADOS_LABELS[num]
    }
    return estado
  }
  return ''
}

const getEstadoBadgeClass = (estado: any): string => {
  const lbl = getEstadoLabel(estado).toUpperCase().replace(/\s+/g, '_')
  if (lbl.includes('PRERCARGA') || lbl === '1') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  if (lbl.includes('ESPERA') || lbl === '2') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  if (lbl.includes('OK') || lbl.includes('EJECUCION_OK') || lbl === '3') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (lbl.includes('FAIL') || lbl === '4') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  if (lbl.includes('FINALIZADO') || lbl === '5') return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  if (lbl.includes('CANCELADO') || lbl === '6') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return ''
  const parts = dateStr.split(' ')
  const dPart = parts[0]
  const tPart = parts[1] || ''
  if (!dPart) return dateStr
  const [y, m, d] = dPart.split('-')
  return `${d}/${m}/${y}${tPart ? ' ' + tPart.substring(0, 5) : ''}`
}

interface ServicioDropdownOption {
  id: string
  estado?: string
  fecha?: string
  ruta?: string
}

// Lista combinada de IDs de servicios para el dropdown
const serviciosDropdownList = computed<ServicioDropdownOption[]>(() => {
  const map = new Map<string, ServicioDropdownOption>()
  
  catalogoServicios.value.forEach(s => {
    if (s.id_servicio) {
      map.set(s.id_servicio, {
        id: s.id_servicio,
        estado: s.estado,
        fecha: s.fecha_inicio,
        ruta: s.id_ruta
      })
    }
  })

  // Agregar IDs que vengan en los eventos si no estaban en el catálogo
  eventos.value.forEach(e => {
    if (e.id_servicio && !map.has(e.id_servicio)) {
      map.set(e.id_servicio, {
        id: e.id_servicio,
        fecha: e.fecha_hora
      })
    }
  })

  const list = Array.from(map.values())
  if (!searchServicioFilter.value.trim()) return list
  const q = searchServicioFilter.value.toLowerCase().trim()
  return list.filter(item =>
    item.id.toLowerCase().includes(q) ||
    (item.ruta && item.ruta.toLowerCase().includes(q)) ||
    (item.estado && getEstadoLabel(item.estado).toLowerCase().includes(q))
  )
})

const getServicioLabel = (): string => {
  if (filtroIdServicio.value === 'all') return 'Servicio'
  return `Servicio: ${filtroIdServicio.value}`
}

const getTipoEventoLabel = (): string => {
  if (filtroTipoEvento.value === 'all') return 'Tipo de Evento'
  const cfg = eventTypeConfigs.find(c => c.value === filtroTipoEvento.value)
  return cfg ? cfg.label : `Tipo ${filtroTipoEvento.value}`
}

const getVisibilidadLabel = (): string => {
  if (filtroVisibilidad.value === 'all') return 'Visibilidad'
  if (filtroVisibilidad.value === 'visible') return 'Solo Visibles'
  return 'Solo Ocultos'
}

const getEventoTipoBadge = (item: ServicioEventoItem) => {
  const cfg = eventTypeConfigs.find(c => c.value === item.evento_tipo)
  if (cfg) {
    return {
      label: item.evento_tipo_nombre || cfg.fullName,
      icon: cfg.icon,
      badgeClass: cfg.badgeClass
    }
  }
  return {
    label: item.evento_tipo_nombre || `Tipo ${item.evento_tipo || '---'}`,
    icon: Calendar01Icon,
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
}

// Filtrado del lado del cliente para búsqueda y filtros rápidos
const filteredItems = computed(() => {
  return eventos.value.filter((item) => {
    // Filtro por tipo de evento
    if (filtroTipoEvento.value !== 'all' && item.evento_tipo !== filtroTipoEvento.value) {
      return false
    }

    // Filtro por visibilidad
    if (filtroVisibilidad.value === 'visible' && !item.visible) return false
    if (filtroVisibilidad.value === 'hidden' && item.visible) return false

    // Búsqueda general
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      const matchIdEvento = item.id_evento?.toLowerCase().includes(query)
      const matchIdServicio = item.id_servicio?.toLowerCase().includes(query)
      const matchTipo = item.evento_tipo_nombre?.toLowerCase().includes(query)
      const matchObservacion = item.observacion?.toLowerCase().includes(query)
      const matchAutor = item.autor?.toLowerCase().includes(query)
      const matchFecha = item.fecha_hora?.toLowerCase().includes(query)

      if (!matchIdEvento && !matchIdServicio && !matchTipo && !matchObservacion && !matchAutor && !matchFecha) {
        return false
      }
    }

    return true
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredItems.value.slice(start, start + itemsPerPage.value)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] || ''
  if (!datePart) return dateStr
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}${timePart ? ' ' + timePart : ''}`
}

const hasValidCoordinates = (lat: string, lng: string) => {
  if (!lat || !lng) return false
  const numLat = parseFloat(lat)
  const numLng = parseFloat(lng)
  return !isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0)
}

const openMap = (lat: string, lng: string) => {
  if (!hasValidCoordinates(lat, lng)) return
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
}

const openDetailModal = (item: ServicioEventoItem) => {
  selectedEventoModal.value = item
  isDetailModalOpen.value = true
}

const exportToExcel = () => {
  if (!filteredItems.value.length) return

  const rows = filteredItems.value.map(item => ({
    'ID Evento': item.id_evento,
    'ID Servicio': item.id_servicio,
    'Tipo Evento': item.evento_tipo_nombre || item.evento_tipo,
    'Fecha y Hora': item.fecha_hora,
    'Autor': item.autor,
    'Visible': item.visible ? 'Sí' : 'No',
    'Observación': item.observacion,
    'Latitud': item.latitud,
    'Longitud': item.longitud
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Eventos_Servicios')
  XLSX.writeFile(workbook, `Eventos_Servicios_${fechaRango.value.start}_${fechaRango.value.end}.xlsx`)
}

const handleDocumentClick = (e: MouseEvent) => {
  if (activeDropdown.value) {
    const refMap: Record<string, HTMLElement | null> = {
      servicio: servicioDropdownRef.value,
      tipo: tipoDropdownRef.value,
      visibilidad: visibilidadDropdownRef.value
    }
    const currentRef = refMap[activeDropdown.value]
    if (currentRef && !currentRef.contains(e.target as Node)) {
      activeDropdown.value = null
    }
  }
}

watch(
  [selectedGroup, fechaRango],
  () => {
    currentPage.value = 1
    cargarEventos()
    cargarServiciosCatalogo()
  },
  { deep: true, immediate: true }
)

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <PageHeader
      title="Eventos de Servicios"
      subtitle="Consulta y seguimiento de eventos registrados en los servicios"
      :count="filteredItems.length"
      :icon="Calendar01Icon"
    >
      <template #actions>
        <AppButton
          variant="primary"
          size="sm"
          :icon="Add01Icon"
          @click="isCreateModalOpen = true"
        >
          Nuevo Evento
        </AppButton>
        <AppButton
          v-if="filteredItems.length > 0"
          variant="secondary"
          size="sm"
          :icon="Download01Icon"
          @click="exportToExcel"
        >
          Exportar Excel
        </AppButton>
      </template>
    </PageHeader>

    <!-- Toolbar y Filtros -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
      <div class="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
        <!-- Buscador + Botón Recarga Integrados -->
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <div class="relative w-full sm:w-60">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar en eventos..."
              class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all h-[38px]"
            />
            <div class="absolute left-3 top-2.5 text-slate-400 pointer-events-none transition-colors">
              <HugeiconsIcon :icon="Search01Icon" :size="15" />
            </div>
          </div>

          <!-- Botón Recargar -->
          <button
            @click="recargar"
            :disabled="isLoading"
            title="Recargar"
            class="p-2 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[38px] w-[38px] flex items-center justify-center cursor-pointer"
          >
            <HugeiconsIcon
              :icon="RefreshIcon"
              :size="16"
              :class="{ 'animate-spin': isLoading }"
            />
          </button>
        </div>

        <!-- Rango de Fechas -->
        <div class="w-full sm:w-auto min-w-[210px] h-[38px] flex items-center date-picker-container">
          <AppDateRangePicker
            v-model="fechaRango"
            label=""
            placeholder="Rango de Fechas"
            class="w-full"
          />
        </div>

        <!-- Desplegable Servicio -->
        <div ref="servicioDropdownRef" class="relative w-full sm:w-auto min-w-[170px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('servicio')"
            class="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtroIdServicio !== 'all' ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="ServiceIcon" :size="14" class="opacity-70 shrink-0" />
            <span class="truncate flex-1 text-left font-mono">{{ getServicioLabel() }}</span>
            <span v-if="filtroIdServicio !== 'all'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg
              class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200"
              :class="activeDropdown === 'servicio' ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Menú Dropdown Servicio -->
          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'servicio'"
              class="absolute left-0 z-50 mt-1.5 w-[280px] bg-white dark:bg-[#1A1D24] border border-slate-200/70 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <!-- Buscador dentro del dropdown -->
              <div class="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div class="relative">
                  <input
                    v-model="searchServicioFilter"
                    type="text"
                    placeholder="Buscar servicio..."
                    class="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#13161C] border border-slate-200/60 dark:border-white/10 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50"
                  />
                  <div class="absolute left-2.5 top-2 text-slate-400 pointer-events-none">
                    <HugeiconsIcon :icon="Search01Icon" :size="13" />
                  </div>
                </div>
              </div>

              <div class="max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
                <!-- Opción Todos -->
                <button
                  @click="selectServicioFiltro('all')"
                  class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  :class="filtroIdServicio === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
                >
                  <span>Todos los Servicios</span>
                  <svg v-if="filtroIdServicio === 'all'" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>

                <!-- Lista de servicios -->
                <button
                  v-for="s in serviciosDropdownList"
                  :key="s.id"
                  @click="selectServicioFiltro(s.id)"
                  class="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  :class="filtroIdServicio === s.id ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
                >
                  <div class="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                    <!-- Fila superior: ID y Estado Badge -->
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono font-bold text-slate-800 dark:text-white text-xs">
                        {{ s.id }}
                      </span>
                      <span
                        v-if="s.estado"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wider"
                        :class="getEstadoBadgeClass(s.estado)"
                      >
                        {{ getEstadoLabel(s.estado) }}
                      </span>
                    </div>

                    <!-- Fila inferior: Fecha y Ruta -->
                    <div class="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      <span v-if="s.fecha" class="flex items-center gap-1 font-mono">
                        <HugeiconsIcon :icon="Clock01Icon" :size="12" class="text-slate-400" />
                        {{ formatDateShort(s.fecha) }}
                      </span>
                      <span v-if="s.ruta" class="truncate">
                        • Ruta: {{ s.ruta }}
                      </span>
                    </div>
                  </div>

                  <svg v-if="filtroIdServicio === s.id" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Desplegable Tipo de Evento -->
        <div ref="tipoDropdownRef" class="relative w-full sm:w-auto min-w-[170px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('tipo')"
            class="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtroTipoEvento !== 'all' ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="FilterIcon" :size="14" class="opacity-70 shrink-0" />
            <span class="truncate flex-1 text-left">{{ getTipoEventoLabel() }}</span>
            <span v-if="filtroTipoEvento !== 'all'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg
              class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200"
              :class="activeDropdown === 'tipo' ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Menú Dropdown Tipo Evento -->
          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'tipo'"
              class="absolute left-0 z-50 mt-1.5 w-[260px] bg-white dark:bg-[#1A1D24] border border-slate-200/70 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[260px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5"
            >
              <!-- Todos los Tipos -->
              <button
                @click="selectTipoFiltro('all')"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtroTipoEvento === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Todos los Tipos</span>
                <svg v-if="filtroTipoEvento === 'all'" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>

              <!-- Opciones 1 a 8 -->
              <button
                v-for="op in eventTypeConfigs"
                :key="op.value"
                @click="selectTipoFiltro(op.value)"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtroTipoEvento === op.value ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <div class="flex items-center gap-2">
                  <HugeiconsIcon :icon="op.icon" :size="13" class="opacity-80" />
                  <span class="truncate">{{ op.label }}</span>
                </div>
                <svg v-if="filtroTipoEvento === op.value" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Desplegable Visibilidad -->
        <div ref="visibilidadDropdownRef" class="relative w-full sm:w-auto min-w-[140px] flex-1 sm:flex-initial">
          <button
            @click.stop="toggleDropdown('visibilidad')"
            class="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all h-[38px] cursor-pointer select-none"
            :class="filtroVisibilidad !== 'all' ? 'border-[#3b82f6]/50 dark:border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5' : ''"
          >
            <HugeiconsIcon :icon="EyeIcon" :size="14" class="opacity-70 shrink-0" />
            <span class="truncate flex-1 text-left">{{ getVisibilidadLabel() }}</span>
            <span v-if="filtroVisibilidad !== 'all'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-pulse shrink-0"></span>
            <svg
              class="w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200"
              :class="activeDropdown === 'visibilidad' ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Menú Dropdown Visibilidad -->
          <Transition name="custom-dropdown">
            <div
              v-if="activeDropdown === 'visibilidad'"
              class="absolute left-0 z-50 mt-1.5 w-[180px] bg-white dark:bg-[#1A1D24] border border-slate-200/70 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden divide-y divide-slate-100 dark:divide-white/5"
            >
              <button
                @click="selectVisibilidadFiltro('all')"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtroVisibilidad === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Toda Visibilidad</span>
                <svg v-if="filtroVisibilidad === 'all'" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                @click="selectVisibilidadFiltro('visible')"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtroVisibilidad === 'visible' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Solo Visibles</span>
                <svg v-if="filtroVisibilidad === 'visible'" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                @click="selectVisibilidadFiltro('hidden')"
                class="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                :class="filtroVisibilidad === 'hidden' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
              >
                <span>Solo Ocultos</span>
                <svg v-if="filtroVisibilidad === 'hidden'" class="w-4 h-4 text-[#3b82f6] dark:text-[#5da6fc] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Filtro por Autor -->
        <div class="relative w-full sm:w-36">
          <input
            v-model="filtroAutor"
            type="text"
            placeholder="Autor..."
            @keyup.enter="cargarEventos"
            class="w-full px-3 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all h-[38px]"
          />
        </div>

        <!-- Botón Limpiar Filtros -->
        <button
          v-if="tieneFiltrosActivos"
          @click="limpiarFiltros"
          title="Limpiar filtros"
          class="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5 h-[38px] shrink-0 active:scale-95"
        >
          <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          <span>Limpiar</span>
        </button>
      </div>
    </div>

    <!-- Tabla de Eventos -->
    <AppTableCard>
      <AppTable
        :value="paginatedItems"
        :loading="isLoading"
        :rows="itemsPerPage"
        removableSort
        empty-message="No se encontraron eventos para los filtros seleccionados"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna ID Evento -->
        <Column field="id_evento" header="ID Evento" sortable headerStyle="width: 130px">
          <template #body="{ data }">
            <span class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-2.5 py-1 rounded-lg select-all">
              {{ data.id_evento }}
            </span>
          </template>
        </Column>

        <!-- Columna ID Servicio -->
        <Column field="id_servicio" header="ID Servicio" sortable headerStyle="width: 140px">
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="font-mono font-bold text-[11px]">
                {{ data.id_servicio }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Fecha y Hora -->
        <Column field="fecha_hora" header="Fecha / Hora" sortable headerStyle="width: 190px">
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <HugeiconsIcon :icon="Clock01Icon" :size="14" class="text-slate-400" />
              <span>{{ formatDate(data.fecha_hora) }}</span>
            </div>
          </template>
        </Column>

        <!-- Columna Tipo de Evento -->
        <Column field="evento_tipo" header="Tipo de Evento" sortable headerStyle="width: 190px">
          <template #body="{ data }">
            <div class="flex items-center gap-1.5">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide border"
                :class="getEventoTipoBadge(data).badgeClass"
              >
                <HugeiconsIcon :icon="getEventoTipoBadge(data).icon" :size="13" />
                <span>{{ getEventoTipoBadge(data).label }}</span>
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna Observación -->
        <Column field="observacion" header="Observación">
          <template #body="{ data }">
            <div class="flex items-center justify-between gap-2 max-w-lg">
              <span class="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed" :title="data.observacion">
                {{ data.observacion || '---' }}
              </span>
              <button
                v-if="data.observacion"
                @click="openDetailModal(data)"
                title="Ver detalle completo"
                class="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs shrink-0 cursor-pointer p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <HugeiconsIcon :icon="InformationCircleIcon" :size="16" />
              </button>
            </div>
          </template>
        </Column>

        <!-- Columna Ubicación -->
        <Column header="Ubicación" headerStyle="width: 140px">
          <template #body="{ data }">
            <div v-if="hasValidCoordinates(data.latitud, data.longitud)">
              <button
                @click="openMap(data.latitud, data.longitud)"
                title="Ver ubicación en Google Maps"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/60 dark:border-white/10 text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                <HugeiconsIcon :icon="MapsIcon" :size="13" class="text-blue-500" />
                <span class="font-mono text-[11px]">Ver mapa</span>
              </button>
            </div>
            <span v-else class="text-slate-400 dark:text-slate-600 text-xs font-mono">
              ---
            </span>
          </template>
        </Column>

        <!-- Columna Visibilidad -->
        <Column field="visible" header="Visible" sortable headerStyle="width: 110px">
          <template #body="{ data }">
            <AppBadge :variant="data.visible ? 'success' : 'glass'" :dot="true">
              <span class="text-[11px] font-bold">
                {{ data.visible ? 'Visible' : 'Oculto' }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Autor -->
        <Column field="autor" header="Autor" sortable headerStyle="width: 160px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <HugeiconsIcon :icon="User02Icon" :size="13" />
              </div>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {{ data.autor || '---' }}
              </span>
            </div>
          </template>
        </Column>
      </AppTable>

      <!-- Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredItems.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Modal Detalle del Evento -->
    <AppModal
      v-model:isOpen="isDetailModalOpen"
      title="Detalle del Evento"
      maxWidth="max-w-xl"
    >
      <div v-if="selectedEventoModal" class="space-y-5">
        <div class="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs">
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">ID Evento</span>
            <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ selectedEventoModal.id_evento }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">ID Servicio</span>
            <span class="font-mono font-bold text-blue-600 dark:text-blue-400">{{ selectedEventoModal.id_servicio }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">Tipo de Evento</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">
              {{ getEventoTipoBadge(selectedEventoModal).label }}
            </span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">Fecha y Hora</span>
            <span class="font-mono text-slate-800 dark:text-slate-200">{{ formatDate(selectedEventoModal.fecha_hora) }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">Autor</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200">{{ selectedEventoModal.autor || '---' }}</span>
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5 text-[11px] font-medium">Visibilidad</span>
            <AppBadge :variant="selectedEventoModal.visible ? 'success' : 'glass'" :dot="true">
              {{ selectedEventoModal.visible ? 'Visible' : 'Oculto' }}
            </AppBadge>
          </div>
        </div>

        <div>
          <label class="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Observación</label>
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
            {{ selectedEventoModal.observacion || 'Sin observación registrada' }}
          </div>
        </div>

        <div v-if="hasValidCoordinates(selectedEventoModal.latitud, selectedEventoModal.longitud)" class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
          <span class="text-xs font-mono text-slate-500">
            Coords: {{ selectedEventoModal.latitud }}, {{ selectedEventoModal.longitud }}
          </span>
          <AppButton
            variant="secondary"
            size="sm"
            :icon="MapsIcon"
            @click="openMap(selectedEventoModal.latitud, selectedEventoModal.longitud)"
          >
            Abrir en Google Maps
          </AppButton>
        </div>
      </div>
    </AppModal>

    <!-- Modal Crear Evento -->
    <ServicioEventoCreateModal
      v-model:isOpen="isCreateModalOpen"
      :defaultIdServicio="filtroIdServicio !== 'all' ? filtroIdServicio : ''"
      @created="cargarEventos"
    />
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #2D3748; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

/* Forzar la alineación y altura del date picker button al mismo tamaño de la barra de filtros */
.date-picker-container :deep(button) {
  height: 38px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 0.75rem !important; /* text-xs */
  background-color: transparent !important;
  border-color: rgba(226, 232, 240, 0.7) !important;
}
:global(.dark) .date-picker-container :deep(button) {
  background-color: rgba(19, 22, 28, 0.7) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
</style>
