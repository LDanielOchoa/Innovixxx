<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowDown01Icon,
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
  Cancel01Icon
} from '@hugeicons/core-free-icons'
import { createGrupoApi } from '../services/grupos.api'
import type { Grupo } from '../types/grupo'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createGrupoSchema, updateGrupoSchema } from '../../../schemas/grupos.schema'
import AppModal from '../../../components/ui/AppModal.vue'
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
const toast = useToast()

const isEditMode = computed(() => !!props.grupo)

const activeSchema = computed(() => isEditMode.value ? updateGrupoSchema : createGrupoSchema)
const { validate, getFirstError, resetErrors } = useFormValidator(activeSchema as any)
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

// Language picker
const isLangOpen = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)

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
    isTimezoneOpen.value = false
    isLangOpen.value = false
    timezoneSearch.value = ''
    resetErrors('grupo-form')
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
    }, 450)
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
  if (saving.value) return
  emit('update:isOpen', false)
}

const saveGrupo = async () => {
  if (saving.value) return
  clearErrors()
  modalMessage.value = null

  saving.value = true

  if (!validate(formData.value, 'grupo-form')) {
    showMessage(getFirstError('grupo-form') || '', 'warning')
    saving.value = false
    return
  }

  try {
    const result = await createGrupoApi({
      id: isEditMode.value && props.grupo ? String(props.grupo.id) : undefined,
      nombre: formData.value.nombre,
      time_zone: formData.value.time_zone,
      i18n: formData.value.i18n,
      logo: selectedFile.value
    })

    if (result?.done !== false) {
      toast.add({
        severity: 'success',
        summary: isEditMode.value ? t('grupos.alertSuccessUpdateTitle', 'Grupo Actualizado') : t('grupos.alertSuccessCreateTitle', 'Grupo Creado'),
        detail: isEditMode.value ? t('grupos.alertSuccessUpdateDetail', 'El grupo ha sido modificado exitosamente.') : t('grupos.alertSuccessCreateDetail', 'El grupo ha sido registrado exitosamente.'),
        life: 4000
      })
      emit('saved')
      if (isEditMode.value) {
        handleClose()
      } else {
        // Clear the form data
        formData.value = {
          nombre: '',
          time_zone: '',
          i18n: locale.value.split('-')[0] || 'es'
        }
        previewImage.value = null
        selectedFile.value = null
        clearErrors()
        resetErrors('grupo-form')
      }
    } else {
      showMessage(result?.message || t('grupos.alertErrorCreate', 'Error al procesar el grupo'), 'error')
    }
  } catch (error: any) {
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
    @close="handleClose"
    @confirm="saveGrupo"
    :close-on-click-outside="!saving"
    :title="isEditMode ? t('grupos.modalEditTitle', 'Editar Grupo') : t('grupos.modalCreateTitle', 'Nuevo Grupo')"
    :confirm-text="isEditMode ? t('grupos.btnSave', 'Actualizar Grupo') : t('grupos.btnCreate', 'Guardar Grupo')"
    size="xl"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="UserGroupIcon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <!-- SKELETON LOADING -->
    <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
      <div class="flex items-center gap-6 pb-4">
        <div class="w-20 h-20 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04]"></div>
        <div class="space-y-3 flex-1">
          <div class="h-3 w-32 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-3 w-48 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 3" :key="i" class="space-y-3">
          <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- FORM -->
    <form v-else @submit.prevent="saveGrupo" class="space-y-6 relative">
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
        <!-- Photo Upload -->
        <div class="flex items-center gap-5 pb-2">
          <label for="grupoPhotoUploadModal" class="relative group shrink-0" :class="saving ? 'pointer-events-none opacity-60' : 'cursor-pointer'">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] border border-white dark:border-white/10 flex items-center justify-center overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-105">
              <img v-if="previewImage" :src="previewImage" class="w-full h-full object-cover" />
              <HugeiconsIcon v-else :icon="UserGroupIcon" :size="32" :stroke-width="1.5" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] transition-colors" />
            </div>
            <div class="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1A1D24]">
              <HugeiconsIcon :icon="Camera01Icon" :size="12" />
            </div>
          </label>
          <div>
            <p class="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Foto del Grupo</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Clic en el avatar para cambiar la imagen</p>
          </div>
          <input id="grupoPhotoUploadModal" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
        </div>

        <!-- Nombre del Grupo -->
        <AppInput
          v-model="formData.nombre"
          :label="t('grupos.formName', 'Nombre del Grupo')"
          :placeholder="t('grupos.formNamePlaceholder', 'Ej. Grupo Principal')"
          :icon="UserGroupIcon"
          :error="getError('nombre')"
          :disabled="saving"
        />

        <!-- Zona Horaria Selector -->
        <div ref="timezoneDropdownRef" class="space-y-2 relative">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
            :class="isTimezoneOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'">
            {{ t('grupos.formTimeZone', 'Zona Horaria') }}
          </label>
          <div
            @click="saving ? null : (isTimezoneOpen = !isTimezoneOpen)"
            class="relative flex items-center justify-between cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 transition-all duration-300"
            :class="[
              saving ? 'opacity-60 cursor-not-allowed' : '',
              isTimezoneOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'
            ]"
          >
            <!-- Sombra inset 3D -->
            <div 
              class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
              :class="isTimezoneOpen 
                ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
            ></div>
            <div class="relative z-10 flex items-center gap-3">
              <HugeiconsIcon :icon="Clock01Icon" :size="16" :stroke-width="1.8" class="text-slate-400" />
              <span class="text-sm font-medium" :class="[formData.time_zone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-650', saving ? 'text-slate-400 dark:text-slate-650' : '']">
                {{ selectedTimezoneLabel || t('grupos.formTimeZonePlaceholder', 'Seleccionar Zona Horaria') }}
              </span>
            </div>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="relative z-10 text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isTimezoneOpen }" />
          </div>

          <Transition name="dropdown">
            <div v-if="isTimezoneOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[250] overflow-hidden">
              <div class="p-2">
                <div class="relative flex items-center mb-1">
                  <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 text-slate-400" />
                  <input
                    v-model="timezoneSearch"
                    type="text"
                    :placeholder="t('grupos.searchTimeZone', 'Buscar zona horaria...')"
                    class="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all"
                    @click.stop
                    autocomplete="off"
                  />
                </div>
              </div>
              <div class="max-h-52 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-0.5">
                <button
                  v-for="tz in filteredTimezones"
                  :key="tz.id"
                  type="button"
                  @click="selectTimezone(tz)"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                  :class="formData.time_zone === tz.id
                    ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border border-[#3b82f6]/40 dark:border-[#3b82f6]/30'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'"
                >
                  <span class="text-[13px] font-semibold truncate"
                    :class="formData.time_zone === tz.id ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                  >{{ tz.label }}</span>
                  <HugeiconsIcon v-if="formData.time_zone === tz.id" :icon="Tick01Icon" :size="14" :stroke-width="3" class="text-[#3b82f6] shrink-0 ml-2" />
                </button>
                <div v-if="filteredTimezones.length === 0" class="py-6 text-center">
                  <p class="text-[12px] font-semibold text-slate-400 dark:text-slate-500">Sin resultados</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Idioma Selector -->
        <div ref="langDropdownRef" class="space-y-2 relative">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
            :class="isLangOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'">
            {{ t('grupos.formLang', 'Idioma') }}
          </label>
          <div
            @click="saving ? null : (isLangOpen = !isLangOpen)"
            class="relative flex items-center justify-between cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 transition-all duration-300"
            :class="[
              saving ? 'opacity-60 cursor-not-allowed' : '',
              isLangOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'
            ]"
          >
            <div 
              class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
              :class="isLangOpen 
                ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
            ></div>
            <div class="relative z-10 flex items-center gap-3">
              <HugeiconsIcon :icon="LanguageCircleIcon" :size="16" :stroke-width="1.8" class="text-slate-400" />
              <span class="text-sm font-medium" :class="saving ? 'text-slate-400 dark:text-slate-650' : 'text-slate-800 dark:text-slate-200'">
                {{ langOptions.find(l => l.value === formData.i18n)?.label || t('grupos.formLangPlaceholder', 'Seleccionar Idioma') }}
              </span>
            </div>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="relative z-10 text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isLangOpen }" />
          </div>

          <Transition name="dropdown">
            <div v-if="isLangOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[250] overflow-hidden">
              <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05]">
                <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Idioma</span>
              </div>
              <div class="p-2 space-y-1">
                <button
                  v-for="lang in langOptions"
                  :key="lang.value"
                  type="button"
                  @click="selectLang(lang)"
                  class="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 border"
                  :class="formData.i18n === lang.value
                    ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border-[#3b82f6]/40 dark:border-[#3b82f6]/30'
                    : 'bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-[#20242D]/60 dark:to-[#1A1E28]/60 border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.12]'"
                >
                  <div class="flex items-center gap-3">
                    <img :src="lang.flag" class="w-6 h-4 object-cover rounded-[4px]" />
                    <span class="text-[13px] font-semibold"
                      :class="formData.i18n === lang.value ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                    >{{ lang.label }}</span>
                  </div>
                  <div v-if="formData.i18n === lang.value" class="w-6 h-6 rounded-lg bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white">
                    <HugeiconsIcon :icon="Tick01Icon" :size="12" :stroke-width="3.5" />
                  </div>
                </button>
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
          @click="saveGrupo"
          :disabled="saving"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-80 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >
          <HugeiconsIcon v-if="saving" :icon="Loading03Icon" :size="16" class="animate-spin" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="16" />
          {{ saving ? (isEditMode ? 'Actualizando grupo...' : 'Creando grupo...') : (isEditMode ? t('grupos.btnSave', 'Actualizar Grupo') : t('grupos.btnCreate', 'Guardar Grupo')) }}
        </button>
      </div>
    </template>
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
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}

/* Custom scrollbar para los selectores */
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

/* Cropper UI overrides */
.vue-advanced-cropper {
  background: transparent;
}
.vue-advanced-cropper__background,
.vue-advanced-cropper__foreground {
  background: transparent;
}
.vue-simple-handler {
  background: #3b82f6 !important;
  border: 2px solid white !important;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.2) !important;
}
.vue-simple-line {
  border-color: rgba(255, 255, 255, 0.4) !important;
  border-style: dashed !important;
}
.cropper-preview {
  border: 2px solid rgba(255,255,255,0.8);
  box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.6), 0 0 30px rgba(0,0,0,0.5) inset;
}
</style>
