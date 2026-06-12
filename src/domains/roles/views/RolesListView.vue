<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Edit02Icon,
  Delete01Icon,
  Search01Icon,
  Shield01Icon,
  Alert01Icon,
  CheckmarkCircle01Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { useRoute } from 'vue-router'

// PrimeVue Components
import Column from 'primevue/column'


import PermissionsAssignModal from '../../../components/roles/PermissionsAssignModal.vue'
import { createRoleApi, fetchRolesApi, updateRoleApi } from '../services/roles.api'
import type { Role } from '../types/role'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { storeToRefs } from 'pinia'
import { PERMISSIONS } from '../../../utils/permissions'

// Shared Components (Premium UI)
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppInput from '../../../components/ui/AppInput.vue'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'
import StatusBadge from '../../../components/shared/StatusBadge.vue'
import IdCell from '../../../components/shared/IdCell.vue'

const { t } = useI18n()
const route = useRoute()

const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const roles = ref<Role[]>([])
const loading = ref(false)

const isPermissionsModalOpen = ref(false)
const currentRoleForPermissions = ref<Role | null>(null)

const isSubmitting = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const fetchRoles = async (id_grupo: string) => {
  loading.value = true
  try {
    if (id_grupo) {
      roles.value = await fetchRolesApi(id_grupo)
    } else {
      roles.value = []
    }
  } catch (error) {
    console.error('Error al obtener roles:', error)
    roles.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    await fetchRoles(newGroup.id)
  } else {
    roles.value = []
  }
}, { immediate: true })

const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const isModalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')

const initialPage = typeof route.query.page === 'string' ? Number.parseInt(route.query.page, 10) : 1
const currentPage = ref(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1)
const itemsPerPage = 10

const formData = ref({ nombre: '', descripcion: '' })
const currentEditId = ref<string | null>(null)

const filteredRoles = computed(() => {
  let result = roles.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r => r.nombre.toLowerCase().includes(query) || (r.descripcion && r.descripcion.toLowerCase().includes(query)))
  }
  return result
})

