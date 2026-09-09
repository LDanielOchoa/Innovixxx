<script setup lang="ts">
import { ref, markRaw, onMounted, computed, watch } from 'vue'
import UserProfileModal from './UserProfileModal.vue'
import { useRoute, useRouter } from 'vue-router'
import logoImg from '../../assets/logo.png'
import { useI18n } from 'vue-i18n'
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
  Settings02Icon,
  MapsIcon,
  CommandLineIcon,
  Alert01Icon,
  Calendar01Icon,
  ArrowDown01Icon
} from '@hugeicons/core-free-icons'

import { PERMISSIONS } from '../../constants/permissions'

const isExpanded = ref(false)
const openSubmenus = ref<Record<string, boolean>>({})
const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const { t } = i18n
const authStore = useAuthStore()
const groupStore = useGroupStore()

const showProfileModal = ref(false)
const isProfileMenuOpen = ref(false)

const openMyProfile = () => {
  showProfileModal.value = true
  isProfileMenuOpen.value = false
}

import { loadModuleMessages } from '../../i18n'

const updateOpenSubmenusByRoute = (path: string) => {
  displayedMenuItems.value.forEach(item => {
    if (item.children && item.children.some(child => path === child.route || path.startsWith(child.route + '/'))) {
      openSubmenus.value[item.id] = true
    }
  })
}

onMounted(() => {
  const savedState = localStorage.getItem('sidebarExpanded')
  if (savedState !== null) {
    isExpanded.value = savedState === 'true'
  }

  loadModuleMessages('sidebar')

  authStore.fetchUserProfile(router, (lang: string) => {
    if (typeof i18n.locale === 'string') {
      (i18n.locale as any) = lang
    } else {
      i18n.locale.value = lang
    }
  })

  updateOpenSubmenusByRoute(route.path)
})

const toggleSidebar = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem('sidebarExpanded', String(isExpanded.value))
}

const toggleSubmenu = (itemId: string) => {
  if (!isExpanded.value) {
    isExpanded.value = true
  }
  openSubmenus.value[itemId] = !openSubmenus.value[itemId]
}

const isSubmenuOpen = (itemId: string): boolean => {
  return !!openSubmenus.value[itemId]
}

const isParentActive = (item: MenuItem): boolean => {
  if (!item.children) return false
  return item.children.some(child => route.path === child.route || route.path.startsWith(child.route + '/'))
}

// Hooks de animación suave para el submenú desplegable (efecto acordeón con slide & fade)
const onSubmenuBeforeEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0px'
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'translateY(-8px)'
}

const onSubmenuEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.transition = 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
  htmlEl.style.opacity = '1'
  htmlEl.style.transform = 'translateY(0)'
}

const onSubmenuAfterEnter = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = 'auto'
}

const onSubmenuBeforeLeave = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = `${htmlEl.scrollHeight}px`
}

const onSubmenuLeave = (el: Element) => {
  const htmlEl = el as HTMLElement
  void htmlEl.offsetHeight // Forzar reflow para iniciar transición correctamente
  htmlEl.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  htmlEl.style.height = '0px'
  htmlEl.style.opacity = '0'
  htmlEl.style.transform = 'translateY(-8px)'
}

watch(() => route.path, (newPath) => {
  if (isMobileSidebarOpen.value) {
    closeMobileSidebar()
  }
  updateOpenSubmenusByRoute(newPath)
})

type SubMenuItem = {
  icon: any
  text: string
  route: string
  permissionId?: string
  adminOnly?: boolean
  soloGrupoMain?: boolean
}

type MenuItem = {
  id: string
  separator?: boolean
  icon?: any
  text?: string
  route?: string
  adminOnly?: boolean
  soloGrupoMain?: boolean
  permissionId?: string
  children?: SubMenuItem[]
}

