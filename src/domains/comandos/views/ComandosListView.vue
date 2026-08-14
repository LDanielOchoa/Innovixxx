<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGroupStore } from '../../../stores/group.store'
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
  CpuIcon
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

const openMenuId = ref<string | null>(null)
const menuPosition = ref<{ top?: string; bottom?: string; right: string }>({ right: '0px' })

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

const opcionesFamilias = computed(() => {
  const list = [
    { value: '0', label: 'TODOS' }
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
  return found ? found.nombre : `Familia ${idFamilia}`
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
      id_familia: Number(selectedFamilia.value)
    })
  } catch (error) {
    console.error('Error al obtener comandos:', error)
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

const openEditModal = (item: Comando) => {
  editItem.value = item
  isModalOpen.value = true
}

const confirmDelete = (item: Comando) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const estimatedMenuHeight = 100

  if (spaceBelow < estimatedMenuHeight) {
    menuPosition.value = {
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  } else {
    menuPosition.value = {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleMenuAction = (action: 'edit' | 'delete', item: Comando) => {
  closeMenu()
  if (action === 'edit') openEditModal(item)
  else if (action === 'delete') confirmDelete(item)
}

const deleteComando = async () => {
  if (!itemToDelete.value || !selectedGroup.value?.id) return
  isDeleteModalOpen.value = false
  const item = itemToDelete.value
  const idComando = item.id_comando || item.mask

  if (!idComando) return

  try {
    const res = await deleteComandoApi({
      id_grupo: selectedGroup.value.id,
      id_comando: idComando
    })
    if (res.done) {
      await cargarComandos()
    } else {
      alert(res.message || 'Error al eliminar comando')
    }
  } catch (error) {
    console.error('Error al borrar comando:', error)
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
</script>

<template>
  <div class="p-6 md:p-8 animate-fade-in" @click="closeMenu">
    <!-- Header -->
    <PageHeader
      title="Comandos"
      subtitle="Listado y consulta de comandos configurados"
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
            placeholder="Buscar por nombre, texto o familia..."
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
          title="Recargar"
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
            placeholder="Filtrar familia..."
            :options="opcionesFamilias"
            :icon="CpuIcon"
            :disabled="loadingFamilias"
          />
        </div>
      </div>

      <!-- Derecha: Botón Crear Comando -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button 
          @click.stop="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo Comando</span>
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
        empty-message="No se encontraron comandos"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>

        <!-- Columna Familia Hardware (Muestra el nombre de la familia según id_familia) -->
        <Column field="id_familia" header="Familia Hardware" sortable headerStyle="width: 220px">
          <template #body="{ data }">
            <AppBadge variant="primary">
              <span class="font-bold text-[11px]">
                {{ getFamiliaNombre(data.id_familia) }}
              </span>
            </AppBadge>
          </template>
        </Column>

        <!-- Columna Nombre -->
        <Column field="nombre" header="Nombre" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-3 py-1">
              <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0">
                <HugeiconsIcon :icon="CodeCircleIcon" :size="16" />
              </div>
              <span class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight">
                {{ data.nombre || 'Sin nombre' }}
              </span>
            </div>
          </template>
        </Column>

        <!-- Columna Ver Texto (con Tooltip al pasar el mouse) -->
        <Column header="Texto" headerStyle="width: 180px">
          <template #body="{ data }">
            <div class="relative group/tooltip inline-block">
              <!-- Botón / Chip interactivo -->
              <div 
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:border-[#3b82f6]/30 dark:hover:border-[#3b82f6]/30 transition-all cursor-pointer select-none"
              >
                <HugeiconsIcon :icon="HelpCircleIcon" :size="14" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <span class="text-[12px] font-semibold">Ver texto</span>
              </div>

              <!-- Tooltip flotante al pasar el mouse -->
              <div 
                class="absolute bottom-full left-0 mb-2.5 hidden group-hover/tooltip:flex flex-col gap-1 w-max max-w-sm p-3 bg-slate-900/95 dark:bg-[#1A1D24]/95 text-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] border border-slate-700/60 dark:border-white/10 backdrop-blur-md z-50 pointer-events-none transition-all duration-200"
              >
                <div class="flex items-center gap-1.5 text-[#5da6fc] font-bold text-[10px] uppercase tracking-wider">
                  <HugeiconsIcon :icon="CommandLineIcon" :size="12" />
                  <span>Comando / Texto</span>
                </div>
                <div class="font-mono text-[12px] text-slate-200 bg-black/40 px-2 py-1.5 rounded-lg break-all select-all text-left">
                  {{ data.texto || 'Sin texto de comando' }}
                </div>
                <!-- Flecha inferior del tooltip -->
                <div class="absolute top-full left-6 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95 dark:border-t-[#1A1D24]/95"></div>
              </div>
            </div>
          </template>
        </Column>

        <!-- Columna Acciones -->
        <Column header="Acciones" headerStyle="width: 6rem" class="text-right" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(data.id_comando || data.mask, $event)"
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
              @click="handleMenuAction('edit', paginatedItems.find(i => (i.id_comando || i.mask) === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>Editar</span>
            </button>
            <button
              @click="handleMenuAction('delete', paginatedItems.find(i => (i.id_comando || i.mask) === openMenuId)!)"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" />
              <span>Eliminar</span>
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

    <!-- Modal Formulario (Crear / Editar) -->
    <ComandoFormModal
      v-model:is-open="isModalOpen"
      :editItem="editItem"
      @saved="handleSaved"
    />

    <!-- Confirmación de Eliminación -->
    <AppDeleteConfirm
      v-model:is-open="isDeleteModalOpen"
      title="Eliminar Comando"
      message="¿Estás seguro de que deseas eliminar este comando? Esta acción no se puede deshacer."
      @confirm="deleteComando"
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
</style>
