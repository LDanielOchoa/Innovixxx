import type { GeocercaDetalle, ElementoGeocercaCluster, GeocercaCluster } from '../types/geocerca'

/**
 * useGeocercaClustering
 * ─────────────────────────────────────────────────────────────
 * Responsabilidad: Cálculo de centros geométricos de geocercas
 * y algoritmo de agrupación (clustering) basado en distancia
 * en píxeles proyectados en pantalla según el nivel de zoom.
 * Cumple con principios SOLID (SRP).
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Calcula el centro geométrico de una geocerca a partir de sus puntos.
 * Para geocercas circulares toma el primer punto.
 * Para poligonales calcula el centroide promedio de todos los vértices.
 */
export const calcularCentroGeocerca = (detalle: GeocercaDetalle): { lat: number; lon: number } | null => {
  if (!detalle?.puntos || detalle.puntos.length === 0) return null

  if (detalle.tipo === 'Circular') {
    const p = detalle.puntos[0]
    const lat = parseFloat(p.lat)
    const lon = parseFloat(p.lon)
    if (isNaN(lat) || isNaN(lon)) return null
    return { lat, lon }
  }

  // Poligonal: calcular centroide
  let sumaLat = 0
  let sumaLon = 0
  let validos = 0

  detalle.puntos.forEach(p => {
    const lat = parseFloat(p.lat)
    const lon = parseFloat(p.lon)
    if (!isNaN(lat) && !isNaN(lon)) {
      sumaLat += lat
      sumaLon += lon
      validos++
    }
  })

  if (validos === 0) return null
  return {
    lat: sumaLat / validos,
    lon: sumaLon / validos
  }
}

/**
 * Convierte coordenadas geográficas a píxeles de pantalla usando
 * proyección esférica de Mercator para el nivel de zoom dado.
 */
const toPixel = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const sinLat = Math.sin((lat * Math.PI) / 180)
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat))
  const escala = 256 * Math.pow(2, zoom)
  const x = ((lng + 180) / 360) * escala
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * escala
  return { x, y }
}

/**
 * Agrupa los elementos de geocercas en clusters según la distancia en píxeles en el nivel de zoom actual.
 * Utiliza proyección esférica de Mercator para convertir coordenadas geográficas a píxeles.
 * El ID del cluster se basa en los IDs de sus miembros para que sea estable entre renders.
 */
export const agruparGeocercasEnClusters = (
  elementos: ElementoGeocercaCluster[],
  zoom: number,
  radioClusterPx: number = 75
): { clusters: GeocercaCluster[]; elementosIndividuales: ElementoGeocercaCluster[] } => {
  const puntos = elementos.map(elemento => {
    const { x, y } = toPixel(elemento.lat, elemento.lon, zoom)
    return { elemento, lat: elemento.lat, lng: elemento.lon, x, y, visitado: false }
  })

  const clusters: GeocercaCluster[] = []
  const elementosIndividuales: ElementoGeocercaCluster[] = []

  for (let i = 0; i < puntos.length; i++) {
    if (puntos[i].visitado) continue
    puntos[i].visitado = true

    const clusterActual: typeof puntos = [puntos[i]]

    for (let j = i + 1; j < puntos.length; j++) {
      if (puntos[j].visitado) continue
      const dx = puntos[i].x - puntos[j].x
      const dy = puntos[i].y - puntos[j].y
      const distancia = Math.sqrt(dx * dx + dy * dy)
      if (distancia <= radioClusterPx) {
        puntos[j].visitado = true
        clusterActual.push(puntos[j])
      }
    }

    if (clusterActual.length > 1) {
      let sumaLat = 0
      let sumaLng = 0
      clusterActual.forEach(p => {
        sumaLat += p.lat
        sumaLng += p.lng
      })
      const latCentro = sumaLat / clusterActual.length
      const lngCentro = sumaLng / clusterActual.length

      // ID estable basado en los IDs de los miembros (ordenados) para evitar
      // re-creación del marcador en cada evento de zoom/pan
      const memberIds = clusterActual.map(p => p.elemento.id).sort().join('_')
      clusters.push({
        id: `cluster_geo_${memberIds}`,
        latCentro,
        lngCentro,
        elementos: clusterActual.map(p => p.elemento)
      })
    } else {
      elementosIndividuales.push(clusterActual[0].elemento)
    }
  }

  return { clusters, elementosIndividuales }
}
