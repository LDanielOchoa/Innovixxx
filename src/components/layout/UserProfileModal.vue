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
import AppInput from '../common/AppInput.vue'
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
    
    <div class="flex flex-col gap-8 relative p-1 min-h-[400px]">
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
      <div v-if="isInitializing" class="space-y-10 animate-pulse">
        <div class="flex flex-col md:flex-row gap-10 items-center md:items-start">
          <div class="w-44 h-44 rounded-[32px] bg-slate-100 dark:bg-white/5"></div>
          <div class="flex-1 space-y-6 w-full text-center md:text-left pt-4">
            <div class="space-y-3">
              <div class="h-10 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full mx-auto md:mx-0"></div>
              <div class="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full mx-auto md:mx-0"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div v-for="i in 3" :key="i" class="h-20 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5"></div>
            </div>
          </div>
        </div>
        <div class="space-y-8 bg-slate-50/30 dark:bg-white/5 p-8 rounded-[32px] border border-slate-100 dark:border-white/5">
           <div class="h-6 w-40 bg-slate-100 dark:bg-white/5 rounded-full mb-8"></div>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div v-for="i in 4" :key="i" class="h-14 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
           </div>
        </div>
      </div>

      <!-- REAL CONTENT -->
      <div v-else class="animate-fade-in flex flex-col gap-8">
        <!-- Header de Perfil -->
        <div class="flex flex-col md:flex-row gap-10 items-center md:items-start">
          <!-- Avatar 3D con Upload -->
          <div class="relative group">
            <label for="profilePhotoUpload" class="block w-44 h-44 rounded-[32px] bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/5 p-2 relative shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#3b82f6]/50 cursor-pointer overflow-hidden active:scale-95 group-hover:-translate-y-1">
              <div class="w-full h-full rounded-[24px] overflow-hidden bg-slate-50 dark:bg-[#13161C] flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-inner">
                <img v-if="fotoMostrada && !imageError" :src="fotoMostrada" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Profile" @error="imageError = true" />
                <HugeiconsIcon v-else :icon="User02Icon" :size="64" :stroke-width="1" class="text-slate-300 dark:text-slate-600 transition-all duration-500 group-hover:scale-110 group-hover:text-[#3b82f6]" />
              </div>

              <!-- Upload Overlay Glass -->
              <div class="absolute inset-0 bg-[#3b82f6]/40 dark:bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-sm">
                 <HugeiconsIcon :icon="Camera01Icon" :size="28" class="text-white mb-2" />
                 <span class="text-[10px] font-black text-white uppercase tracking-widest">{{ t('sidebar.changePhoto') }}</span>
              </div>
            </label>
            
            <!-- Admin Badge 3D -->
            <div class="absolute -bottom-3 -right-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] p-3 rounded-2xl text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <HugeiconsIcon :icon="userData.isAdmin ? Shield02Icon : User02Icon" :size="22" :stroke-width="2.5" />
            </div>

            <input id="profilePhotoUpload" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          </div>
          
          <!-- Info Principal -->
          <div class="flex-1 space-y-6 w-full text-center md:text-left">
            <div class="space-y-1">
              <h2 class="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{{ userData.nombre || t('sidebar.unidentifiedOperator') }}</h2>
              <div class="flex items-center justify-center md:justify-start gap-2 text-slate-400 dark:text-slate-500">
                <HugeiconsIcon :icon="Mail01Icon" :size="16" />
                <span class="text-sm font-bold">{{ userData.email || 'No email' }}</span>
              </div>
            </div>

            <!-- Stats / Info Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-slate-50/50 dark:bg-[#13161C] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm group/card hover:-translate-y-1 transition-all duration-300">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{{ t('sidebar.groupAssign') }}</p>
                <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ selectedGroup.nombre || userData.grupo || t('sidebar.none') }}</p>
              </div>
              <div class="bg-slate-50/50 dark:bg-[#13161C] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm group/card hover:-translate-y-1 transition-all duration-300">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{{ t('sidebar.systemLang') }}</p>
                <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ userData.idioma || 'ES' }}</p>
              </div>
              <div class="bg-slate-50/50 dark:bg-[#13161C] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm group/card hover:-translate-y-1 transition-all duration-300">
                <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{{ t('sidebar.timezone') }}</p>
                <p class="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ userData.tz || t('sidebar.notConfigured') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulario de Edición -->
        <div class="space-y-8 bg-white/40 dark:bg-[#13161C]/30 backdrop-blur-xl p-6 rounded-[32px] border border-slate-200/80 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-[#3b82f6] border border-blue-100 dark:border-blue-500/20">
              <HugeiconsIcon :icon="User02Icon" :size="16" />
            </div>
            <h3 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{{ t('sidebar.editProfileInfo') }}</h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AppInput v-model="profileForm.nombre" :label="t('users.formName')" :icon="User02Icon" :placeholder="t('users.formNamePlaceholder')" />
            <AppInput v-model="profileForm.email" :label="t('users.formEmail')" :icon="Mail01Icon" type="email" :placeholder="t('users.formEmailPlaceholder')" />
          </div>

          <!-- Seguridad -->
          <div class="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                <HugeiconsIcon :icon="Shield02Icon" :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{{ t('users.formPasswordChangeTitle') }}</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AppInput v-model="profileForm.password" :label="t('users.formPasswordCurrent')" :icon="Shield02Icon" type="password" placeholder="••••••••" />
              <AppInput v-model="profileForm.new_password" :label="t('users.formPasswordNew')" :icon="Shield02Icon" type="password" :placeholder="t('common.optional')" />
            </div>
          </div>

          <!-- Feedback Messages Container (Fixed Height to avoid Layout Shift) -->
          <div class="h-16 flex items-center">
            <Transition name="fade">
              <div v-if="modalMessage" 
                   class="w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-bold shadow-sm border animate-fade-in-up"
                   :class="modalMessage.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'">
                <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : CheckmarkCircle01Icon" :size="20" />
                {{ modalMessage.text }}
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-end pt-2">
        <AppButton variant="secondary" :icon="Cancel01Icon" @click="$emit('update:isOpen', false)">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="handleSaveProfile">
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


