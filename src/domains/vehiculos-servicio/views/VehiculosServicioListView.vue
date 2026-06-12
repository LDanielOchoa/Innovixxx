<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Edit02Icon,
  Delete01Icon,
  Car01Icon,
  FingerPrintIcon,
  Calendar01Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import Column from 'primevue/column'
import {
  fetchVehiculosServicioApi,
  deleteVehiculoServicioApi
} from '../services/vehiculos-servicio.api'
import type { VehiculoServicio } from '../types/vehiculo-servicio'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import VehiculoServicioModal from '../components/VehiculoServicioModal.vue'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const vehicles = ref<VehiculoServicio[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const isModalOpen = ref(false)
const editingVehicle = ref<VehiculoServicio | null>(null)

const fetchVehicles = async () => {
  if (!selectedGroup.value?.id) {
    vehicles.value = []
    return
  }
  isLoading.value = true
  try {
    vehicles.value = await fetchVehiculosServicioApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error fetching service vehicles:', error)
    vehicles.value = []
  } finally {
    isLoading.value = false
  }
}

// Menú desplegable para acciones de la tabla
const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })

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

const handleDocumentClick = () => {
  closeMenu()
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<VehiculoServicio | null>(null)

const confirmDelete = (vehicle: VehiculoServicio) => {
  itemToDelete.value = vehicle
  isDeleteModalOpen.value = true
}

const deleteVehicle = async () => {
  if (!itemToDelete.value || !selectedGroup.value?.id) return
  isDeleteModalOpen.value = false
  const vehicle = itemToDelete.value

  try {
    const data = await deleteVehiculoServicioApi({
      id_grupo: selectedGroup.value.id,
      id_vehiculo: vehicle.id_vehiculo
    })
    if (data.done) {
      await fetchVehicles()
    } else {
      alert(data.message || 'Error al eliminar')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      alert(getErrorMessage(error.code))
    } else {
      console.error('Error deleting service vehicle:', error)
    }
  }
}

const exportToExcel = () => {
  const dataToExport = filteredVehicles.value.map(v => ({
    Placa: v.placa,
    'Serial Chasis': v.serial_chasis,
    Marca: v.marca,
    Referencia: v.referencia,
    Modelo: v.modelo,
    Tipo: v.tipo,
    Cilindrada: v.cilindrada,
    SOAT: v.soat,
    'SOAT Vence': v.soat_vence,
    Tecnomecanica: v.tecnomecanica,
    'Tecnomecanica Vence': v.tecnomecanica_vence,
    Estado: v.estado === 1 ? 'Activo' : 'Inactivo',
    ID: v.id_vehiculo
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehiculos Servicio')
  XLSX.writeFile(workbook, `vehiculos_servicio_${new Date().toISOString().split('T')[0]}.xlsx`)
}

const isDateExpired = (dateStr: string): boolean => {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(dateStr + 'T00:00:00')
  return expDate < today
}

onMounted(() => {
  fetchVehicles()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const filteredVehicles = computed(() => {
  if (!searchQuery.value) return vehicles.value
  const query = searchQuery.value.toLowerCase()
  return vehicles.value.filter(v =>
    (v.placa?.toLowerCase().includes(query)) ||
    (v.marca?.toLowerCase().includes(query)) ||
    (v.referencia?.toLowerCase().includes(query)) ||
    (v.tipo?.toLowerCase().includes(query)) ||
    (v.serial_chasis?.toLowerCase().includes(query))
  )
})

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchVehicles()
})

// ─── Modal Handling ────────────────────────────────────────

const openCreateModal = () => {
  editingVehicle.value = null
  isModalOpen.value = true
}

const openEditModal = (vehicle: VehiculoServicio) => {
  editingVehicle.value = vehicle
  isModalOpen.value = true
}

const handleModalSaved = () => {
  fetchVehicles()
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('vehiculosServicio.title')" 
      :count="filteredVehicles.length" 
      :icon="Car01Icon"
    />

    <!-- Toolbar: Buscador (izquierda) + Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-[28rem]">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('vehiculosServicio.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Derecha: Botones Exportar y Nuevo Vehículo de Servicio -->
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
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('vehiculosServicio.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Table Card -->
    <AppTableCard>
      <AppTable
        :value="filteredVehicles"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('vehiculosServicio.noResults', 'No se encontraron vehículos de servicio')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('common.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

        <Column field="placa" :header="t('vehiculosServicio.thPlate', 'Placa')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-semibold text-slate-800 dark:text-white uppercase tracking-wider">{{ data.placa || '---' }}</span>
              <div class="flex items-center gap-1.5 mt-1 opacity-60">
                <HugeiconsIcon :icon="FingerPrintIcon" :size="10" />
                <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{{ data.serial_chasis || 'S/N' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="marca" :header="t('vehiculosServicio.thBrand', 'Marca / Referencia')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{{ data.marca || '---' }}</span>
              <span v-if="data.referencia" class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{{ data.referencia }}</span>
            </div>
          </template>
        </Column>

        <Column field="tipo" :header="t('vehiculosServicio.thType', 'Tipo')" sortable>
          <template #body="{ data }">
            <AppBadge :variant="'default'">
              {{ Number(data.tipo) === 1 ? 'Carro' : Number(data.tipo) === 2 ? 'Motocicleta' : data.tipo || '---' }}
            </AppBadge>
          </template>
        </Column>

        <Column field="modelo" :header="t('vehiculosServicio.thModel', 'Modelo')" sortable>
          <template #body="{ data }">
            <span class="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{{ data.modelo || '---' }}</span>
          </template>
        </Column>

        <Column field="cilindrada" :header="t('vehiculosServicio.thCc', 'Cilindrada')" sortable>
          <template #body="{ data }">
            <span class="text-[13px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{{ data.cilindrada || 0 }}<span class="text-[11px] font-medium text-slate-400 ml-0.5">cc</span></span>
          </template>
        </Column>

        <Column field="soat_vence" :header="t('vehiculosServicio.thSoat', 'SOAT')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 font-mono">{{ data.soat || '---' }}</span>
              <div v-if="data.soat_vence" class="flex items-center gap-1.5">
                <HugeiconsIcon :icon="Calendar01Icon" :size="10" :class="isDateExpired(data.soat_vence) ? 'text-red-400' : 'text-emerald-400'" />
                <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.soat_vence }}</span>
                <AppBadge
                  :variant="isDateExpired(data.soat_vence) ? 'danger' : 'success'"
                  class="ml-0.5"
                >
                  {{ isDateExpired(data.soat_vence) ? 'Vencido' : 'Vigente' }}
                </AppBadge>
              </div>
            </div>
          </template>
        </Column>

        <Column field="tecnomecanica_vence" :header="t('vehiculosServicio.thTecnomecanica', 'Tecnomecánica')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300 font-mono">{{ data.tecnomecanica || '---' }}</span>
              <div v-if="data.tecnomecanica_vence" class="flex items-center gap-1.5">
                <HugeiconsIcon :icon="Calendar01Icon" :size="10" :class="isDateExpired(data.tecnomecanica_vence) ? 'text-red-400' : 'text-emerald-400'" />
                <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.tecnomecanica_vence }}</span>
                <AppBadge
                  :variant="isDateExpired(data.tecnomecanica_vence) ? 'danger' : 'success'"
                  class="ml-0.5"
                >
                  {{ isDateExpired(data.tecnomecanica_vence) ? 'Vencido' : 'Vigente' }}
                </AppBadge>
              </div>
            </div>
          </template>
        </Column>

        <Column field="estado" :header="t('vehiculosServicio.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <AppBadge
              :variant="data.estado === 1 ? 'success' : 'danger'"
            >
              {{ data.estado === 1 ? t('vehiculosServicio.statusActive', 'Activo') : t('vehiculosServicio.statusInactive', 'Inactivo') }}
            </AppBadge>
          </template>
        </Column>

        <Column :header="t('vehiculosServicio.thActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_vehiculo, $event)"
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
              @click="openEditModal(vehicles.find(v => v.id_vehiculo === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              @click="confirmDelete(vehicles.find(v => v.id_vehiculo === openMenuId)!); openMenuId = null"
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
          :totalRecords="filteredVehicles.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Delete Confirm Modal -->
    <AppDeleteConfirm
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :message="$t('vehiculosServicio.confirmDelete', '¿Está seguro de que desea eliminar este vehículo de servicio?')"
      @confirm="deleteVehicle"
    />

    <VehiculoServicioModal
      v-model:isOpen="isModalOpen"
      :vehicle="editingVehicle"
      @saved="handleModalSaved"
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

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

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

.font-mono {
  font-family: 'Share Tech Mono', monospace;
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

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
