<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  ArrowLeft01Icon,
  FloppyDiskIcon,
  User02Icon,
  UserMultiple02Icon,
  LanguageCircleIcon,
  Mail01Icon,
  Shield02Icon,
  Tick01Icon,
  Alert01Icon,
  Loading01Icon,
  Loading03Icon,
  LockPasswordIcon
} from '@hugeicons/core-free-icons'
import {
  createUsuarioApi,
  updateUsuarioApi,
  fetchGruposApi,
  fetchRolesByGrupoApi,
  listUsuariosByGrupoApi
} from '../services/usuarios.api'
import type { Grupo, RoleOption, Usuario } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppDataLayout from '../../../components/ui/AppDataLayout.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'

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
  pageMessage.value = null

  if (!isEditMode.value && (formData.value.pass || '').trim().length < 8) {
    showMessage(t('users.alertMinPassword', 'La contraseña debe tener mínimo 8 caracteres'), 'warning')
    return
  }

  saving.value = true
  try {
    if (!isEditMode.value) {
      if (!formData.value.id_grupo) {
        showMessage(t('users.alertNoGroup', 'No hay un grupo válido asignado.'), 'error')
        saving.value = false
        return
      }
      if (!formData.value.id_role) {
        showMessage(t('users.alertNoRole', 'Debe seleccionar un rol.'), 'warning')
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
      if (!formData.value.id_role) {
        showMessage(t('users.alertNoRole'), 'warning')
        saving.value = false
        return
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
              />

              <AppFormInput 
                v-model="formData.email"
                label="Correo Electrónico"
                placeholder="ejemplo@empresa.com"
                :icon="Mail01Icon"
                type="email"
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
                  class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
                >
                  <div class="flex items-center gap-3">
                    <HugeiconsIcon :icon="Shield02Icon" :size="18" :stroke-width="2.2" class="text-slate-400 dark:text-slate-600 group-hover/input:text-[#3b82f6] transition-colors" />
                    <span class="text-[13px] font-bold" :class="formData.id_role ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                      {{ rolesForCreate.find(r => r.id_role === formData.id_role)?.nombre || 'Seleccionar Rol' }}
                    </span>
                  </div>
                  <HugeiconsIcon v-if="loadingRoles" :icon="Loading01Icon" :size="16" class="animate-spin text-[#3b82f6]" />
                  <HugeiconsIcon v-else :icon="ArrowLeft01Icon" :size="16" class="-rotate-90 text-slate-400 group-hover/input:text-[#3b82f6] transition-all" :class="isRoleDropdownOpen && 'rotate-90'" />
                </div>

                <!-- Dropdown Menu Rol -->
                <div v-if="isRoleDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[50] overflow-hidden p-2 space-y-1 ring-1 ring-black/5 dark:ring-white/5">
                  <div v-if="rolesForCreate.length === 0" class="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    No hay roles disponibles
                  </div>
                  <button
                    v-for="role in rolesForCreate"
                    :key="role.id_role"
                    @click="selectRole(role)"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all duration-200 group/item"
                    :class="formData.id_role === role.id_role ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                  >
                    <span class="text-sm font-extrabold">{{ role.nombre }}</span>
                    <HugeiconsIcon v-if="formData.id_role === role.id_role" :icon="Tick01Icon" :size="18" stroke-width="3" />
                  </button>
                </div>
              </div>

              <!-- Idioma Selector Personalizado -->
              <div class="space-y-2 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">Idioma Preferido</label>
                <div 
                  @click="toggleLangDropdown"
                  class="relative flex items-center justify-between group/input bg-slate-50/80 dark:bg-[#0A0C10]/60 border border-slate-200/60 dark:border-white/5 rounded-[20px] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6]/40 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
                >
                  <div class="flex items-center gap-3">
                    <img 
                      :src="langOptions.find(l => l.value === formData.lang)?.flag" 
                      class="w-5 h-3.5 object-cover rounded-[3px] shadow-sm" 
                    />
                    <span class="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      {{ langOptions.find(l => l.value === formData.lang)?.label }}
                    </span>
                  </div>
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" class="-rotate-90 text-slate-400 group-hover/input:text-[#3b82f6] transition-all" :class="isLangDropdownOpen && 'rotate-90'" />
                </div>

                <!-- Dropdown Menu Idioma -->
                <div v-if="isLangDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white/70 dark:bg-[#0F1115]/70 backdrop-blur-[32px] border border-white/40 dark:border-white/[0.08] rounded-[24px] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] z-[50] overflow-hidden p-2 space-y-1 ring-1 ring-black/5 dark:ring-white/5">
                  <button
                    v-for="lang in langOptions"
                    :key="lang.value"
                    @click="selectLang(lang)"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all duration-200 group/item"
                    :class="formData.lang === lang.value ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'"
                  >
                    <div class="flex items-center gap-3">
                      <img :src="lang.flag" class="w-5 h-3.5 object-cover rounded-[3px] shadow-sm" />
                      <span class="text-sm font-extrabold">{{ lang.label }}</span>
                    </div>
                    <HugeiconsIcon v-if="formData.lang === lang.value" :icon="Tick01Icon" :size="18" stroke-width="3" />
                  </button>
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
