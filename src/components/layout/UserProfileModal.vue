<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

// Icons Import
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CpuIcon,
  User02Icon,
  Camera01Icon,
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

// Services & Stores
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { apiClient } from '../../utils/api-client'
import { CookieAuth } from '../../utils/cookie-auth'
import { obtenerUrlImagen } from '../../utils/imagenes'

// Components
import BaseModal from '../common/BaseModal.vue'
import AppInput from '../ui/AppInput.vue'
import AppButton from '../common/AppButton.vue'

// ==========================================
// COMPONENT SETUP (PROPS & EMITS)
// ==========================================
interface UserData {
  nombre: string
  email: string
  grupo: string
  idioma: string
  tz: string
  foto: string
  isAdmin: boolean
}

const props = defineProps<{
  isOpen: boolean
  userData: UserData
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'profileUpdated'): void
}>()

// ==========================================
// STORES & TRANSLATIONS
// ==========================================
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

// ==========================================
// REACTIVE STATE
// ==========================================
const isInitializing = ref(true)
const saving = ref(false)
const imageError = ref(false)
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const modalMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null)

// Cropping State
const isCropping = ref(false)
const imageToCrop = ref<string | null>(null)
const cropper = ref<any>(null)

// Form State
const profileForm = reactive({
  nombre: '',
  email: '',
  password: '',
  new_password: ''
})

// ==========================================
// COMPUTED PROPERTIES
// ==========================================
const fotoMostrada = computed(() => {
  return previewImage.value || obtenerUrlImagen(props.userData.foto)
})

// ==========================================
// LIFECYCLE & WATCHERS
// ==========================================
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

// ==========================================
// FILE UPLOAD & CROPPING METHODS
// ==========================================
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

