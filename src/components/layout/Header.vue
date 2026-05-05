<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toggleMobileSidebar } from '../../composables/useSidebar'
import { useGroupStore } from '../../stores/group.store'
import { useAuthStore } from '../../stores/auth.store'
import { apiClient } from '../../utils/api-client'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Menu01Icon, 
  ArrowDown01Icon, 
  UserGroupIcon,
  Tick01Icon,
  RefreshIcon,
  PlayIcon,
  Notification03Icon,
  Settings02Icon,
  Note01Icon,
  Search01Icon,
  Location01Icon
} from '@hugeicons/core-free-icons'

interface Group {
  id: string
  nombre: string
  logo?: string
}

const groupStore = useGroupStore()
const authStore = useAuthStore()

const { t } = useI18n()
// La reactividad del tema se maneja globalmente ahora en themeStore
const isLoading = ref(true)
const isMenuOpen = ref(false)
const groups = ref<Group[]>([])
const searchQuery = ref('')

const toggleMenu = () => {
  if (groups.value.length > 1) {
    isMenuOpen.value = !isMenuOpen.value
    if (isMenuOpen.value) {
      searchQuery.value = ''
    }
  }
}

const closeMenu = () => {
  isMenuOpen.value = false
}

// Cerrar al hacer click fuera
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.group-selector')) {
    closeMenu()
  }
}

