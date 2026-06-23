<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
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
  MoreHorizontalIcon,
  CpuIcon,
  Car01Icon
} from '@hugeicons/core-free-icons'

import { 
  fetchEscoltasApi, 
  deleteEscoltaApi, 
  preValidateEscoltaApi, 
  postValidateEscoltaApi
} from '../services/escoltas.api'
import {
  fetchServiciosDropdownApi,
  fetchHardwareSimplesApi
} from '../../servicios/services/servicios.api'
import { fetchVehiculosServicioSimpleApi } from '../../vehiculos-servicio/services/vehiculos-servicio.api'
import type { Escolta } from '../types/escolta'
import { ESCOLTA_ESTADO, ESCOLTA_ESTADO_LABELS } from '../types/escolta'
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
import EscoltaAsignarHardwareModal from '../components/EscoltaAsignarHardwareModal.vue'
import EscoltaAsignarVehiculoModal from '../components/EscoltaAsignarVehiculoModal.vue'
import Column from 'primevue/column'

import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'

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
const filtroEstado = ref<number>(ESCOLTA_ESTADO.TODOS)

// Mapeos de asignaciones
const servicios = ref<any[]>([])
const vehiculos = ref<any[]>([])
const hardwareList = ref<any[]>([])

const ESTADOS_MAP: Record<number, string> = {
  1: 'PRERCARGA',
  2: 'EN ESPERA',
  3: 'EJECUCION OK',
  4: 'EJECUCION FAIL',
  5: 'FINALIZADO',
  6: 'CANCELADO'
}

const getServicioInfo = (id: string) => {
  const s = servicios.value.find(item => item.id_servicio === id)
  if (!s) return id
  const estadoNum = parseInt(s.estado, 10)
  const estadoTexto = ESTADOS_MAP[estadoNum] || s.estado || 'Sin estado'
  return `${s.fecha_inicio} (${estadoTexto})`
}

const getVehiculoInfo = (id: string) => {
  const v = vehiculos.value.find(item => item.id_vehiculo === id)
  return v ? `${v.placa}${v.tipo ? ` (${v.tipo})` : ''}` : id
}

const getHardwareInfo = (id: string) => {
  const h = hardwareList.value.find(item => item.id_hardware === id)
  return h ? `${h.nombre} (${h.familia || 'Sin familia'})` : id
}

const cargarAsignacionesData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const [sData, vData, hData] = await Promise.all([
      fetchServiciosDropdownApi(selectedGroup.value.id),
      fetchVehiculosServicioSimpleApi(selectedGroup.value.id),
      fetchHardwareSimplesApi(selectedGroup.value.id, 0)
    ])
    servicios.value = sData
    vehiculos.value = vData
    hardwareList.value = hData
  } catch (error) {
    console.error('Error cargando datos de asignación:', error)
  }
}

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
    const [escoltasData] = await Promise.all([
      fetchEscoltasApi(selectedGroup.value.id, filtroEstado.value),
      cargarAsignacionesData()
    ])
    escoltas.value = escoltasData
  } catch (error) {
    console.error('Error fetching escoltas:', error)
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const isEditModalOpen = ref(false)
const currentEditEscolta = ref<Escolta | null>(null)

const openEditModal = (escolta: Escolta) => {
  openMenuId.value = null
  currentEditEscolta.value = escolta
  isEditModalOpen.value = true
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)
const isCreateModalOpen = ref(false)
const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })
const isAsignarHardwareModalOpen = ref(false)
const currentAsignarHardwareEscolta = ref<Escolta | null>(null)
const isAsignarVehiculoModalOpen = ref(false)
const currentAsignarVehiculoEscolta = ref<Escolta | null>(null)

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

const openAsignarHardwareModal = (escolta: Escolta) => {
  openMenuId.value = null
  currentAsignarHardwareEscolta.value = escolta
  isAsignarHardwareModalOpen.value = true
}

const openAsignarVehiculoModal = (escolta: Escolta) => {
  openMenuId.value = null
  currentAsignarVehiculoEscolta.value = escolta
  isAsignarVehiculoModalOpen.value = true
}

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

