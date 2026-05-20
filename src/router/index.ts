import { createRouter, createWebHistory } from 'vue-router'
import { CookieAuth } from '../utils/cookie-auth'
import Login from '../views/Login.vue'
import AppLayout from '../components/layout/AppLayout.vue'
import { PERMISSIONS } from '../utils/permissions'
import { useAuthStore } from '../stores/auth.store'

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
      component: Login,
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

    // ─── Shell con Sidebar + Header (se monta una sola vez) ───────────────
    {
      path: '/',
      component: AppLayout,
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
          component: () => import('../domains/vehiculos/views/VehiculosListView.vue')
        },
        {
          path: 'vehiculos/nuevo',
          name: 'vehiculos-crear',
          component: () => import('../domains/vehiculos/views/VehiculoFormView.vue')
        },
        {
          path: 'vehiculos/:id/editar',
          name: 'vehiculos-editar',
          component: () => import('../domains/vehiculos/views/VehiculoFormView.vue'),
          props: true
        },
        {
          path: 'vehiculos-servicio',
          name: 'vehiculos-servicio',
          component: () => import('../domains/vehiculos-servicio/views/VehiculosServicioListView.vue')
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
          path: 'hardware/nuevo',
          name: 'hardware-crear',
          component: () => import('../domains/hardware/views/HardwareFormView.vue'),
          meta: { permission: PERMISSIONS.HARDWARE_CREATE }
        },
        {
          path: 'hardware/:id/editar',
          name: 'hardware-editar',
          component: () => import('../domains/hardware/views/HardwareFormView.vue'),
          props: true,
          meta: { permission: PERMISSIONS.HARDWARE_EDIT }
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
          component: () => import('../domains/servicios/views/ServiciosListView.vue')
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
router.beforeEach((to, _from, next) => {
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

    if (to.meta.adminOnly && !authStore.isSuperAdmin) {
      next({ name: 'dashboard' })
      return
    }

    if (to.meta.permission && !authStore.isSuperAdmin && !authStore.hasPermission(to.meta.permission as number)) {
      next({ name: 'dashboard' })
      return
    }
  }

  next()
})

export default router
