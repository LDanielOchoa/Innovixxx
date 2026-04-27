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
  ArrowRight01Icon,
  Delete01Icon,
  Edit02Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import { useRoute, useRouter } from 'vue-router'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppButton from '../../../components/ui/AppButton.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import AppFormInput from '../../../components/ui/AppFormInput.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import Column from 'primevue/column'

import { createGrupoApi, fetchGruposApi } from '../services/grupos.api'
import type { Grupo } from '../types/grupo'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const route = useRoute()
const router = useRouter()
const managedQueryKeys = ['q', 'sort', 'order', 'page', 'lang'] as const
const isSyncingFromRoute = ref(false)

const grupos = ref<Grupo[]>([])
const loading = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedLang = ref(typeof route.query.lang === 'string' ? route.query.lang : '')
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
  if (selectedLang.value) nextQuery.lang = selectedLang.value
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
const itemToDelete = ref<number | null>(null)

const confirmDelete = (id: number) => {
  itemToDelete.value = id
  isDeleteModalOpen.value = true
}

const deleteGrupo = async () => {
  if (!itemToDelete.value) return
  // Aquí iría la lógica de API para eliminar
  grupos.value = grupos.value.filter(g => g.id !== itemToDelete.value)
  isDeleteModalOpen.value = false
  itemToDelete.value = null
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
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
            @click="router.push('/grupos/nuevo')"
          >
            <span>{{ $t('grupos.btnNew') }}</span>
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <!-- Área de Búsqueda y Filtros Simplificada -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="$t('grupos.searchPlaceholder')"
        />
      </div>
      
      <div class="w-full md:w-auto min-w-[240px]">
        <AppSelect 
          v-model="selectedLang"
          :options="[{ label: 'Todos los Idiomas', value: '' }, ...langOptions]"
          :placeholder="$t('grupos.formLangPlaceholder')"
        />
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
        :empty-message="$t('grupos.noGroups', 'No se encontraron grupos')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="nombre" :header="$t('grupos.colGroup')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-4 group/avatar py-1">
              <div class="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#2A313A] dark:to-[#1A1D24] text-slate-700 dark:white border border-white dark:border-white/10 flex items-center justify-center transition-transform duration-300 group-hover/avatar:scale-110 shadow-sm">
                <HugeiconsIcon :icon="UserGroupIcon" :size="20" :stroke-width="1.8" />
              </div>
              <div class="flex flex-col">
                <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest truncate max-w-[120px]">{{ data.id }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="time_zone" :header="$t('grupos.colTimeZone')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-colors">
              <HugeiconsIcon :icon="Clock01Icon" :size="16" />
              <span class="text-[13px] font-medium tracking-tight truncate">{{ data.time_zone }}</span>
            </div>
          </template>
        </Column>

        <Column field="i18n" :header="$t('grupos.colLang')" sortable>
          <template #body="{ data }">
            <AppBadge variant="glass" class="group/lang">
              <div class="flex items-center gap-2">
                <img 
                  :src="data.i18n?.toLowerCase() === 'es' ? 'https://flagcdn.com/co.svg' : 'https://flagcdn.com/us.svg'" 
                  :alt="data.i18n"
                  class="w-4 h-3 object-cover rounded-[2px] shadow-sm group-hover/lang:scale-110 transition-transform duration-500"
                />
                <div class="w-[1px] h-3 bg-slate-200 dark:bg-white/10 mx-0.5"></div>
                <span class="text-slate-600 dark:text-slate-300 font-bold uppercase">
                  {{ data.i18n }}
                </span>
              </div>
            </AppBadge>
          </template>
        </Column>

        <Column field="created_at" :header="$t('grupos.colDate')" sortable>
          <template #body="{ data }">
            <div class="text-right py-2">
              <span class="text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{{ formatearFecha(data.created_at) }}</span>
            </div>
          </template>
        </Column>

        <Column :header="$t('grupos.colActions', 'Acciones')">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3 py-1">
              <button 
                @click="openCreateModal"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                @click="confirmDelete(data.id)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-red-500/5 border border-slate-200 dark:border-red-500/10 text-slate-400 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                title="Eliminar"
              >
                <HugeiconsIcon :icon="Delete01Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-[#3b82f6] transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/5">
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <!-- Pagination Footer -->
      <AppPagination 
        v-model:currentPage="currentPage"
        :totalRecords="filteredGrupos.length"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>
    <AppModal
      v-model:isOpen="isModalOpen"
      :title="$t('grupos.modalCreateTitle')"
      confirmText=""
      cancelText=""
      @confirm="saveGrupo"
      :show-footer="false"
      size="lg"
    >
        <template #icon>
          <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="text-[#3b82f6]" />
        </template>
        
        <form @submit.prevent="saveGrupo" class="space-y-6 relative py-2">
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

          <AppFormInput 
            v-model="formData.nombre"
            :label="$t('grupos.formName')"
            :placeholder="$t('grupos.formNamePlaceholder')"
            :icon="UserGroupIcon"
            required
          />

          <div class="space-y-4">
             <!-- Selector Zona Horaria (Custom Searchable) -->
             <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1.5">{{ $t('grupos.formTimeZone') }}</label>
                <div class="relative z-50">
                   <div 
                    @click="isTimezoneDropdownOpen = !isTimezoneDropdownOpen" 
                    class="w-full px-5 py-3.5 border border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-white cursor-pointer flex justify-between items-center transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/[0.05] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]"
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
                      <ul class="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
                        <li v-for="tz in filteredTimezones" :key="tz" @click="formData.time_zone = tz; isTimezoneDropdownOpen = false" class="px-4 py-2 text-[13px] font-bold rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-[#3b82f6] transition-all">
                          {{ tz }}
                        </li>
                      </ul>
                    </div>
                  </Transition>
                </div>
             </div>

             <AppSelect 
                v-model="formData.i18n"
                :label="$t('grupos.formLang')"
                :options="langOptions"
                :placeholder="$t('grupos.formLangPlaceholder')"
             />
          </div>

          <!-- Botones de Acción Premium -->
          <div class="flex items-center gap-4 pt-6 mt-4">
            <AppButton 
              type="button"
              variant="secondary" 
              class="flex-1"
              @click="isModalOpen = false"
            >
              {{ $t('grupos.btnCancel') }}
            </AppButton>
            <AppButton 
              type="submit"
              variant="primary" 
              class="flex-1 shadow-blue-500/20"
              :loading="isSubmitting"
            >
              {{ $t('grupos.btnSave') }}
            </AppButton>
          </div>
        </form>
      </AppModal>

    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="$t('common.confirmDeleteTitle')"
      :message="$t('common.confirmDeleteMsg')"
      @confirm="deleteGrupo"
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


