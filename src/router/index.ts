import { createRouter, createWebHistory } from 'vue-router'
import { CookieAuth } from '../utils/cookie-auth'
import Login from '../views/Login.vue'
import AppLayout from '../components/layout/AppLayout.vue'

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
          component: () => import('../domains/usuarios/views/UsuariosListView.vue')
        },
        {
          path: 'usuarios/nuevo',
          name: 'usuarios-crear',
          component: () => import('../domains/usuarios/views/UsuarioFormView.vue')
        },
        {
          path: 'usuarios/:id/editar',
          name: 'usuarios-editar',
          component: () => import('../domains/usuarios/views/UsuarioFormView.vue'),
          props: true
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('../domains/roles/views/RolesListView.vue')
        },
        {
          path: 'grupos',
          name: 'grupos',
          component: () => import('../domains/grupos/views/GruposListView.vue')
        },
        {
          path: 'grupos/nuevo',
          name: 'grupos-crear',
          component: () => import('../domains/grupos/views/GrupoFormView.vue')
        },
        {
          path: 'grupos/:id/editar',
          name: 'grupos-editar',
          component: () => import('../domains/grupos/views/GrupoFormView.vue'),
          props: true
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
          path: 'escoltas',
          name: 'escoltas',
          component: () => import('../domains/escoltas/views/EscoltasListView.vue')
        },
        {
          path: 'escoltas/nuevo',
          name: 'escoltas-crear',
          component: () => import('../domains/escoltas/views/EscoltaFormView.vue')
        },
        {
          path: 'escoltas/:id/editar',
          name: 'escoltas-editar',
          component: () => import('../domains/escoltas/views/EscoltaFormView.vue'),
          props: true
        },
        {
          path: 'hardware',
          name: 'hardware',
          component: () => import('../domains/hardware/views/HardwareListView.vue')
        },
        {
          path: 'hardware/nuevo',
          name: 'hardware-crear',
          component: () => import('../domains/hardware/views/HardwareFormView.vue')
        },
        {
          path: 'hardware/:id/editar',
          name: 'hardware-editar',
          component: () => import('../domains/hardware/views/HardwareFormView.vue'),
          props: true
        },
        {
          path: 'rutas',
          name: 'rutas',
          component: () => import('../domains/rutas/views/RutasListView.vue')
        },
        {
          path: 'rutas/nueva',
          name: 'rutas-crear',
          component: () => import('../domains/rutas/views/RutasFormView.vue')
        },
        {
          path: 'rutas/:id/editar',
          name: 'rutas-editar',
          component: () => import('../domains/rutas/views/RutasFormView.vue'),
          props: true
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
    // Intenta acceder a ruta privada sin token
    next({ name: 'login' })
  } else if (isGuestOnly && token) {
    // Intenta acceder a login/recover con sesión activa
    next({ name: 'dashboard' })
  } else {
    // Navegación permitida
    next()
  }
})

export default router
