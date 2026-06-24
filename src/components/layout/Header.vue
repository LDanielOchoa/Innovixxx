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
  const tokenWs = localStorage.getItem('auth-token-ws') || ''
  const groupId = groupStore.selectedGroup?.id || localStorage.getItem('auth-grupo-id') || ''
  const url = `/tracking?token_ws=${encodeURIComponent(tokenWs)}&group_id=${encodeURIComponent(groupId)}`
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
  <header class="h-[68px] flex items-center justify-between relative z-[110] shrink-0 px-4 md:px-6 transition-all duration-500 bg-[#13161C]/80 dark:bg-[#13161C]/90 backdrop-blur-xl border-b border-white/5 dark:border-white/5">
    <!-- Subtle top gradient for readability -->
    <div class="absolute inset-0 bg-gradient-to-b from-[#13161C]/40 dark:from-[#13161C]/50 via-transparent to-transparent pointer-events-none"></div>
    
    <!-- Left: Greeting -->
    <div class="flex items-center animate-fade-in">
      <div>
        <p class="text-sm font-black text-white/90 dark:text-white/80 tracking-tight leading-none mb-0.5">Hola, {{ authStore.userData.nombre }}</p>
        <p class="text-[11px] font-medium text-white/50 dark:text-white/40 tracking-tight leading-none">{{ t('header.workToday') || '¿En qué deseas trabajar hoy?' }}</p>
      </div>
    </div>
    
    <!-- Right: Group Selector + Actions -->
    <div class="flex items-center gap-3 animate-fade-in">
      <!-- Group Selector -->
      <div class="flex items-center relative group-selector">
        <div class="relative">
          <button 
            @click="toggleMenu"
            class="flex items-center gap-2 transition-all duration-300 outline-none px-2 py-1 rounded-xl group/btn relative overflow-hidden active:scale-[0.98] hover:bg-white/5 dark:hover:bg-white/5"
            :class="isMenuOpen ? 'bg-white/5 dark:bg-white/5' : ''"
          >
            <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-[shimmer_1.5s_ease-in-out]"></div>

            <div class="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-white/60 dark:text-white/60 group-hover/btn:text-[#5da6fc] transition-all duration-500 overflow-hidden relative z-10">
              <img v-if="groupStore.selectedGroup.logo" :src="groupStore.selectedGroup.logo" class="w-full h-full object-cover shrink-0 relative z-10" />
              <HugeiconsIcon v-else :icon="UserGroupIcon" :size="14" :stroke-width="1.8" class="relative z-10" />
            </div>

            <div class="flex items-center gap-1.5 relative z-10">
              <span class="text-[13px] font-semibold text-white/80 dark:text-white/70 tracking-tight leading-none group-hover/btn:text-[#5da6fc] dark:group-hover/btn:text-[#5da6fc] transition-colors duration-300">
                {{ groupStore.selectedGroup.nombre }}
              </span>
              <HugeiconsIcon 
                v-if="groups.length > 1"
                :icon="ArrowDown01Icon" 
                :size="12" 
                :stroke-width="3"
                class="text-white/40 dark:text-white/40 transition-all duration-500 group-hover/btn:text-[#5da6fc] dark:group-hover/btn:text-[#5da6fc]"
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
              class="absolute top-[calc(100%+8px)] right-0 w-[280px] bg-[#13161C]/95 backdrop-blur-2xl border border-white/5 dark:border-white/5 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[120]"
            >
              <!-- Header del Dropdown -->
              <div class="relative px-4 pt-4 pb-3 border-b border-white/5 overflow-hidden">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-[10px] font-semibold text-white/40 uppercase tracking-[0.15em]">{{ t('header.availableGroups') }}</span>
                  <span class="text-[10px] font-semibold text-white/30">
                    {{ groups.length }}
                  </span>
                </div>
                
                <!-- Buscador -->
                <div v-if="groups.length > 5" class="relative group/search">
                  <div class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/search:text-[#5da6fc] transition-colors z-10">
                    <HugeiconsIcon :icon="Search01Icon" :size="14" />
                  </div>
                  <input 
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('header.searchPlaceholder')"
                    class="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-[11px] font-medium text-white/80 outline-none placeholder:text-white/30 focus:border-[#5da6fc]/30 focus:ring-1 focus:ring-[#5da6fc]/10 transition-all duration-300"
                  />
                </div>
              </div>

              <!-- Lista de Grupos -->
              <div class="max-h-[260px] overflow-y-auto dropdown-scrollbar px-2 py-2 space-y-0.5">
                <template v-if="isRefreshing">
                  <div v-for="n in 3" :key="'skel-' + n" class="w-full px-3 py-2.5 animate-pulse">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-white/5"></div>
                      <div class="h-3 bg-white/5 rounded-full w-2/3"></div>
                    </div>
                  </div>
                </template>
                
                <template v-else-if="filteredGroups.length === 0">
                  <div class="py-8 text-center flex flex-col items-center gap-2">
                    <div class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                      <HugeiconsIcon :icon="Search01Icon" :size="18" :stroke-width="1.5" />
                    </div>
                    <p class="text-[11px] font-medium text-white/30">{{ t('header.noResults') || 'Sin resultados' }}</p>
                  </div>
                </template>

                <template v-else>
                  <button 
                    v-for="group in filteredGroups" 
                    :key="group.id"
                    @click="selectGroup(group)"
                    class="w-full flex items-center justify-between px-3 py-2 transition-all duration-200 rounded-lg outline-none group/item relative select-none"
                    :class="[
                      groupStore.selectedGroup.id === group.id 
                        ? 'bg-[#5da6fc]/10 text-[#5da6fc]' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                    ]"
                  >
                    <div class="flex items-center gap-2.5">
                      <div
                        class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center overflow-hidden"
                        :class="groupStore.selectedGroup.id === group.id
                          ? 'bg-[#5da6fc]/20'
                          : 'bg-white/5'"
                      >
                        <img v-if="group.logo" :src="group.logo" class="w-full h-full object-cover shrink-0" />
                        <HugeiconsIcon v-else :icon="UserGroupIcon" :size="14" :stroke-width="1.8" />
                      </div>
                      <span
                        class="text-[12px] font-medium tracking-tight truncate max-w-[140px]"
                      >{{ group.nombre }}</span>
                    </div>
                    
                    <div v-if="groupStore.selectedGroup.id === group.id" class="w-5 h-5 rounded bg-[#5da6fc] flex items-center justify-center text-white shrink-0">
                      <HugeiconsIcon :icon="Tick01Icon" :size="10" :stroke-width="3.5" />
                    </div>
                  </button>
                </template>
              </div>
              
              <!-- Footer con Sync -->
              <div class="px-2 pt-1 pb-3 border-t border-white/5">
                <button 
                  class="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#5da6fc]/10 hover:bg-[#5da6fc]/20 border border-[#5da6fc]/20 hover:border-[#5da6fc]/30 transition-all duration-200 w-full rounded-lg text-[#5da6fc] active:scale-[0.98]" 
                  @click="refreshPage" 
                  :disabled="isRefreshing"
                >
                  <HugeiconsIcon :icon="RefreshIcon" :size="13" :stroke-width="2" :class="{ 'animate-spin': isRefreshing }" />
                  <span class="text-[10px] font-semibold uppercase tracking-[0.1em]">{{ isRefreshing ? t('header.syncing') : t('header.syncData') }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-white/10 dark:bg-white/10"></div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5">
        <button 
          @click="openTrackingWindow"
          :title="t('header.tracking')"
          class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Location01Icon" :size="17" :stroke-width="2" class="text-white/60 dark:text-white/60 group-hover:text-[#5da6fc] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.playback')"
          class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="PlayIcon" :size="17" :stroke-width="2" class="text-white/60 dark:text-white/60 group-hover:text-[#5da6fc] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.alarms')"
          class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 group focus:outline-none relative shrink-0"
        >
          <HugeiconsIcon :icon="Notification03Icon" :size="17" :stroke-width="2" class="text-white/60 dark:text-white/60 group-hover:text-[#5da6fc] dark:group-hover:text-[#5da6fc] transition-colors" />
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#13161C] dark:border-[#13161C] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
        </button>

        <button 
          :title="t('header.services')"
          class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Settings02Icon" :size="17" :stroke-width="2" class="text-white/60 dark:text-white/60 group-hover:text-[#5da6fc] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>

        <button 
          :title="t('header.reports')"
          class="flex items-center justify-center w-9 h-9 rounded-[12px] bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-200 active:scale-95 group focus:outline-none shrink-0"
        >
          <HugeiconsIcon :icon="Note01Icon" :size="17" :stroke-width="2" class="text-white/60 dark:text-white/60 group-hover:text-[#5da6fc] dark:group-hover:text-[#5da6fc] transition-colors" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

header {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar,
.dropdown-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track,
.dropdown-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb,
.dropdown-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb,
.dark .dropdown-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.18);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover,
.dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover,
.dark .dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(93, 166, 252, 0.4);
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


