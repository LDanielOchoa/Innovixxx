export interface Escolta {
  id_escolta: string
  nombre: string
  cedula: string
  email: string
  celular: string
  id_grupo: string
  estado: string
  id_servicio: number
  id_vehiculo: number
  id_hardware: number
}

export const ESCOLTA_ESTADO = {
  TODOS: 0,
  DISPONIBLE: 1,
  EN_SERVICIO: 2,
  NO_DISPONIBLE: 3
} as const

export const ESCOLTA_ESTADO_LABELS: Record<string, string> = {
  'DISPONIBLE': 'Disponible',
  'EN SERVICIO': 'En Servicio',
  'NO DISPONIBLE': 'No Disponible'
}

export interface EscoltaCreatePayload {
  nombre: string
  cedula: string
  email: string
  celular: string
  id_grupo: string
  id_servicio: string
  id_vehiculo: string
  id_hardware: string
  tipo_pase: string
  pase: string
  pase_vence: string
}

export interface EscoltaUpdatePayload extends EscoltaCreatePayload {
  id_escolta: string
}

export interface EscoltaDeletePayload {
  id_grupo: string
  id_escolta: string
}

export interface EscoltaValidatePrePayload {
  id_grupo: string
  id_escolta: string
}

export interface EscoltaValidatePostPayload extends EscoltaValidatePrePayload {
  codigo: string
}
