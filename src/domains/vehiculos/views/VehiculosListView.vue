<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Add01Icon,
  Search01Icon,
  Download01Icon,
  Edit02Icon,
  Delete01Icon,
  TruckIcon,
  FingerPrintIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppButton from '../../../components/ui/AppButton.vue'
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
  <div class="p-4 md:p-8 space-y-8 animate-fade-in font-inter">
    <!-- Header -->
    <AppPageHeader 
      :title="$t('vehiculos.title')" 
      :subtitle="`${$t('vehiculos.subtitle')} ${selectedGroup.nombre}`" 
      :count="filteredVehicles.length"
    >
      <template #actions>
        <div class="flex items-center gap-3">
          <AppButton 
            variant="secondary" 
            :icon="Download01Icon" 
            @click="exportToExcel"
            class="!px-3"
          />
          <AppButton 
            variant="primary" 
            :icon="Add01Icon" 
            @click="openCreateModal"
          >
            <span>{{ $t('vehiculos.btnNew') }}</span>
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <!-- Área de Búsqueda y Filtros Simplificada -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="$t('vehiculos.searchPlaceholder')"
        />
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
        :empty-message="$t('vehiculos.noResults', 'No se encontraron vehículos')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ $t('common.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

        <Column field="nombre" :header="$t('vehiculos.thName', 'Nombre')" sortable>
          <template #body="{ data }">
            <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight">{{ data.nombre || 'Vehículo' }}</span>
          </template>
        </Column>

        <Column field="placa" :header="$t('vehiculos.thPlate', 'Placa')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ data.placa || '---' }}</span>
              <div class="flex items-center gap-1.5 mt-1 opacity-60">
                <HugeiconsIcon :icon="FingerPrintIcon" :size="10" />
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.serial || 'S/N' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="tipo" :header="$t('vehiculos.thType', 'Tipo')" sortable>
          <template #body="{ data }">
            <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 group/type">
              <HugeiconsIcon :icon="TruckIcon" :size="14" class="text-slate-400 group-hover/type:text-[#3b82f6] transition-colors" />
              <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                {{ data.tipo || 'General' }}
              </span>
            </div>
          </template>
        </Column>

        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3">
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                @click="confirmDelete(data.id_vehiculo)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 hover:border-red-500/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Eliminar"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>
      
      <!-- Paginador -->
      <AppPagination 
        :totalRecords="filteredVehicles.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <!-- Modals -->
    <VehiculoModal
      v-model:isOpen="isModalOpen"
      :vehicle="selectedVehicle"
      @saved="handleModalSaved"
    />

    <AppDeleteConfirm 
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      :message="$t('common.confirmDeleteMsg')"
      @confirm="deleteVehicle"
    />
  </div>
</template>

<style scoped>
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

/* Animaciones */
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
