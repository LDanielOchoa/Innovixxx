<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useGroup } from '../../../composables/useGroup'
import DataLayout from '../../../components/common/DataLayout.vue'
import BaseSearch from '../../../components/common/BaseSearch.vue'
import BasePagination from '../../../components/common/BasePagination.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import * as XLSX from 'xlsx'
import { 
  IconCar, 
  IconPlus,
  IconHash,
  IconTag,
  IconTruck,
  IconChevronDown,
  IconCheck,
  IconEdit,
  IconTrash,
  IconDownload,
  IconLoader2,
  IconAlertCircle
} from '@tabler/icons-vue'
import { 
  fetchVehiculosApi, 
  fetchVehicleTypesApi, 
  createVehiculoApi, 
  updateVehiculoApi, 
  deleteVehiculoApi 
} from '../services/vehiculos.api'
import type { Vehiculo, TipoVehiculo } from '../types/vehiculo'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { selectedGroup } = useGroup()
const vehicles = ref<Vehiculo[]>([])
const vehicleTypes = ref<TipoVehiculo[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const isModalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')
const currentEditId = ref<string | null>(null)

const formData = ref({
  nombre: '',
  placa: '',
  serial: '',
  tipo: '' as number | string
})

const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

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

const fetchTypes = async () => {
  try {
    vehicleTypes.value = await fetchVehicleTypesApi()
  } catch (error) {
    console.error('Error fetching vehicle types:', error)
  }
}

const openCreateModal = () => {
  modalMode.value = 'crear'
  modalMessage.value = null
  currentEditId.value = null
  formData.value = { nombre: '', placa: '', serial: '', tipo: '' }
  isModalOpen.value = true
}

const openEditModal = (vehicle: Vehiculo) => {
  modalMode.value = 'editar'
  modalMessage.value = null
  currentEditId.value = vehicle.id_vehiculo
  
  const tipoEncontrado = vehicleTypes.value.find(t => t.nombre === vehicle.tipo || t.id_tipo === vehicle.tipo)
  
  formData.value = {
    nombre: vehicle.nombre,
    placa: vehicle.placa,
    serial: vehicle.serial || '',
    tipo: tipoEncontrado ? tipoEncontrado.id_tipo : (typeof vehicle.tipo === 'number' ? vehicle.tipo : '')
  }
  isModalOpen.value = true
}

const saveVehicle = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  modalMessage.value = null
  
  try {
    const isEditing = modalMode.value === 'editar'
    const payload = {
      ...formData.value,
      id_grupo: selectedGroup.value.id
    }

    if (isEditing && currentEditId.value) {
      const data = await updateVehiculoApi({ ...payload, id_vehiculo: currentEditId.value })
      if (data.done) {
        showModalMessage(t('vehiculos.alertSuccessUpdate'), 'success')
        await fetchVehicles()
      } else {
        showModalMessage(data.message || t('vehiculos.alertErrorUpdate'), 'error')
      }
    } else {
      const data = await createVehiculoApi(payload)
      if (data.done) {
        showModalMessage(t('vehiculos.alertSuccessCreate'), 'success')
        await fetchVehicles()
      } else {
        showModalMessage(data.message || t('vehiculos.alertErrorCreate'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving vehicle:', error)
      showModalMessage('Error de red al procesar la solicitud', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
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

const typeDropdownRef = ref<HTMLElement | null>(null)
const isTypeDropdownOpen = ref(false)

const closeTypeDropdownOnClickOutside = (e: MouseEvent) => {
  if (isTypeDropdownOpen.value && typeDropdownRef.value && !typeDropdownRef.value.contains(e.target as Node)) {
    isTypeDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchVehicles()
  fetchTypes()
  document.addEventListener('click', closeTypeDropdownOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeTypeDropdownOnClickOutside)
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

const sortKey = ref<keyof Vehiculo>('nombre')
const sortOrder = ref(1)

const toggleSort = (key: keyof Vehiculo) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value * -1
  } else {
    sortKey.value = key
    sortOrder.value = 1
  }
}

const sortedVehicles = computed(() => {
  return [...filteredVehicles.value].sort((a, b) => {
    let result = 0
    const valA = String(a[sortKey.value] || '').toLowerCase()
    const valB = String(b[sortKey.value] || '').toLowerCase()
    if (valA < valB) result = -1
    if (valA > valB) result = 1
    return result * sortOrder.value
  })
})

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedVehicles.value.slice(start, end)
})

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchVehicles()
})
</script>

<template>
  <DataLayout class="theme-sync"
      :title="$t('vehiculos.title') || 'Vehículos'"
      :subtitle="`${$t('vehiculos.subtitle') || 'Gestión de flota para'} ${selectedGroup.nombre}`"
    >
    <template #actions>
      <button @click="exportToExcel" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white dark:bg-[#1E2228] hover:bg-slate-100 dark:hover:bg-[#2A313A] text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-lg transition-all duration-200 border border-slate-200 dark:border-[#2A313A] shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconDownload :size="18" />
        <span class="hidden sm:inline">{{ $t('vehiculos.btnExport') || 'Exportar' }}</span>
      </button>
      <button @click="openCreateModal" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-[#60a5fa] hover:bg-[#3b82f6] text-white px-5 py-2.5 rounded-lg transition-all duration-200 border border-[#60a5fa] shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconPlus :size="18" />
        <span>{{ $t('vehiculos.btnNew') || 'Nuevo Vehículo' }}</span>
      </button>
    </template>

    <template #search>
      <BaseSearch v-model="searchQuery" :placeholder="$t('vehiculos.searchPlaceholder') || 'Buscar por placa, nombre o serial...'" />
    </template>

    <div class="w-full overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-[#2A313A] bg-white dark:bg-[#1E2228] shadow-sm">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-50/90 dark:bg-[#16191D]/80 border-b border-slate-200 dark:border-[#2A313A]">
            <th @click="toggleSort('nombre')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('vehiculos.thName') || 'Vehículo' }}
                <IconChevronDown v-if="sortKey === 'nombre'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('placa')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('vehiculos.thPlate') || 'Placa / Serial' }}
                <IconChevronDown v-if="sortKey === 'placa'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('tipo')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('vehiculos.thType') || 'Tipo' }}
                <IconChevronDown v-if="sortKey === 'tipo'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Acciones</th>
          </tr>
        </thead>
        <Transition mode="out-in" name="fade">
          <tbody v-if="isLoading" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="i in 5" :key="'skeleton-'+i" class="border-b border-slate-200 dark:border-[#2A313A] animate-pulse">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-slate-200 dark:bg-[#2A313A] rounded-full"></div>
                  <div class="h-4 w-32 bg-slate-200 dark:bg-[#2A313A] rounded"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 w-24 bg-slate-200 dark:bg-[#2A313A] rounded"></div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 w-32 bg-slate-200 dark:bg-[#2A313A] rounded"></div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A] rounded"></div>
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A] rounded"></div>
                </div>
              </td>
            </tr>
          </tbody>
          <TransitionGroup v-else-if="paginatedVehicles.length > 0" tag="tbody" name="table-rows" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="vehicle in paginatedVehicles" :key="vehicle.id_vehiculo" class="border-b border-slate-200 dark:border-[#2A313A] hover:bg-slate-50 dark:hover:bg-[#22272E] transition-colors duration-150 group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#5da6fc]/10 to-transparent border border-[#5da6fc]/20 rounded-full flex items-center justify-center text-[#5da6fc] group-hover:scale-110 transition-transform">
                    <IconCar :size="20" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-slate-700 dark:text-slate-100 tracking-tight">{{ vehicle.nombre || 'Vehículo sin nombre' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{{ vehicle.placa || '---' }}</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{{ vehicle.serial || 'No Serial' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs text-slate-400 dark:text-slate-500 max-w-[200px] truncate block italic">{{ vehicle.tipo || 'General' }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openEditModal(vehicle)" class="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A313A] transition-colors" title="Editar"><IconEdit :size="18" /></button>
                  <button @click="confirmDelete(vehicle.id_vehiculo)" class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar"><IconTrash :size="18" /></button>
                </div>
              </td>
            </tr>
          </TransitionGroup>
          <tbody v-else class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr key="empty-state">
              <td colspan="4" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center justify-center space-y-3">
                <IconCar :size="32" class="mb-2 text-slate-600 dark:text-slate-500" />
                <p class="text-sm font-medium text-slate-400 dark:text-slate-400">{{ $t('vehiculos.noResults') || 'No se encontraron vehículos.' }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-500">{{ $t('vehiculos.noResultsHint') || 'Intenta cambiar el grupo seleccionado o ajusta tu búsqueda.' }}</p>
              </div>
            </td>
            </tr>
          </tbody>
        </Transition>
      </table>
    </div>

    <template #pagination>
      <BasePagination 
        v-model:current-page="currentPage"
        :total-items="filteredVehicles.length"
        :items-per-page="itemsPerPage"
      />
    </template>

    <template #modals>
      <BaseModal 
        v-model:is-open="isDeleteModalOpen"
        :title="$t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
        :confirm-text="$t('common.delete') || 'Eliminar'"
        :cancel-text="$t('common.cancel') || 'Cancelar'"
        confirmButtonClass="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
        @confirm="deleteVehicle"
      >
        <template #icon>
          <IconAlertCircle :size="20" class="text-red-400" />
        </template>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {{ $t('common.confirmDeleteMsg') || '¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.' }}
        </p>
      </BaseModal>

      <BaseModal 
        v-model:is-open="isModalOpen"
        :title="modalMode === 'crear' ? ($t('vehiculos.modalTitleCreate') || 'Crear Nuevo Vehículo') : ($t('vehiculos.modalTitleEdit') || 'Actualizar Vehículo')"
        :confirm-text="modalMode === 'crear' ? ($t('vehiculos.btnRegister') || 'Crear Vehículo') : ($t('vehiculos.btnSave') || 'Guardar Cambios')"
        @confirm="saveVehicle"
      >
        <template #icon>
          <IconCar :size="20" class="text-[#60a5fa] dark:text-[#5da6fc]" />
        </template>

        <form @submit.prevent="saveVehicle" class="space-y-5 relative">

          <!-- Overlay de Carga -->
          <Transition name="loader-fade">
            <div v-if="isSubmitting" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
              <div class="flex flex-col items-center gap-4 p-8">
                <div class="relative flex items-center justify-center">
                  <div class="w-14 h-14 border-[3px] border-[#60a5fa]/15 dark:border-[#5da6fc]/10 border-t-[#60a5fa] dark:border-t-[#5da6fc] rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <IconLoader2 :size="20" class="text-[#60a5fa] dark:text-[#5da6fc] animate-pulse" />
                  </div>
                </div>
                <p class="text-[10px] font-bold text-slate-500 dark:text-white/50 tracking-[0.2em] uppercase animate-pulse">
                  {{ modalMode === 'crear' ? 'Registrando' : 'Actualizando' }}
                </p>
              </div>
            </div>
          </Transition>

          <!-- Feedback Minimalista -->
          <Transition name="message-fade">
            <div v-if="modalMessage && !isSubmitting"
                 class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase transition-all duration-300"
                 :class="{
                   'text-red-500 dark:text-red-400 bg-red-500/10 dark:bg-red-400/5': modalMessage.type === 'error',
                   'text-amber-500 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/5': modalMessage.type === 'warning',
                   'text-[#60a5fa] dark:text-[#5da6fc] bg-[#60a5fa]/10 dark:bg-[#5da6fc]/5': modalMessage.type === 'success'
                 }">
                 <IconAlertCircle v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :size="14" />
                 <IconCheck v-else :size="14" class="text-[#60a5fa] dark:text-[#5da6fc]" />
                 {{ modalMessage.text }}
            </div>
          </Transition>

          <!-- Nombre -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{{ $t('vehiculos.labelName') || 'Nombre del Vehículo' }}</label>
            <div class="relative">
              <IconTag :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input 
                v-model="formData.nombre"
                type="text" 
                :placeholder="$t('vehiculos.placeholderName') || 'Ej: Camioneta de Reparto 01'"
                class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#1E2228] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-slate-500/40 focus:border-[#60a5fa]/50 dark:focus:border-slate-500 transition-all sm:text-sm"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Placa -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{{ $t('vehiculos.labelPlate') || 'Placa' }}</label>
              <div class="relative">
                <IconHash :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input 
                  v-model="formData.placa"
                  type="text" 
                  :placeholder="$t('vehiculos.placeholderPlate') || 'Ej: ABC-123'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#1E2228] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-slate-500/40 focus:border-[#60a5fa]/50 dark:focus:border-slate-500 transition-all sm:text-sm uppercase"
                  required
                />
              </div>
            </div>

            <!-- Serial -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{{ $t('vehiculos.labelSerial') || 'Serial' }}</label>
              <div class="relative">
                <IconHash :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input 
                  v-model="formData.serial"
                  type="text" 
                  :placeholder="$t('vehiculos.placeholderSerial') || 'Ej: SN-45678'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#1E2228] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-slate-500/40 focus:border-[#60a5fa]/50 dark:focus:border-slate-500 transition-all sm:text-sm uppercase"
                />
              </div>
            </div>
          </div>

          <!-- Tipo de Vehículo -->
          <div class="space-y-1.5" ref="typeDropdownRef">
            <label class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{{ $t('vehiculos.labelType') || 'Tipo de Vehículo' }}</label>
            <div class="relative">
              <IconTruck :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 z-10" />
              <button 
                type="button"
                @click="isTypeDropdownOpen = !isTypeDropdownOpen"
                class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#1E2228] text-left focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-slate-500/40 focus:border-[#60a5fa]/50 dark:focus:border-slate-500 transition-all sm:text-sm text-slate-700 dark:text-slate-200"
              >
                <span v-if="formData.tipo" class="truncate font-medium">{{ vehicleTypes.find(t => t.id_tipo === formData.tipo)?.nombre }}</span>
                <span v-else class="text-slate-500 dark:text-slate-400 truncate">{{ $t('vehiculos.placeholderType') || 'Seleccione un tipo...' }}</span>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200" :class="{ 'rotate-180': isTypeDropdownOpen }">
                 <IconChevronDown :size="16" class="text-slate-500 dark:text-slate-400" />
              </div>

              <Transition name="fade-slide">
                <div v-if="isTypeDropdownOpen" class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-2xl z-[150] overflow-hidden">
                  <div class="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 relative z-[151]">
                    <button 
                      v-for="type in vehicleTypes" 
                      :key="type.id_tipo"
                      type="button"
                      @click="formData.tipo = type.id_tipo; isTypeDropdownOpen = false"
                      class="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between group focus:outline-none"
                      :class="formData.tipo === type.id_tipo ? 'bg-[#60a5fa]/10 dark:bg-[#5da6fc]/10 text-[#2563eb] dark:text-[#9dccff]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A313A] hover:text-slate-800 dark:hover:text-slate-200'"
                    >
                      <span class="truncate pr-2 font-medium">{{ type.nombre }}</span>
                      <IconCheck v-if="formData.tipo === type.id_tipo" :size="14" class="text-[#60a5fa] dark:text-[#5da6fc] shrink-0" stroke-width="3" />
                    </button>
                    <div v-if="vehicleTypes.length === 0" class="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      Cargando tipos de vehículo...
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

        </form>
      </BaseModal>
    </template>
  </DataLayout>
</template>

<style scoped>
.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #60a5fa; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5da6fc; }

.table-rows-enter-active, .table-rows-leave-active, .table-rows-move { transition: all 0.24s ease; }
.table-rows-enter-from, .table-rows-leave-to { opacity: 0; transform: translateY(8px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Overlay de Carga */
.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

/* Mensajes de Feedback */
.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }

.theme-sync,
.theme-sync * {
  transition-property: background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: ease;
}

.theme-sync .animate-pulse,
.theme-sync .animate-pulse * {
  transition: none !important;
}
</style>


