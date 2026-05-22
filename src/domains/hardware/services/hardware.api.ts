import { apiClient } from '../../../utils/api-client'
import type { 
  Hardware, 
  FamiliaHardware,
  HardwareCreatePayload, 
  HardwareUpdatePayload, 
  HardwareDeletePayload
} from '../types/hardware'

export const fetchHardwareApi = async (id_grupo: string): Promise<Hardware[]> => {
  const data = await apiClient<{ done: boolean, data: Hardware[] }>('/api/v1/hardware/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, estado: 0 })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const fetchFamiliasApi = async (): Promise<FamiliaHardware[]> => {
  const data = await apiClient<{ done: boolean, data: FamiliaHardware[] }>('/api/v1/hardware/familias/', {
    method: 'POST',
    body: JSON.stringify({})
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const createHardwareApi = async (payload: HardwareCreatePayload): Promise<any> => {
  return apiClient('/api/v1/hardware/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateHardwareApi = async (payload: HardwareUpdatePayload): Promise<any> => {
  return apiClient('/api/v1/hardware/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const deleteHardwareApi = async (payload: HardwareDeletePayload): Promise<any> => {
  return apiClient('/api/v1/hardware/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
