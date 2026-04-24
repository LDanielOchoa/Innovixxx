<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import DataLayout from '../../../components/common/DataLayout.vue'
import BaseSearch from '../../../components/common/BaseSearch.vue'
import BasePagination from '../../../components/common/BasePagination.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import * as XLSX from 'xlsx'
import { 
  IconShieldCheck, 
  IconPlus,
  IconUser,
  IconIdBadge2,
  IconMail,
  IconDeviceMobile,
  IconEdit,
  IconTrash,
  IconCheck,
  IconMessageCircle,
  IconChevronDown,
  IconDownload,
  IconLoader2,
  IconAlertCircle
} from '@tabler/icons-vue'
import { 
  fetchEscoltasApi, 
  createEscoltaApi, 
  updateEscoltaApi, 
  deleteEscoltaApi, 
  preValidateEscoltaApi, 
  postValidateEscoltaApi 
} from '../services/escoltas.api'
import type { Escolta } from '../types/escolta'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const escoltas = ref<Escolta[]>([])
const isLoading = ref(true)
const saving = ref(false)
const searchQuery = ref('')

const isModalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')
const currentEditId = ref<string | null>(null)

const formData = ref({
  nombre: '',
  cedula: '',
  email: '',
  celular: ''
})

const isValidatingModalOpen = ref(false)
const currentValidateEscolta = ref<Escolta | null>(null)
const smsCodeGenerated = ref<string | null>(null)
const smsCodeInput = ref('')
const isValidating = ref(false)

const currentPage = ref(1)
const itemsPerPage = ref(10)

const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const validateMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => { if (modalMessage.value?.text === text) modalMessage.value = null }, 4000)
  }
}

const showValidateMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  validateMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => { if (validateMessage.value?.text === text) validateMessage.value = null }, 4000)
  }
}

