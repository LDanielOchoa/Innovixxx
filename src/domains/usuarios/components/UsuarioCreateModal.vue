<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  User02Icon,
  Mail01Icon,
  Shield02Icon,
  Tick01Icon,
  Alert01Icon,
  Loading03Icon,
  LockPasswordIcon,
  Cancel01Icon,
  ArrowDown01Icon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import {
  createUsuarioApi,
  updateUsuarioApi,
  fetchGruposApi,
  fetchRolesByGrupoApi
} from '../services/usuarios.api'
import type { RoleOption, Usuario } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { storeToRefs } from 'pinia'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createUsuarioSchema, updateUsuarioSchema } from '../../../schemas/usuarios.schema'
import AppModal from '../../../components/ui/AppModal.vue'
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
const toast = useToast()

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

const btnRoles = ref<HTMLElement | null>(null)
const langDropdownRef = ref<HTMLElement | null>(null)

const isRolePanelOpen = ref(false)
const searchRoleQuery = ref('')
const panelStyle = ref<{ top: string; left: string; height: string }>({
  top: '0px',
  left: '0px',
  height: '400px'
})

const langOptions = [
  { value: 'es', label: 'Español', flag: 'https://flagcdn.com/co.svg' },
  { value: 'en', label: 'English', flag: 'https://flagcdn.com/us.svg' }
]

const filteredRoles = computed(() => {
  const q = searchRoleQuery.value.toLowerCase().trim()
  if (!q) return rolesForCreate.value
  return rolesForCreate.value.filter(r => r.nombre.toLowerCase().includes(q))
})

const abrirRolePanel = async () => {
  if (saving.value) return
  if (isRolePanelOpen.value) {
    isRolePanelOpen.value = false
    return
  }
  isRolePanelOpen.value = true
  isLangDropdownOpen.value = false
  await nextTick()
  calcularPosicionPanel(btnRoles.value)
}

const cerrarRolePanel = () => {
  isRolePanelOpen.value = false
}

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

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    height: `${panelHeight}px`
  }
}

const selectRole = (role: RoleOption) => {
  formData.value.id_role = role.id_role
  isRolePanelOpen.value = false
}

const toggleLangDropdown = () => {
  if (saving.value) return
  isLangDropdownOpen.value = !isLangDropdownOpen.value
  if (isLangDropdownOpen.value) isRolePanelOpen.value = false
}

const selectLang = (lang: any) => {
  formData.value.lang = lang.value
  isLangDropdownOpen.value = false
}

const resetFormForNewCreation = async () => {
  isSuccess.value = false
  saving.value = false
  modalMessage.value = null
  isRolePanelOpen.value = false
  isLangDropdownOpen.value = false
  searchRoleQuery.value = ''
  resetErrors()
  clearErrors()

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
    isRolePanelOpen.value = false
    isLangDropdownOpen.value = false
    searchRoleQuery.value = ''
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

  const panelEl = document.querySelector('.panel-flotante-roles')
  if (panelEl && panelEl.contains(target)) return
  if (btnRoles.value && btnRoles.value.contains(target)) return

  if (langDropdownRef.value && !langDropdownRef.value.contains(target)) {
    isLangDropdownOpen.value = false
  }

  if (isRolePanelOpen.value) {
    isRolePanelOpen.value = false
  }
}

