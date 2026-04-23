export interface Role {
  id_role: string
  nombre: string
  descripcion: string
  is_admin: boolean
}

export interface Grupo {
  id: string
  nombre: string
}

export interface RoleUpsertPayload {
  id_grupo: string
  nombre: string
  descripcion: string
  is_admin?: boolean
  lang?: string
}

export interface RoleUpdatePayload extends RoleUpsertPayload {
  id_role: string
}
