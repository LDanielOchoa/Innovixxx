<script setup lang="ts">
import { ref, markRaw, onMounted, reactive, computed, watch } from 'vue'
import UserProfileModal from './UserProfileModal.vue'
import { useRoute, useRouter } from 'vue-router'
import logoImg from '../../assets/logo.png'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../../composables/useTheme'
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
const { locale } = useI18n()
const { isDark, toggle } = useTheme()

const showProfileModal = ref(false)

const userData = reactive({
  nombre: '',
  email: '',
  grupo: '',
  idioma: '',
  tz: '',
  foto: '',
  isAdmin: false
})

const fotoUsuario = computed(() => {
  return obtenerUrlImagen(userData.foto)
})

import { useGroup } from '../../composables/useGroup'
const { selectedGroup, setGroup } = useGroup()

onMounted(() => {
  const savedState = localStorage.getItem('sidebarExpanded')
  if (savedState !== null) {
    isExpanded.value = savedState === 'true'
  }

  fetchUserData()
})

const fetchUserData = async () => {
  const token = localStorage.getItem('auth-token')
  
  if (!token) {
    router.push('/login')
    return
  }

  try {
    const response = await fetch('/api/v1/get_meta/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Token inválido o expirado')
    }

    const data = await response.json()
    
    if (data.done && data.data) {
      userData.nombre = data.data.nombre
      userData.email = data.data.email || ''
      userData.grupo = data.data.grupo
      if (data.data.grupo) {
        const idGrupoCrudo = typeof data.data.id_grupo === 'string' ? data.data.id_grupo.trim() : ''
        const idGrupoValido = idGrupoCrudo.length === 8 ? idGrupoCrudo : ''
        setGroup({ id: idGrupoValido, nombre: data.data.grupo })
      }
      userData.idioma = data.data.idioma
      userData.tz = data.data.tz
      userData.foto = data.data.foto || ''

      if (data.data.idioma) {
        locale.value = data.data.idioma
        localStorage.setItem('app-locale', data.data.idioma)
      }
      
      try {
        const adminRes = await fetch('/api/v1/grupo/listar/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        
        if (!adminRes.ok) {
           userData.isAdmin = false;
        } else {
           const adminData = await adminRes.json();
           if (adminData.done === false && adminData.message === 'Operación no permitida') {
             userData.isAdmin = false;
           } else {
             userData.isAdmin = true;
           }
        }
      } catch (err) {
        console.error('Error verificando admin status', err);
        userData.isAdmin = false;
      }
      
    } else {
      throw new Error('Datos no válidos')
    }
  } catch (error) {
    console.error('Error al obtener metadatos:', error)
    limpiarCookiesExceptoIdioma()
    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-grupo')
    router.push('/login')
  } finally {
    isLoading.value = false
  }
}

const toggleSidebar = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('sidebarExpanded', String(isExpanded.value))
}

const { t } = useI18n()

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
    return !item.adminOnly || userData.isAdmin
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

const limpiarCookiesExceptoIdioma = () => {
  const cookies = document.cookie.split(';')
  cookies.forEach((cookie) => {
    const nombre = cookie.split('=')[0]?.trim()
    if (nombre && nombre !== 'app-locale') {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  })
}

const cerrarSesion = () => {
  limpiarCookiesExceptoIdioma()
  localStorage.removeItem('auth-token')
  localStorage.removeItem('auth-grupo')
  router.push('/login')
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
      class="hidden md:flex absolute -right-4 top-10 w-9 h-9 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-2xl items-center justify-center text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] shadow-[0_4px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.4)] transition-all duration-300 z-50 cursor-pointer active:scale-90 active:translate-y-[1px]"
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
    <nav class="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-1.5 pb-6">
      <template v-if="isLoading">
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
            class="group relative flex items-center h-12 rounded-2xl transition-all duration-300 outline-none active:scale-95 active:translate-y-[1px]"
            :class="[
              isActiveRoute(item.route)
                ? 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border border-[#3b82f6]/20 dark:border-[#3b82f6]/20'
                : 'hover:bg-slate-50 dark:hover:bg-white/5'
            ]"
          >
            <div class="flex items-center w-full px-3 gap-3">
              <div 
                class="w-10 h-10 flex items-center justify-center transition-all duration-300"
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
    <div class="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-200/50 dark:border-white/5 space-y-3">
      <!-- Card Usuario -->
      <button
        @click="showProfileModal = true"
        class="w-full flex items-center gap-3 p-2 rounded-2xl transition-all duration-300 hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200/50 dark:hover:border-white/10 active:scale-95 group/user"
        :class="!isExpanded ? 'justify-center' : ''"
      >
        <div class="relative shrink-0">
          <img :src="fotoUsuario" class="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-[#1A1D24] shadow-sm" />
        </div>
        
        <div 
          class="flex-1 text-left transition-all duration-500 overflow-hidden whitespace-nowrap"
          :class="isExpanded ? 'opacity-100' : 'opacity-0 w-0'"
        >
          <p class="text-[13px] font-black text-slate-800 dark:text-white truncate tracking-tight">{{ userData.nombre || $t('sidebar.defaultUser') }}</p>
          <p class="text-[9px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-widest opacity-80 truncate">{{ selectedGroup.nombre || userData.grupo || $t('sidebar.defaultGroup') }}</p>
        </div>
        
        <HugeiconsIcon v-if="isExpanded" :icon="Settings02Icon" :size="14" class="text-slate-300 dark:text-slate-600 group-hover/user:rotate-90 transition-transform duration-500" />
      </button>

      <!-- Controles Rápidos -->
      <div class="flex gap-2" :class="isExpanded ? 'flex-row' : 'flex-col items-center'">
        <button
          @click="toggle"
          class="h-11 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] transition-all duration-300 active:scale-90"
          :class="isExpanded ? 'flex-1' : 'w-11'"
        >
          <HugeiconsIcon :icon="isDark ? Sun01Icon : Moon01Icon" :size="18" :stroke-width="2" />
        </button>

        <button
          @click="cerrarSesion"
          class="h-11 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-red-500 transition-all duration-300 active:scale-90"
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
    @profileUpdated="fetchUserData"
    :userData="userData" 
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


