<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Add01Icon, 
  Search01Icon, 
  UserGroupIcon, 
  Refresh01Icon, 
  Clock01Icon, 
  ArrowDown01Icon, 
  Sorting05Icon, 
  ArrowUp01Icon, 
  Tick01Icon, 
  Alert01Icon,
  Calendar03Icon,
  FilterIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'
import { useRoute, useRouter } from 'vue-router'
import AppSearch from '../../../components/common/AppSearch.vue'
import AppTableCard from '../../../components/common/AppTableCard.vue'
import AppPageHeader from '../../../components/common/AppPageHeader.vue'
import AppButton from '../../../components/common/AppButton.vue'
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

const totalPages = computed(() => Math.max(1, Math.ceil(filteredGrupos.value.length / itemsPerPage)))

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
  <div class="p-4 md:p-8 space-y-8 bg-[#F8FAFC] dark:bg-[#0A0C10] min-h-screen animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="$t('grupos.title')" 
      :subtitle="$t('grupos.subtitle')" 
      :count="filteredGrupos.length"
    >
      <template #actions>
        <div class="flex items-center gap-3">
          <AppButton 
            variant="secondary" 
            :icon="Refresh01Icon" 
            :loading="loading" 
            @click="fetchGrupos"
            class="!px-3"
          />
          <AppButton 
            variant="primary" 
            :icon="Add01Icon" 
            @click="openCreateModal"
          >
            <span>{{ $t('grupos.btnNew') }}</span>
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <!-- Search & Filters -->
    <AppSearch 
      v-model="searchQuery" 
      :placeholder="$t('grupos.searchPlaceholder')"
    >
      <template #extra>
        <button class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 text-[10px] font-black tracking-[0.1em] uppercase whitespace-nowrap hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95">
          <HugeiconsIcon :icon="FilterIcon" :size="14" />
          <span>Filtrar</span>
          <HugeiconsIcon :icon="ArrowDown01Icon" :size="14" />
        </button>
      </template>
    </AppSearch>

    <!-- Content Table -->
    <AppTableCard>
      <div class="overflow-x-auto scrollbar-hide">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-transparent border-b border-slate-200/60 dark:border-white/5">
              <th class="px-6 py-5">
                <button @click="toggleSort('nombre')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('grupos.colGroup') }}
                  <HugeiconsIcon :icon="sortKey === 'nombre' ? (sortOrder === 'asc' ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5">
                <button @click="toggleSort('time_zone')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('grupos.colTimeZone') }}
                  <HugeiconsIcon :icon="sortKey === 'time_zone' ? (sortOrder === 'asc' ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5">
                <button @click="toggleSort('i18n')" class="group flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('grupos.colLang') }}
                  <HugeiconsIcon :icon="sortKey === 'i18n' ? (sortOrder === 'asc' ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
              <th class="px-6 py-5 text-right">
                <button @click="toggleSort('created_at')" class="group inline-flex items-center gap-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors focus:outline-none">
                  {{ $t('grupos.colDate') }}
                  <HugeiconsIcon :icon="sortKey === 'created_at' ? (sortOrder === 'asc' ? ArrowUp01Icon : ArrowDown01Icon) : Sorting05Icon" :size="14" class="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100/50 dark:divide-white/5">
            <template v-if="loading">
              <tr v-for="n in 5" :key="`skeleton-${n}`" class="animate-pulse">
                <td class="px-6 py-5"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5"></div><div class="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded"></div></div></td>
                <td class="px-6 py-5"><div class="h-4 w-28 bg-slate-100 dark:bg-white/5 rounded"></div></td>
                <td class="px-6 py-5"><div class="h-8 w-24 bg-slate-100 dark:bg-white/5 rounded-xl"></div></td>
                <td class="px-6 py-5"><div class="h-4 w-32 ml-auto bg-slate-100 dark:bg-white/5 rounded"></div></td>
              </tr>
            </template>
            <template v-else-if="paginatedGrupos.length > 0">
              <tr 
                v-for="grupo in paginatedGrupos" 
                :key="grupo.id" 
                class="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all duration-200 group cursor-default"
              >
                <td class="px-6 py-5">
                  <div class="flex items-center gap-4 group/avatar">
                    <div class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:text-white border border-white dark:border-white/10 flex items-center justify-center transition-transform duration-300 group-hover/avatar:scale-110 shadow-sm">
                      <HugeiconsIcon :icon="UserGroupIcon" :size="20" :stroke-width="1.8" />
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ grupo.nombre }}</span>
                      <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest truncate">{{ grupo.id }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors">
                    <HugeiconsIcon :icon="Clock01Icon" :size="16" />
                    <span class="text-[13px] font-medium tracking-tight truncate">{{ grupo.time_zone }}</span>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="inline-flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 transition-all hover:border-[#3b82f6]/30 group/status shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                    <img :src="getFlag(grupo.i18n)" class="w-4 h-3 rounded-sm shadow-sm object-cover" />
                    <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] border-l border-slate-300/80 dark:border-white/10 pl-2.5">
                      {{ grupo.i18n }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-5 text-right whitespace-nowrap">
                  <div class="inline-flex flex-col items-end">
                    <span class="text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{{ formatearFecha(grupo.created_at) }}</span>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="4" class="px-6 py-20 text-center">
                <div class="flex flex-col items-center justify-center opacity-50">
                  <HugeiconsIcon :icon="Search01Icon" :size="48" class="text-slate-300 dark:text-slate-600 mb-4" />
                  <p class="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{{ $t('grupos.noGroups') }}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="filteredGrupos.length > 0" class="px-6 py-4 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-4 flex-wrap bg-white/30 dark:bg-black/20 backdrop-blur-md">
        <p class="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredGrupos.length) }}
          <span class="text-slate-300 dark:text-slate-600 px-1">de</span>
          {{ filteredGrupos.length }}
        </p>

        <div v-if="totalPages > 1" class="flex items-center gap-1">
          <button @click="currentPage > 1 && currentPage--" :disabled="currentPage === 1" class="pagination-btn">
            <HugeiconsIcon :icon="ArrowLeft01Icon" :size="16" stroke-width="2.5" />
          </button>
          <template v-for="p in visiblePages" :key="p">
            <span v-if="p === '...'" class="pagination-ellipsis">…</span>
            <button v-else @click="currentPage = p" :class="['pagination-btn', currentPage === p ? 'pagination-btn--active' : '']">{{ p }}</button>
          </template>
          <button @click="currentPage < totalPages && currentPage++" :disabled="currentPage === totalPages" class="pagination-btn">
            <HugeiconsIcon :icon="ArrowRight01Icon" :size="16" stroke-width="2.5" />
          </button>
        </div>
      </div>
    </AppTableCard>

      <BaseModal
        v-model:isOpen="isModalOpen"
        :title="$t('grupos.modalCreateTitle')"
        confirmText=""
        cancelText=""
        @confirm="saveGrupo"
        :isConfirmLoading="isSubmitting"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
            <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="text-[#3b82f6]" />
          </div>
        </template>
        
        <form @submit.prevent="saveGrupo" class="space-y-6 relative py-2">
          <!-- Overlay de Carga -->
          <Transition name="loader-fade">
            <div v-if="isSubmitting" class="absolute -inset-6 z-[100] flex items-center justify-center bg-white/80 dark:bg-[#0F1216]/95 backdrop-blur-xl rounded-2xl overflow-hidden pointer-events-auto">
              <div class="flex flex-col items-center gap-5 p-8 text-center">
                <div class="relative flex items-center justify-center">
                  <div class="w-16 h-16 border-[3px] border-[#3b82f6]/10 border-t-[#3b82f6] rounded-full animate-spin"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <HugeiconsIcon :icon="Refresh01Icon" :size="24" class="text-[#3b82f6] animate-pulse" />
                  </div>
                </div>
                <div class="space-y-1">
                  <p class="text-[11px] font-black text-[#3b82f6] tracking-[0.3em] uppercase animate-pulse">
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
                 class="flex items-center gap-2 py-2.5 px-3 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 mb-6 border border-current/10"
                 :class="{
                   'text-red-500 bg-red-500/5 border-red-500/10': modalMessage.type === 'error',
                   'text-amber-500 bg-amber-500/5 border-amber-500/10': modalMessage.type === 'warning',
                   'text-[#3b82f6] bg-[#3b82f6]/5 border-[#3b82f6]/10': modalMessage.type === 'success'
                 }">
                  <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="14" />
                  <HugeiconsIcon v-else :icon="Tick01Icon" :size="14" class="text-[#3b82f6]" />
                  {{ modalMessage.text }}
            </div>
          </Transition>

          <!-- Input Nombre -->
          <div class="space-y-2">
            <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('grupos.formName') }}</label>
            <div class="relative group/input">
              <input 
                type="text" 
                v-model="formData.nombre" 
                required 
                :placeholder="$t('grupos.formNamePlaceholder')" 
                class="block w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/5 dark:focus:ring-[#3b82f6]/5 focus:border-[#3b82f6]/40 dark:focus:border-[#3b82f6]/40 transition-all duration-300 font-bold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              >
            </div>
          </div>

          <!-- Selector Zona Horaria -->
          <div class="space-y-2">
            <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('grupos.formTimeZone') }}</label>
            
            <div v-if="isTimezoneDropdownOpen" class="fixed inset-0 z-40" @click="isTimezoneDropdownOpen = false"></div>

            <div class="relative z-50">
               <div 
                @click="isTimezoneDropdownOpen = !isTimezoneDropdownOpen" 
                class="w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white cursor-pointer flex justify-between items-center transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              >
                 <div class="flex items-center gap-3">
                   <HugeiconsIcon :icon="Clock01Icon" :size="16" class="text-slate-400 dark:text-slate-500" />
                   <span class="text-sm font-bold truncate" :class="formData.time_zone ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-600'">
                     {{ formData.time_zone || $t('grupos.formTimeZonePlaceholder') }}
                   </span>
                 </div>
                 <HugeiconsIcon :icon="ArrowDown01Icon" :size="16" class="text-slate-400 dark:text-slate-500 transition-transform duration-300" :class="{ 'rotate-180': isTimezoneDropdownOpen }" />
              </div>
              
              <Transition name="fade-slide">
                <div v-if="isTimezoneDropdownOpen" class="absolute left-0 right-0 mt-2 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl bg-opacity-95">
                  <div class="p-3 border-b border-slate-100 dark:border-white/5">
                    <div class="relative">
                      <HugeiconsIcon :icon="Search01Icon" :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        v-model="timezoneSearch" 
                        :placeholder="$t('grupos.searchTimeZone')" 
                        class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-[#3b82f6]/40 transition-colors"
                        autocomplete="off"
                        @click.stop
                      >
                    </div>
                  </div>
                  
                  <ul class="max-h-56 overflow-y-auto custom-scrollbar p-1.5">
                    <li 
                      v-for="tz in filteredTimezones" 
                      :key="tz" 
                      @click="selectTimezone(tz)" 
                      class="px-4 py-2.5 text-[13px] font-bold rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between group/opt"
                      :class="formData.time_zone === tz ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'"
                    >
                      <span>{{ tz }}</span>
                      <HugeiconsIcon v-if="formData.time_zone === tz" :icon="Tick01Icon" :size="14" />
                    </li>
                    <li v-if="filteredTimezones.length === 0" class="px-4 py-8 text-center">
                       <HugeiconsIcon :icon="Search01Icon" :size="24" class="mx-auto mb-3 text-slate-600 opacity-30" />
                       <p class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ $t('grupos.noTimeZoneFound') }}</p>
                    </li>
                  </ul>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Selector Idioma -->
          <div class="space-y-2">
            <label class="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{{ $t('grupos.formLang') }}</label>
            
            <div class="relative">
              <button
                type="button"
                @click="isLangDropdownOpen = !isLangDropdownOpen"
                class="w-full flex items-center justify-between gap-3 px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white cursor-pointer transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div class="flex items-center gap-4">
                  <div class="relative flex items-center justify-center">
                    <img
                      :src="getFlag(formData.i18n)"
                      :alt="formData.i18n"
                      class="w-6 h-4 rounded-sm shadow-sm filter contrast-125 object-cover"
                    />
                  </div>
                  <span class="text-sm font-bold tracking-tight">{{ langOptions.find(l => l.value === formData.i18n.split('-')[0])?.label || 'Seleccionar Idioma' }}</span>
                </div>
                <HugeiconsIcon
                  :icon="ArrowDown01Icon"
                  :size="16"
                  class="text-slate-400 dark:text-slate-500 transition-transform duration-300"
                  :class="isLangDropdownOpen ? 'rotate-180 text-slate-800 dark:text-white' : ''"
                />
              </button>

              <Transition name="fade-slide">
                <div
                  v-if="isLangDropdownOpen"
                  class="absolute z-50 w-full mt-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D24] shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-95"
                >
                  <div class="p-1.5">
                    <button
                      v-for="lang in langOptions"
                      :key="lang.value"
                      type="button"
                      @click="formData.i18n = lang.value; isLangDropdownOpen = false"
                      class="w-full flex items-center gap-4 px-4 py-3 text-left transition-all duration-200 relative group/opt rounded-xl"
                      :class="formData.i18n === lang.value
                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'"
                    >
                      <img
                        :src="lang.flag"
                        :alt="lang.label"
                        class="w-6 h-4 rounded-sm shadow-sm filter contrast-110 object-cover"
                        :class="formData.i18n === lang.value ? 'contrast-125' : 'opacity-60'"
                      />
                      <span class="text-[13px] font-bold tracking-tight">{{ lang.label }}</span>
                      <HugeiconsIcon
                        v-if="formData.i18n === lang.value"
                        :icon="Tick01Icon"
                        :size="16"
                        class="ml-auto text-[#3b82f6]"
                      />
                    </button>
                  </div>
                </div>
              </Transition>

              <div v-if="isLangDropdownOpen" class="fixed inset-0 z-40" @click="isLangDropdownOpen = false"></div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-white/5 mt-4">
            <AppButton 
              type="button"
              variant="secondary" 
              class="flex-1 !py-3.5 !rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300"
              @click="isModalOpen = false"
            >
              {{ $t('grupos.btnCancel') }}
            </AppButton>
            <AppButton 
              type="submit"
              variant="primary" 
              class="flex-1 !py-3.5 !rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-blue-500/20"
              :loading="isSubmitting"
            >
              {{ $t('grupos.btnSave') }}
            </AppButton>
          </div>
        </form>
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

.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #2A313A; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #343B45; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* Overlay de Carga */
.loader-fade-enter-active, .loader-fade-leave-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.loader-fade-enter-from, .loader-fade-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); filter: blur(10px); }

/* Mensajes de Feedback */
.message-fade-enter-active, .message-fade-leave-active { transition: all 0.45s cubic-bezier(0.23, 1, 0.32, 1); }
.message-fade-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); filter: blur(4px); }
.message-fade-leave-to { opacity: 0; transform: translateY(4px); filter: blur(2px); }
</style>


