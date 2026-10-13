export interface Conductor {
  id_conductor: string
  nombre: string
  email: string
  cedula: string
  celular: string
  pase: string
  tipo_pase: string
  pase_vence: string
  foto: string
  id_servicio: string
  grupo_servicio: string
  id_vehiculo: string
  estado: string
}

export interface ConductorListResponse {
  message?: string
  done: boolean
  data: Conductor[]
}

export interface ConductorCreatePayload {
  id_grupo: string
  nombre: string
  cedula: string
  email: string
  celular: string
  tipo_pase: string
  pase: string
  pase_vence: string
  foto?: File | null
}

export interface ConductorCreateResponse {
  message?: string
  done: boolean
  data?: any
}

export interface ConductorUpdatePayload {
  id_conductor: string
  id_grupo: string
  nombre?: string
  cedula?: string
  email?: string
  celular?: string
  tipo_pase?: string
  pase?: string
  pase_vence?: string
  foto?: File | null
}

export interface ConductorUpdateResponse {
  message?: string
  done: boolean
  data?: any
}

export interface ConductorDeletePayload {
  id_grupo: string
  id_conductor: string
  id_escolta?: string
}

export interface ConductorDeleteResponse {
  message?: string
  done: boolean
  data?: any
}
