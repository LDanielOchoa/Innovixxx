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
                class="absolute top-[calc(100%+14px)] left-0 w-[340px] bg-white/95 dark:bg-[#13161C] backdrop-blur-3xl border border-slate-200/70 dark:border-white/[0.07] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden z-[120]"
              >
                <!-- Header del Dropdown -->
                <div class="relative px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.05] overflow-hidden">
                  <!-- Fondo decorativo -->
                  <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.06] via-transparent to-transparent pointer-events-none"></div>
                  <div class="absolute top-0 right-0 w-24 h-24 bg-[#3b82f6]/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                  <div class="relative flex items-center justify-between mb-4">
                    <span class="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{{ t('header.availableGroups') }}</span>
                    <span class="px-2.5 py-1 rounded-lg bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-500 dark:text-slate-400 shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#1D1D24]">
                      {{ groups.length }}
                    </span>
                  </div>
                  
                  <!-- Buscador -->
                  <div v-if="groups.length > 5" class="relative group/search">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within/search:text-[#3b82f6] dark:group-focus-within/search:text-[#5da6fc] transition-colors z-10">
                      <HugeiconsIcon :icon="Search01Icon" :size="15" />
                    </div>
                    <input 
                      v-model="searchQuery"
                      type="text"
                      :placeholder="t('header.searchPlaceholder')"
                      class="w-full bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] border border-slate-200 dark:border-white/10 rounded-[14px] pl-10 pr-4 py-2.5 text-[12px] font-medium text-slate-700 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#3b82f6]/50 dark:focus:border-[#5da6fc]/50 focus:ring-2 focus:ring-[#3b82f6]/10 transition-all duration-300 shadow-[0_2px_0_#e2e8f0] dark:shadow-[0_2px_0_#1D1D24]"
                    />
                  </div>
                </div>

                <!-- Lista de Grupos -->
                <div class="max-h-[300px] overflow-y-auto dropdown-scrollbar px-3 py-3 space-y-1">
                  <template v-if="isRefreshing">
                    <div v-for="n in 3" :key="'skel-' + n" class="w-full px-3 py-3 animate-pulse">
                      <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-[14px] bg-slate-100 dark:bg-white/5"></div>
                        <div class="h-3.5 bg-slate-100 dark:bg-white/5 rounded-full w-2/3"></div>
                      </div>
                    </div>
                  </template>
                  
                  <template v-else-if="filteredGroups.length === 0">
                    <div class="py-10 text-center flex flex-col items-center gap-3">
                      <div class="w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_16px_rgba(0,0,0,0.3)]">
                        <HugeiconsIcon :icon="Search01Icon" :size="22" :stroke-width="1.5" />
                      </div>
                      <div class="space-y-1">
                        <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">{{ t('header.noResults') || 'Sin resultados' }}</p>
                        <p class="text-[11px] font-medium text-slate-400 dark:text-slate-500">Prueba con otro término</p>
                      </div>
                    </div>
                  </template>

                  <template v-else>
                    <button 
                      v-for="group in filteredGroups" 
                      :key="group.id"
                      @click="selectGroup(group)"
                      class="w-full flex items-center justify-between px-3 py-2.5 transition-all duration-300 rounded-2xl outline-none group/item border overflow-hidden relative select-none"
                      :class="[
                        groupStore.selectedGroup.id === group.id 
                          ? 'bg-gradient-to-b from-white to-slate-50/80 dark:from-[#20242D] dark:to-[#1A1E28] border-[#3b82f6]/40 dark:border-[#3b82f6]/30 shadow-[0_4px_0_#e2e8f0,0_4px_12px_rgba(59,130,246,0.08)] dark:shadow-[0_4px_0_#1D1D24,0_6px_20px_rgba(59,130,246,0.08)]' 
                          : 'bg-gradient-to-b from-white/80 to-slate-50/60 dark:from-[#20242D]/60 dark:to-[#1A1E28]/60 border-slate-200/80 dark:border-white/[0.07] shadow-[0_2px_0_#e2e8f0,0_1px_4px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_0_#1D1D24,0_2px_8px_rgba(0,0,0,0.2)] hover:border-slate-300 dark:hover:border-white/[0.12]'
                      ]"
                    >
                      <!-- Active sidebar bar -->
                      <div
                        class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] shadow-[1px_0_8px_rgba(59,130,246,0.8)] transition-all duration-300"
                        :class="groupStore.selectedGroup.id === group.id ? 'opacity-100 h-[65%]' : 'opacity-0 h-0'"
                      ></div>

                      <!-- Brillo superior -->
                      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent pointer-events-none"></div>

                      <div class="flex items-center gap-3 pl-1">
                        <div
                          class="w-10 h-10 shrink-0 rounded-[14px] flex items-center justify-center transition-all duration-300 border overflow-hidden"
                          :class="groupStore.selectedGroup.id === group.id
                            ? 'bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white border-[#2563eb]/40 shadow-[0_4px_0_#1d4ed8,0_4px_10px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.3)]'
                            : 'bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10 shadow-[0_2px_0_#e2e8f0,0_1px_4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_0_#1D1D24,0_1px_6px_rgba(0,0,0,0.2)] group-hover/item:text-[#3b82f6] dark:group-hover/item:text-[#5da6fc]'"
                        >
                          <img v-if="group.logo" :src="group.logo" class="w-full h-full object-cover" />
                          <HugeiconsIcon v-else :icon="UserGroupIcon" :size="18" :stroke-width="1.8" />
                        </div>
                        <span
                          class="text-[13px] font-black tracking-tight truncate max-w-[170px] transition-colors duration-200"
                          :class="groupStore.selectedGroup.id === group.id ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-white'"
                        >{{ group.nombre }}</span>
                      </div>
                      
                      <div v-if="groupStore.selectedGroup.id === group.id" class="w-7 h-7 rounded-xl bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_3px_0_#1d4ed8,0_4px_10px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#2563eb]/40 shrink-0">
                        <HugeiconsIcon :icon="Tick01Icon" :size="13" :stroke-width="3.5" />
                      </div>
                    </button>
                  </template>
                </div>
                
                <!-- Footer con Sync -->
                <div class="px-3 pt-2 pb-4 border-t border-slate-100 dark:border-white/[0.05]">
                  <div class="relative group/sync">
                    <div class="absolute inset-0 bg-[#3b82f6] blur-lg rounded-[16px] opacity-30 group-hover/sync:opacity-50 transition-opacity duration-300"></div>
                    <button 
                      class="relative flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] hover:from-[#3b82f6] hover:to-[#2563eb] border border-[#2563eb]/50 shadow-[0_4px_0_#1d4ed8,0_6px_15px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_0_#1d4ed8,0_10px_20px_rgba(59,130,246,0.5)] transition-all duration-200 w-full rounded-[16px] active:translate-y-[4px] active:shadow-[0_0px_0_#1d4ed8,0_4px_10px_rgba(59,130,246,0.3)] text-white z-10" 
                      @click="refreshPage" 
                      :disabled="isRefreshing"
                    >
                      <HugeiconsIcon :icon="RefreshIcon" :size="15" :stroke-width="2.5" :class="{ 'animate-spin': isRefreshing }" />
                      <span class="text-[11px] font-black uppercase tracking-[0.15em]">{{ isRefreshing ? t('header.syncing') : t('header.syncData') }}</span>
                    </button>
                  </div>
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
  background: rgba(100, 116, 139, 0.18);
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


