<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowDown01Icon,
  FloppyDiskIcon,
  UserGroupIcon,
  Clock01Icon,
  LanguageCircleIcon,
  Tick01Icon,
  Alert01Icon,
  Search01Icon,
  Camera01Icon,
  RotateRight01Icon,
  RotateLeft01Icon,
  Loading03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import { createGrupoApi } from '../services/grupos.api'
import type { Grupo } from '../types/grupo'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createGrupoSchema } from '../../../schemas/grupos.schema'
import AppModal from '../../../components/ui/AppModal.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppInput from '../../../components/ui/AppInput.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps<{
  isOpen: boolean
  grupo: Grupo | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const { t, locale } = useI18n()

const isEditMode = computed(() => !!props.grupo)

const { validate, getFirstError, resetErrors } = useFormValidator(createGrupoSchema)
const { getError, clearErrors } = useFormError('grupo-form')

interface GrupoForm {
  nombre: string
  time_zone: string
  i18n: string
}

const formData = ref<GrupoForm>({
  nombre: '',
  time_zone: '',
  i18n: 'es'
})

const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

// Photo upload state
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const imageError = ref(false)

// Cropper state
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
      
      const file = new File([blob], 'grupo.jpg', { type: 'image/jpeg' })
      selectedFile.value = file
      
      const reader = new FileReader()
      reader.onload = (e) => {
        previewImage.value = e.target?.result as string
        imageError.value = false
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

// Timezone picker
const isTimezoneOpen = ref(false)
const timezoneSearch = ref('')

const timezoneDropdownRef = ref<HTMLElement | null>(null)
const langDropdownRef = ref<HTMLElement | null>(null)

// Generar dinámicamente zonas horarias
const TIMEZONES = (() => {
  try {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
      const zones = Intl.supportedValuesOf('timeZone')
      return zones.map(tz => ({
        id: tz,
        label: tz
      })).sort((a, b) => a.label.localeCompare(b.label))
    }
  } catch (e) {
    console.error('Error cargando zonas horarias nativas:', e)
  }
  
  return [
    { id: 'America/Bogota', label: 'America/Bogota' },
    { id: 'UTC', label: 'UTC' }
  ]
})()

const filteredTimezones = computed(() =>
  timezoneSearch.value
    ? TIMEZONES.filter(tz => 
        tz.label.toLowerCase().includes(timezoneSearch.value.toLowerCase()) || 
        tz.id.toLowerCase().includes(timezoneSearch.value.toLowerCase())
      )
    : TIMEZONES
)

const selectTimezone = (tz: any) => {
  formData.value.time_zone = tz.id
  isTimezoneOpen.value = false
  timezoneSearch.value = ''
}

const selectedTimezoneLabel = computed(() => {
  if (!formData.value.time_zone) return ''
  const found = TIMEZONES.find(t => t.id === formData.value.time_zone)
  return found ? found.label : formData.value.time_zone
})

// Language picker
const isLangOpen = ref(false)
const langOptions = [
  { value: 'es', label: 'Español', flag: 'https://flagcdn.com/co.svg' },
  { value: 'en', label: 'English', flag: 'https://flagcdn.com/us.svg' }
]

const selectLang = (lang: typeof langOptions[0]) => {
  formData.value.i18n = lang.value
  isLangOpen.value = false
}

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

// Watch modal state to initialize data
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    previewImage.value = null
    selectedFile.value = null
    imageError.value = false
    isTimezoneOpen.value = false
    isLangOpen.value = false
    timezoneSearch.value = ''
    resetErrors()
    clearErrors()

    if (props.grupo) {
      formData.value = {
        nombre: props.grupo.nombre,
        time_zone: props.grupo.time_zone,
        i18n: props.grupo.i18n || 'es'
      }
      if (props.grupo.logo) {
        previewImage.value = props.grupo.logo
      }
    } else {
      formData.value = {
        nombre: '',
        time_zone: '',
        i18n: locale.value.split('-')[0] || 'es'
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 600)
  }
})

