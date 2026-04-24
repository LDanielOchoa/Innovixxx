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
          path: 'vehiculos',
          name: 'vehiculos',
          component: () => import('../domains/vehiculos/views/VehiculosListView.vue')
        },
        {
          path: 'escoltas',
          name: 'escoltas',
          component: () => import('../domains/escoltas/views/EscoltasListView.vue')
        },
        {
          path: 'hardware',
          name: 'hardware',
          component: () => import('../domains/hardware/views/HardwareListView.vue')
        },
        {
          path: 'rutas',
          name: 'rutas',
          component: () => import('../domains/rutas/views/RutasView.vue')
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
