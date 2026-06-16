<script setup lang="ts">
import { ref, markRaw, onMounted, computed, watch } from 'vue'
import UserProfileModal from './UserProfileModal.vue'
import { useRoute, useRouter } from 'vue-router'
import logoImg from '../../assets/logo.png'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../../stores/theme.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { isMobileSidebarOpen, closeMobileSidebar } from '../../composables/useSidebar'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Route01Icon,
  Logout01Icon,
  ArrowRight01Icon,
  Shield01Icon,
  Layout01Icon,
  User02Icon,
  CpuIcon,
  UserGroupIcon,
  Car01Icon,
  ServiceIcon,
  Shield02Icon,
  Sun01Icon,
  Moon01Icon,
  Settings02Icon,
  MapsIcon
} from '@hugeicons/core-free-icons'

const isExpanded = ref(false)
const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const { t } = i18n
const themeStore = useThemeStore()
const authStore = useAuthStore()
const groupStore = useGroupStore()

const showProfileModal = ref(false)
const isProfileMenuOpen = ref(false)

const openMyProfile = () => {
  showProfileModal.value = true
  isProfileMenuOpen.value = false
}

onMounted(() => {
  const savedState = localStorage.getItem('sidebarExpanded')
  if (savedState !== null) {
    isExpanded.value = savedState === 'true'
  }

  authStore.fetchUserProfile(router, (lang: string) => {
    if (typeof i18n.locale === 'string') {
      (i18n.locale as any) = lang
    } else {
      i18n.locale.value = lang
    }
  })
})

const toggleSidebar = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('sidebarExpanded', String(isExpanded.value))
}

// t ya está extraído arriba

watch(() => route.path, () => {
  if (isMobileSidebarOpen.value) {
    closeMobileSidebar()
  }
})

type MenuItem = {
  separator?: boolean;
  icon?: any;
  text?: string;
  route?: string;
  adminOnly?: boolean;
  permissionId?: number;
};

const displayedMenuItems = computed(() => {
  const menuItems: MenuItem[] = [
    { icon: markRaw(User02Icon), text: t('sidebar.menu.users') || 'Usuarios', route: '/usuarios', permissionId: 7 },
    { icon: markRaw(Shield01Icon), text: t('sidebar.menu.roles') || 'Roles y Permisos', route: '/roles', permissionId: 2 },
    { icon: markRaw(UserGroupIcon), text: t('sidebar.menu.groups') || 'Grupos', route: '/grupos', adminOnly: true },

    { separator: true },

    { icon: markRaw(Layout01Icon), text: t('sidebar.menu.dashboard') || 'Dashboard', route: '/dashboard' },

    { separator: true },

    { icon: markRaw(Car01Icon), text: t('sidebar.menu.vehicles') || 'Vehículos', route: '/vehiculos' },
    { icon: markRaw(ServiceIcon), text: t('sidebar.menu.serviceVehicles') || 'Veh. Servicio', route: '/vehiculos-servicio' },

    { separator: true },

    { icon: markRaw(CpuIcon), text: t('sidebar.menu.hardware') || 'Hardware', route: '/hardware', permissionId: 11 },

    { separator: true },

    { icon: markRaw(Shield02Icon), text: t('sidebar.menu.bodyguards') || 'Escoltas', route: '/escoltas', permissionId: 20 },
    { icon: markRaw(Route01Icon), text: t('sidebar.menu.routes') || 'Rutas', route: '/rutas', permissionId: 22 },
    { icon: markRaw(MapsIcon), text: t('sidebar.menu.geofences') || 'Geocercas', route: '/geocercas', permissionId: 26 },

    { separator: true },

    { icon: markRaw(ServiceIcon), text: t('sidebar.menu.services') || 'Servicios', route: '/servicios' },
    { icon: markRaw(Layout01Icon), text: 'Servicios Dashboard', route: '/servicios/dashboard' }
  ]

  // Si es superadmin, mostrar todos los items (excepto adminOnly que requiere isAdmin)
  if (authStore.isSuperAdmin) {
    const allowedItems = menuItems.filter(item => {
      if (item.separator) return true
      if (item.adminOnly && !authStore.isAdmin) return false
      return true
    })

    const finalItems: MenuItem[] = []
    for (let i = 0; i < allowedItems.length; i++) {
      const item = allowedItems[i]
      if (!item) continue
      if (item.separator) {
        if (finalItems.length === 0) continue
        if (finalItems[finalItems.length - 1]?.separator) continue
        const hasValidItemAfter = allowedItems.slice(i + 1).some(x => !x?.separator)
        if (!hasValidItemAfter) continue
      }
      finalItems.push(item)
    }
    return finalItems
  }

  // Usuario normal: filtrar por permisos de "List"
  const allowedItems = menuItems.filter(item => {
    if (item.separator) return true
    if (item.adminOnly) return false
    if (item.permissionId && !authStore.hasPermission(item.permissionId)) return false
    return true
  })

  const finalItems: MenuItem[] = []
  for (let i = 0; i < allowedItems.length; i++) {
    const item = allowedItems[i]
    if (!item) continue
    if (item.separator) {
      if (finalItems.length === 0) continue
      if (finalItems[finalItems.length - 1]?.separator) continue
      const hasValidItemAfter = allowedItems.slice(i + 1).some(x => !x?.separator)
      if (!hasValidItemAfter) continue
    }
    finalItems.push(item)
  }

  return finalItems
})

