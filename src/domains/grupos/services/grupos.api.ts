import type { Grupo, GrupoCreatePayload } from '../types/grupo'
import { CookieAuth } from '../../../utils/cookie-auth'

const getAuthHeaders = (withJson = false) => {
  const token = CookieAuth.getToken()
  return {
    Authorization: `Bearer ${token}`,
    ...(withJson ? { 'Content-Type': 'application/json' } : {})
  }
}

export const fetchGruposApi = async (): Promise<Grupo[]> => {
  const response = await fetch('/api/v1/grupo/listar/', {
    method: 'POST',
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Error al obtener grupos')
  }

  const data = await response.json()
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const createGrupoApi = async (payload: GrupoCreatePayload): Promise<{ done: boolean; message?: string }> => {
  const response = await fetch('/api/v1/grupo/crear/', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error('Error al crear grupo')
  }

  const data = await response.json()
  return { done: Boolean(data?.done || response.status === 200), message: data?.message }
}
