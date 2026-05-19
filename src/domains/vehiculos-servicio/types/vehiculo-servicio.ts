export interface VehiculoServicio {
  estado: number
  id_vehiculo: string
  placa: string
  serial_chasis: string
  marca: string
  referencia: string
  modelo: string
  color: string
  cilindrada: number
  soat: string
  soat_vence: string
  tecnomecanica: string
  tecnomecanica_vence: string
  tipo: string
}

export interface VehiculoServicioCreatePayload {
  id_grupo: string
  placa: string
  serial_chasis: string
  tipo: number
  marca: string
  color: string
  referencia: string
  modelo: number
  cilindrada: number
  soat: string
  soat_vence: string
  tecnomecanica: string
  tecnomecanica_vence: string
}

export interface VehiculoServicioUpdatePayload extends VehiculoServicioCreatePayload {
  id_vehiculo: string
}

export interface VehiculoServicioDeletePayload {
  id_grupo: string
  id_vehiculo: string
}
