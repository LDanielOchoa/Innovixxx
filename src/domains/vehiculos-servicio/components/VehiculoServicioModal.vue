<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  LicenseIcon,
  FingerPrintIcon,
  Calendar01Icon,
  EngineIcon,
  DocumentAttachmentIcon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  Loading03Icon,
  ArrowDown01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { createVehiculoServicioApi, updateVehiculoServicioApi } from '../services/vehiculos-servicio.api'
import { createVehiculoServicioSchema, updateVehiculoServicioSchema } from '../../../schemas/vehiculos-servicio.schema'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'
import type { VehiculoServicio } from '../types/vehiculo-servicio'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  vehicle?: VehiculoServicio | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const isEditMode = computed(() => !!props.vehicle)
const { validate: validateCreate } = useFormValidator(createVehiculoServicioSchema)
const { validate: validateUpdate } = useFormValidator(updateVehiculoServicioSchema)
const { firstErrorMessage, clearErrors } = useFormError('vehiculo-modal-form')

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const isTypeDropdownOpen = ref(false)
const typeDropdownRef = ref<HTMLElement | null>(null)

const tipoOptions = [
  { value: 1, label: 'Carro' },
  { value: 2, label: 'Motocicleta' }
]

const currentTipoLabel = computed(() => {
  const typeVal = Number(formData.tipo)
  if (!typeVal) return t('vehiculosServicio.placeholderType', 'Seleccione un tipo')
  return tipoOptions.find(opt => opt.value === typeVal)?.label || t('vehiculosServicio.placeholderType', 'Seleccione un tipo')
})

const selectTipo = (opt: typeof tipoOptions[0]) => {
  formData.tipo = opt.value
  isTypeDropdownOpen.value = false
}

const formData = reactive({
  placa: '',
  serial_chasis: '',
  marca: '',
  referencia: '',
  modelo: 0,
  color: '#3b82f6',
  cilindrada: 0,
  soat: '',
  soat_vence: null as Date | null,
  tecnomecanica: '',
  tecnomecanica_vence: null as Date | null,
  tipo: 0
})

const formatFecha = (date: Date | null): string => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    clearErrors()
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    isTypeDropdownOpen.value = false
    
    if (props.vehicle) {
      formData.placa = props.vehicle.placa || ''
      formData.serial_chasis = props.vehicle.serial_chasis || ''
      formData.marca = props.vehicle.marca || ''
      formData.referencia = props.vehicle.referencia || ''
      formData.modelo = parseInt(props.vehicle.modelo as any) || 0
      formData.color = props.vehicle.color || '#3b82f6'
      formData.cilindrada = props.vehicle.cilindrada || 0
      formData.soat = props.vehicle.soat || ''
      formData.soat_vence = props.vehicle.soat_vence ? new Date(props.vehicle.soat_vence + 'T00:00:00') : null
      formData.tecnomecanica = props.vehicle.tecnomecanica || ''
      formData.tecnomecanica_vence = props.vehicle.tecnomecanica_vence ? new Date(props.vehicle.tecnomecanica_vence + 'T00:00:00') : null
      formData.tipo = parseInt(props.vehicle.tipo as any) || 0
    } else {
      Object.assign(formData, {
        placa: '', serial_chasis: '', marca: '', referencia: '',
        modelo: 0, color: '#3b82f6', cilindrada: 0,
        soat: '', soat_vence: null, tecnomecanica: '', tecnomecanica_vence: null,
        tipo: 0
      })
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 450)
  }
})