const filteredGroups = computed(() => {
  if (!searchQuery.value) return groups.value
  return groups.value.filter(g => 
    g.nombre.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    g.id.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const isRefreshing = ref(false)

const fetchGroupsApi = async () => {
  try {
    const data = await apiClient<{ done: boolean; data: any[] }>('/api/v1/grupo/listar/', {
      method: 'POST',
      body: JSON.stringify({})
    })

    if (data.done && Array.isArray(data.data)) {
      groups.value = data.data.map((g: any) => ({
        id: g.id_grupo || g.id,
        nombre: g.nombre || g.id_grupo,
        logo: g.logo
      }))
    }
  } catch (err) {
    console.error('Error fetching groups:', err)
  }
}

const sincronizarGrupoSeleccionado = () => {
  if (groups.value.length === 0) return

  const idSeleccionado = groupStore.selectedGroup?.id?.trim() || ''
  const grupoPorId = idSeleccionado
    ? groups.value.find(g => g.id === idSeleccionado)
    : undefined

  if (grupoPorId) {
    groupStore.setGroup(grupoPorId)
    return
  }

  const nombreSeleccionado = groupStore.selectedGroup?.nombre?.trim() || ''
  const grupoPorNombre = nombreSeleccionado
    ? groups.value.find(g => g.nombre === nombreSeleccionado)
    : undefined

  if (grupoPorNombre) {
    groupStore.setGroup(grupoPorNombre)
    return
  }

  const primerGrupo = groups.value[0]
  if (!primerGrupo) return

  groupStore.setGroup(primerGrupo)
}

onMounted(async () => {
  window.addEventListener('click', handleOutsideClick)

  if (authStore.isSuperAdmin) {
    await fetchGroupsApi()
  }
  sincronizarGrupoSeleccionado()
  isLoading.value = false
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

watch(() => authStore.isSuperAdmin, async (isSuper, wasSuper) => {
  if (isSuper && !wasSuper) {
    await fetchGroupsApi()
    sincronizarGrupoSeleccionado()
  }
})

const selectGroup = (group: Group) => {
  groupStore.setGroup(group)
  closeMenu()
}

const openTrackingWindow = async () => {
  const url = '/login'
  const windowName = 'TrackingWindow'
  
  try {
    // Intenta usar la API moderna de Window Management
    if ('getScreenDetails' in window) {
      const screenDetails = await (window as any).getScreenDetails()
      // Buscar una pantalla que no sea la actual
      const secondaryScreen = screenDetails.screens.find((s: any) => s.left !== screenDetails.currentScreen.left || s.top !== screenDetails.currentScreen.top)
      
      if (secondaryScreen) {
        const { left, top, width, height } = secondaryScreen
        window.open(url, windowName, `left=${left},top=${top},width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`)
        return
      }
    }
  } catch (err) {
    console.warn('Acceso a detalles de pantalla denegado o no soportado:', err)
  }

  // Fallback: Abrir en la pantalla actual si no hay segunda pantalla o no hay permiso
  const width = 1200
  const height = 800
  const left = (window.screen.width / 2) - (width / 2)
  const top = (window.screen.height / 2) - (height / 2)
  window.open(url, windowName, `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`)
}

const refreshPage = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  
  await fetchGroupsApi()
  sincronizarGrupoSeleccionado()
  
  if (groups.value.length === 0) {
    groups.value = [{ ...groupStore.selectedGroup }]
  }
  
  setTimeout(() => {
    isRefreshing.value = false
  }, 300)
}
</script>

<template>
  <header class="h-[88px] flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 relative z-[110] shrink-0 bg-white/80 dark:bg-[#13161C]/80 backdrop-blur-lg px-4 md:px-8 transition-all duration-500 will-change-transform shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
    <div class="flex items-center gap-4">
      <!-- Botón Menú Móvil - Estilo -->
      <button 
        @click="toggleMobileSidebar"
        class="md:hidden w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 rounded-[14px] shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)]"
      >
        <HugeiconsIcon :icon="Menu01Icon" :size="24" :stroke-width="1.8" />
      </button>

      <div class="animate-fade-in flex flex-col justify-center">
        <div v-if="isLoading" class="flex items-center gap-3">
          <div class="h-7 w-40 bg-slate-100 dark:bg-white/5 rounded-full animate-pulse"></div>
        </div>
        
        <div v-else class="flex items-center relative group-selector">
          <div class="relative">
            <button 
              @click="toggleMenu"
              class="flex items-center gap-4 transition-all duration-300 outline-none p-1.5 pr-4 rounded-[22px] group/btn relative overflow-hidden active:scale-[0.98]"
              :class="isMenuOpen ? 'bg-slate-50/80 dark:bg-white/5 shadow-sm' : 'bg-transparent hover:bg-slate-50/50 dark:hover:bg-white/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]'"
            >
              <!-- Glass Shimmer Effect -->
              <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent group-hover/btn:animate-[shimmer_1.5s_ease-in-out]"></div>

              <!-- Espacio para Foto de Grupo -->
              <div class="w-11 h-11 shrink-0 rounded-[14px] bg-slate-100 dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover/btn:text-[#3b82f6] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] group-hover/btn:scale-105 transition-all duration-500 overflow-hidden relative z-10">
                <div class="absolute inset-0 bg-[#3b82f6]/5 blur-md rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                <img v-if="groupStore.selectedGroup.logo" :src="groupStore.selectedGroup.logo" class="w-full h-full object-cover relative z-10" />
                <HugeiconsIcon v-else :icon="UserGroupIcon" :size="20" :stroke-width="1.8" class="relative z-10" />
              </div>

              <div class="flex items-center gap-3 relative z-10">
                <span class="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tighter truncate max-w-[200px] md:max-w-xs leading-none pt-0.5 group-hover/btn:text-[#3b82f6] dark:group-hover/btn:text-[#5da6fc] transition-colors duration-300">
                  {{ groupStore.selectedGroup.nombre }}
                </span>
                <HugeiconsIcon 
                  v-if="groups.length > 1"
                  :icon="ArrowDown01Icon" 
                  :size="16" 
                  :stroke-width="3"
                  class="text-slate-300 dark:text-slate-500 transition-all duration-500 group-hover/btn:text-[#3b82f6] dark:group-hover/btn:text-[#5da6fc]"
                  :class="{ 'rotate-180': isMenuOpen }"
                />
              </div>
            </button>

            <!-- Dropdown Menu -->
            <Transition 
              enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              enter-from-class="transform scale-95 opacity-0 -translate-y-4"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="transform scale-100 opacity-100 translate-y-0"
              leave-to-class="transform scale-95 opacity-0 -translate-y-2"
            >
              <div 
                v-if="isMenuOpen" 
                class="absolute top-[calc(100%+14px)] left-0 w-[340px] bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-[28px] shadow-[0_30px_70px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden z-[120]"
              >
                <!-- Header del Dropdown -->
                <div class="px-6 pt-6 pb-4">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{{ t('header.availableGroups') }}</span>
                    <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400">
                      {{ groups.length }}
                    </span>
                  </div>
                  
                  <!-- Buscador -->
                  <div v-if="groups.length > 5" class="relative group/search">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] dark:group-focus-within/search:text-[#5da6fc] transition-colors">
                      <HugeiconsIcon :icon="Search01Icon" :size="16" />
                    </div>
                    <input 
                      v-model="searchQuery"
                      type="text"
                      :placeholder="t('header.searchPlaceholder')"
                      class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200 dark:border-white/10 rounded-[16px] pl-11 pr-4 py-3 text-[13px] font-medium text-slate-700 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#3b82f6]/50 dark:focus:border-[#5da6fc]/50 focus:ring-2 focus:ring-[#3b82f6]/15 dark:focus:ring-[#5da6fc]/15 transition-all duration-300"
                    />
                  </div>
                </div>

                <!-- Lista de Grupos -->
                <div class="max-h-[300px] overflow-y-auto custom-scrollbar px-3 pb-3">
                  <template v-if="isRefreshing">
                    <div v-for="n in 3" :key="'skel-' + n" class="w-full px-3 py-3 animate-pulse">
                      <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-[14px] bg-slate-100 dark:bg-white/5"></div>
                        <div class="h-3.5 bg-slate-100 dark:bg-white/5 rounded-full w-2/3"></div>
                      </div>
                    </div>
                  </template>
                  
                  <template v-else-if="filteredGroups.length === 0">
                    <div class="py-12 text-center px-4">
                      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <HugeiconsIcon :icon="UserGroupIcon" :size="20" class="text-slate-400 dark:text-slate-500" />
                      </div>
                      <p class="text-[12px] font-bold text-slate-400 dark:text-slate-500">{{ t('header.noResults') || 'Sin resultados' }}</p>
                    </div>
                  </template>

                  <template v-else>
                    <button 
                      v-for="group in filteredGroups" 
                      :key="group.id"
                      @click="selectGroup(group)"
                      class="w-full flex items-center justify-between px-3 py-2.5 mb-0.5 transition-all duration-300 rounded-[18px] outline-none group/item border border-transparent"
                      :class="[
                        groupStore.selectedGroup.id === group.id 
                          ? 'bg-gradient-to-r from-[#3b82f6]/12 to-[#3b82f6]/5 dark:from-[#5da6fc]/18 dark:to-[#5da6fc]/8 text-[#3b82f6] dark:text-[#5da6fc] border-[#3b82f6]/20 dark:border-[#5da6fc]/20 shadow-[0_4px_12px_rgba(59,130,246,0.1)] dark:shadow-[0_4px_12px_rgba(93,166,252,0.15)]' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white hover:border-slate-200/60 dark:hover:border-white/8'
                      ]"
                    >
                      <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 shrink-0 rounded-[14px] bg-slate-100 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover/item:text-[#3b82f6] dark:group-hover/item:text-[#5da6fc] transition-all duration-300 group-hover/item:scale-105 overflow-hidden shadow-sm">
                           <img v-if="group.logo" :src="group.logo" class="w-full h-full object-cover rounded-[14px]" />
                           <HugeiconsIcon v-else :icon="UserGroupIcon" :size="18" />
                        </div>
                        <span class="text-[13px] font-bold tracking-tight truncate max-w-[180px]">{{ group.nombre }}</span>
                      </div>
                      
                      <div v-if="groupStore.selectedGroup.id === group.id" class="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] dark:from-[#5da6fc] dark:to-[#3b82f6] flex items-center justify-center text-white shadow-[0_3px_10px_rgba(59,130,246,0.4)] dark:shadow-[0_3px_10px_rgba(93,166,252,0.3)]">
                        <HugeiconsIcon :icon="Tick01Icon" :size="14" :stroke-width="4" />
                      </div>
                    </button>
                  </template>
                </div>
                
                <!-- Footer con Sync -->
                <div class="px-3 pt-2 pb-4 border-t border-slate-100 dark:border-white/5">
                   <button 
                    class="flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] dark:from-[#5da6fc] dark:to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] dark:hover:from-[#3b82f6] dark:hover:to-[#2563eb] border border-[#2563eb] dark:border-[#1d4ed8] shadow-[0_4px_0_#2563eb,0_8px_20px_rgba(59,130,246,0.4)] dark:shadow-[0_4px_0_#1d4ed8,0_8px_20px_rgba(93,166,252,0.2)] transition-all duration-200 w-full rounded-[16px] active:translate-y-[4px] active:shadow-[0_0px_0_#2563eb,0_4px_10px_rgba(59,130,246,0.4)] dark:active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(93,166,252,0.2)] text-white" 
                    @click="refreshPage" 
                    :disabled="isRefreshing"
                   >
                      <HugeiconsIcon :icon="RefreshIcon" :size="15" :stroke-width="2.5" :class="{ 'animate-spin': isRefreshing }" />
                      <span class="text-[11px] font-black uppercase tracking-[0.15em]">{{ isRefreshing ? t('header.syncing') : t('header.syncData') }}</span>
                   </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Acciones Rápidas - Iconos -->
    <div class="flex items-center gap-2 animate-fade-in">
      <div class="hidden xl:flex items-center gap-2.5 mr-2">
        
        <button 
          @click="openTrackingWindow"
          :title="t('header.tracking')"
          class="flex items-center justify-center w-11 h-11 rounded-[16px] bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)] group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Location01Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.playback')"
          class="flex items-center justify-center w-11 h-11 rounded-[16px] bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)] group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="PlayIcon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.alarms')"
          class="flex items-center justify-center w-11 h-11 rounded-[16px] bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)] group focus:outline-none relative shrink-0"
        >
          <HugeiconsIcon :icon="Notification03Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
          <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#13161C] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
        </button>

        <button 
          :title="t('header.services')"
          class="flex items-center justify-center w-11 h-11 rounded-[16px] bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)] group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Settings02Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.reports')"
          class="flex items-center justify-center w-11 h-11 rounded-[16px] bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#16191D] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-200 active:translate-y-[4px] active:shadow-[0_0px_0_#e2e8f0,0_2px_5px_rgba(0,0,0,0.05)] dark:active:shadow-[0_0px_0_#1D1D24,0_2px_5px_rgba(0,0,0,0.4)] group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Note01Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>
        
        <div class="h-6 w-px bg-slate-200/60 dark:bg-white/10 mx-2"></div>
      </div>
    </div>
  </header>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

header {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #2A313A;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #60a5fa;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #5da6fc;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
</style>


