<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Shield02Icon, 
  CheckmarkCircle01Icon, 
  Loading01Icon, 
  Alert01Icon,
  CheckmarkSquare02Icon
} from '@hugeicons/core-free-icons'
import BaseModal from '../common/BaseModal.vue'
import { apiClient } from '../../utils/api-client'
import { ApiError, getErrorMessage } from '../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import AppLoader from '../common/AppLoader.vue'

const { t } = useI18n()

interface Permission {
  id: number
  category: string
  descripcion?: string
  description?: string
  descripcion_es?: string
  descripcion_en?: string
  nombre?: string
  name?: string
}

interface RoleSummary {
  id_role: string
  nombre: string
}

const props = defineProps<{
  isOpen: boolean
  groupId: string
  role: RoleSummary | null
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'saved'): void
}>()

const permissions = ref<Permission[]>([])
const selectedPermissions = ref<number[]>([])
const loadingPermissions = ref(false)
const loadingList = ref(false)

const internalRole = ref<RoleSummary | null>(props.role)

const selectedPermissionsCount = computed(() => selectedPermissions.value.length)
const isPermissionSelected = (permissionId: number) => selectedPermissions.value.includes(permissionId)

interface ModalMessage {
  type: 'success' | 'error' | 'warning'
  text: string
}
const modalMessage = ref<ModalMessage | null>(null)

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const permissionsByCategory = computed(() => {
  const groups: Record<string, Permission[]> = {}
  permissions.value.forEach((permission) => {
    if (!groups[permission.category]) groups[permission.category] = []
    groups[permission.category]!.push(permission)
  })
  return groups
})

const closeModal = () => {
  modalMessage.value = null
  emit('update:isOpen', false)
}

const fetchPermissions = async () => {
  try {
    const data = await apiClient<{ done: boolean, data: Permission[] }>('/api/v1/list_permissions/')
    permissions.value = data.done && data.data ? data.data : []
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error al obtener permisos:', error)
    }
    permissions.value = []
  }
}

const fetchRolePermissions = async () => {
  if (!internalRole.value || !props.groupId) return
  try {
    const payload = {
      id_grupo: props.groupId,
      id_role: internalRole.value.id_role
    }

    const data = await apiClient<{ done: boolean, data: string[] }>('/api/v1/role/ver_permisos/', {
      body: JSON.stringify(payload)
    })
    
    if (data.done && data.data && Array.isArray(data.data) && data.data.length > 0) {
      const permsString = data.data[0]
      if (permsString) {
        try {
          const parsed = JSON.parse(permsString)
          if (Array.isArray(parsed)) {
            selectedPermissions.value = parsed.map(Number)
          }
        } catch (e) {
          console.error('Error parsing assigned permissions:', e)
        }
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error al obtener los permisos asignados:', error)
    }
  }
}

const savePermissions = async () => {
  if (loadingPermissions.value) return
  modalMessage.value = null

  if (!internalRole.value || !props.groupId) {
    showModalMessage('Falta seleccionar grupo o rol', 'error')
    return
  }

  if (selectedPermissions.value.length === 0) {
    showModalMessage('Selecciona al menos un permiso antes de guardar', 'warning')
    return
  }

  loadingPermissions.value = true
  try {
    const payload = {
      id_grupo: props.groupId,
      id_role: internalRole.value.id_role,
      permissions: `[${selectedPermissions.value.join(',')}]`
    }

    const data = await apiClient<{ done: boolean, message?: string }>('/api/v1/role/asignar/', {
      body: JSON.stringify(payload)
    })

    if (data.done) {
      emit('saved')
      showModalMessage('Permisos asignados con éxito', 'success')
      return
    }

    showModalMessage(data.message || 'Error al asignar permisos', 'error')
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error al asignar permisos:', error)
      showModalMessage('Error de red al asignar permisos', 'error')
    }
  } finally {
    loadingPermissions.value = false
  }
}

watch(() => props.role, (newRole) => {
  if (newRole) internalRole.value = newRole
}, { immediate: true })

watch(() => props.isOpen, async (open) => {
  if (!open) return
  
  if (props.role) internalRole.value = props.role
  
  selectedPermissions.value = []
  loadingList.value = true
  
  if (internalRole.value && props.groupId) {
    await Promise.all([
      fetchPermissions(),
      fetchRolePermissions()
    ])
  } else {
    await fetchPermissions()
  }
  
  loadingList.value = false
})

watch(() => props.role?.id_role, () => {
  if (props.isOpen) {
     selectedPermissions.value = []
  }
})
</script>