// ==========================================
// FORM SUBMISSION METHODS
// ==========================================
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
      if (response.data?.token) {
        CookieAuth.setToken(response.data.token)
      }

      // Actualizar el store localmente para que los cambios sean instantáneos
      if (response.data) {
        authStore.userData.nombre = profileForm.nombre
        authStore.userData.email = profileForm.email
        if (response.data.foto) {
          authStore.userData.foto = response.data.foto
        }
      }

      modalMessage.value = { text: response.message || t('common.successUpdate'), type: 'success' }
      
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
    @update:isOpen="emit('update:isOpen', $event)"
    :title="t('sidebar.operatorPanel')"
    size="xl"
    :showFooter="true"
  >
    <template #icon>
      <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-[#3b82f6]/20">
        <HugeiconsIcon :icon="User02Icon" :size="18" :stroke-width="2" />
      </div>
    </template>
    
    <div class="flex flex-col gap-6 relative p-1 min-h-[320px]">
      <!-- OVERLAY DE CARGA PREMIUM -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[32px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/25 blur-3xl rounded-full animate-pulse"></div>
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

      <!-- SKELETON STATE (Restructured to match 2-column layout!) -->
      <div v-if="isInitializing" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-pulse">
        <!-- Columna Izquierda Skeleton -->
        <div class="lg:col-span-4 flex flex-col items-center gap-6 w-full">
          <div class="w-36 h-36 rounded-[32px] bg-slate-100 dark:bg-white/5"></div>
          <div class="space-y-3 w-full flex flex-col items-center">
            <div class="h-7 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            <div class="h-4 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full"></div>
          </div>
          <div class="flex flex-col gap-3 w-full">
            <div v-for="i in 3" :key="i" class="h-16 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5"></div>
          </div>
        </div>
        <!-- Columna Derecha Skeleton -->
        <div class="lg:col-span-8 w-full space-y-6">
          <div class="space-y-6 bg-white/40 dark:bg-white/5 p-6 rounded-[24px] border border-slate-100 dark:border-white/5">
             <div class="h-5 w-32 bg-slate-100 dark:bg-white/5 rounded-full mb-6"></div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div v-for="i in 4" :key="i" class="h-12 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
             </div>
          </div>
        </div>
      </div>

      <!-- REAL CONTENT (2-Column Restructured UI!) -->
      <div v-else class="animate-fade-in grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- COLUMNA IZQUIERDA: TARJETA DE PERFIL Y STATS (lg:col-span-4) -->
        <div class="lg:col-span-4 flex flex-col items-center lg:items-stretch gap-6">
          <!-- Avatar 3D con Upload -->
          <div class="flex flex-col items-center text-center">
            <div class="relative group mb-4">
              <label for="profilePhotoUpload" class="block w-36 h-36 rounded-full bg-slate-100 dark:bg-white/5 p-1 relative border border-slate-200/80 dark:border-white/10 shadow-sm cursor-pointer active:scale-95 transition-all duration-300">
                
                <!-- Inner Container -->
                <div class="w-full h-full rounded-full overflow-hidden bg-slate-50 dark:bg-[#0B0D11] flex items-center justify-center border border-slate-200/50 dark:border-black/50 relative">
                  <img v-if="fotoMostrada && !imageError" :src="fotoMostrada" class="w-full h-full object-cover" alt="Profile" @error="imageError = true" />
                  <HugeiconsIcon v-else :icon="User02Icon" :size="64" :stroke-width="1.5" class="text-slate-300 dark:text-slate-600" />
                  
                  <!-- Upload Overlay Glass -->
                  <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                     <HugeiconsIcon :icon="Camera01Icon" :size="24" class="text-white mb-1" />
                     <span class="text-[9px] font-black text-white uppercase tracking-wider">{{ t('sidebar.changePhoto') }}</span>
                  </div>
                </div>
              </label>

              <input id="profilePhotoUpload" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
            </div>
            
            <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight break-words max-w-full px-2">{{ userData.nombre || t('sidebar.unidentifiedOperator') }}</h2>
            <div class="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 mt-1">
              <HugeiconsIcon :icon="Mail01Icon" :size="14" />
              <span class="text-xs font-bold break-all max-w-[200px]">{{ userData.email || 'No email' }}</span>
            </div>
          </div>
          
          <!-- Stats / Info Grid (Stacked Vertically for cleaner structure!) -->
          <div class="flex flex-col gap-3 w-full">
            <div class="bg-slate-50 dark:bg-[#0F1115] p-4 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-sm transition-all duration-200">
              <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{{ t('sidebar.groupAssign') }}</p>
              <p class="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ selectedGroup.nombre || userData.grupo || t('sidebar.none') }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-[#0F1115] p-4 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-sm transition-all duration-200">
              <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{{ t('sidebar.systemLang') }}</p>
              <p class="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ userData.idioma || 'ES' }}</p>
            </div>
            <div class="bg-slate-50 dark:bg-[#0F1115] p-4 rounded-xl border border-slate-200/80 dark:border-white/5 shadow-sm transition-all duration-200">
              <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{{ t('sidebar.timezone') }}</p>
              <p class="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{{ userData.tz || t('sidebar.notConfigured') }}</p>
            </div>
          </div>
        </div>

        <!-- COLUMNA DERECHA: FORMULARIOS DE EDICIÓN Y SEGURIDAD (lg:col-span-8) -->
        <div class="lg:col-span-8 space-y-6 w-full">
          <!-- Formulario de Edición -->
          <div class="space-y-6 bg-white dark:bg-[#0F1115] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm">

            <!-- Información Personal -->
            <div class="space-y-5">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
                  <HugeiconsIcon :icon="User02Icon" :size="20" />
                </div>
                <h3 class="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">{{ t('sidebar.editProfileInfo') }}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                <AppInput v-model="profileForm.nombre" :label="t('users.formName')" :icon="User02Icon" :placeholder="t('users.formNamePlaceholder')" />
                <AppInput v-model="profileForm.email" :label="t('users.formEmail')" :icon="Mail01Icon" type="email" :placeholder="t('users.formEmailPlaceholder')" />
              </div>
            </div>

            <!-- Seguridad -->
            <div class="space-y-5 pt-6 mt-6 border-t border-slate-200/60 dark:border-white/5 relative z-10">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[14px] bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
                  <HugeiconsIcon :icon="Shield02Icon" :size="20" />
                </div>
                <h3 class="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-[0.15em]">{{ t('users.formPasswordChangeTitle') }}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <AppInput v-model="profileForm.password" :label="t('users.formPasswordCurrent')" :icon="Shield02Icon" type="password" placeholder="••••••••" />
                <AppInput v-model="profileForm.new_password" :label="t('users.formPasswordNew')" :icon="Shield02Icon" type="password" :placeholder="t('common.optional')" />
              </div>
            </div>

            <!-- Feedback Messages Container -->
            <div class="h-14 flex items-center relative z-10 mt-4">
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

      </div>
    </div>

    <!-- Botones de Acción (Footer de BaseModal) -->
    <template #footer>
      <div class="flex flex-col sm:flex-row gap-3 justify-end w-full">
        <AppButton variant="secondary" :icon="Cancel01Icon" @click="emit('update:isOpen', false)">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton variant="primary" size="md" :icon="FloppyDiskIcon" :loading="saving" @click="handleSaveProfile">
          {{ t('common.saveChanges') }}
        </AppButton>
      </div>
    </template>
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
