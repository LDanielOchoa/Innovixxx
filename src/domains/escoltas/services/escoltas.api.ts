import { apiClient } from '../../../utils/api-client'
import type { 
  Escolta, 
  EscoltaCreatePayload, 
  EscoltaUpdatePayload, 
  EscoltaDeletePayload,
  EscoltaValidatePrePayload,
  EscoltaValidatePostPayload
} from '../types/escolta'

export const fetchEscoltasApi = async (id_grupo: string): Promise<Escolta[]> => {
  const data = await apiClient<{ done: boolean, data: Escolta[] }>('/api/v1/escolta/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const createEscoltaApi = async (payload: EscoltaCreatePayload): Promise<any> => {
  return apiClient('/api/v1/escolta/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateEscoltaApi = async (payload: EscoltaUpdatePayload): Promise<any> => {
  return apiClient('/api/v1/escolta/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const deleteEscoltaApi = async (payload: EscoltaDeletePayload): Promise<any> => {
  return apiClient('/api/v1/escolta/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const preValidateEscoltaApi = async (payload: EscoltaValidatePrePayload): Promise<any> => {
  return apiClient('/api/v1/escolta/pre_validar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const postValidateEscoltaApi = async (payload: EscoltaValidatePostPayload): Promise<any> => {
  return apiClient('/api/v1/escolta/post_validar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