<template>
  <BaseModal
    :isOpen="isOpen"
    :title="t('roles.modalPermissionsTitle')"
    :confirmText="t('roles.btnSavePermissions')"
    :cancelText="t('common.cancel')"
    size="xl"
    @confirm="savePermissions"
    @close="closeModal"
    @update:isOpen="emit('update:isOpen', $event)"
    :isConfirmLoading="loadingPermissions"
  >
    <template #icon>
      <HugeiconsIcon :icon="Shield02Icon" :size="20" class="text-[#3b82f6]" />
    </template>

    <div class="flex flex-col gap-6 relative h-[650px]">
      <!-- Overlay de Carga Central (Guardando) -->
      <Transition name="loader-fade">
        <AppLoader 
          v-if="loadingPermissions" 
          glass 
          :text="t('roles.assigning')" 
        />
      </Transition>

      <!-- Feedback Minimalista -->
      <Transition name="fade">
        <div v-if="modalMessage && !loadingPermissions" 
             class="flex items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 shadow-sm border"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
             }">
             <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
             <HugeiconsIcon v-else :icon="CheckmarkCircle01Icon" :size="18" />
             {{ modalMessage.text }}
        </div>
      </Transition>

      <!-- Info del Rol Seleccionado -->
      <div v-if="internalRole" class="bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5 border border-blue-200/50 dark:border-blue-500/20 flex items-center justify-center text-[#3b82f6]">
            <HugeiconsIcon :icon="Shield02Icon" :size="20" :stroke-width="2" />
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">{{ t('roles.selectedRole') }}</p>
            <p class="text-sm font-extrabold text-slate-700 dark:text-slate-200 leading-none">{{ internalRole.nombre }}</p>
          </div>
        </div>
        <div class="bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] px-3 py-1.5 rounded-lg shadow-[0_4px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.2)]">
          <span class="text-[10px] font-black text-white uppercase tracking-wider">
            {{ t('roles.selectedPermissionsCount', { count: selectedPermissionsCount }) }}
          </span>
        </div>
      </div>

      <!-- Lista de Permisos -->
      <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        <Transition name="fade" mode="out-in">
          <div v-if="loadingList" class="h-full flex items-center justify-center">
            <AppLoader :text="t('common.loading') || 'Cargando...'" />
          </div>

          <div v-else-if="permissions.length === 0" class="h-full flex flex-col items-center justify-center text-center">
            <HugeiconsIcon :icon="Alert01Icon" :size="40" class="text-slate-200 dark:text-white/10 mb-4" />
            <p class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ t('roles.noPermissions') }}</p>
          </div>

          <div v-else class="space-y-8 pb-4">
            <div
              v-for="(categoryPermissions, category) in permissionsByCategory"
              :key="category"
              class="space-y-4"
            >
              <div class="flex items-center gap-3 px-1">
                <h4 class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">{{ category }}</h4>
                <div class="h-px w-full bg-slate-200/60 dark:bg-white/5"></div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  v-for="permission in categoryPermissions"
                  :key="permission.id"
                  class="group cursor-pointer relative"
                >
                  <input
                    v-model="selectedPermissions"
                    type="checkbox"
                    :value="permission.id"
                    class="sr-only"
                  >

                  <div
                    class="flex items-center gap-3 p-3 rounded-xl border transition-all duration-300"
                    :class="isPermissionSelected(permission.id)
                      ? 'bg-blue-500/[0.03] dark:bg-blue-500/[0.05] border-blue-500/20 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02]'"
                  >
                    <div
                      class="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300"
                      :class="isPermissionSelected(permission.id) 
                        ? 'bg-[#3b82f6] border-[#3b82f6]' 
                        : 'bg-transparent border-slate-300 dark:border-white/10'"
                    >
                      <HugeiconsIcon
                        :icon="CheckmarkSquare02Icon"
                        :size="12"
                        :stroke-width="4"
                        class="text-white transition-transform duration-300"
                        :class="isPermissionSelected(permission.id) ? 'scale-100' : 'scale-0'"
                      />
                    </div>

                    <div class="flex-1 min-w-0">
                      <p
                        class="text-[13px] font-bold leading-tight transition-colors duration-300"
                        :class="isPermissionSelected(permission.id) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                      >
                        {{ permission.descripcion_es || permission.descripcion_en || permission.nombre || permission.name || permission.descripcion || permission.description || `Permiso ${permission.id}` }}
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');

.flex-col {
  font-family: 'Inter', sans-serif;
}

.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
  filter: blur(10px);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>


