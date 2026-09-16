<script setup lang="ts">
import * as XLSX from 'xlsx'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadModuleMessages } from '../../../i18n'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Clock01Icon,
  CommandLineIcon,
  Search01Icon,
  RefreshIcon,
  CpuIcon,
  User02Icon,
  InformationCircleIcon,
  Calendar01Icon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'
import { fetchHistorialComandosApi, fetchComandosApi } from '../services/comandos.api'
import { fetchFamiliasApi } from '../../hardware/services/hardware.api'
import { listUsuariosByGrupoApi } from '../../usuarios/services/usuarios.api'
import type { FamiliaHardware } from '../../hardware/types/hardware'
import type { HistorialComandoItem, Comando } from '../types/comando'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'

loadModuleMessages('comandos')

const { t } = useI18n()
const authStore = useAuthStore()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const historial = ref<HistorialComandoItem[]>([])
const loading = ref(false)
const searchQuery = ref('')

const familias = ref<FamiliaHardware[]>([])
const loadingFamilias = ref(false)
const selectedFamilia = ref<string>('0')

const usuarios = ref<any[]>([])
const loadingUsuarios = ref(false)
const selectedUsuario = ref<string>('')

const comandosDefinidos = ref<Comando[]>([])
const loadingComandosDefinidos = ref(false)

// Fechas por defecto: 1 mes atrás hasta hoy
const today = new Date()
const oneMonthAgo = new Date()
oneMonthAgo.setMonth(today.getMonth() - 1)

const formatDateSimple = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const fechaRango = ref({
  start: formatDateSimple(oneMonthAgo),
  end: formatDateSimple(today)
})

const currentPage = ref(1)
const itemsPerPage = 10

// Mini Popover de detalles en hover sobre ID
const popoverItem = ref<HistorialComandoItem | null>(null)
const popoverVisible = ref(false)
const popoverPosition = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
let popoverTimeout: ReturnType<typeof setTimeout> | null = null

const handleMouseEnterId = (item: HistorialComandoItem, event: MouseEvent) => {
  if (popoverTimeout) clearTimeout(popoverTimeout)
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
  const popoverWidth = 350
  const popoverHeight = 160
  const spaceBelow = window.innerHeight - rect.bottom
  const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight
  
  let left = rect.left - 10
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16
  }
  if (left < 16) left = 16

  popoverPosition.value = {
    top: showAbove ? `${rect.top - popoverHeight - 8}px` : `${rect.bottom + 8}px`,
    left: `${left}px`
  }
  popoverItem.value = item
  popoverVisible.value = true
}

const handleMouseLeaveId = () => {
  popoverTimeout = setTimeout(() => {
    popoverVisible.value = false
    popoverItem.value = null
  }, 180)
}

const handlePopoverMouseEnter = () => {
  if (popoverTimeout) clearTimeout(popoverTimeout)
}

const handlePopoverMouseLeave = () => {
  popoverVisible.value = false
  popoverItem.value = null
}

const cargarFamilias = async () => {
  loadingFamilias.value = true
  try {
    familias.value = await fetchFamiliasApi()
  } catch (error) {
    console.error('Error al cargar familias:', error)
  } finally {
    loadingFamilias.value = false
  }
}

const cargarUsuarios = async () => {
  if (!selectedGroup.value?.id) {
    usuarios.value = []
    return
  }
  loadingUsuarios.value = true
  try {
    const lang = authStore.userLang || 'es'
    const res = await listUsuariosByGrupoApi(selectedGroup.value.id, lang)
    usuarios.value = Array.isArray(res) ? res : []
  } catch (error) {
    console.error('Error al cargar usuarios:', error)
    usuarios.value = []
  } finally {
    loadingUsuarios.value = false
  }
}

const cargarComandosDefinidos = async () => {
  if (!selectedGroup.value?.id) return
  loadingComandosDefinidos.value = true
  try {
    comandosDefinidos.value = await fetchComandosApi({
      id_grupo: selectedGroup.value.id,
      id_familia: 0
    })
  } catch (error) {
    console.error('Error al cargar definiciones de comandos:', error)
  } finally {
    loadingComandosDefinidos.value = false
  }
}

const cargarHistorial = async () => {
  if (!selectedGroup.value?.id) {
    historial.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    historial.value = await fetchHistorialComandosApi({
      id_grupo: selectedGroup.value.id,
      desde: fechaRango.value.start || '2026-01-01',
      hasta: fechaRango.value.end || '2026-12-31',
      id_familia: Number(selectedFamilia.value) || 0,
      id_usuario: selectedUsuario.value || ''
    })
  } catch (error) {
    console.error('Error al cargar historial de comandos:', error)
    historial.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargarFamilias()
  cargarComandosDefinidos()
  cargarUsuarios()
})

onUnmounted(() => {
  if (popoverTimeout) clearTimeout(popoverTimeout)
})

