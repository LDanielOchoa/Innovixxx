<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Search01Icon,
  Edit02Icon,
  Delete01Icon,
  TruckIcon,
  FingerPrintIcon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import Column from 'primevue/column'
import {
  fetchVehiculosApi,
  deleteVehiculoApi
} from '../services/vehiculos.api'
import type { Vehiculo } from '../types/vehiculo'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import VehiculoModal from '../components/VehiculoModal.vue'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'
import StatusBadge from '../../../components/shared/StatusBadge.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const vehicles = ref<Vehiculo[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const fetchVehicles = async () => {
  isLoading.value = true
  try {
    vehicles.value = await fetchVehiculosApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
  } finally {
    isLoading.value = false
  }
}

const isModalOpen = ref(false)
const selectedVehicle = ref<Vehiculo | null>(null)

const openCreateModal = () => {
  selectedVehicle.value = null
  isModalOpen.value = true
}

const openEditModal = (vehicle: Vehiculo) => {
  selectedVehicle.value = vehicle
  isModalOpen.value = true
}

const handleModalSaved = () => {
  fetchVehicles()
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id_vehiculo: string) => {
  itemToDelete.value = id_vehiculo
  isDeleteModalOpen.value = true
}

const deleteVehicle = async () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const id_vehiculo = itemToDelete.value

  try {
    const data = await deleteVehiculoApi({
      id_grupo: selectedGroup.value.id,
      id_vehiculo: id_vehiculo
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
      console.error('Error deleting vehicle:', error)
    }
  }
}

const exportToExcel = () => {
  const dataToExport = filteredVehicles.value.map(v => ({
    Nombre: v.nombre,
    Placa: v.placa,
    Serial: v.serial,
    Tipo: v.tipo,
    Estado: v.estado === 1 ? 'Activo' : 'Inactivo',
    ID: v.id_vehiculo
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vehiculos')
  XLSX.writeFile(workbook, `vehiculos_${new Date().toISOString().split('T')[0]}.xlsx`)
}

onMounted(() => {
  fetchVehicles()
})

const filteredVehicles = computed(() => {
  if (!searchQuery.value) return vehicles.value
  const query = searchQuery.value.toLowerCase()
  return vehicles.value.filter(v => 
    (v.nombre?.toLowerCase().includes(query)) ||
    (v.placa?.toLowerCase().includes(query)) ||
    (v.serial?.toLowerCase().includes(query)) ||
    (v.tipo?.toString().toLowerCase().includes(query))
  )
})

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchVehicles()
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('vehiculos.title')" 
      :count="filteredVehicles.length" 
      :icon="TruckIcon"
    >
      <template #actions>
        <button 
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('vehiculos.btnNew') }}</span>
        </button>
        <button class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all">
          <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Search Toolbar -->
    <SearchToolbar v-model="searchQuery" :placeholder="t('vehiculos.searchPlaceholder')" searchWidth="sm:w-96">
      <template #extra>
        <button 
          @click="exportToExcel"
          class="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 flex items-center justify-center gap-1.5 transition-colors"
        >
          <svg class="w-4 h-4 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>
      </template>
    </SearchToolbar>

    <!-- Table Card -->
    <AppTableCard>
      <AppTable 
        :value="filteredVehicles" 
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('vehiculos.noResults', 'No se encontraron vehículos')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="nombre" :header="t('vehiculos.thName', 'Nombre')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre || 'Vehículo' }}</span>
              <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">{{ data.id_vehiculo }}</span>
            </div>
          </template>
        </Column>

        <Column field="placa" :header="t('vehiculos.thPlate', 'Placa')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[13px] font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ data.placa || '---' }}</span>
              <div class="flex items-center gap-1.5 mt-1 opacity-60">
                <HugeiconsIcon :icon="FingerPrintIcon" :size="10" />
                <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{{ data.serial || 'S/N' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="tipo" :header="t('vehiculos.thType', 'Tipo')" sortable>
          <template #body="{ data }">
            <StatusBadge 
              variant="default"
              :label="data.tipo || 'General'"
              :icon="TruckIcon"
            />
          </template>
        </Column>

        <Column :header="t('vehiculos.thActions', 'Acciones')" headerStyle="width: 12rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <TableActions
              :actions="[
                {
                  icon: Edit02Icon,
                  tooltip: t('common.edit', 'Editar'),
                  variant: 'primary',
                  onClick: () => openEditModal(data),
                  show: true
                },
                {
                  icon: Delete01Icon,
                  tooltip: t('common.delete', 'Eliminar'),
                  variant: 'danger',
                  onClick: () => confirmDelete(data.id_vehiculo),
                  show: true
                }
              ]"
              :show-more="true"
            />
          </template>
        </Column>
      </AppTable>

      <!-- Paginador -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination 
          :totalRecords="filteredVehicles.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Modals -->
    <VehiculoModal
      v-model:isOpen="isModalOpen"
      :vehicle="selectedVehicle"
      @saved="handleModalSaved"
    />

    <AppDeleteConfirm 
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :message="$t('common.confirmDeleteMsg')"
      @confirm="deleteVehicle"
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { 
  @apply bg-slate-200 dark:bg-white/10 rounded-full hover:bg-[#3b82f6] transition-colors;
}
</style>
