<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { IconPlus, IconSearch, IconUsersGroup, IconRefresh, IconClock, IconChevronDown, IconArrowsSort, IconSortAscending, IconSortDescending, IconLoader2, IconAlertCircle, IconCheck } from '@tabler/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import DataLayout from '../../../components/common/DataLayout.vue'
import BaseSearch from '../../../components/common/BaseSearch.vue'
import BasePagination from '../../../components/common/BasePagination.vue'
import BaseModal from '../../../components/common/BaseModal.vue'
import { createGrupoApi, fetchGruposApi } from '../services/grupos.api'
import type { Grupo } from '../types/grupo'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const route = useRoute()
const router = useRouter()
const managedQueryKeys = ['q', 'sort', 'order', 'page'] as const
const isSyncingFromRoute = ref(false)

const grupos = ref<Grupo[]>([])
const loading = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const isModalOpen = ref(false)
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

const isTimezoneDropdownOpen = ref(false)
const isLangDropdownOpen = ref(false)
const timezoneSearch = ref('')

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
  if (sortKey.value !== 'nombre') nextQuery.sort = sortKey.value
  if (sortOrder.value !== 'asc') nextQuery.order = sortOrder.value
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)

  void router.replace({ query: nextQuery })
}

const formData = ref({
  nombre: '',
  time_zone: '',
  i18n: ''
})

const zonasHorarias = (Intl as any).supportedValuesOf('timeZone') as string[]

const filteredTimezones = computed(() => {
  if (!timezoneSearch.value) return zonasHorarias
  const q = timezoneSearch.value.toLowerCase()
  return zonasHorarias.filter(tz => tz.toLowerCase().includes(q))
})

const selectTimezone = (tz: string) => {
  formData.value.time_zone = tz
  isTimezoneDropdownOpen.value = false
  timezoneSearch.value = ''
}

const langOptions = [
  { value: 'es', label: 'Español', flag: 'https://flagcdn.com/co.svg' },
  { value: 'en', label: 'English', flag: 'https://flagcdn.com/us.svg' }
]

const getFlag = (i18n: string) => {
  if (!i18n) return 'https://flagcdn.com/co.svg'
  const lang = i18n.toLowerCase().trim().split('-')[0]
  const found = langOptions.find(l => l.value === lang)
  return found ? found.flag : 'https://flagcdn.com/co.svg'
}

const filteredGrupos = computed(() => {
  let result = grupos.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(g =>
      g.nombre.toLowerCase().includes(query) ||
      g.time_zone.toLowerCase().includes(query) ||
      g.i18n.toLowerCase().includes(query)
    )
  }

  result = [...result].sort((a, b) => {
    let aValue: string = a[sortKey.value] || ''
    let bValue: string = b[sortKey.value] || ''

    if (sortKey.value === 'created_at') {
      const aDate = new Date(a.created_at).getTime()
      const bDate = new Date(b.created_at).getTime()
      if (aDate < bDate) return sortOrder.value === 'asc' ? -1 : 1
      if (aDate > bDate) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    }

    aValue = aValue.toLowerCase()
    bValue = bValue.toLowerCase()

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return result
})

const toggleSort = (key: GrupoSortKey) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
}

const paginatedGrupos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredGrupos.value.slice(start, start + itemsPerPage)
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
  timezoneSearch.value = ''
  isTimezoneDropdownOpen.value = false
  isLangDropdownOpen.value = false
  modalMessage.value = null
  formData.value = { nombre: '', time_zone: '', i18n: locale.value.split('-')[0] }
  isModalOpen.value = true
}