watch(
  selectedGroup,
  async (newGroup) => {
    if (newGroup && newGroup.id) {
      currentPage.value = 1
      selectedFamilia.value = '0'
      selectedUsuario.value = ''
      await Promise.all([
        cargarComandosDefinidos(),
        cargarUsuarios()
      ])
      await cargarHistorial()
    } else {
      historial.value = []
      usuarios.value = []
    }
  },
  { immediate: true }
)

watch([selectedFamilia, selectedUsuario, fechaRango], () => {
  currentPage.value = 1
  cargarHistorial()
})

const opcionesFamilias = computed(() => {
  const list = [
    { value: '0', label: t('comandos.allFamilies') }
  ]
  familias.value.forEach((f) => {
    list.push({
      value: String(f.id_familia),
      label: f.nombre
    })
  })
  return list
})

const opcionesUsuarios = computed(() => {
  const list = [
    { value: '', label: t('comandos.allUsers') }
  ]
  const seen = new Set<string>()
  usuarios.value.forEach((u: any) => {
    const id = String(u.id_usuario ?? u.id ?? u.id_user ?? u.user_id ?? '').trim()
    const nombre = (u.nombre || u.name || u.email || `${t('comandos.userPrefix')} ${id}`).trim()
    if (id && !seen.has(id)) {
      seen.add(id)
      list.push({
        value: id,
        label: nombre
      })
    }
  })
  return list
})

const getFamiliaNombre = (idFamilia: number) => {
  const found = familias.value.find((f) => f.id_familia === idFamilia)
  return found ? found.nombre : `${t('comandos.familyPrefix')} ${idFamilia}`
}

