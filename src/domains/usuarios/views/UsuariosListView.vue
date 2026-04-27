<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon,
  Alert01Icon,
  MoreHorizontalIcon,
  Mail01Icon,
  Shield01Icon,
  FilterIcon,
  ArrowDown01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { obtenerUrlImagen } from '../../../utils/imagenes'
import {
  deleteUsuarioApi,
  fetchGruposApi,
  listUsuariosByGrupoApi,
  mapUsuariosFromApi,
} from '../services/usuarios.api'
import type { Grupo, Usuario } from '../types/usuario'
import { useI18n } from 'vue-i18n'
import { ApiError, getErrorMessage } from '../../../utils/api-errors'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppButton from '../../../components/common/AppButton.vue'
import AppPageHeader from '../../../components/common/AppPageHeader.vue'
import AppSearch from '../../../components/common/AppSearch.vue'
import AppTableCard from '../../../components/common/AppTableCard.vue'
import AppTable from '../../../components/common/AppTable.vue'
import BasePagination from '../../../components/common/BasePagination.vue'
import AppDeleteConfirm from '../../../components/common/AppDeleteConfirm.vue'
import Column from 'primevue/column'
import Avatar from 'primevue/avatar'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const usuarios = ref<Usuario[]>([])
const grupos = ref<Grupo[]>([])
const loading = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const { t, locale } = useI18n()
const listLang = computed(() => locale.value || 'es')

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const USER_SORT_KEYS: Array<keyof Usuario> = ['id', 'nombre', 'email', 'lang', 'pass', 'id_role', 'id_grupo', 'grupo_nombre', 'time_zone']
const isSyncingFromRoute = ref(false)

const sortKey = ref<keyof Usuario>('id')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsuarios.value.length / itemsPerPage)))

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

const goToPage = (p: number | '...') => {
  if (typeof p !== 'number') return
  currentPage.value = p
  syncStateToUrl()
}

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

const fetchUsuarios = async () => {
  if (!selectedGroup.value?.id) {
    usuarios.value = []
    return
  }

  loading.value = true
  try {
    const list = await listUsuariosByGrupoApi(selectedGroup.value.id, listLang.value)
    const grupoInfo = grupos.value.find(g => g.id === selectedGroup.value.id) || { id: selectedGroup.value.id, nombre: selectedGroup.value.nombre || selectedGroup.value.id }
    usuarios.value = mapUsuariosFromApi(list, grupoInfo as any, listLang.value)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    usuarios.value = []
  } finally {
    loading.value = false
  }
}

const fetchGrupos = async () => {
  try {
    grupos.value = await fetchGruposApi()
  } catch (error) {
    console.error('Error al obtener grupos:', error)
    grupos.value = []
  }
}

onMounted(() => {
  fetchGrupos()
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    await fetchUsuarios()
  } else {
    usuarios.value = []
  }
}, { immediate: true })

const filteredUsuarios = computed(() => {
  let result = [...usuarios.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.lang.toLowerCase().includes(query) ||
      u.grupo_nombre.toLowerCase().includes(query)
    )
  }
  return result
})

const paginatedUsuarios = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredUsuarios.value.slice(start, start + itemsPerPage)
})

const exportToExcel = () => {
  const dataToExport = filteredUsuarios.value.map(u => ({
    'ID': u.id,
    'Nombre': u.nombre,
    'Correo Electrónico': u.email,
    'Idioma': u.lang.toUpperCase()
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios')
  XLSX.writeFile(workbook, 'Listado_Usuarios.xlsx')
}

const openCreateModal = () => {
  router.push('/usuarios/nuevo')
}

const openEditModal = (usuario: Usuario) => {
  router.push(`/usuarios/${usuario.id}/editar`)
}

const isDeleteModalOpen = ref(false)
const itemToDelete = ref<Usuario | null>(null)

const confirmDelete = (usuario: Usuario) => {
  itemToDelete.value = usuario
  isDeleteModalOpen.value = true
}

const deleteUsuario = async () => {
  if (!itemToDelete.value) return
  isDeleteModalOpen.value = false
  const usuario = itemToDelete.value

  try {
    const { data } = await deleteUsuarioApi({
      id_grupo: usuario.id_grupo,
      id_usuario: String(usuario.id),
      lang: usuario.lang || 'es'
    })

    if (data.done) {
      await fetchUsuarios()
      showModalMessage('Usuario eliminado correctamente', 'success')
    } else {
      showModalMessage(data.message || t('users.alertErrorDelete'), 'error')
    }
  } catch (error) {
    if (error instanceof ApiError) {
      showModalMessage(getErrorMessage(error.code), 'error')
    } else {
      console.error('Error al eliminar usuario:', error)
      showModalMessage(t('users.alertNetErrorDelete'), 'error')
    }
  }
}

const onPageChange = (event: any) => {
  currentPage.value = event.page + 1
}

const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; syncStateToUrl() } }
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; syncStateToUrl() } }