const fetchEscoltas = async () => {
  isLoading.value = true
  try {
    escoltas.value = await fetchEscoltasApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error fetching escoltas:', error)
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  modalMode.value = 'crear'
  modalMessage.value = null
  formData.value = { nombre: '', cedula: '', email: '', celular: '' }
  isModalOpen.value = true
}

const openEditModal = (escolta: Escolta) => {
  modalMode.value = 'editar'
  modalMessage.value = null
  currentEditId.value = escolta.id_escolta
  formData.value = {
    nombre: escolta.nombre || '',
    cedula: escolta.cedula || '',
    email: escolta.email || '',
    celular: escolta.celular || ''
  }
  isModalOpen.value = true
}

const saveEscolta = async () => {
  if (saving.value) return
  saving.value = true
  modalMessage.value = null
  
  try {
    const isEditing = modalMode.value === 'editar'
    const payload = {
      ...formData.value,
      id_grupo: selectedGroup.value.id
    }

    if (isEditing && currentEditId.value) {
      const data = await updateEscoltaApi({ ...payload, id_escolta: currentEditId.value })
      if (data.done) {
        showModalMessage(t('escoltas.alertSuccessUpdate'), 'success')
        await fetchEscoltas()
      } else {
        showModalMessage(data.message || t('escoltas.alertErrorUpdate'), 'error')
      }
    } else {
      const data = await createEscoltaApi(payload)
      if (data.done) {
        showModalMessage(t('escoltas.alertSuccessCreate'), 'success')
        await fetchEscoltas()
      } else {
        showModalMessage(data.message || t('escoltas.alertErrorCreate'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving escolta:', error)
      showModalMessage(t('escoltas.alertNetError'), 'error')
    }
  } finally {
    saving.value = false
  }
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id_escolta: string) => {
  itemToDelete.value = id_escolta
  isDeleteModalOpen.value = true
}

const deleteEscolta = async () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const id_escolta = itemToDelete.value

  try {
    const data = await deleteEscoltaApi({
      id_grupo: selectedGroup.value.id,
      id_escolta: id_escolta
    })

    if (data.done) {
      await fetchEscoltas()
    } else {
      alert(data.message || 'Error al eliminar')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      alert(getErrorMessage(error.code))
    } else {
      console.error('Error deleting escolta:', error)
    }
  }
}

const openValidateModal = (escolta: Escolta) => {
  currentValidateEscolta.value = escolta
  smsCodeGenerated.value = null
  smsCodeInput.value = ''
  isValidating.value = false
  validateMessage.value = null
  isValidatingModalOpen.value = true
}

const preValidateEscolta = async () => {
  if (isValidating.value || !currentValidateEscolta.value) return
  isValidating.value = true
  
  try {
    const data = await preValidateEscoltaApi({
      id_grupo: selectedGroup.value.id,
      id_escolta: currentValidateEscolta.value.id_escolta
    })

    if (data.done) {
        smsCodeGenerated.value = data.data?.sms_code?.toString() || '0000'
        showValidateMessage(t('escoltas.smsSent') || 'SMS enviado. Ingresa el código recibido.', 'success')
      } else {
        showValidateMessage(data.message || t('escoltas.alertErrorSms'), 'error')
      }
  } catch (error) {
    if (error instanceof ApiError) {
      showValidateMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error enviando SMS:', error)
      showValidateMessage(t('escoltas.alertNetError') || 'Error de red', 'error')
    }
  } finally {
    isValidating.value = false
  }
}

const postValidateEscolta = async () => {
  if (isValidating.value || !currentValidateEscolta.value || !smsCodeInput.value) return
  isValidating.value = true
  
  try {
    const data = await postValidateEscoltaApi({
      id_grupo: selectedGroup.value.id,
      id_escolta: currentValidateEscolta.value.id_escolta,
      codigo: smsCodeInput.value
    })

    if (data.done) {
      showValidateMessage(data.message || t('escoltas.alertSuccessValidate'), 'success')
      await fetchEscoltas()
      setTimeout(() => { isValidatingModalOpen.value = false }, 2000)
    } else {
      showValidateMessage(data.message || t('escoltas.alertErrorValidate'), 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showValidateMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error validando escolta:', error)
      showValidateMessage(t('escoltas.alertNetError') || 'Error de red', 'error')
    }
  } finally {
    isValidating.value = false
  }
}

const exportToExcel = () => {
  const dataToExport = filteredEscoltas.value.map(e => ({
    Nombre: e.nombre,
    Cédula: e.cedula,
    Email: e.email,
    Celular: e.celular,
    ID: e.id_escolta
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Escoltas')
  XLSX.writeFile(workbook, `escoltas_${new Date().toISOString().split('T')[0]}.xlsx`)
}

onMounted(fetchEscoltas)

const filteredEscoltas = computed(() => {
  if (!searchQuery.value) return escoltas.value
  const query = searchQuery.value.toLowerCase()
  return escoltas.value.filter(e => 
    (e.nombre?.toLowerCase().includes(query)) ||
    (e.email?.toLowerCase().includes(query)) ||
    (e.cedula?.toLowerCase().includes(query)) ||
    (e.celular?.toLowerCase().includes(query))
  )
})

// Ordenamiento
const sortKey = ref<keyof Escolta>('nombre')
const sortOrder = ref(1)

const toggleSort = (key: keyof Escolta) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value * -1
  } else {
    sortKey.value = key
    sortOrder.value = 1
  }
}

const sortedEscoltas = computed(() => {
  return [...filteredEscoltas.value].sort((a, b) => {
    let result = 0
    const valA = String(a[sortKey.value] || '').toLowerCase()
    const valB = String(b[sortKey.value] || '').toLowerCase()
    if (valA < valB) result = -1
    if (valA > valB) result = 1
    return result * sortOrder.value
  })
})

const paginatedEscoltas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return sortedEscoltas.value.slice(start, end)
})

watch(() => selectedGroup.value.id, () => {
  currentPage.value = 1
  fetchEscoltas()
})
</script>

<template>
  <DataLayout class="theme-sync"
      :title="$t('escoltas.title') || 'Escoltas'"
      :subtitle="`${$t('escoltas.subtitle') || 'Gestión de escoltas para'} ${selectedGroup.nombre}`"
    >
    <template #actions>
      <button @click="exportToExcel" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white dark:bg-[#16191D] hover:bg-slate-100 dark:hover:bg-[#2A313A] text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-lg transition-all duration-200 border border-slate-200 dark:border-[#2A313A] shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconDownload :size="18" />
        <span class="hidden sm:inline">{{ $t('common.btnExport') || 'Exportar' }}</span>
      </button>
      <button @click="openCreateModal" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-[#60a5fa] dark:bg-[#2A313A] hover:bg-[#3b82f6] dark:hover:bg-[#343B45] text-white px-5 py-2.5 rounded-lg transition-all duration-200 border border-[#60a5fa] dark:border-slate-700/50 shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none">
        <IconPlus :size="18" />
        <span>{{ $t('escoltas.btnNew') || 'Nuevo Escolta' }}</span>
      </button>
    </template>

    <template #search>
      <BaseSearch v-model="searchQuery" :placeholder="$t('escoltas.searchPlaceholder') || 'Buscar por nombre, cédula, email...'" />
    </template>

    <div class="w-full overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-[#2A313A]/50 bg-white dark:bg-[#1E2228] shadow-sm">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr class="bg-slate-50/90 dark:bg-[#151A20]/90 border-b border-slate-200 dark:border-[#2A313A]">
            <th @click="toggleSort('nombre')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('escoltas.thName') || 'Escolta' }}
                <IconChevronDown v-if="sortKey === 'nombre'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('cedula')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('escoltas.thDoc') || 'Documento' }}
                <IconChevronDown v-if="sortKey === 'cedula'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th @click="toggleSort('email')" class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors group">
              <div class="flex items-center gap-1.5">
                {{ $t('escoltas.thContact') || 'Contacto' }}
                <IconChevronDown v-if="sortKey === 'email'" :class="{'rotate-180': sortOrder === -1}" :size="14" class="transition-transform" />
              </div>
            </th>
            <th class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID Ref</th>
            <th class="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Acciones</th>
          </tr>
        </thead>
        <Transition mode="out-in" name="fade">
          <tbody v-if="isLoading" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="i in 5" :key="'skeleton-'+i" class="border-b border-slate-200 dark:border-[#2A313A]/50 animate-pulse">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-slate-200 dark:bg-[#2A313A]/60 rounded-full"></div>
                  <div class="h-4 w-32 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 w-24 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-2">
                  <div class="h-3 w-32 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
                  <div class="h-2 w-20 bg-slate-300 dark:bg-[#2A313A]/40 rounded"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 w-16 bg-slate-200 dark:bg-[#2A313A]/60 rounded"></div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A]/50 rounded"></div>
                  <div class="h-7 w-7 bg-slate-200 dark:bg-[#2A313A]/50 rounded"></div>
                </div>
              </td>
            </tr>
          </tbody>
          <TransitionGroup v-else-if="paginatedEscoltas.length > 0" tag="tbody" name="table-rows" class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="escolta in paginatedEscoltas" :key="escolta.id_escolta" class="border-b border-slate-200 dark:border-[#2A313A]/50 hover:bg-slate-50 dark:hover:bg-[#22272E] transition-colors duration-150 group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-[#5da6fc]/10 to-transparent border border-[#5da6fc]/20 rounded-full flex items-center justify-center text-[#5da6fc] group-hover:scale-110 transition-transform">
                    <IconShieldCheck :size="20" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-slate-700 dark:text-slate-100 tracking-tight">{{ escolta.nombre || 'Sin nombre' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-xs text-slate-600 dark:text-slate-300 font-mono">{{ escolta.cedula || '---' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] text-[#5da6fc] hover:underline">{{ escolta.email || '---' }}</span>
                  <span class="text-[10px] text-slate-500 font-mono">{{ escolta.celular || '---' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                 <span class="text-[10px] text-slate-500 font-mono">{{ escolta.id_escolta }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openValidateModal(escolta)" class="p-1.5 rounded text-slate-400 hover:text-green-400 hover:bg-green-500/10 transition-colors" title="Validar Escolta"><IconCheck :size="18" /></button>
                  <button @click="openEditModal(escolta)" class="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A313A] transition-colors" title="Editar"><IconEdit :size="18" /></button>
                  <button @click="confirmDelete(escolta.id_escolta)" class="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar"><IconTrash :size="18" /></button>
                </div>
              </td>
            </tr>
          </TransitionGroup>
          <tbody v-else class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr key="empty-state">
              <td colspan="5" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center justify-center space-y-3">
                <IconShieldCheck :size="32" class="mb-2 text-slate-600" />
                <p class="text-sm font-medium text-slate-400">{{ $t('escoltas.noResults') || 'No se encontraron escoltas.' }}</p>
                <p class="text-sm text-slate-500">{{ $t('escoltas.noResultsHint') || 'Intenta cambiar el grupo seleccionado o ajusta tu búsqueda.' }}</p>
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
        :total-items="filteredEscoltas.length"
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
        @confirm="deleteEscolta"
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
        :title="modalMode === 'crear' ? ($t('escoltas.modalTitleCreate') || 'Registrar Nuevo Escolta') : ($t('escoltas.modalTitleEdit') || 'Actualizar Escolta')"
        :confirm-text="modalMode === 'crear' ? ($t('escoltas.btnRegister') || 'Registrar Escolta') : ($t('escoltas.btnSave') || 'Guardar Cambios')"
        @confirm="saveEscolta"
      >
        <template #icon>
          <IconShieldCheck :size="20" class="text-[#5da6fc]" />
        </template>

        <form @submit.prevent="saveEscolta" class="space-y-5 relative">

          <!-- Overlay de Carga -->
          <Transition name="loader-fade">
            <div v-if="saving" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
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
            <div v-if="modalMessage && !saving"
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

          <!-- Nombre -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('escoltas.labelName') || 'Nombre Completo' }}</label>
            <div class="relative">
              <IconUser :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                v-model="formData.nombre"
                type="text" 
                :placeholder="$t('escoltas.placeholderName') || 'Ej: Pepito Perez'"
                class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Cédula -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('escoltas.labelDoc') || 'Documento (Cédula)' }}</label>
              <div class="relative">
                <IconIdBadge2 :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.cedula"
                  type="text" 
                  :placeholder="$t('escoltas.placeholderDoc') || 'Ej: 79065744'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                  required
                />
              </div>
            </div>

            <!-- Celular -->
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('escoltas.labelMobile') || 'Celular' }}</label>
              <div class="relative">
                <IconDeviceMobile :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  v-model="formData.celular"
                  type="text" 
                  :placeholder="$t('escoltas.placeholderMobile') || 'Ej: 3023014514'"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1 flex justify-between">
              <span>{{ $t('escoltas.labelEmail') || 'Correo Electrónico' }}</span>
              <span class="text-slate-600 normal-case font-normal">(máx. 32 caracteres)</span>
            </label>
            <div class="relative">
              <IconMail :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
              <input 
                v-model="formData.email"
                type="email" 
                maxlength="32"
                :placeholder="$t('escoltas.placeholderEmail') || 'Ej: escolta@email.com'"
                class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm"
                required
              />
            </div>
          </div>

        </form>
      </BaseModal>

      <!-- Modal de Validación de Escolta -->
      <BaseModal 
        v-model:is-open="isValidatingModalOpen"
        :title="$t('escoltas.modalTitleValidate') || 'Validar Escolta'"
        :confirm-text="smsCodeGenerated ? ($t('escoltas.btnValidateCode') || 'Validar Código') : ($t('escoltas.btnSendSms') || 'Enviar SMS')"
        @confirm="smsCodeGenerated ? postValidateEscolta() : preValidateEscolta()"
      >
        <template #icon>
          <IconCheck :size="20" class="text-[#5da6fc]" />
        </template>

        <form @submit.prevent="smsCodeGenerated ? postValidateEscolta() : preValidateEscolta()" class="space-y-5 relative" v-if="currentValidateEscolta">

          <!-- Overlay de Carga Validación -->
          <Transition name="loader-fade">
            <div v-if="isValidating" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
              <div class="flex flex-col items-center gap-4 p-8">
                <div class="relative flex items-center justify-center">
                  <div class="w-14 h-14 border-[3px] border-[#5da6fc]/10 border-t-[#5da6fc] rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <IconLoader2 :size="20" class="text-[#5da6fc] animate-pulse" />
                  </div>
                </div>
                <p class="text-[10px] font-bold text-slate-500 dark:text-white/50 tracking-[0.2em] uppercase animate-pulse">
                  {{ smsCodeGenerated ? 'Validando' : 'Enviando SMS' }}
                </p>
              </div>
            </div>
          </Transition>

          <!-- Feedback Minimalista Validación -->
          <Transition name="message-fade">
            <div v-if="validateMessage && !isValidating"
                 class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase"
                 :class="{
                   'text-red-400 bg-red-400/5': validateMessage.type === 'error',
                   'text-amber-400 bg-amber-400/5': validateMessage.type === 'warning',
                   'text-[#5da6fc] bg-[#5da6fc]/5': validateMessage.type === 'success'
                 }">
                 <IconAlertCircle v-if="validateMessage.type === 'error' || validateMessage.type === 'warning'" :size="14" />
                 <IconCheck v-else :size="14" class="text-[#5da6fc]" />
                 {{ validateMessage.text }}
            </div>
          </Transition>

          <!-- Paso 1: Confirmar Número -->
          <template v-if="!smsCodeGenerated">
            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('escoltas.labelEscolta') || 'Escolta' }}</label>
              <div class="relative">
                <IconUser :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  :value="currentValidateEscolta.nombre"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-slate-100 dark:bg-[#16191D]/50 text-slate-500 dark:text-slate-400 sm:text-sm cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{{ $t('escoltas.labelDestMobile') || 'Número Destino SMS' }}</label>
              <div class="relative">
                <IconDeviceMobile :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  :value="currentValidateEscolta.celular"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 sm:text-sm"
                  readonly
                />
              </div>
            </div>
          </template>

          <!-- Paso 2: Digitar Código -->
          <template v-else>
            <div class="space-y-1.5">
              <div class="relative">
                <IconMessageCircle :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" />
                <input 
                  v-model="smsCodeInput"
                  type="text"
                  maxlength="6"
                  placeholder="Ej: 5579"
                  class="block w-full px-4 py-2.5 pl-10 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-all sm:text-sm font-mono tracking-widest"
                  required
                />
              </div>
            </div>
          </template>

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


