export interface Usuario {
  id: number | string
  nombre: string
  email: string
  lang: string
  id_role: string
  id_grupo: string
  grupo_nombre: string
  time_zone?: string
  foto?: string
}

export interface Grupo {
  id: string
  nombre: string
}

export interface RoleOption {
  id_role: string
  nombre: string
}

export interface UsuarioCreatePayload {
  id_grupo: string
  id_role: string
  nombre: string
  email: string
  lang: string
  pass: string
}

export interface UsuarioUpdatePayload {
  id_grupo: string
  id_usuario: string
  id_role: string
  nombre: string
  email: string
  lang: string
  pass?: string
}

export interface UsuarioDeletePayload {
  id_grupo: string
  id_usuario: string
  lang: string
}
