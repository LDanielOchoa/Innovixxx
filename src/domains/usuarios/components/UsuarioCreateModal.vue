<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  User02Icon,
  Mail01Icon,
  Shield02Icon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon,
  LockPasswordIcon,
  Cancel01Icon,
  ArrowDown01Icon
} from '@hugeicons/core-free-icons'
import {
  createUsuarioApi,
  updateUsuarioApi,
  fetchGruposApi,
  fetchRolesByGrupoApi
} from '../services/usuarios.api'
import type { RoleOption, Usuario } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { storeToRefs } from 'pinia'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createUsuarioSchema, updateUsuarioSchema } from '../../../schemas/usuarios.schema'
import AppModal from '../../../components/ui/AppModal.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppInput from '../../../components/ui/AppInput.vue'

const props = defineProps<{
  isOpen: boolean
  usuario: Usuario | null
}>()

const emit = defineEmits(['update:isOpen', 'saved'])

const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

const isEditMode = computed(() => !!props.usuario)

interface UsuarioForm {
  nombre: string
  email: string
  lang: string
  pass: string
  id_role: string
  id_grupo: string
}

const activeSchema = computed(() => isEditMode.value ? updateUsuarioSchema : createUsuarioSchema)
const { validate, getFirstError, resetErrors } = useFormValidator(activeSchema as any)
const { getError, clearErrors } = useFormError('usuario-form')

const formData = ref<UsuarioForm>({
  nombre: '',
  email: '',
  lang: 'es',
  pass: '',
  id_role: '',
  id_grupo: ''
})

const rolesForCreate = ref<RoleOption[]>([])
const loadingRoles = ref(false)
const isInitializing = ref(true)
const saving = ref(false)
const isSuccess = ref(false)
const modalMessage = ref<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null)

const isLangDropdownOpen = ref(false)
const isRoleDropdownOpen = ref(false)

const roleDropdownRef = ref<HTMLElement | null>(null)
const langDropdownRef = ref<HTMLElement | null>(null)

const langOptions = [
  { value: 'es', label: 'Español', flag: 'https://flagcdn.com/co.svg' },
  { value: 'en', label: 'English', flag: 'https://flagcdn.com/us.svg' }
]

const toggleRoleDropdown = () => {
  isRoleDropdownOpen.value = !isRoleDropdownOpen.value
  if (isRoleDropdownOpen.value) isLangDropdownOpen.value = false
}

const toggleLangDropdown = () => {
  isLangDropdownOpen.value = !isLangDropdownOpen.value
  if (isLangDropdownOpen.value) isRoleDropdownOpen.value = false
}

const selectRole = (role: RoleOption) => {
  formData.value.id_role = role.id_role
  isRoleDropdownOpen.value = false
}

const selectLang = (lang: any) => {
  formData.value.lang = lang.value
  isLangDropdownOpen.value = false
}

const showMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const fetchRolesForCreate = async (groupId: string) => {
  if (!groupId) {
    rolesForCreate.value = []
    formData.value.id_role = ''
    return
  }

  loadingRoles.value = true
  try {
    rolesForCreate.value = await fetchRolesByGrupoApi(groupId)
    if (!rolesForCreate.value.find(role => role.id_role === formData.value.id_role)) {
      formData.value.id_role = rolesForCreate.value[0]?.id_role || ''
    }
  } catch (error) {
    console.error('Error al obtener roles del grupo:', error)
    rolesForCreate.value = []
    formData.value.id_role = ''
  } finally {
    loadingRoles.value = false
  }
}

// Watch modal state to initialize data
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    isSuccess.value = false
    saving.value = false
    modalMessage.value = null
    isRoleDropdownOpen.value = false
    isLangDropdownOpen.value = false
    resetErrors()
    clearErrors()

    if (props.usuario) {
      // Modo Edición
      formData.value = {
        nombre: props.usuario.nombre,
        email: props.usuario.email,
        lang: props.usuario.lang || 'es',
        pass: '',
        id_role: props.usuario.id_role || '',
        id_grupo: props.usuario.id_grupo || selectedGroup.value?.id || ''
      }
      await fetchRolesForCreate(formData.value.id_grupo)
      formData.value.id_role = props.usuario.id_role || ''
    } else {
      // Modo Creación
      formData.value = {
        nombre: '',
        email: '',
        lang: 'es',
        pass: '',
        id_role: '',
        id_grupo: selectedGroup.value?.id || ''
      }
      if (formData.value.id_grupo) {
        await fetchRolesForCreate(formData.value.id_grupo)
      }
    }

    setTimeout(() => {
      isInitializing.value = false
    }, 450)
  }
})

