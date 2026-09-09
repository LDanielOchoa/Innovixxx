export interface Hardware {
  id_hardware: string
  nombre: string
  descripcion: string
  serial: string
  imei: string
  mac: string
  id_familia: number
  familia?: string
  estado?: number | string
  habilitado?: number | boolean
  bateria?: number | string
  numero_sms?: string
  id_binario?: string
  clave_open?: string
  isdn?: string | number | null
  id_servicio?: string
  grupo_servicio?: string
  id_ruta?: number | string
}

export interface HardwareChangeStatePayload {
  id_grupo: string
  id_hardware: string
  habilitado: number // 0 para deshabilitar, 1 para habilitar
}

export interface FamiliaHardware {
  id_familia: number
  nombre: string
  descripcion: string
}

export interface HardwareCreatePayload {
  nombre: string
  descripcion: string
  serial: string
  imei: string
  mac: string
  id_familia: number
  id_grupo: string
  estado: number
  id_ruta: number | string
  numero_sms: string
  id_binario: string
  clave_open: string
  isdn?: string | number | null
}

export interface HardwareUpdatePayload extends HardwareCreatePayload {
  id_hardware: string
}

export interface HardwareDeletePayload {
  id_grupo: string
  id_hardware: string
}

export interface Posicion {
  battery: string
  course: string
  lat: string
  lon: string
  server_time: string
  sos: string
  speed: string
  time_dv: string
  time_fx: string
}

export interface MapPositionsPayload {
  id_hardware: string
  id_grupo: string
  desde: string
  hasta: string
}

export interface HardwareAbrirCandadoPayload {
  id_grupo: string
  id_hardware: string
  clave_hardware: string
  modo: 'sms'
}

export interface HardwareOffsetHoursPayload {
  id_grupo: string
  id_hardware: string
  offset: number
}
