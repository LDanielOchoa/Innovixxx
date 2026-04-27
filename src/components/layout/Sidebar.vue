<script setup lang="ts">
import { ref, markRaw, onMounted, reactive, computed, watch } from 'vue'
import UserProfileModal from './UserProfileModal.vue'
import { useRoute, useRouter } from 'vue-router'
import logoImg from '../../assets/logo.png'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../../stores/theme.store'
import { useAuthStore } from '../../stores/auth.store'
import { useGroupStore } from '../../stores/group.store'
import { CookieAuth } from '../../utils/cookie-auth'
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
  Shield02Icon,
  Sun01Icon,
  Moon01Icon,
  Cancel01Icon,
  Settings02Icon
} from '@hugeicons/core-free-icons'
import { obtenerUrlImagen } from '../../utils/imagenes'

const isExpanded = ref(false)
const router = useRouter()
const route = useRoute()
const isLoading = ref(true)
const i18n = useI18n()
const { locale, t } = i18n
const themeStore = useThemeStore()
const authStore = useAuthStore()
const groupStore = useGroupStore()

const showProfileModal = ref(false)

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
};

const displayedMenuItems = computed(() => {
  const menuItems: MenuItem[] = [
    { icon: markRaw(User02Icon), text: t('sidebar.menu.users') || 'Usuarios', route: '/usuarios' },
    { icon: markRaw(Shield01Icon), text: t('sidebar.menu.roles') || 'Roles y Permisos', route: '/roles' },
    { icon: markRaw(UserGroupIcon), text: t('sidebar.menu.groups') || 'Grupos', route: '/grupos', adminOnly: true },
    
    { separator: true },
    
    { icon: markRaw(Layout01Icon), text: t('sidebar.menu.dashboard') || 'Dashboard', route: '/dashboard' },
    
    { separator: true },
    
    { icon: markRaw(Car01Icon), text: t('sidebar.menu.vehicles') || 'Vehículos', route: '/vehiculos' },
    
    { separator: true },
    
    { icon: markRaw(CpuIcon), text: t('sidebar.menu.hardware') || 'Hardware', route: '/hardware' },
    
    { separator: true },
    
    { icon: markRaw(Shield02Icon), text: t('sidebar.menu.bodyguards') || 'Escoltas', route: '/escoltas' },
    { icon: markRaw(Route01Icon), text: t('sidebar.menu.routes') || 'Rutas', route: '/rutas' }
  ]
  return menuItems.filter(item => {
    return !item.adminOnly || authStore.isAdmin
  })
})

const isActiveRoute = (menuRoute: string | undefined): boolean => {
  if (!menuRoute) return false
  const currentPath = route.path
  if (menuRoute === '/') {
    return currentPath === '/'
  }
  return currentPath === menuRoute || currentPath.startsWith(`${menuRoute}/`)
}

// Prefetch Predictivo: Descarga el chunk de la ruta cuando el usuario hace hover
const prefetchedRoutes = new Set<string>()

