<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  Tick01Icon,
  Alert01Icon,
  Tag01Icon,
  TextNumberSignIcon,
  SmartPhone01Icon,
  CpuIcon,
  LockIcon,
  ArrowDown01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons'

import {
  fetchHardwareApi,
  createHardwareApi,
  updateHardwareApi,
  fetchFamiliasApi
} from '../services/hardware.api'

import type { FamiliaHardware } from '../types/hardware'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createHardwareSchema, updateHardwareSchema } from '../../../schemas/hardware.schema'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()
const activeSchema = computed(() => isEditMode.value ? updateHardwareSchema : createHardwareSchema)
const { validate } = useFormValidator(activeSchema as any)
const { getError } = useFormError('hardware-form')

const isEditMode = computed(() => route.name === 'hardware-editar' || !!route.params.id)
const editId = computed(() => route.params.id as string)

const formData = ref({
  nombre: '',
  descripcion: '',
  serial: '',
  imei: '',
  mac: '',
  id_familia: '' as string | number,
  numero_sms: '',
  id_binario: '',
  clave_open: ''
})

const familias = ref<FamiliaHardware[]>([])
const loadingInit = ref(isEditMode.value)
const saving = ref(false)
const pageMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const isFamilyDropdownOpen = ref(false)

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

const fetchFamilias = async () => {
  try {
    familias.value = await fetchFamiliasApi()
  } catch (error) {
    console.error('Error fetching familias:', error)
  }
}

const initData = async () => {
  await fetchFamilias()
  
  if (isEditMode.value && editId.value && selectedGroup.value?.id) {
    try {
      const items = await fetchHardwareApi(selectedGroup.value.id)
      const targetDevice = items.find(i => String(i.id_hardware) === String(editId.value))
      
      if (targetDevice) {
        let familyId = targetDevice.id_familia || ''
        if (!familyId && targetDevice.familia) {
          const found = familias.value.find(f => f.nombre === targetDevice.familia)
          if (found) familyId = found.id_familia
        }

        formData.value = {
          nombre: targetDevice.nombre || '',
          descripcion: targetDevice.descripcion || '',
          serial: targetDevice.serial || '',
          imei: targetDevice.imei || '',
          mac: targetDevice.mac || '',
          id_familia: familyId,
          numero_sms: targetDevice.numero_sms || '',
          id_binario: targetDevice.id_binario || '',
          clave_open: targetDevice.clave_open || ''
        }
      } else {
        showMessage('No se pudo cargar la información del dispositivo.', 'error')
      }
    } catch (e) {
      console.error(e)
      showMessage('Error al cargar datos del dispositivo', 'error')
    } finally {
      loadingInit.value = false
    }
  } else {
    loadingInit.value = false
  }
}

onMounted(() => {
  initData()
})

