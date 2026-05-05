import type { Grupo, GrupoCreatePayload } from '../types/grupo'
import { apiClient } from '../../../utils/api-client'

export const fetchGruposApi = async (): Promise<Grupo[]> => {
  const data = await apiClient<{ done: boolean; data: Grupo[] }>('/api/v1/grupo/listar/', {
    method: 'POST'
  })
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const createGrupoApi = async (payload: GrupoCreatePayload): Promise<{ done: boolean; message?: string }> => {
  const formData = new FormData()
  formData.append('nombre', payload.nombre)
  formData.append('time_zone', payload.time_zone)
  formData.append('i18n', payload.i18n)
  
  if (payload.logo) {
    formData.append('logo', payload.logo)
  }

  if (payload.id) {
    formData.append('id_grupo', payload.id)
  }

  const data = await apiClient<{ done: boolean; message?: string }>('/api/v1/grupo/crear/', {
    method: 'POST',
    body: formData
  })
  return { done: Boolean(data?.done), message: data?.message }
}
