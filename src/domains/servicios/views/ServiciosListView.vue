<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  FilterIcon,
  Calendar01Icon,
  CpuIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  MoreHorizontalIcon
} from '@hugeicons/core-free-icons'
import { fetchServiciosApi } from '../services/servicios.api'
import type { Servicio, ServicioListPayload } from '../types/servicio'
import { SERVICIO_ESTADOS } from '../types/servicio'
import { useI18n } from 'vue-i18n'
import { fetchRutasApi } from '../../rutas/services/rutas.api'
import type { Ruta } from '../../rutas/types/ruta'
import { fetchEscoltasApi } from '../../escoltas/services/escoltas.api'
import type { Escolta } from '../../escoltas/types/escolta'

import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import ServicioCreateModal from '../components/ServicioCreateModal.vue'
import ServicioAsignarRecursosModal from '../components/ServicioAsignarRecursosModal.vue'
import Column from 'primevue/column'

// Shared Domain Components
import PageHeader from '../../../components/shared/PageHeader.vue'
import SearchToolbar from '../../../components/shared/SearchToolbar.vue'
import TableActions from '../../../components/shared/TableActions.vue'

const { t } = useI18n()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const servicios = ref<Servicio[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const isCreateModalOpen = ref(false)
const isAsignarModalOpen = ref(false)
const selectedServicio = ref<Servicio | null>(null)

const openAsignarModal = (servicio: Servicio) => {
  selectedServicio.value = servicio
  isAsignarModalOpen.value = true
}

const filtros = ref({
  estado: SERVICIO_ESTADOS.TODOS,
  fecha_registro_inicial: '',
  fecha_registro_final: '',
  id_ruta: 'all',
  id_escolta: 'all'
})

const rutas = ref<Ruta[]>([])
const escoltas = ref<Escolta[]>([])
const filtrosAbiertos = ref(false)

const estadoColors: Record<string, string> = {
  PRERCARGA: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  EN_ESPERA: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  EJECUCION_OK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  EJECUCION_FAIL: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  FINALIZADO: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
}

const riesgoColors: Record<string, string> = {
  ND: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10',
  BAJO: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  MEDIO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  ALTO: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
  CRITICO: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/30'
}

const fetchServicios = async () => {
  if (!selectedGroup.value?.id) {
    servicios.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const payload: ServicioListPayload = {
      id_grupo: selectedGroup.value.id,
      estado: filtros.value.estado,
      fecha_registro_inicial: filtros.value.fecha_registro_inicial || '2020-01-01',
      fecha_registro_final: filtros.value.fecha_registro_final || '2099-12-31',
      id_ruta: filtros.value.id_ruta,
      id_escolta: filtros.value.id_escolta
    }
    servicios.value = await fetchServiciosApi(payload)
  } catch (error) {
    console.error('Error fetching servicios:', error)
  } finally {
    isLoading.value = false
  }
}

const fetchFiltrosData = async () => {
  if (!selectedGroup.value?.id) return
  try {
    const [rutasData, escoltasData] = await Promise.all([
      fetchRutasApi(selectedGroup.value.id),
      fetchEscoltasApi(selectedGroup.value.id)
    ])
    rutas.value = rutasData
    escoltas.value = escoltasData
  } catch (error) {
    console.error('Error fetching filtros data:', error)
  }
}

const aplicarFiltros = () => {
  currentPage.value = 1
  fetchServicios()
}

const limpiarFiltros = () => {
  filtros.value = {
    estado: SERVICIO_ESTADOS.TODOS,
    fecha_registro_inicial: '',
    fecha_registro_final: '',
    id_ruta: 'all',
    id_escolta: 'all'
  }
  currentPage.value = 1
  fetchServicios()
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '---'
  const parts = dateStr.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] || ''
  const [year, month, day] = datePart.split('-')
  return `${day}/${month}/${year}${timePart ? ' ' + timePart.substring(0, 5) : ''}`
}

const filteredServicios = computed(() => {
  if (!searchQuery.value) return servicios.value
  const query = searchQuery.value.toLowerCase()
  return servicios.value.filter(s =>
    s.id_servicio?.toLowerCase().includes(query) ||
    s.estado?.toLowerCase().includes(query) ||
    s.modo_fin?.toLowerCase().includes(query)
  )
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    currentPage.value = 1
    await fetchFiltrosData()
    await fetchServicios()
  } else {
    servicios.value = []
  }
}, { immediate: true })

