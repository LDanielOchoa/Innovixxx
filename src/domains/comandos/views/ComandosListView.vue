<script setup lang="ts">
import * as XLSX from 'xlsx'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { loadModuleMessages } from '../../../i18n'
import { useGroupStore } from '../../../stores/group.store'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../constants/permissions'
import { storeToRefs } from 'pinia'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  CommandLineIcon,
  Search01Icon,
  CodeCircleIcon,
  HelpCircleIcon,
  RefreshIcon,
  MoreHorizontalIcon,
  Edit02Icon,
  Delete01Icon,
  CpuIcon,
  PlayIcon,
  Copy01Icon,
  Tick01Icon
} from '@hugeicons/core-free-icons'
import Column from 'primevue/column'
import { fetchComandosApi, deleteComandoApi } from '../services/comandos.api'
import { fetchFamiliasApi } from '../../hardware/services/hardware.api'
import type { FamiliaHardware } from '../../hardware/types/hardware'
import type { Comando } from '../types/comando'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'
import AppBadge from '../../../components/ui/AppBadge.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import ComandoFormModal from '../components/ComandoFormModal.vue'
import ComandoEjecutarModal from '../components/ComandoEjecutarModal.vue'

loadModuleMessages('comandos')

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const comandos = ref<Comando[]>([])
const familias = ref<FamiliaHardware[]>([])
const loadingFamilias = ref(false)
const selectedFamilia = ref<string>('0')

const loading = ref(false)
const searchQuery = ref('')
const isModalOpen = ref(false)
const editItem = ref<Comando | null>(null)

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<Comando | null>(null)

const isEjecutarModalOpen = ref(false)
const itemToExecute = ref<Comando | null>(null)

const openMenuId = ref<string | null>(null)
const menuPosition = ref<{ top?: string; bottom?: string; right: string }>({ right: '0px' })

// Estado para el tooltip flotante y copiado de texto
const tooltipItem = ref<Comando | null>(null)
const tooltipVisible = ref(false)
const tooltipPosition = ref<{ top?: string; bottom?: string; left: string }>({ left: '0px' })
const copiedId = ref<string | null>(null)
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null
let copiedTimeout: ReturnType<typeof setTimeout> | null = null

const handleMouseEnterText = (item: Comando, event: MouseEvent) => {
  if (tooltipTimeout) clearTimeout(tooltipTimeout)
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  const tooltipWidth = 380
  const estimatedHeight = 200
  const spaceAbove = rect.top
  const showBelow = spaceAbove < estimatedHeight && (window.innerHeight - rect.bottom) > spaceAbove

  let left = rect.left
  if (left + tooltipWidth > window.innerWidth - 16) {
    left = window.innerWidth - tooltipWidth - 16
  }
  if (left < 16) left = 16

  if (showBelow) {
    tooltipPosition.value = {
      top: `${rect.bottom + 8}px`,
      left: `${left}px`
    }
  } else {
    tooltipPosition.value = {
      bottom: `${window.innerHeight - rect.top + 8}px`,
      left: `${left}px`
    }
  }

  tooltipItem.value = item
  tooltipVisible.value = true
}

const handleMouseLeaveText = () => {
  tooltipTimeout = setTimeout(() => {
    tooltipVisible.value = false
    tooltipItem.value = null
  }, 180)
}

const handleTooltipMouseEnter = () => {
  if (tooltipTimeout) clearTimeout(tooltipTimeout)
}

const handleTooltipMouseLeave = () => {
  tooltipVisible.value = false
  tooltipItem.value = null
}

const copyCommandText = async (item: Comando) => {
  if (!item.texto) return
  try {
    await navigator.clipboard.writeText(item.texto)
    const id = item.id_comando || item.mask || item.nombre
    copiedId.value = id
    if (copiedTimeout) clearTimeout(copiedTimeout)
    copiedTimeout = setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 2000)

    toast.add({
      severity: 'success',
      summary: t('comandos.copied'),
      detail: item.nombre || t('comandos.tooltipTitle'),
      life: 2200
    })
  } catch (err) {
    console.error('Error al copiar texto:', err)
  }
}

const currentPage = ref(1)
const itemsPerPage = 10

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

onMounted(() => {
  cargarFamilias()
})

onUnmounted(() => {
  if (tooltipTimeout) clearTimeout(tooltipTimeout)
  if (copiedTimeout) clearTimeout(copiedTimeout)
})

const opcionesFamilias = computed(() => {
  const list = [
    { value: '0', label: t('comandos.filterAllFamilies') }
  ]
  familias.value.forEach((f) => {
    list.push({
      value: String(f.id_familia),
      label: f.nombre
    })
  })
  return list
})

const getFamiliaNombre = (idFamilia: number) => {
  const found = familias.value.find((f) => f.id_familia === idFamilia)
  return found ? found.nombre : `${t('comandos.familyPrefix')} ${idFamilia}`
}

const cargarComandos = async () => {
  if (!selectedGroup.value?.id) {
    comandos.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    comandos.value = await fetchComandosApi({
      id_grupo: selectedGroup.value.id,
      id_familia: Number(selectedFamilia.value) || 0
    })
  } catch (error) {
    console.error('Error al cargar comandos:', error)
    comandos.value = []
  } finally {
    loading.value = false
  }
}

