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
  Loading01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { useRoute, useRouter } from 'vue-router'

// PrimeVue Components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'


import BaseModal from '../../../components/common/BaseModal.vue'
import PermissionsAssignModal from '../../../components/roles/PermissionsAssignModal.vue'
import { createRoleApi, fetchRolesApi, updateRoleApi } from '../services/roles.api'
import type { Role } from '../types/role'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroup } from '../../../composables/useGroup'

// Shared Components
import AppButton from '../../../components/common/AppButton.vue'
import AppPageHeader from '../../../components/common/AppPageHeader.vue'
import AppSearch from '../../../components/common/AppSearch.vue'
import AppTableCard from '../../../components/common/AppTableCard.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const ROLE_SORT_KEYS: Array<keyof Role> = ['id_role', 'nombre', 'descripcion', 'is_admin']

const { selectedGroup } = useGroup()
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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRoles.value.length / itemsPerPage)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total)
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total)
  }
  return pages
})

const goToPage = (p: number | '...') => {
  if (typeof p !== 'number') return
  currentPage.value = p
}

const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }

watch([searchQuery, sortKey, sortOrder, currentPage], () => {
  const nextQuery: Record<string, string> = {}
  
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (sortKey.value !== 'nombre') nextQuery.sort = String(sortKey.value)
  if (sortOrder.value !== 'asc') nextQuery.order = sortOrder.value
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)

  void router.replace({ query: nextQuery })
})

const formData = ref({ nombre: '', descripcion: '' })
const currentEditId = ref<string | null>(null)

const filteredRoles = computed(() => {
  let result = roles.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r => r.nombre.toLowerCase().includes(query) || (r.descripcion && r.descripcion.toLowerCase().includes(query)))
  }
  result.sort((a, b) => {
    let aValue = a[sortKey.value] || ''
    let bValue = b[sortKey.value] || ''
    if (typeof aValue === 'string') aValue = aValue.toLowerCase()
    if (typeof bValue === 'string') bValue = bValue.toLowerCase()
    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  return result
})

const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredRoles.value.slice(start, start + itemsPerPage)
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
        descripcion: formData.value.descripcion,
        is_admin: false,
        lang: locale.value
      })
      if (data.done) {
        showModalMessage(t('roles.alertSuccessCreate'), 'success')
        await fetchRoles(selectedGroup.value.id)
      } else {
        showModalMessage(data.message || t('roles.alertErrorCreate'), 'error')
      }
    } else if (modalMode.value === 'editar' && currentEditId.value !== null) {
      const data = await updateRoleApi({
        id_grupo: selectedGroup.value.id,
        id_role: currentEditId.value,
        nombre: formData.value.nombre,
        descripcion: formData.value.descripcion,
        is_admin: false, // Opcionalmente podrías añadir un checkbox en el modal para esto
        lang: locale.value
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
          variant="primary" 
          :icon="PlusSignIcon" 
          @click="openCreateModal"
        >
          <span>{{ t('roles.btnNew') }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Toolbar de Filtros -->
    <AppSearch 
      v-model="searchQuery" 
      :placeholder="t('roles.searchPlaceholder')" 
    />

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <DataTable 
        :value="paginatedRoles" 
        :loading="loading"
        responsiveLayout="scroll"
        class="modern-table"
        dataKey="id_role"
        @sort="toggleSort($event.sortField)"
        :sortField="sortKey"
        :sortOrder="sortOrder === 'asc' ? 1 : -1"
        :pt="{
          root: { class: 'bg-transparent' },
          table: { class: 'w-full border-collapse' },
          thead: { class: 'bg-[#09090b]/50 dark:bg-[#09090b]/50 border-b border-white/5' },
          tbody: { class: 'divide-y divide-white/5' },
          bodyrow: { class: 'hover:bg-white/[0.02] transition-colors' }
        }"
      >
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
            <div class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border"
                 :class="data.is_admin ? 'bg-blue-500/5 text-[#3b82f6] border-[#3b82f6]/20' : 'bg-slate-500/5 text-slate-400 border-slate-500/10'">
              {{ data.is_admin ? $t('roles.typeAdmin') : $t('roles.typeStandard') }}
            </div>
          </template>
        </Column>

        <Column headerStyle="text-align: right" bodyStyle="text-align: right" :header="t('roles.colActions')">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-2">
              <button 
                @click="openPermissionsModal(data)" 
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#0F1115]/40 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all active:scale-90 shadow-sm"
                :title="t('roles.btnAssignPermissions')"
              >
                <HugeiconsIcon :icon="Shield02Icon" :size="16" :stroke-width="2" />
              </button>
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#0F1115]/40 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all active:scale-90 shadow-sm"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.2" />
              </button>
              <button 
                @click="confirmDelete(data.id_role)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-red-500/5 border border-slate-200 dark:border-red-500/10 text-slate-500 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 shadow-sm"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.2" />
              </button>
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="px-6 py-20 text-center">
            <div class="flex flex-col items-center justify-center">
              <div class="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 border border-slate-200 dark:border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
                <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
              </div>
              <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{{ t('roles.noRoles') }}</h3>
              <p class="text-sm text-slate-400 dark:text-slate-500 font-medium">{{ t('roles.trySearch') }}</p>
            </div>
          </div>
        </template>
      </DataTable>

      <!-- Paginador -->
      <div class="px-6 py-3.5 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
        <!-- Info -->
        <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredRoles.length) }}
          <span class="text-slate-300 dark:text-slate-600">de</span>
          {{ filteredRoles.length }}
        </p>

        <!-- Controles -->
        <div v-if="totalPages > 1" class="flex items-center gap-1">
          <!-- Prev -->
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="pagination-btn"
            aria-label="Página anterior"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>

          <!-- Pages -->
          <template v-for="p in visiblePages" :key="p === '...' ? `ellipsis-${Math.random()}` : p">
            <span v-if="p === '...'" class="pagination-ellipsis">…</span>
            <button
              v-else
              @click="goToPage(p)"
              :class="['pagination-btn', currentPage === p ? 'pagination-btn--active' : '']"
            >{{ p }}</button>
          </template>

          <!-- Next -->
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="pagination-btn"
            aria-label="Página siguiente"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </AppTableCard>

    <!-- Modales -->
    <BaseModal 
      v-model:is-open="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      confirmButtonClass="bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 border-red-500/20"
      @confirm="deleteRole"
    >
      <template #icon>
        <HugeiconsIcon :icon="Alert01Icon" :size="20" class="text-red-500" />
      </template>
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
        {{ $t('common.confirmDeleteMsg') }}
      </p>
    </BaseModal>

    <BaseModal
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
    </BaseModal>

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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.8s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.modern-table .p-datatable-header-cell {
  @apply px-6 py-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] border-none select-none !important;
}

.modern-table .p-datatable-column-title {
  @apply tracking-[0.15em] !important;
}

.pagination-btn {
  @apply inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-[13px] font-semibold
    text-slate-500 dark:text-slate-400
    hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white
    disabled:opacity-30 disabled:cursor-not-allowed
    transition-all duration-150 select-none;
}

.pagination-btn--active {
  @apply bg-[#3b82f6] text-white hover:bg-[#2563eb] dark:hover:bg-[#2563eb] hover:text-white dark:hover:text-white !important;
}

.pagination-ellipsis {
  @apply inline-flex items-center justify-center w-8 h-8 text-[13px] text-slate-400 dark:text-slate-600 select-none;
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


