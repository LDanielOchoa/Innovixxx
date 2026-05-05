<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon,
  Search01Icon,
  Download01Icon,
  Shield02Icon,
  Alert01Icon,
  Sorting05Icon,
  CheckmarkCircle01Icon,
  Loading01Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { useRoute, useRouter } from 'vue-router'

// PrimeVue Components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'


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
import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const ROLE_SORT_KEYS: Array<keyof Role> = ['id_role', 'nombre', 'descripcion', 'is_admin']

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

const initialSortKey = typeof route.query.sort === 'string' && ROLE_SORT_KEYS.includes(route.query.sort as keyof Role)
  ? (route.query.sort as keyof Role)
  : 'nombre'
const sortKey = ref<keyof Role>(initialSortKey)
const sortOrder = ref<'asc' | 'desc'>(route.query.order === 'desc' ? 'desc' : 'asc')

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

const toggleSort = (key: keyof Role) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
}


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
const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="t('roles.title')" 
      :subtitle="t('roles.subtitle')" 
      :count="filteredRoles.length"
    >
      <template #actions>
        <AppButton 
          variant="secondary" 
          :icon="Download01Icon" 
          @click="exportToExcel"
        >
          <span>Exportar</span>
        </AppButton>

        <AppButton 
          v-if="authStore.hasPermission(PERMISSIONS.ROLES_CREATE)"
          variant="primary" 
          :icon="PlusSignIcon" 
          @click="openCreateModal"
        >
          <span>{{ t('roles.btnNew') }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Área de Búsqueda y Filtros Simplificada -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="t('roles.searchPlaceholder', 'Buscar por nombre o descripción...')"
        />
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
              <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
            </div>
          </template>
        </Column>

        <Column field="descripcion" :header="t('roles.colDesc')">
          <template #body="{ data }">
            <p class="text-[13px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{{ data.descripcion }}</p>
          </template>
        </Column>

        <Column field="is_admin" :header="t('roles.colType')" sortable>
          <template #body="{ data }">
            <AppBadge 
              :variant="data.is_admin ? 'glass' : 'glass'"
              :class="data.is_admin ? '!text-[#3b82f6] !bg-[#3b82f6]/10 !border-[#3b82f6]/20' : '!text-slate-400 !bg-slate-500/5 !border-slate-500/10'"
            >
              <div class="flex items-center gap-2">
                <HugeiconsIcon :icon="Shield02Icon" :size="12" :stroke-width="2.5" />
                <span>{{ data.is_admin ? $t('roles.typeAdmin') : $t('roles.typeStandard') }}</span>
              </div>
            </AppBadge>
          </template>
        </Column>

        <Column :header="t('roles.colActions')" headerStyle="width: 14rem">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3 py-1">
              <button 
                v-if="authStore.hasPermission(PERMISSIONS.ROLES_ASSIGN)"
                @click="openPermissionsModal(data)" 
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                :title="t('roles.btnAssignPermissions')"
              >
                <HugeiconsIcon :icon="Shield02Icon" :size="16" :stroke-width="2" />
              </button>
              <button 
                v-if="authStore.hasPermission(PERMISSIONS.ROLES_EDIT)"
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                v-if="authStore.hasPermission(PERMISSIONS.ROLES_DELETE)"
                @click="confirmDelete(data.id_role)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 hover:border-red-500/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]"
                title="Eliminar"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)]">
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <!-- Paginación Premium -->
      <AppPagination 
        v-model:current-page="currentPage"
        :total-records="filteredRoles.length"
        :rows-per-page="itemsPerPage"
      />
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
    >
      <template #icon>
        <HugeiconsIcon :icon="Shield02Icon" :size="20" class="text-[#3b82f6]" />
      </template>
      <form @submit.prevent="saveRole" class="space-y-6 relative">
        <!-- Feedback Minimalista -->
        <Transition name="message-fade">
          <div v-if="modalMessage && !isSubmitting"
               class="flex items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 shadow-sm border mb-6"
               :class="{
                 'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
                 'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
                 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
               }">
               <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="20" />
               <HugeiconsIcon v-else :icon="CheckmarkCircle01Icon" :size="20" class="text-[#3b82f6]" />
               {{ modalMessage.text }}
          </div>
        </Transition>

        <div class="space-y-6">
          <div class="space-y-2">
            <label for="nombre" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('roles.formName') }}</label>
            <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]">
              <div class="pl-4 pr-2 text-slate-400 dark:text-slate-600 group-focus-within/input:text-[#3b82f6] transition-colors duration-300">
                <HugeiconsIcon :icon="Shield02Icon" :size="18" :stroke-width="1.8" />
              </div>
              <input
                id="nombre"
                type="text"
                v-model="formData.nombre"
                required
                :placeholder="$t('roles.formNamePlaceholder')"
                class="w-full bg-transparent border-none py-4 pr-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0 transition-all"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="descripcion" class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('roles.formDesc') }}</label>
            <div class="relative flex items-center group/input bg-slate-50/50 dark:bg-[#0A0C10] border border-slate-200/60 dark:border-white/5 rounded-[18px] overflow-hidden focus-within:border-[#3b82f6]/50 focus-within:ring-4 focus-within:ring-[#3b82f6]/5 transition-all duration-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]">
              <textarea
                id="descripcion"
                v-model="formData.descripcion"
                required
                rows="4"
                :placeholder="$t('roles.formDescPlaceholder')"
                class="w-full bg-transparent border-none p-4 text-sm font-extrabold text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-0 transition-all resize-none"
              ></textarea>
            </div>
          </div>
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


<style scoped>
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
</style>