const getStatusType = (usuario: Usuario) => {
  return Number(usuario.id) % 3 === 0 ? 'inactive' : 'active'
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <AppPageHeader 
      :title="t('users.title')" 
      :subtitle="t('users.subtitle')" 
      :count="filteredUsuarios.length"
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
          <span>{{ t('users.btnNew') }}</span>
        </AppButton>
      </template>
    </AppPageHeader>
    <!-- Área de Búsqueda y Filtros Simplificada -->
    <div class="flex flex-col md:flex-row gap-4 items-center mb-8 animate-fade-in">
      <div class="flex-1 w-full max-w-2xl">
        <AppSearch 
          v-model="searchQuery" 
          :placeholder="t('users.searchPlaceholder', 'Buscar por nombre o email...')"
        />
      </div>
      
      <div class="w-full md:w-auto min-w-[240px]">
        <AppSelect 
          v-model="selectedGroup"
          :options="grupos.map(g => ({ label: g.nombre, value: g.id }))"
          :placeholder="t('users.filterByGroup', 'Filtrar por Grupo')"
        />
      </div>
    </div>
    <!-- Contenido Principal: DataTable dentro de Card -->
    <AppTableCard>
      <AppTable 
        :value="filteredUsuarios" 
        :loading="loading"
        :rows="itemsPerPage"
        :first="(currentPage - 1) * itemsPerPage"
        removableSort
        :empty-message="t('users.noUsersFound', 'No se encontraron usuarios')"
      >
        <template #empty-icon>
          <HugeiconsIcon :icon="Search01Icon" :size="32" class="text-slate-300 dark:text-slate-600" />
        </template>
        <template #empty-subtitle>{{ t('users.trySearch', 'Intenta ajustar tus filtros de búsqueda') }}</template>

        <Column field="nombre" header="Usuario" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-4 py-1">
              <AppAvatar 
                :image="data.foto ? obtenerUrlImagen(data.foto) : undefined"
                :label="data.nombre"
                size="normal"
              />
              <div class="flex flex-col">
                <span class="text-[14px] font-black text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="email" header="Email" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-300 cursor-pointer group/mail py-1">
              <div class="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-200/50 dark:border-white/5 group-hover/mail:border-[#3b82f6]/30 group-hover/mail:bg-[#3b82f6]/5">
                <HugeiconsIcon :icon="Mail01Icon" :size="14" class="opacity-40 group-hover/mail:opacity-100 transition-opacity" />
              </div>
              <span class="text-[13px] font-bold tracking-tight">{{ data.email }}</span>
            </div>
          </template>
        </Column>

        <Column field="lang" header="Idioma" sortable>
          <template #body="{ data }">
            <AppBadge variant="glass" class="group/lang">
              <div class="flex items-center gap-2">
                <img 
                  :src="data.lang.toLowerCase() === 'es' ? 'https://flagcdn.com/co.svg' : 'https://flagcdn.com/us.svg'" 
                  :alt="data.lang"
                  class="w-4 h-3 object-cover rounded-[2px] shadow-sm group-hover/lang:scale-110 transition-transform duration-500"
                />
                <div class="w-[1px] h-3 bg-slate-200 dark:bg-white/10 mx-0.5"></div>
                <span class="text-slate-600 dark:text-slate-300 font-bold uppercase">
                  {{ data.lang }}
                </span>
              </div>
            </AppBadge>
          </template>
        </Column>

        <Column header="Acciones" class="text-right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-3">
              <button 
                @click="openEditModal(data)"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/30 transition-all duration-300 active:translate-y-[2px] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] active:shadow-none"
                title="Editar"
              >
                <HugeiconsIcon :icon="Edit02Icon" :size="16" :stroke-width="2.5" />
              </button>
              <button 
                @click="confirmDelete(data)"
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

      <!-- Paginador -->
      <AppPagination 
        :totalRecords="filteredUsuarios.length"
        v-model:currentPage="currentPage"
        :rowsPerPage="itemsPerPage"
      />
    </AppTableCard>

    <!-- Modal de Eliminación Premium Reutilizable -->
    <AppDeleteConfirm 
      v-model:is-open="isDeleteModalOpen"
      :title="t('users.deleteTitle', 'Eliminar Usuario')"
      :item-name="itemToDelete?.nombre"
      @confirm="deleteUsuario"
    >
      <template #question>
        {{ t('users.deleteConfirmQuestion', '¿Eliminar usuario?') }}
      </template>
    </AppDeleteConfirm>
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



