import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CookieAuth } from '../utils/cookie-auth'
import type { Router } from 'vue-router'
import { useGroupStore } from './group.store'
import { obtenerUrlImagen } from '../utils/imagenes'
import { apiClient } from '../utils/api-client'

interface UserData {
  nombre: string
  email: string
  grupo: string
  idioma: string
  tz: string
  foto: string
  isAdmin: boolean
  isSuperAdmin?: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const userData = ref<UserData>({
    nombre: '',
    email: '',
    grupo: '',
    idioma: '',
    tz: '',
    foto: '',
    isAdmin: false
  })

  const isAdmin = ref(false)
  const isLoading = ref(true)
  const userPermissions = ref<string[]>([])

  const userAvatar = computed(() => obtenerUrlImagen(userData.value.foto))

  const limpiarCookiesExceptoIdioma = () => {
    const cookiesToKeep = ['app-locale']
    const cookies = document.cookie.split(';')
    cookies.forEach((cookie) => {
      const nombre = cookie.split('=')[0]?.trim()
      if (nombre && !cookiesToKeep.includes(nombre)) {
        document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        if (!window.location.hostname.startsWith('localhost')) {
          document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; path=/`
        }
      }
    })
  }

  const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('innovix_auth_channel')
    : null

  const handleGlobalLogoutRedirect = () => {
    limpiarCookiesExceptoIdioma()
    CookieAuth.removeToken()
    localStorage.removeItem('auth-token-ws')
    localStorage.removeItem('auth-grupo-id')
    userData.value = { nombre: '', email: '', grupo: '', idioma: '', tz: '', foto: '', isAdmin: false, isSuperAdmin: false }
    isAdmin.value = false
    isSuperAdmin.value = false
    userPermissions.value = []

    try {
      if (window.opener || window.name?.startsWith('TrackingWindow_') || window.location.pathname.includes('/tracking')) {
        window.close()
      }
    } catch {}

    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  if (authChannel) {
    authChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'LOGOUT') {
        handleGlobalLogoutRedirect()
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'auth-logout-event') {
        handleGlobalLogoutRedirect()
      }
    })
  }

  const logout = (routerInstance?: Router) => {
    limpiarCookiesExceptoIdioma()
    CookieAuth.removeToken()

    const theme = localStorage.getItem('theme-store') || localStorage.getItem('theme')
    const locale = localStorage.getItem('app-locale')
    const sidebar = localStorage.getItem('sidebarExpanded')

    localStorage.clear()
    sessionStorage.clear()

    if (theme) localStorage.setItem('theme-store', theme)
    if (locale) localStorage.setItem('app-locale', locale)
    if (sidebar) localStorage.setItem('sidebarExpanded', sidebar)
    localStorage.setItem('auth-logout-event', Date.now().toString())

    try {
      authChannel?.postMessage({ type: 'LOGOUT' })
    } catch {}

    userData.value = { nombre: '', email: '', grupo: '', idioma: '', tz: '', foto: '', isAdmin: false, isSuperAdmin: false }
    isAdmin.value = false
    isSuperAdmin.value = false
    userPermissions.value = []

    const groupStore = useGroupStore()
    groupStore.setGroup({ id: '', nombre: '' })

    try {
      if (window.opener || window.name?.startsWith('TrackingWindow_') || window.location.pathname.includes('/tracking')) {
        window.close()
      }
    } catch {}

    if (routerInstance) {
      routerInstance.push('/login')
    }
    window.location.href = '/login'
  }

  const hasPermission = (permissionId: string | number): boolean => {
    if (isSuperAdmin.value) return true
    const permStr = String(permissionId)
    return userPermissions.value.some(p => String(p) === permStr)
  }

  const parseMenuOpsToPermissions = (menuOps: any[]): string[] => {
    if (!Array.isArray(menuOps) || menuOps.length === 0) return []

    const permissionMap: Record<string, Record<string, string>> = {
      ESCOLTA: {
        'Listar escoltas': 'PxpYRQba',
        'Create escort': 'PxpYRQba',
        'List escorts': 'PxpYRQba',
      },
      GEOCERCAS: {
        'Detalles geocercas': '7R1vGpVN',
        'Listar geocerca': 'O2Qdej9M',
        'Editar geocerca': 'V7QowQkD',
        'Borrar geocerca': 'gapyYprY',
        'Crear geocerca': 'yDpLO1Xm',
        'Create geofence': 'yDpLO1Xm',
        'List geofences': 'O2Qdej9M',
        'Edit geofence': 'V7QowQkD',
        'Delete geofence': 'gapyYprY',
      },
      HARDWARE: {
        'Listar hardware': 'r01A91WP',
        'List hardware': 'r01A91WP',
        'Create hardware': 'r01A91WP',
        'Edit hardware': 'r01A91WP',
        'Delete hardware': 'r01A91WP',
      },
      ROLES: {
        'Editar roles': '2J1mwQa6',
        'Crear un role': 'Jm1gBj8w',
        'Asignar permisos a roles': 'W4jJW1JG',
        'Borrar roles': 'rnjWvQED',
        'Listar roles': 'vVj9gpd3',
        'Create a role': 'Jm1gBj8w',
        'List roles': 'vVj9gpd3',
        'Edit roles': '2J1mwQa6',
        'Delete roles': 'rnjWvQED',
        'Assign permissions to roles': 'W4jJW1JG',
      },
      RUTAS: {
        'Cambiar estado': '2njwojZN',
        'Crear ruta': 'LOjrzjYX',
        'Editar ruta': 'WN1ELjZD',
        'Listar ruta': 'yPQPn10V',
        'Create route': 'LOjrzjYX',
        'List routes': 'yPQPn10V',
        'Edit route': 'WN1ELjZD',
        'Delete route': 'WN1ELjZD',
      },
      SERVICE: {
        'Ver historial': '8EpaOLj2',
        'Crear servicio': 'Jm1gBBj8',
        'Listar servicios (dash)': 'rnjW5vpE',
        'Listar servicios (tabla)': 'vVj9Rg1d',
      },
      USUARIOS: {
        'Editar usuarios': '8EpaL127',
        'Crear usuarios': 'BDjMxQ8K',
        'Listar usuarios': 'PEjxE1rz',
        'Borrar usuarios': 'VYQq9Qbz',
        'Create users': 'BDjMxQ8K',
        'List users': 'PEjxE1rz',
        'Edit users': '8EpaL127',
        'Delete users': 'VYQq9Qbz',
      },
      VEHICULOS: {
        'Actualizar vehiculo': '2aQN81vy',
        'Listar vehiculos': '7zj6EQRk',
        'Crear vehiculo': 'rzpnWQl2',
        'Borrar vehiculos': 'w3Q48Qz0',
      }
    }

    const permissions = new Set<string>()

    for (const op of menuOps) {
      if (typeof op === 'string') {
        permissions.add(op)
        continue
      }
      if (op && op.id) {
        permissions.add(String(op.id))
        continue
      }
      const category = op.category?.toUpperCase()
      const descripcion = op.descripcion

      if (category && permissionMap[category]?.[descripcion]) {
        permissions.add(permissionMap[category][descripcion])
      }
    }

    return Array.from(permissions)
  }

  const isSuperAdmin = ref(false)

  const checkAdminStatus = async (token: string): Promise<boolean> => {
    try {
      const lang = localStorage.getItem('app-locale') || 'es'

      const response = await fetch('/api/v1/grupo/listar/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'lang': lang,
          'id-grupo': ''
        },
        body: JSON.stringify({})
      })

      if (!response.ok) return false

      const data = await response.json()
      const isSuper = data.done === true && Array.isArray(data.data) && data.data.length > 0
      isSuperAdmin.value = isSuper
      return isSuper
    } catch {
      return false
    }
  }

  const fetchUserProfile = async (
    routerInstance: Router,
    setLocaleCallback?: (lang: string) => void
  ) => {
    isLoading.value = true
    const token = CookieAuth.getToken()

    if (!token) {
      logout(routerInstance)
      return
    }

    try {
      console.log('[AuthStore] Calling get_meta...')
      const data = await apiClient<{ done: boolean; data: any }>('/api/v1/get_meta/', {
        method: 'POST'
      })
      console.log('[AuthStore] get_meta response:', data)

      if (data.done && data.data) {
        userData.value.nombre = data.data.nombre
        userData.value.email = data.data.email || ''
        userData.value.grupo = data.data.grupo
        userData.value.idioma = data.data.idioma
        userData.value.tz = data.data.tz
        userData.value.foto = data.data.foto || ''

        userPermissions.value = []

        if (data.data.menu_ops && Array.isArray(data.data.menu_ops)) {
          userPermissions.value = parseMenuOpsToPermissions(data.data.menu_ops)
        } else if (data.data.permisos) {
          try {
            if (Array.isArray(data.data.permisos)) {
              userPermissions.value = data.data.permisos.map((p: any) => typeof p === 'object' && p.id ? String(p.id) : String(p))
            } else if (typeof data.data.permisos === 'string') {
              userPermissions.value = JSON.parse(data.data.permisos).map(String)
            }
          } catch (e) {
            userPermissions.value = []
          }
        }

        const groupStore = useGroupStore()
        if (data.data.grupo) {
          const idGrupoCrudo = typeof data.data.id_grupo === 'string' ? data.data.id_grupo.trim() : ''
          const idGrupoValido = idGrupoCrudo.length === 8 ? idGrupoCrudo : ''
          groupStore.setGroup({ id: idGrupoValido, nombre: data.data.grupo })
          localStorage.setItem('auth-grupo-id', idGrupoValido)
          localStorage.setItem('auth-grupo', data.data.grupo)
        }

        if (data.data.idioma) {
          if (setLocaleCallback) setLocaleCallback(data.data.idioma)
          localStorage.setItem('app-locale', data.data.idioma)
        }

        console.log('[AuthStore] Checking admin status...')
        isAdmin.value = await checkAdminStatus(token)
        console.log('[AuthStore] isAdmin:', isAdmin.value)
        console.log('[AuthStore] isSuperAdmin:', isSuperAdmin.value)
        userData.value.isAdmin = isAdmin.value
        userData.value.isSuperAdmin = isSuperAdmin.value
      } else {
        console.log('[AuthStore] get_meta data invalid')
        throw new Error('Datos no válidos')
      }
    } catch (error) {
      console.error('[AuthStore] Error in fetchUserProfile:', error)
      logout(routerInstance)
    } finally {
      isLoading.value = false
    }
  }

  return {
    userData,
    isAdmin,
    isSuperAdmin,
    isLoading,
    userAvatar,
    userPermissions,
    hasPermission,
    fetchUserProfile,
    logout
  }
})
