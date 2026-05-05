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
  const userPermissions = ref<number[]>([])

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

  const logout = (routerInstance: Router) => {
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

    userData.value = { nombre: '', email: '', grupo: '', idioma: '', tz: '', foto: '', isAdmin: false, isSuperAdmin: false }
    isAdmin.value = false
    isSuperAdmin.value = false
    userPermissions.value = []

    const groupStore = useGroupStore()
    groupStore.setGroup({ id: '', nombre: '' })

    routerInstance.push('/login')
  }

  const hasPermission = (permissionId: number): boolean => {
    if (isSuperAdmin.value) return true
    return userPermissions.value.includes(permissionId)
  }

  const parseMenuOpsToPermissions = (menuOps: { category: string; descripcion: string }[]): number[] => {
    if (!Array.isArray(menuOps) || menuOps.length === 0) return []

    const permissionMap: Record<string, Record<string, number>> = {
      ROLES: {
        'Create a role': 1,
        'List roles': 2,
        'Edit roles': 3,
        'Delete roles': 4,
        'Assign permissions to roles': 5,
      },
      USUARIOS: {
        'Create users': 6,
        'List users': 7,
        'Edit users': 8,
        'Delete users': 9,
      },
      HARDWARE: {
        'Create hardware': 10,
        'List hardware': 11,
        'Edit hardware': 12,
        'Delete hardware': 13,
        'Assign to service': 14,
        'Send SMS/TCP commands': 15,
      },
      ESCOLTA: {
        'Create escort': 16,
        'Update escort': 17,
        'Delete escort': 18,
        'Validate escort': 19,
        'List escorts': 20,
      },
      RUTAS: {
        'Create route': 21,
        'List routes': 22,
        'Edit route': 23,
        'Delete route': 24,
      },
      GEOCERCAS: {
        'Create geofence': 25,
        'List geofences': 26,
        'Edit geofence': 27,
        'Delete geofence': 28,
      },
    }

    const permissions = new Set<number>()

    for (const op of menuOps) {
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
              userPermissions.value = data.data.permisos.map(Number)
            } else if (typeof data.data.permisos === 'string') {
              userPermissions.value = JSON.parse(data.data.permisos).map(Number)
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
