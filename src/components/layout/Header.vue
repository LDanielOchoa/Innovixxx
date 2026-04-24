<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toggleMobileSidebar } from '../../composables/useSidebar'
import { useGroupStore } from '../../stores/group.store'
import { useThemeStore } from '../../stores/theme.store'
import { useAuthStore } from '../../stores/auth.store'
import { CookieAuth } from '../../utils/cookie-auth'
import { HugeiconsIcon } from '@hugeicons/vue'
import { 
  Menu01Icon, 
  ArrowDown01Icon, 
  UserGroupIcon,
  CheckmarkCircle01Icon,
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
}

const groupStore = useGroupStore()
const themeStore = useThemeStore()
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
  const token = CookieAuth.getToken()
  if (!token) return

  try {
    const adminRes = await fetch('/api/v1/grupo/listar/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    if (adminRes.ok) {
      const data = await adminRes.json()
      if (data.done && Array.isArray(data.data)) {
        groups.value = data.data.map((g: any) => ({
          id: g.id_grupo || g.id,
          nombre: g.nombre || g.id_grupo
        }))
      }
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
    if (groupStore.selectedGroup.nombre !== grupoPorId.nombre) {
      groupStore.setGroup(grupoPorId)
    }
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
  
  await fetchGroupsApi()
  sincronizarGrupoSeleccionado()
  
  // Si no es admin o falló, solo mostramos el actual
  if (groups.value.length === 0) {
    groups.value = [{ ...groupStore.selectedGroup }]
  }
  isLoading.value = false
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
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
        class="md:hidden w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-white dark:bg-[#13161C] rounded-xl border border-slate-200 dark:border-white/10 shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] hover:bg-slate-50 dark:hover:bg-[#1A1D24] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none"
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
              class="flex items-center gap-3 transition-all duration-300 outline-none px-4 py-2 rounded-2xl group/btn hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95"
              :class="isMenuOpen ? 'bg-slate-100 dark:bg-white/10' : ''"
            >
              <span class="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate max-w-[200px] md:max-w-xs leading-none">
                {{ groupStore.selectedGroup.nombre }}
              </span>
              <HugeiconsIcon 
                v-if="groups.length > 1"
                :icon="ArrowDown01Icon" 
                :size="18" 
                :stroke-width="3"
                class="text-slate-300 dark:text-slate-500 transition-all duration-500 group-hover/btn:text-[#3b82f6] dark:group-hover/btn:text-[#5da6fc]"
                :class="{ 'rotate-180': isMenuOpen }"
              />
            </button>

            <!-- Dropdown Menu Glassmorphic -->
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
                class="absolute top-[calc(100%+8px)] left-0 w-[300px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden py-2 z-[120] animate-in"
              >
                <div class="px-5 py-4 flex flex-col gap-4">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{{ t('header.availableGroups') }}</span>
                    <span class="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                      {{ groups.length }}
                    </span>
                  </div>
                  
                  <!-- Buscador Minimalista -->
                  <div v-if="groups.length > 5" class="relative">
                    <HugeiconsIcon :icon="Search01Icon" :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      v-model="searchQuery"
                      type="text"
                      :placeholder="t('header.searchPlaceholder') || 'Buscar...'"
                      class="w-full bg-slate-50 dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                    />
                  </div>
                </div>

                <div class="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-2 pb-2">
                  <template v-if="isRefreshing">
                    <div v-for="n in 3" :key="'skel-' + n" class="w-full px-4 py-3 animate-pulse">
                      <div class="h-3 bg-slate-100 dark:bg-white/5 rounded-full w-2/3"></div>
                    </div>
                  </template>
                  
                  <template v-else-if="filteredGroups.length === 0">
                    <div class="py-8 text-center px-4">
                      <p class="text-xs font-bold text-slate-400">{{ t('header.noResults') || 'Sin resultados' }}</p>
                    </div>
                  </template>

                  <template v-else>
                    <button 
                      v-for="group in filteredGroups" 
                      :key="group.id"
                      @click="selectGroup(group)"
                      class="w-full flex items-center justify-between px-4 py-3 text-sm transition-all duration-200 rounded-xl outline-none group/item"
                      :class="[
                        groupStore.selectedGroup.id === group.id 
                          ? 'bg-[#3b82f6]/5 dark:bg-[#5da6fc]/10 text-[#3b82f6] dark:text-[#5da6fc] font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      ]"
                    >
                      <div class="flex items-center gap-3">
                        <HugeiconsIcon :icon="UserGroupIcon" :size="18" :stroke-width="2" class="opacity-40 group-hover/item:opacity-100 transition-opacity" />
                        <span class="truncate max-w-[200px] tracking-tight">{{ group.nombre }}</span>
                      </div>
                      <HugeiconsIcon v-if="groupStore.selectedGroup.id === group.id" :icon="Tick01Icon" :size="18" :stroke-width="3" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                    </button>
                  </template>
                </div>
                
                <div class="px-3 pt-2 border-t border-slate-100 dark:border-white/5 mt-1 pb-1">
                   <button 
                    class="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-300 w-full rounded-xl active:scale-95" 
                    @click="refreshPage" 
                    :disabled="isRefreshing"
                   >
                      <HugeiconsIcon :icon="RefreshIcon" :size="14" :stroke-width="2.5" :class="{ 'animate-spin': isRefreshing }" />
                      <span class="text-[12px] font-black uppercase tracking-widest">{{ isRefreshing ? t('header.syncing') : t('header.syncData') }}</span>
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
      <div class="hidden xl:flex items-center gap-2 mr-2">
        
        <button 
          @click="openTrackingWindow"
          :title="t('header.tracking')"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1A1D24] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none group focus:outline-none"
        >
          <HugeiconsIcon :icon="Location01Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.playback')"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1A1D24] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none group focus:outline-none"
        >
          <HugeiconsIcon :icon="PlayIcon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.alarms')"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1A1D24] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none group focus:outline-none relative"
        >
          <HugeiconsIcon :icon="Notification03Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
          <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#13161C] shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
        </button>

        <button 
          :title="t('header.services')"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1A1D24] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none group focus:outline-none"
        >
          <HugeiconsIcon :icon="Settings02Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.reports')"
          class="flex items-center justify-center w-11 h-11 rounded-xl bg-white dark:bg-[#13161C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1A1D24] shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#000000] transition-all duration-200 active:scale-95 active:translate-y-[1px] active:shadow-none group focus:outline-none"
        >
          <HugeiconsIcon :icon="Note01Icon" :size="20" :stroke-width="2" class="text-slate-400 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>
        
        <div class="h-6 w-px bg-slate-200/60 dark:bg-white/5 mx-2"></div>
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
</style>


