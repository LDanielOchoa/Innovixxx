<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  User02Icon,
  ContactBookIcon,
  SmartPhone01Icon,
  Mail01Icon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  Loading03Icon,
  LicenseIcon,
  Search01Icon,
  ArrowDown01Icon,
  Camera01Icon,
  RotateRight01Icon,
  RotateLeft01Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../../stores/group.store'
import { useI18n } from 'vue-i18n'
import { createConductorApi, updateConductorApi } from '../services/conductores.api'
import { createConductorSchema, updateConductorSchema } from '../../../schemas/conductores.schema'
import type { Conductor } from '../types/conductor'
import { obtenerUrlImagen } from '../../../utils/imagenes'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import AppModal from '../../../components/ui/AppModal.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'

const { t } = useI18n()
const groupStore = useGroupStore()
const toast = useToast()

const props = defineProps<{
  isOpen: boolean
  editItem?: Conductor | null
}>()

const emit = defineEmits(['update:isOpen', 'created', 'updated'])

const esModoEdicion = computed(() => !!props.editItem)
const esquemaActivo = computed(() => esModoEdicion.value ? updateConductorSchema : createConductorSchema)
const formId = computed(() => esModoEdicion.value ? 'conductor-edit-form' : 'conductor-create-form')
const { validate, getFirstError, resetErrors } = useFormValidator(esquemaActivo as any)
const { getError, clearErrors } = useFormError(formId as any)

const isInitializing = ref(false)
const saving = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

// Estado de foto y recorte con vue-advanced-cropper
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const isCropping = ref(false)
const imageToCrop = ref<string | null>(null)
const cropper = ref<any>(null)

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageToCrop.value = e.target?.result as string
      isCropping.value = true
    }
    reader.readAsDataURL(file)
    target.value = ''
  }
}

const applyCrop = () => {
  if (!cropper.value) return
  const { canvas } = cropper.value.getResult()
  if (canvas) {
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) return
      const file = new File([blob], 'conductor.jpg', { type: 'image/jpeg' })
      selectedFile.value = file
      const reader = new FileReader()
      reader.onload = (e) => {
        previewImage.value = e.target?.result as string
        isCropping.value = false
        imageToCrop.value = null
      }
      reader.readAsDataURL(blob)
    }, 'image/jpeg')
  }
}

const cancelCrop = () => {
  isCropping.value = false
  imageToCrop.value = null
}

const rotate = (angle: number) => {
  if (cropper.value) {
    cropper.value.rotate(angle)
  }
}

const formData = reactive({
  nombre: '',
  cedula: '',
  email: '',
  celular: '',
  tipo_pase: 'A1',
  pase: '',
  pase_vence: null as Date | null
})

// Panel flotante lateral para tipo de pase (consistente con EscoltaCreateModal)
const panelActivo = ref<'tipoPase' | null>(null)
const btnTipoPase = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: 'auto'
})
const searchTipoPaseQuery = ref('')

const tipoPaseOptions = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'B3', label: 'B3' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
  { value: 'C3', label: 'C3' }
]

const filteredTipoPase = computed(() => {
  const q = searchTipoPaseQuery.value.toLowerCase().trim()
  if (!q) return tipoPaseOptions
  return tipoPaseOptions.filter(t => t.value.toLowerCase().includes(q))
})

const calcularPosicionPanel = (btnRef: HTMLElement | null) => {
  if (!btnRef) return
  const modalEl = document.querySelector('[role="dialog"] .sm\\:my-8') as HTMLElement
  if (!modalEl) return
  const modalRect = modalEl.getBoundingClientRect()
  const panelWidth = 356
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
  panelStyle.value = { top: `${top}px`, left: `${left}px`, height: `${panelHeight}px` }
}

const abrirPanel = async (tipo: 'tipoPase') => {
  if (panelActivo.value === tipo) {
    panelActivo.value = null
    return
  }
  panelActivo.value = tipo
  await nextTick()
  calcularPosicionPanel(btnTipoPase.value)
}

const cerrarPanel = () => {
  panelActivo.value = null
}

const selectTipoPase = (value: string) => {
  formData.tipo_pase = value
}

