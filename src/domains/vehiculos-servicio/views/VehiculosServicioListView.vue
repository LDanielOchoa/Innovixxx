<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'

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
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('vehiculosServicio.title')" 
      :count="filteredVehicles.length" 
      :icon="Car01Icon"
    >
      <template #actions>
        <button 
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('vehiculosServicio.btnNew') }}</span>
        </button>
        <button class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all">
          <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Search Toolbar -->
    <SearchToolbar v-model="searchQuery" :placeholder="t('vehiculosServicio.searchPlaceholder')" searchWidth="sm:w-[28rem]">
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
              {{ Number(data.tipo) === 1 ? 'Carro' : Number(data.tipo) === 2 ? 'Moto' : data.tipo || '---' }}
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

        <Column field="color" :header="t('vehiculosServicio.thColor', 'Color')" sortable>
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

        <Column :header="t('vehiculosServicio.thActions', 'Acciones')" headerStyle="width: 12rem" class="text-right" alignHeader="right">
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
                  onClick: () => confirmDelete(data),
                  show: true
                }
              ]"
              :show-more="true"
            />
          </template>
        </Column>
      </AppTable>

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

<style scoped>
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