// Close dropdowns on outside clicks
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  if (roleDropdownRef.value && !roleDropdownRef.value.contains(target)) {
    isRoleDropdownOpen.value = false
  }
  if (langDropdownRef.value && !langDropdownRef.value.contains(target)) {
    isLangDropdownOpen.value = false
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

const saveUsuario = async () => {
  if (saving.value) return
  clearErrors()
  modalMessage.value = null

  saving.value = true
  try {
    if (!isEditMode.value) {
      if (!formData.value.id_grupo) {
        showMessage(t('users.alertNoGroup', 'No hay un grupo válido asignado.'), 'error')
        saving.value = false
        return
      }

      if (!validate(formData.value, 'usuario-form')) {
        showMessage(getFirstError('usuario-form') || '', 'warning')
        saving.value = false
        return
      }

      const data = await createUsuarioApi({
        id_grupo: formData.value.id_grupo,
        id_role: formData.value.id_role,
        nombre: formData.value.nombre,
        email: formData.value.email,
        lang: formData.value.lang,
        pass: formData.value.pass
      })

      if (data.done) {
        isSuccess.value = true
        emit('saved')
      } else {
        showMessage(data.message || t('users.alertErrorCreate'), 'error')
      }
    } else {
      if (!authStore.hasPermission(PERMISSIONS.USERS_EDIT)) {
        showMessage(t('users.alertErrorUpdate') || 'No tienes permiso para editar usuarios', 'error')
        saving.value = false
        return
      }

      if (!formData.value.id_role) {
        showMessage(t('users.alertNoRole'), 'warning')
        saving.value = false
        return
      }

      if (formData.value.pass.trim().length > 0) {
        if (!validate({ ...formData.value, id_usuario: String(props.usuario?.id) }, 'usuario-form')) {
          showMessage(getFirstError('usuario-form') || '', 'warning')
          saving.value = false
          return
        }
      }

      const updatePayload = {
        id_grupo: formData.value.id_grupo,
        id_usuario: String(props.usuario?.id),
        id_role: formData.value.id_role,
        nombre: formData.value.nombre,
        email: formData.value.email,
        lang: formData.value.lang,
        pass: formData.value.pass.trim().length > 0 ? formData.value.pass : undefined
      }

      const { data } = await updateUsuarioApi(updatePayload)

      if (data.done) {
        isSuccess.value = true
        emit('saved')
      } else {
        showMessage(data.message || t('users.alertErrorUpdate'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showMessage(getErrorMessage(error.code), 'error')
    } else {
      showMessage(isEditMode.value ? t('users.alertNetErrorUpdate') : t('users.alertNetErrorCreate'), 'error')
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
    :title="isEditMode ? t('users.modalEditTitle', 'Editar Usuario') : t('users.modalCreateTitle', 'Nuevo Usuario')"
    size="lg"
    :show-footer="false"
  >
    <template #icon>
      <HugeiconsIcon :icon="User02Icon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-5 relative p-1">
      <!-- PANTALLA DE CARGA AL GUARDAR -->
      <Transition name="fade">
        <div v-if="saving" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-[24px] transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">
              {{ isEditMode ? 'Actualizando Usuario...' : 'Guardando Usuario...' }}
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
        <div class="grid grid-cols-2 gap-4">
          <div v-for="i in 4" :key="i" class="space-y-3">
            <div class="h-2 w-20 bg-slate-100 dark:bg-white/5 rounded-full"></div>
            <div class="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
        </div>
        <div class="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <div class="h-2 w-24 bg-slate-100 dark:bg-white/5 rounded-full"></div>
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
            {{ isEditMode ? 'Usuario Actualizado' : 'Usuario Creado Exitosamente' }}
          </h3>
          <p class="text-[13px] text-slate-500 dark:text-slate-400 max-w-[320px]">
            {{ isEditMode ? 'Los datos del usuario han sido modificados con éxito.' : 'El nuevo usuario ya se encuentra registrado en el sistema.' }}
          </p>
          <div class="pt-4">
            <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
              Cerrar Ventana
            </AppButton>
          </div>
        </div>

        <!-- FORMULARIO -->
        <div v-else class="animate-fade-in space-y-5">
          <!-- Tarjeta de Contenedor Principal (Glassmorphism) -->
          <div class="space-y-6 bg-gradient-to-b from-white/90 to-white/50 dark:from-[#1A1D24]/90 dark:to-[#0F1115]/90 backdrop-blur-2xl p-6 rounded-[24px] border border-slate-100 dark:border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.2)] relative z-20 group/form">
            <!-- Brillo de ambiente superior derecho -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/5 dark:bg-[#5da6fc]/5 rounded-full blur-3xl group-hover/form:bg-[#3b82f6]/10 transition-colors duration-700 pointer-events-none"></div>

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
              <!-- Nombre y Email -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AppInput
                  v-model="formData.nombre"
                  label="Nombre Completo"
                  placeholder="Ej. Juan Pérez"
                  :icon="User02Icon"
                  :error="getError('nombre')"
                />

                <AppInput
                  v-model="formData.email"
                  label="Correo Electrónico"
                  placeholder="ejemplo@empresa.com"
                  :icon="Mail01Icon"
                  type="email"
                  :error="getError('email')"
                  :disabled="isEditMode"
                />
              </div>

              <!-- Rol y Idioma -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Selector de Rol Personalizado -->
                <div ref="roleDropdownRef" class="space-y-2 relative">
                  <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Rol de Usuario</label>
                  <div
                    @click="toggleRoleDropdown"
                    class="relative flex items-center justify-between group/input bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 rounded-[16px] px-4 py-3 cursor-pointer hover:border-[#3b82f6]/40 dark:hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_0_#1D1D24,0_2px_10px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0] dark:active:shadow-[0_0px_0_#1D1D24] select-none"
                    :class="isRoleDropdownOpen ? 'border-[#3b82f6]/40 dark:border-[#3b82f6]/30' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-[10px] flex items-center justify-center transition-all duration-300"
                        :class="formData.id_role ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_2px_0_#1d4ed8,inset_0_1px_0_rgba(255,255,255,0.3)]' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500'">
                        <HugeiconsIcon :icon="Shield02Icon" :size="14" :stroke-width="2.2" />
                      </div>
                      <span class="text-[13px] font-bold" :class="formData.id_role ? 'text-slate-700 dark:text-white' : 'text-slate-400 dark:text-slate-600'">
                        {{ rolesForCreate.find(r => r.id_role === formData.id_role)?.nombre || 'Seleccionar Rol' }}
                      </span>
                    </div>
                    <HugeiconsIcon v-if="loadingRoles" :icon="Loading03Icon" :size="16" class="animate-spin text-[#3b82f6]" />
                    <HugeiconsIcon v-else :icon="ArrowLeft01Icon" :size="14" :stroke-width="2.5" class="text-slate-400 transition-all duration-300" :class="isRoleDropdownOpen ? '-rotate-90' : 'rotate-90'" />
                  </div>

                  <!-- Dropdown Rol -->
                  <Transition name="dropdown">
                    <div v-if="isRoleDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[250] overflow-hidden">
                      <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.05] via-transparent to-transparent pointer-events-none"></div>
                        <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Rol</span>
                      </div>
                      <div class="p-2 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
                        <div v-if="rolesForCreate.length === 0" class="py-6 text-center">
                          <p class="text-[12px] font-black text-slate-400 dark:text-slate-500">No hay roles disponibles</p>
                        </div>
                        <button
                          v-for="role in rolesForCreate"
                          :key="role.id_role"
                          type="button"
                          @click="selectRole(role)"
                          class="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group/item border relative overflow-hidden"
                          :class="formData.id_role === role.id_role
                            ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border-[#3b82f6]/40 dark:border-[#3b82f6]/30 shadow-[0_3px_0_#e2e8f0,0_3px_10px_rgba(59,130,246,0.08)] dark:shadow-[0_3px_0_#1D1D24]'
                            : 'bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-[#20242D]/60 dark:to-[#1A1E28]/60 border-slate-200/80 dark:border-white/[0.07] shadow-[0_2px_0_#e2e8f0,0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_#1D1D24] hover:border-slate-300 dark:hover:border-white/[0.12]'"
                        >
                          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] transition-all duration-300"
                            :class="formData.id_role === role.id_role ? 'opacity-100 h-[65%]' : 'opacity-0 h-0'"></div>
                          <span class="text-[13px] font-black pl-2 transition-colors duration-200"
                            :class="formData.id_role === role.id_role ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-white'"
                          >{{ role.nombre }}</span>
                          <div v-if="formData.id_role === role.id_role" class="w-6 h-6 rounded-lg bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_2px_0_#1d4ed8,inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#2563eb]/40">
                            <HugeiconsIcon :icon="Tick01Icon" :size="12" :stroke-width="3.5" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>

                <!-- Selector de Idioma Personalizado -->
                <div ref="langDropdownRef" class="space-y-2 relative">
                  <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Idioma Preferido</label>
                  <div
                    @click="toggleLangDropdown"
                    class="relative flex items-center justify-between group/input bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 rounded-[16px] px-4 py-3 cursor-pointer hover:border-[#3b82f6]/40 dark:hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_0_#1D1D24,0_2px_10px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0] dark:active:shadow-[0_0px_0_#1D1D24] select-none"
                    :class="isLangDropdownOpen ? 'border-[#3b82f6]/40 dark:border-[#3b82f6]/30' : ''"
                  >
                    <div class="flex items-center gap-3">
                      <img
                        :src="langOptions.find(l => l.value === formData.lang)?.flag"
                        class="w-6 h-4 object-cover rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                      />
                      <span class="text-[13px] font-bold text-slate-700 dark:text-white">
                        {{ langOptions.find(l => l.value === formData.lang)?.label }}
                      </span>
                    </div>
                    <HugeiconsIcon :icon="ArrowLeft01Icon" :size="14" :stroke-width="2.5" class="text-slate-400 transition-all duration-300" :class="isLangDropdownOpen ? '-rotate-90' : 'rotate-90'" />
                  </div>

                  <!-- Dropdown Idioma -->
                  <Transition name="dropdown">
                    <div v-if="isLangDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[250] overflow-hidden">
                      <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.05] via-transparent to-transparent pointer-events-none"></div>
                        <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Idioma</span>
                      </div>
                      <div class="p-2 space-y-1">
                        <button
                          v-for="lang in langOptions"
                          :key="lang.value"
                          type="button"
                          @click="selectLang(lang)"
                          class="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group/item border relative overflow-hidden"
                          :class="formData.lang === lang.value
                            ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border-[#3b82f6]/40 dark:border-[#3b82f6]/30 shadow-[0_3px_0_#e2e8f0,0_3px_10px_rgba(59,130,246,0.08)] dark:shadow-[0_3px_0_#1D1D24]'
                            : 'bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-[#20242D]/60 dark:to-[#1A1E28]/60 border-slate-200/80 dark:border-white/[0.07] shadow-[0_2px_0_#e2e8f0,0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_#1D1D24] hover:border-slate-300 dark:hover:border-white/[0.12]'"
                        >
                          <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] transition-all duration-300"
                            :class="formData.lang === lang.value ? 'opacity-100 h-[65%]' : 'opacity-0 h-0'"></div>
                          <div class="flex items-center gap-3 pl-2">
                            <img :src="lang.flag" class="w-6 h-4 object-cover rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]" />
                            <span class="text-[13px] font-black transition-colors duration-200"
                              :class="formData.lang === lang.value ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-white'"
                            >{{ lang.label }}</span>
                          </div>
                          <div v-if="formData.lang === lang.value" class="w-6 h-6 rounded-lg bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_2px_0_#1d4ed8,inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#2563eb]/40">
                            <HugeiconsIcon :icon="Tick01Icon" :size="12" :stroke-width="3.5" />
                          </div>
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>

              <!-- Contraseña -->
              <div class="pt-4 border-t border-slate-100 dark:border-white/5">
                <AppInput
                  v-model="formData.pass"
                  :label="isEditMode ? 'Restablecer Contraseña' : 'Crear Contraseña'"
                  :placeholder="isEditMode ? '••••••••' : 'Mínimo 8 caracteres'"
                  :icon="LockPasswordIcon"
                  type="password"
                />
                <p v-if="isEditMode" class="text-[11px] text-slate-400 dark:text-slate-600 mt-2 pl-1 font-medium italic">
                  Dejar en blanco si no deseas cambiar la clave actual.
                </p>
              </div>
            </div>

            <!-- BOTONES DE ACCIÓN -->
            <div class="flex flex-col sm:flex-row gap-3 justify-end pt-2 relative z-10 border-t border-slate-100 dark:border-white/5 mt-6">
              <AppButton variant="secondary" :icon="Cancel01Icon" @click="handleClose">
                Cancelar
              </AppButton>
              <AppButton variant="primary" :icon="FloppyDiskIcon" :loading="saving" @click="saveUsuario">
                {{ isEditMode ? 'Actualizar Usuario' : 'Guardar Usuario' }}
              </AppButton>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </AppModal>
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
</style>