const handleSave = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id) {
    showMessage('Seleccione un grupo válido', 'error')
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload: any = {
    ...formData,
    id_grupo: groupStore.selectedGroup.id,
    modelo: Number(formData.modelo) || 0,
    tipo: Number(formData.tipo) || 0,
    cilindrada: Number(formData.cilindrada) || 0,
    soat_vence: formatFecha(formData.soat_vence),
    tecnomecanica_vence: formatFecha(formData.tecnomecanica_vence)
  }
  
  if (isEditMode.value && props.vehicle) {
    payload.id_vehiculo = props.vehicle.id_vehiculo
  }

  const isValid = isEditMode.value 
    ? validateUpdate(payload, 'vehiculo-modal-form')
    : validateCreate(payload, 'vehiculo-modal-form')

  if (!isValid) {
    saving.value = false
    showMessage(
      firstErrorMessage.value || t('vehiculosServicio.alertValidation', 'Por favor complete todos los campos obligatorios.'),
      'error'
    )
    return
  }

  try {
    let data
    if (isEditMode.value && props.vehicle) {
      data = await updateVehiculoServicioApi({ ...payload, id_vehiculo: props.vehicle.id_vehiculo })
    } else {
      data = await createVehiculoServicioApi(payload)
    }

    if (data.done) {
      isSuccess.value = true
      emit('saved')
    } else {
      showMessage(data.message || (isEditMode.value ? 'Error al actualizar' : 'Error al registrar'), 'error')
    }
  } catch (error: any) {
    console.error('Error saving vehiculo:', error)
    showMessage(error.message || 'Error de conexión', 'error')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (typeDropdownRef.value && !typeDropdownRef.value.contains(target)) {
    isTypeDropdownOpen.value = false
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
    :title="isEditMode ? t('vehiculosServicio.editTitle', 'Editar Vehículo') : t('vehiculosServicio.newTitle', 'Nuevo Vehículo')"
    :confirm-text="isEditMode ? t('vehiculosServicio.btnSave', 'Guardar Cambios') : t('vehiculosServicio.btnRegister', 'Registrar Vehículo')"
    size="xl"
    :show-footer="!isSuccess && !isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="Car01Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <!-- SKELETON LOADING -->
    <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
      <div class="grid grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="space-y-3">
          <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
      </div>
      <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
        <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>
    </div>

    <!-- SUCCESS VIEW -->
    <Transition v-else-if="isSuccess" name="fade-slide" mode="out-in">
      <div class="py-10 flex flex-col items-center justify-center text-center space-y-4">
        <div class="relative group mb-2">
          <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
            <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
          </div>
        </div>
        <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">
          {{ isEditMode ? 'Vehículo Actualizado' : 'Vehículo Registrado Exitosamente' }}
        </h3>
        <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
          {{ isEditMode ? 'Los datos del vehículo han sido modificados con éxito.' : 'El nuevo vehículo ya se encuentra registrado en el sistema.' }}
        </p>
        <div class="pt-4">
          <button
            @click="handleClose"
            class="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 px-6 py-3 text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2A313A] transition-all duration-300 shadow-sm active:scale-[0.98]"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="16" :stroke-width="2" />
            Cerrar Ventana
          </button>
        </div>
      </div>
    </Transition>

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
        <!-- Identificación -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput
            v-model="formData.placa"
            :label="t('vehiculosServicio.labelPlate', 'Placa')"
            :placeholder="t('vehiculosServicio.placeholderPlate', 'ABC-456')"
            :icon="LicenseIcon"
          />

          <!-- Tipo de Vehículo -->
          <div ref="typeDropdownRef" class="space-y-2 relative">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
              :class="isTypeDropdownOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'">
              {{ t('vehiculosServicio.labelType', 'Tipo de Vehículo') }}
            </label>
            <div
              @click="isTypeDropdownOpen = !isTypeDropdownOpen"
              class="relative flex items-center justify-between cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 transition-all duration-300"
              :class="isTypeDropdownOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'"
            >
              <div class="relative z-10 flex items-center gap-3">
                <HugeiconsIcon :icon="Car01Icon" :size="16" :stroke-width="1.8" class="text-slate-400" />
                <span class="text-sm font-semibold" :class="formData.tipo ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                  {{ currentTipoLabel }}
                </span>
              </div>
              <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="relative z-10 text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isTypeDropdownOpen }" />
            </div>

            <Transition name="dropdown">
              <div v-if="isTypeDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[250] overflow-hidden">
                <div class="p-2 space-y-0.5">
                  <button
                    v-for="opt in tipoOptions"
                    :key="opt.value"
                    type="button"
                    @click="selectTipo(opt)"
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                    :class="formData.tipo === opt.value
                      ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border border-[#3b82f6]/40 dark:border-[#3b82f6]/30'
                      : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'"
                  >
                    <span class="text-[13px] font-semibold"
                      :class="formData.tipo === opt.value ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                    >{{ opt.label }}</span>
                    <HugeiconsIcon v-if="formData.tipo === opt.value" :icon="Tick01Icon" :size="14" :stroke-width="3" class="text-[#3b82f6] shrink-0 ml-2" />
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <AppInput
          v-model="formData.serial_chasis"
          :label="t('vehiculosServicio.labelSerial', 'Serial de Chasis')"
          :placeholder="t('vehiculosServicio.placeholderSerial', 'A456')"
          :icon="FingerPrintIcon"
        />

        <div class="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput
              v-model="formData.marca"
              :label="t('vehiculosServicio.labelBrand', 'Marca')"
              :placeholder="t('vehiculosServicio.placeholderBrand', 'Honda')"
              :icon="Car01Icon"
            />
            <AppInput
              v-model="formData.referencia"
              :label="t('vehiculosServicio.labelReference', 'Referencia')"
              :placeholder="t('vehiculosServicio.placeholderReference', 'CB-190')"
              :icon="Car01Icon"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AppInput
            v-model="formData.modelo"
            :label="t('vehiculosServicio.labelModel', 'Modelo')"
            :placeholder="t('vehiculosServicio.placeholderModel', '2013')"
            :icon="Calendar01Icon"
            type="number"
          />
          <AppInput
            v-model="formData.cilindrada"
            :label="t('vehiculosServicio.labelCc', 'Cilindrada')"
            :placeholder="t('vehiculosServicio.placeholderCc', '199')"
            :icon="EngineIcon"
            type="number"
          />
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 text-slate-400 dark:text-slate-500">
              {{ t('vehiculosServicio.labelColor', 'Color') }}
            </label>
            <div class="relative flex items-center justify-center bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 transition-all duration-300 min-h-[46px]">
              <input type="color" v-model="formData.color" class="w-8 h-6 rounded border-none bg-transparent cursor-pointer p-0 shrink-0" />
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput
              v-model="formData.soat"
              :label="t('vehiculosServicio.labelSoat', 'SOAT')"
              :placeholder="t('vehiculosServicio.placeholderSoat', 'J456789')"
              :icon="DocumentAttachmentIcon"
            />
            <AppDateTimePicker
              v-model="formData.soat_vence"
              :label="t('vehiculosServicio.labelSoatVence', 'Vencimiento SOAT')"
              :placeholder="t('vehiculosServicio.placeholderSoatVence', 'Seleccione fecha')"
              :only-date="true"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput
            v-model="formData.tecnomecanica"
            :label="t('vehiculosServicio.labelTecnomecanica', 'Tecnomecánica')"
            :placeholder="t('vehiculosServicio.placeholderTecnomecanica', 'u456790')"
            :icon="DocumentAttachmentIcon"
          />
          <AppDateTimePicker
            v-model="formData.tecnomecanica_vence"
            :label="t('vehiculosServicio.labelTecnomecanicaVence', 'Venc. Tecnomecánica')"
            :placeholder="t('vehiculosServicio.placeholderTecnomecanicaVence', 'Seleccione fecha')"
            :only-date="true"
          />
        </div>
      </div>
    </form>
  </AppModal>
</template>

<style>
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

input[type="color"] {
  appearance: none; -webkit-appearance: none; border: none; padding: 0;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0; }
</style>
