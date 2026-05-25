<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Car01Icon,
  LicenseIcon,
  FingerPrintIcon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
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
import AppButton from '../../../components/ui/AppButton.vue'
import type { Vehiculo, TipoVehiculo } from '../types/vehiculo'

const { t } = useI18n()
const groupStore = useGroupStore()

const props = defineProps<{
  isOpen: boolean
  vehicle?: Vehiculo | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const isEditMode = computed(() => !!props.vehicle)
const { validate: validateCreate } = useFormValidator(createVehiculoSchema)
const { validate: validateUpdate } = useFormValidator(updateVehiculoSchema)
const { firstErrorMessage, clearErrors } = useFormError('vehiculo-modal-form')

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

const vehicleTypes = ref<TipoVehiculo[]>([])
const loadingTypes = ref(false)
const isTypeDropdownOpen = ref(false)
const typeSearchQuery = ref('')

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
  const found = vehicleTypes.value.find(t => t.id_tipo === formData.tipo || t.nombre === formData.tipo)
  return found ? found.nombre : t('vehiculos.placeholderType', 'Seleccione un tipo')
})

const selectType = (type: TipoVehiculo) => {
  formData.tipo = type.id_tipo
  isTypeDropdownOpen.value = false
  typeSearchQuery.value = ''
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    clearErrors()
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    isTypeDropdownOpen.value = false
    typeSearchQuery.value = ''

    if (props.vehicle) {
      formData.nombre = props.vehicle.nombre || ''
      formData.placa = props.vehicle.placa || ''
      formData.serial = props.vehicle.serial || ''
      formData.tipo = typeof props.vehicle.tipo === 'number' ? props.vehicle.tipo : 0
      formData.estado = typeof props.vehicle.estado === 'number' ? props.vehicle.estado : 1
    } else {
      formData.nombre = ''
      formData.placa = ''
      formData.serial = ''
      formData.tipo = 0
      formData.estado = 1
    }

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
    id_grupo: groupStore.selectedGroup.id
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
      text: firstErrorMessage.value || t('vehiculos.alertValidation', 'Por favor complete todos los campos obligatorios marcados.'),
      type: 'error'
    }
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
  return isEditMode.value ? t('vehiculos.btnSave', 'Guardar Cambios') : t('vehiculos.btnRegister', 'Registrar Vehículo')
})

const handleClickOutside = (event: MouseEvent) => {
  if (!isTypeDropdownOpen.value) return
  const target = event.target as HTMLElement
  const dropdownEl = document.querySelector('.vehiculo-type-dropdown')
  if (dropdownEl && !dropdownEl.contains(target)) {
    isTypeDropdownOpen.value = false
    typeSearchQuery.value = ''
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

import { onUnmounted } from 'vue'
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    :title="isEditMode ? t('vehiculos.editTitle', 'Editar Vehículo') : t('vehiculos.newTitle', 'Nuevo Vehículo')"
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
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ $t('vehiculos.sectionIdentity', 'Identificación') }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">Nombre, placa, serial y tipo de vehículo.</p>
                </div>
              </div>

              <div class="space-y-5 modal-form-fields">
                <AppInput
                  v-model="formData.nombre"
                  :label="$t('vehiculos.labelName', 'Nombre del Vehículo')"
                  :placeholder="$t('vehiculos.placeholderName', 'Ej. Camión Principal')"
                  :icon="LicenseIcon"
                />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <AppInput
                    v-model="formData.placa"
                    :label="$t('vehiculos.labelPlate', 'Placa')"
                    :placeholder="$t('vehiculos.placeholderPlate', 'ABC-123')"
                    :icon="LicenseIcon"
                  />
                  <AppInput
                    v-model="formData.serial"
                    :label="$t('vehiculos.labelSerial', 'Serial / VIN')"
                    :placeholder="$t('vehiculos.placeholderSerial', '1HGBH41JXMN109186')"
                    :icon="FingerPrintIcon"
                  />
                </div>

                <!-- Tipo de Vehículo Dropdown -->
                <div class="space-y-2 relative vehiculo-type-dropdown">
                  <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-slate-400">
                    {{ $t('vehiculos.labelType', 'Tipo de Vehículo') }}
                  </label>

                  <button
                    type="button"
                    @click.stop="isTypeDropdownOpen = !isTypeDropdownOpen"
                    class="relative flex items-center justify-between w-full group/input bg-[#0F1115] border border-white/5 rounded-[14px] px-4 py-3 h-[48px] transition-all duration-300 hover:border-white/15"
                    :class="{ 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20': isTypeDropdownOpen }"
                  >
                    <div class="flex items-center gap-3">
                      <HugeiconsIcon :icon="TruckIcon" :size="18" :stroke-width="1.8" class="text-slate-400 group-hover/input:text-[#5da6fc] transition-colors" />
                      <span class="text-[13px] font-medium" :class="formData.tipo ? 'text-slate-200' : 'text-slate-500'">
                        {{ selectedTypeLabel }}
                      </span>
                    </div>
                    <div class="text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': isTypeDropdownOpen }">
                      <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                    </div>
                  </button>

                  <!-- Dropdown Panel -->
                  <Transition name="dropdown">
                    <div v-if="isTypeDropdownOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-[#1A1D24] border border-white/10 rounded-[18px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[60] overflow-hidden py-2">
                      <!-- Search -->
                      <div class="px-3 pb-2">
                        <div class="relative flex items-center group/search">
                          <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 text-slate-400" />
                          <input
                            v-model="typeSearchQuery"
                            type="text"
                            :placeholder="t('common.search', 'Buscar...')"
                            class="w-full pl-10 pr-4 py-2.5 bg-[#0F1115] border border-white/5 rounded-[12px] text-[13px] font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all"
                            @click.stop
                            autocomplete="off"
                          />
                        </div>
                      </div>
                      <!-- List -->
                      <ul class="max-h-52 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
                        <li
                          v-for="type in filteredTypes"
                          :key="type.id_tipo"
                          @click="selectType(type)"
                          class="flex items-center justify-between px-3 py-2.5 rounded-[10px] cursor-pointer text-[13px] font-medium transition-all duration-200"
                          :class="formData.tipo === type.id_tipo ? 'bg-[#5da6fc]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                        >
                          <span>{{ type.nombre }}</span>
                          <HugeiconsIcon v-if="formData.tipo === type.id_tipo" :icon="Tick01Icon" :size="14" :stroke-width="3" />
                        </li>
                        <li v-if="filteredTypes.length === 0" class="px-4 py-6 text-center text-[12px] text-slate-500">
                          Sin resultados
                        </li>
                      </ul>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.cancel') || 'Cancelar' }}
            </AppButton>
            <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleSave">
              {{ isEditMode ? t('vehiculos.btnSave', 'Guardar Cambios') : t('vehiculos.btnRegister', 'Registrar Vehículo') }}
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

.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
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
