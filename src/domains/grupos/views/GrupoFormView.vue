<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  RotateLeft01Icon
} from '@hugeicons/core-free-icons'
import { createGrupoApi, fetchGruposApi } from '../services/grupos.api'
import { useI18n } from 'vue-i18n'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createGrupoSchema } from '../../../schemas/grupos.schema'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const isEditMode = computed(() => route.name === 'grupos-editar' || !!route.params.id)

const { validate, getFirstError } = useFormValidator(createGrupoSchema)
const { getError, clearErrors } = useFormError('grupo-form')

onMounted(async () => {
  if (isEditMode.value && route.params.id) {
    try {
      const grupos = await fetchGruposApi()
      const grupoToEdit = grupos.find(g => g.id === route.params.id)
      if (grupoToEdit) {
        formData.value = {
          nombre: grupoToEdit.nombre,
          time_zone: grupoToEdit.time_zone,
          i18n: grupoToEdit.i18n
        }
        if (grupoToEdit.logo) {
          previewImage.value = grupoToEdit.logo
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
})

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

const saving = ref(false)
const pageMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

// Photo upload state
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const imageError = ref(false)

// Estados para el cropper
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

// Generamos dinámicamente TODAS las zonas horarias del mundo (más de 400)
// utilizando la API nativa de internacionalización del navegador, sin necesidad de librerías.
const TIMEZONES = (() => {
  try {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
      const zones = Intl.supportedValuesOf('timeZone');
      return zones.map(tz => ({
        id: tz,
        label: tz
      })).sort((a, b) => a.label.localeCompare(b.label)); // Ordenar alfabéticamente
    }
  } catch (e) {
    console.error('Error cargando zonas horarias nativas:', e);
  }
  
  // Fallback extremo
  return [
    { id: 'America/Bogota', label: 'America/Bogota' },
    { id: 'UTC', label: 'UTC' }
  ];
})();

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
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

const saveGrupo = async () => {
  if (saving.value) return
  clearErrors()
  pageMessage.value = null

  if (!validate(formData.value, 'grupo-form')) {
    showMessage(getFirstError('grupo-form') || '', 'warning')
    return
  }

  saving.value = true
  try {
    const result = await createGrupoApi({
      id: isEditMode.value && route.params.id ? String(route.params.id) : undefined,
      nombre: formData.value.nombre,
      time_zone: formData.value.time_zone,
      i18n: formData.value.i18n,
      logo: selectedFile.value
    })

    if (result?.done !== false) {
      showMessage(t('grupos.alertSuccessCreate', 'Grupo creado exitosamente'), 'success')
      setTimeout(() => router.push('/grupos'), 1500)
    } else {
      showMessage(result?.message || t('grupos.alertErrorCreate', 'Error al crear el grupo'), 'error')
    }
  } catch (error: any) {
    showMessage(error?.message || t('grupos.alertNetError', 'Error de conexión'), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDataLayout
    class="theme-sync"
    :title="isEditMode ? t('grupos.modalEditTitle', 'Editar Grupo') : t('grupos.modalCreateTitle', 'Nuevo Grupo')"
    :subtitle="isEditMode ? 'Actualiza la configuración del grupo' : 'Configura un nuevo grupo para el sistema'"
    allow-overflow
  >
    <template #actions>
      <AppButton
        variant="secondary"
        :icon="ArrowLeft01Icon"
        @click="router.push('/grupos')"
      >
        <span>{{ t('common.cancel', 'Cancelar') }}</span>
      </AppButton>

      <AppButton
        variant="primary"
        :icon="FloppyDiskIcon"
        :loading="saving"
        @click="saveGrupo"
      >
        <span>{{ isEditMode ? t('grupos.btnUpdate', 'Actualizar') : t('grupos.btnSave', 'Guardar') }}</span>
      </AppButton>
    </template>

    <div class="max-w-3xl mx-auto w-full px-4 py-6">
      <!-- Feedback -->
      <Transition name="fade">
        <div
          v-if="pageMessage"
          class="mb-8 flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg border backdrop-blur-md"
          :class="{
            'text-red-500 bg-red-500/10 border-red-500/20': pageMessage.type === 'error',
            'text-amber-500 bg-amber-500/10 border-amber-500/20': pageMessage.type === 'warning',
            'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': pageMessage.type === 'success'
          }"
        >
          <HugeiconsIcon v-if="pageMessage.type === 'error' || pageMessage.type === 'warning'" :icon="Alert01Icon" :size="20" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="20" />
          {{ pageMessage.text }}
        </div>
      </Transition>

      <div class="max-w-2xl mx-auto w-full px-4 md:px-8 py-10 pb-64 flex flex-col gap-10">
        
        <!-- Avatar 3D con Upload -->
        <div class="flex flex-col items-center space-y-4">
          <div class="relative group">
            <label for="grupoPhotoUpload" class="block w-40 h-40 rounded-[32px] bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/5 p-2 relative shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#3b82f6]/50 cursor-pointer overflow-hidden active:scale-95 group-hover:-translate-y-1">
              <div class="w-full h-full rounded-[24px] overflow-hidden bg-slate-50 dark:bg-[#1A1D24] flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-inner">
                <img v-if="previewImage && !imageError" :src="previewImage" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Group" @error="imageError = true" />
                <HugeiconsIcon v-else :icon="UserGroupIcon" :size="56" :stroke-width="1.5" class="text-slate-300 dark:text-slate-600 transition-all duration-500 group-hover:scale-110 group-hover:text-[#3b82f6]" />
              </div>

              <!-- Upload Overlay Glass -->
              <div class="absolute inset-0 bg-[#3b82f6]/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-sm">
                 <HugeiconsIcon :icon="Camera01Icon" :size="28" class="text-white mb-2" />
                 <span class="text-[10px] font-black text-white uppercase tracking-widest">{{ t('grupos.changePhoto', 'Cambiar Foto') }}</span>
              </div>
            </label>
            <input id="grupoPhotoUpload" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          </div>
          
          <div class="text-center space-y-1 mt-2">
            <h3 class="text-sm font-extrabold text-slate-800 dark:text-white">{{ formData.nombre || 'Nuevo Grupo' }}</h3>
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logo Principal</p>
          </div>
        </div>

        <!-- Campos del Formulario -->
        <div class="space-y-8 bg-white/50 dark:bg-[#13161C]/50 backdrop-blur-xl p-8 rounded-[32px] border border-slate-200/60 dark:border-white/5 shadow-sm">
            <!-- Nombre del Grupo -->
            <AppFormInput
              v-model="formData.nombre"
              :label="t('grupos.formName', 'Nombre del Grupo')"
              :placeholder="t('grupos.formNamePlaceholder', 'Ej. Grupo Principal')"
              :icon="UserGroupIcon"
              :error="getError('nombre')"
            />

            <!-- Zona Horaria -->
            <div class="space-y-2 relative">
              <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
                {{ t('grupos.formTimeZone', 'Zona Horaria') }}
              </label>
              <div
                @click="isTimezoneOpen = !isTimezoneOpen"
                class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
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
              <Transition name="fade-slide">
                <div v-if="isTimezoneOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden py-2 ring-1 ring-black/5 dark:ring-white/5">
                  <!-- Search -->
                  <div class="px-3 pb-2">
                    <div class="relative flex items-center group/search">
                      <HugeiconsIcon :icon="Search01Icon" :size="16" class="absolute left-4 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] transition-colors" />
                      <input
                        v-model="timezoneSearch"
                        type="text"
                        :placeholder="t('grupos.searchTimeZone', 'Buscar zona horaria...')"
                        class="w-full pl-11 pr-4 py-3 bg-slate-100/60 dark:bg-white/5 border border-transparent focus:bg-white dark:focus:bg-[#1A1D24]/80 rounded-[14px] text-[13px] font-bold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 dark:focus:ring-[#5da6fc]/30 transition-all shadow-inner"
                        @click.stop
                        autocomplete="off"
                      />
                    </div>
                  </div>
                  <!-- List -->
                  <ul class="max-h-60 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    <li
                      v-for="tz in filteredTimezones"
                      :key="tz.id"
                      @click="selectTimezone(tz)"
                      class="flex items-center justify-between px-4 py-3 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all duration-200"
                      :class="formData.time_zone === tz.id ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                    >
                      <span>{{ tz.label }}</span>
                      <HugeiconsIcon v-if="formData.time_zone === tz.id" :icon="Tick01Icon" :size="16" :stroke-width="3" />
                    </li>
                  </ul>
                </div>
              </Transition>
            </div>

            <!-- Idioma -->
            <div class="space-y-2 relative">
              <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">
                {{ t('grupos.formLang', 'Idioma') }}
              </label>
              <div
                @click="isLangOpen = !isLangOpen"
                class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
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
              <Transition name="fade-slide">
                <div v-if="isLangOpen" class="absolute left-0 right-0 top-[calc(100%+8px)] bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden p-2 space-y-1 ring-1 ring-black/5 dark:ring-white/5">
                  <button
                    v-for="lang in langOptions"
                    :key="lang.value"
                    @click="selectLang(lang)"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all duration-200"
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
        </div>
      </div>
  </AppDataLayout>

  <!-- Modal para recortar imagen -->
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
        class="cropper min-h-[450px] max-h-[60vh]"
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
.theme-sync {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); }
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

/* Cropper UI Overrides Premium */
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
