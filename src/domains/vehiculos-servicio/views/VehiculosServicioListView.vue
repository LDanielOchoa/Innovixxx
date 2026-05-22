<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Add01Icon,
  Search01Icon,
  Download01Icon,
  Edit02Icon,
  Delete01Icon,
  Car01Icon,
  FingerPrintIcon,
  Calendar01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppButton from '../../../components/ui/AppButton.vue'
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
import VehiculoServicioModal from '../components/VehiculoServicioModal.vue'

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
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader
      :title="$t('vehiculosServicio.title')"
      :subtitle="`${$t('vehiculosServicio.subtitle')} ${selectedGroup.nombre}`"
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
            <span>{{ $t('vehiculosServicio.btnNew') }}</span>
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <!-- Search -->
    <div class="flex flex-col md:flex-row gap-4 items-center">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch
          v-model="searchQuery"
          :placeholder="$t('vehiculosServicio.searchPlaceholder')"
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
        :empty-message="$t('vehiculosServicio.noResults', 'No se encontraron vehículos de servicio')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ $t('common.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

        <Column field="placa" :header="$t('vehiculosServicio.thPlate', 'Placa')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-wider">{{ data.placa || '---' }}</span>
              <div class="flex items-center gap-1.5 mt-1">
                <HugeiconsIcon :icon="FingerPrintIcon" :size="9" class="text-slate-400" />
                <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{{ data.serial_chasis || 'S/N' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="marca" :header="$t('vehiculosServicio.thBrand', 'Marca / Referencia')" sortable>
          <template #body="{ data }">
            <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 group/brand">
              <HugeiconsIcon :icon="Car01Icon" :size="13" class="text-slate-400 group-hover/brand:text-[#3b82f6] transition-colors" />
              <div class="flex flex-col">
                <span class="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">{{ data.marca || '---' }}</span>
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500">{{ data.referencia || '' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="tipo" :header="$t('vehiculosServicio.thType', 'Tipo')" sortable>
          <template #body="{ data }">
            <AppBadge :variant="Number(data.tipo) === 1 ? 'neutral' : 'info'">
              {{ Number(data.tipo) === 1 ? 'Carro' : Number(data.tipo) === 2 ? 'Moto' : '---' }}
            </AppBadge>
          </template>
        </Column>

        <Column field="modelo" :header="$t('vehiculosServicio.thModel', 'Modelo')" sortable>
          <template #body="{ data }">
            <span class="text-[13px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{{ data.modelo || '---' }}</span>
          </template>
        </Column>

        <Column field="cilindrada" :header="$t('vehiculosServicio.thCc', 'Cilindrada')" sortable>
          <template #body="{ data }">
            <span class="text-[13px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{{ data.cilindrada || 0 }}<span class="text-[11px] font-medium text-slate-400 ml-0.5">cc</span></span>
          </template>
        </Column>

        <Column field="color" :header="$t('vehiculosServicio.thColor', 'Color')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded-full border border-slate-200 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/10"
                :style="{ backgroundColor: data.color || '#cbd5e1' }"
              ></div>
              <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">{{ data.color || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="soat_vence" :header="$t('vehiculosServicio.thSoat', 'SOAT')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">{{ data.soat || '---' }}</span>
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

        <Column field="tecnomecanica_vence" :header="$t('vehiculosServicio.thTecnomecanica', 'Tecnomecánica')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">{{ data.tecnomecanica || '---' }}</span>
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

        <Column field="estado" :header="$t('vehiculosServicio.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <AppBadge
              :variant="data.estado === 1 ? 'success' : 'danger'"
            >
              {{ data.estado === 1 ? $t('vehiculosServicio.statusActive', 'Activo') : $t('vehiculosServicio.statusInactive', 'Inactivo') }}
            </AppBadge>
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
                @click="confirmDelete(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 hover:border-red-500/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Eliminar"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <AppPagination
        :totalRecords="filteredVehicles.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <!-- Delete Confirm Modal -->
    <AppDeleteConfirm
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      @confirm="deleteVehicle"
    >
      <template #message>
        {{ $t('vehiculosServicio.confirmDelete', '¿Está seguro de que desea eliminar este vehículo de servicio?') }}
      </template>
    </AppDeleteConfirm>

    <VehiculoServicioModal
      v-model:isOpen="isModalOpen"
      :vehicle="editingVehicle"
      @saved="handleModalSaved"
    />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

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

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.18); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.35); }

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
