<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  FilterIcon,
  PlusSignIcon,
  Calendar01Icon,
  Route01Icon,
  Shield02Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
  Clock01Icon,
  Cancel01Icon,
  Loading03Icon,
  CpuIcon
} from '@hugeicons/core-free-icons'
import { fetchServiciosApi } from '../services/servicios.api'
import type { Servicio, ServicioListPayload } from '../types/servicio'
import { SERVICIO_ESTADOS } from '../types/servicio'
import { useI18n } from 'vue-i18n'
import { fetchRutasApi } from '../../rutas/services/rutas.api'
import type { Ruta } from '../../rutas/types/ruta'
import { fetchEscoltasApi } from '../../escoltas/services/escoltas.api'
import type { Escolta } from '../../escoltas/types/escolta'

import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import ServicioCreateModal from '../components/ServicioCreateModal.vue'
import ServicioAsignarRecursosModal from '../components/ServicioAsignarRecursosModal.vue'
import Column from 'primevue/column'


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

const estadoLabels: Record<number, string> = {
  0: t('servicios.stateAll') || 'Todos',
  1: t('servicios.statePreload') || 'Prercarga',
  2: t('servicios.stateWaiting') || 'En Espera',
  3: t('servicios.stateExecOk') || 'Ejecucion OK',
  4: t('servicios.stateExecFail') || 'Ejecucion Fail',
  5: t('servicios.stateFinished') || 'Finalizado'
}

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
  <div class="p-4 md:p-8 space-y-6 animate-fade-in">
    <!-- Header -->
    <AppPageHeader
      :title="t('servicios.title') || 'Servicios'"
      :subtitle="`${t('servicios.subtitle') || 'Monitoreo de servicios para'} ${selectedGroup?.nombre || ''}`"
      :count="filteredServicios.length"
    >
      <template #actions>
        <AppButton
          variant="secondary"
          :icon="FilterIcon"
          @click="filtrosAbiertos = !filtrosAbiertos"
        >
          <span>{{ filtrosAbiertos ? (t('servicios.btnClear') || 'Ocultar') : (t('servicios.btnApply') || 'Filtros') }}</span>
        </AppButton>

        <AppButton
          variant="primary"
          :icon="PlusSignIcon"
          @click="isCreateModalOpen = true"
        >
          <span>{{ t('servicios.btnNew') || 'Nuevo Servicio' }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Filtros Expandibles -->
    <Transition name="fade-slide">
      <div v-if="filtrosAbiertos" class="bg-white/60 dark:bg-[#12141A]/50 backdrop-blur-xl rounded-[20px] border border-slate-200/60 dark:border-white/5 p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none">
        <!-- Fila 1: Estado + Fechas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Estado -->
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterState') || 'Estado' }}
            </label>
            <select
              v-model="filtros.estado"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option :value="SERVICIO_ESTADOS.TODOS">{{ t('servicios.stateAll') || 'Todos' }}</option>
              <option :value="SERVICIO_ESTADOS.PRERCARGA">{{ t('servicios.statePreload') || 'Prercarga' }}</option>
              <option :value="SERVICIO_ESTADOS.EN_ESPERA">{{ t('servicios.stateWaiting') || 'En Espera' }}</option>
              <option :value="SERVICIO_ESTADOS.EJECUCION_OK">{{ t('servicios.stateExecOk') || 'Ejecucion OK' }}</option>
              <option :value="SERVICIO_ESTADOS.EJECUCION_FAIL">{{ t('servicios.stateExecFail') || 'Ejecucion Fail' }}</option>
              <option :value="SERVICIO_ESTADOS.FINALIZADO">{{ t('servicios.stateFinished') || 'Finalizado' }}</option>
            </select>
          </div>

          <!-- Fecha Inicio -->
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterDateFrom') || 'Fecha Inicio' }}
            </label>
            <input
              v-model="filtros.fecha_registro_inicial"
              type="date"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300"
            />
          </div>

          <!-- Fecha Fin -->
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterDateTo') || 'Fecha Fin' }}
            </label>
            <input
              v-model="filtros.fecha_registro_final"
              type="date"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300"
            />
          </div>

          <!-- Botones -->
          <div class="flex items-end gap-2">
            <button
              @click="aplicarFiltros"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white text-[11px] font-black tracking-widest uppercase shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.3)] border border-[#2563eb] active:translate-y-[4px] active:shadow-none transition-all duration-200"
            >
              <HugeiconsIcon :icon="CheckmarkCircle01Icon" :size="16" :stroke-width="2.5" />
              {{ t('servicios.btnApply') || 'Aplicar' }}
            </button>
            <button
              @click="limpiarFiltros"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#1A1D24] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/10 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 active:scale-95"
              :title="t('servicios.btnClear') || 'Limpiar'"
            >
              <HugeiconsIcon :icon="Cancel01Icon" :size="18" :stroke-width="2" />
            </button>
          </div>
        </div>

        <!-- Fila 2: Ruta + Escolta -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Ruta -->
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterRoute') || 'Ruta' }}
            </label>
            <select
              v-model="filtros.id_ruta"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="all">{{ t('servicios.stateAll') || 'Todas' }}</option>
              <option v-for="ruta in rutas" :key="ruta.id_ruta" :value="ruta.id_ruta">
                {{ ruta.nombre }}
              </option>
            </select>
          </div>

          <!-- Escolta -->
          <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              {{ t('servicios.filterEscort') || 'Escolta' }}
            </label>
            <select
              v-model="filtros.id_escolta"
              class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl py-3 px-4 text-[13px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#3b82f6]/40 dark:focus:border-[#5da6fc]/40 focus:ring-4 focus:ring-[#3b82f6]/5 transition-all duration-300 appearance-none cursor-pointer"
            >
              <option value="all">{{ t('servicios.stateAll') || 'Todos' }}</option>
              <option v-for="escolta in escoltas" :key="escolta.id_escolta" :value="escolta.id_escolta">
                {{ escolta.nombre }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Busqueda -->
    <div class="flex flex-col md:flex-row gap-4 items-center animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch
          v-model="searchQuery"
          :placeholder="t('servicios.searchPlaceholder') || 'Buscar por ID de servicio...'"
        />
      </div>
    </div>

    <!-- Tabla -->
    <AppTableCard>
      <AppTable
        :value="filteredServicios"
        :loading="isLoading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('servicios.noResults') || 'No se encontraron servicios.'"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('servicios.noResultsHint') || 'Intenta ajustar los filtros de busqueda.' }}</template>

        <!-- ID Servicio -->
        <Column field="id_servicio" :header="t('servicios.thId') || 'ID Servicio'" sortable>
          <template #body="{ data }">
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-wider bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/5">
              {{ data.id_servicio }}
            </span>
          </template>
        </Column>

        <!-- Fecha Inicio -->
        <Column field="fecha_inicio" :header="t('servicios.thDateStart') || 'Fecha Inicio'" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="Calendar01Icon" :size="14" class="text-slate-400 dark:text-slate-500 shrink-0" />
              <span class="text-[12px] text-slate-700 dark:text-slate-300 font-medium">
                {{ formatDate(data.fecha_inicio) }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Modo Fin -->
        <Column field="modo_fin" :header="t('servicios.thEndMode') || 'Modo Fin'" sortable>
          <template #body="{ data }">
            <span class="text-[12px] text-slate-600 dark:text-slate-300 font-medium">
              {{ data.modo_fin || '---' }}
            </span>
          </template>
        </Column>

        <!-- Alcance -->
        <Column field="alcance" :header="t('servicios.thScope') || 'Alcance'" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="data.alcance === 'ND'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'">
              {{ data.alcance || 'ND' }}
            </span>
          </template>
        </Column>

        <!-- Nivel Riesgo -->
        <Column field="nivel_riesgo" :header="t('servicios.thRiskLevel') || 'Nivel Riesgo'" sortable>
          <template #body="{ data }">
            <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border"
              :class="riesgoColors[data.nivel_riesgo?.toUpperCase()] || riesgoColors.ND">
              {{ data.nivel_riesgo || 'ND' }}
            </span>
          </template>
        </Column>

        <!-- Estado -->
        <Column field="estado" :header="t('servicios.thStatus') || 'Estado'" sortable>
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

        <!-- Acciones -->
        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3" v-if="data.estado === 'PRERCARGA'">
              <button
                @click="openAsignarModal(data)"
                class="px-3 py-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/10 hover:border-[#3b82f6]/30 transition-all duration-300 shadow-[0_3px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:shadow-[0_3px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.3)] active:translate-y-[3px] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] dark:active:shadow-[0_0px_0_#1D1D24,0_0px_0_rgba(0,0,0,0)] font-bold text-[11px]"
                title="Asignar Recursos"
              >
                <HugeiconsIcon :icon="CpuIcon" :size="13" :stroke-width="2.5" />
                <span>Asignar Recursos</span>
              </button>
            </div>
            <span v-else class="text-[11px] text-slate-400 dark:text-slate-600 font-medium select-none px-2">---</span>
          </template>
        </Column>
      </AppTable>

      <!-- Paginador -->
      <AppPagination
        :totalRecords="filteredServicios.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <!-- Modal de Creación de Servicio -->
    <ServicioCreateModal
      v-model:is-open="isCreateModalOpen"
      @created="fetchServicios"
    />

    <!-- Modal de Asignación de Recursos -->
    <ServicioAsignarRecursosModal
      v-model:is-open="isAsignarModalOpen"
      :servicio="selectedServicio"
      @assigned="fetchServicios"
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
