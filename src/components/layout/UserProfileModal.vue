<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CpuIcon,
  User02Icon,
  UserMultiple02Icon,
  LanguageCircleIcon,
  Time02Icon,
  Camera01Icon,
  Tick01Icon,
  Alert01Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Shield02Icon,
  Mail01Icon,
  CheckmarkCircle01Icon,
  RotateRight01Icon,
  RotateLeft01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import { apiClient } from '../../utils/api-client'
import { CookieAuth } from '../../utils/cookie-auth'
import AppInput from '../ui/AppInput.vue'
import AppButton from '../common/AppButton.vue'
import { obtenerUrlImagen } from '../../utils/imagenes'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  userData: {
    type: Object as PropType<{
      nombre: string
      email: string
      grupo: string
      idioma: string
      tz: string
      foto: string
      isAdmin: boolean
    }>,
    required: true
  }
})

const fotoMostrada = computed(() => {
  return previewImage.value || obtenerUrlImagen(props.userData.foto)
})

const emit = defineEmits(['update:isOpen', 'profileUpdated'])

const imageError = ref(false)
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const saving = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

// Estados para el cropper
const isCropping = ref(false)
const imageToCrop = ref<string | null>(null)
const cropper = ref<any>(null)

const profileForm = reactive({
  nombre: '',
  email: '',
  password: '',
  new_password: ''
})

const isInitializing = ref(true)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    profileForm.nombre = props.userData.nombre || ''
    profileForm.email = props.userData.email || ''
    profileForm.password = ''
    profileForm.new_password = ''
    previewImage.value = null
    selectedFile.value = null
    modalMessage.value = null
    imageError.value = false
    isCropping.value = false
    imageToCrop.value = null

    // Simular carga para mostrar el skeleton de forma limpia
    setTimeout(() => {
      isInitializing.value = false
    }, 800)
  }
})

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
    // Limpiar el input para permitir subir la misma foto si se desea
    target.value = ''
  }
}

