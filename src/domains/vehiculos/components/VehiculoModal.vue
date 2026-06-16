<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  LicenseIcon,
  FingerPrintIcon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  Loading03Icon,
  ArrowDown01Icon,
  Search01Icon,
  TruckIcon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { createVehiculoApi, updateVehiculoApi, fetchVehicleTypesApi } from '../services/vehiculos.api'
import { createVehiculoSchema, updateVehiculoSchema } from '../../../schemas/vehiculos.schema'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import type { Vehiculo, TipoVehiculo } from '../types/vehiculo'

import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  vehicle?: Vehiculo | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const isEditMode = computed(() => !!props.vehicle)
const activeSchema = computed(() => isEditMode.value ? updateVehiculoSchema : createVehiculoSchema)
const { validate, getFirstError, resetErrors } = useFormValidator(activeSchema as any)
const { getError, clearErrors } = useFormError('vehiculo-modal-form')

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const vehicleTypes = ref<TipoVehiculo[]>([])
const loadingTypes = ref(false)
const isTypeDropdownOpen = ref(false)
const typeSearchQuery = ref('')
const typeDropdownRef = ref<HTMLElement | null>(null)

const formData = reactive({
  nombre: '',
  placa: '',
  serial: '',
  tipo: 0 as number | string,
  estado: 1
})

const filteredTypes = computed(() => {
  const q = typeSearchQuery.value.toLowerCase().trim()
  if (!q) return vehicleTypes.value
  return vehicleTypes.value.filter(t => t.nombre.toLowerCase().includes(q))
})

const selectedTypeLabel = computed(() => {
  if (!formData.tipo) return t('vehiculos.placeholderType', 'Seleccione un tipo')
  const found = vehicleTypes.value.find(t => String(t.id_tipo) === String(formData.tipo) || t.nombre === formData.tipo)
  return found ? found.nombre : t('vehiculos.placeholderType', 'Seleccione un tipo')
})

const selectType = (type: TipoVehiculo) => {
  formData.tipo = type.id_tipo
  isTypeDropdownOpen.value = false
  typeSearchQuery.value = ''
}

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    resetErrors('vehiculo-modal-form')
    clearErrors()
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    isTypeDropdownOpen.value = false
    typeSearchQuery.value = ''

    if (vehicleTypes.value.length === 0) {
      loadingTypes.value = true
      try {
        vehicleTypes.value = await fetchVehicleTypesApi()
      } catch (error) {
        console.error('Error fetching vehicle types:', error)
      } finally {
        loadingTypes.value = false
      }
    }

    if (props.vehicle) {
      formData.nombre = props.vehicle.nombre || ''
      formData.placa = props.vehicle.placa || ''
      formData.serial = props.vehicle.serial || ''
      
      const matchedType = vehicleTypes.value.find(
        t => String(t.id_tipo) === String(props.vehicle.tipo) || t.nombre === props.vehicle.tipo
      )
      formData.tipo = matchedType ? matchedType.id_tipo : (props.vehicle.tipo || 0)
      
      formData.estado = props.vehicle.estado !== undefined && props.vehicle.estado !== null ? props.vehicle.estado : 1
    } else {
      formData.nombre = ''
      formData.placa = ''
      formData.serial = ''
      formData.tipo = 0
      formData.estado = 1
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 450)
  }
})

