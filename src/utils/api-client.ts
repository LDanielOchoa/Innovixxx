import { ApiError, ApiErrorCode } from './api-errors'
import { CookieAuth } from './cookie-auth'

interface RequestOptions extends RequestInit {
  id_grupo?: string
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = CookieAuth.getToken()
  const idGrupo = options.id_grupo || localStorage.getItem('auth-grupo-id')
  const lang = localStorage.getItem('app-locale') || 'es'
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (idGrupo) {
    headers.set('id-grupo', idGrupo)
  }

  if (lang) {
    headers.set('lang', lang)
  }
  
  // Si hay un body, asumimos JSON por defecto a menos que se especifique lo contrario o sea FormData
  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const { id_grupo, ...fetchOptions } = options

  const config: RequestInit = {
    method: fetchOptions.method || 'POST', // Por defecto usamos POST según los servicios actuales
    ...fetchOptions,
    headers
  }

  try {
    const response = await fetch(endpoint, config)
    
    // Si la respuesta es exitosa (200-299)
    if (response.ok) {
      const data = await response.json()
      // En este proyecto, el backend suele devolver { done: boolean, data: T, message: string }
      return data as T
    }

    // Si falló, intentamos parsear el error del backend
    let errorData: any = {}
    try {
      errorData = await response.json()
    } catch {
      // Si no es JSON, capturamos el status
    }

    // Interceptor 401 (sesión expirada) y 496 (sesión eliminada/expirada) - logout automático
    if (response.status === 401 || response.status === 496) {
      import('../stores/auth.store').then(({ useAuthStore }) => {
        import('../router').then(({ default: router }) => {
          const authStore = useAuthStore()
          authStore.logout(router)
        })
      }).catch(err => console.error('Error al invocar logout automático:', err))

      throw new ApiError(
        response.status as ApiErrorCode,
        'Tu sesión ha expirado.',
        errorData
      )
    }

    // 403 - No tienes permiso para este endpoint, pero la sesión sigue válida
    // No hacemos logout, solo lanzamos error
    if (response.status === 403) {
      throw new ApiError(
        response.status as ApiErrorCode,
        errorData?.message || 'No tienes permisos para realizar esta acción.',
        errorData
      )
    }

    // Lanzamos error tipado genérico
    throw new ApiError(
      response.status as ApiErrorCode,
      errorData.message || response.statusText,
      errorData
    )
  } catch (error) {
    if (error instanceof ApiError) throw error
    
    // Error de red genérico o timeout
    throw new ApiError(
      500 as ApiErrorCode,
      error instanceof Error ? error.message : 'Error de conexión con el servidor'
    )
  }
}
