<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
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
  CheckmarkCircle01Icon
} from '@hugeicons/core-free-icons'
import { useGroup } from '../../composables/useGroup'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import { apiClient } from '../../utils/api-client'
import AppInput from '../common/AppInput.vue'
import AppButton from '../common/AppButton.vue'

const { selectedGroup } = useGroup()
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

const emit = defineEmits(['update:isOpen', 'profileUpdated'])

const imageError = ref(false)
const previewImage = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const saving = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' } | null>(null)

const profileForm = reactive({
  nombre: '',
  email: '',
  password: '',
  new_password: ''
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    profileForm.nombre = props.userData.nombre || ''
    profileForm.email = props.userData.email || ''
    profileForm.password = ''
    profileForm.new_password = ''
    const savedPhoto = localStorage.getItem('user-profile-photo')
    previewImage.value = savedPhoto
    selectedFile.value = null
    modalMessage.value = null
    imageError.value = false
  }
})

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      previewImage.value = imageData
      imageError.value = false
      localStorage.setItem('user-profile-photo', imageData)
    }
    reader.readAsDataURL(file)
  }
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
      modalMessage.value = { text: response.message || t('common.successUpdate'), type: 'success' }
      if (previewImage.value) {
        localStorage.setItem('user-profile-photo', previewImage.value)
      }
      emit('profileUpdated')
      setTimeout(() => {
        emit('update:isOpen', false)
      }, 1500)
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
    
    <div class="flex flex-col gap-8 relative p-1 animate-fade-in">
      <!-- Header de Perfil -->
      <div class="flex flex-col md:flex-row gap-10 items-center md:items-start">
        <!-- Avatar 3D con Upload -->
        <div class="relative group">
          <label for="profilePhotoUpload" class="block w-44 h-44 rounded-[32px] bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/5 p-2 relative shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#3b82f6]/50 cursor-pointer overflow-hidden active:scale-95 group-hover:-translate-y-1">
            <div class="w-full h-full rounded-[24px] overflow-hidden bg-slate-50 dark:bg-[#13161C] flex items-center justify-center border border-slate-100 dark:border-white/5 shadow-inner">
              <img v-if="(previewImage || userData.foto) && !imageError" :src="previewImage || userData.foto" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Profile" @error="imageError = true" />
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

        <!-- Feedback Messages -->
        <Transition name="fade">
          <div v-if="modalMessage" 
               class="flex items-center gap-3 p-4 rounded-2xl text-sm font-bold shadow-sm border animate-fade-in-up"
               :class="modalMessage.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'">
            <HugeiconsIcon :icon="modalMessage.type === 'error' ? Alert01Icon : CheckmarkCircle01Icon" :size="20" />
            {{ modalMessage.text }}
          </div>
        </Transition>
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

.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>


