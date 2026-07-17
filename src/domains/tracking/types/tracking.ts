export interface HardwareWs {
  serial: string
  id_familia: number
  nombre: string
  descripcion: string
  id_grupo_servicio: string
  estado: number
  id_servicio: string
  id_hardware: string
  lat: number
  lon: number
  time_fx: number
  speed: number
  course: number
  battery: number
  comm_pending?: string
  sos?: boolean
  status_lock?: string
  device_ts?: string
  gps_valido?: boolean
  id_escolta?: string
}
