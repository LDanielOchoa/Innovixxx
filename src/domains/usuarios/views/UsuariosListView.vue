<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon,
  Alert01Icon,
  MoreHorizontalIcon,
  Mail01Icon,
  Shield01Icon,
  FilterIcon,
  ArrowDown01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'

// PrimeVue Components
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'


import BaseModal from '../../../components/common/BaseModal.vue'
import {
  deleteUsuarioApi,
  fetchGruposApi,
  listUsuariosByGrupoApi,
  mapUsuariosFromApi,
} from '../services/usuarios.api'
import type { Grupo, Usuario } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroup } from '../../../composables/useGroup'

// Shared Components
import AppButton from '../../../components/common/AppButton.vue'
import AppPageHeader from '../../../components/common/AppPageHeader.vue'
import AppSearch from '../../../components/common/AppSearch.vue'
import AppTableCard from '../../../components/common/AppTableCard.vue'

const route = useRoute()
const router = useRouter()
const { selectedGroup } = useGroup()

const usuarios = ref<Usuario[]>([])
const grupos = ref<Grupo[]>([])
const loading = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const { t, locale } = useI18n()
const listLang = computed(() => locale.value || 'es')

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const USER_SORT_KEYS: Array<keyof Usuario> = ['id', 'nombre', 'email', 'lang', 'pass', 'id_role', 'id_grupo', 'grupo_nombre', 'time_zone']
const isSyncingFromRoute = ref(false)

const sortKey = ref<keyof Usuario>('id')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsuarios.value.length / itemsPerPage)))

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
  syncStateToUrl()
}

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

const fetchUsuarios = async () => {
  if (!selectedGroup.value?.id) {
    usuarios.value = []
    return
  }

  loading.value = true
  try {
    const list = await listUsuariosByGrupoApi(selectedGroup.value.id, listLang.value)
    const grupoInfo = grupos.value.find(g => g.id === selectedGroup.value.id) || { id: selectedGroup.value.id, nombre: selectedGroup.value.nombre || selectedGroup.value.id }
    usuarios.value = mapUsuariosFromApi(list, grupoInfo as any, listLang.value)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    usuarios.value = []
  } finally {
    loading.value = false
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

onMounted(() => {
  fetchGrupos()
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    await fetchUsuarios()
  } else {
    usuarios.value = []
  }
}, { immediate: true })

const filteredUsuarios = computed(() => {
  let result = [...usuarios.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.lang.toLowerCase().includes(query) ||
      u.grupo_nombre.toLowerCase().includes(query)
    )
  }
  return result
})

const paginatedUsuarios = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredUsuarios.value.slice(start, start + itemsPerPage)
})

const exportToExcel = () => {
  const dataToExport = filteredUsuarios.value.map(u => ({
    'ID': u.id,
    'Nombre': u.nombre,
    'Correo Electrónico': u.email,
    'Idioma': u.lang.toUpperCase()
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios')
  XLSX.writeFile(workbook, 'Listado_Usuarios.xlsx')
}

const openCreateModal = () => {
  router.push('/usuarios/nuevo')
}

const openEditModal = (usuario: Usuario) => {
  router.push(`/usuarios/${usuario.id}/editar`)
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<Usuario | null>(null)

const confirmDelete = (usuario: Usuario) => {
  itemToDelete.value = usuario
  isDeleteModalOpen.value = true
}

const deleteUsuario = async () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const usuario = itemToDelete.value

  try {
    const { data } = await deleteUsuarioApi({
      id_grupo: usuario.id_grupo,
      id_usuario: String(usuario.id),
      lang: usuario.lang || 'es'
    })

    if (data.done) {
      await fetchUsuarios()
      showModalMessage('Usuario eliminado correctamente', 'success')
    } else {
      showModalMessage(data.message || t('users.alertErrorDelete'), 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error al eliminar usuario:', error)
      showModalMessage(t('users.alertNetErrorDelete'), 'error')
    }
  }
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
}

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; syncStateToUrl() } }
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; syncStateToUrl() } }

