<script setup lang="ts">
import { computed, ref, watch, markRaw } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Shield02Icon, 
  CheckmarkCircle01Icon, 
  Alert01Icon,
  CheckmarkSquare02Icon,
  Loading03Icon,
  PencilEdit01Icon,
  Delete02Icon,
  ViewIcon,
  Add01Icon,
  Key01Icon,
  Settings04Icon,
  Clock01Icon,
  Search01Icon,
  Cancel01Icon,
  TickDouble02Icon
} from '@hugeicons/core-free-icons'
import BaseModal from '../common/BaseModal.vue'
import { apiClient } from '../../utils/api-client'
import { ApiError, getErrorMessage } from '../../utils/api-errors'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import AppLoader from '../common/AppLoader.vue'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const selectedCategory = ref<string>('ALL')

const getPermissionMeta = (desc?: string) => {
  const text = (desc || '').toLowerCase()
  if (text.includes('crear') || text.includes('create')) {
    return {
      icon: markRaw(Add01Icon),
      badgeText: 'Crear',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    }
  }
  if (text.includes('edit') || text.includes('actualizar') || text.includes('update')) {
    return {
      icon: markRaw(PencilEdit01Icon),
      badgeText: 'Editar',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    }
  }
  if (text.includes('borrar') || text.includes('eliminar') || text.includes('delete')) {
    return {
      icon: markRaw(Delete02Icon),
      badgeText: 'Borrar',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    }
  }
  if (text.includes('listar') || text.includes('list')) {
    return {
      icon: markRaw(ViewIcon),
      badgeText: 'Listar',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    }
  }
  if (text.includes('asignar') || text.includes('assign')) {
    return {
      icon: markRaw(Key01Icon),
      badgeText: 'Asignar',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    }
  }
  if (text.includes('estado') || text.includes('status')) {
    return {
      icon: markRaw(Settings04Icon),
      badgeText: 'Estado',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    }
  }
  if (text.includes('historial') || text.includes('detalles') || text.includes('detail')) {
    return {
      icon: markRaw(Clock01Icon),
      badgeText: 'Detalles',
      badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    }
  }
  return {
    icon: markRaw(ViewIcon),
    badgeText: 'General',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  }
}

