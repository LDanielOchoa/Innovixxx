<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
  Tick01Icon,
  CheckmarkCircle02Icon,
  User02Icon,
  SmartPhone01Icon,
  MessageQuestionIcon,
  Loading03Icon
} from '@hugeicons/core-free-icons'


import { 
  fetchEscoltasApi, 
  deleteEscoltaApi, 
  preValidateEscoltaApi, 
  postValidateEscoltaApi 
} from '../services/escoltas.api'
import type { Escolta } from '../types/escolta'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import Column from 'primevue/column'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const router = useRouter()
const escoltas = ref<Escolta[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

// Estado para el modal de validación SMS (se mantiene en esta vista)
const isValidatingModalOpen = ref(false)
const currentValidateEscolta = ref<Escolta | null>(null)
const smsCodeGenerated = ref<string | null>(null)
const smsCodeInput = ref('')
const isValidating = ref(false)
const isValidationSuccess = ref(false)
const validateMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const showValidateMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  validateMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => { if (validateMessage.value?.text === text) validateMessage.value = null }, 4000)
  }
}

const fetchEscoltas = async () => {
  if (!selectedGroup.value?.id) {
    escoltas.value = []
    isLoading.value = false
    return
  }
  
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
  router.push('/escoltas/nuevo')
}

