import type { Grupo, Role, RoleUpdatePayload, RoleUpsertPayload } from '../types/role'
import { apiClient } from '../../../utils/api-client'

interface BackendResponse<T> {
  done: boolean
  data?: T
  message?: string
}

export const fetchGruposApi = async (): Promise<Grupo[]> => {
  const data = await apiClient<BackendResponse<Grupo[]>>('/api/v1/grupo/listar/')
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const fetchRolesApi = async (id_grupo: string): Promise<Role[]> => {
  const data = await apiClient<BackendResponse<Role[]>>('/api/v1/role/listar/', {
    body: JSON.stringify({ id_grupo })
  })
  if (data.done && Array.isArray(data.data)) return data.data
  return []
}

export const createRoleApi = async (payload: RoleUpsertPayload): Promise<{ done: boolean; message?: string }> => {
  const data = await apiClient<BackendResponse<null>>('/api/v1/role/crear/', {
    body: JSON.stringify(payload)
  })
  return { done: Boolean(data?.done), message: data?.message }
}

export const updateRoleApi = async (payload: RoleUpdatePayload): Promise<{ done: boolean; message?: string }> => {
  const data = await apiClient<BackendResponse<null>>('/api/v1/role/actualizar/', {
    body: JSON.stringify(payload)
  })
  return { done: Boolean(data?.done), message: data?.message }
}
