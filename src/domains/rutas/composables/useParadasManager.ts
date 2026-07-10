
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

const createCircularIcon = (url: string, strokeColor: string, index: number, isNormal: boolean, callback: (dataUrl: string) => void) => {
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
    const radius = isNormal ? 14 : 21

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
    const imgSize = isNormal ? 16 : 25
    ctx.drawImage(img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize)

    callback(canvas.toDataURL())
  }
}

const formatFecha = (fechaStr: any): string => {
  if (!fechaStr) return ''
  const num = Number(fechaStr)
  if (!isNaN(num) && num > 0) {
    // Si tiene 10 dígitos (segundos), multiplicar por 1000
    const dateObj = new Date(num < 10000000000 ? num * 1000 : num)
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear()
      const m = String(dateObj.getMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getDate()).padStart(2, '0')
      const h = String(dateObj.getHours()).padStart(2, '0')
      const min = String(dateObj.getMinutes()).padStart(2, '0')
      const s = String(dateObj.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}:${s}`
    }
  }
  return String(fechaStr)
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
    return paradasTemporales.value.length
  }

  // ── Marcadores ────────────────────────────────────────────

  /** Agrega un marcador al mapa para una parada concreta */
  const addMarker = (lat: number, lon: number, tipoNombre: string, index: number, tipoId: number, fecha?: string) => {
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

    createCircularIcon(getIconUrl(tipoId), color, index, tipoId === 1, (dataUrl) => {
      marker.setIcon({
        url: dataUrl,
        scaledSize: new (window as any).google.maps.Size(64, 64),
        anchor: new (window as any).google.maps.Point(32, 32)
      })
    })

    let contentString = `<div style="padding: 6px 12px; text-align: center; font-family: 'Share Tech Mono', monospace; min-width: 140px;">`
    contentString += `<div style="font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;${fecha ? ' margin-bottom: 2px;' : ''}">${tipoNombre}</div>`
    if (fecha) {
      contentString += `<div style="font-size: 11px; color: #64748b; font-weight: 500; letter-spacing: 0.02em;">${formatFecha(fecha)}</div>`
    }
    contentString += `</div>`

    const infoWindow = new (window as any).google.maps.InfoWindow({
      content: contentString
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
      addMarker(p.lat, p.lon, nombre, idx, p.tipo, (p as any).fecha)
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
    insertionIndex: number,
    fecha?: string
  ): number => {
    const newParada: ParadaPayload & { fecha?: string } = { lat, lon, tipo, fecha }
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