const openEditModal = (escolta: Escolta) => {
  router.push(`/escoltas/${escolta.id_escolta}/editar`)
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
  isValidationSuccess.value = false
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
      isValidationSuccess.value = true
      validateMessage.value = null // Clear any previous messages
      await fetchEscoltas()
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

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    currentPage.value = 1
    await fetchEscoltas()
  } else {
    escoltas.value = []
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="t('escoltas.title') || 'Escoltas'" 
      :subtitle="`${t('escoltas.subtitle') || 'Gestión de escoltas para'} ${selectedGroup?.nombre || ''}`" 
      :count="filteredEscoltas.length"
    >
      <template #actions>
        <AppButton 
          variant="secondary" 
          :icon="Download01Icon" 
          @click="exportToExcel"
        >
          <span>{{ t('common.btnExport') || 'Exportar' }}</span>
        </AppButton>

        <AppButton 
          variant="primary" 
          :icon="PlusSignIcon" 
          @click="openCreateModal"
        >
          <span>{{ t('escoltas.btnNew') || 'Nuevo Escolta' }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Área de Búsqueda y Filtros Simplificada -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="t('escoltas.searchPlaceholder') || 'Buscar por nombre, cédula, email...'"
        />
      </div>
    </div>

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <AppTable 
        :value="filteredEscoltas" 
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('escoltas.noResults') || 'No se encontraron escoltas.'"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('escoltas.noResultsHint') || 'Intenta cambiar el grupo seleccionado o ajusta tu búsqueda.' }}</template>

        <Column field="nombre" header="Escolta" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">{{ data.nombre || 'Sin nombre' }}</span>
            </div>
          </template>
        </Column>

        <Column field="cedula" header="Documento" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[12px] text-slate-600 dark:text-slate-300 font-mono font-bold tracking-wider">{{ data.cedula || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="email" header="Contacto" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[12px] text-[#5da6fc] hover:underline font-medium">{{ data.email || '---' }}</span>
              <span class="text-[11px] text-slate-500 font-mono">{{ data.celular || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="id_escolta" header="ID Ref" sortable>
          <template #body="{ data }">
            <span class="text-[10px] text-slate-500 font-mono tracking-wider">{{ data.id_escolta }}</span>
          </template>
        </Column>

        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3">
              <button 
                @click="openValidateModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                title="Validar Escolta"
              >
                <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                @click="confirmDelete(data.id_escolta)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-red-500/5 border border-slate-200 dark:border-red-500/10 text-slate-400 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
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
        :totalRecords="filteredEscoltas.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <AppDeleteConfirm 
      v-model:is-open="isDeleteModalOpen"
      :title="t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      :item-name="escoltas.find(e => e.id_escolta === itemToDelete)?.nombre"
      @confirm="deleteEscolta"
    >
      <template #question>
        {{ t('common.confirmDeleteMsg') || '¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.' }}
      </template>
    </AppDeleteConfirm>

    <!-- El modal de crear/editar fue migrado a EscoltaFormView -->

    <!-- Modal de Validación de Escolta -->
    <AppModal 
      v-model:is-open="isValidatingModalOpen"
      :title="t('escoltas.modalTitleValidate') || 'Validar Escolta'"
      :confirm-text="isValidationSuccess ? (t('common.close') || 'Cerrar') : (smsCodeGenerated ? (t('escoltas.btnValidateCode') || 'Validar Código') : (t('escoltas.btnSendSms') || 'Enviar SMS'))"
      @confirm="isValidationSuccess ? (isValidatingModalOpen = false) : (smsCodeGenerated ? postValidateEscolta() : preValidateEscolta())"
    >
      <template #icon>
        <HugeiconsIcon :icon="CheckmarkCircle02Icon" :size="20" class="text-[#5da6fc]" />
      </template>

      <form @submit.prevent="isValidationSuccess ? (isValidatingModalOpen = false) : (smsCodeGenerated ? postValidateEscolta() : preValidateEscolta())" class="space-y-5 relative" v-if="currentValidateEscolta">
        
        <!-- Pantalla de Éxito -->
        <Transition name="fade-slide" mode="out-in">
          <div v-if="isValidationSuccess" class="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-[#5da6fc]/10 flex items-center justify-center mb-2 shadow-[inset_0_2px_10px_rgba(93,166,252,0.2)]">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-[#5da6fc]" />
            </div>
            <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">¡Validación Exitosa!</h3>
            <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[280px]">
              El dispositivo y número de este escolta han sido validados correctamente en el sistema.
            </p>
          </div>

          <!-- Formulario de Validación -->
          <div v-else class="space-y-5">
            <Transition name="loader-fade">
              <div v-if="isValidating" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
                <div class="flex flex-col items-center gap-4 p-8">
                  <div class="relative flex items-center justify-center">
                    <div class="w-14 h-14 border-[3px] border-[#5da6fc]/10 border-t-[#5da6fc] rounded-full animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <HugeiconsIcon :icon="Loading03Icon" :size="20" class="text-[#5da6fc] animate-pulse" />
                    </div>
                  </div>
                  <p class="text-[10px] font-bold text-slate-500 dark:text-white/50 tracking-[0.2em] uppercase animate-pulse">
                    {{ smsCodeGenerated ? 'Validando' : 'Enviando SMS' }}
                  </p>
                </div>
              </div>
            </Transition>

            <Transition name="message-fade">
              <div v-if="validateMessage && !isValidating"
                    class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase"
                    :class="{
                      'text-red-400 bg-red-400/5 border border-red-400/10': validateMessage.type === 'error',
                      'text-amber-400 bg-amber-400/5 border border-amber-400/10': validateMessage.type === 'warning',
                      'text-[#5da6fc] bg-[#5da6fc]/5 border border-[#5da6fc]/10': validateMessage.type === 'success'
                    }">
                    <HugeiconsIcon v-if="validateMessage.type === 'error' || validateMessage.type === 'warning'" :icon="Alert01Icon" :size="14" />
                    <HugeiconsIcon v-else :icon="Tick01Icon" :size="14" class="text-[#5da6fc]" />
                    {{ validateMessage.text }}
              </div>
            </Transition>

            <template v-if="!smsCodeGenerated">
              <AppFormInput 
                :modelValue="currentValidateEscolta.nombre"
                :label="t('escoltas.labelEscolta') || 'Escolta'"
                :icon="User02Icon"
                disabled
                class="uppercase"
              />

              <AppFormInput 
                :modelValue="currentValidateEscolta.celular"
                :label="t('escoltas.labelDestMobile') || 'Número Destino SMS'"
                :icon="SmartPhone01Icon"
                disabled
                class="font-mono tracking-widest"
              />
            </template>

            <template v-else>
              <div class="space-y-1.5">
                <AppFormInput 
                  v-model="smsCodeInput"
                  label="Código SMS"
                  :icon="MessageQuestionIcon"
                  placeholder="Ej: 5579"
                  maxlength="6"
                  class="font-mono tracking-widest text-lg"
                />
                <p class="text-[11px] text-slate-500 mt-2 px-1 text-center">
                  Ingresa el código de 4 a 6 dígitos enviado al celular del escolta.
                </p>
              </div>
            </template>
          </div>
        </Transition>
      </form>
    </AppModal>
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
</style>


