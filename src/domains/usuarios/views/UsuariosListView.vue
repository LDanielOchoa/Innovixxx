<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Edit02Icon,
  Delete01Icon,
  MoreHorizontalIcon,
  Mail01Icon,
  UserGroupIcon
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
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'
import { storeToRefs } from 'pinia'
import AppTableCard from '../../../components/ui/AppTableCard.vue'
import AppTable from '../../../components/ui/AppTable.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import PageHeader from '../../../components/shared/PageHeader.vue'
import Column from 'primevue/column'
import UsuarioCreateModal from '../components/UsuarioCreateModal.vue'

const route = useRoute()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)

const isCreateModalOpen = ref(false)
const selectedUsuarioForEdit = ref<Usuario | null>(null)

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

const currentPage = ref(1)
const itemsPerPage = 10

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

const openMenuId = ref<string | null>(null)
const menuPosition = ref({ top: '0px', right: '0px' })

const toggleMenu = (id: string, event: MouseEvent) => {
  if (openMenuId.value === id) {
    openMenuId.value = null
    return
  }
  
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  menuPosition.value = {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`
  }
  openMenuId.value = id
}

const closeMenu = () => {
  openMenuId.value = null
}

const handleDocumentClick = () => {
  closeMenu()
}

onMounted(() => {
  fetchGrupos()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
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
  selectedUsuarioForEdit.value = null
  isCreateModalOpen.value = true
}

const openEditModal = (usuario: Usuario) => {
  selectedUsuarioForEdit.value = usuario
  isCreateModalOpen.value = true
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

const copiedEmail = ref<string | null>(null)
const copiarEmail = (email: string) => {
  navigator.clipboard.writeText(email)
  copiedEmail.value = email
  setTimeout(() => {
    if (copiedEmail.value === email) {
      copiedEmail.value = null
    }
  }, 2000)
}
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 animate-fade-in">
    <!-- Header -->
    <PageHeader 
      :title="t('users.title')" 
      :subtitle="t('users.subtitle')" 
      :count="filteredUsuarios.length"
      :icon="UserGroupIcon"
    />

    <!-- Toolbar: Buscador y Filtro (izquierda) + Botones (derecha) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <!-- Izquierda: Buscador y Filtro de Grupo -->
      <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
        <!-- Buscador -->
        <div class="relative w-full sm:w-80">
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="t('users.searchPlaceholder', 'Buscar por nombre o email...')"
            class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#3b82f6]/50 focus:ring-4 focus:ring-[#3b82f6]/10 transition-all"
          />
          <div class="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>

        <!-- Filtro de Grupo -->
        <div class="w-full sm:w-auto min-w-[200px]">
          <AppSelect 
            v-model="selectedGroup"
            :options="grupos.map(g => ({ label: g.nombre, value: g.id }))"
            :placeholder="t('users.filterByGroup', 'Filtrar por Grupo')"
          />
        </div>
      </div>

      <!-- Derecha: Botones Exportar y Nuevo Usuario -->
      <div class="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
        <button 
          @click="exportToExcel"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#13161C]/70 border border-slate-200/70 dark:border-white/[0.08] text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:border-[#3b82f6]/25 active:scale-95 transition-all"
        >
          <svg class="w-3.5 h-3.5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>Exportar Excel</span>
        </button>

        <button 
          v-if="authStore.hasPermission(PERMISSIONS.USERS_CREATE)"
          @click="openCreateModal"
          class="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#3b82f6] dark:hover:bg-[#5da6fc] active:scale-95 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-950/10"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('users.btnNew') }}</span>
        </button>
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
                <span class="text-[14px] font-semibold text-slate-800 dark:text-white tracking-tight leading-none">{{ data.nombre }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="email" header="Email" sortable>
          <template #body="{ data }">
            <div 
              @click.stop="copiarEmail(data.email)"
              class="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 hover:text-[#0066FF] dark:hover:text-[#5da6fc] transition-all duration-300 cursor-pointer group/mail py-1 relative"
            >
              <div class="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-200/50 dark:border-white/5 group-hover/mail:border-[#0066FF]/30 group-hover/mail:bg-[#0066FF]/5">
                <svg v-if="copiedEmail === data.email" class="w-3.5 h-3.5 text-green-500 dark:text-green-400 animate-scale-up" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <HugeiconsIcon v-else :icon="Mail01Icon" :size="14" class="opacity-40 group-hover/mail:opacity-100 transition-opacity" />
              </div>
              <span class="text-[13px] font-medium tracking-tight">{{ data.email }}</span>
              <Transition name="fade">
                <span v-if="copiedEmail === data.email" class="absolute left-full ml-2 px-2 py-0.5 text-[10px] font-bold text-white bg-green-500 dark:bg-green-600 rounded shadow-sm whitespace-nowrap animate-fade-in-out">
                  Copiado
                </span>
              </Transition>
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
                <span class="text-slate-600 dark:text-slate-300 font-semibold uppercase">
                  {{ data.lang }}
                </span>
              </div>
            </AppBadge>
          </template>
        </Column>

        <Column header="Acciones" class="text-right" headerStyle="width: 6rem" alignHeader="right">
          <template #body="{ data }">
            <div class="flex justify-end">
              <button
                @click.stop="toggleMenu(String(data.id), $event)"
                class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              >
                <HugeiconsIcon :icon="MoreHorizontalIcon" :size="18" />
              </button>
            </div>
          </template>
        </Column>
      </AppTable>

      <Teleport to="body">
        <Transition name="dropdown-menu">
          <div
            v-if="openMenuId"
            class="fixed z-[9999] w-48 bg-white dark:bg-[#1A1D24] border border-slate-200/60 dark:border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            :style="{ top: menuPosition.top, right: menuPosition.right }"
          >
            <button
              v-if="authStore.hasPermission(PERMISSIONS.USERS_EDIT)"
              @click="openEditModal(usuarios.find(u => String(u.id) === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <HugeiconsIcon :icon="Edit02Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc]" />
              <span>{{ t('common.edit', 'Editar') }}</span>
            </button>
            <button
              v-if="authStore.hasPermission(PERMISSIONS.USERS_DELETE)"
              @click="confirmDelete(usuarios.find(u => String(u.id) === openMenuId)!); openMenuId = null"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <HugeiconsIcon :icon="Delete01Icon" :size="16" />
              <span>{{ t('common.delete', 'Eliminar') }}</span>
            </button>
          </div>
        </Transition>
      </Teleport>

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

    <!-- Modal de Creación / Edición Premium -->
    <UsuarioCreateModal
      v-model:is-open="isCreateModalOpen"
      :usuario="selectedUsuarioForEdit"
      @saved="fetchUsuarios"
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

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.dropdown-menu-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-menu-leave-active {
  transition: all 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.dropdown-menu-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@keyframes scaleUp {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scale-up {
  animation: scaleUp 0.15s ease-out forwards;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-5px); }
  15% { opacity: 1; transform: translateX(0); }
  85% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(5px); }
}
.animate-fade-in-out {
  animation: fadeInOut 2s ease-in-out forwards;
}
</style>



