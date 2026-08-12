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

    const permissions = new Set<string>()

    for (const op of menuOps) {
      if (typeof op === 'string') {
        permissions.add(op.trim())
        continue
      }
      if (op && typeof op === 'object' && op.id) {
        permissions.add(String(op.id).trim())
        continue
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
      // Un usuario solo es SuperAdmin si el endpoint de listar todos los grupos responde exitosamente 
      // y devuelve múltiples grupos (o si el flag done es explícito para administración global).
      const isSuper = data.done === true && Array.isArray(data.data) && data.data.length > 1
      isSuperAdmin.value = isSuper
      return isSuper
    } catch {
      isSuperAdmin.value = false
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