const isActiveRoute = (menuRoute: string | undefined): boolean => {
  if (!menuRoute) return false
  const currentPath = route.path
  if (menuRoute === '/') {
    return currentPath === '/'
  }
  if (menuRoute === '/servicios' && currentPath.startsWith('/servicios/dashboard')) {
    return false
  }
  return currentPath === menuRoute || currentPath.startsWith(`${menuRoute}/`)
}

// Prefetch Predictivo: Descarga el chunk de la ruta cuando el usuario hace hover
const prefetchedRoutes = new Set<string>()

const prefetchRoute = (routePath: string | undefined) => {
  if (!routePath || routePath === '/' || prefetchedRoutes.has(routePath)) return
  
  const targetRoute = router.getRoutes().find(r => r.path === routePath || r.path === `/${routePath.replace(/^\//, '')}`)
  if (targetRoute && typeof targetRoute.components?.default === 'function') {
    (targetRoute.components.default as () => Promise<any>)()
    prefetchedRoutes.add(routePath)
  }
}

const cerrarSesion = () => {
  authStore.logout(router)
}
</script>

<template>
  <!-- Overlay para móviles Glass -->
  <div 
    v-if="isMobileSidebarOpen"
    @click="closeMobileSidebar"
    class="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md z-40 md:hidden transition-all duration-500 ease-out"
  ></div>

  <aside
    class="h-full flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex-shrink-0 z-[150] pt-8 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)]"
    :class="[
      isExpanded ? 'md:w-[240px]' : 'md:w-[72px]',
      'fixed md:relative top-0 left-0 w-[240px] md:translate-x-0 h-full',
      isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- Header / Logo -->
    <div class="w-full px-5 mb-6 h-[40px] shrink-0 flex items-center justify-between">
      <div 
        class="h-full bg-[#3b82f6] dark:bg-[#5da6fc] transition-all duration-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_0_20px_rgba(93,166,252,0.4)] flex-1"
        :style="{
          WebkitMaskImage: `url(${logoImg})`,
          maskImage: `url(${logoImg})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'left center',
          maskPosition: 'left center'
        }"
      ></div>
      
      <!-- Botón Toggle Sidebar -->
      <button
        @click="toggleSidebar"
        class="hidden md:flex w-8 h-8 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-200 cursor-pointer shrink-0 ml-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-transform duration-300 ease-in-out" :class="isExpanded ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <!-- Navegación -->
    <nav class="flex-1 px-2 overflow-y-auto custom-scrollbar space-y-1 pb-4">
      <template v-if="authStore.isLoading">
        <div v-for="i in 8" :key="i" class="w-full h-[42px] rounded-[14px] bg-slate-100 dark:bg-white/5 animate-pulse"></div>
      </template>
      <template v-else>
        <template v-for="(item, index) in displayedMenuItems" :key="index">
          <div v-if="item.separator" class="py-3 px-2">
            <div class="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent"></div>
          </div>
          
          <RouterLink
            v-else
            :to="item.route || ''"
            @mouseenter="prefetchRoute(item.route)"
            @focusin="prefetchRoute(item.route)"
            class="group relative flex items-center h-[42px] rounded-[14px] transition-all duration-500 outline-none active:scale-[0.96] overflow-hidden px-3"
            :class="[
              isActiveRoute(item.route)
                ? 'bg-gradient-to-r from-[#3b82f6]/15 to-transparent dark:from-[#3b82f6]/20 border border-[#3b82f6]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(59,130,246,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(59,130,246,0.15)]'
                : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] shadow-none'
            ]"
          >
            <!-- Background Glow on Hover -->
            <div class="absolute inset-0 bg-[#3b82f6]/0 group-hover:bg-[#3b82f6]/5 transition-colors duration-500"></div>

            <div class="flex items-center w-full relative z-10 gap-3">
              <div 
                class="w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-500 rounded-lg"
                :class="isActiveRoute(item.route) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-500 dark:text-slate-500 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] group-hover:bg-[#3b82f6]/10'"
              >
                <HugeiconsIcon :icon="item.icon" :size="18" :stroke-width="isActiveRoute(item.route) ? 2.5 : 1.8" />
              </div>

              <span 
                class="text-[12px] font-bold tracking-tight transition-all duration-500 overflow-hidden whitespace-nowrap inline-block"
                :class="[
                  isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0',
                  isActiveRoute(item.route) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]'
                ]"
              >
                {{ item.text }}
              </span>
            </div>
          </RouterLink>
        </template>
      </template>
    </nav>

    <!-- Overlay transparente para cerrar el menú flotante al hacer clic fuera -->
    <div 
      v-if="isProfileMenuOpen" 
      @click="isProfileMenuOpen = false" 
      class="fixed inset-0 z-[190] bg-transparent cursor-default"
    ></div>

    <!-- Menú Flotante de Usuario (Dropdown) -->
    <transition name="fade-slide-right">
      <div 
        v-if="isProfileMenuOpen"
        class="absolute bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[18px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 z-[200] transition-all duration-300"
        :class="[
          isExpanded 
            ? 'bottom-[76px] left-3 right-3 w-auto md:left-[248px] md:bottom-4 md:w-[230px]' 
            : 'bottom-[76px] left-3 right-3 w-auto md:left-[80px] md:bottom-4 md:w-[230px]'
        ]"
      >
        <!-- Header de Usuario -->
        <div class="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-white/5 rounded-t-[14px] mb-1.5">
          <img :src="authStore.userAvatar" class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10" />
          <div class="flex-1 overflow-hidden">
            <p class="text-[13px] font-bold text-slate-800 dark:text-white truncate mb-0.5">{{ authStore.userData.nombre || $t('sidebar.defaultUser') }}</p>
            <p class="text-[11px] text-[#3b82f6] dark:text-[#5da6fc] font-semibold truncate">{{ authStore.userData.email || groupStore.selectedGroup.nombre }}</p>
          </div>
        </div>

        <!-- Opciones del Menú -->
        <div class="space-y-1">
          <button 
            @click="openMyProfile"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-gradient-to-r hover:from-[#3b82f6]/10 hover:to-transparent border border-transparent hover:border-[#3b82f6]/20 dark:hover:border-[#3b82f6]/30 transition-all duration-300 text-left active:scale-[0.97] group/opt"
          >
            <div class="w-6 h-6 flex items-center justify-center shrink-0 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover/opt:bg-[#3b82f6]/10 group-hover/opt:text-[#3b82f6] dark:group-hover/opt:text-[#5da6fc] transition-colors duration-300">
              <HugeiconsIcon :icon="User02Icon" :size="15" />
            </div>
            <span>{{ $t('sidebar.profile') || 'Mi Perfil' }}</span>
          </button>

          <button 
            @click="themeStore.toggle(); isProfileMenuOpen = false"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-gradient-to-r hover:from-[#3b82f6]/10 hover:to-transparent border border-transparent hover:border-[#3b82f6]/20 dark:hover:border-[#3b82f6]/30 transition-all duration-300 text-left active:scale-[0.97] group/opt"
          >
            <div class="w-6 h-6 flex items-center justify-center shrink-0 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover/opt:bg-[#3b82f6]/10 group-hover/opt:text-[#3b82f6] dark:group-hover/opt:text-[#5da6fc] transition-colors duration-300">
              <HugeiconsIcon :icon="themeStore.isDark ? Sun01Icon : Moon01Icon" :size="15" />
            </div>
            <span>{{ themeStore.isDark ? ($t('sidebar.switchToLight') || 'Modo Claro') : ($t('sidebar.switchToDark') || 'Modo Oscuro') }}</span>
          </button>

          <div class="h-px bg-slate-100 dark:bg-white/10 my-1.5"></div>

          <button 
            @click="cerrarSesion(); isProfileMenuOpen = false"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[12px] font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500/80 border border-transparent hover:border-red-600 transition-all duration-300 text-left active:scale-[0.97] group/opt"
          >
            <div class="w-6 h-6 flex items-center justify-center shrink-0 rounded-md bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 group-hover/opt:bg-white/10 group-hover/opt:text-white transition-colors duration-300">
              <HugeiconsIcon :icon="Logout01Icon" :size="15" />
            </div>
            <span>{{ $t('sidebar.logout') || 'Cerrar Sesión' }}</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Footer / Perfil -->
    <div class="px-3 pb-3 bg-transparent border-t border-slate-200/70 dark:border-white/5 relative">
      <div class="w-full pt-3">
        <button
          @click="isProfileMenuOpen = !isProfileMenuOpen"
          class="w-full flex items-center gap-3 rounded-[12px] hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-300 group/user relative text-left animate-none px-3 py-2"
        >
          <!-- Avatar -->
          <img 
            :src="authStore.userAvatar" 
            class="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10 transition-all duration-300 shrink-0"
            :class="!isExpanded && isProfileMenuOpen ? 'ring-2 ring-[#3b82f6] dark:ring-[#5da6fc]' : ''"
          />
          
          <!-- Info -->
          <div 
            class="flex-1 text-left overflow-hidden whitespace-nowrap transition-all duration-500"
            :class="isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'"
          >
            <p class="text-[13px] font-bold text-slate-800 dark:text-white truncate mb-0.5 group-hover/user:text-[#3b82f6] dark:group-hover/user:text-[#5da6fc] transition-colors">{{ authStore.userData.nombre || $t('sidebar.defaultUser') }}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ authStore.userData.email || groupStore.selectedGroup.nombre }}</p>
          </div>

          <!-- Selector Icon -->
          <div 
            class="text-slate-400 dark:text-slate-500 shrink-0 transition-all duration-500 overflow-hidden"
            :class="isExpanded ? 'opacity-100 max-w-[20px]' : 'opacity-0 max-w-0'"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  </aside>

  <UserProfileModal 
    :isOpen="showProfileModal" 
    @update:isOpen="showProfileModal = $event" 
    @profileUpdated="() => authStore.fetchUserProfile(router, (lang: string) => { 
      if (typeof i18n.locale === 'string') {
        (i18n.locale as any) = lang
      } else {
        i18n.locale.value = lang
      }
    })"
    :userData="authStore.userData" 
  />
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

aside {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1D24; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* Transición del menú flotante hacia la derecha */
.fade-slide-right-enter-active,
.fade-slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}
.fade-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-12px) scale(0.95);
}
</style>


