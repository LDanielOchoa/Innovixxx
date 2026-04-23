<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { useGroup } from '../../../composables/useGroup'
import DataLayout from '../../../components/common/DataLayout.vue'
import BaseSearch from '../../../components/common/BaseSearch.vue'
import BasePagination from '../../../components/common/BasePagination.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import * as XLSX from 'xlsx'
import { 
  IconCpu, 
  IconPlus,
  IconChevronDown,
  IconEdit,
  IconTrash,
  IconTag,
  IconHash,
  IconDeviceComputerCamera,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconAlertCircle,
  IconMessageDots,
  IconBinary,
  IconLockOpen
} from '@tabler/icons-vue'
import { 
  fetchHardwareApi, 
  fetchFamiliasApi, 
  createHardwareApi, 
  updateHardwareApi, 
  deleteHardwareApi 
} from '../services/hardware.api'
import type { Hardware, FamiliaHardware } from '../types/hardware'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { selectedGroup } = useGroup()
const items = ref<Hardware[]>([])
const familias = ref<FamiliaHardware[]>([])
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
  descripcion: '',
  serial: '',
  imei: '',
  mac: '',
  id_familia: '' as string | number,
  numero_sms: '',
  id_binario: '',
  clave_open: ''
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

const fetchHardware = async () => {
  isLoading.value = true
  try {
    items.value = await fetchHardwareApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error fetching hardware:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchFamilias = async () => {
  try {
    familias.value = await fetchFamiliasApi()
  } catch (error) {
    console.error('Error fetching familias:', error)
  }
}

const openCreateModal = () => {
  modalMode.value = 'crear'
  modalMessage.value = null
  currentEditId.value = null
  formData.value = {
    nombre: '',
    descripcion: '',
    serial: '',
    imei: '',
    mac: '',
    id_familia: ''
  }
  isModalOpen.value = true
}

const openEditModal = (item: Hardware) => {
  modalMode.value = 'editar'
  modalMessage.value = null
  currentEditId.value = item.id_hardware
  
  // Buscar el id_familia basado en el nombre (item.familia) si id_familia no viene del API
  let familyId = item.id_familia || ''
  if (!familyId && item.familia) {
    const found = familias.value.find(f => f.nombre === item.familia)
    if (found) familyId = found.id_familia
  }

  formData.value = {
    nombre: item.nombre || '',
    descripcion: item.descripcion || '',
    serial: item.serial || '',
    imei: item.imei || '',
    mac: item.mac || '',
    id_familia: familyId,
    numero_sms: item.numero_sms || '',
    id_binario: item.id_binario || '',
    clave_open: item.clave_open || ''
  }
  
  isModalOpen.value = true
}

const saveHardware = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  modalMessage.value = null

  try {
    const isEditing = modalMode.value === 'editar'
    const payload: any = {
      serial: formData.value.serial,
      id_grupo: selectedGroup.value.id,
      id_familia: Number(formData.value.id_familia),
      nombre: formData.value.nombre,
      descripcion: formData.value.descripcion,
      imei: formData.value.imei,
      mac: formData.value.mac,
      estado: 0,
      id_ruta: isEditing ? "" : 0,
      numero_sms: formData.value.numero_sms,
      id_binario: formData.value.id_binario,
      clave_open: formData.value.clave_open
    }

    if (isEditing && currentEditId.value) {
      const data = await updateHardwareApi({ ...payload, id_hardware: currentEditId.value })
      if (data.done) {
        showModalMessage(t('hardware.alertSuccessUpdate'), 'success')
        await fetchHardware()
      } else {
        showModalMessage(data.message || t('hardware.alertErrorUpdate'), 'error')
      }
    } else {
      const data = await createHardwareApi(payload)
      if (data.done) {
        showModalMessage(t('hardware.alertSuccessCreate'), 'success')
        await fetchHardware()
      } else {
        showModalMessage(data.message || t('hardware.alertErrorCreate'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving hardware:', error)
      showModalMessage(t('hardware.alertNetError'), 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

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

const familyDropdownRef = ref<HTMLElement | null>(null)
const isFamilyDropdownOpen = ref(false)

const closeFamilyDropdownOnClickOutside = (e: MouseEvent) => {
  if (isFamilyDropdownOpen.value && familyDropdownRef.value && !familyDropdownRef.value.contains(e.target as Node)) {
    isFamilyDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchHardware()
  fetchFamilias()
  document.addEventListener('click', closeFamilyDropdownOnClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', closeFamilyDropdownOnClickOutside)
})

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

const sortKey = ref<keyof Hardware>('nombre')
const sortOrder = ref(1)

const toggleSort = (key: keyof Hardware) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value * -1
  } else {
    sortKey.value = key
    sortOrder.value = 1
  }
}

const sortedItems = computed(() => {
  return [...filteredItems.value].sort((a, b) => {
    let result = 0
    const valA = String(a[sortKey.value] || '').toLowerCase()
    const valB = String(b[sortKey.value] || '').toLowerCase()
    if (valA < valB) result = -1
    if (valA > valB) result = 1
    return result * sortOrder.value
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedItems.value.slice(start, end)
})

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchHardware()
})
</script>

<template>
  <DataLayout class="theme-sync"
      :title="$t('hardware.title') || 'Hardware'"
      :subtitle="`${$t('hardware.subtitle') || 'Gestión de dispositivos para'} ${selectedGroup.nombre}`"
    >
    <template #actions>
      <button @click="exportToExcel" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white dark:bg-[#16191D] hover:bg-slate-100 dark:hover:bg-[#2A313A] text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-lg transition-all duration-200 border border-slate-200 dark:border-[#2A313A] shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconDownload :size="18" />
        <span class="hidden sm:inline">{{ $t('hardware.btnExport') || 'Exportar' }}</span>
      </button>
      <button @click="openCreateModal" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-[#60a5fa] dark:bg-[#2A313A] hover:bg-[#3b82f6] dark:hover:bg-[#343B45] text-white px-5 py-2.5 rounded-lg transition-all duration-200 border border-[#60a5fa] dark:border-slate-700/50 shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconPlus :size="18" />
        <span>{{ $t('hardware.btnNew') || 'Nuevo Dispositivo' }}</span>
      </button>
    </template>

    <template #search>
      <BaseSearch v-model="searchQuery" :placeholder="$t('hardware.searchPlaceholder') || 'Buscar nombre, serial, IMEI, MAC...'" />
    </template>

    <div class="w-full overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-[#2A313A]/50 bg-white dark:bg-[#1E2228] shadow-sm">
      <table class="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr class="bg-slate-50/90 dark:bg-[#151A20]/90 border-b border-slate-200 dark:border-[#2A313A]">
            <th @click="toggleSort('nombre')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('hardware.thName') || 'Dispositivo' }}
                <IconChevronDown v-if="sortKey === 'nombre'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('serial')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('hardware.thIdentifiers') || 'Identificadores' }}
                <IconChevronDown v-if="sortKey === 'serial'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('familia')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('hardware.thFamily') || 'Familia' }}
                <IconChevronDown v-if="sortKey === 'familia'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('estado')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('hardware.thStatus') || 'Estado' }}
                <IconChevronDown v-if="sortKey === 'estado'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Acciones</th>
          </tr>
        </thead>
        <Transition mode="out-in" name="fade">
          <tbody v-if="isLoading" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="i in 5" :key="'skeleton-'+i" class="border-b border-slate-200 dark:border-[#2A313A]/50 animate-pulse">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-slate-200 dark:bg-[#2A313A]/60 rounded-full"></div>
                  <div class="flex flex-col gap-2">
                    <div class="h-3 w-32 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
                    <div class="h-2 w-16 bg-slate-300 dark:bg-[#2A313A]/40 rounded"></div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-28 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
                  <div class="h-2 w-24 bg-slate-300 dark:bg-[#2A313A]/40 rounded"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                 <div class="h-4 w-16 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
              </td>
              <td class="px-6 py-4">
                 <div class="h-4 w-28 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A]/50 rounded"></div>
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A]/50 rounded"></div>
                </div>
              </td>
            </tr>
          </tbody>
          <TransitionGroup v-else-if="paginatedItems.length > 0" tag="tbody" name="table-rows" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="item in paginatedItems" :key="item.id_hardware" class="border-b border-slate-200 dark:border-[#2A313A]/50 hover:bg-slate-50 dark:hover:bg-[#22272E] transition-colors duration-150 group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#5da6fc]/10 to-transparent border border-[#5da6fc]/20 rounded-full flex items-center justify-center text-[#5da6fc] group-hover:scale-110 transition-transform">
                    <IconCpu :size="20" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-100 uppercase tracking-tight">{{ item.nombre || 'Desconocido' }}</span>
                    <span class="text-[11px] text-slate-400 capitalize">{{ item.descripcion || 'Sin descripción' }}</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span class="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 tracking-wider font-mono">SN: <span class="text-slate-700 dark:text-slate-200">{{ item.serial || '---' }}</span></span>
                  <span class="text-[10px] text-slate-400 font-mono">IMEI: {{ item.imei || '---' }}</span>
                  <span class="text-[10px] text-slate-500 font-mono">MAC: {{ item.mac || '---' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 bg-slate-100 dark:bg-[#1A1E23] border border-slate-200 dark:border-[#2A313A] rounded-md text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">{{ item.familia || 'Genérico' }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                  {{ item.estado || '---' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openEditModal(item)" class="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A313A] transition-colors" title="Editar"><IconEdit :size="18" /></button>
                  <button @click="confirmDelete(item.id_hardware)" class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar"><IconTrash :size="18" /></button>
                </div>
              </td>
            </tr>
          </TransitionGroup>
          <tbody v-else class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr key="empty-state">
              <td colspan="5" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center justify-center space-y-3">
                  <IconCpu :size="32" class="mb-2 text-slate-600" />
                  <p class="text-sm font-medium text-slate-400">{{ $t('hardware.noResults') || 'No se encontró hardware.' }}</p>
                  <p class="text-sm text-slate-500">{{ $t('hardware.noResultsHint') || 'Intenta cambiar el grupo seleccionado o ajusta tu búsqueda.' }}</p>
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
        :total-items="filteredItems.length"
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
        @confirm="deleteHardware"
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
        :title="modalMode === 'crear' ? ($t('hardware.modalTitleCreate') || 'Ingresar Dispositivo Hardware') : ($t('hardware.modalTitleEdit') || 'Actualizar Dispositivo Hardware')"
        :confirm-text="modalMode === 'crear' ? ($t('hardware.btnRegister') || 'Crear Hardware') : ($t('hardware.btnSave') || 'Guardar Cambios')"
        @confirm="saveHardware"
      >
        <template #icon>
          <IconCpu :size="20" class="text-[#5da6fc]" />
        </template>

        <form @submit.prevent="saveHardware" class="space-y-5 relative">

          <!-- Overlay de Carga -->
          <Transition name="loader-fade">
            <div v-if="isSubmitting" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
              <div class="flex flex-col items-center gap-4 p-8">
                <div class="relative flex items-center justify-center">
                  <div class="w-14 h-14 border-[3px] border-[#5da6fc]/10 border-t-[#5da6fc] rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <IconLoader2 :size="20" class="text-[#5da6fc] animate-pulse" />
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
                 class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase"
                 :class="{
                   'text-red-400 bg-red-400/5': modalMessage.type === 'error',
                   'text-amber-400 bg-amber-400/5': modalMessage.type === 'warning',
                   'text-[#5da6fc] bg-[#5da6fc]/5': modalMessage.type === 'success'
                 }">
                 <IconAlertCircle v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :size="14" />
                 <IconCheck v-else :size="14" class="text-[#5da6fc]" />
                 {{ modalMessage.text }}
            </div>
          </Transition>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelName') || 'Nombre (Alias)' }}</label>
              <div class="relative">
                <IconTag :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.nombre"
                  type="text" 
                  :placeholder="$t('hardware.placeholderName') || 'Ej: gps gl800 3'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm uppercase"
                  required
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelDescription') || 'Descripción' }}</label>
              <div class="relative">
                <IconTag :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.descripcion"
                  type="text" 
                  :placeholder="$t('hardware.placeholderDescription') || 'Ej: 10000 mah'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelSerial') || 'Serial' }}</label>
              <div class="relative">
                <IconHash :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.serial"
                  type="text" 
                  :placeholder="$t('hardware.placeholderSerial') || 'B123RZZR'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono tracking-wide uppercase"
                  required
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelImei') || 'IMEI' }}</label>
              <div class="relative">
                <IconHash :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.imei"
                  type="text" 
                  :placeholder="$t('hardware.placeholderImei') || '1234567...'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                  required
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelMac') || 'MAC' }}</label>
              <div class="relative">
                <IconHash :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.mac"
                  type="text" 
                  :placeholder="$t('hardware.placeholderMac') || 'sw:ki:pl...'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono lowercase"
                />
              </div>
            </div>
          </div>
          
          <!-- Nuevos Campos Técnicos -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Número SMS</label>
              <div class="relative">
                <IconMessageDots :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.numero_sms"
                  type="text" 
                  placeholder="Ej: 9103166133"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">ID Binario</label>
              <div class="relative">
                <IconBinary :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.id_binario"
                  type="text" 
                  placeholder="Ej: 2512001917"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                />
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Clave Open</label>
              <div class="relative">
                <IconLockOpen :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.clave_open"
                  type="text" 
                  placeholder="Ej: 888888"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Familia Receptora -->
          <div class="space-y-1.5" ref="familyDropdownRef">
            <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('hardware.labelFamily') || 'Familia Receptora' }}</label>
            <div class="relative">
              <IconDeviceComputerCamera :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
              <button 
                type="button"
                @click="isFamilyDropdownOpen = !isFamilyDropdownOpen"
                class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-left focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm text-slate-700 dark:text-slate-200"
              >
                <span v-if="formData.id_familia" class="truncate font-medium uppercase tracking-wider">{{ familias.find(f => f.id_familia === formData.id_familia)?.nombre }}</span>
                <span v-else class="text-slate-500 truncate">{{ $t('hardware.placeholderFamily') || 'Seleccione familia...' }}</span>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200" :class="{ 'rotate-180': isFamilyDropdownOpen }">
                 <IconChevronDown :size="16" class="text-slate-500" />
              </div>

              <Transition name="fade-slide">
                <div v-if="isFamilyDropdownOpen" class="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-2xl z-[150] overflow-hidden">
                  <div class="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                    <button 
                      v-for="familia in familias" 
                      :key="familia.id_familia"
                      type="button"
                      @click="formData.id_familia = familia.id_familia; isFamilyDropdownOpen = false"
                      class="w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors flex items-start justify-between group focus:outline-none"
                      :class="formData.id_familia === familia.id_familia ? 'bg-[#60a5fa]/10 dark:bg-[#5da6fc]/10 text-[#2563eb] dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A313A] hover:text-slate-800 dark:hover:text-white'"
                    >
                      <div class="flex flex-col">
                        <span class="font-bold uppercase tracking-wider" :class="formData.id_familia === familia.id_familia ? 'text-[#2563eb] dark:text-[#8fc3ff]' : 'text-slate-700 dark:text-slate-200'">{{ familia.nombre }}</span>
                        <span class="text-[10px] text-slate-500 mt-0.5 capitalize">{{ familia.descripcion }}</span>
                      </div>
                      <IconCheck v-if="formData.id_familia === familia.id_familia" :size="16" class="text-[#5da6fc] mt-0.5" />
                    </button>
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

.table-rows-enter-active,
.table-rows-leave-active,
.table-rows-move {
  transition: all 0.24s ease;
}

.table-rows-enter-from,
.table-rows-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* Overlay de Carga */
.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

/* Mensajes de Feedback */
.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }

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


