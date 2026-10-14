export interface Ruta {
  id_ruta: string
  nombre: string
  descripcion: string
  estado: string
  descripcion_punto_inicial?: string | null
  descripcion_punto_final?: string | null
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
  descripcion_punto_inicial?: string | null
  descripcion_punto_final?: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  optimizar?: boolean
  paradas: ParadaDetalle[]
}

export interface RutaCreatePayload {
  id_grupo: string
  nombre: string
  descripcion: string
  color?: string
  descripcion_punto_inicial?: string
  descripcion_punto_final?: string
  optimizar?: boolean
  paradas?: ParadaPayload[]
}

export interface RutaUpdatePayload {
  id_grupo: string
  id_ruta: string
  nombre: string
  descripcion: string
  color: string
  descripcion_punto_inicial?: string
  descripcion_punto_final?: string
  optimizar?: boolean
  paradas: ParadaPayload[]
}

export interface RutaHeredarTrazadoPayload {
  id_grupo: string
  id_ruta_origen: string
  id_ruta_destino: string
}

