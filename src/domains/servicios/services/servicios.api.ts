import { apiClient } from '../../../utils/api-client'
import type { Servicio, ServicioListPayload, ServicioCreatePayload, RutaSimple } from '../types/servicio'

export const fetchServiciosApi = async (payload: ServicioListPayload): Promise<Servicio[]> => {
  const data = await apiClient<{ done: boolean; data: Servicio[] }>('/api/v1/servicio/listar_tabla/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const registrarServicioApi = async (payload: ServicioCreatePayload): Promise<any> => {
  return apiClient('/api/v1/servicio/registrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchRutasSimplesApi = async (id_grupo: string): Promise<RutaSimple[]> => {
  const data = await apiClient<{ done: boolean; data: RutaSimple[] }>('/api/v1/ruta/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}
