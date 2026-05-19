<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Add01Icon,
  Search01Icon,
  Download01Icon,
  Edit02Icon,
  Delete01Icon,
  Car01Icon,
  FingerPrintIcon,
  Calendar01Icon,
  Cancel01Icon,
  LicenseIcon,
  EngineIcon,
  Document,
  ArrowLeft01Icon,
  FloppyDiskIcon,
  Alert01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppDatePicker from '../../../components/ui/AppDatePicker.vue'
import Column from 'primevue/column'
import {
  fetchVehiculosServicioApi,
  deleteVehiculoServicioApi,
  createVehiculoServicioApi,
  updateVehiculoServicioApi
} from '../services/vehiculos-servicio.api'
import type { VehiculoServicio } from '../types/vehiculo-servicio'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createVehiculoServicioSchema, updateVehiculoServicioSchema } from '../../../schemas/vehiculos-servicio.schema'
import { useVehiculosServicioPanel } from '../../../composables/useVehiculosServicioPanel'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const vehicles = ref<VehiculoServicio[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const { isPanelOpen } = useVehiculosServicioPanel()

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

// ─── Slide Panel ────────────────────────────────────────

const isEditMode = ref(false)
const editingVehicle = ref<VehiculoServicio | null>(null)
const saving = ref(false)
const pageMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

const activeSchema = computed(() => isEditMode.value ? updateVehiculoServicioSchema : createVehiculoServicioSchema)
const { validate } = useFormValidator(activeSchema as any)
const { getError } = useFormError('vehiculo-servicio-panel')

const formData = ref({
  placa: '',
  serial_chasis: '',
  marca: '',
  referencia: '',
  modelo: 0,
  color: '#3b82f6',
  cilindrada: 0,
  soat: '',
  soat_vence: '',
  tecnomecanica: '',
  tecnomecanica_vence: '',
  tipo: 0,
  id_grupo: ''
})

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

const openCreatePanel = () => {
  isEditMode.value = false
  editingVehicle.value = null
  resetForm()
  isPanelOpen.value = true
}

const openEditPanel = (vehicle: VehiculoServicio) => {
  isEditMode.value = true
  editingVehicle.value = vehicle
  formData.value = {
    placa: vehicle.placa || '',
    serial_chasis: vehicle.serial_chasis || '',
    marca: vehicle.marca || '',
    referencia: vehicle.referencia || '',
    modelo: parseInt(vehicle.modelo) || 0,
    color: vehicle.color || '#3b82f6',
    cilindrada: vehicle.cilindrada || 0,
    soat: vehicle.soat || '',
    soat_vence: vehicle.soat_vence || '',
    tecnomecanica: vehicle.tecnomecanica || '',
    tecnomecanica_vence: vehicle.tecnomecanica_vence || '',
    tipo: parseInt(vehicle.tipo) || 0,
    id_grupo: selectedGroup.value?.id || ''
  }
  pageMessage.value = null
  isPanelOpen.value = true
}

const closePanel = () => {
  isPanelOpen.value = false
  editingVehicle.value = null
  pageMessage.value = null
}

const resetForm = () => {
  formData.value = {
    placa: '',
    serial_chasis: '',
    marca: '',
    referencia: '',
    modelo: 0,
    color: '#3b82f6',
    cilindrada: 0,
    soat: '',
    soat_vence: '',
    tecnomecanica: '',
    tecnomecanica_vence: '',
    tipo: 0,
    id_grupo: selectedGroup.value?.id || ''
  }
  pageMessage.value = null
}

const handleSubmit = async () => {
  if (saving.value) return
  saving.value = true
  pageMessage.value = null

  const payload = {
    ...formData.value,
    id_grupo: selectedGroup.value?.id || '',
    modelo: Number(formData.value.modelo) || 0,
    tipo: Number(formData.value.tipo) || 0,
    cilindrada: Number(formData.value.cilindrada) || 0
  }

  if (!validate(payload, 'vehiculo-servicio-panel')) {
    saving.value = false
    return
  }

  try {
    if (isEditMode.value && editingVehicle.value) {
      const data = await updateVehiculoServicioApi({ ...payload, id_vehiculo: editingVehicle.value.id_vehiculo })
      if (data.done) {
        showMessage(t('vehiculosServicio.alertSuccessUpdate', 'Vehículo actualizado correctamente.'), 'success')
        await fetchVehicles()
        setTimeout(() => closePanel(), 1500)
      } else {
        showMessage(data.message || t('vehiculosServicio.alertErrorUpdate', 'Error al actualizar.'), 'error')
      }
    } else {
      const data = await createVehiculoServicioApi(payload)
      if (data.done) {
        showMessage(t('vehiculosServicio.alertSuccessCreate', 'Vehículo creado correctamente.'), 'success')
        await fetchVehicles()
        setTimeout(() => closePanel(), 1500)
      } else {
        showMessage(data.message || t('vehiculosServicio.alertErrorCreate', 'Error al crear.'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      showMessage('Error de red al procesar la solicitud.', 'error')
    }
  } finally {
    saving.value = false
  }
}

onUnmounted(() => {
  isPanelOpen.value = false
})
</script>

<template>
  <div class="relative">
    <!-- Main Content -->
    <div class="p-4 md:p-8 space-y-8 animate-fade-in font-inter" :class="{ 'opacity-30 pointer-events-none blur-[2px]': isPanelOpen }">
      <!-- Header -->
      <AppPageHeader
        :title="$t('vehiculosServicio.title')"
        :subtitle="`${$t('vehiculosServicio.subtitle')} ${selectedGroup.nombre}`"
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
              @click="openCreatePanel"
            >
              <span>{{ $t('vehiculosServicio.btnNew') }}</span>
            </AppButton>
          </div>
        </template>
      </AppPageHeader>

      <!-- Search -->
      <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
        <div class="flex-1 w-full max-w-2xl">
          <AppSearch
            v-model="searchQuery"
            :placeholder="$t('vehiculosServicio.searchPlaceholder')"
          />
        </div>
      </div>

      <!-- Table Card -->
      <AppTableCard>
        <AppTable
          :value="filteredVehicles"
          :loading="isLoading"
          :rows="itemsPerPage"
          :first="(currentPage - 1) * itemsPerPage"
          removableSort
          :empty-message="$t('vehiculosServicio.noResults', 'No se encontraron vehículos de servicio')"
        >
          <template #empty-icon>
            <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
          </template>
          <template #empty-subtitle>{{ $t('common.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

          <Column field="placa" :header="$t('vehiculosServicio.thPlate', 'Placa / Serial')" sortable>
            <template #body="{ data }">
              <div class="flex flex-col py-1">
                <span class="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ data.placa || '---' }}</span>
                <div class="flex items-center gap-1.5 mt-1 opacity-60">
                  <HugeiconsIcon :icon="FingerPrintIcon" :size="10" />
                  <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.serial_chasis || 'S/N' }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="marca" :header="$t('vehiculosServicio.thBrand', 'Marca / Referencia')" sortable>
            <template #body="{ data }">
              <div class="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 group/brand">
                <HugeiconsIcon :icon="Car01Icon" :size="14" class="text-slate-400 group-hover/brand:text-[#3b82f6] transition-colors" />
                <div class="flex flex-col">
                  <span class="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">{{ data.marca || '---' }}</span>
                  <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500">{{ data.referencia || '' }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="tipo" :header="$t('vehiculosServicio.thType', 'Tipo')" sortable>
            <template #body="{ data }">
              <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">{{ data.tipo || '---' }}</span>
            </template>
          </Column>

          <Column field="modelo" :header="$t('vehiculosServicio.thModel', 'Modelo')" sortable>
            <template #body="{ data }">
              <span class="text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{{ data.modelo || '---' }}</span>
            </template>
          </Column>

          <Column field="color" :header="$t('vehiculosServicio.thColor', 'Color')" sortable>
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <div
                  class="w-5 h-5 rounded-full border border-slate-200 dark:border-white/10 shadow-sm"
                  :style="{ backgroundColor: data.color || '#ccc' }"
                ></div>
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">{{ data.color || '---' }}</span>
              </div>
            </template>
          </Column>

          <Column field="cilindrada" :header="$t('vehiculosServicio.thCc', 'Cilindrada')" sortable>
            <template #body="{ data }">
              <span class="text-[13px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{{ data.cilindrada || 0 }}<span class="text-[10px] font-bold text-slate-400 ml-0.5">cc</span></span>
            </template>
          </Column>

          <Column field="soat" :header="$t('vehiculosServicio.thSoat', 'SOAT')" sortable>
            <template #body="{ data }">
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">{{ data.soat || '---' }}</span>
                <div v-if="data.soat_vence" class="flex items-center gap-1">
                  <HugeiconsIcon :icon="Calendar01Icon" :size="10" :class="isDateExpired(data.soat_vence) ? 'text-red-400' : 'text-emerald-400'" />
                  <AppBadge
                    :variant="isDateExpired(data.soat_vence) ? 'danger' : 'success'"
                    class="!text-[9px] !px-1.5 !py-0"
                  >
                    {{ isDateExpired(data.soat_vence) ? $t('vehiculosServicio.expired', 'Vencido') : $t('vehiculosServicio.valid', 'Vigente') }}
                  </AppBadge>
                  <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.soat_vence }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="tecnomecanica" :header="$t('vehiculosServicio.thTecnomecanica', 'Tecnomecánica')" sortable>
            <template #body="{ data }">
              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">{{ data.tecnomecanica || '---' }}</span>
                <div v-if="data.tecnomecanica_vence" class="flex items-center gap-1">
                  <HugeiconsIcon :icon="Calendar01Icon" :size="10" :class="isDateExpired(data.tecnomecanica_vence) ? 'text-red-400' : 'text-emerald-400'" />
                  <AppBadge
                    :variant="isDateExpired(data.tecnomecanica_vence) ? 'danger' : 'success'"
                    class="!text-[9px] !px-1.5 !py-0"
                  >
                    {{ isDateExpired(data.tecnomecanica_vence) ? $t('vehiculosServicio.expired', 'Vencido') : $t('vehiculosServicio.valid', 'Vigente') }}
                  </AppBadge>
                  <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">{{ data.tecnomecanica_vence }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="estado" :header="$t('vehiculosServicio.thStatus', 'Estado')" sortable>
            <template #body="{ data }">
              <AppBadge
                :variant="data.estado === 1 ? 'success' : 'danger'"
                class="!text-[10px]"
              >
                {{ data.estado === 1 ? $t('vehiculosServicio.statusActive', 'Activo') : $t('vehiculosServicio.statusInactive', 'Inactivo') }}
              </AppBadge>
            </template>
          </Column>

          <Column header="Acciones" class="text-right">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-3">
                <button
                  @click="openEditPanel(data)"
                  class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                  title="Editar"
                >
                  <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
                </button>
                <button
                  @click="confirmDelete(data)"
                  class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 hover:border-red-500/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                  title="Eliminar"
                >
                  <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.5" />
                </button>
              </div>
            </template>
          </Column>
        </AppTable>

        <AppPagination
          :totalRecords="filteredVehicles.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </AppTableCard>
    </div>

    <!-- Delete Confirm Modal -->
    <AppDeleteConfirm
      v-model:isOpen="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle') || 'Confirmar Eliminación'"
      :message="$t('vehiculosServicio.confirmDelete', '¿Está seguro de que desea eliminar este vehículo de servicio?')"
      @confirm="deleteVehicle"
    />

    <!-- ── Slide Panel ─────────────────────────────────────────── -->
    <Transition name="panel-overlay">
      <div
        v-if="isPanelOpen"
        class="fixed inset-0 z-[200] flex justify-end"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          @click="closePanel"
        ></div>

        <!-- Panel -->
        <div class="relative w-full max-w-[560px] h-full flex flex-col m-0 animate-fade-in">
          <div class="flex-1 flex flex-col rounded-none bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border-l border-slate-200/70 dark:border-white/[0.07] shadow-[-10px_0_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[-10px_0_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">

            <!-- Header -->
            <div class="relative px-5 pt-6 pb-5 border-b border-slate-100 dark:border-white/[0.05] shrink-0 overflow-hidden">
              <!-- Decorative background -->
              <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.06] via-transparent to-transparent pointer-events-none"></div>
              <div class="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

              <div class="relative flex items-center gap-3.5">
                <!-- 3D Back button -->
                <button
                  @click="closePanel"
                  class="w-10 h-10 rounded-[14px] flex items-center justify-center bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0] dark:active:shadow-[0_0px_0_#1D1D24] shrink-0"
                >
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="18" :stroke-width="2.5" />
                </button>

                <!-- Icon with glow -->
                <div class="relative group/icon shrink-0">
                  <div class="absolute inset-0 bg-[#3b82f6] blur-lg rounded-[14px] opacity-40 group-hover/icon:opacity-60 transition-opacity duration-300"></div>
                  <div class="w-10 h-10 rounded-[14px] bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_4px_10px_rgba(59,130,246,0.5),inset_0_2px_0_rgba(255,255,255,0.3)] border border-[#2563eb]/30 relative z-10">
                    <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <h1 class="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                    {{ isEditMode ? $t('vehiculosServicio.editTitle', 'Editar Vehiculo') : $t('vehiculosServicio.newTitle', 'Nuevo Vehiculo') }}
                  </h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.15em] mt-1">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                      {{ isEditMode ? 'Modificacion de datos' : 'Registro de nuevo vehiculo' }}
                    </span>
                  </p>
                </div>

                <!-- Close button -->
                <button
                  @click="closePanel"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                >
                  <HugeiconsIcon :icon="Cancel01Icon" :size="16" :stroke-width="2" />
                </button>
              </div>

              <!-- Save button -->
              <div class="relative mt-5">
                <button
                  @click="handleSubmit"
                  :disabled="saving"
                  class="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white text-[11px] font-black uppercase tracking-wider border border-[#2563eb]/50 shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_0_#1d4ed8,0_12px_24px_rgba(59,130,246,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
                >
                  <HugeiconsIcon :icon="FloppyDiskIcon" :size="16" :stroke-width="2.5" />
                  {{ isEditMode ? $t('vehiculosServicio.btnSave', 'Guardar Cambios') : $t('vehiculosServicio.btnRegister', 'Registrar Vehiculo') }}
                </button>
              </div>
            </div>

            <!-- Form Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-6 relative">

              <!-- Saving Overlay -->
              <Transition name="fade">
                <div v-if="saving" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 dark:bg-[#13161C]/80 backdrop-blur-md transition-all duration-300">
                  <div class="relative">
                    <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
                    <HugeiconsIcon :icon="Alert01Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
                  </div>
                  <span class="mt-4 text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em]">Guardando...</span>
                </div>
              </Transition>

              <!-- Feedback -->
              <Transition name="fade">
                <div
                  v-if="pageMessage"
                  class="flex items-center gap-3 p-4 rounded-xl text-[11px] font-black uppercase tracking-wider border"
                  :class="pageMessage.type === 'error' ? 'bg-red-500/5 text-red-500 border-red-500/10' : (pageMessage.type === 'warning' ? 'bg-amber-500/5 text-amber-500 border-amber-500/10' : 'bg-green-500/5 text-green-500 border-green-500/10')"
                >
                  <HugeiconsIcon :icon="pageMessage.type === 'success' ? Tick01Icon : Alert01Icon" :size="16" />
                  {{ pageMessage.text }}
                </div>
              </Transition>

              <!-- Identificacion -->
              <div class="space-y-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb]"></div>
                  <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionIdentity', 'Identificacion') }}</h3>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <AppInput
                    v-model="formData.placa"
                    :label="$t('vehiculosServicio.labelPlate', 'Placa')"
                    :placeholder="$t('vehiculosServicio.placeholderPlate', 'ABC-456')"
                    :icon="LicenseIcon"
                  />
                  <AppInput
                    v-model="formData.tipo"
                    :label="$t('vehiculosServicio.labelType', 'Tipo')"
                    :placeholder="$t('vehiculosServicio.placeholderType', '2')"
                    :icon="Car01Icon"
                    type="number"
                  />
                </div>

                <AppInput
                  v-model="formData.serial_chasis"
                  :label="$t('vehiculosServicio.labelSerial', 'Serial de Chasis')"
                  :placeholder="$t('vehiculosServicio.placeholderSerial', 'A456')"
                  :icon="FingerPrintIcon"
                />
              </div>

              <!-- Divider -->
              <div class="border-t border-slate-100 dark:border-white/5"></div>

              <!-- Detalles -->
              <div class="space-y-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb]"></div>
                  <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionDetails', 'Detalles') }}</h3>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <AppInput
                    v-model="formData.marca"
                    :label="$t('vehiculosServicio.labelBrand', 'Marca')"
                    :placeholder="$t('vehiculosServicio.placeholderBrand', 'Honda')"
                    :icon="Car01Icon"
                  />
                  <AppInput
                    v-model="formData.referencia"
                    :label="$t('vehiculosServicio.labelReference', 'Referencia')"
                    :placeholder="$t('vehiculosServicio.placeholderReference', 'CB-190')"
                    :icon="Car01Icon"
                  />
                </div>

                <div class="grid grid-cols-3 gap-4">
                  <AppInput
                    v-model="formData.modelo"
                    :label="$t('vehiculosServicio.labelModel', 'Modelo')"
                    :placeholder="$t('vehiculosServicio.placeholderModel', '2013')"
                    :icon="Calendar01Icon"
                    type="number"
                  />
                  <AppInput
                    v-model="formData.cilindrada"
                    :label="$t('vehiculosServicio.labelCc', 'Cilindrada')"
                    :placeholder="$t('vehiculosServicio.placeholderCc', '199')"
                    :icon="EngineIcon"
                    type="number"
                  />

                  <!-- Color -->
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculosServicio.labelColor', 'Color') }}</label>
                    <div class="relative flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]">
                      <input type="color" v-model="formData.color" class="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer overflow-hidden" />
                      <span class="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono uppercase">{{ formData.color }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-slate-100 dark:border-white/5"></div>

              <!-- Documentos -->
              <div class="space-y-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb]"></div>
                  <h3 class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionDocuments', 'Documentos') }}</h3>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <AppInput
                    v-model="formData.soat"
                    :label="$t('vehiculosServicio.labelSoat', 'SOAT')"
                    :placeholder="$t('vehiculosServicio.placeholderSoat', 'J456789')"
                    :icon="Document"
                  />
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculosServicio.labelSoatVence', 'Vencimiento SOAT') }}</label>
                    <div class="relative group/date-input">
                      <div class="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-500 pointer-events-none group-focus-within/date-input:text-[#3b82f6] dark:group-focus-within/date-input:text-[#5da6fc] transition-colors">
                        <HugeiconsIcon :icon="Calendar01Icon" :size="18" :stroke-width="2.2" />
                      </div>
                      <input
                        v-model="formData.soat_vence"
                        type="date"
                        class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 py-3 pl-11 pr-4 focus:outline-none focus:ring-0 focus:border-[#3b82f6] dark:focus:border-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <AppInput
                    v-model="formData.tecnomecanica"
                    :label="$t('vehiculosServicio.labelTecnomecanica', 'Tecnomecanica')"
                    :placeholder="$t('vehiculosServicio.placeholderTecnomecanica', 'u456790')"
                    :icon="Document"
                  />
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('vehiculosServicio.labelTecnomecanicaVence', 'Venc. Tecnomecanica') }}</label>
                    <div class="relative group/date-input">
                      <div class="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-500 pointer-events-none group-focus-within/date-input:text-[#3b82f6] dark:group-focus-within/date-input:text-[#5da6fc] transition-colors">
                        <HugeiconsIcon :icon="Calendar01Icon" :size="18" :stroke-width="2.2" />
                      </div>
                      <input
                        v-model="formData.tecnomecanica_vence"
                        type="date"
                        class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 py-3 pl-11 pr-4 focus:outline-none focus:ring-0 focus:border-[#3b82f6] dark:focus:border-[#5da6fc] transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] [color-scheme:light] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Footer Info -->
            <div class="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Los campos marcados son obligatorios
              </p>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.18); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.35); }

.animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

.panel-overlay-enter-active { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-overlay-leave-active { transition: all 0.25s cubic-bezier(0.4, 0, 1, 1); }
.panel-overlay-enter-from { opacity: 0; }
.panel-overlay-enter-from > div:last-child { transform: translateX(100%); }
.panel-overlay-leave-to { opacity: 0; }
.panel-overlay-leave-to > div:last-child { transform: translateX(100%); }

input[type="color"] {
  -webkit-appearance: none; border: none; padding: 0;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0; }

/* Custom Date Input Styling */
input[type="date"]::-webkit-calendar-picker-indicator {
  @apply cursor-pointer opacity-0 absolute inset-0 w-full h-full;
}
input[type="date"] {
  @apply appearance-none;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0; }

/* VueDatePicker Custom Styles */
:deep(.custom-dp .dp__input) {
  @apply bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 py-3 pl-11 pr-4 w-full transition-all duration-300 focus:outline-none focus:ring-0;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.04);
}
:deep(.custom-dp.custom-dp-icon .dp__input) {
  @apply pl-11;
}
:deep(.custom-dp .dp__input_icon) {
  @apply hidden;
}
:global(.dark) :deep(.custom-dp .dp__input) {
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.25);
}
:deep(.custom-dp .dp__input:focus) {
  border-color: #3b82f6;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(59,130,246,0.2);
}
:global(.dark) :deep(.custom-dp .dp__input:focus) {
  border-color: #5da6fc;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(93,166,252,0.2);
}
:deep(.custom-dp .dp__input_icon) {
  @apply text-slate-400 dark:text-slate-500;
}
:deep(.custom-dp .dp__menu) {
  @apply bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden;
}
:deep(.custom-dp .dp__menu_inner) {
  @apply p-3;
}
:deep(.custom-dp .dp__header) {
  @apply mb-2;
}
:deep(.custom-dp .dp__header_item) {
  @apply text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider;
}
:deep(.custom-dp .dp__arrow_top), :deep(.custom-dp .dp__arrow_bottom) {
  @apply hidden;
}
:deep(.custom-dp .dp__btn) {
  @apply text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors;
}
:deep(.custom-dp .dp__calendar_item) {
  @apply text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg hover:bg-[#3b82f6]/10 dark:hover:bg-[#5da6fc]/10 transition-colors;
}
:deep(.custom-dp .dp__cell_active) {
  @apply bg-[#3b82f6] dark:bg-[#5da6fc] text-white font-black shadow-md;
}
:deep(.custom-dp .dp__cell_active:hover) {
  @apply bg-[#2563eb] dark:bg-[#3b82f6];
}
:deep(.custom-dp .dp__today) {
  @apply border border-[#3b82f6]/50 dark:border-[#5da6fc]/50;
}
:deep(.custom-dp .dp__calendar_header) {
  @apply mb-2;
}
:deep(.custom-dp .dp__calendar_header_item) {
  @apply text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider;
}
:deep(.custom-dp .dp__month_year_select) {
  @apply text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors;
}
:deep(.custom-dp .dp__overlay) {
  @apply bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl;
}
:deep(.custom-dp .dp__overlay_cell_active) {
  @apply bg-[#3b82f6] dark:bg-[#5da6fc] text-white font-black;
}
:deep(.custom-dp .dp__overlay_cell) {
  @apply text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg font-bold;
}
</style>
