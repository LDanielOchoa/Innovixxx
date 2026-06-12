/**
 * useRouteDrawer.ts
 * ─────────────────────────────────────────────────────────────
 * Responsabilidad: trazar y redibujar la polilínea de la ruta
 * en el mapa usando DirectionsService, con debounce para no
 * saturar la API de Google con requests paralelas durante
 * ediciones rápidas.
 * ─────────────────────────────────────────────────────────────
 */
import { shallowRef, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { ParadaPayload } from '../types/ruta'

const CHUNK_SIZE = 24 // Max waypoints por request de Google = 23 + origen + destino

export function useRouteDrawer(
  map: Ref<any>,
  directionsService: Ref<any>
) {
  const directionsRenderers  = shallowRef<any[]>([])
  const highlightedRenderer  = shallowRef<any>(null)

  // ── Debounce ───────────────────────────────────────────────
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  // ── Helpers internos ───────────────────────────────────────
  const _clearRenderers = (from: number = 0) => {
    const toRemove = directionsRenderers.value.slice(from)
    const toKeep   = directionsRenderers.value.slice(0, from)
    toRemove.forEach(r => { try { r.setMap(null) } catch (_) {} })
    directionsRenderers.value = toKeep
  }

  const _requestChunk = (
    chunk: ParadaPayload[],
    color: string,
    preserveViewport: boolean
  ) => {
    if (!directionsService.value || chunk.length < 2) return

    const origin      = chunk[0]!
    const destination = chunk[chunk.length - 1]!
    const waypoints   = chunk.length > 2
      ? chunk.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lon }, stopover: true }))
      : []

    const renderer = new (window as any).google.maps.DirectionsRenderer({
      map: map.value,
      suppressMarkers: true,
      preserveViewport,
      polylineOptions: { strokeColor: color, strokeOpacity: 0.9, strokeWeight: 4 }
    })
    directionsRenderers.value.push(renderer)

    directionsService.value.route(
      {
        origin:             { lat: origin.lat,      lng: origin.lon },
        destination:        { lat: destination.lat, lng: destination.lon },
        waypoints,
        travelMode:         (window as any).google.maps.TravelMode.DRIVING,
        optimizeWaypoints:  false
      },
      (response: any, status: string) => {
        if (status === 'OK') {
          renderer.setDirections(response)
        }
      }
    )
  }

  // ── API pública ────────────────────────────────────────────

  /**
   * Recalcula la ruta a partir de un índice de parada.
   * Incluye debounce de 400ms para agrupar ediciones rápidas.
   */
  const recalculateFromIndex = (
    startParadaIndex: number,
    paradas: ParadaPayload[],
    color: string
  ) => {
    clearDebounce()

    debounceTimer = setTimeout(() => {
      debounceTimer = null

      if (paradas.length < 2) {
        _clearRenderers(0)
        return
      }

      const startChunkIndex = Math.floor(startParadaIndex / CHUNK_SIZE)
      const totalChunks     = Math.ceil((paradas.length - 1) / CHUNK_SIZE)

      _clearRenderers(startChunkIndex)

      for (let ci = startChunkIndex; ci < totalChunks; ci++) {
        const startIdx = ci * CHUNK_SIZE
        const endIdx   = Math.min(startIdx + CHUNK_SIZE + 1, paradas.length)
        const chunk    = paradas.slice(startIdx, endIdx)
        _requestChunk(chunk, color, true)
      }
    }, 400)
  }

  /**
   * Dibuja la ruta completa (sin debounce) — usado al cargar datos existentes.
   */
  const drawFullRoute = (paradas: ParadaPayload[], color: string) => {
    if (!directionsService.value || paradas.length < 2) return
    _clearRenderers(0)

    const totalChunks = Math.ceil((paradas.length - 1) / CHUNK_SIZE)
    for (let ci = 0; ci < totalChunks; ci++) {
      const startIdx = ci * CHUNK_SIZE
      const endIdx   = Math.min(startIdx + CHUNK_SIZE + 1, paradas.length)
      _requestChunk(paradas.slice(startIdx, endIdx), color, ci > 0)
    }
  }

  /**
   * Resalta el segmento entre dos paradas consecutivas.
   */
  const highlightSegment = (
    origin: ParadaPayload,
    destination: ParadaPayload
  ) => {
    if (!directionsService.value || !map.value) return

    if (highlightedRenderer.value) {
      try { highlightedRenderer.value.setMap(null) } catch (_) {}
    }

    highlightedRenderer.value = new (window as any).google.maps.DirectionsRenderer({
      map: map.value,
      suppressMarkers: true,
      preserveViewport: true,
      polylineOptions: { strokeColor: '#fbbf24', strokeOpacity: 1.0, strokeWeight: 6, zIndex: 100 }
    })

    directionsService.value.route(
      {
        origin:      { lat: origin.lat,      lng: origin.lon },
        destination: { lat: destination.lat, lng: destination.lon },
        travelMode:  (window as any).google.maps.TravelMode.DRIVING
      },
      (response: any, status: string) => {
        if (status === 'OK') highlightedRenderer.value.setDirections(response)
      }
    )
  }

  /** Limpia resaltado de segmento */
  const clearHighlight = () => {
    if (highlightedRenderer.value) {
      try { highlightedRenderer.value.setMap(null) } catch (_) {}
      highlightedRenderer.value = null
    }
  }

  /** Limpia todos los renderers del mapa */
  const clearAll = () => {
    clearDebounce()
    _clearRenderers(0)
    clearHighlight()
  }

  onUnmounted(() => {
    clearDebounce()
  })

  return {
    directionsRenderers,
    recalculateFromIndex,
    drawFullRoute,
    highlightSegment,
    clearHighlight,
    clearAll
  }
}