const applyCrop = () => {
  if (!cropper.value) return
  
  const { canvas } = cropper.value.getResult()
  if (canvas) {
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) return
      
      const file = new File([blob], 'perfil.jpg', { type: 'image/jpeg' })
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

const rotate = (angle: number) => {
  if (cropper.value) {
    cropper.value.rotate(angle)
  }
}

const cancelCrop = () => {
  isCropping.value = false
  imageToCrop.value = null
}

const handleSaveProfile = async () => {
  if (saving.value) return
  
  if (!profileForm.nombre || !profileForm.email) {
    modalMessage.value = { text: t('common.errorRequiredFields'), type: 'error' }
    return
  }

  if ((profileForm.password && !profileForm.new_password) || (!profileForm.password && profileForm.new_password)) {
    modalMessage.value = { text: t('common.errorBothPasswordsRequired'), type: 'error' }
    return
  }

  saving.value = true
  modalMessage.value = null

  try {
    const formData = new FormData()
    formData.append('nombre', profileForm.nombre)
    formData.append('email', profileForm.email)
    
    // Incluir id_grupo si está disponible, ya que muchos endpoints lo requieren en el body
    const idGrupo = selectedGroup.value?.id || localStorage.getItem('auth-grupo-id')
    if (idGrupo) {
      formData.append('id_grupo', idGrupo)
    }
    
    if (profileForm.password && profileForm.new_password) {
      formData.append('password', profileForm.password)
      formData.append('new_password', profileForm.new_password)
    }
    
    if (selectedFile.value) {
      formData.append('foto_1', selectedFile.value)
    }

    const response = await apiClient<any>('/api/v1/usuario/perfil/actualizar/', {
      method: 'POST',
      body: formData
    })

    if (response.done) {
      // SI EL BACKEND DEVUELVE UN NUEVO TOKEN (por cambio de email/pass), LO GUARDAMOS
      // Esto evita que la siguiente petición falle con 401 y saque al usuario
      if (response.data?.token) {
        CookieAuth.setToken(response.data.token)
      }

      // Actualizar el store localmente para que los cambios sean instantáneos y no dependan de fetchUserProfile
      if (response.data) {
        authStore.userData.nombre = profileForm.nombre
        authStore.userData.email = profileForm.email
        if (response.data.foto) {
          authStore.userData.foto = response.data.foto
        }
      }

      modalMessage.value = { text: response.message || t('common.successUpdate'), type: 'success' }
      
      // Emitimos para que otros componentes se enteren, pero ya actualizamos el store
      emit('profileUpdated')
      
      // Autoclear success message after 5 seconds
      setTimeout(() => {
        if (modalMessage.value?.type === 'success') {
          modalMessage.value = null
        }
      }, 5000)
    } else {
      modalMessage.value = { text: response.message || t('common.error'), type: 'error' }
    }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    modalMessage.value = { text: error.message || t('common.errorNetwork'), type: 'error' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    @update:isOpen="$emit('update:isOpen', $event)"
    :title="t('sidebar.operatorPanel')"
    size="xl"
    :showFooter="false"
  >
    <template #icon>
      <HugeiconsIcon :icon="CpuIcon" :size="22" class="text-[#3b82f6]" />
    </template>
    
    <div class="flex flex-col gap-6 relative p-1 min-h-[320px]">
      <!-- OVERLAY DE CARGA PREMIUM -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[32px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="48" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-6 flex flex-col items-center animate-fade-in">
             <span class="text-xs font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('common.saving') }}</span>
             <div class="flex gap-1">
               <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
               <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
               <span class="w-1 h-1 bg-[#3b82f6] rounded-full animate-bounce"></span>
             </div>
          </div>
        </div>
      </Transition>
      <!-- SKELETON STATE -->
      <div v-if="isInitializing" class="space-y-8 animate-pulse">
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div class="w-36 h-36 rounded-[28px] bg-slate-100 dark:bg-white/5"></div>
          <div class="flex-1 space-y-5 w-full text-center md:text-left pt-3">
            <div class="space-y-3">
              <div class="h-8 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full mx-auto md:mx-0"></div>
              <div class="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full mx-auto md:mx-0"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div v-for="i in 3" :key="i" class="h-16 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5"></div>
            </div>
          </div>
        </div>
        <div class="space-y-6 bg-white/40 dark:bg-white/5 p-5 rounded-xl border border-slate-100 dark:border-white/5">
           <div class="h-5 w-32 bg-slate-100 dark:bg-white/5 rounded-full mb-6"></div>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
           </div>
        </div>
      </div>

      <!-- REAL CONTENT -->
      <div v-else class="animate-fade-in flex flex-col gap-8">
        <!-- Header de Perfil -->
        <div class="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <!-- Avatar 3D con Upload -->
          <div class="relative group" style="perspective: 1200px;">
            <label for="profilePhotoUpload" class="block w-36 h-36 rounded-[32px] bg-gradient-to-b from-white to-slate-100 dark:from-[#2A313A] dark:to-[#13161C] p-2 relative shadow-[0_15px_35px_rgba(0,0,0,0.1),0_5px_15px_rgba(0,0,0,0.05),inset_0_2px_0_rgba(255,255,255,0.8)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_5px_15px_rgba(0,0,0,0.4),inset_0_2px_0_rgba(255,255,255,0.08),inset_0_-2px_0_rgba(0,0,0,0.4)] transition-all duration-500 cursor-pointer active:scale-95 group-hover:-translate-y-2 group-hover:rotate-x-6 group-hover:-rotate-y-6">
              
              <!-- Inner Container with deep well -->
              <div class="w-full h-full rounded-[26px] overflow-hidden bg-slate-50 dark:bg-[#0B0D11] flex items-center justify-center shadow-[inset_0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] relative z-10 border border-slate-200/50 dark:border-black/50">
                <img v-if="fotoMostrada && !imageError" :src="fotoMostrada" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Profile" @error="imageError = true" />
                <HugeiconsIcon v-else :icon="User02Icon" :size="64" :stroke-width="1.5" class="text-slate-300 dark:text-slate-600 transition-all duration-500 group-hover:scale-110 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]" />
              </div>

              <!-- Ambient Glow on Hover -->
              <div class="absolute inset-0 bg-[#3b82f6]/30 dark:bg-[#5da6fc]/20 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 pointer-events-none"></div>

              <!-- Upload Overlay Glass -->
              <div class="absolute inset-2 rounded-[26px] bg-gradient-to-t from-[#3b82f6]/90 to-[#3b82f6]/30 dark:from-[#5da6fc]/90 dark:to-[#5da6fc]/30 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-md z-20 shadow-[inset_0_2px_1px_rgba(255,255,255,0.4)] overflow-hidden">
                 <HugeiconsIcon :icon="Camera01Icon" :size="28" class="text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                 <span class="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{{ t('sidebar.changePhoto') }}</span>
              </div>
            </label>
            


            <input id="profilePhotoUpload" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          </div>
          
          <!-- Info Principal -->
          <div class="flex-1 space-y-6 w-full text-center md:text-left">
            <div class="space-y-1">
              <h2 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{{ userData.nombre || t('sidebar.unidentifiedOperator') }}</h2>
              <div class="flex items-center justify-center md:justify-start gap-2 text-slate-400 dark:text-slate-500">
                <HugeiconsIcon :icon="Mail01Icon" :size="16" />
                <span class="text-sm font-bold">{{ userData.email || 'No email' }}</span>
              </div>
            </div>

            <!-- Stats / Info Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" style="perspective: 1000px;">
              <div class="relative group/stat">
                <div class="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/5 to-transparent dark:from-[#5da6fc]/5 rounded-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500 blur-md pointer-events-none"></div>
                <div class="bg-gradient-to-b from-white to-slate-50/80 dark:from-[#1A1D24] dark:to-[#13161C] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:rotate-x-3 transition-all duration-300 relative z-10 overflow-hidden">
                  <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 relative z-10">{{ t('sidebar.groupAssign') }}</p>
                  <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider relative z-10">{{ selectedGroup.nombre || userData.grupo || t('sidebar.none') }}</p>
                </div>
              </div>
              <div class="relative group/stat">
                <div class="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/5 to-transparent dark:from-[#5da6fc]/5 rounded-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500 blur-md pointer-events-none"></div>
                <div class="bg-gradient-to-b from-white to-slate-50/80 dark:from-[#1A1D24] dark:to-[#13161C] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:rotate-x-3 transition-all duration-300 relative z-10 overflow-hidden">
                  <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 relative z-10">{{ t('sidebar.systemLang') }}</p>
                  <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider relative z-10">{{ userData.idioma || 'ES' }}</p>
                </div>
              </div>
              <div class="relative group/stat">
                <div class="absolute inset-0 bg-gradient-to-b from-[#3b82f6]/5 to-transparent dark:from-[#5da6fc]/5 rounded-2xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500 blur-md pointer-events-none"></div>
                <div class="bg-gradient-to-b from-white to-slate-50/80 dark:from-[#1A1D24] dark:to-[#13161C] backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:rotate-x-3 transition-all duration-300 relative z-10 overflow-hidden">
                  <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 relative z-10">{{ t('sidebar.timezone') }}</p>
                  <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider relative z-10">{{ userData.tz || t('sidebar.notConfigured') }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulario de Edición -->
        <div class="space-y-6 bg-gradient-to-b from-white/90 to-white/50 dark:from-[#1A1D24]/90 dark:to-[#0F1115]/90 backdrop-blur-2xl p-6 rounded-[24px] border border-white dark:border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden group/form">
          
          <div class="absolute -top-32 -right-32 w-64 h-64 bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5 rounded-full blur-3xl group-hover/form:bg-[#3b82f6]/10 transition-colors duration-700 pointer-events-none"></div>

          <div class="flex items-center gap-3 relative z-10">
            <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/5 flex items-center justify-center text-[#3b82f6] border border-blue-200/60 dark:border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <HugeiconsIcon :icon="User02Icon" :size="20" class="drop-shadow-sm" />
            </div>
            <h3 class="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em] drop-shadow-sm">{{ t('sidebar.editProfileInfo') }}</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
            <AppInput v-model="profileForm.nombre" :label="t('users.formName')" :icon="User02Icon" :placeholder="t('users.formNamePlaceholder')" />
            <AppInput v-model="profileForm.email" :label="t('users.formEmail')" :icon="Mail01Icon" type="email" :placeholder="t('users.formEmailPlaceholder')" />
          </div>

          <!-- Seguridad -->
          <div class="space-y-6 pt-5 border-t border-slate-200/60 dark:border-white/5 relative z-10">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-600/5 flex items-center justify-center text-[#3b82f6] border border-blue-200/60 dark:border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <HugeiconsIcon :icon="Shield02Icon" :size="20" class="drop-shadow-sm" />
              </div>
              <h3 class="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em] drop-shadow-sm">{{ t('users.formPasswordChangeTitle') }}</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AppInput v-model="profileForm.password" :label="t('users.formPasswordCurrent')" :icon="Shield02Icon" type="password" placeholder="••••••••" />
              <AppInput v-model="profileForm.new_password" :label="t('users.formPasswordNew')" :icon="Shield02Icon" type="password" :placeholder="t('common.optional')" />
            </div>
          </div>

          <!-- Feedback Messages Container (Fixed Height to avoid Layout Shift) -->
          <div class="h-14 flex items-center relative z-10 mt-2">
            <Transition name="fade">
              <div v-if="modalMessage" 
                   class="w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-bold shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border animate-fade-in-up"
                   :class="modalMessage.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' : 'bg-gradient-to-r from-[#3b82f6]/10 to-[#3b82f6]/5 text-[#3b82f6] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : CheckmarkCircle01Icon" :size="20" />
                {{ modalMessage.text }}
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-end pt-1">
        <AppButton variant="secondary" :icon="Cancel01Icon" @click="$emit('update:isOpen', false)">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton variant="primary" size="md" :icon="FloppyDiskIcon" :loading="saving" @click="handleSaveProfile">
          {{ t('common.saveChanges') }}
        </AppButton>
      </div>
    </div>
  </BaseModal>

  <!-- Modal para recortar imagen -->
  <BaseModal
    :isOpen="isCropping"
    @update:isOpen="isCropping = $event"
    :title="t('sidebar.editPhoto')"
    size="lg"
    @confirm="applyCrop"
    @close="cancelCrop"
    :confirmText="t('common.apply')"
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
        {{ t('sidebar.adjustImageInfo', 'Ajusta el círculo para centrar tu foto. Solo lo que esté dentro del círculo será visible.') }}
      </p>
    </div>
  </BaseModal>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.animate-fade-in {
  font-family: 'Inter', sans-serif;
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

.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

.fade-enter-active, .fade-leave-active { 
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
}
.fade-enter-from, .fade-leave-to { 
  opacity: 0; 
  transform: scale(1.05);
  backdrop-filter: blur(0px);
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
  transform: scale(1);
  backdrop-filter: blur(12px);
}

/* Estilos personalizados para el Cropper */
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