const exportToExcel = () => {
  const dataToExport = filteredRoles.value.map(r => ({
    'ID Role': r.id_role,
    'Nombre': r.nombre,
    'Descripción': r.descripcion,
    'Es Admin': r.is_admin ? 'Sí' : 'No'
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles')
  XLSX.writeFile(workbook, 'Listado_Roles.xlsx')
}

const openCreateModal = () => {
  modalMode.value = 'crear'
  modalMessage.value = null
  formData.value = { nombre: '', descripcion: '' }
  isModalOpen.value = true
}

const openEditModal = (role: Role) => {
  modalMode.value = 'editar'
  modalMessage.value = null
  currentEditId.value = role.id_role
  formData.value = { nombre: role.nombre, descripcion: role.descripcion || '' }
  isModalOpen.value = true
}

const openPermissionsModal = (role: Role) => {
  currentRoleForPermissions.value = role
  isPermissionsModalOpen.value = true
}

const onPermissionsModalToggle = (isOpen: boolean) => {
  isPermissionsModalOpen.value = isOpen
  if (!isOpen) currentRoleForPermissions.value = null
}

const handlePermissionsSaved = async () => {
  if (selectedGroup.value?.id) await fetchRoles(selectedGroup.value.id)
}

const saveRole = async () => {
  if (isSubmitting.value) return
  if (!selectedGroup.value?.id) {
    showModalMessage(t('roles.alertSelectGroup'), 'warning')
    return
  }
  
  isSubmitting.value = true
  modalMessage.value = null

  try {
    if (modalMode.value === 'crear') {
      const data = await createRoleApi({
        id_grupo: selectedGroup.value.id,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion
      })
      if (data.done) {
        showModalMessage(t('roles.alertSuccessCreate'), 'success')
        await fetchRoles(selectedGroup.value.id)
      } else {
        showModalMessage(data.message || t('roles.alertErrorCreate'), 'error')
      }
    } else if (modalMode.value === 'editar' && currentEditId.value !== null) {
      if (!authStore.hasPermission(PERMISSIONS.ROLES_EDIT)) {
        showModalMessage(t('roles.alertErrorUpdate') || 'No tienes permiso para editar roles', 'error')
        return
      }
      const data = await updateRoleApi({
        id_grupo: selectedGroup.value.id,
        id_role: currentEditId.value,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion
      })
      if (data.done) {
        showModalMessage(t('roles.alertSuccessUpdate'), 'success')
        await fetchRoles(selectedGroup.value.id)
      } else {
        showModalMessage(data.message || t('roles.alertErrorUpdate'), 'error')
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error saving role:', error)
      showModalMessage(
        modalMode.value === 'crear' ? t('roles.alertNetErrorCreate') : t('roles.alertNetErrorUpdate'),
        'error'
      )
    }
  } finally {
    isSubmitting.value = false
  }
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id: string) => {
  itemToDelete.value = id
  isDeleteModalOpen.value = true
}

const deleteRole = () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const id = itemToDelete.value
  roles.value = roles.value.filter(r => r.id_role !== id)
}

const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleDocumentClick = () => {
  closeMenu()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('roles.title')" 
      :count="filteredRoles.length" 
      :icon="Shield01Icon"
    />

    <!-- Toolbar: Buscador (izquierda) + Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-80">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('roles.searchPlaceholder', 'Buscar...')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Derecha: Botones juntos (Exportar Excel y Nuevo Rol) -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button 
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>

        <button 
          v-if="authStore.hasPermission(PERMISSIONS.ROLES_CREATE)"
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('roles.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <AppTable 
        :value="filteredRoles" 
        :loading="loading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('roles.noRoles', 'No se encontraron roles')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('roles.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

        <Column field="nombre" :header="t('roles.colRole')" sortable>
          <template #body="{ data }">
            <div class="flex flex-col py-1">
              <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
            </div>
          </template>
        </Column>

        <Column field="descripcion" :header="t('roles.colDesc')">
          <template #body="{ data }">
            <p class="text-[13px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{{ data.descripcion || '-' }}</p>
          </template>
        </Column>

        <Column field="is_admin" :header="t('roles.colType')" sortable>
          <template #body="{ data }">
            <StatusBadge 
              :variant="data.is_admin ? 'primary' : 'default'" 
              :label="data.is_admin ? $t('roles.typeAdmin') : $t('roles.typeStandard')"
              :icon="Shield01Icon"
            />
          </template>
        </Column>

        <Column :header="t('roles.colActions')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(String(data.id_role), $event)"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-52 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ROLES_ASSIGN)"
              @click="openPermissionsModal(roles.find(r => String(r.id_role) === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Shield01Icon" :size="16" class="text-blue-500 dark:text-[#5da6fc]" />
              <span>{{ t('roles.btnAssignPermissions') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ROLES_EDIT)"
              @click="openEditModal(roles.find(r => String(r.id_role) === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.ROLES_DELETE)"
              @click="confirmDelete(String(roles.find(r => String(r.id_role) === openMenuId)!.id_role)); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" />
              <span>{{ t('common.delete', 'Eliminar') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- Footer: Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination 
          v-model:current-page="currentPage"
          :total-records="filteredRoles.length"
          :rows-per-page="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Modales -->
    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :message="$t('common.confirmDeleteMsg')"
      @confirm="deleteRole"
    />

    <AppModal
      v-model:isOpen="isModalOpen"
      :title="modalMode==='crear' ? $t('roles.modalCreateTitle') : $t('roles.modalEditTitle')"
      :confirmText="modalMode==='crear' ? $t('roles.btnSave') : $t('roles.btnUpdate')"
      :cancelText="$t('roles.btnCancel')"
      @confirm="saveRole"
      size="lg"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-xl bg-blue-50/50 dark:bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20">
          <HugeiconsIcon :icon="Shield01Icon" :size="20" :stroke-width="2" />
        </div>
      </template>
      <form @submit.prevent="saveRole" class="space-y-6 relative">
        <!-- Feedback Minimalista -->
        <Transition name="message-fade">
          <div v-if="modalMessage && !isSubmitting"
               class="flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 border mb-6"
               :class="{
                 'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
                 'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
                 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
               }">
               <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
               <HugeiconsIcon v-else :icon="CheckmarkCircle01Icon" :size="18" class="text-[#3b82f6]" />
               {{ modalMessage.text }}
          </div>
        </Transition>

        <div class="space-y-5">
          <AppInput 
            v-model="formData.nombre" 
            :label="$t('roles.formName')" 
            :icon="Shield01Icon" 
            :placeholder="$t('roles.formNamePlaceholder')" 
            required 
          />
          <AppInput 
            v-model="formData.descripcion" 
            :label="$t('roles.formDesc')" 
            :icon="Shield01Icon" 
            type="textarea" 
            :placeholder="$t('roles.formDescPlaceholder')" 
            required 
          />
        </div>
      </form>
    </AppModal>

    <PermissionsAssignModal
      :isOpen="isPermissionsModalOpen"
      :groupId="selectedGroup?.id"
      :role="currentRoleForPermissions"
      @update:isOpen="onPermissionsModalToggle"
      @saved="handlePermissionsSaved"
    />
  </div>
</template>


<style>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

.dropdown-menu-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-menu-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-menu-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