const handleClickOutside = (event: MouseEvent) => {
  if (!panelActivo.value) return
  const target = event.target as HTMLElement
  const panelEl = document.querySelector('.panel-flotante-conductor')
  if (panelEl && panelEl.contains(target)) return
  if (btnTipoPase.value && btnTipoPase.value.contains(target)) return
  panelActivo.value = null
}

const handleResize = () => {
  if (!panelActivo.value) return
  calcularPosicionPanel(btnTipoPase.value)
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const formatFecha = (date: Date | null): string => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    resetErrors(formId.value)
    clearErrors()
    saving.value = false
    modalMessage.value = null
    panelActivo.value = null
    searchTipoPaseQuery.value = ''

    if (props.editItem) {
      const c = props.editItem
      const parsarFecha = (val: any): Date | null => {
        if (!val) return null
        const d = new Date(val.includes('T') ? val : val + 'T00:00:00')
        return isNaN(d.getTime()) ? null : d
      }
      Object.assign(formData, {
        nombre: c.nombre || '',
        cedula: c.cedula || '',
        email: c.email || '',
        celular: c.celular || '',
        tipo_pase: c.tipo_pase || 'A1',
        pase: c.pase || '',
        pase_vence: parsarFecha(c.pase_vence)
      })
      previewImage.value = c.foto ? obtenerUrlImagen(c.foto) : null
      selectedFile.value = null
    } else {
      Object.assign(formData, {
        nombre: '',
        cedula: '',
        email: '',
        celular: '',
        tipo_pase: 'A1',
        pase: '',
        pase_vence: null
      })
      previewImage.value = null
      selectedFile.value = null
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  } else {
    panelActivo.value = null
    isCropping.value = false
    imageToCrop.value = null
  }
})

const handleClose = (force = false) => {
  if (saving.value && force !== true) return
  panelActivo.value = null
  emit('update:isOpen', false)
}

const closeAfterSave = () => {
  saving.value = false
  handleClose(true)
}