const displayedMenuItems = computed(() => {
  const menuItems: MenuItem[] = [
    {
      id: 'item-admin',
      icon: markRaw(Settings02Icon),
      text: t('sidebar.menu.administration'),
      children: [
        {
          icon: markRaw(User02Icon),
          text: t('sidebar.menu.users'),
          route: '/usuarios',
          permissionId: PERMISSIONS.USERS_LIST
        },
        {
          icon: markRaw(Shield01Icon),
          text: t('sidebar.menu.roles'),
          route: '/roles',
          permissionId: PERMISSIONS.ROLES_LIST
        },
        {
          icon: markRaw(UserGroupIcon),
          text: t('sidebar.menu.groups'),
          route: '/grupos',
          adminOnly: true,
          soloGrupoMain: true
        }
      ]
    },

    { id: 'sep-dashboard', separator: true },

    { id: 'item-dashboard', icon: markRaw(Layout01Icon), text: t('sidebar.menu.dashboard'), route: '/dashboard' },

    { id: 'sep-vehicles', separator: true },

    { id: 'item-vehicles', icon: markRaw(Car01Icon), text: t('sidebar.menu.vehicles'), route: '/vehiculos', permissionId: PERMISSIONS.VEHICULOS_LIST },
    { id: 'item-escort-vehicles', icon: markRaw(ServiceIcon), text: t('sidebar.menu.escortVehicles'), route: '/vehiculos-servicio', permissionId: PERMISSIONS.VEHICLE_BODYGUARD_LIST },

    { id: 'sep-devices', separator: true },

    {
      id: 'item-devices',
      icon: markRaw(CpuIcon),
      text: t('sidebar.menu.devices'),
      children: [
        {
          icon: markRaw(CpuIcon),
          text: t('sidebar.menu.hardware'),
          route: '/hardware',
          permissionId: PERMISSIONS.HARDWARE_LIST
        },
        {
          icon: markRaw(CommandLineIcon),
          text: t('sidebar.menu.commands'),
          route: '/comandos',
          permissionId: PERMISSIONS.COMMAND_LIST,
          soloGrupoMain: true
        }
      ]
    },

    { id: 'sep-tracking', separator: true },

    { id: 'item-bodyguards', icon: markRaw(Shield02Icon), text: t('sidebar.menu.bodyguards'), route: '/escoltas', permissionId: PERMISSIONS.ESCOLTA_LIST },
    { id: 'item-routes', icon: markRaw(Route01Icon), text: t('sidebar.menu.routes'), route: '/rutas', permissionId: PERMISSIONS.RUTAS_LIST },
    { id: 'item-geofences', icon: markRaw(MapsIcon), text: t('sidebar.menu.geofences'), route: '/geocercas', permissionId: PERMISSIONS.GEOCERCAS_LIST },

    { id: 'sep-services', separator: true },

    {
      id: 'item-services',
      icon: markRaw(ServiceIcon),
      text: t('sidebar.menu.services'),
      children: [
        {
          icon: markRaw(ServiceIcon),
          text: t('sidebar.menu.servicesManagement'),
          route: '/servicios',
          permissionId: PERMISSIONS.SERVICE_LIST_TABLE
        },
        {
          icon: markRaw(Alert01Icon),
          text: t('sidebar.menu.servicesAlerts'),
          route: '/servicios/alertas',
          permissionId: PERMISSIONS.ALERT_HISTORIAL,
          soloGrupoMain: true
        },
        {
          icon: markRaw(Calendar01Icon),
          text: t('sidebar.menu.servicesEvents'),
          route: '/servicios/eventos',
          permissionId: PERMISSIONS.EVENT_LIST,
          soloGrupoMain: true
        }
      ]
    }
  ]

  if (authStore.isSuperAdmin) {
    const allowedItems = menuItems
      .map(item => {
        if (item.separator) return item
        if (item.adminOnly && !authStore.isAdmin) return null
        if (item.soloGrupoMain && !groupStore.esGrupoMain) return null

        if (item.children && item.children.length > 0) {
          const allowedChildren = item.children.filter(child => {
            if (child.adminOnly && !authStore.isAdmin) return false
            if (child.soloGrupoMain && !groupStore.esGrupoMain) return false
            return true
          })
          if (allowedChildren.length === 0) return null
          return {
            ...item,
            children: allowedChildren
          }
        }

        return item
      })
      .filter((item): item is MenuItem => item !== null)

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

  // Usuario normal: filtrar por permisos de "List", grupo main y validar submenús hijos
  const allowedItems = menuItems
    .map(item => {
      if (item.separator) return item
      if (item.adminOnly) return null
      if (item.soloGrupoMain && !groupStore.esGrupoMain) return null

      // Si tiene hijos (como Administración o Servicios)
      if (item.children && item.children.length > 0) {
        const allowedChildren = item.children.filter(child => {
          if (child.adminOnly) return false
          if (child.soloGrupoMain && !groupStore.esGrupoMain) return false
          if (!child.permissionId) return true
          return authStore.hasPermission(child.permissionId)
        })
        if (allowedChildren.length === 0) return null
        return {
          ...item,
          children: allowedChildren
        }
      }

      if (item.permissionId && !authStore.hasPermission(item.permissionId)) return null
      return item
    })
    .filter((item): item is MenuItem => item !== null)

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
  <div class="contents">
    <!-- Overlay para móviles Glass -->
    <div 
      v-if="isMobileSidebarOpen"
      @click="closeMobileSidebar"
      class="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md z-40 md:hidden transition-all duration-500 ease-out"
    ></div>

    <aside
      class="h-full flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex-shrink-0 z-[150] pt-7 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)]"
      :class="[
        isExpanded ? 'md:w-[265px]' : 'md:w-[82px]',
        'fixed md:relative top-0 left-0 w-[265px] md:translate-x-0 h-full',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Header / Logo -->
      <div class="w-full px-4 mb-5 h-[46px] shrink-0 flex items-center justify-between">
        <RouterLink 
          to="/dashboard"
          class="h-full bg-[#3b82f6] dark:bg-[#5da6fc] transition-all duration-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:drop-shadow-[0_0_20px_rgba(93,166,252,0.4)] flex-1 cursor-pointer"
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
        ></RouterLink>
        
        <!-- Botón Toggle Sidebar -->
        <button
          @click="toggleSidebar"
          class="hidden md:flex w-10 h-10 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer shrink-0 ml-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-transform duration-300 ease-in-out" :class="isExpanded ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 px-3 overflow-y-auto custom-scrollbar space-y-1.5 pb-4">
        <template v-if="authStore.isLoading">
          <div v-for="i in 8" :key="i" class="w-full h-[44px] rounded-[13px] bg-slate-100 dark:bg-white/5 animate-pulse"></div>
        </template>
        <template v-else>
          <TransitionGroup name="menu-item-anim" tag="div" class="space-y-1.5 relative w-full">
            <div 
              v-for="item in displayedMenuItems" 
              :key="item.id"
              class="w-full transition-all duration-300"
            >
              <!-- Separador -->
              <div v-if="item.separator" class="py-2 px-2">
                <div class="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/10 to-transparent"></div>
              </div>

              <!-- Ítem con Submenú (ej: Administración, Dispositivos, Servicios) -->
              <div v-else-if="item.children && item.children.length > 0" class="space-y-1.5">
                <button
                  type="button"
                  @click="toggleSubmenu(item.id)"
                  class="w-full group relative flex items-center h-[44px] rounded-[13px] transition-all duration-500 outline-none active:scale-[0.96] overflow-hidden px-3 cursor-pointer"
                  :class="[
                    isParentActive(item)
                      ? 'bg-gradient-to-r from-[#3b82f6]/15 to-transparent dark:from-[#3b82f6]/20 border border-[#3b82f6]/30'
                      : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10'
                  ]"
                >
                  <div class="flex items-center justify-between w-full relative z-10 gap-2.5">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div
                        class="w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-500 rounded-[10px]"
                        :class="isParentActive(item) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] group-hover:bg-[#3b82f6]/10'"
                      >
                        <HugeiconsIcon :icon="item.icon" :size="20" :stroke-width="isParentActive(item) ? 2.3 : 1.8" />
                      </div>

                      <span
                        class="text-[13.5px] font-bold tracking-tight transition-all duration-500 overflow-hidden whitespace-nowrap inline-block"
                        :class="[
                          isExpanded ? 'opacity-100 max-w-[155px]' : 'opacity-0 max-w-0',
                          isParentActive(item) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-300 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]'
                        ]"
                      >
                        {{ item.text }}
                      </span>
                    </div>

                    <HugeiconsIcon
                      v-if="isExpanded"
                      :icon="ArrowDown01Icon"
                      :size="16"
                      class="text-slate-400 dark:text-slate-500 transition-transform duration-300 shrink-0 mr-0.5"
                      :class="{ 'rotate-180 text-[#3b82f6] dark:text-[#5da6fc]': isSubmenuOpen(item.id) }"
                    />
                  </div>
                </button>

                <!-- Submenú desplegable con animación de acordeón -->
                <Transition
                  name="submenu-accordion"
                  @before-enter="onSubmenuBeforeEnter"
                  @enter="onSubmenuEnter"
                  @after-enter="onSubmenuAfterEnter"
                  @before-leave="onSubmenuBeforeLeave"
                  @leave="onSubmenuLeave"
                >
                  <div
                    v-show="isSubmenuOpen(item.id) && isExpanded"
                    class="overflow-hidden pl-3 ml-4.5 my-1 space-y-1 transition-colors border-l"
                    :class="[
                      isParentActive(item)
                        ? 'border-[#3b82f6]/40 dark:border-[#5da6fc]/40'
                        : 'border-slate-200/80 dark:border-white/10'
                    ]"
                  >
                    <RouterLink
                      v-for="subItem in item.children"
                      :key="subItem.route"
                      :to="subItem.route"
                      @mouseenter="prefetchRoute(subItem.route)"
                      @focusin="prefetchRoute(subItem.route)"
                      @click="closeMobileSidebar"
                      class="group relative flex items-center h-[38px] rounded-[11px] transition-all duration-300 px-3 border cursor-pointer hover:translate-x-1"
                      :class="[
                        route.path === subItem.route
                          ? 'bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] font-bold border-[#3b82f6]/20 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border-transparent'
                      ]"
                    >
                      <div class="flex items-center gap-2.5 z-10 w-full">
                        <HugeiconsIcon
                          :icon="subItem.icon"
                          :size="16.5"
                          class="shrink-0 group-hover:scale-110 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] transition-transform duration-200"
                        />
                        <span class="text-[12.5px] truncate font-semibold">{{ subItem.text }}</span>
                      </div>
                    </RouterLink>
                  </div>
                </Transition>
              </div>

              <!-- Ítem simple -->
              <RouterLink
                v-else
                :to="item.route || ''"
                @mouseenter="prefetchRoute(item.route)"
                @focusin="prefetchRoute(item.route)"
                @click="closeMobileSidebar"
                class="group relative flex items-center h-[44px] rounded-[13px] transition-all duration-500 outline-none active:scale-[0.96] overflow-hidden px-3"
                :class="[
                  isActiveRoute(item.route)
                    ? 'bg-gradient-to-r from-[#3b82f6]/15 to-transparent dark:from-[#3b82f6]/20 border border-[#3b82f6]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(59,130,246,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_15px_rgba(59,130,246,0.15)]'
                    : 'hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent dark:hover:from-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] shadow-none'
                ]"
              >
                <!-- Background Glow on Hover -->
                <div class="absolute inset-0 bg-[#3b82f6]/0 group-hover:bg-[#3b82f6]/5 transition-colors duration-500"></div>

                <div class="flex items-center w-full relative z-10 gap-2.5">
                  <div 
                    class="w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-500 rounded-[10px]"
                    :class="isActiveRoute(item.route) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] group-hover:bg-[#3b82f6]/10'"
                  >
                    <HugeiconsIcon :icon="item.icon" :size="20" :stroke-width="isActiveRoute(item.route) ? 2.3 : 1.8" />
                  </div>

                  <span 
                    class="text-[13.5px] font-bold tracking-tight transition-all duration-500 overflow-hidden whitespace-nowrap inline-block"
                    :class="[
                      isExpanded ? 'opacity-100 max-w-[165px]' : 'opacity-0 max-w-0',
                      isActiveRoute(item.route) ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-600 dark:text-slate-300 group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc]'
                    ]"
                  >
                    {{ item.text }}
                  </span>
                </div>
              </RouterLink>
            </div>
          </TransitionGroup>
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
          class="absolute bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[200] transition-all duration-300"
          :class="[
            isExpanded 
              ? 'bottom-[84px] left-3 right-3 w-auto md:left-[273px] md:bottom-4 md:w-[260px]' 
              : 'bottom-[84px] left-3 right-3 w-auto md:left-[90px] md:bottom-4 md:w-[260px]'
          ]"
        >
          <!-- Header de Usuario -->
          <div class="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-white/5 rounded-[15px] mb-1.5">
            <div class="w-12 h-12 shrink-0 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs">
              <img :src="authStore.userAvatar" class="w-full h-full object-cover" alt="Avatar" />
            </div>
            <div class="flex-1 overflow-hidden">
              <p class="text-[14px] font-bold text-slate-800 dark:text-white truncate mb-0.5">{{ authStore.userData.nombre || t('sidebar.defaultUser') }}</p>
              <p class="text-[12px] text-[#3b82f6] dark:text-[#5da6fc] font-semibold truncate">{{ authStore.userData.email || groupStore.selectedGroup.nombre }}</p>
            </div>
          </div>

          <!-- Opciones del Menú -->
          <div class="space-y-1">
            <button 
              @click="openMyProfile"
              class="w-full flex items-center gap-3 px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-gradient-to-r hover:from-[#3b82f6]/10 hover:to-transparent border border-transparent hover:border-[#3b82f6]/20 dark:hover:border-[#3b82f6]/30 transition-all duration-300 text-left active:scale-[0.97] group/opt"
            >
              <HugeiconsIcon :icon="User02Icon" :size="18" class="text-slate-400 dark:text-slate-500 group-hover/opt:text-[#3b82f6] dark:group-hover/opt:text-[#5da6fc] transition-colors" />
              <span>{{ t('sidebar.myProfile') }}</span>
            </button>

            <button 
              @click="cerrarSesion"
              class="w-full flex items-center gap-3 px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 text-left active:scale-[0.97]"
            >
              <HugeiconsIcon :icon="Logout01Icon" :size="18" class="text-red-500 dark:text-red-400" />
              <span>{{ t('sidebar.logout') }}</span>
            </button>
          </div>
        </div>
      </transition>

      <!-- Footer / Selector de Grupos y Perfil -->
      <div class="p-2.5 border-t border-slate-200/60 dark:border-white/5 mt-auto flex flex-col gap-2 relative">
        <!-- Perfil Usuario Button -->
        <button
          @click="isProfileMenuOpen = !isProfileMenuOpen"
          class="flex items-center gap-3 p-2 rounded-[14px] hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-all duration-300 w-full text-left relative group/profile cursor-pointer"
        >
          <div class="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 group-hover/profile:border-[#3b82f6]/50 transition-colors flex items-center justify-center">
            <img :src="authStore.userAvatar" class="w-full h-full object-cover" alt="Avatar" />
          </div>
          
          <div class="flex-1 overflow-hidden transition-all duration-500" :class="isExpanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'">
            <p class="text-[13px] font-bold text-slate-800 dark:text-white truncate">{{ authStore.userData.nombre || t('sidebar.defaultUser') }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate">{{ authStore.userData.email }}</p>
          </div>

          <div 
            class="text-slate-400 dark:text-slate-500 group-hover/profile:text-[#3b82f6] dark:group-hover/profile:text-[#5da6fc] transition-transform duration-300 mr-1"
            :class="[
              isExpanded ? 'opacity-100' : 'opacity-0',
              isProfileMenuOpen ? 'rotate-180' : ''
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4.5 h-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </button>
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
  </div>
</template>

<style scoped>
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

/* Animación de entrada, salida y reordenamiento fluido para los ítems del menú */
.menu-item-anim-move,
.menu-item-anim-enter-active,
.menu-item-anim-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-item-anim-enter-from {
  opacity: 0;
  transform: translateX(-18px) scale(0.92);
}

.menu-item-anim-leave-to {
  opacity: 0;
  transform: translateX(-18px) scale(0.92);
}

.menu-item-anim-leave-active {
  position: absolute;
  width: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>