const getStatusType = (usuario: Usuario) => {
  return Number(usuario.id) % 3 === 0 ? 'inactive' : 'active'
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="t('users.title')" 
      :subtitle="t('users.subtitle')" 
      :count="filteredUsuarios.length"
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
          <span>{{ t('users.btnNew') }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Toolbar de Filtros -->
    <AppSearch 
      v-model="searchQuery" 
      :placeholder="t('users.searchPlaceholder')" 
    >
      <template #extra>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
          <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 text-[10px] font-black tracking-[0.1em] uppercase whitespace-nowrap hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95">
            <HugeiconsIcon :icon="FilterIcon" :size="14" />
            <span>Filtrar por Grupo</span>
            <HugeiconsIcon :icon="ArrowDown01Icon" :size="14" />
          </button>
        </div>
      </template>
    </AppSearch>

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <DataTable 
        :value="paginatedUsuarios" 
        :loading="loading"
        responsiveLayout="scroll"
        class="modern-table"
        :pt="{
          root: { class: 'bg-transparent' },
          table: { class: 'w-full border-collapse' },
          thead: { class: 'bg-slate-50/30 dark:bg-[#13161C]/30 border-b border-slate-200/60 dark:border-white/5' },
          tbody: { class: 'divide-y divide-slate-100/50 dark:divide-white/5' }
        }"
      >
        <Column field="nombre" header="Usuario" class="px-6 py-5">
          <template #body="{ data }">
            <div class="flex items-center gap-4 group/avatar">
              <div class="relative">
                <Avatar 
                  :label="data.nombre.charAt(0).toUpperCase()" 
                  shape="circle" 
                  class="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white font-black border border-white dark:border-white/10 shadow-sm transition-transform duration-300 group-hover/avatar:scale-110" 
                />
              </div>
              <div class="flex flex-col">
                <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="email" header="Email" class="px-6 py-5">
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors cursor-pointer group/mail">
              <HugeiconsIcon :icon="Mail01Icon" :size="14" class="opacity-20 group-hover/mail:opacity-100" />
              <span class="text-[13px] font-medium tracking-tight">{{ data.email }}</span>
            </div>
          </template>
        </Column>

        <Column field="lang" header="Idioma" class="px-6 py-5">
          <template #body="{ data }">
            <div class="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 dark:hover:border-[#3b82f6]/30 group/lang shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <img 
                :src="data.lang.toLowerCase() === 'es' ? 'https://flagcdn.com/co.svg' : 'https://flagcdn.com/us.svg'" 
                :alt="data.lang"
                class="w-4 h-3 object-cover rounded-[2px] shadow-sm grayscale-[0.5] group-hover/lang:grayscale-0 transition-all duration-500"
              />
              <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] border-l border-slate-300/80 dark:border-white/10 pl-3">
                {{ data.lang }}
              </span>
            </div>
          </template>
        </Column>

        <Column header="Acciones" class="px-6 py-5 text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-2">
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 transition-all active:scale-90 shadow-sm"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.2" />
              </button>
              <button 
                @click="confirmDelete(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-red-500/5 border border-slate-200 dark:border-red-500/10 text-slate-500 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90 shadow-sm"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.2" />
              </button>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white transition-all">
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="py-20 flex flex-col items-center justify-center text-center px-4">
            <div class="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 border border-slate-200 dark:border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
              <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 class="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">{{ t('users.noUsersFound') }}</h3>
            <p class="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-[300px]">{{ t('users.trySearch') }}</p>
          </div>
        </template>
      </DataTable>

      <!-- Paginador -->
      <div class="px-6 py-3.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-4 flex-wrap">
        <!-- Info -->
        <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredUsuarios.length) }}
          <span class="text-slate-300 dark:text-slate-600">de</span>
          {{ filteredUsuarios.length }}
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

    <!-- Modals -->
    <BaseModal 
      v-model:is-open="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      confirmButtonClass="bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 border-red-500/20"
      @confirm="deleteUsuario"
    >
      <template #icon>
        <HugeiconsIcon :icon="Alert01Icon" :size="20" class="text-red-500" />
      </template>
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
        {{ $t('common.confirmDeleteMsg') }}
      </p>
    </BaseModal>
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

.modern-table .p-datatable-loading-overlay {
  @apply bg-white/40 dark:bg-black/40 backdrop-blur-sm !important;
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
</style>


