export interface Vehiculo {
  id_vehiculo: string
  nombre: string
  placa: string
  serial: string
  tipo: string | number
  estado: number | string
}

export interface TipoVehiculo {
  id_tipo: number
  nombre: string
}

export interface VehiculoCreatePayload {
  nombre: string
  placa: string
  serial: string
  tipo: number | string
  id_grupo: string
}

export interface VehiculoUpdatePayload extends VehiculoCreatePayload {
  id_vehiculo: string
}

export interface VehiculoDeletePayload {
  id_grupo: string
  id_vehiculo: string
}
