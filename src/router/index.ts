import { createRouter, createWebHistory } from 'vue-router'
import { CookieAuth } from '../utils/cookie-auth'
import { PERMISSIONS } from '../utils/permissions'
import { useAuthStore } from '../stores/auth.store'
import { useRouteNavigation } from '../composables/useRouteNavigation'
import { loadModuleMessages } from '../i18n'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/login/recuperar',
      name: 'recuperar-clave',
      component: () => import('../views/auth/RecuperarClave.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/recover_pass',
      name: 'restablecer-clave',
      component: () => import('../views/auth/RestablecerClave.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/tracking',
      name: 'tracking',
      component: () => import('../domains/tracking/views/TrackingView.vue'),
      meta: { requiresAuth: true }
    },

    // ─── Shell con Sidebar + Header (se monta una sola vez) ───────────────
    {
      path: '/',
      component: () => import('../components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/Dashboard.vue')
        },
        {
          path: 'usuarios',
          name: 'usuarios',
          component: () => import('../domains/usuarios/views/UsuariosListView.vue'),
          meta: { permission: PERMISSIONS.USERS_LIST }
        },
        {
          path: 'usuarios/nuevo',
          name: 'usuarios-crear',
          component: () => import('../domains/usuarios/views/UsuarioFormView.vue'),
          meta: { permission: PERMISSIONS.USERS_CREATE }
        },
        {
          path: 'usuarios/:id/editar',
          name: 'usuarios-editar',
          component: () => import('../domains/usuarios/views/UsuarioFormView.vue'),
          props: true,
          meta: { permission: PERMISSIONS.USERS_EDIT }
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('../domains/roles/views/RolesListView.vue'),
          meta: { permission: PERMISSIONS.ROLES_LIST }
        },
        {
          path: 'comandos',
          name: 'comandos',
          component: () => import('../domains/comandos/views/ComandosListView.vue')
        },
        {
          path: 'grupos',
          name: 'grupos',
          component: () => import('../domains/grupos/views/GruposListView.vue'),
          meta: { adminOnly: true }
        },
        {
          path: 'grupos/nuevo',
          name: 'grupos-crear',
          component: () => import('../domains/grupos/views/GrupoFormView.vue'),
          meta: { adminOnly: true }
        },
        {
          path: 'grupos/:id/editar',
          name: 'grupos-editar',
          component: () => import('../domains/grupos/views/GrupoFormView.vue'),
          props: true,
          meta: { adminOnly: true }
        },
        {
          path: 'vehiculos',
          name: 'vehiculos',
          component: () => import('../domains/vehiculos/views/VehiculosListView.vue'),
          meta: { permission: PERMISSIONS.VEHICULOS_LIST }
        },
        {
          path: 'vehiculos-servicio',
          name: 'vehiculos-servicio',
          component: () => import('../domains/vehiculos-servicio/views/VehiculosServicioListView.vue'),
          meta: { permission: PERMISSIONS.VEHICLE_BODYGUARD_LIST }
        },
        {
          path: 'escoltas',
          name: 'escoltas',
          component: () => import('../domains/escoltas/views/EscoltasListView.vue'),
          meta: { permission: PERMISSIONS.ESCOLTA_LIST }
        },
        {
          path: 'escoltas/nuevo',
          name: 'escoltas-crear',
          component: () => import('../domains/escoltas/views/EscoltaFormView.vue'),
          meta: { permission: PERMISSIONS.ESCOLTA_CREATE }
        },
        {
          path: 'escoltas/:id/editar',
          name: 'escoltas-editar',
          component: () => import('../domains/escoltas/views/EscoltaFormView.vue'),
          props: true,
          meta: { permission: PERMISSIONS.ESCOLTA_UPDATE }
        },
        {
          path: 'hardware',
          name: 'hardware',
          component: () => import('../domains/hardware/views/HardwareListView.vue'),
          meta: { permission: PERMISSIONS.HARDWARE_LIST }
        },
        {
          path: 'rutas',
          name: 'rutas',
          component: () => import('../domains/rutas/views/RutasListView.vue'),
          meta: { permission: PERMISSIONS.RUTAS_LIST }
        },
        {
          path: 'rutas/nueva',
          name: 'rutas-crear',
          component: () => import('../domains/rutas/views/RutasFormView.vue'),
          meta: { permission: PERMISSIONS.RUTAS_CREATE }
        },
        {
          path: 'rutas/:id/editar',
          name: 'rutas-editar',
          component: () => import('../domains/rutas/views/RutasFormView.vue'),
          props: true,
          meta: { permission: PERMISSIONS.RUTAS_EDIT }
        },
        {
          path: 'geocercas',
          name: 'geocercas',
          component: () => import('../domains/geocercas/views/GeocercasListView.vue'),
          meta: { permission: PERMISSIONS.GEOCERCAS_LIST }
        },
        {
          path: 'geocercas/nueva',
          name: 'geocerca-nueva',
          component: () => import('../domains/geocercas/views/GeocercaFormView.vue'),
          meta: { permission: PERMISSIONS.GEOCERCAS_CREATE }
        },
        {
          path: 'geocercas/:id/editar',
          name: 'geocerca-editar',
          component: () => import('../domains/geocercas/views/GeocercaFormView.vue'),
          props: true,
          meta: { permission: PERMISSIONS.GEOCERCAS_EDIT }
        },
        {
          path: 'servicios',
          name: 'servicios',
          component: () => import('../domains/servicios/views/ServiciosListView.vue'),
          meta: { permission: PERMISSIONS.SERVICE_LIST_TABLE }
        },
        {
          path: 'servicios/alertas',
          name: 'servicios-alertas',
          component: () => import('../domains/servicios/views/AlertasServiciosListView.vue'),
          meta: { permission: PERMISSIONS.SERVICE_LIST_TABLE }
        },
        {
          path: 'servicios/eventos',
          name: 'servicios-eventos',
          component: () => import('../domains/servicios/views/EventosServiciosListView.vue'),
          meta: { permission: PERMISSIONS.SERVICE_LIST_TABLE }
        },
        {
          path: 'servicios/dashboard',
          name: 'servicios-dashboard',
          component: () => import('../domains/servicios/views/ServiciosDashboardView.vue'),
          meta: { permission: PERMISSIONS.SERVICE_LIST_DASH }
        }
      ]
    },
    // ─── Catch-all para 404 ───────────────
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue')
    }
  ]
})