const handleResize = () => {
  if (!isRolePanelOpen.value) return
  calcularPosicionPanel(btnRoles.value)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
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
        toast.add({
          severity: 'success',
          summary: t('users.alertSuccessCreateTitle', 'Usuario Creado'),
          detail: t('users.alertSuccessCreateDetail', 'El usuario ha sido registrado exitosamente.'),
          life: 4000
        })
        emit('saved')
        await resetFormForNewCreation()
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
        toast.add({
          severity: 'success',
          summary: t('users.alertSuccessUpdateTitle', 'Usuario Actualizado'),
          detail: t('users.alertSuccessUpdateDetail', 'Los datos del usuario han sido modificados con éxito.'),
          life: 4000
        })
        emit('saved')
        handleClose()
      } else {
        showMessage(data.message || t('users.alertErrorUpdate'), 'error')
      }
    }
  } catch (error: any) {
    console.error('Error al guardar usuario:', error)
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
    @close="handleClose"
    @confirm="saveUsuario"
    :title="isEditMode ? t('users.modalEditTitle', 'Editar Usuario') : t('users.modalCreateTitle', 'Nuevo Usuario')"
    :confirm-text="isEditMode ? 'Actualizar Usuario' : 'Guardar Usuario'"
    size="lg"
    :show-footer="!isInitializing"
  >
    <template #icon>
      <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
        <HugeiconsIcon :icon="User02Icon" :size="20" :stroke-width="2" />
      </div>
    </template>

    <!-- SKELETON LOADING -->
    <div v-if="isInitializing" class="space-y-6 animate-pulse p-2">
      <div class="grid grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="space-y-3">
          <div class="h-2 w-20 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
          <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
        </div>
      </div>
      <div class="space-y-3 pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
        <div class="h-2 w-24 bg-slate-200/60 dark:bg-white/[0.06] rounded-full"></div>
        <div class="h-12 w-full bg-slate-200/50 dark:bg-white/[0.04] rounded-xl"></div>
      </div>
    </div>

    <!-- FORM -->
    <form v-else @submit.prevent="saveUsuario" class="space-y-6 relative">
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
        <!-- Nombre y Email -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppInput
            v-model="formData.nombre"
            label="Nombre Completo"
            placeholder="Ej. Juan Pérez"
            :icon="User02Icon"
            :error="getError('nombre')"
            :disabled="saving"
          />
          <AppInput
            v-model="formData.email"
            label="Correo Electrónico"
            placeholder="ejemplo@empresa.com"
            :icon="Mail01Icon"
            type="email"
            :error="getError('email')"
            :disabled="isEditMode || saving"
          />
        </div>

        <!-- Rol y Idioma -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Role Selector -->
          <div class="space-y-2">
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
              :class="isRolePanelOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
            >Rol de Usuario</label>
            <button
              ref="btnRoles"
              type="button"
              @click="abrirRolePanel"
              :disabled="loadingRoles || saving"
              class="relative flex items-center justify-between w-full cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 transition-all duration-300"
              :class="[
                (loadingRoles || saving) ? 'opacity-60 cursor-not-allowed' : '',
                isRolePanelOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'
              ]"
            >
              <!-- Sombra inset 3D -->
              <div 
                class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
                :class="isRolePanelOpen 
                  ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                  : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
              ></div>

              <!-- Borde superior brillante en focus/open -->
              <div 
                class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300"
                :class="{ 'opacity-100 left-2 right-2': isRolePanelOpen }"
              ></div>

              <div class="relative z-10 flex items-center gap-3 w-full">
                <div class="w-7 h-7 rounded-[10px] flex-shrink-0 flex items-center justify-center transition-all duration-300"
                  :class="formData.id_role ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_2px_0_#1d4ed8,inset_0_1px_0_rgba(255,255,255,0.3)]' : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500'">
                  <HugeiconsIcon :icon="Shield02Icon" :size="14" :stroke-width="2.2" />
                </div>
                <div class="flex-1 text-left">
                  <span class="text-sm font-medium" :class="formData.id_role ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">
                    {{ rolesForCreate.find(r => r.id_role === formData.id_role)?.nombre || 'Seleccionar Rol' }}
                  </span>
                </div>
                <HugeiconsIcon v-if="loadingRoles" :icon="Loading03Icon" :size="14" class="animate-spin text-[#3b82f6] flex-shrink-0" />
                <HugeiconsIcon v-else :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isRolePanelOpen }" />
              </div>
            </button>
          </div>

          <!-- Language Dropdown -->
          <div ref="langDropdownRef" class="space-y-2 relative">
            <label class="text-[10px] font-black uppercase tracking-[0.2em] ml-1.5 transition-colors duration-300"
              :class="isLangDropdownOpen ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500'"
            >Idioma Preferido</label>
            <div
              @click="toggleLangDropdown"
              class="relative flex items-center justify-between cursor-pointer select-none bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 transition-all duration-300"
              :class="[
                saving ? 'opacity-60 cursor-not-allowed' : '',
                isLangDropdownOpen ? 'border-[#3b82f6] dark:border-[#5da6fc] ring-1 ring-[#3b82f6]/20 dark:ring-[#5da6fc]/20' : 'hover:border-slate-300 dark:hover:border-white/10'
              ]"
            >
              <!-- Sombra inset 3D -->
              <div 
                class="absolute inset-0 pointer-events-none rounded-xl transition-shadow duration-300"
                :class="isLangDropdownOpen 
                  ? 'shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]' 
                  : 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]'"
              ></div>

              <!-- Borde superior brillante en focus/open -->
              <div 
                class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent opacity-0 transition-all duration-300"
                :class="{ 'opacity-100 left-2 right-2': isLangDropdownOpen }"
              ></div>

              <div class="relative z-10 flex items-center gap-3">
                <img
                  :src="langOptions.find(l => l.value === formData.lang)?.flag"
                  class="w-6 h-4 object-cover rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                />
                <span class="text-sm font-medium" :class="saving ? 'text-slate-400 dark:text-slate-650' : 'text-slate-800 dark:text-slate-200'">
                  {{ langOptions.find(l => l.value === formData.lang)?.label }}
                </span>
              </div>
              <HugeiconsIcon :icon="ArrowDown01Icon" :size="18" :stroke-width="2" class="relative z-10 text-slate-400 flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-180': isLangDropdownOpen }" />
            </div>
            <Transition name="dropdown">
              <div v-if="isLangDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-[250] overflow-hidden">
                <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.05] via-transparent to-transparent pointer-events-none"></div>
                  <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Idioma</span>
                </div>
                <div class="p-1.5 space-y-1">
                  <button
                    v-for="lang in langOptions"
                    :key="lang.value"
                    type="button"
                    @click="selectLang(lang)"
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group/option text-left"
                    :class="formData.lang === lang.value
                      ? 'bg-[#3b82f6]/10 dark:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'"
                  >
                    <div class="flex items-center gap-3">
                      <img :src="lang.flag" class="w-6 h-4 object-cover rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]" />
                      <span class="text-[13px] font-medium"
                        :class="formData.lang === lang.value ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                      >{{ lang.label }}</span>
                    </div>
                    <HugeiconsIcon v-if="formData.lang === lang.value" :icon="Tick01Icon" :size="14" :stroke-width="2.5" class="text-[#3b82f6] shrink-0 ml-2" />
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Contraseña -->
        <div class="pt-4 border-t border-slate-200/60 dark:border-white/[0.06]">
          <AppInput
            v-model="formData.pass"
            :label="isEditMode ? 'Restablecer Contraseña' : 'Crear Contraseña'"
            :placeholder="isEditMode ? '••••••••' : 'Mínimo 8 caracteres'"
            :icon="LockPasswordIcon"
            type="password"
            :disabled="saving"
          />
          <p v-if="isEditMode" class="text-[11px] text-slate-400 dark:text-slate-600 mt-2 pl-1 font-medium italic">
            Dejar en blanco si no deseas cambiar la clave actual.
          </p>
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
          @click="saveUsuario"
          :disabled="saving"
          class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] focus:outline-none transition-all duration-200 border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-80 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
        >
          <HugeiconsIcon v-if="saving" :icon="Loading03Icon" :size="16" class="animate-spin" />
          <HugeiconsIcon v-else :icon="Tick01Icon" :size="16" />
          {{ saving ? (isEditMode ? 'Actualizando usuario...' : 'Creando usuario...') : (isEditMode ? 'Actualizar Usuario' : 'Crear Usuario') }}
        </button>
      </div>
    </template>
  </AppModal>

  <!-- PANEL FLOTANTE DE SELECCIÓN DE ROLES -->
  <Teleport to="body">
    <Transition name="panel-flotante">
      <div
        v-if="isRolePanelOpen && isOpen && !isSuccess && !isInitializing"
        class="panel-flotante-roles fixed z-[200] flex flex-col overflow-hidden bg-white dark:bg-[#1A1D24] border border-slate-200/80 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] rounded-2xl"
        :style="{
          top: panelStyle.top,
          left: panelStyle.left,
          width: '356px',
          height: panelStyle.height,
        }"
      >
        <!-- Franja de acento -->
        <div class="h-[3px] w-full shrink-0 bg-gradient-to-r from-[#3b82f6] to-[#5da6fc]" />

        <!-- Cabecera -->
        <div class="px-5 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#3b82f6]/10 text-[#3b82f6] dark:bg-[#3b82f6]/20 dark:text-[#5da6fc] border border-blue-100/50 dark:border-blue-500/20">
              <HugeiconsIcon :icon="Shield02Icon" :size="17" />
            </div>
            <div>
              <h4 class="text-[12px] font-black text-slate-800 dark:text-white tracking-tight leading-none">Roles Disponibles</h4>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-1.5">{{ filteredRoles.length }} roles</p>
            </div>
          </div>
          <button
            type="button"
            @click="cerrarRolePanel"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <!-- Buscador -->
        <div class="px-4 pt-3.5 pb-2 shrink-0">
          <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl transition-all duration-300 focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/10">
            <HugeiconsIcon :icon="Search01Icon" :size="14" class="text-slate-400 shrink-0" />
            <input
              v-model="searchRoleQuery"
              type="text"
              placeholder="Buscar rol..."
              class="flex-1 bg-transparent border-none text-[12px] font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0 p-0"
              @click.stop
            />
            <button
              v-if="searchRoleQuery"
              type="button"
              @click.stop="searchRoleQuery = ''"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors shrink-0"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="11" />
            </button>
          </div>
        </div>

        <!-- Listado -->
        <div class="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5 pr-1">
          <button
            v-for="role in filteredRoles"
            :key="role.id_role"
            type="button"
            @click="selectRole(role)"
            class="w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 text-left"
            :class="formData.id_role === role.id_role 
              ? 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' 
              : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-white/5'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0"
              :class="formData.id_role === role.id_role 
                ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-sm shadow-blue-500/20' 
                : 'border-slate-300 dark:border-white/10 bg-transparent'"
            >
              <HugeiconsIcon v-if="formData.id_role === role.id_role" :icon="Tick01Icon" :size="10" :stroke-width="3.5" />
            </div>
            <div class="flex flex-col flex-1 min-w-0 text-left">
              <span class="text-[12px] font-semibold truncate" :class="formData.id_role === role.id_role ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'">{{ role.nombre }}</span>
            </div>
          </button>
          <div v-if="filteredRoles.length === 0" class="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
            <HugeiconsIcon :icon="Shield02Icon" :size="24" class="opacity-30 mb-2" />
            <span class="text-[11px] font-semibold">{{ searchRoleQuery ? 'No se encontraron roles.' : 'Sin roles disponibles' }}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3.5 shrink-0 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            @click="cerrarRolePanel"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] transition-all duration-200 shadow-sm shadow-blue-900/10 active:scale-[0.98]"
          >
            <HugeiconsIcon :icon="Tick01Icon" :size="14" />
            Confirmar Selección
            <span v-if="formData.id_role" class="ml-1 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-md">1</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
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
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
  border: 1px solid transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* =====================================================
   SELECTOR BUTTON (Roles)
