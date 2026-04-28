/**
 * useParadasManager.ts
 * ─────────────────────────────────────────────────────────────
 * Responsabilidad: gestión del estado de las paradas temporales
 * (CRUD), lógica de inserción inteligente en la ruta, y manejo
 * de los marcadores de Google Maps en el mapa.
 * ─────────────────────────────────────────────────────────────
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ParadaPayload, TipoParada } from '../types/ruta'

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
  const dot   = A * C + B * D
  const lenSq = C * C + D * D
  const param = lenSq !== 0 ? dot / lenSq : -1

  const xx = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C
  const yy = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D

  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
}

// ── Composable ───────────────────────────────────────────────
export function useParadasManager(
  map: Ref<any>,
  tiposParada: Ref<TipoParada[]>,
  routeColor: Ref<string>,
  onMarkerClick: (index: number) => void
) {
  const paradasTemporales  = ref<ParadaPayload[]>([])
  const paradasMarkers     = ref<any[]>([])
  const paradasInfoWindows = ref<any[]>([])

  // ── Algoritmo de inserción inteligente ────────────────────

  /**
   * Devuelve el índice óptimo donde insertar un nuevo punto
   * en la ruta existente, minimizando la distancia al segmento
   * más cercano.
   */
  const calculateInsertionIndex = (lat: number, lon: number): number => {
    const ps = paradasTemporales.value
    if (ps.length === 0) return 0

    const first = ps[0]!
    if (ps.length === 1) {
      return calcDistance(lat, lon, first.lat, first.lon) < 0.5 ? 1 : 0
    }

    let minDist  = Infinity
    let bestIdx  = ps.length

    for (let i = 0; i < ps.length - 1; i++) {
      const p1 = ps[i]!, p2 = ps[i + 1]!
      const d  = distanceToSegment(lat, lon, p1.lat, p1.lon, p2.lat, p2.lon)
      if (d < minDist) { minDist = d; bestIdx = i + 1 }
    }

    const last    = ps[ps.length - 1]!
    const dFirst  = calcDistance(lat, lon, first.lat, first.lon)
    const dLast   = calcDistance(lat, lon, last.lat,  last.lon)

    if (dFirst < minDist * 1.5) return 0
    if (dLast  < minDist * 1.5) return ps.length

    return bestIdx
  }

  // ── Marcadores ────────────────────────────────────────────

  /** Agrega un marcador al mapa para una parada concreta */
  const addMarker = (lat: number, lon: number, tipoNombre: string, index: number) => {
    if (!map.value || !(window as any).google) return

    const color  = routeColor.value || '#60a5fa'
    const marker = new (window as any).google.maps.Marker({
      position:  { lat, lng: lon },
      map:       map.value,
      title:     tipoNombre,
      zIndex:    100 + index,
      icon: {
        path:        'M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z',
        fillColor:   color,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor:  '#FFFFFF',
        scale:         1.2,
        anchor:        new (window as any).google.maps.Point(12, 36),
        labelOrigin:   new (window as any).google.maps.Point(12, 12)
      },
      label: {
        text:       (index + 1).toString(),
        color:      'white',
        fontSize:   '11px',
        fontWeight: 'bold',
        fontFamily: "'Inter', sans-serif"
      },
      animation: (window as any).google.maps.Animation.DROP
    })

    const infoWindow = new (window as any).google.maps.InfoWindow({
      content: `<div style="color:#0d1116;font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:bold;padding:2px 4px;text-transform:uppercase;">${tipoNombre}</div>`
    })

    paradasInfoWindows.value.push(infoWindow)
    marker.addListener('mouseover', () => infoWindow.open({ anchor: marker, map: map.value }))
    marker.addListener('mouseout',  () => infoWindow.close())
    marker.addListener('click',     () => {
      if (index < paradasTemporales.value.length) onMarkerClick(index)
    })

    paradasMarkers.value.push(marker)
  }

  /** Elimina todos los marcadores e InfoWindows del mapa */
  const clearMarkers = () => {
    paradasInfoWindows.value.forEach(iw => { try { iw.close() } catch (_) {} })
    paradasInfoWindows.value = []

    const toClean = [...paradasMarkers.value]
    paradasMarkers.value = []
    toClean.forEach(m => {
      try {
        m.setVisible(false)
        ;(window as any).google.maps.event.clearInstanceListeners(m)
        m.setMap(null)
      } catch (_) {}
    })
  }

  /** Redibuja todos los marcadores desde paradasTemporales */
  const redrawMarkers = () => {
    clearMarkers()
    paradasTemporales.value.forEach((p, idx) => {
      const nombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || 'Parada'
      addMarker(p.lat, p.lon, nombre, idx)
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
