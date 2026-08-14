<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Alert01Icon,
  Search01Icon,
  RefreshIcon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'
import { fetchAlertasListadoApi, solventarAlertaApi } from '../services/servicios.api'
import type { AlertaServicioGlobalItem } from '../services/servicios.api'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'

const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const alertasList = ref<AlertaServicioGlobalItem[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

// Fechas por defecto: 1 semana hacia adelante desde hoy
const today = new Date()
const nextWeek = new Date()
nextWeek.setDate(today.getDate() + 7)

const formatDateForPayload = (d: Date, isEnd: boolean = false): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const time = isEnd ? '23:59:59' : '00:00:01'
  return `${yyyy}-${mm}-${dd} ${time}`
}

const formatDateSimple = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const fechaRango = ref({
  start: formatDateSimple(today),
  end: formatDateSimple(nextWeek)
})

const currentPage = ref(1)
const itemsPerPage = 10
const solventandoToken = ref<string | null>(null)

const cargarAlertas = async () => {
  if (!selectedGroup.value?.id) {
    alertasList.value = []
    return
  }

  isLoading.value = true
  try {
    const startDateObj = fechaRango.value.start ? new Date(fechaRango.value.start + 'T00:00:01') : today
    const endDateObj = fechaRango.value.end ? new Date(fechaRango.value.end + 'T23:59:59') : nextWeek

    const res = await fetchAlertasListadoApi({
      id_grupo: selectedGroup.value.id,
      desde: formatDateForPayload(startDateObj, false),
      hasta: formatDateForPayload(endDateObj, true),
      id_servicio: ''
    })
    if (res.done && Array.isArray(res.data)) {
      alertasList.value = res.data
    } else {
      alertasList.value = []
    }
  } catch (error) {
    console.error('Error al cargar alertas de servicios:', error)
    alertasList.value = []
  } finally {
    isLoading.value = false
  }
}

const recargar = () => {
  cargarAlertas()
}

const handleSolventar = async (item: AlertaServicioGlobalItem) => {
  if (solventandoToken.value || item.solventada) return
  solventandoToken.value = item.token
  try {
    const res = await solventarAlertaApi(item.token)
    if (res.done) {
      item.solventada = true
      item.solventada_por = 'Usuario'
    }
  } catch (error) {
    console.error('Error al solventar alerta:', error)
  } finally {
    solventandoToken.value = null
  }
}

watch([selectedGroup, fechaRango], () => {
  currentPage.value = 1
  cargarAlertas()
}, { deep: true, immediate: true })

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return alertasList.value

  const query = searchQuery.value.toLowerCase().trim()
  return alertasList.value.filter((item) => {
    return (
      item.id_servicio?.toLowerCase().includes(query) ||
      item.hardware?.toLowerCase().includes(query) ||
      item.tipo_alerta?.toLowerCase().includes(query) ||
      item.solventada_por?.toLowerCase().includes(query) ||
      item.token?.toLowerCase().includes(query)
    )
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '---'
  return dateStr
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Header -->
    <PageHeader
      title="Alertas de Servicios"
      subtitle="Consulta y seguimiento de alertas generadas en servicios"
      :count="filteredItems.length"
      :icon="Alert01Icon"
    />

    <!-- Toolbar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-72">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Buscar por servicio, hardware, alerta..."
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Date Picker -->
        <div class="w-full sm:w-auto">
          <AppDateRangePicker
            v-model="fechaRango"
            placeholder="Rango de Fechas"
          />
        </div>

        <!-- Botón Recargar -->
        <button 
          @click="recargar"
          :disabled="isLoading"
          title="Recargar"
          class="p-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <HugeiconsIcon 
            :icon="RefreshIcon" 
            :size="16" 
            :class="{ 'animate-spin': isLoading }"
          />
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <AppTableCard>
      <AppTable
        :value="paginatedItems"
        :loading="isLoading"
        :rows="itemsPerPage"
        removableSort
        empty-message="No se encontraron alertas en el rango de fechas seleccionado"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna ID Servicio -->
        <Column field="id_servicio" header="ID Servicio" sortable headerStyle="width: 150px">
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="font-mono font-bold text-[11px]">
                {{ data.id_servicio }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Fecha y Hora -->
        <Column field="fecha_hora" header="Fecha / Hora" sortable headerStyle="width: 180px">
          <template #body="{ data }">
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-mono text-xs">
              <HugeiconsIcon :icon="Clock01Icon" :size="14" class="text-slate-400" />
              <span>{{ formatDate(data.fecha_hora) }}</span>
            </div>
          </template>
        </Column>

        <!-- Columna Hardware -->
        <Column field="hardware" header="Hardware" sortable>
          <template #body="{ data }">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {{ data.hardware || '---' }}
            </span>
          </template>
        </Column>

        <!-- Columna Tipo Alerta -->
        <Column field="tipo_alerta" header="Tipo Alerta" sortable>
          <template #body="{ data }">
            <span 
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
              :class="data.tipo_alerta === 'SOS' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'"
            >
              <HugeiconsIcon :icon="Alert01Icon" :size="13" />
              {{ data.tipo_alerta }}
            </span>
          </template>
        </Column>

        <!-- Columna Atendida -->
        <Column field="atendida" header="Atendida" sortable headerStyle="width: 120px">
          <template #body="{ data }">
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
              :class="data.atendida ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-100 dark:bg-white/5'"
            >
              <HugeiconsIcon :icon="data.atendida ? CheckmarkCircle01Icon : Cancel01Icon" :size="13" />
              {{ data.atendida ? 'Sí' : 'No' }}
            </span>
          </template>
        </Column>

        <!-- Columna Solventada / Estado -->
        <Column field="solventada" header="Solventada" sortable headerStyle="width: 180px">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                :class="data.solventada ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'"
              >
                {{ data.solventada ? 'Solventada' : 'Pendiente' }}
              </span>

              <button
                v-if="!data.solventada"
                @click="handleSolventar(data)"
                :disabled="solventandoToken === data.token"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {{ solventandoToken === data.token ? 'Solventando...' : 'Solventar' }}
              </button>
            </div>
          </template>
        </Column>

        <!-- Columna Solventada Por -->
        <Column field="solventada_por" header="Solventada por">
          <template #body="{ data }">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {{ data.solventada_por || '---' }}
            </span>
          </template>
        </Column>
      </AppTable>

      <!-- Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredItems.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
