<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  User02Icon,
  Mail01Icon,
  Shield02Icon,
  Tick01Icon,
  Alert01Icon,
  Loading01Icon,
  LockPasswordIcon
} from '@hugeicons/core-free-icons'
import {
  createUsuarioApi,
  updateUsuarioApi,
  fetchGruposApi,
  fetchRolesByGrupoApi,
  listUsuariosByGrupoApi
} from '../services/usuarios.api'
import type { Grupo, RoleOption } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useFormValidator } from '../../../composables/useFormValidator'
import { useFormError } from '../../../composables/useFormError'
import { createUsuarioSchema, updateUsuarioSchema } from '../../../schemas/usuarios.schema'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

const isEditMode = computed(() => route.name === 'usuarios-editar' || !!route.params.id)
const editId = computed(() => route.params.id as string)

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

const grupos = ref<Grupo[]>([])
const rolesForCreate = ref<RoleOption[]>([])
const loadingRoles = ref(false)
const loadingInit = ref(isEditMode.value)
const saving = ref(false)
const pageMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const isLangDropdownOpen = ref(false)
const isRoleDropdownOpen = ref(false)
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
  pageMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (pageMessage.value?.text === text) pageMessage.value = null
    }, 4000)
  }
}

const fetchGrupos = async () => {
  try {
    grupos.value = await fetchGruposApi()
  } catch (error) {
    console.error('Error al obtener grupos:', error)
    grupos.value = []
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

const initData = async () => {
  await fetchGrupos()
  
  if (isEditMode.value && editId.value) {
    // Si estamos editando, primero obtenemos el usuario actual
    // Como la API de lista usa grupo, primero verificamos si podemos encontrarlo
    try {
      if (selectedGroup.value?.id) {
        formData.value.id_grupo = selectedGroup.value.id
      }
      
      const list = await listUsuariosByGrupoApi(formData.value.id_grupo || grupos.value[0]?.id || '', 'es')
      const targetUser = list.find((u: any) => String(u.id_usuario ?? u.id) === String(editId.value))
      
      if (targetUser) {
        formData.value = {
          nombre: targetUser.nombre,
          email: targetUser.email,
          lang: targetUser.lang || 'es',
          pass: '', // Por seguridad no traemos la contraseña real
          id_role: targetUser.id_role || '',
          id_grupo: targetUser.id_grupo || selectedGroup.value?.id || ''
        }
        await fetchRolesForCreate(formData.value.id_grupo)
        formData.value.id_role = targetUser.id_role // restaurar despues del fetch
      } else {
        showMessage('No se pudo cargar la información del usuario.', 'error')
      }
    } catch (e) {
      console.error(e)
      showMessage('Error al cargar datos del usuario', 'error')
    } finally {
      loadingInit.value = false
    }
  } else {
    // Creación
    formData.value.id_grupo = selectedGroup.value?.id || grupos.value[0]?.id || ''
    await fetchRolesForCreate(formData.value.id_grupo)
    loadingInit.value = false
  }
}

onMounted(() => {
  initData()
})

watch(() => selectedGroup.value, async (newVal, oldVal) => {
  if (newVal?.id && oldVal?.id && newVal.id !== oldVal.id && !isEditMode.value) {
    formData.value.id_grupo = newVal.id
    await fetchRolesForCreate(formData.value.id_grupo)
  }
})

const saveUsuario = async () => {
  if (saving.value) return
  clearErrors()
  pageMessage.value = null

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
        showMessage(t('users.alertSuccessCreate', 'Usuario creado exitosamente'), 'success')
        setTimeout(() => {
          router.push('/usuarios')
        }, 1500)
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
        if (!validate({ ...formData.value, id_usuario: editId.value }, 'usuario-form')) {
          showMessage(getFirstError('usuario-form') || '', 'warning')
          saving.value = false
          return
        }
      }

      const updatePayload = {
        id_grupo: formData.value.id_grupo,
        id_usuario: editId.value,
        id_role: formData.value.id_role,
        nombre: formData.value.nombre,
        email: formData.value.email,
        lang: formData.value.lang,
        pass: formData.value.pass.trim().length > 0 ? formData.value.pass : undefined
      }

      const { data } = await updateUsuarioApi(updatePayload)

      if (data.done) {
        showMessage(t('users.alertSuccessUpdate', 'Usuario actualizado exitosamente'), 'success')
        setTimeout(() => {
          router.push('/usuarios')
        }, 1500)
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
  <AppDataLayout 
    class="theme-sync" 
    :title="isEditMode ? t('users.modalEditTitle', 'Editar Usuario') : t('users.modalCreateTitle', 'Nuevo Usuario')" 
    :subtitle="isEditMode ? 'Actualiza los datos del usuario seleccionado' : 'Configura un nuevo usuario para el sistema'"
  >
    <template #actions>
      <AppButton 
        variant="secondary" 
        :icon="ArrowLeft01Icon"
        @click="router.push('/usuarios')" 
      >
        <span>{{ t('common.cancel', 'Cancelar') }}</span>
      </AppButton>

      <AppButton 
        variant="primary" 
        :icon="isEditMode ? FloppyDiskIcon : FloppyDiskIcon"
        :loading="saving"
        :disabled="loadingInit"
        @click="saveUsuario" 
      >
        <span>{{ isEditMode ? t('users.btnUpdate', 'Actualizar') : t('users.btnSave', 'Guardar') }}</span>
      </AppButton>
    </template>

    <div class="max-w-3xl mx-auto w-full px-4 py-6">
      <!-- Feedback Minimalista -->
      <Transition name="fade">
        <div v-if="pageMessage" 
             class="mb-8 flex items-center gap-3 py-3.5 px-5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg border backdrop-blur-md"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': pageMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': pageMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': pageMessage.type === 'success'
             }">
             <HugeiconsIcon v-if="pageMessage.type === 'error' || pageMessage.type === 'warning'" :icon="Alert01Icon" :size="20" />
             <HugeiconsIcon v-else :icon="Tick01Icon" :size="20" />
             {{ pageMessage.text }}
        </div>
      </Transition>

      <Transition name="fade-slide" mode="out-in">
        <!-- Skeleton Loading State (Simplified & Faster feel) -->
        <div v-if="loadingInit" key="loading" class="space-y-12 py-10 px-6 md:px-12 max-w-4xl mx-auto animate-pulse">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
            <div v-for="i in 4" :key="i" class="space-y-3">
              <div class="h-2 w-24 bg-slate-200 dark:bg-white/[0.03] rounded-full mx-1"></div>
              <div class="h-12 w-full bg-slate-100/50 dark:bg-white/[0.02] rounded-[20px] border border-slate-200/40 dark:border-white/[0.02]"></div>
            </div>
          </div>
          
          <div class="pt-10 border-t border-slate-100/60 dark:border-white/5">
            <div class="space-y-3">
              <div class="h-2 w-32 bg-slate-200 dark:bg-white/[0.03] rounded-full mx-1"></div>
              <div class="h-12 w-full bg-slate-100/50 dark:bg-white/[0.02] rounded-[20px] border border-slate-200/40 dark:border-white/[0.02]"></div>
            </div>
          </div>
        </div>

        <div v-else key="content" class="space-y-10 py-10 px-6 md:px-12 max-w-4xl mx-auto pb-64">
          <div class="space-y-8">
            <!-- Fila 1: Nombre y Email -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AppFormInput 
                v-model="formData.nombre"
                label="Nombre Completo"
                placeholder="Ej. Juan Pérez"
                :icon="User02Icon"
                :error="getError('nombre')"
              />

              <AppFormInput 
                v-model="formData.email"
                label="Correo Electrónico"
                placeholder="ejemplo@empresa.com"
                :icon="Mail01Icon"
                type="email"
                :error="getError('email')"
                :disabled="isEditMode"
              />
            </div>

            <!-- Fila 2: Rol y Idioma -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <!-- Custom Role Dropdown -->
              <div class="space-y-2 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Rol de Usuario</label>
                <div
                  @click="toggleRoleDropdown"
                  class="relative flex items-center justify-between group/input bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 rounded-[16px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 dark:hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_0_#1D1D24,0_2px_10px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0] dark:active:shadow-[0_0px_0_#1D1D24] select-none"
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
                  <HugeiconsIcon v-if="loadingRoles" :icon="Loading01Icon" :size="16" class="animate-spin text-[#3b82f6]" />
                  <HugeiconsIcon v-else :icon="ArrowLeft01Icon" :size="14" :stroke-width="2.5" class="text-slate-400 transition-all duration-300" :class="isRoleDropdownOpen ? '-rotate-90' : 'rotate-90'" />
                </div>

                <!-- Dropdown Rol -->
                <div v-if="isRoleDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[50] overflow-hidden">
                  <!-- Header decorativo -->
                  <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.05] via-transparent to-transparent pointer-events-none"></div>
                    <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Rol</span>
                  </div>
                  <div class="p-2 space-y-1">
                    <div v-if="rolesForCreate.length === 0" class="py-6 text-center">
                      <p class="text-[12px] font-black text-slate-400 dark:text-slate-500">No hay roles disponibles</p>
                    </div>
                    <button
                      v-for="role in rolesForCreate"
                      :key="role.id_role"
                      @click="selectRole(role)"
                      class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group/item border relative overflow-hidden"
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
              </div>

              <!-- Idioma Selector Personalizado -->
              <div class="space-y-2 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Idioma Preferido</label>
                <div
                  @click="toggleLangDropdown"
                  class="relative flex items-center justify-between group/input bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 rounded-[16px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 dark:hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_3px_0_#1D1D24,0_2px_10px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0] dark:active:shadow-[0_0px_0_#1D1D24] select-none"
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
                <div v-if="isLangDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] z-[50] overflow-hidden">
                  <!-- Header decorativo -->
                  <div class="relative px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.05] via-transparent to-transparent pointer-events-none"></div>
                    <span class="relative text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seleccionar Idioma</span>
                  </div>
                  <div class="p-2 space-y-1">
                    <button
                      v-for="lang in langOptions"
                      :key="lang.value"
                      @click="selectLang(lang)"
                      class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group/item border relative overflow-hidden"
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
              </div>
            </div>

            <div class="pt-6 border-t border-slate-100 dark:border-white/5">
              <AppFormInput 
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
        </div>
      </Transition>
    </div>
  </AppDataLayout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

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

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

/* Transición fluida entre estados */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(1.02);
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
