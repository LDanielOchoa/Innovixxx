<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Search01Icon, 
  UserGroupIcon, 
  Clock01Icon, 
  Delete01Icon,
  Edit02Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import { useRoute, useRouter } from 'vue-router'
import Column from 'primevue/column'

import GrupoCreateModal from '../components/GrupoCreateModal.vue'
import { fetchGruposApi } from '../services/grupos.api'
import type { Grupo } from '../types/grupo'
import { useI18n } from 'vue-i18n'

// UI Components
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const managedQueryKeys = ['q', 'sort', 'order', 'page', 'lang'] as const
const isSyncingFromRoute = ref(false)

const grupos = ref<Grupo[]>([])
const loading = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedLang = ref(typeof route.query.lang === 'string' ? route.query.lang : '')

const isCreateModalOpen = ref(false)
const selectedGrupoForEdit = ref<Grupo | null>(null)

// Paginación
const GRUPO_SORT_KEYS = ['nombre', 'time_zone', 'i18n', 'created_at'] as const
type GrupoSortKey = typeof GRUPO_SORT_KEYS[number]
const initialSortKey = typeof route.query.sort === 'string' && GRUPO_SORT_KEYS.includes(route.query.sort as GrupoSortKey)
  ? (route.query.sort as GrupoSortKey)
  : 'nombre'
const sortKey = ref<GrupoSortKey>(initialSortKey)
const sortOrder = ref<'asc' | 'desc'>(route.query.order === 'desc' ? 'desc' : 'asc')

const initialPage = typeof route.query.page === 'string' ? Number.parseInt(route.query.page, 10) : 1
const currentPage = ref(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1)
const itemsPerPage = 10

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}

  Object.entries(route.query).forEach(([key, value]) => {
    if (!managedQueryKeys.includes(key as typeof managedQueryKeys[number]) && typeof value === 'string') {
      nextQuery[key] = value
    }
  })

  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (selectedLang.value) nextQuery.lang = selectedLang.value
  if (sortKey.value !== 'nombre') nextQuery.sort = sortKey.value
  if (sortOrder.value !== 'asc') nextQuery.order = sortOrder.value
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)

  void router.replace({ query: nextQuery })
}

const langOptions = [
  { value: 'es', label: 'Español', flag: 'https://flagcdn.com/co.svg' },
  { value: 'en', label: 'English', flag: 'https://flagcdn.com/us.svg' }
]

const filteredGrupos = computed(() => {
  let result = grupos.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(g =>
      g.nombre.toLowerCase().includes(query) ||
      g.time_zone.toLowerCase().includes(query)
    )
  }

  if (selectedLang.value) {
    result = result.filter(g => g.i18n.split('-')[0] === selectedLang.value)
  }

  return result
})

