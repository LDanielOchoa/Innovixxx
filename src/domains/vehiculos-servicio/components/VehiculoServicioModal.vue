<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
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
  FloppyDiskIcon,
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
import AppButton from '../../../components/ui/AppButton.vue'
import type { VehiculoServicio } from '../types/vehiculo-servicio'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue'


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
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)
const isTypeFocused = ref(false)

const tipoOptions = [
  { value: 1, label: 'Carro' },
  { value: 2, label: 'Moto' }
]

const currentTipoLabel = computed(() => {
  const typeVal = Number(formData.tipo)
  if (!typeVal) return t('vehiculosServicio.placeholderType', 'Seleccione un tipo')
  return tipoOptions.find(opt => opt.value === typeVal)?.label || t('vehiculosServicio.placeholderType', 'Seleccione un tipo')
})

const formData = reactive({
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
  tipo: 0
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    clearErrors()
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    
    if (props.vehicle) {
      formData.placa = props.vehicle.placa || ''
      formData.serial_chasis = props.vehicle.serial_chasis || ''
      formData.marca = props.vehicle.marca || ''
      formData.referencia = props.vehicle.referencia || ''
      formData.modelo = parseInt(props.vehicle.modelo as any) || 0
      formData.color = props.vehicle.color || '#3b82f6'
      formData.cilindrada = props.vehicle.cilindrada || 0
      formData.soat = props.vehicle.soat || ''
      formData.soat_vence = props.vehicle.soat_vence || ''
      formData.tecnomecanica = props.vehicle.tecnomecanica || ''
      formData.tecnomecanica_vence = props.vehicle.tecnomecanica_vence || ''
      formData.tipo = parseInt(props.vehicle.tipo as any) || 0
    } else {
      formData.placa = ''
      formData.serial_chasis = ''
      formData.marca = ''
      formData.referencia = ''
      formData.modelo = 0
      formData.color = '#3b82f6'
      formData.cilindrada = 0
      formData.soat = ''
      formData.soat_vence = ''
      formData.tecnomecanica = ''
      formData.tecnomecanica_vence = ''
      formData.tipo = 0
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

const handleSave = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id) {
    modalMessage.value = { text: 'Seleccione un grupo válido', type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload: any = {
    ...formData,
    id_grupo: groupStore.selectedGroup.id,
    modelo: Number(formData.modelo) || 0,
    tipo: Number(formData.tipo) || 0,
    cilindrada: Number(formData.cilindrada) || 0
  }
  
  if (isEditMode.value && props.vehicle) {
    payload.id_vehiculo = props.vehicle.id_vehiculo
  }

  const isValid = isEditMode.value 
    ? validateUpdate(payload, 'vehiculo-modal-form')
    : validateCreate(payload, 'vehiculo-modal-form')

  if (!isValid) {
    saving.value = false
    modalMessage.value = { 
      text: firstErrorMessage.value || t('vehiculosServicio.alertValidation', 'Por favor complete todos los campos obligatorios marcados.'), 
      type: 'error' 
    }
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
      modalMessage.value = { 
        text: data.message || (isEditMode.value ? 'Error al actualizar' : 'Error al registrar'), 
        type: 'error' 
      }
    }
  } catch (error: any) {
    console.error('Error saving vehiculo:', error)
    modalMessage.value = { text: error.message || 'Error de conexión', type: 'error' }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const confirmText = computed(() => {
  if (isSuccess.value) return t('common.close') || 'Cerrar'
  return isEditMode.value ? t('vehiculosServicio.btnSave', 'Guardar Cambios') : t('vehiculosServicio.btnRegister', 'Registrar Vehículo')
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    :title="isEditMode ? t('vehiculosServicio.editTitle', 'Editar Vehículo') : t('vehiculosServicio.newTitle', 'Nuevo Vehículo')"
    size="xl"
    :show-footer="false"
    :confirm-text="confirmText"
    @confirm="isSuccess ? handleClose() : handleSave()"
  >
    <template #icon>
      <HugeiconsIcon :icon="Car01Icon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- OVERLAY DE CARGA -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-[#13161C]/80 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('common.saving') || 'Guardando' }}</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse p-4">
        <div class="space-y-3">
          <div class="h-2 w-16 bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-white/5 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-3">
            <div class="h-2 w-20 bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-white/5 rounded-xl"></div>
          </div>
          <div class="space-y-3">
            <div class="h-2 w-20 bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-2 w-32 bg-white/5 rounded-full"></div>
          <div class="h-12 w-full bg-white/5 rounded-xl"></div>
        </div>
      </div>

      <!-- SUCCESS STATE -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-white tracking-tight">
            {{ isEditMode ? 'Vehículo Actualizado Correctamente' : 'Vehículo Registrado Correctamente' }}
          </h3>
          <p class="text-[13px] text-slate-400 max-w-[320px]">
            {{ isEditMode ? 'El vehículo ha sido actualizado exitosamente en el sistema.' : 'El vehículo ha sido registrado exitosamente en el sistema.' }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cerrar Ventana
            </AppButton>
          </div>
        </div>

        <!-- FORM CONTENT -->
        <div v-else-if="!isInitializing" class="animate-fade-in space-y-6">
          <!-- Card Glassmorphic Dark -->
          <div class="modal-card space-y-8 bg-gradient-to-b from-[#1A1D24]/90 to-[#0F1115]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[24px] border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.4)] relative group/form overflow-visible">
            <!-- Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Feedback Message -->
            <Transition name="fade">
              <div v-if="modalMessage"
                   class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold border animate-fade-in-up relative z-10"
                   :class="modalMessage.type === 'error'
                     ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-400 border-red-500/20'
                     : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#5da6fc] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : Tick01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <!-- Identificacion -->
            <div class="space-y-5 relative z-10">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                  <HugeiconsIcon :icon="LicenseIcon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionIdentity', 'Identificación') }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">Datos de placa, tipo y serial del vehículo.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 modal-form-fields">
                <AppInput
                  v-model="formData.placa"
                  :label="$t('vehiculosServicio.labelPlate', 'Placa')"
                  :placeholder="$t('vehiculosServicio.placeholderPlate', 'ABC-456')"
                  :icon="LicenseIcon"
                />
                
                <div class="space-y-2 w-full">
                  <label 
                    class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                    :class="{ 'text-[#5da6fc]': isTypeFocused, 'text-slate-400': !isTypeFocused }"
                  >
                    {{ $t('vehiculosServicio.labelType', 'Tipo de Vehículo') }}
                  </label>
                  
                  <Listbox v-model="formData.tipo">
                    <div 
                      class="relative flex items-center group/input bg-[#0F1115] border border-white/5 rounded-[14px] transition-all duration-300 h-[48px]"
                      :class="{ 
                        'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20': isTypeFocused,
                        'hover:border-white/15': !isTypeFocused
                      }"
                    >
                      <div 
                        class="absolute inset-0 pointer-events-none rounded-[14px] transition-shadow duration-300"
                        :class="isTypeFocused 
                          ? 'shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                          : 'shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
                      ></div>

                      <div 
                        class="relative z-10 pl-4 pr-2 text-slate-400 transition-all duration-300"
                        :class="isTypeFocused ? 'text-[#5da6fc]' : 'group-hover/input:text-slate-400'"
                      >
                        <HugeiconsIcon :icon="Car01Icon" :size="18" :stroke-width="1.8" />
                      </div>
                      
                      <ListboxButton
                        @focus="isTypeFocused = true"
                        @blur="isTypeFocused = false"
                        class="relative z-10 w-full h-full bg-transparent border-none px-0 text-left text-sm font-medium text-slate-200 focus:outline-none focus:ring-0 transition-colors duration-300 appearance-none cursor-pointer flex items-center"
                      >
                        <span class="block truncate">{{ currentTipoLabel }}</span>
                      </ListboxButton>

                      <div 
                        class="relative z-10 pr-4 pl-2 text-slate-400 pointer-events-none transition-colors duration-300"
                        :class="isTypeFocused ? 'text-[#5da6fc]' : 'group-hover/input:text-slate-400'"
                      >
                        <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                      </div>

                      <Transition
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100"
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[#1A1D24] py-1 text-base shadow-lg ring-1 ring-white/10 focus:outline-none sm:text-sm top-full"
                        >
                          <ListboxOption
                            v-slot="{ active, selected }"
                            v-for="option in tipoOptions"
                            :key="option.value"
                            :value="option.value"
                            as="template"
                          >
                            <li
                              :class="[
                                active ? 'bg-[#5da6fc]/10 text-[#5da6fc]' : 'text-slate-200',
                                'relative cursor-pointer select-none py-2.5 pl-4 pr-4 transition-colors duration-200 font-medium'
                              ]"
                            >
                              <span :class="[selected ? 'font-black text-[#5da6fc]' : 'font-medium', 'block truncate']">{{ option.label }}</span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                <AppInput
                  v-model="formData.serial_chasis"
                  :label="$t('vehiculosServicio.labelSerial', 'Serial de Chasis')"
                  :placeholder="$t('vehiculosServicio.placeholderSerial', 'A456')"
                  :icon="FingerPrintIcon"
                />
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-white/5 relative z-10"></div>

            <!-- Detalles -->
            <div class="space-y-5 relative z-10">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                  <HugeiconsIcon :icon="Car01Icon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionDetails', 'Detalles') }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">Marca, referencia, modelo y especificaciones físicas.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 modal-form-fields">
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

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 modal-form-fields">
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
                <div class="space-y-2 w-full">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-400">{{ $t('vehiculosServicio.labelColor', 'Color') }}</label>
                  <div class="relative flex items-center gap-3 px-4 h-[48px] bg-[#0F1115] border border-white/5 hover:border-white/15 rounded-[14px] overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300">
                    <input type="color" v-model="formData.color" class="w-6 h-6 rounded border-none bg-transparent cursor-pointer overflow-hidden p-0" />
                    <span class="text-sm font-medium text-slate-200 font-mono uppercase">{{ formData.color }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-white/5 relative z-10"></div>

            <!-- Documentos -->
            <div class="space-y-5 relative z-10">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                  <HugeiconsIcon :icon="DocumentAttachmentIcon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ $t('vehiculosServicio.sectionDocuments', 'Documentos') }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">SOAT y tecnomecánica con fechas de vencimiento.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 modal-form-fields">
                <AppInput
                  v-model="formData.soat"
                  :label="$t('vehiculosServicio.labelSoat', 'SOAT')"
                  :placeholder="$t('vehiculosServicio.placeholderSoat', 'J456789')"
                  :icon="DocumentAttachmentIcon"
                />
                <AppInput
                  v-model="formData.soat_vence"
                  :label="$t('vehiculosServicio.labelSoatVence', 'Vencimiento SOAT')"
                  type="date"
                  :icon="Calendar01Icon"
                  class="custom-datetime-input"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 modal-form-fields">
                <AppInput
                  v-model="formData.tecnomecanica"
                  :label="$t('vehiculosServicio.labelTecnomecanica', 'Tecnomecánica')"
                  :placeholder="$t('vehiculosServicio.placeholderTecnomecanica', 'u456790')"
                  :icon="DocumentAttachmentIcon"
                />
                <AppInput
                  v-model="formData.tecnomecanica_vence"
                  :label="$t('vehiculosServicio.labelTecnomecanicaVence', 'Venc. Tecnomecánica')"
                  type="date"
                  :icon="Calendar01Icon"
                  class="custom-datetime-input"
                />
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.cancel') || 'Cancelar' }}
            </AppButton>
            <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleSave">
              {{ isEditMode ? t('vehiculosServicio.btnSave', 'Guardar Cambios') : t('vehiculosServicio.btnRegister', 'Registrar Vehículo') }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

.animate-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

input[type="color"] {
  appearance: none; -webkit-appearance: none; border: none; padding: 0;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 0; }

input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
input[type="date"] {
  appearance: none;
  -webkit-appearance: none;
}

select {
  background-image: none !important;
}

/* Overrides para inputs dentro del modal - estilo glassmorphism dark */
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
