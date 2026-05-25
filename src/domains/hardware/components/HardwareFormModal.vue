<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CpuIcon,
  Tag01Icon,
  TextNumberSignIcon,
  SmartPhone01Icon,
  LockIcon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Loading03Icon,
  ArrowDown01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import {
  fetchFamiliasApi,
  createHardwareApi,
  updateHardwareApi
} from '../services/hardware.api'
import type { FamiliaHardware, Hardware } from '../types/hardware'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createHardwareSchema, updateHardwareSchema } from '../../../schemas/hardware.schema'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppButton from '../../../components/ui/AppButton.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const authStore = useAuthStore()

const props = defineProps<{
  isOpen: boolean
  editItem: Hardware | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

const familias = ref<FamiliaHardware[]>([])
const loadingFamilias = ref(false)

const isEditMode = computed(() => !!props.editItem)
const activeSchema = computed(() => isEditMode.value ? updateHardwareSchema : createHardwareSchema)
const { validate } = useFormValidator(activeSchema as any)
const { getError } = useFormError('hardware-form')

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

// Panel flotante para familia
const panelActivo = ref(false)
const btnFamilia = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})
const searchFamiliaQuery = ref('')

const filteredFamilias = computed(() => {
  const q = searchFamiliaQuery.value.toLowerCase().trim()
  if (!q) return familias.value
  return familias.value.filter(f =>
    f.nombre.toLowerCase().includes(q) ||
    f.descripcion.toLowerCase().includes(q)
  )
})

const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return
  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return

  const modalRect = modalEl.getBoundingClientRect()
  const panelWidth = 380
  const gap = 12
  const panelHeight = modalRect.height

  let left = modalRect.right + gap
  if (left + panelWidth > window.innerWidth - 16) {
    left = modalRect.left - panelWidth - gap
  }

  let top = modalRect.top
  if (top + panelHeight > window.innerHeight - 16) {
    top = window.innerHeight - panelHeight - 16
  }
  if (top < 8) top = 8

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    height: `${panelHeight}px`
  }
}

const abrirPanelFamilia = async () => {
  if (panelActivo.value) {
    panelActivo.value = false
    return
  }
  panelActivo.value = true
  await nextTick()
  calcularPosicionPanel(btnFamilia.value)
}

const cerrarPanel = () => {
  panelActivo.value = false
}

const selectFamilia = (id: number) => {
  formData.value.id_familia = id
  cerrarPanel()
}

const getFamiliaLabel = (id: number | string) => {
  const f = familias.value.find(item => String(item.id_familia) === String(id))
  return f ? f.nombre : ''
}

const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement
  const panelEl = document.querySelector('.panel-flotante-recursos')
  if (panelEl && panelEl.contains(target)) return
  if (btnFamilia.value && btnFamilia.value.contains(target)) return
  panelActivo.value = false
}

const handleResize = () => {
  if (!panelActivo.value) return
  calcularPosicionPanel(btnFamilia.value)
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    panelActivo.value = false
    searchFamiliaQuery.value = ''

    formData.value = {
      nombre: '',
      descripcion: '',
      serial: '',
      imei: '',
      mac: '',
      id_familia: '',
      numero_sms: '',
      id_binario: '',
      clave_open: ''
    }

    if (props.editItem) {
      formData.value = {
        nombre: props.editItem.nombre || '',
        descripcion: props.editItem.descripcion || '',
        serial: props.editItem.serial || '',
        imei: props.editItem.imei || '',
        mac: props.editItem.mac || '',
        id_familia: props.editItem.id_familia || '',
        numero_sms: props.editItem.numero_sms || '',
        id_binario: props.editItem.id_binario || '',
        clave_open: props.editItem.clave_open || ''
      }
    }

    loadingFamilias.value = true
    try {
      familias.value = await fetchFamiliasApi()
    } catch (error) {
      console.error('Error fetching familias:', error)
    } finally {
      loadingFamilias.value = false
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  } else {
    panelActivo.value = false
  }
})

