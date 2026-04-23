import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import RecuperarClave from '../views/auth/RecuperarClave.vue'
import RestablecerClave from '../views/auth/RestablecerClave.vue'
import AppLayout from '../components/layout/AppLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import UsuariosList from '../domains/usuarios/views/UsuariosListView.vue'
import RolesList from '../domains/roles/views/RolesListView.vue'
import GruposList from '../domains/grupos/views/GruposListView.vue'
import VehiculosList from '../domains/vehiculos/views/VehiculosListView.vue'
import EscoltasList from '../domains/escoltas/views/EscoltasListView.vue'
import HardwareList from '../domains/hardware/views/HardwareListView.vue'
import RutasList from '../domains/rutas/views/RutasView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/login/recuperar',
      name: 'recuperar-clave',
      component: RecuperarClave
    },
    {
      path: '/recover_pass',
      name: 'restablecer-clave',
      component: RestablecerClave
    },

    // ─── Shell con Sidebar + Header (se monta una sola vez) ───────────────
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard
        },
        {
          path: 'usuarios',
          name: 'usuarios',
          component: UsuariosList
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
          component: RolesList
        },
        {
          path: 'grupos',
          name: 'grupos',
          component: GruposList
        },
        {
          path: 'vehiculos',
          name: 'vehiculos',
          component: VehiculosList
        },
        {
          path: 'escoltas',
          name: 'escoltas',
          component: EscoltasList
        },
        {
          path: 'hardware',
          name: 'hardware',
          component: HardwareList
        },
        {
          path: 'rutas',
          name: 'rutas',
          component: RutasList
        }
      ]
    }
  ]
})

export default router