const handleGuardar = async () => {
  if (saving.value) return
  clearErrors()
  modalMessage.value = null

  if (!groupStore.selectedGroup?.id) {
    showMessage(t('conductores.alertNoGroup'), 'error')
    return
  }

  saving.value = true

  const payload: any = {
    nombre: formData.nombre ?? '',
    cedula: formData.cedula ?? '',
    email: formData.email ?? '',
    celular: formData.celular ?? '',
    id_grupo: groupStore.selectedGroup.id,
    tipo_pase: formData.tipo_pase ?? '',
    pase: formData.pase ?? '',
    pase_vence: formatFecha(formData.pase_vence)
  }

  if (esModoEdicion.value && props.editItem) {
    payload.id_conductor = props.editItem.id_conductor
  }

  if (!validate(payload, formId.value)) {
    saving.value = false
    const firstErr = getFirstError(formId.value)
    showMessage(
      firstErr || t('conductores.alertValidation'),
      'error'
    )
    return
  }

  try {
    const formDataObj = new FormData()
    formDataObj.append('id_grupo', groupStore.selectedGroup.id)
    formDataObj.append('nombre', formData.nombre ?? '')
    if (formData.cedula) formDataObj.append('cedula', formData.cedula)
    formDataObj.append('email', formData.email ?? '')
    formDataObj.append('celular', formData.celular ?? '')
    formDataObj.append('tipo_pase', formData.tipo_pase ?? '')
    formDataObj.append('pase', formData.pase ?? '')
    formDataObj.append('pase_vence', formatFecha(formData.pase_vence))

    if (selectedFile.value) {
      formDataObj.append('foto', selectedFile.value)
    }

    if (esModoEdicion.value && props.editItem) {
      formDataObj.append('id_conductor', props.editItem.id_conductor)
      const data = await updateConductorApi(formDataObj)
      if (data.done) {
        toast.add({
          severity: 'success',
          summary: t('conductores.alertSuccessUpdateTitle'),
          detail: data.message || t('conductores.alertSuccessUpdateDetail'),
          life: 4000
        })
        emit('updated')
        closeAfterSave()
      } else {
        showMessage(data.message || t('conductores.alertErrorUpdate'), 'error')
      }
    } else {
      const data = await createConductorApi(formDataObj)
      if (data.done) {
        toast.add({
          severity: 'success',
          summary: t('conductores.alertSuccessCreateTitle'),
          detail: data.message || t('conductores.alertSuccessCreateDetail'),
          life: 4000
        })
        emit('created')
        Object.assign(formData, {
          nombre: '',
          cedula: '',
          email: '',
          celular: '',
          tipo_pase: 'A1',
          pase: '',
          pase_vence: null
        })
        previewImage.value = null
        selectedFile.value = null
        resetErrors(formId.value)
        clearErrors()
        closeAfterSave()
      } else {
        showMessage(data.message || t('conductores.alertErrorCreate'), 'error')
      }
    }
  } catch (error: any) {
    console.error('Error guardando conductor:', error)
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
      showMessage(error.message || t('conductores.alertNetError'), 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    @update:is-open="handleClose"
    @close="handleClose"
    @confirm="handleGuardar"
    :title="esModoEdicion ? t('conductores.modalTitleEdit') : t('conductores.modalTitleCreate')"
    :confirm-text="esModoEdicion ? t('conductores.btnSave') : t('conductores.btnRegister')"
    size="xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="LicenseIcon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <div class="flex flex-col gap-5 relative p-1 modal-conductor-content">
      <!-- OVERLAY DE CARGA -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ esModoEdicion ? t('conductores.updatingConductor') : t('conductores.registeringConductor') }}
            </span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- FORM CONTENT -->
      <div class="animate-fade-in space-y-6">
        <!-- MENSAJE DE ALERTA O ERROR -->
        <Transition name="fade">
          <div
            v-if="modalMessage"
            class="flex items-center gap-3 p-3.5 rounded-xl border text-xs font-semibold shadow-sm transition-all"
            :class="
              modalMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                : modalMessage.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            "
          >
            <HugeiconsIcon
              :icon="modalMessage.type === 'error' ? Cancel01Icon : modalMessage.type === 'warning' ? Alert01Icon : Tick01Icon"
              :size="18"
              class="shrink-0"
            />
            <span class="flex-1">{{ modalMessage.text }}</span>
            <button
              type="button"
              @click="modalMessage = null"
              class="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
            </button>
          </div>
        </Transition>

        <div class="space-y-5">
          <!-- Subida de Foto del Conductor -->
          <div class="flex flex-col items-center justify-center pb-2">
            <div class="relative group">
              <label
                for="conductorPhotoUpload"
                class="block w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 p-1 relative border border-slate-200/80 dark:border-white/10 shadow-sm cursor-pointer active:scale-95 transition-all duration-300"
              >
                <div class="w-full h-full rounded-full overflow-hidden bg-slate-50 dark:bg-[#0B0D11] flex items-center justify-center border border-slate-200/50 dark:border-black/50 relative">
                  <img
                    v-if="previewImage"
                    :src="previewImage"
                    class="w-full h-full object-cover"
                    alt="Foto Conductor"
                  />
                  <HugeiconsIcon
                    v-else
                    :icon="User02Icon"
                    :size="40"
                    :stroke-width="1.5"
                    class="text-slate-300 dark:text-slate-600"
                  />

                  <!-- Upload Overlay Glass -->
                  <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                    <HugeiconsIcon :icon="Camera01Icon" :size="20" class="text-white mb-0.5" />
                    <span class="text-[8px] font-black text-white uppercase tracking-wider">{{ t('sidebar.changePhoto', 'Foto') }}</span>
                  </div>
                </div>
              </label>
              <input
                id="conductorPhotoUpload"
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="saving"
                @change="handleFileUpload"
              />
            </div>
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
              {{ t('sidebar.changePhoto', 'Subir foto de perfil') }}
            </span>
          </div>

          <!-- Nombre Completo -->
          <AppInput
            v-model="formData.nombre"
            :label="t('conductores.labelName')"
            :placeholder="t('conductores.placeholderName')"
            :icon="User02Icon"
            :error="getError('nombre')"
            :disabled="saving"
          />

          <!-- Cédula y Celular -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppInput
              v-model="formData.cedula"
              :label="t('conductores.labelDoc')"
              :placeholder="t('conductores.placeholderDoc')"
              :icon="ContactBookIcon"
              :error="getError('cedula')"
              :disabled="saving"
            />
            <AppInput
              v-model="formData.celular"
              :label="t('conductores.labelMobile')"
              :placeholder="t('conductores.placeholderMobile')"
              :icon="SmartPhone01Icon"
              :error="getError('celular')"
              :disabled="saving"
            />
          </div>

          <!-- Correo Electrónico -->
          <AppInput
            v-model="formData.email"
            :label="t('conductores.labelEmail')"
            :placeholder="t('conductores.placeholderEmail')"
            :icon="Mail01Icon"
            type="email"
            :error="getError('email')"
            :disabled="saving"
          />

          <!-- Sección de Pase / Licencia de Conducción -->
          <div class="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <!-- Selector de Tipo de Pase -->
              <div class="space-y-2 w-full">
                <div class="flex items-center justify-between ml-1">
                  <label
                    class="text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-300"
                    :class="panelActivo === 'tipoPase' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ t('conductores.labelPassType') }}
                  </label>
                </div>
                <button
                  ref="btnTipoPase"
                  type="button"
                  @click="abrirPanel('tipoPase')"
                  :disabled="saving"
                  class="relative flex items-center w-full h-[46px] bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 text-sm font-medium transition-all duration-300 group/btn text-left"
                  :class="[
                    saving ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-white/10',
                    panelActivo === 'tipoPase'
                      ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]'
                      : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'
                  ]"
                >
                  <HugeiconsIcon
                    :icon="LicenseIcon"
                    :size="18"
                    :stroke-width="1.8"
                    class="text-slate-400 dark:text-slate-500 mr-3 shrink-0 transition-colors duration-300"
                    :class="panelActivo === 'tipoPase' ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'group-hover/btn:text-slate-500 dark:group-hover/btn:text-slate-400'"
                  />
                  <span class="flex-1 truncate" :class="formData.tipo_pase ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                    {{ formData.tipo_pase || t('conductores.placeholderPassType') }}
                  </span>
                  <HugeiconsIcon
                    :icon="ArrowDown01Icon"
                    :size="16"
                    class="text-slate-400 dark:text-slate-500 shrink-0 ml-2 transition-transform duration-300"
                    :class="{ 'rotate-180 text-[#3b82f6] dark:text-[#5da6fc]': panelActivo === 'tipoPase' }"
                  />
                </button>
              </div>

              <!-- Número de Pase -->
              <AppInput
                v-model="formData.pase"
                :label="t('conductores.labelPass')"
                :placeholder="t('conductores.placeholderPass')"
                :icon="LicenseIcon"
                :error="getError('pase')"
                :disabled="saving"
              />

              <!-- Fecha de Vencimiento de Pase -->
              <AppDateTimePicker
                v-model="formData.pase_vence"
                :label="t('conductores.labelPassExpires')"
                :placeholder="t('conductores.placeholderPassExpires')"
                :only-date="true"
                :disabled="saving"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppModal>

  <!-- PANEL FLOTANTE LATERAL PARA TIPO DE PASE -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="panelActivo === 'tipoPase' && isOpen && !isInitializing"
        class="panel-flotante-conductor fixed z-[200] flex flex-col overflow-hidden"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <div class="h-1 bg-gradient-to-r from-[#3b82f6] to-[#5da6fc] shrink-0" />

        <div class="bg-[#1A1D24] px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center text-[#5da6fc]">
              <HugeiconsIcon :icon="LicenseIcon" :size="17" />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-white tracking-tight">
                {{ t('conductores.panelPassTypesTitle') }}
              </h4>
              <p class="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                {{ t('conductores.panelPassTypesCount', { count: filteredTipoPase.length }) }}
              </p>
            </div>
          </div>
          <button type="button" @click="cerrarPanel" class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <div class="bg-[#1A1D24] px-4 pb-3 shrink-0">
          <div class="flex items-center gap-2 bg-[#0F1115] border border-white/5 rounded-lg px-3 py-2">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-model="searchTipoPaseQuery"
              type="text"
              :placeholder="t('conductores.searchPassTypePlaceholder')"
              class="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
              @click.stop
            />
            <button
              v-if="searchTipoPaseQuery"
              type="button"
              @click.stop="searchTipoPaseQuery = ''"
              class="text-slate-400 hover:text-slate-300 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <div class="bg-[#1A1D24] px-4 py-1.5 flex items-center justify-between shrink-0 border-y border-white/5">
          <span class="text-[10px] font-bold tabular-nums text-blue-400">
            {{ formData.tipo_pase ? t('conductores.selectedOne') : t('conductores.noneSelected') }}
          </span>
          <button
            type="button"
            @click.stop="formData.tipo_pase = ''"
            class="text-[10px] font-semibold text-slate-400 hover:text-red-400 transition-colors"
          >
            {{ t('conductores.btnClear') }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto bg-[#1A1D24] py-3 space-y-1 px-3">
          <button
            v-for="tPase in filteredTipoPase"
            :key="tPase.value"
            type="button"
            @click="selectTipoPase(tPase.value)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
            :class="formData.tipo_pase === tPase.value ? 'bg-[#3b82f6]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5'"
          >
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="formData.tipo_pase === tPase.value ? 'border-[#3b82f6] bg-[#3b82f6]' : 'border-slate-500'">
              <HugeiconsIcon v-if="formData.tipo_pase === tPase.value" :icon="Tick01Icon" :size="10" :stroke-width="3" class="text-white" />
            </div>
            <span class="text-[12px] font-semibold">{{ tPase.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Modal para recortar imagen (Idéntico a EscoltaCreateModal) -->
  <BaseModal
    :isOpen="isCropping"
    @update:isOpen="isCropping = $event"
    :title="t('sidebar.editPhoto', 'Ajustar Foto del Conductor')"
    size="lg"
    @confirm="applyCrop"
    @close="cancelCrop"
    :confirmText="t('common.apply', 'Aplicar')"
  >
    <template #icon>
      <HugeiconsIcon :icon="Camera01Icon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="cropper-wrapper bg-slate-900/5 dark:bg-black/20 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 relative group">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] pointer-events-none z-10"></div>
      <Cropper
        ref="cropper"
        class="cropper min-h-[350px] max-h-[50vh]"
        :src="imageToCrop"
        :stencil-component="CircleStencil"
        :stencil-props="{
          aspectRatio: 1/1,
          previewClass: 'cropper-preview'
        }"
        :canvas="{
          height: 1024,
          width: 1024
        }"
      />

      <!-- Controles de Rotación sobre el Cropper -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        <button
          @click="rotate(-90)"
          class="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
          :title="t('sidebar.rotateLeft', 'Rotar a la izquierda')"
          type="button"
        >
          <HugeiconsIcon :icon="RotateLeft01Icon" :size="20" />
        </button>
        <button
          @click="rotate(90)"
          class="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
          :title="t('sidebar.rotateRight', 'Rotar a la derecha')"
          type="button"
        >
          <HugeiconsIcon :icon="RotateRight01Icon" :size="20" />
        </button>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
      <HugeiconsIcon :icon="Alert01Icon" :size="18" class="text-[#3b82f6]" />
      <p class="text-[12px] font-bold text-slate-600 dark:text-slate-400">
        {{ t('sidebar.adjustImageInfo', 'Ajusta el círculo para centrar tu foto. Solo lo que esté dentro del círculo será visible.') }}
      </p>
    </div>
  </BaseModal>
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

.panel-flotante-conductor {
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.panel-flotante-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-flotante-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.96);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.98);
}

/* Estilos para vue-advanced-cropper */
:deep(.vue-advanced-cropper) {
  background: #000;
}

:deep(.vue-circle-stencil) {
  border: 2px solid rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.6);
}

:deep(.vue-handler-wrapper--active .vue-handler) {
  background: #3b82f6;
}

:deep(.vue-simple-handler) {
  background: #3b82f6;
  border: 2px solid white;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
