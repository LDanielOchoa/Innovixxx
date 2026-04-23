import { apiClient } from '../../../utils/api-client'
import type { 
  Vehiculo, 
  TipoVehiculo,
  VehiculoCreatePayload, 
  VehiculoUpdatePayload, 
  VehiculoDeletePayload
} from '../types/vehiculo'

export const fetchVehiculosApi = async (id_grupo: string): Promise<Vehiculo[]> => {
  const data = await apiClient<{ done: boolean, data: Vehiculo[] }>('/api/v1/vehiculo/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const fetchVehicleTypesApi = async (): Promise<TipoVehiculo[]> => {
  const data = await apiClient<{ done: boolean, data: TipoVehiculo[] }>('/api/v1/vehiculo/tipos/listar/', {
    method: 'POST',
    body: JSON.stringify({})
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const createVehiculoApi = async (payload: VehiculoCreatePayload): Promise<any> => {
  return apiClient('/api/v1/vehiculo/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateVehiculoApi = async (payload: VehiculoUpdatePayload): Promise<any> => {
  return apiClient('/api/v1/vehiculo/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const deleteVehiculoApi = async (payload: VehiculoDeletePayload): Promise<any> => {
  return apiClient('/api/v1/vehiculo/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
