import type { Ruta, RutaCreatePayload, RutaUpdatePayload, TipoParada, RutaDetalle } from '../types/ruta'
import { apiClient } from '../../../utils/api-client'

interface BackendResponse<T> {
  done: boolean
  data?: T
  message?: string
}

export const fetchRutasApi = async (id_grupo: string): Promise<Ruta[]> => {
  const data = await apiClient<BackendResponse<Ruta[]>>('/api/v1/ruta/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const fetchRutaDetallesApi = async (id_grupo: string, id_ruta: string): Promise<RutaDetalle | null> => {
  const data = await apiClient<BackendResponse<RutaDetalle>>('/api/v1/ruta/ver_detalles/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, id_ruta })
  })
  if (data.done && data.data) return data.data
  return null
}

export const fetchTiposParadaApi = async (): Promise<TipoParada[]> => {
  const data = await apiClient<BackendResponse<TipoParada[]>>('/api/v1/ruta/parada/listar_tipos/', {
    method: 'POST'
  })
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const createRutaApi = async (payload: RutaCreatePayload): Promise<{ done: boolean; message?: string }> => {
  const data = await apiClient<BackendResponse<null>>('/api/v1/ruta/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return { done: Boolean(data?.done), message: data?.message }
}

export const setRutaEstadoApi = async (id_grupo: string, id_ruta: string, habilitada: boolean): Promise<{ done: boolean; message?: string }> => {
  const data = await apiClient<BackendResponse<null>>('/api/v1/ruta/set_estado/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, id_ruta, habilitada: habilitada ? 1 : 0 })
  })
  return { done: Boolean(data?.done), message: data?.message }
}

export const updateRutaApi = async (payload: RutaUpdatePayload): Promise<{ done: boolean; message?: string }> => {
  const data = await apiClient<BackendResponse<null>>('/api/v1/ruta/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return { done: Boolean(data?.done), message: data?.message }
}
