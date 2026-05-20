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
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import EscoltaCreateModal from '../components/EscoltaCreateModal.vue'
import Column from 'primevue/column'

const { t } = useI18n()
const groupStore = useGroupStore()
const authStore = useAuthStore()
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
  isCreateModalOpen.value = true
}

const openEditModal = (escolta: Escolta) => {
  router.push(`/escoltas/${escolta.id_escolta}/editar`)
}


const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)
const isCreateModalOpen = ref(false)

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
          v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_CREATE)"
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
                v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_VALIDATE)"
                @click="openValidateModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 hover:border-emerald-500/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Validar Escolta"
              >
                <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_UPDATE)"
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_DELETE)"
                @click="confirmDelete(data.id_escolta)"
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

    <!-- Modal de Creación de Escolta -->
    <EscoltaCreateModal 
      v-model:is-open="isCreateModalOpen"
      @created="fetchEscoltas"
    />

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
          <div v-if="isValidationSuccess" class="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div class="relative group mb-4">
              <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
                <HugeiconsIcon :icon="Tick01Icon" :size="40" class="text-white drop-shadow-sm" />
              </div>
            </div>
            <h3 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight">¡Validación Exitosa!</h3>
            <p class="text-[14px] text-slate-500 dark:text-slate-400 max-w-[280px]">
              El dispositivo y número de este escolta han sido validados correctamente en el sistema de seguridad.
            </p>
          </div>

          <!-- Formulario de Validación -->
          <div v-else class="space-y-5">
            <Transition name="loader-fade">
              <div v-if="isValidating" class="absolute -inset-4 z-50 flex items-center justify-center bg-white/60 dark:bg-[#16191D]/60 backdrop-blur-md rounded-2xl overflow-hidden">
                <div class="flex flex-col items-center gap-4 p-8">
                  <div class="relative flex items-center justify-center">
                    <div class="absolute inset-0 bg-[#3b82f6]/20 dark:bg-[#5da6fc]/20 rounded-full blur-xl animate-pulse"></div>
                    <div class="w-16 h-16 border-[3px] border-[#3b82f6]/10 dark:border-[#5da6fc]/10 border-t-[#3b82f6] dark:border-t-[#5da6fc] rounded-full animate-spin relative z-10"></div>
                    <div class="absolute inset-0 flex items-center justify-center z-10">
                      <HugeiconsIcon :icon="Loading03Icon" :size="24" class="text-[#3b82f6] dark:text-[#5da6fc] animate-pulse" />
                    </div>
                  </div>
                  <p class="text-[11px] font-bold text-[#3b82f6] dark:text-[#5da6fc] tracking-[0.2em] uppercase animate-pulse">
                    {{ smsCodeGenerated ? 'Validando...' : 'Enviando SMS...' }}
                  </p>
                </div>
              </div>
            </Transition>

            <Transition name="message-fade">
              <div v-if="validateMessage && !isValidating"
                    class="flex items-center gap-2 py-2 px-3 rounded-[12px] text-[12px] font-semibold tracking-wide"
                    :class="{
                      'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20': validateMessage.type === 'error',
                      'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/20': validateMessage.type === 'warning',
                      'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20': validateMessage.type === 'success'
                    }">
                    <HugeiconsIcon v-if="validateMessage.type === 'error' || validateMessage.type === 'warning'" :icon="Alert01Icon" :size="16" />
                    <HugeiconsIcon v-else :icon="Tick01Icon" :size="16" />
                    {{ validateMessage.text }}
              </div>
            </Transition>

            <!-- Card de Datos Estilo Glassmorphic -->
            <div class="p-5 rounded-[20px] bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden group">
               <!-- Decorative ambient glow -->
               <div class="absolute -top-10 -right-10 w-40 h-40 bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 rounded-full blur-3xl group-hover:bg-[#3b82f6]/20 transition-all duration-700 pointer-events-none"></div>

              <template v-if="!smsCodeGenerated">
                <div class="flex items-center gap-3 mb-4 relative z-10">
                  <div class="w-10 h-10 rounded-[12px] bg-slate-100 dark:bg-[#20242D] border border-slate-200/50 dark:border-white/5 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shadow-inner">
                    <HugeiconsIcon :icon="SmartPhone01Icon" :size="20" />
                  </div>
                  <div>
                    <h4 class="text-[14px] font-bold text-slate-800 dark:text-white">Verificación por SMS</h4>
                    <p class="text-[12px] text-slate-500 dark:text-slate-400">Se enviará un código al número registrado.</p>
                  </div>
                </div>

                <div class="space-y-4 relative z-10">
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
                    class="font-mono tracking-widest text-[#3b82f6] dark:text-[#5da6fc]"
                  />
                </div>
              </template>

              <template v-else>
                <div class="flex items-center gap-3 mb-4 relative z-10">
                  <div class="w-10 h-10 rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                    <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="20" />
                  </div>
                  <div>
                    <h4 class="text-[14px] font-bold text-slate-800 dark:text-white">Código Enviado</h4>
                    <p class="text-[12px] text-slate-500 dark:text-slate-400">Ingresa el código que recibió el escolta.</p>
                  </div>
                </div>
                
                <div class="space-y-2 relative z-10">
                  <AppFormInput 
                    v-model="smsCodeInput"
                    label="Código SMS"
                    :icon="MessageQuestionIcon"
                    placeholder="Ej: 5579"
                    maxlength="6"
                    class="font-mono tracking-widest text-xl text-center text-[#3b82f6] dark:text-[#5da6fc]"
                  />
                  <p class="text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium mt-1">
                    {{ t('escoltas.msgSmsSent') || 'Un SMS ha sido enviado al celular del escolta.' }}
                  </p>
                </div>
              </template>
            </div>
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


