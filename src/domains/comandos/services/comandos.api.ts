import type {
  Comando,
  ListarComandosPayload,
  CrearComandoPayload,
  ActualizarComandoPayload,
  BorrarComandoPayload,
  EjecutarComandoPayload,
  HistorialComandoItem,
  HistorialComandosPayload
} from '../types/comando'
import { apiClient } from '../../../utils/api-client'

interface BackendResponse<T> {
  done: boolean
  data?: T
  message?: string
}

export const fetchComandosApi = async (payload: ListarComandosPayload): Promise<Comando[]> => {
  const requestPayload: ListarComandosPayload = {
    id_grupo: payload.id_grupo,
    id_familia: typeof payload.id_familia === 'number' ? payload.id_familia : 0
  }
  const data = await apiClient<BackendResponse<Comando[]>>('/api/v1/comando/listar/', {
    method: 'POST',
    body: JSON.stringify(requestPayload)
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

export const ejecutarComandoApi = async (payload: EjecutarComandoPayload): Promise<{ done: boolean; message?: string; data?: any }> => {
  return apiClient<BackendResponse<any>>('/api/v1/comando/ejecutar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchHistorialComandosApi = async (payload: HistorialComandosPayload): Promise<HistorialComandoItem[]> => {
  const requestPayload: HistorialComandosPayload = {
    id_grupo: payload.id_grupo,
    desde: payload.desde,
    hasta: payload.hasta,
    id_familia: typeof payload.id_familia === 'number' ? payload.id_familia : 0,
    id_usuario: payload.id_usuario || ''
  }
  const data = await apiClient<BackendResponse<HistorialComandoItem[]>>('/api/v1/comando/historial/', {
    method: 'POST',
    body: JSON.stringify(requestPayload)
  })
  if (data.done && Array.isArray(data.data)) {
    return data.data
  }
  return []
}