const saveGrupo = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  modalMessage.value = null
  
  try {
    const data = await createGrupoApi(formData.value)

    if (data.done) {
      showModalMessage(t('grupos.alertSuccessCreate'), 'success')
      await fetchGrupos()
    } else {
      showModalMessage(data.message || t('grupos.alertErrorCreate'), 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error in saveGrupo:', error)
      showModalMessage(t('grupos.alertNetError'), 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  fetchGrupos()
})

watch(
  () => route.query,
  (query) => {
    isSyncingFromRoute.value = true

    const nextSearch = typeof query.q === 'string' ? query.q : ''
    const nextSort = typeof query.sort === 'string' && GRUPO_SORT_KEYS.includes(query.sort as GrupoSortKey)
      ? (query.sort as GrupoSortKey)
      : 'nombre'
    const nextOrder: 'asc' | 'desc' = query.order === 'desc' ? 'desc' : 'asc'
    const parsedPage = typeof query.page === 'string' ? Number.parseInt(query.page, 10) : 1
    const nextPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

    if (searchQuery.value !== nextSearch) searchQuery.value = nextSearch
    if (sortKey.value !== nextSort) sortKey.value = nextSort
    if (sortOrder.value !== nextOrder) sortOrder.value = nextOrder
    if (currentPage.value !== nextPage) currentPage.value = nextPage

    isSyncingFromRoute.value = false
  },
  { immediate: true }
)

watch([searchQuery, sortKey, sortOrder, currentPage], () => {
  if (isSyncingFromRoute.value) return
  syncStateToUrl()
})

watch(searchQuery, () => {
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
</script>

<template>
  <DataLayout class="theme-sync" :title="$t('grupos.title')" :subtitle="$t('grupos.subtitle')">
    <template #actions>
      <button @click="fetchGrupos" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-white dark:bg-[#16191D] hover:bg-slate-100 dark:hover:bg-[#2A313A] text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-lg transition-all duration-200 border border-slate-200 dark:border-[#2A313A] shadow-sm text-sm font-medium focus:ring-2 focus:ring-slate-500 focus:outline-none" :disabled="loading">
        <IconRefresh :size="18" :class="{ 'animate-spin': loading }" />
        <span class="hidden sm:inline">{{ $t('grupos.btnRefresh') }}</span>
      </button>
      <button @click="openCreateModal" class="flex-1 sm:flex-none inline-flex justify-center items-center gap-2 bg-[#60a5fa] dark:bg-[#5da6fc] hover:bg-[#4b94ea] dark:hover:bg-[#4a97f2] text-white px-5 py-2.5 rounded-xl transition-all duration-300 border border-[#60a5fa]/50 dark:border-[#5da6fc]/30 shadow-lg shadow-blue-500/10 dark:shadow-none text-sm font-bold tracking-wide focus:ring-2 focus:ring-blue-500/20 focus:outline-none group">
        <IconPlus :size="18" class="group-hover:rotate-90 transition-transform duration-300" />
        <span>{{ $t('grupos.btnNew') }}</span>
      </button>
    </template>

    <template #search>
      <BaseSearch v-model="searchQuery" :placeholder="$t('grupos.searchPlaceholder')" />
    </template>

    <div class="grid w-full">
      <Transition name="fade-cross">
        <div v-if="loading" key="loading" class="space-y-4 w-full" style="grid-area: 1 / 1;">
          <div class="md:hidden flex flex-col divide-y divide-slate-200 dark:divide-[#2A313A] rounded-xl border border-slate-200 dark:border-[#2A313A] overflow-hidden">
            <div v-for="n in 4" :key="`mobile-skeleton-${n}`" class="p-4 bg-white dark:bg-[#1E2228]">
          <div class="animate-pulse space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="h-10 w-10 rounded-full bg-slate-200 dark:bg-[#2A313A]"></div>
                <div class="space-y-2 min-w-0 flex-1">
                  <div class="h-3.5 w-32 max-w-full rounded bg-slate-200 dark:bg-[#2A313A]"></div>
                  <div class="h-2.5 w-20 rounded bg-slate-300 dark:bg-[#252C34]"></div>
                </div>
              </div>
            </div>
            <div class="pl-[52px] space-y-2">
              <div class="h-3 w-40 max-w-full rounded bg-slate-200 dark:bg-[#2A313A]"></div>
              <div class="flex gap-2">
                <div class="h-5 w-14 rounded bg-slate-200 dark:bg-[#2A313A]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-[#2A313A]">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-[#2A313A]">
          <thead class="bg-slate-50 dark:bg-[#16191D]/50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('grupos.colGroup') }}</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('grupos.colTimeZone') }}</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('grupos.colLang') }}</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ $t('grupos.colDate') }}</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-[#1E2228] divide-y divide-slate-200 dark:divide-[#2A313A]">
            <tr v-for="n in itemsPerPage" :key="`desktop-skeleton-${n}`" class="animate-pulse">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-9 w-9 rounded-full bg-slate-200 dark:bg-[#2A313A] mr-3"></div>
                  <div class="space-y-2">
                    <div class="h-3.5 w-32 rounded bg-slate-200 dark:bg-[#2A313A]"></div>
                    <div class="h-2.5 w-20 rounded bg-slate-300 dark:bg-[#252C34]"></div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 w-28 rounded bg-slate-200 dark:bg-[#2A313A]"></div></td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="h-6 w-14 rounded-md bg-slate-200 dark:bg-[#2A313A]"></div></td>
              <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 w-36 rounded bg-slate-200 dark:bg-[#2A313A]"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      <div v-else key="content" class="w-full space-y-4" style="grid-area: 1 / 1;">
        <!-- Móvil -->
        <div class="md:hidden flex flex-col gap-2 p-2 rounded-xl border border-slate-200 dark:border-[#2A313A] bg-slate-50/60 dark:bg-[#15191F] shadow-sm">
          <div v-for="grupo in paginatedGrupos" :key="'m-'+grupo.id" class="p-3 rounded-xl bg-white dark:bg-[#1E2228] border border-slate-200/80 dark:border-[#2A313A] hover:border-[#60a5fa]/50 hover:bg-white dark:hover:bg-[#22272E] transition-all duration-200 flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 shrink-0 rounded-full bg-slate-100 dark:bg-[#2A313A] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center font-bold text-sm"><IconUsersGroup :size="18" class="text-slate-500 dark:text-slate-400" /></div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate tracking-tight">{{ grupo.nombre }}</span>
              <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">ID: {{ grupo.id }}</span>
            </div>
          </div>
          <div class="flex flex-col gap-1 pl-[52px]">
            <div class="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-300">
              <IconClock :size="16" class="text-slate-500" />
              <span class="truncate font-semibold">{{ grupo.time_zone }}</span>
            </div>
            <div class="flex items-center gap-2 mt-1.5">
              <span class="inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 uppercase tracking-wide shadow-sm">
                <img :src="getFlag(grupo.i18n)" class="w-4 h-auto rounded-[1px] shadow-sm object-cover" />
                {{ grupo.i18n }}
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ formatearFecha(grupo.created_at) }}</span>
            </div>
          </div>
        </div>
        <div v-if="filteredGrupos.length === 0" class="p-8 text-center flex flex-col items-center justify-center text-slate-500">
          <IconSearch :size="28" class="mb-2 text-slate-600" />
          <p class="text-sm font-medium text-slate-400">{{ $t('grupos.noGroups') }}</p>
        </div>
      </div>

      <!-- Desktop -->
      <div class="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-[#2A313A] bg-white dark:bg-[#1E2228] shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 dark:divide-[#2A313A]">
          <thead class="bg-gradient-to-r from-slate-50 to-slate-100/70 dark:from-[#16191D] dark:to-[#1b2027] backdrop-blur-sm">
            <tr>
            <th class="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <button class="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" @click="toggleSort('nombre')">
                <span>{{ $t('grupos.colGroup') }}</span>
                <IconSortAscending v-if="sortKey === 'nombre' && sortOrder === 'asc'" :size="14" />
                <IconSortDescending v-else-if="sortKey === 'nombre' && sortOrder === 'desc'" :size="14" />
                <IconArrowsSort v-else :size="14" />
              </button>
            </th>
            <th class="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <button class="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" @click="toggleSort('time_zone')">
                <span>{{ $t('grupos.colTimeZone') }}</span>
                <IconSortAscending v-if="sortKey === 'time_zone' && sortOrder === 'asc'" :size="14" />
                <IconSortDescending v-else-if="sortKey === 'time_zone' && sortOrder === 'desc'" :size="14" />
                <IconArrowsSort v-else :size="14" />
              </button>
            </th>
            <th class="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <button class="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" @click="toggleSort('i18n')">
                <span>{{ $t('grupos.colLang') }} (Bandera)</span>
                <IconSortAscending v-if="sortKey === 'i18n' && sortOrder === 'asc'" :size="14" />
                <IconSortDescending v-else-if="sortKey === 'i18n' && sortOrder === 'desc'" :size="14" />
                <IconArrowsSort v-else :size="14" />
              </button>
            </th>
            <th class="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <button class="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" @click="toggleSort('created_at')">
                <span>{{ $t('grupos.colDate') }}</span>
                <IconSortAscending v-if="sortKey === 'created_at' && sortOrder === 'asc'" :size="14" />
                <IconSortDescending v-else-if="sortKey === 'created_at' && sortOrder === 'desc'" :size="14" />
                <IconArrowsSort v-else :size="14" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-[#1E2228]">
          <tr v-for="grupo in paginatedGrupos" :key="grupo.id" class="group border-b border-slate-200/80 dark:border-[#2A313A] odd:bg-white even:bg-slate-50/40 dark:odd:bg-[#1E2228] dark:even:bg-[#1A1F26] hover:bg-[#eff6ff] dark:hover:bg-[#222a33] transition-colors duration-200">
            <td class="px-6 py-3.5 whitespace-nowrap">
              <div class="flex items-center">
                <div class="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#232a33] dark:to-[#2A313A] text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center mr-3"><IconUsersGroup :size="18" class="text-slate-500 dark:text-slate-300" /></div>
                <div>
                  <div class="text-sm font-semibold text-slate-700 dark:text-slate-100 tracking-tight">{{ grupo.nombre }}</div>
                  <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">ID: {{ grupo.id }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100/80 dark:bg-[#20262E] text-sm text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-[#2A313A]">
                <IconClock :size="16" class="text-slate-500" />
                <span class="font-semibold">{{ grupo.time_zone }}</span>
              </div>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <img :src="getFlag(grupo.i18n)" class="w-5 h-auto rounded-[2px] shadow-md border border-white/10" />
                <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 uppercase tracking-wider shadow-sm">{{ grupo.i18n }}</span>
              </div>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-[13px] text-slate-500 dark:text-slate-400 font-mono">
              {{ formatearFecha(grupo.created_at) }}
            </td>
          </tr>
          <tr v-if="filteredGrupos.length === 0" key="empty-state">
            <td colspan="4" class="px-6 py-16 text-center">
              <div class="flex flex-col items-center justify-center text-slate-500">
                <IconSearch :size="32" class="mb-3 text-slate-600" />
                <p class="text-sm font-medium text-slate-400">{{ $t('grupos.noGroups') }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      </div>
      </Transition>
    </div>

    <template #pagination>
      <BasePagination 
        :totalItems="filteredGrupos.length" 
        v-model:currentPage="currentPage" 
        :itemsPerPage="itemsPerPage" 
      />
    </template>

    <template #modals>
      <BaseModal
        v-model:isOpen="isModalOpen"
        :title="$t('grupos.modalCreateTitle')"
        :confirmText="$t('grupos.btnSave')"
        :cancelText="$t('grupos.btnCancel')"
        confirmButtonClass="bg-[#60a5fa] dark:bg-[#5da6fc] hover:bg-[#4b94ea] dark:hover:bg-[#4a97f2] border-[#60a5fa] dark:border-[#5da6fc] text-white font-bold px-6"
        @confirm="saveGrupo"
        :isConfirmLoading="isSubmitting"
      >
        <template #icon>
          <IconUsersGroup :size="20" class="text-slate-400" />
        </template>
        
        <form @submit.prevent="saveGrupo" class="space-y-4 relative">
          <!-- Overlay de Carga -->
          <Transition name="loader-fade">
            <div v-if="isSubmitting" class="absolute -inset-6 z-[100] flex items-center justify-center bg-white/80 dark:bg-[#0F1216]/95 backdrop-blur-xl rounded-2xl overflow-hidden pointer-events-auto">
              <div class="flex flex-col items-center gap-5 p-8 text-center">
                <div class="relative flex items-center justify-center">
                  <div class="w-16 h-16 border-[3px] border-[#5da6fc]/10 border-t-[#5da6fc] rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <IconLoader2 :size="24" class="text-[#5da6fc] animate-pulse" />
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-[11px] font-black text-[#5da6fc] tracking-[0.3em] uppercase animate-pulse">
                    Procesando
                  </p>
                  <p class="text-[9px] font-medium text-slate-400 dark:text-slate-500 tracking-wider">Por favor, espera...</p>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Feedback Minimalista -->
          <Transition name="message-fade">
            <div v-if="modalMessage && !isSubmitting" 
                 class="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold tracking-wide uppercase transition-all duration-300 mb-4"
                 :class="{
                   'text-red-400 bg-red-400/5': modalMessage.type === 'error',
                   'text-amber-400 bg-amber-400/5': modalMessage.type === 'warning',
                   'text-[#5da6fc] bg-[#5da6fc]/5': modalMessage.type === 'success'
                 }">
                 <IconAlertCircle v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :size="14" />
                 <IconCheck v-else :size="14" class="text-[#5da6fc]" />
                 {{ modalMessage.text }}
            </div>
          </Transition>

          <div>
            <label class="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{{ $t('grupos.formName') }}</label>
            <input type="text" v-model="formData.nombre" required :placeholder="$t('grupos.formNamePlaceholder')" class="block w-full px-4 py-2.5 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:border-[#60a5fa]/50 dark:focus:border-[#5da6fc]/50 transition-colors sm:text-sm">
          </div>
          <div class="relative">
            <label class="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{{ $t('grupos.formTimeZone') }}</label>
            
            <div v-if="isTimezoneDropdownOpen" class="fixed inset-0 z-40" @click="isTimezoneDropdownOpen = false"></div>

            <div class="relative z-50">
              <div 
                @click="isTimezoneDropdownOpen = !isTimezoneDropdownOpen" 
                class="w-full px-4 py-2.5 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 cursor-pointer flex justify-between items-center transition-colors hover:border-slate-400 dark:hover:border-slate-500 focus:ring-2 focus:ring-[#60a5fa]/20 dark:focus:ring-[#5da6fc]/20 focus:outline-none"
              >
                 <span :class="formData.time_zone ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'">{{ formData.time_zone || $t('grupos.formTimeZonePlaceholder') }}</span>
                 <IconChevronDown :size="16" class="text-slate-500 transition-transform duration-200" :class="{ 'rotate-180': isTimezoneDropdownOpen }" />
              </div>
              
              <Transition name="fade-slide">
                <div v-if="isTimezoneDropdownOpen" class="absolute left-0 right-0 mt-1 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-[#2A313A] rounded-lg shadow-2xl overflow-hidden z-50">
                  <div class="p-2 border-b border-slate-200 dark:border-[#2A313A] bg-slate-50 dark:bg-[#16191D]/80">
                    <div class="relative">
                      <IconSearch :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        v-model="timezoneSearch" 
                        :placeholder="$t('grupos.searchTimeZone')" 
                        class="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1E2228] border border-slate-200 dark:border-[#2A313A] rounded text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#60a5fa] dark:focus:border-[#5da6fc] transition-colors"
                        autocomplete="off"
                      >
                    </div>
                  </div>
                  
                  <ul class="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
                    <li 
                      v-for="tz in filteredTimezones" 
                      :key="tz" 
                      @click="selectTimezone(tz)" 
                      class="px-3 py-2 text-sm rounded cursor-pointer transition-colors"
                      :class="formData.time_zone === tz ? 'bg-[#60a5fa]/10 dark:bg-[#5da6fc]/10 text-[#2563eb] dark:text-[#5da6fc] font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A313A] hover:text-slate-800 dark:hover:text-white'"
                    >
                      {{ tz }}
                    </li>
                    <li v-if="filteredTimezones.length === 0" class="px-3 py-6 text-center text-sm text-slate-500">
                       <IconSearch :size="24" class="mx-auto mb-2 text-slate-600 opacity-50" />
                       {{ $t('grupos.noTimeZoneFound') }}
                    </li>
                  </ul>
                </div>
              </Transition>
            </div>
          </div>
          <div class="relative">
            <label class="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{{ $t('grupos.formLang') }}</label>
            
            <div class="relative">
              <button
                type="button"
                @click="isLangDropdownOpen = !isLangDropdownOpen"
                class="w-full flex items-center justify-between gap-3 px-4 py-3 border border-slate-200 dark:border-[#2A313A] rounded-xl shadow-sm bg-white dark:bg-[#16191D] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 dark:focus:border-slate-500 transition-all sm:text-sm"
              >
                <div class="flex items-center gap-3">
                  <div class="relative flex items-center justify-center">
                    <img
                      :src="getFlag(formData.i18n)"
                      :alt="formData.i18n"
                      class="w-6 h-auto rounded-[3px] shadow-sm filter contrast-110"
                    />
                  </div>
                  <span class="text-sm font-bold tracking-tight">{{ langOptions.find(l => l.value === formData.i18n.split('-')[0])?.label || 'Seleccionar Idioma' }}</span>
                </div>
                <IconChevronDown
                  :size="16"
                  class="text-slate-400 dark:text-slate-500 transition-transform duration-300"
                  :class="isLangDropdownOpen ? 'rotate-180 text-slate-600 dark:text-slate-300' : ''"
                />
              </button>

              <Transition name="fade-slide">
                <div
                  v-if="isLangDropdownOpen"
                  class="absolute z-50 w-full mt-2 rounded-xl border border-slate-200 dark:border-[#2A313A] bg-white dark:bg-[#1E2228] shadow-xl overflow-hidden"
                >
                  <div class="py-1">
                    <button
                      v-for="lang in langOptions"
                      :key="lang.value"
                      type="button"
                      @click="formData.i18n = lang.value; isLangDropdownOpen = false"
                      class="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 relative group/opt"
                      :class="formData.i18n === lang.value
                        ? 'bg-slate-500/8 dark:bg-slate-500/10 text-slate-700 dark:text-slate-200'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#252C34] hover:text-slate-900 dark:hover:text-white'"
                    >
                      <div class="absolute left-0 w-1 h-0 bg-slate-400 dark:bg-slate-500 rounded-r-full transition-all duration-300 group-hover/opt:h-1/2" :class="formData.i18n === lang.value ? 'h-3/4' : ''"></div>
                      <img
                        :src="lang.flag"
                        :alt="lang.label"
                        class="w-6 h-auto rounded-[2px] shadow-sm filter group-hover/opt:contrast-125 transition-all"
                        :class="formData.i18n === lang.value ? 'contrast-125' : 'opacity-60'"
                      />
                      <span class="text-sm font-bold tracking-tight">{{ lang.label }}</span>
                      <IconCheck
                        v-if="formData.i18n === lang.value"
                        :size="16"
                        class="ml-auto text-slate-500 dark:text-slate-400"
                        stroke-width="3"
                      />
                    </button>
                  </div>
                </div>
              </Transition>

              <div
                v-if="isLangDropdownOpen"
                class="fixed inset-0 z-40"
                @click="isLangDropdownOpen = false"
              ></div>
            </div>
          </div>
        </form>
      </BaseModal>
    </template>
  </DataLayout>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #343B45; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }

.fade-cross-enter-active,
.fade-cross-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-cross-enter-from,
.fade-cross-leave-to {
  opacity: 0;
}

/* Overlay de Carga */
.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

/* Mensajes de Feedback */
.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }

.theme-sync,
.theme-sync * {
  transition-property: background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 180ms;
  transition-timing-function: ease;
}

.theme-sync .animate-pulse,
.theme-sync .animate-pulse * {
  transition: none !important;
}
</style>