const handleSave = async () => {
  if (saving.value) return
  if (!groupStore.selectedGroup?.id) {
    modalMessage.value = { text: t('common.errorRequiredFields') || 'Seleccione un grupo válido', type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  const payload = {
    serial: formData.value.serial,
    id_grupo: groupStore.selectedGroup.id,
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
    if (isEditMode.value && props.editItem) {
      if (!authStore.hasPermission(PERMISSIONS.HARDWARE_EDIT)) {
        modalMessage.value = { text: t('hardware.alertErrorUpdate') || 'No tienes permiso para editar hardware', type: 'error' }
        saving.value = false
        return
      }
      const data = await updateHardwareApi({ ...payload, id_hardware: props.editItem.id_hardware })
      if (data.done) {
        isSuccess.value = true
        emit('saved')
      } else {
        modalMessage.value = { text: data.message || t('hardware.alertErrorUpdate') || 'Error al actualizar', type: 'error' }
      }
    } else {
      if (!authStore.hasPermission(PERMISSIONS.HARDWARE_CREATE)) {
        modalMessage.value = { text: t('hardware.alertErrorCreate') || 'No tienes permiso para crear hardware', type: 'error' }
        saving.value = false
        return
      }
      const data = await createHardwareApi(payload)
      if (data.done) {
        isSuccess.value = true
        emit('saved')
      } else {
        modalMessage.value = { text: data.message || t('hardware.alertErrorCreate') || 'Error al crear', type: 'error' }
      }
    }
  } catch (error: any) {
    console.error('Error saving hardware:', error)
    modalMessage.value = { text: error.message || (t('hardware.alertNetError') || 'Error de conexión'), type: 'error' }
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('update:isOpen', false)
}

const modalTitle = computed(() => {
  if (isSuccess.value) return t('hardware.alertSuccessCreate') || 'Dispositivo Registrado'
  return isEditMode.value
    ? (t('hardware.modalTitleEdit') || 'Actualizar Dispositivo')
    : (t('hardware.modalTitleCreate') || 'Nuevo Dispositivo')
})

const confirmText = computed(() => {
  if (isSuccess.value) return t('common.close') || 'Cerrar'
  return isEditMode.value
    ? (t('hardware.btnSave') || 'Guardar Cambios')
    : (t('hardware.btnRegister') || 'Crear Hardware')
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    :title="modalTitle"
    size="xl"
    :show-footer="false"
    :confirm-text="confirmText"
    @confirm="isSuccess ? handleClose() : handleSave()"
  >
    <template #icon>
      <HugeiconsIcon :icon="CpuIcon" :size="20" class="text-[#3b82f6]" />
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
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('common.saving') || 'Guardando Dispositivo...' }}</span>
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
          <div class="h-2 w-28 bg-white/5 rounded-full"></div>
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
        <div class="grid grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="space-y-3">
            <div class="h-2 w-16 bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="space-y-3">
            <div class="h-2 w-16 bg-white/5 rounded-full"></div>
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
          <h3 class="text-xl font-black text-white tracking-tight">{{ t('hardware.alertSuccessCreate') || 'Dispositivo Registrado' }}</h3>
          <p class="text-[13px] text-slate-400 max-w-[320px]">
            {{ isEditMode
              ? (t('hardware.alertSuccessUpdate') || 'El dispositivo ha sido actualizado exitosamente.')
              : (t('hardware.successCreateMsg') || 'El dispositivo de hardware ha sido registrado exitosamente.')
            }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              {{ t('common.close') || 'Cerrar Ventana' }}
            </AppButton>
          </div>
        </div>

        <!-- FORM CONTENT -->
        <div v-else-if="!isInitializing" class="animate-fade-in space-y-6">
          <!-- Card Glassmorphic -->
          <div class="modal-card space-y-8 bg-gradient-to-b from-[#1A1D24]/90 to-[#0F1115]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[24px] border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.4)] relative group/form overflow-visible">
            <!-- Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Header: Datos del Dispositivo -->
            <div class="flex items-center gap-3 relative z-10 border-b border-white/5 pb-5">
              <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
                <HugeiconsIcon :icon="CpuIcon" :size="20" class="drop-shadow-sm" />
              </div>
              <div>
                <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('hardware.formSectionData') || 'Datos del Dispositivo' }}</h3>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ t('hardware.formSectionDataDesc') || 'Información general y familia receptora.' }}</p>
              </div>
            </div>

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

            <!-- Fields: Datos del Dispositivo -->
            <div class="space-y-5 relative z-10 modal-form-fields">
              <!-- Nombre + Descripción -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <AppInput
                  v-model="formData.nombre"
                  :label="t('hardware.labelName') || 'Nombre (Alias)'"
                  :placeholder="t('hardware.placeholderName') || 'Ej: gps gl800 3'"
                  :icon="Tag01Icon"
                />
                <AppInput
                  v-model="formData.descripcion"
                  :label="t('hardware.labelDescription') || 'Descripción'"
                  :placeholder="t('hardware.placeholderDescription') || 'Ej: 10000 mah'"
                  :icon="Tag01Icon"
                />
              </div>

              <!-- Familia -->
              <div class="space-y-2">
                <label
                  class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                  :class="panelActivo ? 'text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                >
                  {{ t('hardware.labelFamily') || 'Familia Receptora' }}
                </label>
                <button
                  ref="btnFamilia"
                  type="button"
                  @click="abrirPanelFamilia"
                  :disabled="loadingFamilias"
                  class="selector-btn"
                  :class="[
                    loadingFamilias ? 'opacity-60 cursor-not-allowed' : '',
                    panelActivo
                      ? 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20'
                      : 'hover:border-white/15'
                  ]"
                >
                  <div class="text-slate-400 pr-2 shrink-0">
                    <HugeiconsIcon :icon="CpuIcon" :size="18" :stroke-width="1.8" />
                  </div>
                  <div class="flex-1 flex flex-wrap gap-1.5 py-0.5 min-h-[28px]">
                    <template v-if="formData.id_familia">
                      <div class="badge-recurso">
                        <span class="truncate">{{ getFamiliaLabel(formData.id_familia) }}</span>
                        <button type="button" @click.stop="formData.id_familia = ''" class="hover:text-red-400 transition-colors shrink-0">
                          <HugeiconsIcon :icon="Cancel01Icon" :size="9" :stroke-width="3" />
                        </button>
                      </div>
                    </template>
                    <span v-else class="text-slate-400 text-[13px] font-medium">
                      {{ loadingFamilias ? 'Cargando...' : (t('hardware.placeholderFamily') || 'Seleccione familia...') }}
                    </span>
                  </div>
                  <div class="text-slate-400 pl-2 shrink-0 transition-transform duration-300" :class="{ 'rotate-180': panelActivo }">
                    <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                  </div>
                </button>
                <span v-if="getError('id_familia')" class="text-xs text-red-400 font-bold ml-1">{{ getError('id_familia') }}</span>
              </div>
            </div>

            <!-- Sección: Identificadores -->
            <div class="pt-6 border-t border-white/5 space-y-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <HugeiconsIcon :icon="TextNumberSignIcon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('hardware.sectionIdentifiers') || 'Identificadores' }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ t('hardware.sectionIdentifiersDesc') || 'Serial, IMEI y dirección MAC del dispositivo.' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <AppInput
                  v-model="formData.serial"
                  :label="t('hardware.labelSerial') || 'Serial'"
                  :placeholder="t('hardware.placeholderSerial') || 'B123RZZR'"
                  :icon="TextNumberSignIcon"
                />
                <AppInput
                  v-model="formData.imei"
                  :label="t('hardware.labelImei') || 'IMEI'"
                  :placeholder="t('hardware.placeholderImei') || '1234567...'"
                  :icon="TextNumberSignIcon"
                />
                <AppInput
                  v-model="formData.mac"
                  :label="t('hardware.labelMac') || 'MAC'"
                  :placeholder="t('hardware.placeholderMac') || 'sw:ki:pl...'"
                  :icon="TextNumberSignIcon"
                />
              </div>
            </div>

            <!-- Sección: Configuración Técnica -->
            <div class="pt-6 border-t border-white/5 space-y-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-violet-500/20 to-violet-600/5 flex items-center justify-center text-[#a78bfa] border border-violet-500/30">
                  <HugeiconsIcon :icon="LockIcon" :size="20" class="drop-shadow-sm" />
                </div>
                <div>
                  <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('hardware.sectionConfig') || 'Configuración Técnica' }}</h3>
                  <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ t('hardware.sectionConfigDesc') || 'Número SMS, ID binario y clave de acceso.' }}</p>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <AppInput
                  v-model="formData.numero_sms"
                  label="Número SMS"
                  placeholder="Ej: 9103166133"
                  :icon="SmartPhone01Icon"
                />
                <AppInput
                  v-model="formData.id_binario"
                  label="ID Binario"
                  placeholder="Ej: 2512001917"
                  :icon="CpuIcon"
                />
                <AppInput
                  v-model="formData.clave_open"
                  label="Clave Open"
                  placeholder="Ej: 888888"
                  :icon="LockIcon"
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
              {{ isEditMode ? (t('hardware.btnSave') || 'Guardar Cambios') : (t('hardware.btnRegister') || 'Crear Hardware') }}
            </AppButton>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>

  <!-- PANEL FLOTANTE DE FAMILIA -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo && isOpen && !isSuccess && !isInitializing"
        class="panel-flotante-recursos fixed z-[200] flex flex-col overflow-hidden"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <div class="panel-acento shrink-0" />

        <!-- CABECERA -->
        <div class="panel-head px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="panel-head-icon">
              <HugeiconsIcon :icon="CpuIcon" :size="17" />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-white tracking-tight">
                {{ t('hardware.panelFamiliasTitle') || 'Familias disponibles' }}
              </h4>
              <p class="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {{ filteredFamilias.length }} {{ t('hardware.panelFamiliasCount') || 'familias' }}
              </p>
            </div>
          </div>
          <button type="button" @click="cerrarPanel" class="panel-close-btn">
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <!-- BUSCADOR -->
        <div class="px-4 pb-3 shrink-0">
          <div class="panel-search-wrap">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-model="searchFamiliaQuery"
              type="text"
              :placeholder="t('common.search') || 'Buscar familia...'"
              class="panel-search-input"
              @click.stop
            />
            <button
              v-if="searchFamiliaQuery"
              type="button"
              @click.stop="searchFamiliaQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <!-- LISTADO -->
        <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          <button
            v-for="f in filteredFamilias"
            :key="f.id_familia"
            type="button"
            @click="selectFamilia(f.id_familia)"
            class="panel-row group/row"
            :class="String(formData.id_familia) === String(f.id_familia) ? 'panel-row--on' : 'panel-row--off'"
          >
            <div
              class="panel-row-dot shrink-0"
              :class="String(formData.id_familia) === String(f.id_familia) ? 'panel-row-dot--on' : 'panel-row-dot--off'"
            >
              <HugeiconsIcon v-if="String(formData.id_familia) === String(f.id_familia)" :icon="Tick01Icon" :size="9" :stroke-width="3" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 text-left">
              <span class="text-[12px] font-semibold truncate leading-snug">{{ f.nombre }}</span>
              <span class="text-[10px] truncate leading-none mt-0.5 text-slate-400">{{ f.descripcion }}</span>
            </div>
          </button>
          <div v-if="filteredFamilias.length === 0" class="panel-empty">
            <HugeiconsIcon :icon="CpuIcon" :size="24" class="opacity-30 mb-2" />
            <span>{{ searchFamiliaQuery ? 'No se encontraron familias.' : 'Sin familias disponibles' }}</span>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="px-4 py-3.5 shrink-0 panel-footer">
          <button type="button" @click="cerrarPanel" class="panel-confirm-btn">
            <HugeiconsIcon :icon="Tick01Icon" :size="14" />
            {{ t('hardware.panelConfirmFamilia') || 'Confirmar Familia' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* SELECTOR BUTTONS */
.selector-btn {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 0.5rem 1rem;
  text-align: left;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
}
.selector-btn:hover {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
}
.selector-btn:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
}
.selector-btn.border-\[\#3b82f6\] {
  border-color: rgba(59,130,246,0.5);
  box-shadow: 0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
}

.badge-recurso {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(59,130,246,0.25);
}

/* PANEL FLOTANTE */
.panel-flotante-recursos {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.5),
    0 8px 24px -4px rgba(0,0,0,0.3);
}

