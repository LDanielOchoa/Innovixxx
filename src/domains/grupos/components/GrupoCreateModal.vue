<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
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
  Cancel01Icon
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
      // Modo Edición
      formData.value = {
        nombre: props.grupo.nombre,
        time_zone: props.grupo.time_zone,
        i18n: props.grupo.i18n || 'es'
      }
      if (props.grupo.logo) {
        previewImage.value = props.grupo.logo
      }
    } else {
      // Modo Creación
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
    size="lg"
    :show-footer="false"
  >
    <template #icon>
      <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- PANTALLA DE CARGA GLOBAL -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
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

      <!-- SKELETON CARGANDO INICIALIZACIÓN -->
      <div v-if="isInitializing" class="space-y-6 animate-pulse p-4">
        <div class="flex flex-col items-center space-y-4">
          <div class="w-32 h-32 rounded-[28px] bg-slate-100 dark:bg-white/5"></div>
          <div class="h-3 w-28 bg-slate-100 dark:bg-white/5 rounded-full"></div>
        </div>
        <div class="space-y-4 pt-4">
          <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
        </div>
      </div>

      <!-- VISTA DE ÉXITO -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="isSuccess" class="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div class="relative group mb-2">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all duration-500"></div>
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_8px_16px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10 transform transition-transform duration-500 hover:scale-105">
              <HugeiconsIcon :icon="Tick01Icon" :size="32" class="text-white drop-shadow-sm" />
            </div>
          </div>
          <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">
            {{ isEditMode ? 'Grupo Actualizado' : 'Grupo Creado Correctamente' }}
          </h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            {{ isEditMode ? 'La configuración del grupo ha sido guardada con éxito.' : 'El nuevo grupo se ha configurado de manera satisfactoria.' }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cerrar Ventana
            </AppButton>
          </div>
        </div>

        <!-- FORMULARIO -->
        <div v-else class="animate-fade-in space-y-6">
          
          <!-- Avatar 3D con Upload -->
          <div class="flex flex-col items-center space-y-3">
            <div class="relative group">
              <label for="grupoPhotoUploadModal" class="block w-36 h-36 rounded-[28px] bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/5 p-2 relative shadow-[0_10px_25px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#3b82f6]/50 cursor-pointer overflow-hidden active:scale-95 group-hover:-translate-y-0.5">
                <div class="w-full h-full rounded-[20px] overflow-hidden bg-slate-50 dark:bg-[#1A1D24] flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-inner">
                  <img v-if="previewImage && !imageError" :src="previewImage" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Group" @error="imageError = true" />
                  <HugeiconsIcon v-else :icon="UserGroupIcon" :size="48" :stroke-width="1.5" class="text-slate-300 dark:text-slate-600 transition-all duration-500 group-hover:scale-110 group-hover:text-[#3b82f6]" />
                </div>

                <!-- Upload Overlay Glass -->
                <div class="absolute inset-0 bg-[#3b82f6]/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-sm">
                   <HugeiconsIcon :icon="Camera01Icon" :size="24" class="text-white mb-1.5" />
                   <span class="text-[9px] font-black text-white uppercase tracking-widest">{{ t('grupos.changePhoto', 'Cambiar Foto') }}</span>
                </div>
              </label>
              <input id="grupoPhotoUploadModal" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </div>
            
            <div class="text-center space-y-0.5 mt-1">
              <h3 class="text-[13px] font-extrabold text-slate-800 dark:text-white">{{ formData.nombre || 'Nuevo Grupo' }}</h3>
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logo Principal</p>
            </div>
          </div>

          <!-- Tarjeta de Contenedor de Campos (Glassmorphism) -->
          <div class="space-y-5 bg-gradient-to-b from-white/90 to-white/50 dark:from-[#1A1D24]/90 dark:to-[#0F1115]/90 backdrop-blur-2xl p-6 rounded-[24px] border border-slate-100 dark:border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.2)] relative z-20 group/form">
            
            <!-- Alertas de Validación / Error -->
            <Transition name="fade">
              <div v-if="modalMessage"
                   class="flex items-center gap-2.5 p-3.5 rounded-[14px] text-[12px] font-bold border animate-fade-in-up relative z-10"
                   :class="modalMessage.type === 'error'
                     ? 'bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 shadow-[0_4px_12px_rgba(239,68,68,0.05)]'
                     : modalMessage.type === 'warning'
                       ? 'bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-500/10 dark:to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                       : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#3b82f6] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' || modalMessage.type === 'warning' ? Alert01Icon : Tick01Icon" :size="16" />
                {{ modalMessage.text }}
              </div>
            </Transition>

            <div class="space-y-5 relative z-10">
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
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
                  {{ t('grupos.formTimeZone', 'Zona Horaria') }}
                </label>
                <div
                  @click="isTimezoneOpen = !isTimezoneOpen"
                  class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
                >
                  <div class="flex items-center gap-3">
                    <HugeiconsIcon :icon="Clock01Icon" :size="18" :stroke-width="2.2" class="text-slate-400 dark:text-slate-600 group-hover/input:text-[#3b82f6] transition-colors" />
                    <span class="text-[13px] font-bold" :class="formData.time_zone ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                      {{ selectedTimezoneLabel || t('grupos.formTimeZonePlaceholder', 'Seleccionar Zona Horaria') }}
                    </span>
                  </div>
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" class="transition-all text-slate-400 group-hover/input:text-[#3b82f6]" :class="isTimezoneOpen ? 'rotate-90' : '-rotate-90'" />
                </div>

                <!-- Timezone Dropdown -->
                <Transition name="dropdown">
                  <div v-if="isTimezoneOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/95 dark:bg-[#0F1115]/95 backdrop-blur-3xl border border-slate-200/60 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[250] overflow-hidden py-2">
                    <div class="px-3 pb-2 border-b border-slate-100 dark:border-white/[0.05]">
                      <div class="relative flex items-center group/search">
                        <HugeiconsIcon :icon="Search01Icon" :size="16" class="absolute left-4 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] transition-colors" />
                        <input
                          v-model="timezoneSearch"
                          type="text"
                          :placeholder="t('grupos.searchTimeZone', 'Buscar zona horaria...')"
                          class="w-full pl-11 pr-4 py-2.5 bg-slate-100/60 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#1A1D24]/80 rounded-[14px] text-[13px] font-bold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 dark:focus:ring-[#5da6fc]/30 transition-all shadow-inner"
                          @click.stop
                          autocomplete="off"
                        />
                      </div>
                    </div>
                    <ul class="max-h-56 overflow-y-auto px-2 pt-1 space-y-1 custom-scrollbar">
                      <li
                        v-for="tz in filteredTimezones"
                        :key="tz.id"
                        @click="selectTimezone(tz)"
                        class="flex items-center justify-between px-4 py-2.5 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all duration-200"
                        :class="formData.time_zone === tz.id ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                      >
                        <span>{{ tz.label }}</span>
                        <HugeiconsIcon v-if="formData.time_zone === tz.id" :icon="Tick01Icon" :size="16" :stroke-width="3" />
                      </li>
                    </ul>
                  </div>
                </Transition>
              </div>

              <!-- Idioma Selector -->
              <div ref="langDropdownRef" class="space-y-2 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
                  {{ t('grupos.formLang', 'Idioma') }}
                </label>
                <div
                  @click="isLangOpen = !isLangOpen"
                  class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
                >
                  <div class="flex items-center gap-3">
                    <HugeiconsIcon :icon="LanguageCircleIcon" :size="18" :stroke-width="2.2" class="text-slate-400 dark:text-slate-600 group-hover/input:text-[#3b82f6] transition-colors" />
                    <span class="text-[13px] font-bold" :class="formData.i18n ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                      {{ langOptions.find(l => l.value === formData.i18n)?.label || t('grupos.formLangPlaceholder', 'Seleccionar Idioma') }}
                    </span>
                  </div>
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" class="transition-all text-slate-400 group-hover/input:text-[#3b82f6]" :class="isLangOpen ? 'rotate-90' : '-rotate-90'" />
                </div>

                <!-- Lang Dropdown -->
                <Transition name="dropdown">
                  <div v-if="isLangOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/95 dark:bg-[#0F1115]/95 backdrop-blur-3xl border border-slate-200/60 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[250] overflow-hidden p-2 space-y-1">
                    <button
                      v-for="lang in langOptions"
                      :key="lang.value"
                      type="button"
                      @click="selectLang(lang)"
                      class="w-full flex items-center justify-between px-4 py-3 rounded-[14px] transition-all duration-200"
                      :class="formData.i18n === lang.value ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                    >
                      <div class="flex items-center gap-3">
                        <img :src="lang.flag" class="w-5 h-3.5 object-cover rounded-[3px] shadow-sm" />
                        <span class="text-sm font-extrabold">{{ lang.label }}</span>
                      </div>
                      <HugeiconsIcon v-if="formData.i18n === lang.value" :icon="Tick01Icon" :size="18" stroke-width="3" />
                    </button>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10 border-t border-slate-100 dark:border-white/5 mt-6">
              <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
                Cancelar
              </AppButton>
              <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="saveGrupo">
                {{ isEditMode ? 'Actualizar Grupo' : 'Guardar Grupo' }}
              </AppButton>
            </div>
          </div>
        </div>
      </Transition>
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

    <div class="cropper-wrapper bg-slate-900/5 dark:bg-black/20 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 relative group">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] pointer-events-none z-10"></div>
      <Cropper
        ref="cropper"
        class="cropper min-h-[380px] max-h-[50vh]"
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
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(12px);
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
</style>
