export interface Servicio {
  id_servicio: string
  fecha_inicio: string
  modo_fin: string
  alcance: string
  nivel_riesgo: string
  estado: string
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
  id_ruta: string
  vehiculos_id: string[]
  hardware_id: string[]
  escoltas_id: string[]
}

export const SERVICIO_ESTADOS = {
  TODOS: 0,
  PRERCARGA: 1,
  EN_ESPERA: 2,
  EJECUCION_OK: 3,
  EJECUCION_FAIL: 4,
  FINALIZADO: 5
} as const
