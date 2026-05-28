<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Edit02Icon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
  Tick01Icon,
  CheckmarkCircle02Icon,
  User02Icon,
  SmartPhone01Icon,
  MessageQuestionIcon,
  Loading03Icon,
  MoreHorizontalIcon
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

import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import EscoltaCreateModal from '../components/EscoltaCreateModal.vue'
import Column from 'primevue/column'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'

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

// Validation modal
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
      validateMessage.value = null
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
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('escoltas.title')" 
      :count="filteredEscoltas.length" 
      :icon="User02Icon"
    >
      <template #actions>
        <button 
          v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_CREATE)"
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('escoltas.btnNew') }}</span>
        </button>
        <button class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all">
          <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Search Toolbar -->
    <SearchToolbar v-model="searchQuery" :placeholder="t('escoltas.searchPlaceholder')" searchWidth="sm:w-[28rem]">
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
        :value="filteredEscoltas" 
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('escoltas.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="nombre" :header="t('escoltas.thName', 'Escolta')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre || 'Sin nombre' }}</span>
              <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{{ data.cedula || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="email" :header="t('escoltas.thContact', 'Contacto')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <span class="text-[12px] text-[#3b82f6] dark:text-[#5da6fc] font-medium">{{ data.email || '---' }}</span>
              <span class="text-[11px] text-slate-500 font-mono">{{ data.celular || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column field="id_escolta" :header="t('escoltas.thRef', 'ID Ref')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] text-slate-500 font-mono tracking-wider">{{ data.id_escolta }}</span>
          </template>
        </Column>

        <Column :header="t('escoltas.thActions', 'Acciones')" headerStyle="width: 14rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <TableActions
              :actions="[
                {
                  icon: CheckmarkCircle01Icon,
                  tooltip: t('escoltas.btnValidate', 'Validar'),
                  variant: 'primary',
                  onClick: () => openValidateModal(data),
                  show: authStore.hasPermission(PERMISSIONS.ESCOLTA_VALIDATE)
                },
                {
                  icon: Edit02Icon,
                  tooltip: t('common.edit', 'Editar'),
                  variant: 'primary',
                  onClick: () => openEditModal(data),
                  show: authStore.hasPermission(PERMISSIONS.ESCOLTA_UPDATE)
                },
                {
                  icon: Delete01Icon,
                  tooltip: t('common.delete', 'Eliminar'),
                  variant: 'danger',
                  onClick: () => confirmDelete(data.id_escolta),
                  show: authStore.hasPermission(PERMISSIONS.ESCOLTA_DELETE)
                }
              ]"
              :show-more="true"
            />
          </template>
        </Column>
      </AppTable>

      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination 
          :totalRecords="filteredEscoltas.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <AppDeleteConfirm 
      v-model:is-open="isDeleteModalOpen"
      :title="t('common.confirmDeleteTitle')"
      :message="t('common.confirmDeleteMsg')"
      @confirm="deleteEscolta"
    />

    <EscoltaCreateModal 
      v-model:is-open="isCreateModalOpen"
      @created="fetchEscoltas"
    />

    <!-- Validación Modal -->
    <AppModal 
      v-model:is-open="isValidatingModalOpen"
      :title="t('escoltas.modalTitleValidate') || 'Validar Escolta'"
      :confirm-text="isValidationSuccess ? (t('common.close') || 'Cerrar') : (smsCodeGenerated ? (t('escoltas.btnValidateCode') || 'Validar Código') : (t('escoltas.btnSendSms') || 'Enviar SMS'))"
      @confirm="isValidationSuccess ? (isValidatingModalOpen = false) : (smsCodeGenerated ? postValidateEscolta() : preValidateEscolta())"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
          <HugeiconsIcon :icon="CheckmarkCircle02Icon" :size="20" :stroke-width="2" />
        </div>
      </template>

      <form @submit.prevent="isValidationSuccess ? (isValidatingModalOpen = false) : (smsCodeGenerated ? postValidateEscolta() : preValidateEscolta())" class="space-y-5 relative" v-if="currentValidateEscolta">
        
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

          <div v-else class="space-y-5">
            <Transition name="fade">
              <div v-if="isValidating" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
                <div class="relative">
                  <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
                  <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
                </div>
                <div class="mt-5 flex flex-col items-center">
                  <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
                    {{ smsCodeGenerated ? 'Validando...' : 'Enviando SMS...' }}
                  </span>
                  <div class="flex gap-1">
                    <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            </Transition>

            <Transition name="message-fade">
              <div v-if="validateMessage && !isValidating"
                   class="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border"
                   :class="{
                     'text-red-500 bg-red-500/10 border-red-500/20': validateMessage.type === 'error',
                     'text-amber-500 bg-amber-500/10 border-amber-500/20': validateMessage.type === 'warning',
                     'text-emerald-500 bg-emerald-500/10 border-emerald-500/20': validateMessage.type === 'success'
                   }">
                <HugeiconsIcon v-if="validateMessage.type === 'error' || validateMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
                <HugeiconsIcon v-else :icon="Tick01Icon" :size="18" />
                {{ validateMessage.text }}
              </div>
            </Transition>

            <div v-if="!smsCodeGenerated" class="space-y-4">
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
            </div>

            <div v-else class="space-y-4">
              <AppFormInput 
                v-model="smsCodeInput"
                label="Código SMS"
                :icon="MessageQuestionIcon"
                placeholder="Ej: 5579"
                maxlength="6"
                class="font-mono tracking-widest text-xl text-center"
              />
              <p class="text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium mt-1">
                {{ t('escoltas.msgSmsSent') || 'Un SMS ha sido enviado al celular del escolta.' }}
              </p>
            </div>
          </div>
        </Transition>
      </form>
    </AppModal>
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

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

.message-fade-enter-active, .message-fade-leave-active { transition: all 0.3s ease; }
.message-fade-enter-from, .message-fade-leave-to { opacity: 0; transform: translateY(-8px); }

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