const recargarComandos = () => {
  cargarComandos()
}

watch(selectedFamilia, () => {
  currentPage.value = 1
  cargarComandos()
})

const openCreateModal = () => {
  editItem.value = null
  isModalOpen.value = true
}

const toggleMenu = (id: string | undefined, event: MouseEvent) => {
  if (!id) return
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  openMenuId.value = id

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const menuHeight = 140

  if (spaceBelow < menuHeight) {
    menuPosition.value = {
      bottom: `${window.innerHeight - rect.top + 6}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  } else {
    menuPosition.value = {
      top: `${rect.bottom + 6}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleMenuAction = (action: 'edit' | 'delete' | 'execute', item: Comando) => {
  closeMenu()
  if (action === 'execute') {
    itemToExecute.value = item
    isEjecutarModalOpen.value = true
  } else if (action === 'edit') {
    editItem.value = item
    isModalOpen.value = true
  } else if (action === 'delete') {
    itemToDelete.value = item
    isDeleteModalOpen.value = true
  }
}

const deleteComando = async () => {
  if (!itemToDelete.value || !selectedGroup.value?.id) return
  const idOrMask = itemToDelete.value.id_comando || itemToDelete.value.mask
  if (!idOrMask) return

  try {
    const res = await deleteComandoApi({
      id_grupo: selectedGroup.value.id,
      id_comando: idOrMask
    })
    if (res.done) {
      cargarComandos()
    }
  } catch (error) {
    console.error('Error al eliminar comando:', error)
  } finally {
    isDeleteModalOpen.value = false
    itemToDelete.value = null
  }
}

const handleSaved = () => {
  cargarComandos()
}

watch(
  selectedGroup,
  async (newGroup) => {
    if (newGroup && newGroup.id) {
      currentPage.value = 1
      await cargarComandos()
    } else {
      comandos.value = []
    }
  },
  { immediate: true }
)

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return comandos.value

  const query = searchQuery.value.toLowerCase().trim()
  return comandos.value.filter((item) => {
    const nombreFamilia = getFamiliaNombre(item.id_familia).toLowerCase()
    return (
      item.nombre?.toLowerCase().includes(query) ||
      item.texto?.toLowerCase().includes(query) ||
      String(item.id_familia).includes(query) ||
      nombreFamilia.includes(query) ||
      item.mask?.toLowerCase().includes(query)
    )
  })
})

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredItems.value.slice(start, start + itemsPerPage)
})