onMounted(() => {
  fetchEscoltas()
  document.addEventListener('click', closeMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})

const filteredEscoltas = computed(() => {
  if (!searchQuery.value) return escoltas.value
  const query = searchQuery.value.toLowerCase()
  return escoltas.value.filter(e => 
    (e.nombre?.toLowerCase().includes(query)) ||
    (e.email?.toLowerCase().includes(query)) ||
    (e.cedula?.toLowerCase().includes(query)) ||
    (e.celular?.toLowerCase().includes(query)) ||
    (e.pase?.toLowerCase().includes(query)) ||
    (e.tipo_pase?.toLowerCase().includes(query))
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

watch(filtroEstado, async () => {
  currentPage.value = 1
  await fetchEscoltas()
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('escoltas.title')" 
      :count="filteredEscoltas.length" 
      :icon="User02Icon"
    />

    <!-- Toolbar: Buscador (izquierda) + Filtro y Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-80">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('escoltas.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Derecha: Filtro de Estado, Exportar y Nuevo Escolta -->
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <select
          v-model="filtroEstado"
          class="px-3.5 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 transition-colors cursor-pointer outline-none"
        >
          <option :value="ESCOLTA_ESTADO.TODOS">Todos</option>
          <option :value="ESCOLTA_ESTADO.DISPONIBLE">Disponible</option>
          <option :value="ESCOLTA_ESTADO.EN_SERVICIO">En Servicio</option>
          <option :value="ESCOLTA_ESTADO.NO_DISPONIBLE">No Disponible</option>
        </select>

        <button 
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>

        <button 
          v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_CREATE)"
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('escoltas.btnNew') }}</span>
        </button>
      </div>
    </div>

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

        <Column field="pase" :header="t('escoltas.thPase', 'Pase')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col gap-1 py-1">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="data.tipo_pase"
                  class="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-[#3b82f6]/10 text-[#5da6fc] border border-[#3b82f6]/20 tracking-wide"
                >{{ data.tipo_pase }}</span>
                <span class="text-[12px] font-semibold text-slate-700 dark:text-slate-200 font-mono">{{ data.pase || '---' }}</span>
              </div>
              <span class="text-[10px] text-slate-400 dark:text-slate-500">Vence: {{ data.pase_vence || '---' }}</span>
            </div>
          </template>
        </Column>

        <Column :header="t('escoltas.thAssignments', 'Asignaciones')">
          <template #body="{ data }">
            <div class="flex items-center gap-2 py-1">
              <!-- Servicio -->
              <div class="relative group">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200"
                  :class="data.id_servicio ? 'bg-[#3b82f6]/10 text-[#5da6fc] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400/50 border-transparent'"
                >
                  <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="15" />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-bold text-[#5da6fc]">Servicio</span>
                    <span class="font-mono text-[10px]">{{ data.id_servicio ? getServicioInfo(data.id_servicio) : 'No asignado' }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>

              <!-- Vehículo -->
              <div class="relative group">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200"
                  :class="data.id_vehiculo ? 'bg-[#3b82f6]/10 text-[#5da6fc] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400/50 border-transparent'"
                >
                  <HugeiconsIcon :icon="Car01Icon" :size="15" />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-bold text-[#5da6fc]">Vehículo</span>
                    <span class="font-mono text-[10px]">{{ data.id_vehiculo ? getVehiculoInfo(data.id_vehiculo) : 'No asignado' }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>

              <!-- Hardware -->
              <div class="relative group">
                <div 
                  class="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-200"
                  :class="data.id_hardware ? 'bg-[#3b82f6]/10 text-[#5da6fc] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400/50 border-transparent'"
                >
                  <HugeiconsIcon :icon="CpuIcon" :size="15" />
                </div>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div class="flex flex-col gap-0.5">
                    <span class="font-bold text-[#5da6fc]">Hardware</span>
                    <span class="font-mono text-[10px]">{{ data.id_hardware ? getHardwareInfo(data.id_hardware) : 'No asignado' }}</span>
                  </div>
                  <!-- Arrow -->
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                </div>
              </div>
            </div>
          </template>
        </Column>

        <Column field="estado" :header="t('escoltas.thEstado', 'Estado')" sortable>
          <template #body="{ data }">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide"
              :class="{
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': data.estado === 'DISPONIBLE',
                'bg-blue-500/10 text-blue-500 border border-blue-500/20': data.estado === 'EN SERVICIO',
                'bg-red-500/10 text-red-500 border border-red-500/20': data.estado === 'NO DISPONIBLE'
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="{
                  'bg-emerald-500': data.estado === 'DISPONIBLE',
                  'bg-blue-500': data.estado === 'EN SERVICIO',
                  'bg-red-500': data.estado === 'NO DISPONIBLE'
                }"
              ></span>
              {{ ESCOLTA_ESTADO_LABELS[data.estado] || data.estado }}
            </span>
          </template>
        </Column>

        <Column :header="t('escoltas.thActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_escolta, $event)"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_VALIDATE)"
              @click="openValidateModal(escoltas.find(e => e.id_escolta === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('escoltas.btnValidate', 'Validar') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_UPDATE)"
              @click="openEditModal(escoltas.find(e => e.id_escolta === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              @click="openAsignarHardwareModal(escoltas.find(e => e.id_escolta === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="CpuIcon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Asignar Hardware</span>
            </button>
            <button
              @click="openAsignarVehiculoModal(escoltas.find(e => e.id_escolta === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Car01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Asignar Vehículo</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ESCOLTA_DELETE)"
              @click="confirmDelete(escoltas.find(e => e.id_escolta === openMenuId)!.id_escolta); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" class="text-red-500" />
              <span>{{ t('common.delete', 'Eliminar') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

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

    <EscoltaCreateModal 
      v-model:is-open="isEditModalOpen"
      :edit-item="currentEditEscolta"
      @updated="fetchEscoltas"
    />

    <EscoltaAsignarHardwareModal
      v-model:is-open="isAsignarHardwareModalOpen"
      :escolta="currentAsignarHardwareEscolta"
      @assigned="fetchEscoltas"
    />

    <EscoltaAsignarVehiculoModal
      v-model:is-open="isAsignarVehiculoModalOpen"
      :escolta="currentAsignarVehiculoEscolta"
      @assigned="fetchEscoltas"
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

<style>
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
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.8);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(75, 85, 99, 0.4);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(75, 85, 99, 0.7);
}

.dropdown-menu-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-menu-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-menu-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
