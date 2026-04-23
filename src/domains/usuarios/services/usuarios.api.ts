import { apiClient } from '../../../utils/api-client'
import type {
  Grupo,
  RoleOption,
  Usuario,
  UsuarioCreatePayload,
  UsuarioDeletePayload,
  UsuarioUpdatePayload
} from '../types/usuario'

export const fetchGruposApi = async (): Promise<Grupo[]> => {
  const data = await apiClient<{ done: boolean, data: Grupo[] }>('/api/v1/grupo/listar/', {
    method: 'POST'
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const listUsuariosByGrupoApi = async (id_grupo: string, lang: string): Promise<any[]> => {
  const data = await apiClient<{ done: boolean, data: any[] }>('/api/v1/usuario/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, lang })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const fetchRolesByGrupoApi = async (id_grupo: string): Promise<RoleOption[]> => {
  const data = await apiClient<{ done: boolean, data: any[] }>('/api/v1/role/listar/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  if (!data.done || !Array.isArray(data.data)) return []

  return data.data.map((role: any) => ({
    id_role: role.id_role,
    nombre: role.nombre
  }))
}

export const createUsuarioApi = async (payload: UsuarioCreatePayload): Promise<any> => {
  return apiClient('/api/v1/usuario/crear/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const updateUsuarioApi = async (payload: UsuarioUpdatePayload): Promise<{ data: any; raw: string; status: number }> => {
  // Nota: Mantenemos el retorno de raw y status para compatibilidad con la lógica actual de UsuariosListView.vue 
  // que maneja validaciones específicas del backend, aunque apiClient lanza errores para status != 200.
  // Sin embargo, para 200 OK con done: false, apiClient retorna el objeto.
  const data = await apiClient<any>('/api/v1/usuario/actualizar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  
  return { data, raw: JSON.stringify(data), status: 200 }
}

export const deleteUsuarioApi = async (payload: UsuarioDeletePayload): Promise<{ data: any; status: number }> => {
  const data = await apiClient<any>('/api/v1/usuario/borrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return { data, status: 200 }
}

export const mapUsuariosFromApi = (items: any[], grupo: Grupo, fallbackLang: string): Usuario[] => {
  return items.map((item: any, index: number) => ({
    id: item.id_usuario ?? item.id ?? item.id_user ?? item.user_id ?? `${grupo.id}-${index + 1}`,
    nombre: item.nombre ?? item.name ?? '',
    email: item.email ?? '',
    lang: item.lang ?? fallbackLang,
    pass: item.pass ?? '',
    id_role: item.id_role ?? item.role_id ?? '',
    id_grupo: grupo.id,
    grupo_nombre: item.grupo ?? item.grupo_nombre ?? grupo.nombre,
    time_zone: item.time_zone ?? item.timezone ?? '',
    foto: item.foto ?? ''
  }))
}
