<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import * as XLSX from 'xlsx'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  RefreshIcon,
  LicenseIcon,
  User02Icon,
  SmartPhone01Icon,
  Calendar01Icon,
  FingerPrintIcon,
  Car01Icon,
  ServiceIcon,
  Edit02Icon,
  Delete01Icon,
  MoreHorizontalIcon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'

import { loadModuleMessages } from '../../../i18n'
import { fetchConductoresApi, deleteConductorApi } from '../services/conductores.api'
import {
  fetchServiciosDropdownApi,
  fetchVehiculosSimplesApi
} from '../../servicios/services/servicios.api'
import type { Conductor } from '../types/conductor'
import { obtenerUrlImagen } from '../../../utils/imagenes'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

import PageHeader from '../../../components/shared/PageHeader.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppAvatar from '../../../components/ui/AppAvatar.vue'
import ConductorCreateModal from '../components/ConductorCreateModal.vue'

const { t } = useI18n()
const toast = useToast()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const conductores = ref<Conductor[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const filtroEstado = ref<string>('TODOS')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Menú de acciones flotante
const openMenuId = ref<string | null>(null)
const menuPosition = ref<{ top?: string; bottom?: string; right: string }>({ right: '0px' })

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }

  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const estimatedMenuHeight = 120

  if (spaceBelow < estimatedMenuHeight) {
    menuPosition.value = {
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  } else {
    menuPosition.value = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

// Modal de eliminación
const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id_conductor: string) => {
  itemToDelete.value = id_conductor
  isDeleteModalOpen.value = true
}

const deleteConductor = async () => {
  if (!itemToDelete.value || !selectedGroup.value?.id) return
  isDeleteModalOpen.value = false
  const id_conductor = itemToDelete.value

  try {
    const data = await deleteConductorApi({
      id_grupo: selectedGroup.value.id,
      id_conductor: id_conductor
    })

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: t('conductores.alertSuccessDeleteTitle'),
        detail: data.message || t('conductores.alertSuccessDeleteDetail'),
        life: 4000
      })
      await fetchConductores()
    } else {
      toast.add({
        severity: 'error',
        summary: t('conductores.alertErrorDelete'),
        detail: data.message || t('conductores.alertErrorDelete'),
        life: 4000
      })
    }
  } catch (error: any) {
    if (error instanceof ApiError || (error && typeof error === 'object' && ('code' in error || error.name === 'ApiError'))) {
      toast.add({
        severity: 'error',
        summary: t('conductores.alertErrorDelete'),
        detail: getErrorMessage(error.code) || error.message,
        life: 4000
      })
    } else {
      console.error('Error deleting conductor:', error)
      toast.add({
        severity: 'error',
        summary: t('conductores.alertErrorDelete'),
        detail: error?.message || t('conductores.alertNetError'),
        life: 4000
      })
    }
  } finally {
    itemToDelete.value = null
  }
}

// Modal de creación
const isCreateModalOpen = ref(false)
const openCreateModal = () => {
  isCreateModalOpen.value = true
}

// Modal de edición
const isEditModalOpen = ref(false)
const currentEditConductor = ref<Conductor | null>(null)

const openEditModal = (conductor: Conductor) => {
  currentEditConductor.value = conductor
  isEditModalOpen.value = true
}

// Mapeos de asignaciones (Servicios y Vehículos normales)
const servicios = ref<any[]>([])
const vehiculos = ref<any[]>([])

const ESTADOS_MAP: Record<number, string> = {
  1: 'PRERCARGA',
  2: 'EN ESPERA',
  3: 'EJECUCION OK',
  4: 'EJECUCION FAIL',
  5: 'FINALIZADO',
  6: 'CANCELADO'
}

const getServicioInfo = (id?: string | number): string => {
  if (!id) return t('conductores.unassigned')
  const s = servicios.value.find(item => String(item.id_servicio) === String(id))
  if (!s) return String(id)
  const estadoNum = parseInt(s.estado, 10)
  const estadoTexto = ESTADOS_MAP[estadoNum] || s.estado || t('conductores.noService')
  return `${s.fecha_inicio || ''} (${estadoTexto})`.trim()
}

const getVehiculoInfo = (id?: string | number): string => {
  if (!id) return t('conductores.unassigned')
  const v = vehiculos.value.find(item => String(item.id_vehiculo) === String(id))
  return v ? `${v.placa}${v.tipo ? ` (${v.tipo})` : ''}` : String(id)
}

const cargarAsignacionesData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const [sData, vData] = await Promise.all([
      fetchServiciosDropdownApi(selectedGroup.value.id),
      fetchVehiculosSimplesApi(selectedGroup.value.id)
    ])
    servicios.value = Array.isArray(sData) ? sData : []
    vehiculos.value = Array.isArray(vData) ? vData : []
  } catch (error) {
    console.error('Error cargando datos de asignaciones:', error)
  }
}