// ─── Guardián de Navegación Global ───────────────
router.beforeEach(async (to, _from, next) => {
  const { startNavigation } = useRouteNavigation()
  startNavigation()

  if (to.name) {
    loadModuleMessages(String(to.name))
  }

  const token = CookieAuth.getToken()
  const isAuthRequired = to.matched.some(record => record.meta.requiresAuth)
  const isGuestOnly = to.matched.some(record => record.meta.guestOnly)

  if (isAuthRequired && !token) {
    next({ name: 'login' })
    return
  } else if (isGuestOnly && token) {
    next({ name: 'dashboard' })
    return
  }

  if (isAuthRequired && token) {
    const authStore = useAuthStore()

    if (to.meta.adminOnly && !authStore.isLoading && !authStore.isSuperAdmin) {
      next({ name: 'dashboard' })
      return
    }

    if (to.meta.permission && !authStore.isLoading && !authStore.isSuperAdmin && !authStore.hasPermission(to.meta.permission as string)) {
      next({ name: 'dashboard' })
      return
    }

  }

  next()
})

router.afterEach((to) => {
  const { finishNavigation } = useRouteNavigation()
  finishNavigation()

  const badge = document.querySelector('.grecaptcha-badge') as HTMLElement | null
  if (badge) {
    const isAuthPage = to.name === 'login' || to.name === 'recuperar-clave'
    badge.style.setProperty('display', isAuthPage ? 'block' : 'none', 'important')
    badge.style.setProperty('visibility', isAuthPage ? 'visible' : 'hidden', 'important')
  }
})

router.onError(() => {
  const { finishNavigation } = useRouteNavigation()
  finishNavigation()
})

export default router
