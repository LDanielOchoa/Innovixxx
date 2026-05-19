import { apiClient } from '../../../utils/api-client'
import type {
  VehiculoServicio,
  VehiculoServicioCreatePayload,
  VehiculoServicioUpdatePayload,
  VehiculoServicioDeletePayload
} from '../types/vehiculo-servicio'

export const fetchVehiculosServicioApi = async (id_grupo: string): Promise<VehiculoServicio[]> => {
  const data = await apiClient<{ done: boolean; data: VehiculoServicio[]; message?: string }>(
    '/api/v1/vehiculo_servicio/listar/',
    {
      method: 'POST',
      body: JSON.stringify({ id_grupo })
    }
  )
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const createVehiculoServicioApi = async (payload: VehiculoServicioCreatePayload): Promise<{ done: boolean; message?: string }> => {
  return apiClient('/api/v1/vehiculo_servicio/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateVehiculoServicioApi = async (payload: VehiculoServicioUpdatePayload): Promise<{ done: boolean; message?: string }> => {
  return apiClient('/api/v1/vehiculo_servicio/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const deleteVehiculoServicioApi = async (payload: VehiculoServicioDeletePayload): Promise<{ done: boolean; message?: string }> => {
  return apiClient('/api/v1/vehiculo_servicio/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