const fetchConductores = async () => {
  if (!selectedGroup.value?.id) {
    conductores.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const resultados = await Promise.allSettled([
      fetchConductoresApi(selectedGroup.value.id),
      cargarAsignacionesData()
    ])
    if (resultados[0].status === 'fulfilled') {
      conductores.value = resultados[0].value
    }
  } catch (error) {
    console.error('Error fetching conductores:', error)
    conductores.value = []
  } finally {
    isLoading.value = false
  }
}

watch(() => selectedGroup.value?.id, () => {
  fetchConductores()
})

const isDateExpired = (dateStr: string): boolean => {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(dateStr + 'T00:00:00')
  return expDate < today
}

const isExpiringSoon = (dateStr: string): boolean => {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(dateStr + 'T00:00:00')
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= 30
}

// Filtro combinado de búsqueda y estado
const filteredConductores = computed(() => {
  return conductores.value.filter(c => {
    // Filtro por estado
    if (filtroEstado.value !== 'TODOS') {
      if (c.estado?.toUpperCase() !== filtroEstado.value) {
        return false
      }
    }

    // Filtro de búsqueda de texto
    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.cedula?.toLowerCase().includes(q) ||
      c.celular?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.pase?.toLowerCase().includes(q) ||
      c.tipo_pase?.toLowerCase().includes(q) ||
      c.id_conductor?.toLowerCase().includes(q) ||
      c.id_servicio?.toLowerCase().includes(q) ||
      c.id_vehiculo?.toLowerCase().includes(q)
    )
  })
})

