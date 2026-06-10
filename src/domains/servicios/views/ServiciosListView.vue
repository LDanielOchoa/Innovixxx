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
  FilterIcon
} from '@hugeicons/core-free-icons'
import { fetchServiciosApi } from '../services/servicios.api'
import type { Servicio, ServicioListPayload } from '../types/servicio'
import { SERVICIO_ESTADOS, SERVICIO_ESTADOS_LABELS } from '../types/servicio'
import { useI18n } from 'vue-i18n'
import { fetchRutasApi } from '../../rutas/services/rutas.api'
import type { Ruta } from '../../rutas/types/ruta'
import { fetchEscoltasApi } from '../../escoltas/services/escoltas.api'
import type { Escolta } from '../../escoltas/types/escolta'

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
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const servicios = ref<Servicio[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const isCreateModalOpen = ref(false)
const isAsignarModalOpen = ref(false)
const selectedServicio = ref<Servicio | null>(null)
const isCambiarRutaModalOpen = ref(false)
const selectedCambiarRutaServicio = ref<Servicio | null>(null)
const isActualizarEscoltaModalOpen = ref(false)
const selectedActualizarEscoltaServicio = ref<Servicio | null>(null)
const isActualizarVehiculosModalOpen = ref(false)
const selectedActualizarVehiculosServicio = ref<Servicio | null>(null)
const isVerHistorialModalOpen = ref(false)
const selectedVerHistorialServicio = ref<Servicio | null>(null)
const isCambiarEstadoModalOpen = ref(false)
const selectedCambiarEstadoServicio = ref<Servicio | null>(null)
const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })
const isFilterOpen = ref(false)
const filterRef = ref<HTMLElement | null>(null)
const isRutaDropdownOpen = ref(false)
const isEscoltaDropdownOpen = ref(false)
const isEstadoDropdownOpen = ref(false)
const rutaDropdownRef = ref<HTMLElement | null>(null)
const escoltaDropdownRef = ref<HTMLElement | null>(null)
const estadoDropdownRef = ref<HTMLElement | null>(null)

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

const toggleFilter = () => {
  isFilterOpen.value = !isFilterOpen.value
}

const closeFilter = () => {
  isFilterOpen.value = false
}

const toggleRutaDropdown = () => {
  isRutaDropdownOpen.value = !isRutaDropdownOpen.value
  if (isRutaDropdownOpen.value) { isEscoltaDropdownOpen.value = false; isEstadoDropdownOpen.value = false }
}

const toggleEscoltaDropdown = () => {
  isEscoltaDropdownOpen.value = !isEscoltaDropdownOpen.value
  if (isEscoltaDropdownOpen.value) { isRutaDropdownOpen.value = false; isEstadoDropdownOpen.value = false }
}

const toggleEstadoDropdown = () => {
  isEstadoDropdownOpen.value = !isEstadoDropdownOpen.value
  if (isEstadoDropdownOpen.value) { isRutaDropdownOpen.value = false; isEscoltaDropdownOpen.value = false }
}

const selectRuta = (id: string) => {
  filtros.value.id_ruta = id
  isRutaDropdownOpen.value = false
}

const selectEscolta = (id: string) => {
  filtros.value.id_escolta = id
  isEscoltaDropdownOpen.value = false
}

const selectEstado = (estado: number) => {
  filtros.value.estado = estado
  isEstadoDropdownOpen.value = false
}

const getRutaLabel = (): string => {
  if (filtros.value.id_ruta === 'all') return t('servicios.stateAll', 'Todas')
  const ruta = rutas.value.find(r => r.id_ruta === filtros.value.id_ruta)
  return ruta?.nombre || '---'
}

const getEscoltaLabel = (): string => {
  if (filtros.value.id_escolta === 'all') return t('servicios.stateAll', 'Todos')
  const escolta = escoltas.value.find(e => e.id_escolta === filtros.value.id_escolta)
  return escolta?.nombre || '---'
}

const getEstadoLabel = (): string => {
  if (filtros.value.estado === 0) return t('servicios.stateAll', 'Todos')
  return SERVICIO_ESTADOS_LABELS[filtros.value.estado] || '---'
}

const estadoOptions = [
  { value: 0, label: 'Todos' },
  { value: 1, label: 'PRERCARGA' },
  { value: 2, label: 'EN ESPERA' },
  { value: 3, label: 'EJECUCION OK' },
  { value: 4, label: 'EJECUCION FAIL' },
  { value: 5, label: 'FINALIZADO' }
]

const openAsignarModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedServicio.value = servicio
  isAsignarModalOpen.value = true
}

const openCambiarRutaModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedCambiarRutaServicio.value = servicio
  isCambiarRutaModalOpen.value = true
}

const openActualizarEscoltaModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedActualizarEscoltaServicio.value = servicio
  isActualizarEscoltaModalOpen.value = true
}

const openActualizarVehiculosModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedActualizarVehiculosServicio.value = servicio
  isActualizarVehiculosModalOpen.value = true
}

const openVerHistorialModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedVerHistorialServicio.value = servicio
  isVerHistorialModalOpen.value = true
}

const openCambiarEstadoModal = (servicio: Servicio) => {
  openMenuId.value = null
  selectedCambiarEstadoServicio.value = servicio
  isCambiarEstadoModalOpen.value = true
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
  estado: SERVICIO_ESTADOS.TODOS,
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
    const payload: ServicioListPayload = {
      id_grupo: selectedGroup.value.id,
      estado: filtros.value.estado,
      fecha_registro_inicial: filtros.value.fecha_registro_inicial || '2020-01-01',
      fecha_registro_final: filtros.value.fecha_registro_final || '2099-12-31',
      id_ruta: filtros.value.id_ruta,
      id_escolta: filtros.value.id_escolta
    }
    servicios.value = await fetchServiciosApi(payload)
  } catch (error) {
    console.error('Error fetching servicios:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchFiltrosData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const [rutasData, escoltasData] = await Promise.all([
      fetchRutasApi(selectedGroup.value.id),
      fetchEscoltasApi(selectedGroup.value.id)
    ])
    rutas.value = rutasData
    escoltas.value = escoltasData
  } catch (error) {
    console.error('Error fetching filtros data:', error)
  }
}

const aplicarFiltros = () => {
  currentPage.value = 1
  fetchServicios()
}

