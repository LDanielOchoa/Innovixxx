
import { ref, shallowRef } from 'vue'
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

// ── Loader visual que se muestra en la posición del punto mientras se elimina.
// SVG con animación SMIL (funciona dentro de data URLs usados como <img>,
// siempre que el Marker tenga optimized: false).
const SPINNER_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">` +
  `<circle cx="24" cy="24" r="20" fill="#ffffff" stroke="#fecaca" stroke-width="2" opacity="0.95">` +
  `<animate attributeName="r" values="20;18;20" dur="1s" repeatCount="indefinite"/>` +
  `</circle>` +
  `<circle cx="24" cy="24" r="14" fill="none" stroke="#ef4444" stroke-width="3.5" ` +
  `stroke-dasharray="60 30" stroke-linecap="round">` +
  `<animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="0.6s" repeatCount="indefinite"/>` +
  `</circle></svg>`
const SPINNER_ICON_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(SPINNER_SVG)}`

// Cache en memoria para DataURLs de íconos ya generados
const iconCache = new Map<string, string>()
const placeholderCache = new Map<string, string>()

// ── FIX: Icono placeholder síncrono con caché ──────────────────
const createPlaceholderIcon = (strokeColor: string, isNormal: boolean): string => {
  const cacheKey = `${strokeColor}_${isNormal}`
  if (placeholderCache.has(cacheKey)) {
    return placeholderCache.get(cacheKey)!
  }

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const centerX = size / 2
  const centerY = size / 2
  const radius = isNormal ? 14 : 21

  ctx.shadowColor = 'rgba(0, 0, 0, 0.20)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 2

  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()

  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = strokeColor
  ctx.stroke()

  const resultDataUrl = canvas.toDataURL()
  placeholderCache.set(cacheKey, resultDataUrl)
  return resultDataUrl
}

// ── FIX #2: createCircularIcon con caché, cancelación y onerror ──────
const createCircularIcon = (
  url: string,
  strokeColor: string,
  isNormal: boolean,
  callback: (dataUrl: string) => void
): (() => void) => {
  const cacheKey = `${url}_${strokeColor}_${isNormal}`
  if (iconCache.has(cacheKey)) {
    callback(iconCache.get(cacheKey)!)
    return () => {}
  }

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  let cancelled = false
  const cancel = () => { cancelled = true }

  if (!ctx) return cancel

  const img = new Image()

  img.onload = () => {
    if (cancelled) return

    const centerX = size / 2
    const centerY = size / 2
    const radius = isNormal ? 14 : 21

    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 3

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.lineWidth = 2.5
    ctx.strokeStyle = strokeColor
    ctx.stroke()

    const imgSize = isNormal ? 16 : 25
    ctx.drawImage(img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize)

    const resultDataUrl = canvas.toDataURL()
    iconCache.set(cacheKey, resultDataUrl)
    callback(resultDataUrl)
  }

  img.onerror = () => { /* fallback si falla la imagen */ }

  img.src = url
  return cancel
}

const formatFecha = (fechaStr: any): string => {
  if (!fechaStr) return ''
  const num = Number(fechaStr)
  if (!isNaN(num) && num > 0) {
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

// ── Shared Single InfoWindow (Evita instanciar cientos de InfoWindows) ──
let sharedInfoWindow: any = null
const getSharedInfoWindow = () => {
  if (!sharedInfoWindow && (window as any).google?.maps?.InfoWindow) {
    sharedInfoWindow = new (window as any).google.maps.InfoWindow({ disableAutoPan: true })
  }
  return sharedInfoWindow
}

// ── Composable ───────────────────────────────────────────────
export function useParadasManager(
  map: Ref<any>,
  tiposParada: Ref<TipoParada[]>,
  routeColor: Ref<string>,
  onMarkerClick: (index: number) => void,
  onMarkerRightClick?: (index: number) => void | Promise<void>,
  onMarkerDragEnd?: (index: number, lat: number, lon: number) => void
) {
  const paradasTemporales = ref<ParadaPayload[]>([])
  const paradasMarkers     = shallowRef<any[]>([])
  const paradaIconCancellers = shallowRef<Array<() => void>>([])

  const calculateInsertionIndex = (lat: number, lon: number): number => {
    return paradasTemporales.value.length
  }

  // ── Marcadores ────────────────────────────────────────────

  /** Agrega un marcador al mapa para una parada concreta */
  const addMarker = (lat: number, lon: number, tipoNombre: string, index: number, tipoId: number, fecha?: string) => {
    if (!map.value || !(window as any).google) return null

    const color    = routeColor.value || '#3b82f6'
    const isNormal = tipoId === 1
    const currentMap = map.value

    const placeholderUrl = createPlaceholderIcon(color, isNormal)

    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng: lon },
      map: currentMap,
      title: tipoNombre,
      draggable: true,
      zIndex: 1000 + index,
      clickable: true,
      icon: placeholderUrl
        ? {
            url: placeholderUrl,
            scaledSize: new (window as any).google.maps.Size(64, 64),
            anchor: new (window as any).google.maps.Point(32, 32)
          }
        : {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: isNormal ? 8 : 13,
            fillColor: '#FFFFFF',
            fillOpacity: 1,
            strokeColor: color,
            strokeWeight: 2.5
          }
    })

    const cancelIconLoad = createCircularIcon(getIconUrl(tipoId), color, isNormal, (dataUrl) => {
      try {
        marker.setIcon({
          url: dataUrl,
          scaledSize: new (window as any).google.maps.Size(64, 64),
          anchor: new (window as any).google.maps.Point(32, 32)
        })
      } catch (_) { }
    })
    paradaIconCancellers.value.push(cancelIconLoad)

    // Listener de hover usando la única instancia compartida de InfoWindow
    marker.addListener('mouseover', () => {
      const currentIdx = paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1) {
        const parada = paradasTemporales.value[currentIdx]
        const name = tiposParada.value.find(t => t.id_tipo === parada?.tipo)?.nombre || tipoNombre || 'Parada'
        let contentString = `<div style="background: #ffffff; border-radius: 10px; padding: 8px 14px; text-align: center; font-family: 'Inter', sans-serif; min-width: 140px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);">`
        contentString += `<div style="font-size: 10px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px;">Parada ${currentIdx + 1}</div>`
        contentString += `<div style="font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;${fecha ? ' margin-bottom: 2px;' : ''}">${name}</div>`
        if (fecha) {
          contentString += `<div style="font-size: 11px; color: #64748b; font-weight: 500; letter-spacing: 0.02em;">${formatFecha(fecha)}</div>`
        }
        contentString += `</div>`

        const iw = getSharedInfoWindow()
        if (iw) {
          iw.setContent(contentString)
          iw.open({ anchor: marker, map: currentMap })
        }
      }
    })

    marker.addListener('mouseout', () => {
      const iw = getSharedInfoWindow()
      if (iw) iw.close()
    })

    marker.addListener('click', () => {
      const currentIdx = paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length) {
        onMarkerClick(currentIdx)
      }
    })

    marker.addListener('rightclick', (e: any) => {
      if (e?.domEvent) e.domEvent.preventDefault()
      const currentIdx = paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length) {
        if (onMarkerRightClick) onMarkerRightClick(currentIdx)
      }
    })

    marker.addListener('dragend', (e: any) => {
      const currentIdx = paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length && e.latLng) {
        const newLat = e.latLng.lat()
        const newLng = e.latLng.lng()
        paradasTemporales.value[currentIdx].lat = newLat
        paradasTemporales.value[currentIdx].lon = newLng
        if (onMarkerDragEnd) {
          onMarkerDragEnd(currentIdx, newLat, newLng)
        }
      }
    })

    return marker
  }

  /** Elimina todos los marcadores del mapa */
  const clearMarkers = () => {
    paradaIconCancellers.value.forEach(cancel => { try { cancel() } catch (_) {} })
    paradaIconCancellers.value = []

    if (sharedInfoWindow) {
      try { sharedInfoWindow.close() } catch (_) {}
    }

    const toClean = [...paradasMarkers.value]
    paradasMarkers.value = []
    toClean.forEach(m => {
      try {
        m.setVisible(false)
        m.setMap(null)
        ; (window as any).google.maps.event.clearInstanceListeners(m)
      } catch (_) { }
    })
  }

  /** Redibuja todos los marcadores desde paradasTemporales */
  const redrawMarkers = () => {
    clearMarkers()
    const newMarkers: any[] = []
    paradasTemporales.value.forEach((p, idx) => {
      const nombre = tiposParada.value.find(t => t.id_tipo === p.tipo)?.nombre || 'Parada'
      const m = addMarker(p.lat, p.lon, nombre, idx, p.tipo, (p as any).fecha)
      if (m) newMarkers.push(m)
    })
    paradasMarkers.value = newMarkers
  }

  // ── CRUD de paradas ───────────────────────────────────────

  /**
   * Inserta una nueva parada incrementalmente SIN destruir todos los marcadores anteriores.
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

    const nombre = tiposParada.value.find(t => t.id_tipo === tipo)?.nombre || 'Parada'
    const newMarker = addMarker(lat, lon, nombre, insertionIndex, tipo, fecha)

    if (newMarker) {
      if (insertionIndex >= paradasMarkers.value.length) {
        paradasMarkers.value.push(newMarker)
      } else {
        paradasMarkers.value.splice(insertionIndex, 0, newMarker)
      }

      // Actualizar zIndex para mantener orden correcto
      for (let i = insertionIndex; i < paradasMarkers.value.length; i++) {
        try { paradasMarkers.value[i].setZIndex(1000 + i) } catch (_) {}
      }
    } else {
      // Fallback si por alguna razón no creó el mapa
      redrawMarkers()
    }

    return insertionIndex
  }

  /**
   * Elimina de inmediato un marcador concreto del mapa y lo saca de los arrays.
   */
  const removeMarkerAt = (index: number) => {
    const marker = paradasMarkers.value[index]
    if (marker) {
      try { marker.setVisible(false) } catch (_) { }
      try { marker.setMap(null) } catch (_) { }
      try { (window as any).google.maps.event.clearInstanceListeners(marker) } catch (_) { }
    }
    const cancel = paradaIconCancellers.value[index]
    if (cancel) { try { cancel() } catch (_) { } }

    paradasMarkers.value       = paradasMarkers.value.filter((_, i) => i !== index)
    paradaIconCancellers.value = paradaIconCancellers.value.filter((_, i) => i !== index)
  }

  /**
   * Elimina una parada por índice (borrado quirúrgico O(1)).
   */
  const deleteParada = (index: number): number => {
    if (index < 0 || index >= paradasTemporales.value.length) return -1

    const paradaToDelete = paradasTemporales.value[index]

    // 1. Mostrar spinner en la posición del punto a eliminar
    const marker = paradasMarkers.value[index]
    const currentMap = map.value
    let spinner: any = null
    if (marker && currentMap && (window as any).google) {
      try {
        const position = marker.getPosition()
        if (position) {
          spinner = new (window as any).google.maps.Marker({
            position,
            map: currentMap,
            icon: {
              url: SPINNER_ICON_URL,
              scaledSize: new (window as any).google.maps.Size(40, 40),
              anchor: new (window as any).google.maps.Point(20, 20)
            },
            optimized: false,
            zIndex: 9999,
            clickable: false
          })
        }
      } catch (_) { }
    }

    // 2. Borrado quirúrgico del marcador
    removeMarkerAt(index)

    // 3. Eliminar del array de datos
    const realIndex = paradasTemporales.value.indexOf(paradaToDelete)
    if (realIndex !== -1) {
      paradasTemporales.value.splice(realIndex, 1)
    }

    // 4. Actualizar zIndex de los marcadores restantes
    paradasMarkers.value.forEach((m, i) => {
      try { m.setZIndex(1000 + i) } catch (_) { }
    })

    // 5. Quitar el spinner
    if (spinner) {
      setTimeout(() => {
        try { spinner.setMap(null) } catch (_) { }
      }, 150)
    }

    return realIndex !== -1 ? realIndex : index
  }

  /** Actualiza el tipo de una parada existente sin destruir todos los marcadores */
  const updateParadaTipo = (index: number, tipo: number) => {
    const parada = paradasTemporales.value[index]
    if (!parada) return
    parada.tipo = tipo

    const marker = paradasMarkers.value[index]
    if (marker) {
      const color    = routeColor.value || '#3b82f6'
      const isNormal = tipo === 1
      const nombre   = tiposParada.value.find(t => t.id_tipo === tipo)?.nombre || 'Parada'
      try { marker.setTitle(nombre) } catch (_) {}

      createCircularIcon(getIconUrl(tipo), color, isNormal, (dataUrl) => {
        try {
          marker.setIcon({
            url: dataUrl,
            scaledSize: new (window as any).google.maps.Size(64, 64),
            anchor: new (window as any).google.maps.Point(32, 32)
          })
        } catch (_) {}
      })
    }
  }

  return {
    paradasTemporales,
    paradasMarkers,
    calculateInsertionIndex,
    addMarker,
    clearMarkers,
    redrawMarkers,
    insertParada,
    deleteParada,
    updateParadaTipo
  }
}