const exportToExcel = () => {
  const dataToExport = filteredConductores.value.map(c => ({
    ID: c.id_conductor,
    Nombre: c.nombre,
    Cédula: c.cedula,
    Celular: c.celular,
    Email: c.email,
    Pase: c.pase,
    'Tipo Pase': c.tipo_pase,
    'Vencimiento Pase': c.pase_vence,
    Estado: c.estado,
    Servicio: c.id_servicio ? getServicioInfo(c.id_servicio) : t('conductores.unassigned'),
    Vehículo: c.id_vehiculo ? getVehiculoInfo(c.id_vehiculo) : t('conductores.unassigned'),
    'Grupo Servicio': c.grupo_servicio
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Conductores')
  XLSX.writeFile(workbook, `conductores_${new Date().toISOString().split('T')[0]}.xlsx`)
}

onMounted(() => {
  loadModuleMessages('conductores')
  fetchConductores()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in space-y-6">
    <!-- Header de la Página -->
    <PageHeader
      :title="t('conductores.title')"
      :count="filteredConductores.length"
      :icon="LicenseIcon"
    />

    <!-- Toolbar: Buscador + Filtros por Estado + Acciones -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        <!-- Input de Búsqueda -->
        <div class="relative w-full sm:w-80">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('conductores.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Filtros segmentados por Estado -->
        <div class="flex items-center p-1 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl">
          <button
            @click="filtroEstado = 'TODOS'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filtroEstado === 'TODOS'
                ? 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            ]"
          >
            {{ t('conductores.filterAll') }}
          </button>
          <button
            @click="filtroEstado = 'DISPONIBLE'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filtroEstado === 'DISPONIBLE'
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            ]"
          >
            {{ t('conductores.filterAvailable') }}
          </button>
          <button
            @click="filtroEstado = 'EN SERVICIO'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              filtroEstado === 'EN SERVICIO'
                ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            ]"
          >
            {{ t('conductores.filterInService') }}
          </button>
        </div>

        <!-- Botón de Recargar -->
        <button
          @click="fetchConductores"
          :disabled="isLoading"
          :title="t('conductores.btnReload')"
          class="p-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 shrink-0"
        >
          <HugeiconsIcon
            :icon="RefreshIcon"
            :size="16"
            :class="{ 'animate-spin': isLoading }"
          />
        </button>
      </div>

      <!-- Acciones: Exportar y Crear -->
      <div class="flex items-center gap-3">
        <button
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>{{ t('conductores.btnExport') }}</span>
        </button>

        <button
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('conductores.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Card con la Tabla -->
    <AppTableCard>
      <AppTable
        :value="filteredConductores"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('conductores.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('conductores.noResultsHint') }}</template>

        <!-- Columna: Conductor (Avatar + Nombre + Email) -->
        <Column field="nombre" :header="t('conductores.thDriver')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-3 py-1">
              <AppAvatar
                :image="obtenerUrlImagen(data.foto)"
                :label="data.nombre"
                size="normal"
              />
              <div class="flex flex-col min-w-0">
                <span class="text-[13px] font-bold text-slate-800 dark:text-white capitalize">
                  {{ data.nombre || '---' }}
                </span>
                <span class="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                  {{ data.email || 'Sin correo' }}
                </span>
              </div>
            </div>
          </template>
        </Column>

        <!-- Columna: Cédula -->
        <Column field="cedula" :header="t('conductores.thDocument')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-1.5 py-1">
              <HugeiconsIcon :icon="FingerPrintIcon" :size="12" class="text-slate-400" />
              <span class="text-[12px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {{ data.cedula || '---' }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna: Contacto -->
        <Column field="celular" :header="t('conductores.thContact')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-1.5 py-1">
              <HugeiconsIcon :icon="SmartPhone01Icon" :size="12" class="text-slate-400" />
              <a
                v-if="data.celular"
                :href="`tel:${data.celular}`"
                class="text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 tabular-nums"
              >
                {{ data.celular }}
              </a>
              <span v-else class="text-[12px] text-slate-400">---</span>
            </div>
          </template>
        </Column>

        <!-- Columna: Licencia / Pase -->
        <Column field="pase" :header="t('conductores.thLicense')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <div class="flex items-center gap-1.5">
                <span class="text-[12px] font-mono font-bold text-slate-700 dark:text-slate-200">
                  {{ data.pase || '---' }}
                </span>
                <AppBadge variant="info">
                  {{ data.tipo_pase || 'Cat. N/A' }}
                </AppBadge>
              </div>
              <div v-if="data.pase_vence" class="flex items-center gap-1.5 text-[10px] text-slate-400">
                <HugeiconsIcon :icon="Calendar01Icon" :size="10" />
                <span class="tabular-nums">{{ data.pase_vence }}</span>
                <AppBadge
                  :variant="isDateExpired(data.pase_vence) ? 'danger' : isExpiringSoon(data.pase_vence) ? 'warning' : 'success'"
                >
                  {{ isDateExpired(data.pase_vence) ? t('conductores.licenseExpired') : isExpiringSoon(data.pase_vence) ? t('conductores.licenseExpiringSoon') : t('conductores.licenseValid') }}
                </AppBadge>
              </div>
            </div>
          </template>
        </Column>

        <!-- Columna: Asignaciones -->
        <Column :header="t('conductores.thAssignments')">
          <template #body="{ data }">
            <div class="flex items-center gap-2 py-1">
              <!-- Servicio -->
              <div class="relative group">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200"
                  :class="data.id_servicio ? 'bg-[#3b82f6]/10 text-[#5da6fc] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400/50 border-transparent'"
                >
                  <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="15" />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-bold text-[#5da6fc]">{{ t('conductores.labelService') }}</span>
                    <span class="font-mono text-[10px]">{{ data.id_servicio ? getServicioInfo(data.id_servicio) : t('conductores.unassigned') }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>

              <!-- Vehículo -->
              <div class="relative group">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200"
                  :class="data.id_vehiculo ? 'bg-[#3b82f6]/10 text-[#5da6fc] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400/50 border-transparent'"
                >
                  <HugeiconsIcon :icon="Car01Icon" :size="15" />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-bold text-[#5da6fc]">{{ t('conductores.labelVehicle') }}</span>
                    <span class="font-mono text-[10px]">{{ data.id_vehiculo ? getVehiculoInfo(data.id_vehiculo) : t('conductores.unassigned') }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>
            </div>
          </template>
        </Column>

        <!-- Columna: Estado -->
        <Column field="estado" :header="t('conductores.thStatus')" sortable>
          <template #body="{ data }">
            <AppBadge
              :variant="data.estado === 'DISPONIBLE' ? 'success' : data.estado === 'EN SERVICIO' ? 'primary' : 'info'"
              dot
            >
              {{ data.estado || '---' }}
            </AppBadge>
          </template>
        </Column>

        <!-- Columna: Acciones -->
        <Column :header="t('conductores.thActions')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_conductor, $event)"
                :title="t('conductores.thActions')"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <!-- Menú Desplegable Teletransportado -->
      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ 
              ...(menuPosition.top ? { top: menuPosition.top } : {}), 
              ...(menuPosition.bottom ? { bottom: menuPosition.bottom } : {}), 
              right: menuPosition.right 
            }"
          >
            <!-- Editar -->
            <button
              @click="openEditModal(conductores.find(c => c.id_conductor === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit') }}</span>
            </button>

            <!-- Eliminar -->
            <button
              @click="confirmDelete(openMenuId); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" class="text-red-500" />
              <span>{{ t('common.delete') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredConductores.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Modal Crear Conductor -->
    <ConductorCreateModal
      v-model:isOpen="isCreateModalOpen"
      @created="fetchConductores"
    />

    <!-- Modal Editar Conductor -->
    <ConductorCreateModal
      v-model:isOpen="isEditModalOpen"
      :edit-item="currentEditConductor"
      @updated="fetchConductores"
    />

    <!-- Modal Confirmación de Eliminación -->
    <AppDeleteConfirm 
      v-model:is-open="isDeleteModalOpen"
      :title="t('common.confirmDeleteTitle')"
      :message="t('common.confirmDeleteMsg')"
      @confirm="deleteConductor"
    />
  </div>
</template>

<style scoped>
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
</style>