interface Permission {
  id: string | number
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
const selectedPermissions = ref<string[]>([])
const loadingPermissions = ref(false)
const loadingList = ref(false)

const internalRole = ref<RoleSummary | null>(props.role)

const selectedPermissionsCount = computed(() => selectedPermissions.value.length)
const totalPermissionsCount = computed(() => permissions.value.length)

const isPermissionSelected = (permissionId: string | number) => selectedPermissions.value.includes(String(permissionId))

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

const allCategories = computed(() => {
  const cats = new Set<string>()
  permissions.value.forEach(p => {
    if (p.category) cats.add(p.category)
  })
  return Array.from(cats)
})

const filteredPermissions = computed(() => {
  let list = permissions.value

  if (selectedCategory.value !== 'ALL') {
    list = list.filter(p => p.category === selectedCategory.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p => {
      const name = (p.descripcion_es || p.descripcion_en || p.nombre || p.name || p.descripcion || p.description || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return name.includes(q) || cat.includes(q)
    })
  }

  return list
})

const permissionsByCategory = computed(() => {
  const groups: Record<string, Permission[]> = {}
  filteredPermissions.value.forEach((permission) => {
    if (!groups[permission.category]) groups[permission.category] = []
    groups[permission.category]!.push(permission)
  })
  return groups
})

const toggleCategorySelection = (categoryPerms: Permission[]) => {
  const categoryIds = categoryPerms.map(p => String(p.id))
  const allSelected = categoryIds.every(id => selectedPermissions.value.includes(id))

  if (allSelected) {
    selectedPermissions.value = selectedPermissions.value.filter(id => !categoryIds.includes(id))
  } else {
    const currentSet = new Set(selectedPermissions.value)
    categoryIds.forEach(id => currentSet.add(id))
    selectedPermissions.value = Array.from(currentSet)
  }
}

const isCategoryFullySelected = (categoryPerms: Permission[]) => {
  if (categoryPerms.length === 0) return false
  return categoryPerms.every(p => selectedPermissions.value.includes(String(p.id)))
}

const toggleSelectAll = () => {
  if (selectedPermissions.value.length === permissions.value.length) {
    selectedPermissions.value = []
  } else {
    selectedPermissions.value = permissions.value.map(p => String(p.id))
  }
}

const closeModal = () => {
  modalMessage.value = null
  searchQuery.value = ''
  selectedCategory.value = 'ALL'
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

    const data = await apiClient<{ done: boolean, data: any }>('/api/v1/role/ver_permisos/', {
      body: JSON.stringify(payload)
    })
    
    if (data.done && data.data) {
      const rawData = data.data
      
      if (Array.isArray(rawData)) {
        // Si el primer elemento es un string JSON como "[...]" o si es un array plano de IDs
        if (rawData.length === 1 && typeof rawData[0] === 'string' && rawData[0].trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(rawData[0])
            if (Array.isArray(parsed)) {
              selectedPermissions.value = parsed.map(String)
              return
            }
          } catch (e) {
            console.error('Error parsing nested JSON perms:', e)
          }
        }
        // Array de IDs directo ["PxpYRQba", "RzQ3WQdX"]
        selectedPermissions.value = rawData.map(String)
      } else if (typeof rawData === 'string') {
        let cleaned = rawData.trim()
        if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
          try {
            const parsed = JSON.parse(cleaned)
            if (Array.isArray(parsed)) {
              selectedPermissions.value = parsed.map(String)
              return
            }
          } catch (e) {
            cleaned = cleaned.slice(1, -1)
          }
        }
        selectedPermissions.value = cleaned.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
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
      permissions: selectedPermissions.value
    }

    const data = await apiClient<{ done: boolean, message?: string }>('/api/v1/role/asignar/', {
      body: JSON.stringify(payload)
    })

    if (data.done) {
      toast.add({
        severity: 'success',
        summary: t('roles.alertSuccessPermissionsTitle', 'Permisos Asignados'),
        detail: t('roles.alertSuccessPermissionsDetail', 'Los permisos han sido asignados exitosamente.'),
        life: 4000
      })
      emit('saved')
      return
    }

    showModalMessage(data.message || 'Error al asignar permisos', 'error')
  } catch (error: any) {
    console.error('Error al asignar permisos:', error)
    if (error instanceof ApiError || (error && typeof error === 'object' && ('code' in error || error.name === 'ApiError'))) {
      const code = error.code
      let msg = ''
      if (code === 400 || code === 500 || code === 422) {
        msg = error.message || getErrorMessage(code)
      } else {
        msg = getErrorMessage(code) || error.message
      }
      showModalMessage(msg, 'error')
    } else {
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
  searchQuery.value = ''
  selectedCategory.value = 'ALL'
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
    :title="t('roles.modalPermissionsTitle', 'Asignar Permisos')"
    :confirmText="t('roles.btnSavePermissions', 'GUARDAR PERMISOS')"
    :cancelText="t('common.cancel', 'Cancelar')"
    size="xl"
    @confirm="savePermissions"
    @close="closeModal"
    @update:isOpen="emit('update:isOpen', $event)"
    :isConfirmLoading="loadingPermissions"
  >
    <template #icon>
      <div class="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <HugeiconsIcon :icon="Shield02Icon" :size="18" />
      </div>
    </template>

    <div class="flex flex-col gap-4 relative max-h-[70vh] sm:h-[580px]">
      <!-- Overlay de Carga Central (Guardando) -->
      <Transition name="fade">
        <div v-if="loadingPermissions" class="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-white/80 dark:bg-[#15181E]/85 backdrop-blur-md rounded-2xl transition-all duration-300">
          <div class="relative">
            <div class="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-blue-500 animate-spin relative z-10" />
          </div>
          <div class="mt-4 flex flex-col items-center">
            <span class="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
              {{ t('roles.assigning', 'Guardando cambios...') }}
            </span>
            <div class="flex gap-1.5 mt-1">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Feedback Banner -->
      <Transition name="fade">
        <div v-if="modalMessage && !loadingPermissions" 
             class="flex items-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-300 shadow-sm border"
             :class="{
               'text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400': modalMessage.type === 'error',
               'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400': modalMessage.type === 'warning',
               'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400': modalMessage.type === 'success'
             }">
             <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="16" class="shrink-0" />
             <HugeiconsIcon v-else :icon="CheckmarkCircle01Icon" :size="16" class="shrink-0" />
             <span class="flex-1">{{ modalMessage.text }}</span>
        </div>
      </Transition>

      <!-- Header Card: Info de Rol y Contador -->
      <div v-if="internalRole" class="bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <HugeiconsIcon :icon="Shield02Icon" :size="20" />
          </div>
          <div>
            <p class="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
              {{ t('roles.selectedRole', 'Rol Seleccionado') }}
            </p>
            <h3 class="text-base font-extrabold text-slate-800 dark:text-white leading-none tracking-tight">
              {{ internalRole.nombre }}
            </h3>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-2.5">
          <!-- Marcar / Desmarcar Todos -->
          <button 
            type="button"
            @click="toggleSelectAll" 
            class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-500/40 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm active:scale-95"
          >
            <HugeiconsIcon :icon="TickDouble02Icon" :size="14" />
            <span>{{ selectedPermissions.length === permissions.length ? 'Desmarcar Todos' : 'Marcar Todos' }}</span>
          </button>

          <!-- Counter Badge -->
          <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-3 py-1.5 rounded-xl">
            <span class="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide">
              {{ selectedPermissionsCount }} / {{ totalPermissionsCount }} {{ t('roles.permissions', 'Permisos') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
        <!-- Input de Búsqueda -->
        <div class="relative flex-1">
          <HugeiconsIcon :icon="Search01Icon" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar permiso por nombre o acción..."
            class="w-full bg-slate-100/70 dark:bg-[#15181E] border border-slate-200/80 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-200"
          />
          <button 
            v-if="searchQuery" 
            @click="searchQuery = ''" 
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <HugeiconsIcon :icon="Cancel01Icon" :size="14" />
          </button>
        </div>

        <!-- Selector de Categoría (Dropdown estilizado sin scroll feo) -->
        <div v-if="allCategories.length > 0" class="sm:w-56 shrink-0 relative">
          <select
            v-model="selectedCategory"
            class="w-full appearance-none bg-slate-100/70 dark:bg-[#15181E] border border-slate-200/80 dark:border-white/10 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer transition-all duration-200"
          >
            <option value="ALL" class="bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200">
              Todas las categorías ({{ permissions.length }})
            </option>
            <option 
              v-for="cat in allCategories" 
              :key="cat" 
              :value="cat"
              class="bg-white dark:bg-[#1A1D24] text-slate-800 dark:text-slate-200"
            >
              {{ cat }}
            </option>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Lista de Categorías y Permisos -->
      <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
        <Transition name="fade" mode="out-in">
          <div v-if="loadingList" class="h-full min-h-[200px] flex items-center justify-center">
            <AppLoader :text="t('common.loading', 'Cargando permisos...')" />
          </div>

          <div v-else-if="filteredPermissions.length === 0" class="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
            <HugeiconsIcon :icon="Alert01Icon" :size="36" class="text-slate-300 dark:text-slate-600 mb-2" />
            <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {{ searchQuery ? 'No se encontraron permisos' : t('roles.noPermissions', 'Sin permisos disponibles') }}
            </p>
            <p v-if="searchQuery" class="text-xs text-slate-400 dark:text-slate-500 mt-1">Intenta buscar con otros términos</p>
          </div>

          <div v-else class="space-y-4 pb-2">
            <div
              v-for="(categoryPermissions, category) in permissionsByCategory"
              :key="category"
              class="space-y-3 bg-slate-50/60 dark:bg-[#15181E]/40 border border-slate-200/70 dark:border-white/5 rounded-2xl p-3.5"
            >
              <!-- Sub-header Categoría -->
              <div class="flex items-center justify-between gap-3 px-1">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {{ category }}
                  </h4>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                    {{ categoryPermissions.filter(p => isPermissionSelected(p.id)).length }} / {{ categoryPermissions.length }}
                  </span>
                </div>

                <button
                  type="button"
                  @click="toggleCategorySelection(categoryPermissions)"
                  class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {{ isCategoryFullySelected(categoryPermissions) ? 'Desmarcar sección' : 'Seleccionar sección' }}
                </button>
              </div>

              <!-- Grid de Permisos -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  v-for="permission in categoryPermissions"
                  :key="permission.id"
                  class="group cursor-pointer relative select-none"
                  :class="loadingPermissions ? 'pointer-events-none opacity-50' : ''"
                >
                  <input
                    v-model="selectedPermissions"
                    type="checkbox"
                    :value="permission.id"
                    :disabled="loadingPermissions"
                    class="sr-only"
                  >

                  <div
                    class="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200"
                    :class="isPermissionSelected(permission.id)
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500/40 dark:border-blue-500/40 shadow-sm'
                      : 'bg-white dark:bg-[#1A1D24] border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-50 dark:hover:bg-white/[0.02]'"
                  >
                    <!-- Checkbox Personalizado -->
                    <div
                      class="w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0"
                      :class="isPermissionSelected(permission.id) 
                        ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/30' 
                        : 'bg-transparent border-slate-300 dark:border-white/20 group-hover:border-slate-400 dark:group-hover:border-white/40'"
                    >
                      <HugeiconsIcon
                        :icon="CheckmarkSquare02Icon"
                        :size="12"
                        :stroke-width="3"
                        class="text-white transition-transform duration-200"
                        :class="isPermissionSelected(permission.id) ? 'scale-100' : 'scale-0'"
                      />
                    </div>

                    <!-- Icono Visual de Tipo de Permiso -->
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200"
                      :class="getPermissionMeta(permission.descripcion_es || permission.descripcion || permission.nombre || permission.name || permission.description).badgeClass"
                    >
                      <HugeiconsIcon
                        :icon="getPermissionMeta(permission.descripcion_es || permission.descripcion || permission.nombre || permission.name || permission.description).icon"
                        :size="16"
                      />
                    </div>

                    <!-- Nombre del Permiso -->
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-xs font-semibold leading-snug transition-colors duration-200"
                        :class="isPermissionSelected(permission.id) ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'"
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
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

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



