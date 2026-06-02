export interface Servicio {
  id_servicio: string
  fecha_inicio: string
  modo_fin: string
  alcance: string
  nivel_riesgo: string
  estado: string
  id_ruta: string
}

export interface ServicioListPayload {
  id_grupo: string
  estado: number
  fecha_registro_inicial: string
  fecha_registro_final: string
  id_ruta: string
  id_escolta: string
}

export interface ServicioCreatePayload {
  id_grupo: string
  id_ruta: string
  fecha_hora_inicio: string
  modo_fin: number
  vehiculos_id: string[]
}

export interface RutaSimple {
  id_ruta: string
  nombre: string
}

export interface VehiculoSimple {
  id_vehiculo: string
  nombre: string
  placa: string
  tipo: string
  estado: string
}

export interface HardwareSimple {
  id_hardware: string
  nombre: string
  familia: string
  estado: string
}

export interface EscoltaSimple {
  id_escolta: string
  nombre: string
  celular: string
  estado: string
}

export interface ServicioAsignarRecursosPayload {
  id_grupo: string
  id_servicio: string
  fecha_hora_inicio: string
  modo_fin: number
  nivel_riesgo: number
  alcance: number
  id_ruta: string
  vehiculos: Record<string, string[]>
  escoltas_id: string[]
}

export interface ServicioDashboardVehiculo {
  [id_vehiculo: string]: string[]
}

export interface ServicioDashboard {
  id_servicio: string
  fecha_inicio: string
  modo_fin: string
  alcance: string
  nivel_riesgo: string
  estado: string
  id_ruta: string
  vehiculos: ServicioDashboardVehiculo
  rutas: string[]
  escoltas: string[]
}

export interface ServicioDashboardPayload {
  id_grupo: string
  id_servicio: string
  estado: number
}

export interface ServicioDashboardResponse {
  message: string
  done: boolean
  data: {
    servicios: ServicioDashboard[]
  }
}

export interface ServicioActualizarEscoltasPayload {
  id_grupo: string
  id_servicio: string
  salen: string[]
  entran: string[]
}

export interface ServicioActualizarVehiculosPayload {
  id_grupo: string
  id_servicio: string
  ids_salen: string[]
  ids_entran: Record<string, string[]>
}

export interface ServicioHistorialItem {
  evento: number
  descripcion: string
  created_at: string
}

export interface ServicioHistorialPayload {
  id_grupo: string
  id_servicio: string
}

export interface ServicioHistorialResponse {
  message: string
  done: boolean
  data: ServicioHistorialItem[]
}

export interface ServicioCambiarEstadoPayload {
  id_grupo: string
  id_servicio: string
  old_state: number
  new_state: number
  descripcion: string
}

export const SERVICIO_ESTADOS = {
  TODOS: 0,
  PRERCARGA: 1,
  EN_ESPERA: 2,
  EJECUCION_OK: 3,
  EJECUCION_FAIL: 4,
  FINALIZADO: 5,
  CANCELADO: 6
} as const

export const SERVICIO_ESTADOS_LABELS: Record<number, string> = {
  1: 'PRERCARGA',
  2: 'EN ESPERA',
  3: 'EJECUCION OK',
  4: 'EJECUCION FAIL',
  5: 'FINALIZADO',
  6: 'CANCELADO'
}

export const SERVICIO_ESTADOS_VALID_NEXT_PROD: Record<number, number[]> = {
  1: [2, 6],
  2: [3, 6],
  3: [4, 5],
  4: [3, 5],
  5: [],
  6: []
}

export const SERVICIO_ESTADOS_VALID_NEXT_DEV: Record<number, number[]> = {
  1: [2, 3, 4, 5, 6],
  2: [1, 3, 4, 5, 6],
  3: [1, 2, 4, 5, 6],
  4: [1, 2, 3, 5, 6],
  5: [1, 2, 3, 4, 6],
  6: [1, 2, 3, 4, 5]
}