// Click outside drop-downs to close them
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (timezoneDropdownRef.value && !timezoneDropdownRef.value.contains(target)) {
    isTimezoneOpen.value = false
  }
  if (langDropdownRef.value && !langDropdownRef.value.contains(target)) {
    isLangOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClose = () => {
  emit('update:isOpen', false)
}

const saveGrupo = async () => {
  if (saving.value) return
  clearErrors()
  modalMessage.value = null

  if (!validate(formData.value, 'grupo-form')) {
    showMessage(getFirstError('grupo-form') || '', 'warning')
    return
  }

  saving.value = true
  try {
    const result = await createGrupoApi({
      id: isEditMode.value && props.grupo ? String(props.grupo.id) : undefined,
      nombre: formData.value.nombre,
      time_zone: formData.value.time_zone,
      i18n: formData.value.i18n,
      logo: selectedFile.value
    })

    if (result?.done !== false) {
      isSuccess.value = true
      emit('saved')
    } else {
      showMessage(result?.message || t('grupos.alertErrorCreate', 'Error al procesar el grupo'), 'error')
    }
  } catch (error: any) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      showMessage(error?.message || t('grupos.alertNetError', 'Error de conexión'), 'error')
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
    :title="isEditMode ? t('grupos.modalEditTitle', 'Editar Grupo') : t('grupos.modalCreateTitle', 'Nuevo Grupo')"
    size="xl"
    :show-footer="false"
  >
    <template #icon>
      <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-6 relative p-1 min-h-[320px]">
      <!-- OVERLAY DE CARGA PREMIUM -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-[#13161C]/80 backdrop-blur-md rounded-[32px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="48" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-6 flex flex-col items-center animate-fade-in">
             <span class="text-xs font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ isEditMode ? 'Actualizando Grupo...' : 'Creando Grupo...' }}
            </span>
             <div class="flex gap-1">
               <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
               <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
               <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
             </div>
          </div>
        </div>
      </Transition>

      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-8 animate-pulse">
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div class="w-36 h-36 rounded-[28px] bg-white/5"></div>
          <div class="flex-1 space-y-5 w-full text-center md:text-left pt-3">
            <div class="space-y-3">
              <div class="h-8 w-3/4 bg-white/5 rounded-full mx-auto md:mx-0"></div>
              <div class="h-4 w-1/2 bg-white/5 rounded-full mx-auto md:mx-0"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="i in 2" :key="i" class="h-16 bg-white/5 rounded-xl border border-white/5"></div>
            </div>
          </div>
        </div>
        <div class="space-y-6 bg-white/5 p-5 rounded-xl border border-white/5">
           <div class="h-5 w-32 bg-white/5 rounded-full mb-6"></div>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div v-for="i in 3" :key="i" class="h-12 bg-white/5 rounded-lg"></div>
           </div>
        </div>
      </div>

      <!-- REAL CONTENT -->
      <div v-else-if="!isSuccess" class="animate-fade-in flex flex-col gap-8">
        <!-- Header de Grupo -->
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <!-- Avatar 3D con Upload -->
          <div class="relative group" style="perspective: 1200px;">
            <label for="grupoPhotoUploadModal" class="block w-36 h-36 rounded-[32px] bg-gradient-to-b from-[#2A313A] to-[#13161C] p-2 relative shadow-[0_20px_40px_rgba(0,0,0,0.6),0_5px_15px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-2px_0_rgba(0,0,0,0.4)] transition-all duration-500 cursor-pointer active:scale-95 group-hover:-translate-y-2 group-hover:rotate-x-6 group-hover:-rotate-y-6">
              
              <!-- Inner Container with deep well -->
              <div class="w-full h-full rounded-[26px] overflow-hidden bg-[#0B0D11] flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] relative z-10 border border-black/50">
                <img v-if="previewImage && !imageError" :src="previewImage" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Group" @error="imageError = true" />
                <HugeiconsIcon v-else :icon="UserGroupIcon" :size="64" :stroke-width="1.5" class="text-slate-600 transition-all duration-500 group-hover:scale-110 group-hover:text-[#5da6fc]" />
              </div>

              <!-- Ambient Glow on Hover -->
              <div class="absolute inset-0 bg-[#5da6fc]/20 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 pointer-events-none"></div>

              <!-- Upload Overlay Glass -->
              <div class="absolute inset-2 rounded-[26px] bg-gradient-to-t from-[#5da6fc]/90 to-[#5da6fc]/30 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-md z-20 shadow-[inset_0_2px_1px_rgba(255,255,255,0.4)] overflow-hidden">
                 <HugeiconsIcon :icon="Camera01Icon" :size="28" class="text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                 <span class="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{{ t('grupos.changePhoto', 'Cambiar Foto') }}</span>
              </div>
            </label>

            <input id="grupoPhotoUploadModal" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          </div>
          
          <!-- Info Principal -->
    
        </div>

        <!-- Formulario de Edición -->
        <div class="modal-card space-y-8 bg-gradient-to-b from-[#1A1D24]/90 to-[#0F1115]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-[24px] border border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.4)] relative overflow-hidden group/form">
          
          <div class="absolute -top-32 -right-32 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl group-hover/form:bg-[#3b82f6]/10 transition-colors duration-700 pointer-events-none"></div>

          <!-- Alertas de Validación / Error -->
          <Transition name="fade">
            <div v-if="modalMessage"
                 class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold border animate-fade-in-up relative z-10"
                 :class="modalMessage.type === 'error'
                   ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 text-red-400 border-red-500/20'
                   : modalMessage.type === 'warning'
                     ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20'
                     : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#5da6fc] border-[#3b82f6]/20'">
              <HugeiconsIcon :icon="modalMessage.type === 'error' || modalMessage.type === 'warning' ? Alert01Icon : CheckmarkCircle01Icon" :size="16" />
              {{ modalMessage.text }}
            </div>
          </Transition>

          <div class="flex items-center gap-3 relative z-10">
            <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500/20 to-blue-600/5 flex items-center justify-center text-[#5da6fc] border border-blue-500/30">
              <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="drop-shadow-sm" />
            </div>
            <h3 class="text-[13px] font-black text-white uppercase tracking-[0.15em]">{{ t('grupos.formConfig', 'Configuración del Grupo') }}</h3>
          </div>

          <div class="space-y-5 relative z-10 modal-form-fields">
            <!-- Nombre del Grupo -->
            <AppInput
              v-model="formData.nombre"
              :label="t('grupos.formName', 'Nombre del Grupo')"
              :placeholder="t('grupos.formNamePlaceholder', 'Ej. Grupo Principal')"
              :icon="UserGroupIcon"
              :error="getError('nombre')"
            />

            <!-- Zona Horaria Selector -->
            <div ref="timezoneDropdownRef" class="space-y-2 relative">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                :class="isTimezoneOpen ? 'text-[#5da6fc]' : 'text-slate-400'">
                {{ t('grupos.formTimeZone', 'Zona Horaria') }}
              </label>
              <div
                @click="isTimezoneOpen = !isTimezoneOpen"
                class="relative flex items-center justify-between group/input bg-[#0F1115] border border-white/5 rounded-[14px] px-4 py-3 h-[48px] cursor-pointer hover:border-white/15 transition-all duration-300"
                :class="{ 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20': isTimezoneOpen }"
              >
                <div class="flex items-center gap-3">
                  <HugeiconsIcon :icon="Clock01Icon" :size="18" :stroke-width="1.8" class="text-slate-400 group-hover/input:text-[#5da6fc] transition-colors" />
                  <span class="text-[13px] font-medium truncate" :class="formData.time_zone ? 'text-slate-200' : 'text-slate-500'">
                    {{ selectedTimezoneLabel || t('grupos.formTimeZonePlaceholder', 'Seleccionar Zona Horaria') }}
                  </span>
                </div>
                <div class="text-slate-400 transition-transform duration-300 shrink-0 ml-2" :class="isTimezoneOpen ? 'rotate-180 text-[#5da6fc]' : ''">
                  <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                </div>
              </div>

              <!-- Timezone Dropdown -->
              <Transition name="dropdown">
                <div v-if="isTimezoneOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-[#1A1D24] border border-white/10 rounded-[18px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[250] overflow-hidden py-2">
                  <div class="px-3 pb-2">
                    <div class="relative flex items-center group/search">
                      <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 text-slate-400" />
                      <input
                        v-model="timezoneSearch"
                        type="text"
                        :placeholder="t('grupos.searchTimeZone', 'Buscar zona horaria...')"
                        class="w-full pl-10 pr-4 py-2.5 bg-[#0F1115] border border-white/5 rounded-[12px] text-[13px] font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all"
                        @click.stop
                        autocomplete="off"
                      />
                    </div>
                  </div>
                  <ul class="max-h-52 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
                    <li
                      v-for="tz in filteredTimezones"
                      :key="tz.id"
                      @click="selectTimezone(tz)"
                      class="flex items-center justify-between px-3 py-2.5 rounded-[10px] cursor-pointer text-[13px] font-medium transition-all duration-200"
                      :class="formData.time_zone === tz.id ? 'bg-[#5da6fc]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                    >
                      <span class="truncate">{{ tz.label }}</span>
                      <HugeiconsIcon v-if="formData.time_zone === tz.id" :icon="Tick01Icon" :size="14" :stroke-width="3" class="shrink-0 ml-2" />
                    </li>
                    <li v-if="filteredTimezones.length === 0" class="px-4 py-6 text-center text-[12px] text-slate-500">
                      Sin resultados
                    </li>
                  </ul>
                </div>
              </Transition>
            </div>

            <!-- Idioma Selector -->
            <div ref="langDropdownRef" class="space-y-2 relative">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1 transition-colors duration-300"
                :class="isLangOpen ? 'text-[#5da6fc]' : 'text-slate-400'">
                {{ t('grupos.formLang', 'Idioma') }}
              </label>
              <div
                @click="isLangOpen = !isLangOpen"
                class="relative flex items-center justify-between group/input bg-[#0F1115] border border-white/5 rounded-[14px] px-4 py-3 h-[48px] cursor-pointer hover:border-white/15 transition-all duration-300"
                :class="{ 'border-[#3b82f6]/50 ring-1 ring-[#3b82f6]/20': isLangOpen }"
              >
                <div class="flex items-center gap-3">
                  <HugeiconsIcon :icon="LanguageCircleIcon" :size="18" :stroke-width="1.8" class="text-slate-400 group-hover/input:text-[#5da6fc] transition-colors" />
                  <span class="text-[13px] font-medium text-slate-200">
                    {{ langOptions.find(l => l.value === formData.i18n)?.label || t('grupos.formLangPlaceholder', 'Seleccionar Idioma') }}
                  </span>
                </div>
                <div class="text-slate-400 transition-transform duration-300 shrink-0 ml-2" :class="isLangOpen ? 'rotate-180 text-[#5da6fc]' : ''">
                  <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" :stroke-width="2" />
                </div>
              </div>

              <!-- Lang Dropdown -->
              <Transition name="dropdown">
                <div v-if="isLangOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-[#1A1D24] border border-white/10 rounded-[18px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[250] overflow-hidden p-2 space-y-0.5">
                  <button
                    v-for="lang in langOptions"
                    :key="lang.value"
                    type="button"
                    @click="selectLang(lang)"
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] transition-all duration-200"
                    :class="formData.i18n === lang.value ? 'bg-[#5da6fc]/10 text-[#5da6fc]' : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                  >
                    <div class="flex items-center gap-3">
                      <img :src="lang.flag" class="w-5 h-3.5 object-cover rounded-[3px] shadow-sm" />
                      <span class="text-sm font-bold">{{ lang.label }}</span>
                    </div>
                    <HugeiconsIcon v-if="formData.i18n === lang.value" :icon="Tick01Icon" :size="14" stroke-width="3" />
                  </button>
                </div>
              </Transition>
            </div>
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
            {{ isEditMode ? 'Grupo Actualizado Correctamente' : 'Grupo Creado Correctamente' }}
          </h3>
          <p class="text-[13px] text-slate-400 max-w-[320px]">
            {{ isEditMode ? 'La configuración del grupo ha sido guardada con éxito.' : 'El nuevo grupo se ha configurado de manera satisfactoria.' }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cerrar Ventana
            </AppButton>
          </div>
        </div>
      </Transition>

      <!-- Footer Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-end pt-1">
        <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
          {{ t('common.cancel') || 'Cancelar' }}
        </AppButton>
        <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="saveGrupo">
          {{ isEditMode ? t('grupos.btnSave', 'Actualizar Grupo') : t('grupos.btnCreate', 'Guardar Grupo') }}
        </AppButton>
      </div>
    </div>
  </AppModal>

  <!-- Modal para recortar imagen (Vue Advanced Cropper) -->
  <BaseModal
    :isOpen="isCropping"
    @update:isOpen="isCropping = $event"
    :title="t('grupos.editPhoto', 'Editar Foto')"
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
          class="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center"
          title="Rotar a la izquierda"
          type="button"
        >
          <HugeiconsIcon :icon="RotateLeft01Icon" :size="20" />
        </button>
        <button 
          @click="rotate(90)"
          class="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center"
          title="Rotar a la derecha"
          type="button"
        >
          <HugeiconsIcon :icon="RotateRight01Icon" :size="20" />
        </button>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
      <HugeiconsIcon :icon="Alert01Icon" :size="18" class="text-[#3b82f6]" />
      <p class="text-[12px] font-bold text-slate-600 dark:text-slate-400">
        {{ t('grupos.adjustImageInfo', 'Ajusta el círculo para centrar la foto. Solo lo que esté dentro del círculo será visible.') }}
      </p>
    </div>
  </BaseModal>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(1.05);
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
  background: #1A1D24;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}

/* Cropper UI overrides */
:deep(.vue-advanced-cropper) {
  background: transparent;
}
:deep(.vue-advanced-cropper__background),
:deep(.vue-advanced-cropper__foreground) {
  background: transparent;
}
:deep(.vue-simple-handler) {
  background: #3b82f6 !important;
  border: 2px solid white !important;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.2) !important;
}
:deep(.vue-simple-line) {
  border-color: rgba(255, 255, 255, 0.4) !important;
  border-style: dashed !important;
}
:deep(.cropper-preview) {
  border: 2px solid rgba(255,255,255,0.8);
  box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.6), 0 0 30px rgba(0,0,0,0.5) inset;
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
