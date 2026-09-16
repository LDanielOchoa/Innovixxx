import { ref, shallowRef, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { ParadaPayload, TipoParada } from '../types/ruta'
import { agruparParadasPorZoom, RADIO_AGRUPACION_PX } from '../utils/rutasCluster.util'

import rutaBalanza from '../../../assets/ruta_balanza.png'
import rutaFin from '../../../assets/ruta_fin.png'
import rutaGasolinera from '../../../assets/ruta_gasolinera.png'
import rutaInicio from '../../../assets/ruta_inicio.png'
import rutaParqueadero from '../../../assets/ruta_parqueadero.png'
import rutaPuntoControl from '../../../assets/ruta_punto_control.png'
import rutaPuntoNormal from '../../../assets/ruta_punto_normal.png'

// ── Helpers de geometría y tipos ──────────────────────────────

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

// Loader visual que se muestra en la posición del punto mientras se elimina.
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
  const radius = isNormal ? 9 : 14

  ctx.clearRect(0, 0, size, size)
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
  ctx.fillStyle = strokeColor || '#3b82f6'
  ctx.fill()

  const resultDataUrl = canvas.toDataURL()
  placeholderCache.set(cacheKey, resultDataUrl)
  return resultDataUrl
}

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
    const imgSize = isNormal ? 32 : 48

    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(img, centerX - imgSize / 2, centerY - imgSize / 2, imgSize, imgSize)

    const resultDataUrl = canvas.toDataURL()
    iconCache.set(cacheKey, resultDataUrl)
    callback(resultDataUrl)
  }

  img.onerror = () => {}

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

// Shared Single InfoWindow para evitar instanciaciones masivas
let sharedInfoWindow: any = null
const getSharedInfoWindow = () => {
  if (!sharedInfoWindow && (window as any).google?.maps?.InfoWindow) {
    sharedInfoWindow = new (window as any).google.maps.InfoWindow({ disableAutoPan: true })
  }
  return sharedInfoWindow
}

