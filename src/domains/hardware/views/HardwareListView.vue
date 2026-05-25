<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon
} from '@hugeicons/core-free-icons'

import {
  fetchHardwareApi,
  deleteHardwareApi
} from '../services/hardware.api'
import type { Hardware } from '../types/hardware'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import HardwareFormModal from '../components/HardwareFormModal.vue'
import Column from 'primevue/column'

const { t } = useI18n()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)

const items = ref<Hardware[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

const fetchHardware = async () => {
  if (!selectedGroup.value?.id) {
    items.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    items.value = await fetchHardwareApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error fetching hardware:', error)
  } finally {
    isLoading.value = false
  }
}

// Modal de crear/editar
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
  if (!searchQuery.value) return items.value
  const query = searchQuery.value.toLowerCase()
  return items.value.filter(item =>
    (item.nombre?.toLowerCase().includes(query)) ||
    (item.serial?.toLowerCase().includes(query)) ||
    (item.imei?.toLowerCase().includes(query)) ||
    (item.mac?.toLowerCase().includes(query)) ||
    (item.familia?.toLowerCase().includes(query))
  )
})
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader
      :title="t('hardware.title') || 'Hardware'"
      :subtitle="`${t('hardware.subtitle') || 'Gestión de dispositivos para'} ${selectedGroup?.nombre || ''}`"
      :count="filteredItems.length"
    >
      <template #actions>
        <AppButton
          variant="secondary"
          :icon="Download01Icon"
          @click="exportToExcel"
        >
          <span>{{ t('hardware.btnExport') || 'Exportar' }}</span>
        </AppButton>

        <AppButton
          v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_CREATE)"
          variant="primary"
          :icon="PlusSignIcon"
          @click="openCreateModal"
        >
          <span>{{ t('hardware.btnNew') || 'Nuevo Dispositivo' }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Área de Búsqueda -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch
          v-model="searchQuery"
          :placeholder="t('hardware.searchPlaceholder') || 'Buscar nombre, serial, IMEI, MAC...'"
        />
      </div>
    </div>

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <AppTable
        :value="filteredItems"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('hardware.noResults') || 'No se encontró hardware.'"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('hardware.noResultsHint') || 'Intenta cambiar el grupo seleccionado o ajusta tu búsqueda.' }}</template>

        <Column field="nombre" header="Dispositivo" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">{{ data.nombre || 'Desconocido' }}</span>
              <span class="text-[11px] text-slate-500 capitalize mt-1">{{ data.descripcion || 'Sin descripción' }}</span>
            </div>
          </template>
        </Column>

        <Column field="serial" header="Identificadores" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[12px] font-bold text-emerald-500 dark:text-emerald-400 tracking-wider font-mono">SN: <span class="text-slate-700 dark:text-slate-200">{{ data.serial || '---' }}</span></span>
              <span class="text-[11px] text-slate-500 font-mono">IMEI: {{ data.imei || '---' }}</span>
              <span class="text-[11px] text-slate-500 font-mono">MAC: {{ data.mac || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="familia" header="Familia" sortable>
          <template #body="{ data }">
            <AppBadge variant="glass">
              <span class="text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                {{ data.familia || 'Genérico' }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <Column field="estado" header="Estado" sortable>
          <template #body="{ data }">
            <span class="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-tight">
              {{ data.estado || '---' }}
            </span>
          </template>
        </Column>

        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3">
              <button
                v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT)"
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button
                v-if="authStore.hasPermission(PERMISSIONS.HARDWARE_DELETE)"
                @click="confirmDelete(data.id_hardware)"
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
        :totalRecords="filteredItems.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      :item-name="items.find(i => i.id_hardware === itemToDelete)?.nombre"
      @confirm="deleteHardware"
    >
      <template #question>
        {{ t('common.confirmDeleteMsg') || '¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.' }}
      </template>
    </AppDeleteConfirm>

    <!-- Modal Crear/Editar Hardware -->
    <HardwareFormModal
      v-model:is-open="isFormModalOpen"
      :edit-item="editItem"
      @saved="handleSaved"
    />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

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

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #11151a;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2a313a;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #343b45;
}
</style>