const saveHardware = async () => {
  if (saving.value) return
  if (!selectedGroup.value?.id) {
    showMessage('Debe seleccionar un grupo válido', 'error')
    return
  }

  saving.value = true
  pageMessage.value = null

  const payload = {
    serial: formData.value.serial,
    id_grupo: selectedGroup.value.id,
    id_familia: Number(formData.value.id_familia),
    nombre: formData.value.nombre,
    descripcion: formData.value.descripcion || '',
    imei: formData.value.imei || '',
    mac: formData.value.mac || '',
    estado: 1,
    id_ruta: isEditMode.value ? '' : 0,
    numero_sms: formData.value.numero_sms || '',
    id_binario: formData.value.id_binario || '',
    clave_open: formData.value.clave_open || ''
  }

  if (!validate(payload, 'hardware-form')) {
    saving.value = false
    return
  }

  try {
    if (isEditMode.value && editId.value) {
      if (!authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT)) {
        showMessage(t('hardware.alertErrorUpdate') || 'No tienes permiso para editar hardware', 'error')
        saving.value = false
        return
      }
      const data = await updateHardwareApi({ ...payload, id_hardware: editId.value })
      if (data.done) {
        showMessage(t('hardware.alertSuccessUpdate') || 'Dispositivo actualizado exitosamente', 'success')
        setTimeout(() => {
          router.push('/hardware')
        }, 1500)
      } else {
        showMessage(data.message || t('hardware.alertErrorUpdate') || 'Error al actualizar', 'error')
      }
    } else {
      const data = await createHardwareApi(payload)
      if (data.done) {
        showMessage(t('hardware.alertSuccessCreate') || 'Dispositivo creado exitosamente', 'success')
        setTimeout(() => {
          router.push('/hardware')
        }, 1500)
      } else {
        showMessage(data.message || t('hardware.alertErrorCreate') || 'Error al crear', 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving hardware:', error)
      showMessage(t('hardware.alertNetError') || 'Error de conexión', 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDataLayout 
    class="theme-sync" 
    :title="isEditMode ? (t('hardware.modalTitleEdit') || 'Actualizar Dispositivo') : (t('hardware.modalTitleCreate') || 'Ingresar Dispositivo')" 
    :subtitle="isEditMode ? 'Modifique los datos técnicos del dispositivo' : 'Registre un nuevo equipo de hardware en el sistema'"
  >
    <template #actions>
      <AppButton 
        variant="secondary" 
        :icon="ArrowLeft01Icon"
        @click="router.push('/hardware')" 
      >
        <span>{{ t('common.cancel') || 'Cancelar' }}</span>
      </AppButton>

      <AppButton 
        variant="primary" 
        :icon="FloppyDiskIcon"
        :loading="saving"
        :disabled="loadingInit"
        @click="saveHardware" 
      >
        <span>{{ isEditMode ? (t('hardware.btnSave') || 'Guardar Cambios') : (t('hardware.btnRegister') || 'Crear Hardware') }}</span>
      </AppButton>
    </template>

    <div class="max-w-4xl mx-auto w-full px-4 py-6">
      <!-- Feedback Minimalista -->
      <Transition name="fade">
        <div v-if="pageMessage" 
             class="mb-8 flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg border backdrop-blur-md"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': pageMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': pageMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': pageMessage.type === 'success'
             }">
             <HugeiconsIcon v-if="pageMessage.type === 'error' || pageMessage.type === 'warning'" :icon="Alert01Icon" :size="20" />
             <HugeiconsIcon v-else :icon="Tick01Icon" :size="20" />
             {{ pageMessage.text }}
        </div>
      </Transition>

      <Transition name="fade-slide" mode="out-in">
        <!-- Skeleton Loading State -->
        <div v-if="loadingInit" key="loading" class="space-y-12 py-10 px-6 md:px-12 max-w-4xl mx-auto animate-pulse">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            <div v-for="i in 4" :key="i" class="space-y-3">
              <div class="h-2 w-24 bg-slate-200 dark:bg-white/[0.03] rounded-full mx-1"></div>
              <div class="h-12 w-full bg-slate-100/50 dark:bg-white/[0.02] rounded-[20px] border border-slate-200/40 dark:border-white/[0.02]"></div>
            </div>
          </div>
        </div>

        <div v-else key="content" class="space-y-10 py-10 px-6 md:px-12 max-w-4xl mx-auto pb-64">
          <div class="space-y-8">
            <!-- Fila 1: Nombre y Descripción -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AppFormInput
                v-model="formData.nombre"
                :label="t('hardware.labelName') || 'Nombre (Alias)'"
                :placeholder="t('hardware.placeholderName') || 'Ej: gps gl800 3'"
                :icon="Tag01Icon"
                :error="getError('nombre') ?? undefined"
              />

              <AppFormInput
                v-model="formData.descripcion"
                :label="t('hardware.labelDescription') || 'Descripción'"
                :placeholder="t('hardware.placeholderDescription') || 'Ej: 10000 mah'"
                :icon="Tag01Icon"
                :error="getError('descripcion') ?? undefined"
              />
            </div>

            <!-- Fila 2: Identificadores (Serial, IMEI, MAC) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <AppFormInput
                v-model="formData.serial"
                :label="t('hardware.labelSerial') || 'Serial'"
                :placeholder="t('hardware.placeholderSerial') || 'B123RZZR'"
                :icon="TextNumberSignIcon"
                :error="getError('serial') ?? undefined"
              />

              <AppFormInput
                v-model="formData.imei"
                :label="t('hardware.labelImei') || 'IMEI'"
                :placeholder="t('hardware.placeholderImei') || '1234567...'"
                :icon="TextNumberSignIcon"
                :error="getError('imei') ?? undefined"
              />

              <AppFormInput
                v-model="formData.mac"
                :label="t('hardware.labelMac') || 'MAC'"
                :placeholder="t('hardware.placeholderMac') || 'sw:ki:pl...'"
                :icon="TextNumberSignIcon"
                :error="getError('mac') ?? undefined"
              />
            </div>

            <!-- Fila 3: Configuración Técnica -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6 border-t border-slate-100 dark:border-white/5">
              <AppFormInput
                v-model="formData.numero_sms"
                label="Número SMS"
                placeholder="Ej: 9103166133"
                :icon="SmartPhone01Icon"
              />

              <AppFormInput
                v-model="formData.id_binario"
                label="ID Binario"
                placeholder="Ej: 2512001917"
                :icon="CpuIcon"
              />

              <AppFormInput
                v-model="formData.clave_open"
                label="Clave Open"
                placeholder="Ej: 888888"
                :icon="LockIcon"
              />
            </div>

            <div class="grid grid-cols-1 gap-5 pt-6 border-t border-slate-100 dark:border-white/5">
              <div class="space-y-2 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">{{ t('hardware.labelFamily') || 'Familia Receptora' }}</label>
                <div
                  @click="isFamilyDropdownOpen = !isFamilyDropdownOpen"
                  class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
                  :class="{ '!border-red-500/50': getError('id_familia') }"
                >
                  <div class="flex items-center gap-3">
                    <HugeiconsIcon :icon="CpuIcon" :size="18" :stroke-width="2.2" class="text-slate-400 dark:text-slate-600 group-hover/input:text-[#3b82f6] transition-colors" />
                    <span class="text-[13px] font-bold uppercase tracking-wider" :class="formData.id_familia ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                      {{ formData.id_familia ? familias.find(f => f.id_familia === formData.id_familia)?.nombre : (t('hardware.placeholderFamily') || 'Seleccione familia...') }}
                    </span>
                  </div>
                  <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2.2" class="text-slate-400 group-hover/input:text-[#3b82f6] transition-transform duration-200" :class="isFamilyDropdownOpen && '-rotate-180'" />
                </div>
                <span v-if="getError('id_familia')" class="text-xs text-red-500 font-bold ml-1.5">{{ getError('id_familia') }}</span>

                <!-- Dropdown Menu Familia -->
                <div v-if="isFamilyDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[50] overflow-hidden p-2 ring-1 ring-black/5 dark:ring-white/5">
                  <div class="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    <div v-if="familias.length === 0" class="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      No hay familias disponibles
                    </div>
                    <button
                      v-for="familia in familias"
                      :key="familia.id_familia"
                      @click="formData.id_familia = familia.id_familia; isFamilyDropdownOpen = false"
                      class="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all duration-200 group/item"
                      :class="formData.id_familia === familia.id_familia ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                    >
                      <div class="flex flex-col text-left">
                        <span class="text-sm font-extrabold uppercase tracking-wider">{{ familia.nombre }}</span>
                        <span class="text-[10px] opacity-70 mt-0.5 capitalize">{{ familia.descripcion }}</span>
                      </div>
                      <HugeiconsIcon v-if="formData.id_familia === familia.id_familia" :icon="CheckmarkCircle02Icon" :size="18" :stroke-width="2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </div>
  </AppDataLayout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

.theme-sync {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

.font-mono {
  font-family: 'Share Tech Mono', monospace;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(1.02);
}

.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
}
</style>