.panel-acento {
  height: 3px;
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #3b82f6, #5da6fc);
}

.panel-head {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.panel-head-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  border: 1px solid rgba(59,130,246,0.25);
}

.panel-close-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.panel-close-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

.panel-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.panel-search-wrap:focus-within {
  border-color: #5da6fc;
  box-shadow: 0 0 0 3px rgba(93,166,252,0.12);
}

.panel-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  outline: none;
  box-shadow: none;
  padding: 0;
}
.panel-search-input::placeholder { color: #475569; }

.panel-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  cursor: pointer;
  transition: background 0.12s ease;
  outline: none;
  color: #cbd5e1;
}
.panel-row--off:hover { background: rgba(255,255,255,0.04); }
.panel-row--on { background: transparent; }
.panel-row--on:hover { background: rgba(255,255,255,0.03); }

.panel-row-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.panel-row-dot--off {
  border: 1.5px solid rgba(100,116,139,0.5);
}
.panel-row-dot--on {
  color: #fff;
  background: #3b82f6;
}

.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

.panel-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.panel-confirm-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #3b82f6;
  box-shadow: 0 2px 12px rgba(59,130,246,0.35), 0 1px 3px rgba(59,130,246,0.2);
  transition: all 0.15s ease;
  letter-spacing: 0.01em;
}
.panel-confirm-btn:hover {
  background: #2563eb;
  box-shadow: 0 4px 16px rgba(59,130,246,0.45);
}
.panel-confirm-btn:active { transform: translateY(1px); }

/* Animaciones */
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

.panel-flotante-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-flotante-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1A1D24;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
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