const fetchGrupos = async () => {
  loading.value = true
  try {
    grupos.value = await fetchGruposApi()
  } catch (error) {
    console.error(error)
    grupos.value = []
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedGrupoForEdit.value = null
  isCreateModalOpen.value = true
}

const openEditModal = (grupo: Grupo) => {
  selectedGrupoForEdit.value = grupo
  isCreateModalOpen.value = true
}

watch(
  () => route.query,
  (query) => {
    isSyncingFromRoute.value = true

    const nextSearch = typeof query.q === 'string' ? query.q : ''
    const nextLang = typeof query.lang === 'string' ? query.lang : ''
    const nextSort = typeof query.sort === 'string' && GRUPO_SORT_KEYS.includes(query.sort as GrupoSortKey)
      ? (query.sort as GrupoSortKey)
      : 'nombre'
    const nextOrder: 'asc' | 'desc' = query.order === 'desc' ? 'desc' : 'asc'
    const parsedPage = typeof query.page === 'string' ? Number.parseInt(query.page, 10) : 1
    const nextPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

    if (searchQuery.value !== nextSearch) searchQuery.value = nextSearch
    if (selectedLang.value !== nextLang) selectedLang.value = nextLang
    if (sortKey.value !== nextSort) sortKey.value = nextSort
    if (sortOrder.value !== nextOrder) sortOrder.value = nextOrder
    if (currentPage.value !== nextPage) currentPage.value = nextPage

    isSyncingFromRoute.value = false
  },
  { immediate: true }
)

watch([searchQuery, selectedLang, sortKey, sortOrder, currentPage], () => {
  if (isSyncingFromRoute.value) return
  syncStateToUrl()
})

watch([searchQuery, selectedLang], () => {
  currentPage.value = 1
})

const formatearFecha = (fechaStr: string) => {
  if (!fechaStr) return ''
  const fecha = new Date(fechaStr)
  return fecha.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<string | null>(null)

const confirmDelete = (id: string) => {
  itemToDelete.value = id
  isDeleteModalOpen.value = true
}

const deleteGrupo = async () => {
  if (!itemToDelete.value) return
  grupos.value = grupos.value.filter(g => g.id !== itemToDelete.value)
  isDeleteModalOpen.value = false
  itemToDelete.value = null
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
  fetchGrupos()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const mostrarFallbackLogo = (logo: string | null | undefined) => {
  if (!logo) return true
  const lower = logo.toLowerCase()
  return lower.includes('default') || lower.includes('placeholder')
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('grupos.title')" 
      :count="filteredGrupos.length" 
      :icon="UserGroupIcon"
    />

    <!-- Toolbar: Buscador (izquierda) + Botón (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador y Filtro -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-80">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('grupos.searchPlaceholder', 'Buscar...')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Filtro de Idioma -->
        <div class="w-full sm:w-auto min-w-[240px]">
          <AppSelect 
            v-model="selectedLang"
            :options="[{ label: 'Todos los Idiomas', value: '' }, ...langOptions]"
            :placeholder="t('grupos.formLangPlaceholder')"
          />
        </div>
      </div>

      <!-- Derecha: Botón Nuevo Grupo -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button 
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10 border border-transparent"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('grupos.btnNew') }}</span>
        </button>
      </div>
    </div>

    <!-- Content Table -->
    <AppTableCard>
      <AppTable 
        :value="filteredGrupos" 
        :loading="loading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('grupos.noGroups', 'No se encontraron grupos')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="nombre" :header="t('grupos.colGroup')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-4 group/avatar py-1">
              <div 
                class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-transform duration-300 group-hover/avatar:scale-110 shadow-sm overflow-hidden"
                :class="mostrarFallbackLogo(data.logo) 
                  ? 'bg-blue-500/10 dark:bg-blue-500/20 text-[#3b82f6] border border-blue-100/50 dark:border-blue-500/20' 
                  : 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white border border-white dark:border-white/10'"
              >
                <img v-if="!mostrarFallbackLogo(data.logo)" :src="data.logo" class="w-full h-full object-cover" />
                <HugeiconsIcon v-else :icon="UserGroupIcon" :size="20" :stroke-width="1.8" />
              </div>
              <div class="flex flex-col">
                <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="time_zone" :header="t('grupos.colTimeZone')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors">
              <HugeiconsIcon :icon="Clock01Icon" :size="16" />
              <span class="text-[13px] font-medium tracking-tight truncate">{{ data.time_zone }}</span>
            </div>
          </template>
        </Column>

        <Column field="i18n" :header="t('grupos.colLang')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
                <img 
                  :src="data.i18n?.toLowerCase().startsWith('es') ? 'https://flagcdn.com/co.svg' : 'https://flagcdn.com/us.svg'" 
                  :alt="data.i18n"
                  class="w-4 h-3 object-cover rounded-[2px] shadow-sm group-hover/lang:scale-110 transition-transform duration-500"
                />
                <div class="w-[1px] h-3 bg-slate-200 dark:bg-white/10 mx-0.5"></div>
                <span class="text-slate-600 dark:text-slate-300 font-semibold uppercase">
                  {{ data.i18n?.split('-')[0] }}
                </span>
              </div>
          </template>
        </Column>

        <Column field="created_at" :header="t('grupos.colDate')" sortable>
          <template #body="{ data }">
            <div class="text-right py-2">
              <span class="text-[12px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{{ formatearFecha(data.created_at) }}</span>
            </div>
          </template>
        </Column>

        <Column :header="t('grupos.colActions', 'Acciones')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(String(data.id), $event)"
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
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              @click="openEditModal(grupos.find(g => String(g.id) === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              @click="confirmDelete(String(grupos.find(g => String(g.id) === openMenuId)!.id)); openMenuId = null"
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
          :total-records="filteredGrupos.length"
          :rows-per-page="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Modales -->
    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :message="$t('common.confirmDeleteMsg')"
      @confirm="deleteGrupo"
    />

    <!-- Modal de Creación / Edición -->
    <GrupoCreateModal
      v-model:is-open="isCreateModalOpen"
      :grupo="selectedGrupoForEdit"
      @saved="fetchGrupos"
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

.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #343B45; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }

.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }

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