===================================================== */
.selector-btn-roles {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  gap: 0;
  background: linear-gradient(180deg, rgba(32,36,45,0.9) 0%, rgba(19,22,28,0.95) 100%) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 0.5rem 1rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  font-family: inherit;
  color: inherit;
}

.selector-btn-roles:hover {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
}

.selector-btn-roles:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
}

.selector-btn-roles.border-\[\#3b82f6\]\/40,
.selector-btn-roles.border-\[3b82f6\]\/30 {
  border-color: rgba(59,130,246,0.5);
  box-shadow: 0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
}

.selector-btn-roles:hover {
  border-color: rgba(255,255,255,0.15);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
}

.selector-btn-roles:active {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03);
}

.selector-btn-roles.border-\[\#3b82f6\]\/50,
.selector-btn-roles.border-\[\#3b82f6\]\/40 {
  border-color: rgba(59,130,246,0.5);
  box-shadow: 0 4px 16px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08);
}

/* =====================================================
   PANEL FLOTANTE — Roles
===================================================== */
.panel-flotante-roles {
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(26,29,36,0.95) 0%, rgba(15,17,21,0.98) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 32px 64px -12px rgba(0,0,0,0.5),
    0 8px 24px -4px rgba(0,0,0,0.3);
}

/* Franja de acento superior */
.panel-acento-roles {
  height: 3px;
  width: 100%;
  border-radius: 18px 18px 0 0;
  background: linear-gradient(90deg, #3b82f6, #5da6fc);
}

/* Cabecera */
.panel-head-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(59,130,246,0.15);
  color: #5da6fc;
  border: 1px solid rgba(59,130,246,0.25);
}

