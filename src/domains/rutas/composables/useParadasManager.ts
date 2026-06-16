
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ParadaPayload, TipoParada } from '../types/ruta'

import rutaBalanza from '../../../assets/ruta_balanza.png'
import rutaFin from '../../../assets/ruta_fin.png'
import rutaGasolinera from '../../../assets/ruta_gasolinera.png'
import rutaInicio from '../../../assets/ruta_inicio.png'
import rutaParqueadero from '../../../assets/ruta_parqueadero.png'
import rutaPuntoControl from '../../../assets/ruta_punto_control.png'
import rutaPuntoNormal from '../../../assets/ruta_punto_normal.png'

// ── Helpers de geometría (sin dependencia de Google) ─────────

const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLat = lat2 - lat1
  const dLon = lon2 - lon1
  return Math.sqrt(dLat * dLat + dLon * dLon)
}

const distanceToSegment = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number => {
  const A = px - x1, B = py - y1
  const C = x2 - x1, D = y2 - y1
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  const param = lenSq !== 0 ? dot / lenSq : -1

  const xx = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C
  const yy = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D

  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
}

const getIconUrl = (tipoId: number): string => {
  switch (tipoId) {
    case 1: return rutaPuntoNormal
    case 2: return rutaGasolinera
    case 3: return rutaParqueadero
    case 4: return rutaBalanza
    case 5: return rutaPuntoControl
    case 6: return rutaInicio
    case 7: return rutaFin
    default: return rutaPuntoNormal
  }
}

const createCircularIcon = (url: string, strokeColor: string, index: number, callback: (dataUrl: string) => void) => {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const img = new Image()
  img.src = url
  img.onload = () => {
    const centerX = size / 2
    const centerY = size / 2
    const radius = 21

    // Sombra suave para el círculo principal
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 3

    // Círculo blanco de fondo
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    // Quitar sombra para el borde e imagen
    ctx.shadowColor = 'transparent'

    // Borde del círculo
    ctx.lineWidth = 2.5
    ctx.strokeStyle = strokeColor
    ctx.stroke()

    // Dibujar la imagen centrada con un poco de padding
    const imgSize = 25
    ctx.drawImage(img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize)

    // Dibujar el badge con el número arriba a la derecha del círculo
    const badgeX = centerX + 15
    const badgeY = centerY - 15
    const badgeRadius = 9

    // Sombra suave para el badge
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1.5

    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI)
    ctx.fillStyle = strokeColor
    ctx.fill()

    // Borde blanco del badge
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    // Texto del badge
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((index + 1).toString(), badgeX, badgeY)

    callback(canvas.toDataURL())
  }
}

// ── Composable ───────────────────────────────────────────────
export function useParadasManager(
  map: Ref<any>,
  tiposParada: Ref<TipoParada[]>,
  routeColor: Ref<string>,
  onMarkerClick: (index: number) => void
) {
  const paradasTemporales = ref<ParadaPayload[]>([])
  const paradasMarkers = ref<any[]>([])
  const paradasInfoWindows = ref<any[]>([])

  const calculateInsertionIndex = (lat: number, lon: number): number => {
    const ps = paradasTemporales.value
    if (ps.length === 0) return 0

    const first = ps[0]!
    if (ps.length === 1) {
      return calcDistance(lat, lon, first.lat, first.lon) < 0.5 ? 1 : 0
    }

    let minDist = Infinity
    let bestIdx = ps.length

    for (let i = 0; i < ps.length - 1; i++) {
      const p1 = ps[i]!, p2 = ps[i + 1]!
      const d = distanceToSegment(lat, lon, p1.lat, p1.lon, p2.lat, p2.lon)
      if (d < minDist) { minDist = d; bestIdx = i + 1 }
    }

    const last = ps[ps.length - 1]!
    const dFirst = calcDistance(lat, lon, first.lat, first.lon)
    const dLast = calcDistance(lat, lon, last.lat, last.lon)

    if (dFirst < minDist * 1.5) return 0
    if (dLast < minDist * 1.5) return ps.length

    return bestIdx
  }

  // ── Marcadores ────────────────────────────────────────────

  /** Agrega un marcador al mapa para una parada concreta */
  const addMarker = (lat: number, lon: number, tipoNombre: string, index: number, tipoId: number) => {
    if (!map.value || !(window as any).google) return

    const color = routeColor.value || '#3b82f6'

    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng: lon },
      map: map.value,
      title: tipoNombre,
      zIndex: 100 + index,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 0
      }
    })

    createCircularIcon(getIconUrl(tipoId), color, index, (dataUrl) => {
      marker.setIcon({
        url: dataUrl,
        scaledSize: new (window as any).google.maps.Size(64, 64),
        anchor: new (window as any).google.maps.Point(32, 32)
      })
    })

    const infoWindow = new (window as any).google.maps.InfoWindow({
      content: `<div style="color:#0d1116;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;padding:2px 4px;text-transform:uppercase;">${tipoNombre}</div>`
    })

    paradasInfoWindows.value.push(infoWindow)
    marker.addListener('mouseover', () => infoWindow.open({ anchor: marker, map: map.value }))
    marker.addListener('mouseout', () => infoWindow.close())
    marker.addListener('click', () => {
      if (index < paradasTemporales.value.length) onMarkerClick(index)
    })

    paradasMarkers.value.push(marker)
  }

  /** Elimina todos los marcadores e InfoWindows del mapa */
  const clearMarkers = () => {
    paradasInfoWindows.value.forEach(iw => { try { iw.close() } catch (_) { } })
    paradasInfoWindows.value = []

    const toClean = [...paradasMarkers.value]
    paradasMarkers.value = []
    toClean.forEach(m => {
      try {
        m.setVisible(false)
          ; (window as any).google.maps.event.clearInstanceListeners(m)
        m.setMap(null)
      } catch (_) { }
    })
  }

  /** Redibuja todos los marcadores desde paradasTemporales */
  const redrawMarkers = () => {
    clearMarkers()
    paradasTemporales.value.forEach((p, idx) => {
      const nombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || 'Parada'
      addMarker(p.lat, p.lon, nombre, idx, p.tipo)
    })
  }

  // ── CRUD de paradas ───────────────────────────────────────

  /**
   * Inserta una nueva parada en el índice dado.
   * Devuelve el índice de inserción para que el llamador
   * dispare el recálculo de la ruta desde ahí.
   */
  const insertParada = (
    lat: number,
    lon: number,
    tipo: number,
    insertionIndex: number
  ): number => {
    const newParada: ParadaPayload = { lat, lon, tipo }
    paradasTemporales.value.splice(insertionIndex, 0, newParada)
    redrawMarkers()
    return insertionIndex
  }

  /** Elimina una parada por índice y redibuja marcadores */
  const deleteParada = (index: number) => {
    paradasTemporales.value.splice(index, 1)
    redrawMarkers()
  }

  /** Actualiza el tipo de una parada existente */
  const updateParadaTipo = (index: number, tipo: number) => {
    const parada = paradasTemporales.value[index]
    if (!parada) return
    parada.tipo = tipo
    redrawMarkers()
  }

  return {
    paradasTemporales,
    paradasMarkers,
    paradasInfoWindows,
    calculateInsertionIndex,
    addMarker,
    clearMarkers,
    redrawMarkers,
    insertParada,
    deleteParada,
    updateParadaTipo
  }
}