// ── Composable Principal ─────────────────────────────────────
export function useParadasManager(
  map: Ref<any>,
  tiposParada: Ref<TipoParada[]>,
  routeColor: Ref<string>,
  onMarkerClick: (index: number) => void,
  onMarkerRightClick?: (index: number) => void | Promise<void>,
  onMarkerDragEnd?: (index: number, lat: number, lon: number) => void
) {
  const paradasTemporales = ref<Array<ParadaPayload & { fecha?: string }>>([])
  const paradasMarkers     = shallowRef<any[]>([])
  const paradaIconCancellers = shallowRef<Array<() => void>>([])
  let zoomListener: any = null

  const calculateInsertionIndex = (_lat: number, _lon: number): number => {
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
            fillColor: color || '#3b82f6',
            fillOpacity: 1,
            strokeWeight: 0
          }
    })

    ;(marker as any)._originalIndex = index

    const cancelIconLoad = createCircularIcon(getIconUrl(tipoId), color, isNormal, (dataUrl) => {
      try {
        marker.setIcon({
          url: dataUrl,
          scaledSize: new (window as any).google.maps.Size(64, 64),
          anchor: new (window as any).google.maps.Point(32, 32)
        })
      } catch (_) {}
    })
    paradaIconCancellers.value.push(cancelIconLoad)

    // Listener de hover usando InfoWindow compartido
    marker.addListener('mouseover', () => {
      const currentIdx = (marker as any)._originalIndex ?? paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length) {
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
      const currentIdx = (marker as any)._originalIndex ?? paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length) {
        onMarkerClick(currentIdx)
      }
    })

    marker.addListener('rightclick', (e: any) => {
      if (e?.domEvent) e.domEvent.preventDefault()
      const currentIdx = (marker as any)._originalIndex ?? paradasMarkers.value.indexOf(marker)
      if (currentIdx !== -1 && currentIdx < paradasTemporales.value.length) {
        if (onMarkerRightClick) onMarkerRightClick(currentIdx)
      }
    })

    marker.addListener('dragend', (e: any) => {
      const currentIdx = (marker as any)._originalIndex ?? paradasMarkers.value.indexOf(marker)
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
        ;(window as any).google?.maps?.event?.clearInstanceListeners(m)
      } catch (_) {}
    })
  }

  /** Actualiza los marcadores visibles según el nivel de zoom y agrupación espacial */
  const updateMarkersForZoom = () => {
    if (!map.value || paradasTemporales.value.length === 0) {
      clearMarkers()
      return
    }

    const zoom = map.value.getZoom() || 13
    const visibles = agruparParadasPorZoom(paradasTemporales.value, zoom, RADIO_AGRUPACION_PX)

    clearMarkers()

    const newMarkers: any[] = []
    visibles.forEach(item => {
      const nombre = tiposParada.value.find(t => t.id_tipo === item.parada.tipo)?.nombre || 'Parada'
      const m = addMarker(item.parada.lat, item.parada.lon, nombre, item.index, item.parada.tipo, item.parada.fecha)
      if (m) {
        ;(m as any)._originalIndex = item.index
        newMarkers.push(m)
      }
    })
    paradasMarkers.value = newMarkers
  }

  /** Redibuja todos los marcadores aplicando la optimización de zoom */
  const redrawMarkers = () => {
    updateMarkersForZoom()
  }

  // ── Sincronización del listener de Zoom ───────────────────────
  const setupZoomListener = () => {
    if (zoomListener) {
      try { (window as any).google?.maps?.event?.removeListener(zoomListener) } catch (_) {}
      zoomListener = null
    }
    if (map.value && (window as any).google?.maps?.event) {
      zoomListener = map.value.addListener('zoom_changed', () => {
        if (paradasTemporales.value.length > 0) {
          updateMarkersForZoom()
        }
      })
    }
  }

  watch(map, (newMap) => {
    if (newMap) {
      setupZoomListener()
      if (paradasTemporales.value.length > 0) {
        updateMarkersForZoom()
      }
    }
  }, { immediate: true })

  // ── CRUD de paradas ───────────────────────────────────────

  /**
   * Inserta una nueva parada y actualiza la visualización optimizada.
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
    updateMarkersForZoom()
    return insertionIndex
  }

  /**
   * Elimina de inmediato un marcador concreto del mapa.
   */
  const removeMarkerAt = (index: number) => {
    const marker = paradasMarkers.value.find(m => (m as any)._originalIndex === index) || paradasMarkers.value[index]
    if (marker) {
      try { marker.setVisible(false) } catch (_) {}
      try { marker.setMap(null) } catch (_) {}
      try { (window as any).google?.maps?.event?.clearInstanceListeners(marker) } catch (_) {}
    }
  }

  /**
   * Elimina una parada por índice y refresca la agrupación.
   */
  const deleteParada = (index: number): number => {
    if (index < 0 || index >= paradasTemporales.value.length) return -1

    const paradaToDelete = paradasTemporales.value[index]

    // 1. Mostrar spinner en la posición del punto a eliminar
    const marker = paradasMarkers.value.find(m => (m as any)._originalIndex === index)
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
      } catch (_) {}
    }

    // 2. Eliminar del array de datos
    const realIndex = paradasTemporales.value.indexOf(paradaToDelete)
    if (realIndex !== -1) {
      paradasTemporales.value.splice(realIndex, 1)
    }

    // 3. Actualizar marcadores con agrupación
    updateMarkersForZoom()

    // 4. Quitar el spinner
    if (spinner) {
      setTimeout(() => {
        try { spinner.setMap(null) } catch (_) {}
      }, 150)
    }

    return realIndex !== -1 ? realIndex : index
  }

  /** Actualiza el tipo de una parada existente */
  const updateParadaTipo = (index: number, tipo: number) => {
    const parada = paradasTemporales.value[index]
    if (!parada) return
    parada.tipo = tipo
    updateMarkersForZoom()
  }

  onUnmounted(() => {
    if (zoomListener) {
      try { (window as any).google?.maps?.event?.removeListener(zoomListener) } catch (_) {}
      zoomListener = null
    }
    clearMarkers()
  })

  return {
    paradasTemporales,
    paradasMarkers,
    calculateInsertionIndex,
    addMarker,
    clearMarkers,
    redrawMarkers,
    updateMarkersForZoom,
    insertParada,
    deleteParada,
    updateParadaTipo
  }
}
