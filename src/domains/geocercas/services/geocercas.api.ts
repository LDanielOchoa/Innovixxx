import type { Geocerca, GeocercaDetalle, GeocercaCreatePayload } from '../types/geocerca'
import { apiClient } from '../../../utils/api-client'

interface BackendResponse<T> {
  done: boolean
  data?: T
  message?: string
}

export const fetchGeocercasApi = async (id_grupo: string): Promise<Geocerca[]> => {
  const data = await apiClient<BackendResponse<Geocerca[]>>('/api/v1/geocerca/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const fetchGeocercaDetallesApi = async (id_grupo: string, id_geocerca: string): Promise<GeocercaDetalle | null> => {
  const data = await apiClient<BackendResponse<GeocercaDetalle>>('/api/v1/geocerca/detalles/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, id_geocerca })
  })
  if (data.done && data.data) return data.data
  return null
}

export const createGeocercaApi = async (payload: GeocercaCreatePayload): Promise<boolean> => {
  const data = await apiClient<BackendResponse<any>>('/api/v1/geocerca/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.done
}