const exportToExcel = () => {
  const dataToExport = filteredItems.value.map(c => ({
    [t('comandos.thFamily')]: getFamiliaNombre(c.id_familia),
    [t('comandos.thName')]: c.nombre || '',
    [t('comandos.thText')]: c.texto || ''
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, t('comandos.title'))
  XLSX.writeFile(workbook, `comandos_${new Date().toISOString().split('T')[0]}.xlsx`)
}
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in" @click="closeMenu">
    <!-- Header -->
    <PageHeader
      :title="t('comandos.title')"
      :subtitle="t('comandos.subtitle')"
      :count="filteredItems.length"
      :icon="CommandLineIcon"
    />

    <!-- Toolbar: Buscador (izquierda) + Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-72">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('comandos.searchPlaceholder')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <button 
          @click.stop="recargarComandos"
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

        <!-- Desplegable de Familias al lado del botón de recargar -->
        <div class="w-full sm:w-56" @click.stop>
          <AppSelect
            v-model="selectedFamilia"
            :placeholder="t('comandos.filterFamilyPlaceholder')"
            :options="opcionesFamilias"
            :icon="CpuIcon"
            :disabled="loadingFamilias"
          />
        </div>
      </div>

      <!-- Derecha: Botones Exportar y Crear Comando -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button
          @click.stop="exportToExcel"
          :title="t('common.btnExport')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>{{ t('common.btnExport') }}</span>
        </button>

        <button 
          v-if="authStore.hasPermission(PERMISSIONS.COMMAND_CREATE)"
          @click.stop="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('comandos.btnNew') }}</span>
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
        :empty-message="t('comandos.noResults')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna Familia Hardware -->
        <Column field="id_familia" :header="t('comandos.thFamily')" sortable headerStyle="width: 220px">
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="font-bold text-[11px]">
                {{ getFamiliaNombre(data.id_familia) }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Nombre -->
        <Column field="nombre" :header="t('comandos.thName')" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-3 py-1">
              <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0">
                <HugeiconsIcon :icon="CodeCircleIcon" :size="16" />
              </div>
              <span class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight">
                {{ data.nombre || t('comandos.noName') }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna Ver Texto (con Tooltip al pasar el mouse y copiar al hacer click) -->
        <Column :header="t('comandos.thText')" headerStyle="width: 180px">
          <template #body="{ data }">
            <div 
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none active:scale-95"
              :class="[
                copiedId === (data.id_comando || data.mask || data.nombre)
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:border-[#3b82f6]/30 dark:hover:border-[#3b82f6]/30'
              ]"
              @mouseenter="handleMouseEnterText(data, $event)"
              @mouseleave="handleMouseLeaveText"
              @click.stop="copyCommandText(data)"
              :title="t('comandos.copyCommandText')"
            >
              <HugeiconsIcon 
                :icon="copiedId === (data.id_comando || data.mask || data.nombre) ? Tick01Icon : HelpCircleIcon" 
                :size="14" 
                :class="copiedId === (data.id_comando || data.mask || data.nombre) ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#3b82f6] dark:text-[#5da6fc]'" 
              />
              <span class="text-[12px] font-semibold">
                {{ copiedId === (data.id_comando || data.mask || data.nombre) ? t('comandos.copied') : t('comandos.viewText') }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna Acciones -->
        <Column :header="t('comandos.thActions')" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_comando || data.mask, $event)"
                :title="t('comandos.thActions')"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <!-- Dropdown Flotante de Acciones -->
      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-44 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ 
              ...(menuPosition.top ? { top: menuPosition.top } : {}), 
              ...(menuPosition.bottom ? { bottom: menuPosition.bottom } : {}), 
              right: menuPosition.right 
            }"
            @click.stop
          >
            <button
              v-if="authStore.hasPermission(PERMISSIONS.COMMAND_EXECUTE)"
              @click="handleMenuAction('execute', paginatedItems.find(i => (i.id_comando || i.mask) === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="PlayIcon" :size="16" />
              <span>{{ t('comandos.actionExecute') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.COMMAND_UPDATE)"
              @click="handleMenuAction('edit', paginatedItems.find(i => (i.id_comando || i.mask) === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('comandos.actionEdit') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.COMMAND_DELETE)"
              @click="handleMenuAction('delete', paginatedItems.find(i => (i.id_comando || i.mask) === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" />
              <span>{{ t('comandos.actionDelete') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

      <!-- Paginación -->
      <div class="border-t border-slate-200/60 dark:border-white/[0.06]">
        <AppPagination
          :totalRecords="filteredItems.length"
          v-model:currentPage="currentPage"
          :rowsPerPage="itemsPerPage"
        />
      </div>
    </AppTableCard>

    <!-- Tooltip / Popover Flotante para Texto de Comando -->
    <Teleport to="body">
      <Transition name="tooltip-popover">
        <div
          v-if="tooltipVisible && tooltipItem"
          class="fixed z-[9999] w-[320px] sm:w-[380px] p-3.5 bg-slate-900/95 dark:bg-[#1A1D24]/95 text-white rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.4)] border border-slate-700/70 dark:border-white/10 backdrop-blur-xl pointer-events-auto flex flex-col gap-2"
          :style="{
            ...(tooltipPosition.top ? { top: tooltipPosition.top } : {}),
            ...(tooltipPosition.bottom ? { bottom: tooltipPosition.bottom } : {}),
            left: tooltipPosition.left
          }"
          @mouseenter="handleTooltipMouseEnter"
          @mouseleave="handleTooltipMouseLeave"
          @click.stop="copyCommandText(tooltipItem)"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 text-[#5da6fc] font-bold text-[10px] uppercase tracking-wider">
              <HugeiconsIcon :icon="CommandLineIcon" :size="13" />
              <span>{{ t('comandos.tooltipTitle') }}</span>
            </div>
            <button
              v-if="tooltipItem.texto"
              type="button"
              @click.stop="copyCommandText(tooltipItem)"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
              :class="[
                copiedId === (tooltipItem.id_comando || tooltipItem.mask || tooltipItem.nombre)
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
              ]"
            >
              <HugeiconsIcon 
                :icon="copiedId === (tooltipItem.id_comando || tooltipItem.mask || tooltipItem.nombre) ? Tick01Icon : Copy01Icon" 
                :size="11" 
              />
              <span>
                {{ copiedId === (tooltipItem.id_comando || tooltipItem.mask || tooltipItem.nombre) ? t('comandos.copied') : t('comandos.copyCommandText') }}
              </span>
            </button>
          </div>

          <div class="font-mono text-[12px] leading-relaxed text-slate-200 bg-black/40 p-2.5 rounded-xl break-all select-all text-left max-h-48 overflow-y-auto custom-scrollbar border border-white/5 cursor-pointer">
            {{ tooltipItem.texto || t('comandos.noCommandText') }}
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal Formulario (Crear / Editar) -->
    <ComandoFormModal
      v-model:is-open="isModalOpen"
      :editItem="editItem"
      @saved="handleSaved"
    />

    <!-- Confirmación de Eliminación -->
    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      :title="t('comandos.deleteTitle')"
      :message="t('comandos.deleteMessage')"
      @confirm="deleteComando"
    />

    <!-- Modal Ejecutar Comando -->
    <ComandoEjecutarModal
      v-model:is-open="isEjecutarModalOpen"
      :comando="itemToExecute"
      @executed="cargarComandos"
    />
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

.tooltip-popover-enter-active,
.tooltip-popover-leave-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.tooltip-popover-enter-from,
.tooltip-popover-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.97);
}
</style>