const getComandoInfo = (idComando: string, nombreComando?: string) => {
  if (!idComando && !nombreComando) return null
  return comandosDefinidos.value.find(c => 
    (c.id_comando && c.id_comando === idComando) ||
    (c.mask && c.mask === idComando) ||
    (nombreComando && c.nombre && c.nombre.trim().toLowerCase() === nombreComando.trim().toLowerCase())
  ) || null
}

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return historial.value

  const query = searchQuery.value.toLowerCase().trim()
  return historial.value.filter((item) => {
    return (
      item.comando_nombre?.toLowerCase().includes(query) ||
      item.hardware_nombre?.toLowerCase().includes(query) ||
      item.ejecutado_por?.toLowerCase().includes(query) ||
      item.id_comando?.toLowerCase().includes(query) ||
      item.id_hardware?.toLowerCase().includes(query) ||
      item.fecha_hora?.toLowerCase().includes(query)
    )
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const exportToExcel = () => {
  const dataToExport = filteredItems.value.map(item => ({
    [t('comandos.thCommand')]: item.comando_nombre || '',
    [t('comandos.commandIdLabel')]: item.id_comando || '',
    [t('comandos.thDevice')]: item.hardware_nombre || '',
    [t('comandos.hardwareIdLabel')]: item.id_hardware || '',
    [t('comandos.thDateTime')]: item.fecha_hora || '',
    [t('comandos.thExecutedBy')]: item.ejecutado_por || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, t('comandos.historyTitle'))
  XLSX.writeFile(workbook, `historial_comandos_${new Date().toISOString().split('T')[0]}.xlsx`)
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in">
    <!-- Header -->
    <PageHeader
      :title="t('comandos.historyTitle')"
      :subtitle="t('comandos.historySubtitle')"
      :count="filteredItems.length"
      :icon="Clock01Icon"
    />

    <!-- Toolbar: Buscador y Filtros (izquierda) + Botón Exportar (derecha) -->
    <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
      <div class="flex flex-wrap items-center gap-3 w-full xl:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-72">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('comandos.searchHistoryPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Botón Recargar -->
        <button 
          @click.stop="cargarHistorial"
          :disabled="loading"
          :title="t('common.reload')"
          class="p-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          <HugeiconsIcon 
            :icon="RefreshIcon" 
            :size="16" 
            :class="{ 'animate-spin': loading }"
          />
        </button>

        <!-- Selector de Rango de Fechas -->
        <div class="w-full sm:w-64" @click.stop>
          <AppDateRangePicker
            v-model="fechaRango"
            :placeholder="t('comandos.dateRangePlaceholder')"
          />
        </div>

        <!-- Desplegable de Familias -->
        <div class="w-full sm:w-52" @click.stop>
          <AppSelect
            v-model="selectedFamilia"
            :placeholder="t('comandos.filterFamilyPlaceholder')"
            :options="opcionesFamilias"
            :icon="CpuIcon"
            :disabled="loadingFamilias"
          />
        </div>

        <!-- Desplegable de Usuarios -->
        <div class="w-full sm:w-52" @click.stop>
          <AppSelect
            v-model="selectedUsuario"
            :placeholder="t('comandos.allUsers')"
            :options="opcionesUsuarios"
            :icon="User02Icon"
            :disabled="loadingUsuarios"
          />
        </div>
      </div>

      <!-- Botón Exportar -->
      <div class="flex items-center gap-3 w-full xl:w-auto justify-start xl:justify-end">
        <button
          @click.stop="exportToExcel"
          :disabled="filteredItems.length === 0"
          :title="t('common.btnExport')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>{{ t('common.btnExport') }}</span>
        </button>
      </div>
    </div>

    <!-- Tarjeta de Tabla -->
    <AppTableCard>
      <AppTable
        :value="paginatedItems"
        :loading="loading"
        :rows="itemsPerPage"
        removableSort
        :empty-message="t('comandos.noHistoryResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Clock01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna: Comando -->
        <Column field="comando_nombre" :header="t('comandos.thCommand')" sortable style="min-width: 240px;">
          <template #body="{ data }">
            <div 
              class="inline-flex items-center gap-3 py-1 cursor-pointer group/cmd select-none"
              @mouseenter="handleMouseEnterId(data, $event)"
              @mouseleave="handleMouseLeaveId"
            >
              <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0 transition-transform group-hover/cmd:scale-105">
                <HugeiconsIcon :icon="CommandLineIcon" :size="16" />
              </div>
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[13px] font-bold text-slate-800 dark:text-white truncate group-hover/cmd:text-[#3b82f6] dark:group-hover/cmd:text-[#5da6fc] transition-colors">
                  {{ data.comando_nombre || t('comandos.noName') }}
                </span>
                <HugeiconsIcon :icon="InformationCircleIcon" :size="14" class="text-slate-400 dark:text-slate-500 opacity-50 group-hover/cmd:opacity-100 group-hover/cmd:text-[#3b82f6] dark:group-hover/cmd:text-[#5da6fc] transition-all shrink-0" />
              </div>
            </div>
          </template>
        </Column>

        <!-- Columna: Dispositivo -->
        <Column field="hardware_nombre" :header="t('comandos.thDevice')" sortable style="min-width: 200px;">
          <template #body="{ data }">
            <div class="flex items-center gap-2.5 py-1">
              <div class="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                <HugeiconsIcon :icon="CpuIcon" :size="18" />
              </div>
              <span class="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {{ data.hardware_nombre || '---' }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna: Fecha y Hora -->
        <Column field="fecha_hora" :header="t('comandos.thDateTime')" sortable style="min-width: 180px;">
          <template #body="{ data }">
            <div class="flex items-center gap-2 py-1 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <HugeiconsIcon :icon="Calendar01Icon" :size="15" class="text-slate-400 shrink-0" />
              <span class="tabular-nums font-mono text-[11px]">{{ data.fecha_hora }}</span>
            </div>
          </template>
        </Column>

        <!-- Columna: Ejecutado Por -->
        <Column field="ejecutado_por" :header="t('comandos.thExecutedBy')" sortable style="min-width: 180px;">
          <template #body="{ data }">
            <div class="flex items-center gap-2 py-1">
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                <HugeiconsIcon :icon="User02Icon" :size="15" />
              </div>
              <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {{ data.ejecutado_por || 'Sistema' }}
              </span>
            </div>
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

    <!-- Mini Modal / Desplegable Flotante de Detalles en Hover -->
    <Teleport to="body">
      <Transition name="popover-fade">
        <div
          v-if="popoverVisible && popoverItem"
          class="fixed z-[9999] w-[320px] sm:w-[350px] bg-white/95 dark:bg-[#161920]/95 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-slate-200/80 dark:border-white/10 pointer-events-auto transition-all"
          :style="{
            top: popoverPosition.top,
            left: popoverPosition.left
          }"
          @mouseenter="handlePopoverMouseEnter"
          @mouseleave="handlePopoverMouseLeave"
        >
          <!-- Barra superior luminosa -->
          <div class="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#5da6fc]/50 to-transparent"></div>

          <div class="space-y-3">
            <!-- Cabecera del Comando -->
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0">
                <HugeiconsIcon :icon="CommandLineIcon" :size="15" />
              </div>
              <div class="min-w-0">
                <span class="text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-tight">
                  {{ t('comandos.thCommand') }}
                </span>
                <h4 class="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {{ popoverItem.comando_nombre || t('comandos.noName') }}
                </h4>
              </div>
            </div>

            <!-- Instrucción / Texto -->
            <div class="pt-2 border-t border-slate-200/60 dark:border-white/5 space-y-1.5">
              <span class="text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                {{ t('comandos.commandInstructionLabel') }}
              </span>

              <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0B0D11] border border-slate-200/80 dark:border-white/5 font-mono text-[11px] text-slate-800 dark:text-slate-200 select-all break-all shadow-inner max-h-24 overflow-y-auto custom-scrollbar">
                {{ getComandoInfo(popoverItem.id_comando, popoverItem.comando_nombre)?.texto || t('comandos.noCommandText') }}
              </div>
            </div>

            <!-- Familia si existe -->
            <div v-if="getComandoInfo(popoverItem.id_comando, popoverItem.comando_nombre)?.id_familia" class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400">
              <span>{{ t('comandos.thFamily') }}:</span>
              <span class="font-bold text-slate-700 dark:text-slate-200">
                {{ getFamiliaNombre(getComandoInfo(popoverItem.id_comando, popoverItem.comando_nombre)!.id_familia) }}
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

.popover-fade-enter-active,
.popover-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.popover-fade-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}

.popover-fade-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
