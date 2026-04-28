export interface Geocerca {
  id_geocerca: string
  nombre: string
  descripcion: string
  color: string
  tipo: 'Circular' | 'Poligonal' | string
  fecha_creada: string
  fecha_actualizada: string
}

export interface GeocercaDetalle extends Geocerca {
  is_active: boolean
  puntos: Array<{
    id_punto: number
    lat: string
    lon: string
    radio: string | null
  }>
}
export interface GeocercaCreatePayload {
  id_grupo: string
  nombre: string
  descripcion: string
  color: string
  tipo: 1 | 2 // 1: Circular, 2: Poligonal
  paradas: Array<{
    lat: number
    lon: number
    radio?: number
  }>
}
