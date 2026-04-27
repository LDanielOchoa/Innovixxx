<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Route01Icon,
  Settings02Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { fetchRutasApi, setRutaEstadoApi } from '../services/rutas.api'
import type { Ruta } from '../types/ruta'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppButton from '../../../components/ui/AppButton.vue'
import AppPageHeader from '../../../components/ui/AppPageHeader.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import Column from 'primevue/column'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const rutas = ref<Ruta[]>([])
const loading = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const { t } = useI18n()

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const sortKey = ref<keyof Ruta>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRutas.value.length / itemsPerPage)))

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

const fetchRutas = async () => {
  if (!selectedGroup.value?.id) {
    rutas.value = []
    return
  }
  loading.value = true
  try {
    rutas.value = await fetchRutasApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error al obtener rutas:', error)
    rutas.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRutas()
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    await fetchRutas()
  } else {
    rutas.value = []
  }
}, { immediate: true })

const filteredRutas = computed(() => {
  let result = [...rutas.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      (u.descripcion && u.descripcion.toLowerCase().includes(query)) ||
      u.id_ruta.toLowerCase().includes(query)
    )
  }
  return result
})

const exportToExcel = () => {
  const dataToExport = filteredRutas.value.map(u => ({
    'ID': u.id_ruta,
    'Nombre': u.nombre,
    'Descripción': u.descripcion,
    'Estado': u.estado
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rutas')
  XLSX.writeFile(workbook, 'Listado_Rutas.xlsx')
}

const openCreateModal = () => {
  router.push('/rutas/nueva')
}

const openEditModal = (ruta: Ruta) => {
  router.push(`/rutas/${ruta.id_ruta}/editar`)
}

const updatingEstadoId = ref<string | null>(null)
const isConfirmStatusModalOpen = ref(false)
const statusConfirmData = ref<{ ruta: Ruta | null, nuevoEstado: boolean }>({ ruta: null, nuevoEstado: false })

const toggleRutaEstado = (ruta: Ruta) => {
  if (!selectedGroup.value?.id || updatingEstadoId.value === ruta.id_ruta) return
  const nuevoEstado = ruta.estado !== 'Habilitada'
  statusConfirmData.value = { ruta, nuevoEstado }
  isConfirmStatusModalOpen.value = true
}

const processToggleEstado = async () => {
  const { ruta, nuevoEstado } = statusConfirmData.value
  if (!ruta || !selectedGroup.value?.id) return
  isConfirmStatusModalOpen.value = false
  updatingEstadoId.value = ruta.id_ruta
  try {
    const result = await setRutaEstadoApi(selectedGroup.value.id, ruta.id_ruta, nuevoEstado)
    if (result.done) {
      const index = rutas.value.findIndex(r => r.id_ruta === ruta.id_ruta)
      if (index !== -1) {
        rutas.value[index].estado = nuevoEstado ? 'Habilitada' : 'Deshabilitada'
      }
    }
  } finally {
    updatingEstadoId.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="$t('rutas.title')" 
      :subtitle="$t('rutas.subtitle')" 
      :count="filteredRutas.length"
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
          <span>{{ $t('rutas.btnNew') }}</span>
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="$t('rutas.searchPlaceholder')"
        />
      </div>
    </div>

    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <AppTable 
        :value="filteredRutas" 
        :loading="loading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="$t('rutas.noRoutes')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ $t('rutas.trySearch') }}</template>

        <Column field="nombre" :header="$t('rutas.colRoute')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-4 py-1">
              <div class="w-10 h-10 shrink-0 rounded-[14px] bg-white dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-white/5 flex items-center justify-center shadow-sm">
                <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="1.8" />
              </div>
              <div class="flex flex-col">
                <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">{{ data.nombre }}</span>
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest truncate">{{ data.id_ruta }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="descripcion" :header="$t('rutas.colDesc')" sortable>
          <template #body="{ data }">
            <p class="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-tight truncate max-w-[250px]" :title="data.descripcion">
              {{ data.descripcion || '—' }}
            </p>
          </template>
        </Column>

        <Column field="estado" :header="$t('rutas.colStatus')" sortable>
          <template #body="{ data }">
            <div class="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
              <span class="w-2 h-2 rounded-full shadow-sm" :class="data.estado === 'Habilitada' ? 'bg-green-500 shadow-green-500/20' : 'bg-slate-400 shadow-slate-400/20'"></span>
              <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] border-l border-slate-300/80 dark:border-white/10 pl-3">
                {{ data.estado === 'Habilitada' ? $t('rutas.statusEnabled') : $t('rutas.statusDisabled') }}
              </span>
            </div>
          </template>
        </Column>

        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3">
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                :title="$t('rutas.tooltipEdit')"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button
                @click="toggleRutaEstado(data)"
                :disabled="updatingEstadoId === data.id_ruta"
                class="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 border active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                :class="data.estado === 'Habilitada' ? 'bg-white dark:bg-red-500/5 border-slate-200 dark:border-red-500/10 text-slate-400 dark:text-red-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30' : 'bg-white dark:bg-green-500/5 border-slate-200 dark:border-green-500/10 text-slate-400 dark:text-green-400 hover:text-green-500 hover:bg-green-500/10 hover:border-green-500/30'"
                :title="data.estado === 'Habilitada' ? $t('rutas.tooltipDisable') : $t('rutas.tooltipEnable')"
              >
                <HugeiconsIcon :icon="Settings02Icon" :size="16" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <AppPagination 
        :totalRecords="filteredRutas.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <AppModal
      v-model:isOpen="isConfirmStatusModalOpen"
      :title="statusConfirmData.nuevoEstado ? $t('rutas.modalEnableTitle') : $t('rutas.modalDisableTitle')"
      :confirmText="statusConfirmData.nuevoEstado ? $t('rutas.btnEnable') : $t('rutas.btnDisable')"
      :confirmButtonClass="statusConfirmData.nuevoEstado ? 'bg-green-500' : 'bg-red-500'"
      :cancelText="$t('rutas.btnCancel')"
      @confirm="processToggleEstado"
    >
      <template #icon>
        <div :class="statusConfirmData.nuevoEstado ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border border-current opacity-30">
          <HugeiconsIcon :icon="Route01Icon" :size="24" />
        </div>
      </template>
      <div class="py-4 flex flex-col items-center text-center gap-6">
        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[280px]">
          {{ $t('rutas.confirmStatusChange', { action: statusConfirmData.nuevoEstado ? $t('rutas.actionEnable') : $t('rutas.actionDisable') }) }}
        </p>
        <div class="px-5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
          <span class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
            {{ statusConfirmData.ruta?.nombre }}
          </span>
        </div>
      </div>
    </AppModal>
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