onMounted(() => {
  fetchFiltrosData()
})
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Page Header -->
    <PageHeader 
      :title="t('servicios.title')" 
      :count="filteredServicios.length" 
      :icon="Calendar01Icon"
    >
      <template #actions>
        <button 
          @click="filtrosAbiertos = !filtrosAbiertos"
          class="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold text-sm hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          <HugeiconsIcon :icon="FilterIcon" :size="16" />
          <span>{{ filtrosAbiertos ? t('servicios.btnClear', 'Ocultar') : t('servicios.btnApply', 'Filtros') }}</span>
        </button>
        <button 
          @click="isCreateModalOpen = true"
          class="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('servicios.btnNew') }}</span>
        </button>
        <button class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all">
          <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
        </button>
      </template>
    </PageHeader>

    <!-- Filtros Expandibles -->
    <Transition name="fade-slide">
      <div v-if="filtrosAbiertos" class="bg-white/60 dark:bg-[#12141A]/50 backdrop-blur-xl rounded-[20px] border border-slate-200/60 dark:border-white/5 p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterState', 'Estado') }}
            </label>
            <select
              v-model="filtros.estado"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option :value="SERVICIO_ESTADOS.TODOS">{{ t('servicios.stateAll', 'Todos') }}</option>
              <option :value="SERVICIO_ESTADOS.PRERCARGA">{{ t('servicios.statePreload', 'Prercarga') }}</option>
              <option :value="SERVICIO_ESTADOS.EN_ESPERA">{{ t('servicios.stateWaiting', 'En Espera') }}</option>
              <option :value="SERVICIO_ESTADOS.EJECUCION_OK">{{ t('servicios.stateExecOk', 'Ejecucion OK') }}</option>
              <option :value="SERVICIO_ESTADOS.EJECUCION_FAIL">{{ t('servicios.stateExecFail', 'Ejecucion Fail') }}</option>
              <option :value="SERVICIO_ESTADOS.FINALIZADO">{{ t('servicios.stateFinished', 'Finalizado') }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterDateFrom', 'Fecha Inicio') }}
            </label>
            <input
              v-model="filtros.fecha_registro_inicial"
              type="date"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300"
            />
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterDateTo', 'Fecha Fin') }}
            </label>
            <input
              v-model="filtros.fecha_registro_final"
              type="date"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300"
            />
          </div>

          <div class="flex items-end gap-2">
            <button
              @click="aplicarFiltros"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white text-[11px] font-black tracking-widest uppercase shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] border border-[#2563eb] active:translate-y-[4px] active:shadow-none transition-all duration-200"
            >
              <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="16" :stroke-width="2.5" />
              {{ t('servicios.btnApply', 'Aplicar') }}
            </button>
            <button
              @click="limpiarFiltros"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#1A1D24] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 active:scale-95"
              :title="t('servicios.btnClear', 'Limpiar')"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="18" :stroke-width="2" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterRoute', 'Ruta') }}
            </label>
            <select
              v-model="filtros.id_ruta"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="all">{{ t('servicios.stateAll', 'Todas') }}</option>
              <option v-for="ruta in rutas" :key="ruta.id_ruta" :value="ruta.id_ruta">
                {{ ruta.nombre }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterEscort', 'Escolta') }}
            </label>
            <select
              v-model="filtros.id_escolta"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="all">{{ t('servicios.stateAll', 'Todos') }}</option>
              <option v-for="escolta in escoltas" :key="escolta.id_escolta" :value="escolta.id_escolta">
                {{ escolta.nombre }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Search Toolbar -->
    <SearchToolbar v-model="searchQuery" :placeholder="t('servicios.searchPlaceholder')" searchWidth="sm:w-96" />

    <!-- Tabla -->
    <AppTableCard>
      <AppTable
        :value="filteredServicios"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('servicios.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <Column field="id_servicio" :header="t('servicios.thId', 'ID Servicio')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-wider bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/5">
              {{ data.id_servicio }}
            </span>
          </template>
        </Column>

        <Column field="fecha_inicio" :header="t('servicios.thDateStart', 'Fecha Inicio')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="Calendar01Icon" :size="14" class="text-slate-400 dark:text-slate-500 shrink-0" />
              <span class="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                {{ formatDate(data.fecha_inicio) }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="modo_fin" :header="t('servicios.thEndMode', 'Modo Fin')" sortable>
          <template #body="{ data }">
            <span class="text-[12px] text-slate-600 dark:text-slate-300 font-medium">
              {{ data.modo_fin || '---' }}
            </span>
          </template>
        </Column>

        <Column field="alcance" :header="t('servicios.thScope', 'Alcance')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="data.alcance === 'ND'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'">
              {{ data.alcance || 'ND' }}
            </span>
          </template>
        </Column>

        <Column field="nivel_riesgo" :header="t('servicios.thRiskLevel', 'Nivel Riesgo')" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="riesgoColors[data.nivel_riesgo?.toUpperCase()] || riesgoColors.ND">
              {{ data.nivel_riesgo || 'ND' }}
            </span>
          </template>
        </Column>

        <Column field="estado" :header="t('servicios.thStatus', 'Estado')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0"
                :class="{
                  'bg-blue-500': data.estado === 'PRERCARGA',
                  'bg-amber-500': data.estado === 'EN_ESPERA',
                  'bg-emerald-500': data.estado === 'EJECUCION_OK',
                  'bg-red-500': data.estado === 'EJECUCION_FAIL',
                  'bg-slate-400': data.estado === 'FINALIZADO'
                }"></span>
              <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
                :class="estadoColors[data.estado] || estadoColors.PRERCARGA">
                {{ data.estado || '---' }}
              </span>
            </div>
          </template>
        </Column>

        <Column :header="t('servicios.thActions', 'Acciones')" headerStyle="width: 12rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <TableActions
              :actions="[
                {
                  icon: CpuIcon,
                  tooltip: t('servicios.btnAssign', 'Asignar Recursos'),
                  variant: 'primary',
                  onClick: () => openAsignarModal(data),
                  show: data.estado === 'PRERCARGA'
                }
              ]"
              :show-more="true"
            />
          </template>
        </Column>
      </AppTable>

      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredServicios.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <ServicioCreateModal
      v-model:is-open="isCreateModalOpen"
      @created="fetchServicios"
    />

    <ServicioAsignarRecursosModal
      v-model:is-open="isAsignarModalOpen"
      :servicio="selectedServicio"
      @assigned="fetchServicios"
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

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.99);
}

select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 2.5rem;
}

:global(.dark) select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
}
</style>