.panel-close-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.panel-close-btn:hover {
  background: rgba(255,255,255,0.06);
  color: #e2e8f0;
}

/* Buscador */
.panel-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.panel-search-wrap:focus-within {
  border-color: #5da6fc;
  box-shadow: 0 0 0 3px rgba(93,166,252,0.12);
}

.panel-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  outline: none;
  box-shadow: none;
  padding: 0;
}
.panel-search-input::placeholder { color: #475569; }

/* Filas del listado */
.panel-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  cursor: pointer;
  transition: background 0.12s ease;
  outline: none;
  color: #cbd5e1;
}
.panel-row--off:hover { background: rgba(255,255,255,0.04); }

.panel-row--on { background: transparent; }
.panel-row--on:hover { background: rgba(255,255,255,0.03); }

/* Indicador circular de selección */
.panel-row-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.panel-row-dot--off {
  border: 1.5px solid rgba(100,116,139,0.5);
}

.panel-row-dot--on {
  color: #fff;
  background: #3b82f6;
}

/* Estado vacío */
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

/* Footer */
.panel-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
}

.panel-confirm-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 16px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #3b82f6;
  box-shadow: 0 2px 12px rgba(59,130,246,0.35), 0 1px 3px rgba(59,130,246,0.2);
  transition: all 0.15s ease;
  letter-spacing: 0.01em;
}
.panel-confirm-btn:hover {
  background: #2563eb;
  box-shadow: 0 4px 16px rgba(59,130,246,0.45);
}
.panel-confirm-btn:active { transform: translateY(1px); }

/* Animación del panel flotante */
.panel-flotante-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-flotante-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}
.panel-flotante-enter-from {
  opacity: 0;
  transform: translateX(-16px);
}
.panel-flotante-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
