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
import DataLayout from '../../../components/common/DataLayout.vue'

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
      const targetUser = list.body.find((u: any) => String(u.id) === String(editId.value))
      
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
  <DataLayout 
    class="theme-sync" 
    :title="isEditMode ? t('users.modalEditTitle', 'Editar Usuario') : t('users.modalCreateTitle', 'Nuevo Usuario')" 
    :subtitle="isEditMode ? 'Actualiza los datos del usuario seleccionado' : 'Configura un nuevo usuario para el sistema'"
  >
    <template #actions>
      <button 
        @click="router.push('/usuarios')" 
        class="inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[11px] tracking-widest uppercase transition-all duration-200 shadow-[0_4px_0_rgba(0,0,0,0.05),0_8px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.2)] active:translate-y-[4px] active:shadow-none focus:outline-none"
      >
        <HugeiconsIcon :icon="ArrowLeft01Icon" :size="18" :stroke-width="1.8" />
        <span>{{ t('common.cancel', 'Cancelar') }}</span>
      </button>

      <button 
        @click="saveUsuario" 
        :disabled="saving || loadingInit" 
        class="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] text-white font-black text-[11px] tracking-widest uppercase transition-all duration-200 shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.15)] active:translate-y-[4px] active:shadow-none focus:outline-none border border-[#2563eb] dark:border-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <HugeiconsIcon v-if="saving" :icon="Loading01Icon" :size="18" class="animate-spin" />
        <HugeiconsIcon v-else :icon="FloppyDiskIcon" :size="18" :stroke-width="2.2" />
        <span>{{ isEditMode ? t('users.btnUpdate', 'Actualizar') : t('users.btnSave', 'Guardar') }}</span>
      </button>
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

      <div v-if="loadingInit" class="w-full h-80 flex flex-col items-center justify-center gap-5 bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-2xl rounded-[32px] border border-slate-200/60 dark:border-white/5 shadow-2xl">
        <div class="w-14 h-14 border-4 border-slate-200 dark:border-white/10 border-t-[#3b82f6] dark:border-t-[#5da6fc] rounded-full animate-spin shadow-inner"></div>
        <p class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Sincronizando datos...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Contenido del Formulario (Sin doble card) -->
        <div class="p-4 md:p-6">

          <div class="space-y-8">
            <!-- Fila 1: Nombre y Email -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#13161C] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500">
                  <div class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors">
                    <HugeiconsIcon :icon="User02Icon" :size="18" :stroke-width="1.8" />
                  </div>
                  <input
                    type="text"
                    v-model="formData.nombre"
                    placeholder="Ej. Juan Pérez"
                    class="w-full bg-transparent border-none py-4 pr-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
                <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#13161C] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500" :class="isEditMode && 'opacity-60 bg-slate-100/50 dark:bg-[#13161C]'">
                  <div class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors">
                    <HugeiconsIcon :icon="Mail01Icon" :size="18" :stroke-width="1.8" />
                  </div>
                  <input
                    type="email"
                    v-model="formData.email"
                    :disabled="isEditMode"
                    placeholder="ejemplo@empresa.com"
                    class="w-full bg-transparent border-none py-4 pr-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <!-- Fila 2: Rol y Idioma -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Custom Role Dropdown -->
              <div class="space-y-3 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Rol de Usuario</label>
                <div 
                  @click="toggleRoleDropdown"
                  class="relative flex items-center justify-between group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] px-4 py-4 cursor-pointer hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                >
                  <div class="flex items-center gap-3">
                    <HugeiconsIcon :icon="Shield02Icon" :size="18" :stroke-width="1.8" class="text-slate-400 dark:text-slate-600" />
                    <span class="text-sm font-extrabold" :class="formData.id_role ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-700'">
                      {{ rolesForCreate.find(r => r.id_role === formData.id_role)?.nombre || 'Seleccionar Rol' }}
                    </span>
                  </div>
                  <HugeiconsIcon v-if="loadingRoles" :icon="Loading01Icon" :size="16" class="animate-spin text-[#3b82f6]" />
                  <HugeiconsIcon v-else :icon="ArrowLeft01Icon" :size="16" class="-rotate-90 text-slate-400 group-hover/input:text-[#3b82f6] transition-all" :class="isRoleDropdownOpen && 'rotate-90'" />
                </div>

                <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#13161C] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500">
                  <div v-if="rolesForCreate.length === 0" class="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    No hay roles disponibles
                  </div>
                  <button
                    v-for="role in rolesForCreate"
                    :key="role.id_role"
                    @click="selectRole(role)"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group/item"
                    :class="formData.id_role === role.id_role ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                  >
                    <span class="text-sm font-extrabold">{{ role.nombre }}</span>
                    <HugeiconsIcon v-if="formData.id_role === role.id_role" :icon="Tick01Icon" :size="16" stroke-width="3" />
                  </button>
                </div>
              </div>

              <!-- Idioma Selector Personalizado -->
              <div class="space-y-3 relative">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Idioma Preferido</label>
                <div 
                  @click="toggleLangDropdown"
                  class="relative flex items-center justify-between group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] px-4 py-4 cursor-pointer hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
                >
                  <div class="flex items-center gap-3">
                    <img 
                      :src="langOptions.find(l => l.value === formData.lang)?.flag" 
                      class="w-4 h-3 object-cover rounded-[2px] shadow-sm" 
                    />
                    <span class="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      {{ langOptions.find(l => l.value === formData.lang)?.label }}
                    </span>
                  </div>
                  <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" class="-rotate-90 text-slate-400 group-hover/input:text-[#3b82f6] transition-all" :class="isLangDropdownOpen && 'rotate-90'" />
                </div>

                <!-- Dropdown Menu Idioma -->
                <div v-if="isLangDropdownOpen" class="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#13161C] border border-slate-200/60 dark:border-white/10 rounded-[22px] shadow-2xl z-[50] overflow-hidden animate-fade-in-up p-2 space-y-1">
                  <button
                    v-for="lang in langOptions"
                    :key="lang.value"
                    @click="selectLang(lang)"
                    class="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group/item"
                    :class="formData.lang === lang.value ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
                  >
                    <div class="flex items-center gap-3">
                      <img :src="lang.flag" class="w-4 h-3 object-cover rounded-[1px]" />
                      <span class="text-sm font-extrabold">{{ lang.label }}</span>
                    </div>
                    <HugeiconsIcon v-if="formData.lang === lang.value" :icon="Tick01Icon" :size="16" stroke-width="3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Fila 3: Contraseña -->
            <div class="pt-6 border-t border-slate-100 dark:border-white/5">
              <div class="space-y-3">
                <div class="flex items-center justify-between ml-1">
                  <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    {{ isEditMode ? 'Restablecer Contraseña' : 'Crear Contraseña' }}
                  </label>
                </div>
                <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500">
                  <div class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors">
                    <HugeiconsIcon :icon="LockPasswordIcon" :size="18" :stroke-width="1.8" />
                  </div>
                  <input
                    type="password"
                    v-model="formData.pass"
                    :placeholder="isEditMode ? '••••••••' : 'Mínimo 8 caracteres'"
                    class="w-full bg-transparent border-none py-4 pr-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0"
                  />
                </div>
                <p class="text-[11px] text-slate-400 dark:text-slate-600 mt-2 pl-1 font-medium italic">
                  {{ isEditMode ? 'Dejar en blanco si no deseas cambiar la clave actual.' : '' }}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </DataLayout>
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>


