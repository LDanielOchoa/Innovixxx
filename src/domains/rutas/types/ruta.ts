export interface Ruta {
  id_ruta: string
  nombre: string
  descripcion: string
  estado: string
  fecha_creada?: string
  fecha_actualizada?: string
}

export interface TipoParada {
  id_tipo: number
  nombre: string
}

export interface ParadaPayload {
  lat: number
  lon: number
  tipo: number
}

export interface ParadaDetalle {
  id_parada: number
  lat: string
  lon: string
  id_tipo_parada: number
  tipo_nombre: string
}

export interface RutaDetalle {
  id_ruta: string
  nombre: string
  descripcion: string
  color: string
  created_at: string
  updated_at: string
  is_active: boolean
  paradas: ParadaDetalle[]
}

export interface RutaCreatePayload {
  id_grupo: string
  nombre: string
  descripcion: string
  color?: string
  paradas?: ParadaPayload[]
}

export interface RutaUpdatePayload {
  id_grupo: string
  id_ruta: string
  nombre: string
  descripcion: string
  color: string
  paradas: ParadaPayload[]
}
