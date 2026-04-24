<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Add01Icon, 
  Search01Icon, 
  Car01Icon, 
  Download01Icon, 
  Sorting05Icon, 
  ArrowDown01Icon, 
  ArrowUp01Icon, 
  Edit02Icon, 
  Delete01Icon, 
  Tick01Icon, 
  Alert01Icon,
  Refresh01Icon,
  TruckIcon,
  FingerPrintIcon,
  LicenseIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import BaseModal from '../../../components/common/BaseModal.vue'
import AppSearch from '../../../components/common/AppSearch.vue'
import AppTableCard from '../../../components/common/AppTableCard.vue'
import AppPageHeader from '../../../components/common/AppPageHeader.vue'
import AppButton from '../../../components/common/AppButton.vue'
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
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
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

const visiblePages = computed(() => {
  const total = Math.max(1, Math.ceil(filteredVehicles.value.length / itemsPerPage.value))
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredVehicles.value.length / itemsPerPage.value)))

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchVehicles()
})
</script>

<<template>
  <div class="p-4 md:p-8 space-y-8 bg-[#F8FAFC] dark:bg-[#0A0C10] min-h-screen animate-fade-in font-inter">
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

    <!-- Search -->
    <AppSearch 
      v-model="searchQuery" 
      :placeholder="$t('vehiculos.searchPlaceholder')"
    />

    <!-- Table Card -->
    <AppTableCard>
      <div class="overflow-x-auto scrollbar-hide">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-transparent border-b border-slate-200/60 dark:border-white/5">
              <th class="px-6 py-5">
                <button @click="toggleSort('nombre')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('vehiculos.thName') }}
                  <HugeiconsIcon :icon="sortKey === 'nombre' ? (sortOrder === 1 ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5">
                <button @click="toggleSort('placa')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('vehiculos.thPlate') }}
                  <HugeiconsIcon :icon="sortKey === 'placa' ? (sortOrder === 1 ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5">
                <button @click="toggleSort('tipo')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('vehiculos.thType') }}
                  <HugeiconsIcon :icon="sortKey === 'tipo' ? (sortOrder === 1 ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5 text-right text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100/50 dark:divide-white/5">
            <template v-if="isLoading">
              <tr v-for="n in 5" :key="`skeleton-${n}`" class="animate-pulse">
                <td class="px-6 py-5"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5"></div><div class="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded"></div></div></td>
                <td class="px-6 py-5"><div class="h-4 w-24 bg-slate-100 dark:bg-white/5 rounded"></div></td>
                <td class="px-6 py-5"><div class="h-4 w-28 bg-slate-100 dark:bg-white/5 rounded"></div></td>
                <td class="px-6 py-5"><div class="flex justify-end gap-2"><div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5"></div></div></td>
              </tr>
            </template>
            <template v-else-if="sortedVehicles.length > 0">
              <tr 
                v-for="vehicle in sortedVehicles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)" 
                :key="vehicle.id_vehiculo" 
                class="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all duration-200 group cursor-default"
              >
                <td class="px-6 py-5">
                  <div class="flex items-center gap-4 group/avatar">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white border border-white dark:border-white/10 flex items-center justify-center transition-transform duration-300 group-hover/avatar:scale-110 shadow-sm">
                      <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="1.8" />
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ vehicle.nombre || 'Vehículo' }}</span>
                      <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest truncate">{{ vehicle.id_vehiculo }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="flex flex-col">
                    <span class="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ vehicle.placa || '---' }}</span>
                    <div class="flex items-center gap-1.5 mt-1 opacity-60">
                      <HugeiconsIcon :icon="FingerPrintIcon" :size="10" />
                      <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{{ vehicle.serial || 'S/N' }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 group/type">
                    <HugeiconsIcon :icon="TruckIcon" :size="14" class="text-slate-400 group-hover/type:text-[#3b82f6] transition-colors" />
                    <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
                      {{ vehicle.tipo || 'General' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                    <button @click="openEditModal(vehicle)" class="p-2 rounded-xl text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all active:scale-90" title="Editar">
                      <HugeiconsIcon :icon="Edit02Icon" :size="18" />
                    </button>
                    <button @click="confirmDelete(vehicle.id_vehiculo)" class="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90" title="Eliminar">
                      <HugeiconsIcon :icon="Delete01Icon" :size="18" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="4" class="px-6 py-20 text-center">
                <div class="flex flex-col items-center justify-center opacity-50">
                  <HugeiconsIcon :icon="Search01Icon" :size="48" class="text-slate-300 dark:text-slate-600 mb-4" />
                  <p class="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{{ $t('vehiculos.noResults') }}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="filteredVehicles.length > 0" class="px-6 py-4 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-4 flex-wrap bg-white/30 dark:bg-black/20 backdrop-blur-md">
        <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredVehicles.length) }}
          <span class="text-slate-300 dark:text-slate-600 px-1">de</span>
          {{ filteredVehicles.length }}
        </p>

        <div v-if="totalPages > 1" class="flex items-center gap-1">
          <button @click="currentPage > 1 && currentPage--" :disabled="currentPage === 1" class="pagination-btn">
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" stroke-width="2.5" />
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="pagination-ellipsis">…</span>
            <button v-else @click="currentPage = p" :class="['pagination-btn', currentPage === p ? 'pagination-btn--active' : '']">{{ p }}</button>
          </template>
          <button @click="currentPage < totalPages && currentPage++" :disabled="currentPage === totalPages" class="pagination-btn">
            <HugeiconsIcon :icon="ArrowRight01Icon" :size="16" stroke-width="2.5" />
          </button>
        </div>
      </div>
    </AppTableCard>

    <!-- Modals -->
    <BaseModal 
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      :showFooter="false"
      @confirm="deleteVehicle"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-sm">
          <HugeiconsIcon :icon="Alert01Icon" :size="20" class="text-red-500" />
        </div>
      </template>
      <div class="py-4 text-center">
        <p class="text-sm text-slate-600 dark:text-slate-300 font-medium">
          {{ $t('common.confirmDeleteMsg') }}
        </p>
        <div class="flex items-center gap-4 mt-8">
          <AppButton variant="secondary" class="flex-1 !rounded-2xl" @click="isDeleteModalOpen = false">{{ $t('common.cancel') }}</AppButton>
          <AppButton variant="primary" class="flex-1 !rounded-2xl !bg-red-500 !border-red-500 shadow-red-500/20" @click="deleteVehicle">{{ $t('common.delete') }}</AppButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal 
      v-model:isOpen="isModalOpen"
      :title="modalMode === 'crear' ? ($t('vehiculos.modalTitleCreate') || 'Nuevo Vehículo') : ($t('vehiculos.modalTitleEdit') || 'Editar Vehículo')"
      :showFooter="false"
      @confirm="saveVehicle"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
          <HugeiconsIcon :icon="Car01Icon" :size="20" class="text-[#3b82f6]" />
        </div>
      </template>

      <form @submit.prevent="saveVehicle" class="space-y-6 relative py-2">
        <!-- Overlay de Carga -->
        <Transition name="loader-fade">
          <div v-if="isSubmitting" class="absolute -inset-6 z-[100] flex items-center justify-center bg-white/80 dark:bg-[#0F1216]/95 backdrop-blur-xl rounded-2xl overflow-hidden pointer-events-auto">
            <div class="flex flex-col items-center gap-5 p-8 text-center">
              <div class="relative flex items-center justify-center">
                <div class="w-16 h-16 border-[3px] border-[#3b82f6]/10 border-t-[#3b82f6] rounded-full animate-spin"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <HugeiconsIcon :icon="Refresh01Icon" :size="24" class="text-[#3b82f6] animate-pulse" />
                </div>
              </div>
              <div class="space-y-1">
                <p class="text-[11px] font-black text-[#3b82f6] tracking-[0.3em] uppercase animate-pulse">
                  Procesando
                </p>
                <p class="text-[9px] font-medium text-slate-400 dark:text-slate-500 tracking-wider">Por favor, espera...</p>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Feedback -->
        <Transition name="message-fade">
          <div v-if="modalMessage && !isSubmitting" 
               class="flex items-center gap-2 py-2.5 px-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 mb-6 border border-current/10"
               :class="{
                 'text-red-500 bg-red-500/5 border-red-500/10': modalMessage.type === 'error',
                 'text-amber-500 bg-amber-500/5 border-amber-500/10': modalMessage.type === 'warning',
                 'text-[#3b82f6] bg-[#3b82f6]/5 border-[#3b82f6]/10': modalMessage.type === 'success'
               }">
                <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="14" />
                <HugeiconsIcon v-else :icon="Tick01Icon" :size="14" class="text-[#3b82f6]" />
                {{ modalMessage.text }}
          </div>
        </Transition>

        <div class="space-y-2">
          <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculos.labelName') }}</label>
          <div class="relative group/input">
            <HugeiconsIcon :icon="LicenseIcon" :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-[#3b82f6] transition-colors" />
            <input 
              v-model="formData.nombre"
              type="text" 
              required
              :placeholder="$t('vehiculos.placeholderName')" 
              class="block w-full px-5 py-3.5 pl-12 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5 dark:focus:ring-[#3b82f6]/5 focus:border-[#3b82f6]/40 dark:focus:border-[#3b82f6]/40 transition-all duration-300 font-bold text-sm"
            >
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculos.labelPlate') }}</label>
            <input 
              v-model="formData.placa"
              type="text" 
              required
              class="block w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5 focus:border-[#3b82f6]/40 transition-all duration-300 font-bold text-sm uppercase text-center tracking-widest"
            >
          </div>
          <div class="space-y-2">
            <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculos.labelSerial') }}</label>
            <input 
              v-model="formData.serial"
              type="text" 
              class="block w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5 focus:border-[#3b82f6]/40 transition-all duration-300 font-bold text-sm uppercase text-center tracking-widest"
            >
          </div>
        </div>

        <div class="space-y-2" ref="typeDropdownRef">
          <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculos.labelType') }}</label>
          <div class="relative z-50">
             <div 
              @click="isTypeDropdownOpen = !isTypeDropdownOpen" 
              class="w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white cursor-pointer flex justify-between items-center transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.05]"
            >
               <div class="flex items-center gap-3">
                 <HugeiconsIcon :icon="TruckIcon" :size="16" class="text-slate-400 dark:text-slate-500" />
                 <span class="text-sm font-bold truncate" :class="formData.tipo ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'">
                   {{ vehicleTypes.find(t => t.id_tipo === formData.tipo)?.nombre || $t('vehiculos.placeholderType') }}
                 </span>
               </div>
               <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 transition-transform duration-300" :class="{ 'rotate-180': isTypeDropdownOpen }" />
            </div>
            
            <Transition name="fade-slide">
              <div v-if="isTypeDropdownOpen" class="absolute left-0 right-0 mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl bg-opacity-95">
                <ul class="max-h-56 overflow-y-auto custom-scrollbar p-1.5">
                  <li 
                    v-for="type in vehicleTypes" 
                    :key="type.id_tipo" 
                    @click="formData.tipo = type.id_tipo; isTypeDropdownOpen = false" 
                    class="px-4 py-2.5 text-[13px] font-bold rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between group/opt"
                    :class="formData.tipo === type.id_tipo ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'"
                  >
                    <span>{{ type.nombre }}</span>
                    <HugeiconsIcon v-if="formData.tipo === type.id_tipo" :icon="Tick01Icon" :size="14" />
                  </li>
                </ul>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-white/5 mt-4">
          <AppButton type="button" variant="secondary" class="flex-1 !rounded-2xl" @click="isModalOpen = false">{{ $t('vehiculos.btnCancel') || 'Cancelar' }}</AppButton>
          <AppButton type="submit" variant="primary" class="flex-1 !rounded-2xl shadow-blue-500/20" :loading="isSubmitting">{{ modalMode === 'crear' ? $t('vehiculos.btnRegister') : $t('vehiculos.btnSave') }}</AppButton>
        </div>
      </form>
    </BaseModal>
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

.pagination-btn {
  @apply w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-black transition-all duration-200 border border-transparent;
  @apply text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5;
}

.pagination-btn--active {
  @apply bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20 border-[#3b82f6];
}

.pagination-ellipsis {
  @apply w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-600 text-[10px] font-bold;
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

/* Overlay de Carga */
.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

/* Mensajes de Feedback */
.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>


