import type { Comando, ListarComandosPayload, CrearComandoPayload, ActualizarComandoPayload, BorrarComandoPayload } from '../types/comando'
import { apiClient } from '../../../utils/api-client'

interface BackendResponse<T> {
  done: boolean
  data?: T
  message?: string
}

export const fetchComandosApi = async (payload: ListarComandosPayload): Promise<Comando[]> => {
  const data = await apiClient<BackendResponse<Comando[]>>('/api/v1/comando/listar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  if (data.done && Array.isArray(data.data)) {
    return data.data
  }
  return []
}

export const createComandoApi = async (payload: CrearComandoPayload): Promise<{ done: boolean; message?: string; data?: any }> => {
  return apiClient<BackendResponse<any>>('/api/v1/comando/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateComandoApi = async (payload: ActualizarComandoPayload): Promise<{ done: boolean; message?: string; data?: any }> => {
  return apiClient<BackendResponse<any>>('/api/v1/comando/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const deleteComandoApi = async (payload: BorrarComandoPayload): Promise<{ done: boolean; message?: string; data?: any }> => {
  return apiClient<BackendResponse<any>>('/api/v1/comando/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

