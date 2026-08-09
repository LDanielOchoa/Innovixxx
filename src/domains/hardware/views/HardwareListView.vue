<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Edit02Icon,
  Delete01Icon,
  ChipIcon,
  MoreHorizontalIcon,
  Location01Icon,
  CheckmarkCircle01Icon,
  LockKeyIcon,
  FilterIcon,
  ArrowDown01Icon,
  RefreshIcon
} from '@hugeicons/core-free-icons'
import { loadModuleMessages } from '../../../i18n'

import {
  fetchHardwareApi,
  deleteHardwareApi
} from '../services/hardware.api'
import { fetchServiciosDropdownApi } from '../../servicios/services/servicios.api'
import type { Hardware } from '../types/hardware'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import HardwareFormModal from '../components/HardwareFormModal.vue'
import HardwarePosicionModal from '../components/HardwarePosicionModal.vue'
import HardwareAbrirCandadoModal from '../components/HardwareAbrirCandadoModal.vue'
import Column from 'primevue/column'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'


const { t } = useI18n()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)

const items = ref<Hardware[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const estadoFiltro = ref<string>('ALL')
const isEstadoDropdownOpen = ref(false)
const estadoDropdownRef = ref<HTMLElement | null>(null)

const familiaFiltro = ref<string>('ALL')
const isFamiliaDropdownOpen = ref(false)
const familiaDropdownRef = ref<HTMLElement | null>(null)

const currentPage = ref(1)
const itemsPerPage = 10
const openMenuId = ref<string | null>(null)
const menuPosition = ref<{ top?: string; bottom?: string; right: string }>({ right: '0px' })

const toggleEstadoDropdown = () => {
  isEstadoDropdownOpen.value = !isEstadoDropdownOpen.value
  isFamiliaDropdownOpen.value = false
}

const selectEstadoFiltro = (estado: string) => {
  estadoFiltro.value = estado
  isEstadoDropdownOpen.value = false
  currentPage.value = 1
}

const toggleFamiliaDropdown = () => {
  isFamiliaDropdownOpen.value = !isFamiliaDropdownOpen.value
  isEstadoDropdownOpen.value = false
}

const selectFamiliaFiltro = (familia: string) => {
  familiaFiltro.value = familia
  isFamiliaDropdownOpen.value = false
  currentPage.value = 1
}

const estadosUnicos = computed(() => {
  const set = new Set<string>()
  items.value.forEach(item => {
    if (item.estado) set.add(item.estado)
  })
  return Array.from(set)
})

const familiasUnicas = computed(() => {
  const set = new Set<string>()
  items.value.forEach(item => {
    if (item.familia) set.add(item.familia)
  })
  return Array.from(set)
})

const getEstadoFiltroLabel = computed(() => {
  if (estadoFiltro.value === 'ALL') return 'TODOS LOS ESTADOS'
  return estadoFiltro.value
})

const getFamiliaFiltroLabel = computed(() => {
  if (familiaFiltro.value === 'ALL') return 'TODAS LAS FAMILIAS'
  return familiaFiltro.value
})

// Mapeo de servicios asignados
const servicios = ref<any[]>([])

const getServicioInfo = (id: string) => {
  const s = servicios.value.find(item => item.id_servicio === id)
  return s ? `${s.fecha_inicio} (${s.estado})` : id
}

const cargarServiciosData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    servicios.value = await fetchServiciosDropdownApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error cargando servicios:', error)
  }
}

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const estimatedMenuHeight = 150 // Altura aproximada del menú flotante

  if (spaceBelow < estimatedMenuHeight) {
    // Abrir hacia arriba
    menuPosition.value = {
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  } else {
    // Abrir hacia abajo
    menuPosition.value = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
  openMenuId.value = id
}

const openMenuItem = computed(() => {
  if (!openMenuId.value) return null
  return items.value.find(i => i.id_hardware === openMenuId.value) || null
})

const isCandadoSupported = (item?: Hardware | null) => {
  if (!item) return false
  const fam = String(item.familia || '').toUpperCase().trim()
  const name = String(item.nombre || '').toUpperCase().trim()
  return fam.includes('GL800') || fam.includes('GL 800') || fam.includes('GL-800') || name.includes('GL800')
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleDocumentClick = (event: MouseEvent) => {
  closeMenu()
  if (estadoDropdownRef.value && !estadoDropdownRef.value.contains(event.target as Node)) {
    isEstadoDropdownOpen.value = false
  }
  if (familiaDropdownRef.value && !familiaDropdownRef.value.contains(event.target as Node)) {
    isFamiliaDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const fetchHardware = async () => {
  if (!selectedGroup.value?.id) {
    items.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const [hardwareData] = await Promise.all([
      fetchHardwareApi(selectedGroup.value.id),
      cargarServiciosData()
    ])
    items.value = hardwareData
  } catch (error) {
    console.error('Error fetching hardware:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadModuleMessages('hardware')
})
const isFormModalOpen = ref(false)
const editItem = ref<Hardware | null>(null)

const openCreateModal = () => {
  editItem.value = null
  isFormModalOpen.value = true
}

const openEditModal = (item: Hardware) => {
  editItem.value = item
  isFormModalOpen.value = true
}

const handleSaved = async () => {
  await fetchHardware()
}

// Modal de eliminar
const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id_hardware: string) => {
  itemToDelete.value = id_hardware
  isDeleteModalOpen.value = true
}

// Modal de posición
const isPosicionModalOpen = ref(false)
const posicionHardware = ref<Hardware | null>(null)

const openPosicionModal = (item: Hardware) => {
  posicionHardware.value = item
  isPosicionModalOpen.value = true
}

// Modal de abrir candado
const isAbrirCandadoModalOpen = ref(false)
const candadoHardware = ref<Hardware | null>(null)

const openAbrirCandadoModal = (item: Hardware) => {
  candadoHardware.value = item
  isAbrirCandadoModalOpen.value = true
}

const handleMenuAction = (action: 'posicion' | 'edit' | 'delete' | 'abrir-candado') => {
  const item = items.value.find(i => i.id_hardware === openMenuId.value)
  openMenuId.value = null
  if (!item) return
  if (action === 'posicion') openPosicionModal(item)
  else if (action === 'edit') openEditModal(item)
  else if (action === 'delete') confirmDelete(item.id_hardware)
  else if (action === 'abrir-candado') openAbrirCandadoModal(item)
}

const deleteHardware = async () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const id_hardware = itemToDelete.value

  try {
    const data = await deleteHardwareApi({
      id_grupo: selectedGroup.value.id,
      id_hardware: id_hardware
    })
    if (data.done) {
      await fetchHardware()
    } else {
      alert(data.message || 'Error al eliminar')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      alert(getErrorMessage(error.code))
    } else {
      console.error('Error deleting hardware:', error)
    }
  }
}

const exportToExcel = () => {
  const dataToExport = filteredItems.value.map(item => ({
    Nombre: item.nombre,
    Familia: item.familia,
    Serial: item.serial,
    IMEI: item.imei,
    MAC: item.mac,
    Estado: item.estado,
    ID: item.id_hardware
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hardware')
  XLSX.writeFile(workbook, `hardware_${new Date().toISOString().split('T')[0]}.xlsx`)
}

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    currentPage.value = 1
    await fetchHardware()
  } else {
    items.value = []
  }
}, { immediate: true })

const filteredItems = computed(() => {
  let list = items.value

  if (estadoFiltro.value !== 'ALL') {
    list = list.filter(item => item.estado === estadoFiltro.value)
  }

  if (familiaFiltro.value !== 'ALL') {
    list = list.filter(item => item.familia === familiaFiltro.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter(item =>
      (item.nombre?.toLowerCase().includes(query)) ||
      (item.serial?.toLowerCase().includes(query)) ||
      (item.imei?.toLowerCase().includes(query)) ||
      (item.mac?.toLowerCase().includes(query)) ||
      (item.familia?.toLowerCase().includes(query))
    )
  }

  return list
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('hardware.title')" 
      :count="filteredItems.length" 
      :icon="ChipIcon"
    />

    <!-- Toolbar: Buscador (izquierda) + Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador y Filtro Estado -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-80">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('hardware.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Botón de Recarga afuera -->
        <button 
          @click="fetchHardware"
          :disabled="isLoading"
          :title="t('common.reload', 'Recargar')"
          class="p-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <HugeiconsIcon 
            :icon="RefreshIcon" 
            :size="16" 
            :class="{ 'animate-spin': isLoading }"
          />
        </button>

        <!-- Filtro por Familia -->
        <div class="relative w-full sm:w-auto" ref="familiaDropdownRef">
          <button 
            @click="toggleFamiliaDropdown"
            class="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 bg-white dark:bg-[#13161C]/70 border rounded-xl text-xs font-semibold transition-all h-[38px]"
            :class="familiaFiltro !== 'ALL' 
              ? 'border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
              : 'border-slate-200/70 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'"
          >
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="FilterIcon" :size="14" class="opacity-70" />
              <span class="uppercase tracking-wider text-[11px] font-bold">{{ getFamiliaFiltroLabel }}</span>
            </div>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="14" class="opacity-60 transition-transform duration-200" :class="{ 'rotate-180': isFamiliaDropdownOpen }" />
          </button>

          <!-- Dropdown Menu Familia -->
          <Transition name="fade-fast">
            <div 
              v-if="isFamiliaDropdownOpen" 
              class="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl z-50 py-1.5 backdrop-blur-xl"
            >
              <!-- Opción TODAS LAS FAMILIAS -->
              <button 
                @click="selectFamiliaFiltro('ALL')"
                class="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors"
                :class="familiaFiltro === 'ALL' 
                  ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
              >
                <span>TODAS LAS FAMILIAS</span>
                <span v-if="familiaFiltro === 'ALL'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
              </button>

              <div class="h-px bg-slate-100 dark:bg-white/5 my-1"></div>

              <!-- Familias dinámicas -->
              <button 
                v-for="familia in familiasUnicas"
                :key="familia"
                @click="selectFamiliaFiltro(familia)"
                class="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors"
                :class="familiaFiltro === familia 
                  ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
              >
                <span>{{ familia }}</span>
                <span v-if="familiaFiltro === familia" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
              </button>
            </div>
          </Transition>
        </div>

        <!-- Filtro por Estado -->
        <div class="relative w-full sm:w-auto" ref="estadoDropdownRef">
          <button 
            @click="toggleEstadoDropdown"
            class="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 bg-white dark:bg-[#13161C]/70 border rounded-xl text-xs font-semibold transition-all h-[38px]"
            :class="estadoFiltro !== 'ALL' 
              ? 'border-[#3b82f6]/50 text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
              : 'border-slate-200/70 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'"
          >
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="FilterIcon" :size="14" class="opacity-70" />
              <span class="uppercase tracking-wider text-[11px] font-bold">{{ getEstadoFiltroLabel }}</span>
            </div>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="14" class="opacity-60 transition-transform duration-200" :class="{ 'rotate-180': isEstadoDropdownOpen }" />
          </button>

          <!-- Dropdown Menu Estado -->
          <Transition name="fade-fast">
            <div 
              v-if="isEstadoDropdownOpen" 
              class="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl z-50 py-1.5 backdrop-blur-xl"
            >
              <!-- Opción TODOS LOS ESTADOS -->
              <button 
                @click="selectEstadoFiltro('ALL')"
                class="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors"
                :class="estadoFiltro === 'ALL' 
                  ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
              >
                <span>TODOS LOS ESTADOS</span>
                <span v-if="estadoFiltro === 'ALL'" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
              </button>

              <div class="h-px bg-slate-100 dark:bg-white/5 my-1"></div>

              <!-- Estados dinámicos -->
              <button 
                v-for="estado in estadosUnicos"
                :key="estado"
                @click="selectEstadoFiltro(estado)"
                class="w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors"
                :class="estadoFiltro === estado 
                  ? 'text-[#3b82f6] dark:text-[#5da6fc] bg-blue-50/50 dark:bg-blue-500/10' 
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
              >
                <span>{{ estado }}</span>
                <span v-if="estadoFiltro === estado" class="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Derecha: Botones Exportar y Nuevo Dispositivo -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button 
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>

        <button 
          v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_CREATE)"
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('hardware.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Table Card -->
    <AppTableCard>
      <AppTable
        :value="filteredItems"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="estadoFiltro !== 'ALL' ? `No se encontraron dispositivos en estado ${estadoFiltro}` : t('hardware.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="nombre" :header="t('hardware.thName', 'Dispositivo')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre || 'Desconocido' }}</span>
              <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{{ data.descripcion || 'Sin descripción' }}</span>
            </div>
          </template>
        </Column>

        <Column field="serial" :header="t('hardware.thIdentifiers', 'Identificadores')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider font-mono">{{ data.serial || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="familia" :header="t('hardware.thFamily', 'Familia')" sortable>
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="text-[10px] font-semibold uppercase tracking-wider">
                {{ data.familia }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <Column :header="t('hardware.thAssignment', 'Asignación')">
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
                    <span class="font-bold text-[#5da6fc]">Servicio</span>
                    <span class="font-mono text-[10px]">{{ data.id_servicio ? getServicioInfo(data.id_servicio) : 'No asignado' }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>
            </div>
          </template>
        </Column>

        <Column field="estado" :header="t('hardware.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide"
              :class="{
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': data.estado === 'DISPONIBLE',
                'bg-blue-500/10 text-blue-500 border border-blue-500/20': data.estado === 'OCUPADO EN SERVICIO' || data.estado === 'EN SERVICIO',
                'bg-red-500/10 text-red-500 border border-red-500/20': data.estado === 'NO DISPONIBLE'
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="{
                  'bg-emerald-500': data.estado === 'DISPONIBLE',
                  'bg-blue-500': data.estado === 'OCUPADO EN SERVICIO' || data.estado === 'EN SERVICIO',
                  'bg-red-500': data.estado === 'NO DISPONIBLE'
                }"
              ></span>
              {{ data.estado }}
            </span>
          </template>
        </Column>

        <Column :header="t('hardware.thActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_hardware, $event)"
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
            :style="{ 
              ...(menuPosition.top ? { top: menuPosition.top } : {}), 
              ...(menuPosition.bottom ? { bottom: menuPosition.bottom } : {}), 
              right: menuPosition.right 
            }"
          >
            <button
              v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_COMMANDS) && isCandadoSupported(openMenuItem)"
              @click="handleMenuAction('abrir-candado')"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="LockKeyIcon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Abrir Candado</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT)"
              @click="handleMenuAction('edit')"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_DELETE)"
              @click="handleMenuAction('delete')"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" />
              <span>{{ t('common.delete', 'Eliminar') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredItems.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="t('common.confirmDeleteTitle')"
      :message="t('common.confirmDeleteMsg')"
      @confirm="deleteHardware"
    />

    <!-- Modal Crear/Editar Hardware -->
    <HardwareFormModal
      v-model:is-open="isFormModalOpen"
      :edit-item="editItem"
      @saved="handleSaved"
    />

    <!-- Modal Posición Hardware -->
    <HardwarePosicionModal
      v-model:is-open="isPosicionModalOpen"
      :hardware="posicionHardware"
    />

    <!-- Modal Abrir Candado -->
    <HardwareAbrirCandadoModal
      v-model:is-open="isAbrirCandadoModalOpen"
      :hardware="candadoHardware"
      @updated="fetchHardware"
    />
  </div>
</template>

<style>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.8);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.4);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}
</style>