const prefetchRoute = (routePath: string | undefined) => {
  if (!routePath || routePath === '/' || prefetchedRoutes.has(routePath)) return
  
  const targetRoute = router.getRoutes().find(r => r.path === routePath || r.path === `/${routePath.replace(/^\//, '')}`)
  if (targetRoute && typeof targetRoute.components?.default === 'function') {
    targetRoute.components.default() // Inicia la descarga
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
    class="h-full flex flex-col bg-white/80 dark:bg-[#13161C]/90 backdrop-blur-3xl border-r border-slate-200/50 dark:border-white/5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex-shrink-0 z-[150] pt-8 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)]"
    :class="[
      isExpanded ? 'md:w-[280px]' : 'md:w-[88px]',
      'fixed md:relative top-0 left-0 w-[280px] md:translate-x-0 h-full',
      isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- Botón Toggle 3D -->
    <button
      @click="toggleSidebar"
      class="hidden md:flex absolute -right-4 top-10 w-9 h-9 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] shadow-[0_3px_0_#e2e8f0] dark:shadow-[0_3px_0_#000000] transition-all duration-300 z-50 cursor-pointer active:translate-y-[2px] active:shadow-none"
    >
      <HugeiconsIcon 
        :icon="ArrowRight01Icon"
        :size="18" 
        :stroke-width="2.5" 
        class="transition-transform duration-500" 
        :class="isExpanded ? 'rotate-180' : 'rotate-0'" 
      />
    </button>

    <!-- Header / Logo -->
    <div class="w-full px-6 mb-10 h-[52px] shrink-0 flex items-center justify-center">
      <div 
        class="w-full h-full bg-[#3b82f6] dark:bg-[#5da6fc] animate-[float_6s_ease-in-out_infinite] transition-all duration-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_0_20px_rgba(93,166,252,0.4)]"
        :style="{
          WebkitMaskImage: `url(${logoImg})`,
          maskImage: `url(${logoImg})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center'
        }"
      ></div>
    </div>

    <!-- Navegación -->
    <nav class="flex-1 px-3 overflow-y-auto custom-scrollbar space-y-1.5 pb-6">
      <template v-if="authStore.isLoading">
        <div v-for="i in 8" :key="i" class="w-full h-12 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse"></div>
      </template>
      <template v-else>
        <template v-for="(item, index) in displayedMenuItems" :key="index">
          <div v-if="item.separator" class="py-4 px-2">
            <div class="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent"></div>
          </div>
          
          <RouterLink
            v-else
            :to="item.route || ''"
            @mouseenter="prefetchRoute(item.route)"
            @focusin="prefetchRoute(item.route)"
            class="group relative flex items-center h-12 rounded-2xl transition-all duration-300 outline-none active:scale-[0.97] active:translate-y-[1px] px-3"
            :class="[
              isActiveRoute(item.route)
                ? 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border border-[#3b82f6]/20 dark:border-[#3b82f6]/20 shadow-[0_2px_0_#3b82f6/10]'
                : 'hover:bg-slate-50 dark:hover:bg-white/5 shadow-none'
            ]"
          >
            <div class="flex items-center gap-3 w-full">
              <div 
                class="w-10 h-10 flex items-center justify-center shrink-0 transition-all duration-300"
                :class="isActiveRoute(item.route) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'"
              >
                <HugeiconsIcon :icon="item.icon" :size="20" :stroke-width="isActiveRoute(item.route) ? 2.5 : 1.8" />
              </div>

              <span 
                class="text-[13px] font-bold tracking-tight transition-all duration-300 overflow-hidden whitespace-nowrap"
                :class="[
                  isExpanded ? 'opacity-100' : 'opacity-0 w-0',
                  isActiveRoute(item.route) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                ]"
              >
                {{ item.text }}
              </span>
            </div>

            <!-- Active Indicator -->
            <div v-if="isActiveRoute(item.route)" class="absolute left-0 top-3 bottom-3 w-1 bg-[#3b82f6] dark:bg-[#5da6fc] rounded-r-full shadow-[2px_0_10px_rgba(59,130,246,0.5)]"></div>
          </RouterLink>
        </template>
      </template>
    </nav>

    <!-- Footer / Perfil -->
    <div class="p-4 bg-white/40 dark:bg-[#13161C]/40 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 space-y-4">

      <!-- Card Usuario -->
      <button
        @click="showProfileModal = true"
        class="w-full flex items-center gap-3 p-2.5 rounded-[20px] transition-all duration-500 bg-white/50 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 hover:border-[#3b82f6]/30 dark:hover:border-[#3b82f6]/30 hover:bg-white dark:hover:bg-white/5 active:scale-[0.97] active:translate-y-[1px] group/user shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
      >
        <div class="w-11 h-11 flex items-center justify-center shrink-0 relative">
          <div class="absolute inset-0 bg-[#3b82f6]/20 blur-lg rounded-full opacity-0 group-hover/user:opacity-100 transition-opacity duration-500"></div>
          <img :src="authStore.userAvatar" class="w-11 h-11 rounded-[14px] object-cover border-2 border-white dark:border-[#1A1D24] shadow-md relative z-10 transition-transform duration-500 group-hover/user:scale-105" />
        </div>
        
        <div 
          class="flex-1 text-left transition-all duration-500 overflow-hidden whitespace-nowrap"
          :class="isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'"
        >
          <p class="text-[13px] font-black text-slate-800 dark:text-white truncate tracking-tight mb-0.5">{{ authStore.userData.nombre || $t('sidebar.defaultUser') }}</p>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse"></span>
            <p class="text-[9px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.15em] opacity-80 truncate">{{ groupStore.selectedGroup.nombre || authStore.userData.grupo || $t('sidebar.defaultGroup') }}</p>
          </div>
        </div>
        
        <div v-if="isExpanded" class="w-7 h-7 rounded-lg bg-slate-100/50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover/user:text-[#3b82f6] transition-all duration-300">
          <HugeiconsIcon :icon="Settings02Icon" :size="14" class="group-hover/user:rotate-90 transition-transform duration-500" />
        </div>
      </button>

      <!-- Controles Rápidos -->
      <div class="flex gap-2.5" :class="isExpanded ? 'flex-row' : 'flex-col items-center'">
        <button
          @click="themeStore.toggle"
          class="h-11 rounded-[16px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-300 active:translate-y-[2px] active:shadow-none shrink-0 shadow-[0_3px_0_#e2e8f0] dark:shadow-[0_3px_0_#11141a]"
          :class="isExpanded ? 'flex-1' : 'w-11'"
        >
          <HugeiconsIcon :icon="themeStore.isDark ? Sun01Icon : Moon01Icon" :size="18" :stroke-width="2" />
        </button>

        <button
          @click="cerrarSesion"
          class="h-11 rounded-[16px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-300 active:translate-y-[2px] active:shadow-none shrink-0 shadow-[0_3px_0_#e2e8f0] dark:shadow-[0_3px_0_#11141a]"
          :class="isExpanded ? 'flex-1' : 'w-11'"
        >
          <HugeiconsIcon :icon="Logout01Icon" :size="18" :stroke-width="2" />
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
</style>