const limpiarFiltros = () => {
  const dates = getLastWeekDates()
  fechaRango.value = { start: dates.start, end: dates.end }
  filtros.value = {
    estado: SERVICIO_ESTADOS.TODOS,
    fecha_registro_inicial: dates.start,
    fecha_registro_final: dates.end,
    id_ruta: 'all',
    id_escolta: 'all'
  }
  currentPage.value = 1
  fetchServicios()
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
  return servicios.value.filter(s =>
    s.id_servicio?.toLowerCase().includes(query) ||
    s.estado?.toLowerCase().includes(query) ||
    s.modo_fin?.toLowerCase().includes(query)
  )
})

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
  if (filterRef.value && !filterRef.value.contains(e.target as Node)) {
    closeFilter()
  }
  if (rutaDropdownRef.value && !rutaDropdownRef.value.contains(e.target as Node)) {
    isRutaDropdownOpen.value = false
  }
  if (escoltaDropdownRef.value && !escoltaDropdownRef.value.contains(e.target as Node)) {
    isEscoltaDropdownOpen.value = false
  }
  if (estadoDropdownRef.value && !estadoDropdownRef.value.contains(e.target as Node)) {
    isEstadoDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchFiltrosData()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="p-4 md:p-6 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('servicios.title')" 
      :count="filteredServicios.length" 
      :icon="Calendar01Icon"
    >
      <template #actions>
        <button 
          @click="isCreateModalOpen = true"
          class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('servicios.btnNew') }}</span>
        </button>
        <button class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all">
          <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Search Toolbar + Filter Button -->
    <div class="mt-2 mb-2 flex items-center justify-between gap-3">
      <SearchToolbar v-model="searchQuery" :placeholder="t('servicios.searchPlaceholder')" searchWidth="sm:w-96" />

      <!-- Filter Button + Dropdown -->
      <div class="relative" ref="filterRef">
        <button
          @click.stop="toggleFilter"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all text-[13px] font-semibold whitespace-nowrap"
          :class="isFilterOpen ? 'border-[#3b82f6]/40 dark:border-[#5da6fc]/40 text-[#3b82f6] dark:text-[#5da6fc]' : ''"
        >
          <HugeiconsIcon :icon="FilterIcon" :size="16" />
          <span>Filtros</span>
        </button>

        <!-- Dropdown Panel -->
        <Transition name="filter-dropdown">
          <div
            v-if="isFilterOpen"
            class="absolute top-full right-0 mt-2 w-[340px] bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5 rounded-t-2xl bg-white dark:bg-[#1A1D24]">
              <span class="text-[14px] font-bold text-slate-800 dark:text-white">Filtros</span>
              <button @click="closeFilter" class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-5 py-4 space-y-4">
              <!-- Date Range -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rango de Fechas
                  </label>
                  <button @click="limpiarFiltros" class="text-[11px] font-semibold text-[#3b82f6] dark:text-[#5da6fc] hover:underline">
                    Limpiar
                  </button>
                </div>
                <AppDateRangePicker
                  v-model="fechaRango"
                  label=""
                  placeholder="Seleccionar rango"
                />
              </div>

              <!-- Route Custom Dropdown -->
              <div ref="rutaDropdownRef" class="relative">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {{ t('servicios.filterRoute', 'Ruta') }}
                  </label>
                  <button v-if="filtros.id_ruta !== 'all'" @click="filtros.id_ruta = 'all'" class="text-[11px] font-semibold text-[#3b82f6] dark:text-[#5da6fc] hover:underline">
                    Limpiar
                  </button>
                </div>
                <button
                  @click.stop="toggleRutaDropdown"
                  class="w-full flex items-center justify-between bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  :class="isRutaDropdownOpen ? 'border-[#3b82f6]/50 dark:border-[#5da6fc]/50 ring-4 ring-[#3b82f6]/5' : ''"
                >
                  <span class="truncate">{{ getRutaLabel() }}</span>
                  <svg class="w-4 h-4 shrink-0 ml-2 text-slate-400 dark:text-slate-500 transition-transform duration-200" :class="isRutaDropdownOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition name="custom-dropdown">
                  <div
                    v-if="isRutaDropdownOpen"
                    class="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar"
                  >
                    <button
                      @click="selectRuta('all')"
                      class="w-full flex items-center px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      :class="filtros.id_ruta === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
                    >
                      <span>{{ t('servicios.stateAll', 'Todas') }}</span>
                      <svg v-if="filtros.id_ruta === 'all'" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      v-for="ruta in rutas"
                      :key="ruta.id_ruta"
                      @click="selectRuta(ruta.id_ruta)"
                      class="w-full flex items-center px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5"
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

              <!-- Escort Custom Dropdown -->
              <div ref="escoltaDropdownRef" class="relative">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {{ t('servicios.filterEscort', 'Escolta') }}
                  </label>
                  <button v-if="filtros.id_escolta !== 'all'" @click="filtros.id_escolta = 'all'" class="text-[11px] font-semibold text-[#3b82f6] dark:text-[#5da6fc] hover:underline">
                    Limpiar
                  </button>
                </div>
                <button
                  @click.stop="toggleEscoltaDropdown"
                  class="w-full flex items-center justify-between bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  :class="isEscoltaDropdownOpen ? 'border-[#3b82f6]/50 dark:border-[#5da6fc]/50 ring-4 ring-[#3b82f6]/5' : ''"
                >
                  <span class="truncate">{{ getEscoltaLabel() }}</span>
                  <svg class="w-4 h-4 shrink-0 ml-2 text-slate-400 dark:text-slate-500 transition-transform duration-200" :class="isEscoltaDropdownOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition name="custom-dropdown">
                  <div
                    v-if="isEscoltaDropdownOpen"
                    class="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar"
                  >
                    <button
                      @click="selectEscolta('all')"
                      class="w-full flex items-center px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      :class="filtros.id_escolta === 'all' ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10' : 'text-slate-700 dark:text-slate-300'"
                    >
                      <span>{{ t('servicios.stateAll', 'Todos') }}</span>
                      <svg v-if="filtros.id_escolta === 'all'" class="w-4 h-4 ml-auto shrink-0 text-[#3b82f6] dark:text-[#5da6fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      v-for="escolta in escoltas"
                      :key="escolta.id_escolta"
                      @click="selectEscolta(escolta.id_escolta)"
                      class="w-full flex items-center px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5"
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

              <!-- Estado Custom Dropdown -->
              <div ref="estadoDropdownRef" class="relative">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Estado
                  </label>
                  <button v-if="filtros.estado !== 0" @click="filtros.estado = 0" class="text-[11px] font-semibold text-[#3b82f6] dark:text-[#5da6fc] hover:underline">
                    Limpiar
                  </button>
                </div>
                <button
                  @click.stop="toggleEstadoDropdown"
                  class="w-full flex items-center justify-between bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-all"
                  :class="isEstadoDropdownOpen ? 'border-[#3b82f6]/50 dark:border-[#5da6fc]/50 ring-4 ring-[#3b82f6]/5' : ''"
                >
                  <span class="truncate">{{ getEstadoLabel() }}</span>
                  <svg class="w-4 h-4 shrink-0 ml-2 text-slate-400 dark:text-slate-500 transition-transform duration-200" :class="isEstadoDropdownOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <Transition name="custom-dropdown">
                  <div
                    v-if="isEstadoDropdownOpen"
                    class="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar"
                  >
                    <button
                      v-for="opt in estadoOptions"
                      :key="opt.value"
                      @click="selectEstado(opt.value)"
                      class="w-full flex items-center px-3.5 py-2.5 text-left text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-white/5 first:border-t-0"
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
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] rounded-b-2xl">
              <button
                @click="limpiarFiltros"
                class="text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Reset
              </button>
              <button
                @click="aplicarFiltros(); closeFilter()"
                class="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold transition-all active:scale-95"
              >
                <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="14" :stroke-width="2.5" />
                Aplicar
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Tabla -->
    <AppTableCard class="mt-2">
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
              {{ data.modo_fin || '---' }}
            </span>
          </template>
        </Column>

        <Column field="alcance" :header="t('servicios.thScope', 'Alcance')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="data.alcance === 'ND'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'">
              {{ data.alcance || 'ND' }}
            </span>
          </template>
        </Column>

        <Column field="nivel_riesgo" :header="t('servicios.thRiskLevel', 'Nivel Riesgo')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="riesgoColors[data.nivel_riesgo?.toUpperCase()] || riesgoColors.ND">
              {{ data.nivel_riesgo || 'ND' }}
            </span>
          </template>
        </Column>

        <Column field="estado" :header="t('servicios.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0"
                :class="{
                  'bg-blue-500': data.estado === 'PRERCARGA',
                  'bg-amber-500': data.estado === 'EN_ESPERA',
                  'bg-emerald-500': data.estado === 'EJECUCION_OK',
                  'bg-red-500': data.estado === 'EJECUCION_FAIL',
                  'bg-slate-400': data.estado === 'FINALIZADO'
                }"></span>
              <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                :class="estadoColors[data.estado] || estadoColors.PRERCARGA">
                {{ data.estado || '---' }}
              </span>
            </div>
          </template>
        </Column>

        <Column :header="t('servicios.thActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_servicio, $event)"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              @click="openAsignarModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="CpuIcon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('servicios.btnAssign', 'Asignar Recursos') }}</span>
            </button>
            <button
              @click="openCambiarRutaModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Route01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Cambiar Ruta</span>
            </button>
            <button
              @click="openActualizarEscoltaModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="User02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Actualizar Escolta</span>
            </button>
            <button
              @click="openActualizarVehiculosModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Car01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Actualizar Vehículos</span>
            </button>
            <button
              @click="openVerHistorialModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Clock01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Ver Historial</span>
            </button>
            <button
              @click="openCambiarEstadoModal(servicios.find(s => s.id_servicio === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Cambiar Estado</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredServicios.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
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
      :servicio="selectedCambiarRutaServicio"
      @assigned="fetchServicios"
    />

    <ServicioActualizarEscoltaModal
      v-model:is-open="isActualizarEscoltaModalOpen"
      :servicio="selectedActualizarEscoltaServicio"
      @updated="fetchServicios"
    />

    <ServicioActualizarVehiculosModal
      v-model:is-open="isActualizarVehiculosModalOpen"
      :servicio="selectedActualizarVehiculosServicio"
      @updated="fetchServicios"
    />

    <ServicioVerHistorialModal
      v-model:is-open="isVerHistorialModalOpen"
      :servicio="selectedVerHistorialServicio"
    />

    <ServicioCambiarEstadoModal
      v-model:is-open="isCambiarEstadoModalOpen"
      :servicio="selectedCambiarEstadoServicio"
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

.filter-dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.filter-dropdown-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.filter-dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
.filter-dropdown-leave-to {
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
</style>