const handleSave = async () => {
  if (saving.value) return
  saving.value = true
  clearErrors()
  modalMessage.value = null

  if (!groupStore.selectedGroup?.id) {
    showMessage('Seleccione un grupo válido', 'error')
    saving.value = false
    return
  }

  const payload: any = {
    ...formData,
    id_grupo: groupStore.selectedGroup.id
  }

  if (isEditMode.value && props.vehicle) {
    payload.id_vehiculo = props.vehicle.id_vehiculo
  }

  const isValid = validate(payload, 'vehiculo-modal-form')

  if (!isValid) {
    saving.value = false
    showMessage(
      getFirstError('vehiculo-modal-form') || t('vehiculos.alertValidation', 'Por favor complete todos los campos obligatorios.'),
      'error'
    )
    return
  }

  try {
    let data
    if (isEditMode.value && props.vehicle) {
      data = await updateVehiculoApi({ ...payload, id_vehiculo: props.vehicle.id_vehiculo })
    } else {
      data = await createVehiculoApi(payload)
    }

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: isEditMode.value ? t('vehiculos.alertSuccessUpdateTitle', 'Vehículo Actualizado') : t('vehiculos.alertSuccessCreateTitle', 'Vehículo Registrado'),
        detail: data.message || (isEditMode.value ? t('vehiculos.alertSuccessUpdateDetail', 'El vehículo ha sido modificado exitosamente.') : t('vehiculos.alertSuccessCreateDetail', 'El vehículo ha sido registrado exitosamente.')),
        life: 4000
      })
      emit('saved')
      if (isEditMode.value) {
        handleClose()
      } else {
        // Clear creation form
        formData.nombre = ''
        formData.placa = ''
        formData.serial = ''
        formData.tipo = 0
        formData.estado = 1
        resetErrors('vehiculo-modal-form')
        clearErrors()
      }
    } else {
      showMessage(data.message || (isEditMode.value ? 'Error al actualizar' : 'Error al registrar'), 'error')
    }
  } catch (error: any) {
    console.error('Error saving vehiculo:', error)
    if (error instanceof ApiError || (error && typeof error === 'object' && ('code' in error || error.name === 'ApiError'))) {
      const code = error.code
      let msg = ''
      if (code === 400 || code === 500 || code === 422) {
        msg = error.message || getErrorMessage(code)
      } else {
        msg = getErrorMessage(code) || error.message
      }
      showMessage(msg, 'error')
    } else {
      showMessage(error.message || 'Error de conexión', 'error')
    }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  if (saving.value) return
  emit('update:isOpen', false)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (typeDropdownRef.value && !typeDropdownRef.value.contains(target)) {
    isTypeDropdownOpen.value = false
    typeSearchQuery.value = ''
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleSave"
    :close-on-click-outside="!saving"
    :title="isEditMode ? t('vehiculos.editTitle', 'Editar Vehículo') : t('vehiculos.newTitle', 'Nuevo Vehículo')"
    :confirm-text="isEditMode ? t('vehiculos.btnSave', 'Guardar Cambios') : t('vehiculos.btnRegister', 'Registrar Vehículo')"
    size="xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <!-- SKELETON LOADING -->
    <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 3" :key="i" class="space-y-3">
          <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
      </div>
      <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
        <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>
    </div>

    <!-- FORM -->
    <form v-else @submit.prevent="handleSave" class="space-y-6 relative">
      <!-- Saving Overlay -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ isEditMode ? 'Actualizando...' : 'Guardando...' }}
            </span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Feedback Message -->
      <Transition name="message-fade">
        <div v-if="modalMessage"
             class="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border mb-6"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
             }">
          <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="18" class="text-[#3b82f6]" />
          {{ modalMessage.text }}
        </div>
      </Transition>

      <div class="space-y-5">
        <AppInput
          v-model="formData.nombre"
          :label="t('vehiculos.labelName', 'Nombre del Vehículo')"
          :placeholder="t('vehiculos.placeholderName', 'Ej. Camión Principal')"
          :icon="LicenseIcon"
          :disabled="saving"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput
            v-model="formData.placa"
            :label="t('vehiculos.labelPlate', 'Placa')"
            :placeholder="t('vehiculos.placeholderPlate', 'ABC-123')"
            :icon="LicenseIcon"
            :disabled="saving"
          />
          <AppInput
            v-model="formData.serial"
            :label="t('vehiculos.labelSerial', 'Serial / VIN')"
            :placeholder="t('vehiculos.placeholderSerial', '1HGBH41JXMN109186')"
            :icon="FingerPrintIcon"
            :disabled="saving"
          />
        </div>

        <!-- Tipo de Vehículo Selector -->
        <div ref="typeDropdownRef" class="space-y-2 relative">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
            :class="isTypeDropdownOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'">
            {{ t('vehiculos.labelType', 'Tipo de Vehículo') }}
          </label>
          <div
            @click="saving ? null : (isTypeDropdownOpen = !isTypeDropdownOpen)"
            class="relative flex items-center justify-between cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300"
            :class="[
              saving ? 'opacity-60 cursor-not-allowed' : '',
              isTypeDropdownOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'
            ]"
          >
            <!-- Sombra inset 3D -->
            <div 
              class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
              :class="isTypeDropdownOpen 
                ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
            ></div>

            <!-- Borde superior brillante en focus/open -->
            <div 
              class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300"
              :class="{ 'opacity-100 left-2 right-2': isTypeDropdownOpen }"
            ></div>

            <div class="relative z-10 flex items-center gap-3">
              <HugeiconsIcon :icon="TruckIcon" :size="18" :stroke-width="1.8" class="text-slate-400" />
              <span class="text-sm font-medium" :class="[formData.tipo ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600', saving ? 'text-slate-450 dark:text-slate-600' : '']">
                {{ selectedTypeLabel }}
              </span>
            </div>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="relative z-10 text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isTypeDropdownOpen }" />
          </div>

          <Transition name="dropdown">
            <div v-if="isTypeDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-[250] overflow-hidden">
              <div class="p-2 border-b border-slate-200/60 dark:border-white/5">
                <div class="relative flex items-center">
                  <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 text-slate-400" />
                  <input
                    v-model="typeSearchQuery"
                    type="text"
                    :placeholder="t('common.search', 'Buscar...')"
                    class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/30 transition-all"
                    @click.stop
                    autocomplete="off"
                  />
                </div>
              </div>
              <div class="max-h-52 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                <button
                  v-for="type in filteredTypes"
                  :key="type.id_tipo"
                  type="button"
                  @click="selectType(type)"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left group/option"
                  :class="formData.tipo === type.id_tipo
                    ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                >
                  <span class="text-[13px] font-medium truncate">{{ type.nombre }}</span>
                  <HugeiconsIcon v-if="formData.tipo === type.id_tipo" :icon="Tick01Icon" :size="14" :stroke-width="2.5" class="text-[#3b82f6] shrink-0 ml-2" />
                </button>
                <div v-if="filteredTypes.length === 0" class="py-6 text-center">
                  <p class="text-[12px] font-semibold text-slate-400 dark:text-slate-500">Sin resultados</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex flex-col sm:flex-row w-full gap-3 justify-end">
        <button
          type="button"
          @click="handleClose"
          :disabled="saving"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 px-6 py-3 bg-white dark:bg-[#1A1D24] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] focus:outline-none transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="handleSave"
          :disabled="saving"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-80 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >
          <HugeiconsIcon v-if="saving" :icon="Loading03Icon" :size="16" class="animate-spin" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="16" />
          {{ saving ? (isEditMode ? 'Guardando cambios...' : 'Registrando vehículo...') : (isEditMode ? t('vehiculos.btnSave', 'Guardar Cambios') : t('vehiculos.btnRegister', 'Registrar Vehículo')) }}
        </button>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(12px);
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}

/* =====================================================
   SELECTOR BUTTON
===================================================== */
.selector-btn-roles {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  gap: 0;
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 0.5rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  font-family: inherit;
  color: inherit;
}

.selector-btn-roles:hover {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
}

.selector-btn-roles:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
}

.selector-btn-roles.border-\[\#3b82f6\]\/50,
.selector-btn-roles.border-\[\#3b82f6\]\/40 {
  border-color: rgba(59,130,246,0.5);
  box-shadow: 0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
}

/* Overrides para inputs dentro del modal */
:deep(.modal-card .bg-slate-50) {
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
}
:deep(.modal-card .border-slate-200) {
  border-color: rgba(255,255,255,0.08) !important;
}
:deep(.modal-card .text-slate-800) {
  color: #e2e8f0 !important;
}
:deep(.modal-card .placeholder-slate-400) {
  color: #475569 !important;
}
:deep(.modal-card .placeholder-slate-600) {
  color: #475569 !important;
}
:deep(.modal-card .text-slate-700) {
  color: #e2e8f0 !important;
}
:deep(.modal-card .bg-white) {
  background: linear-gradient(180deg, rgba(26,29,36,0.98) 0%, rgba(15,17,21,0.99) 100%) !important;
}
</style>
