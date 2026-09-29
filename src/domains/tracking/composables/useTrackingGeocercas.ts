import { ref, shallowRef, markRaw, toRaw, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useGroupStore } from '../../../stores/group.store'
import { fetchGeocercasApi, fetchGeocercaDetallesApi } from '../../geocercas/services/geocercas.api'
import type { Geocerca, GeocercaDetalle } from '../../geocercas/types/geocerca'

export interface GeocercaParsed {
  id: string
  nombre: string
  color: string
  tipo: string
  centerLat: number
  centerLng: number
  bounds: any
  detalle: GeocercaDetalle
}

export interface GeocercaCluster {
  id: string
  centerLat: number
  centerLng: number
  geocercas: GeocercaParsed[]
}

const CLUSTER_RADIUS_PX = 75

export function useTrackingGeocercas(mapRef: { value: any }) {
  const groupStore = useGroupStore()
  const { selectedGroup } = storeToRefs(groupStore)

  const showGeocercas = ref(false)
  const loadingGeocercas = ref(false)
  const geocercas = ref<Geocerca[]>([])
  const parsedGeocercasList = shallowRef<GeocercaParsed[]>([])

  // Overlays individuales (polígonos/círculos y etiquetas) agrupados por ID de geocerca
  const geocercaSingleDrawings = new Map<string, any[]>()
  // Marcadores de cluster de geocercas
  const geocercaClustersMap = new Map<string, any>()

  // Estado de hover de cluster de geocercas
  const hoveredGeocercaCluster = ref<GeocercaCluster | null>(null)
  const hoveredGeocercaClusterPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })

  const clearGeocercaHoverStates = () => {
    hoveredGeocercaCluster.value = null
  }

  let CustomLabelOverlayClass: any = null
  let renderSequence = 0
  let mapListenersAttached = false

  // Inicializar o crear la clase de etiqueta flotante para Google Maps en modo oscuro
  const getCustomLabelClass = () => {
    if (CustomLabelOverlayClass) return CustomLabelOverlayClass
    if (!(window as any).google?.maps?.OverlayView) return null

    CustomLabelOverlayClass = class extends (window as any).google.maps.OverlayView {
      private element: HTMLDivElement
      private position: any

      constructor(position: any, text: string, color: string) {
        super()
        this.position = position
        this.element = document.createElement('div')
        this.element.style.position = 'absolute'
        this.element.style.transformOrigin = 'bottom center'
        this.element.style.transform = 'translate(-50%, calc(-100% - 8px)) scale(1)'
        this.element.style.background = 'rgba(15, 23, 42, 0.9)'
        this.element.style.backdropFilter = 'blur(4px)'
        this.element.style.border = `1.5px solid ${color}`
        this.element.style.borderRadius = '6px'
        this.element.style.padding = '4px 8px'
        this.element.style.color = '#ffffff'
        this.element.style.fontSize = '9px'
        this.element.style.fontWeight = '800'
        this.element.style.fontFamily = 'Inter, sans-serif'
        this.element.style.whiteSpace = 'nowrap'
        this.element.style.pointerEvents = 'none'
        this.element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
        this.element.style.textTransform = 'uppercase'
        this.element.style.letterSpacing = '0.06em'
        this.element.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out'
        this.element.innerText = text
      }

      onAdd() {
        const panes = this.getPanes()
        if (panes) {
          panes.overlayMouseTarget.appendChild(this.element)
        }
      }

      draw() {
        const projection = this.getProjection()
        if (!projection) return
        const point = projection.fromLatLngToDivPixel(this.position)
        if (point) {
          this.element.style.left = point.x + 'px'
          this.element.style.top = point.y + 'px'

          const mapInstance = this.getMap()
          if (mapInstance) {
            const zoom = mapInstance.getZoom()
            let scale = 1
            let opacity = 1

            if (zoom >= 14) {
              scale = 1
              opacity = 1
            } else if (zoom >= 10) {
              scale = 0.65 + (zoom - 10) * (0.35 / 4)
              opacity = 0.75 + (zoom - 10) * (0.25 / 4)
            } else if (zoom >= 8) {
              scale = 0.45 + (zoom - 8) * (0.2 / 2)
              opacity = 0.2 + (zoom - 8) * (0.55 / 2)
            } else {
              scale = 0
              opacity = 0
            }

            this.element.style.transform = `translate(-50%, calc(-100% - 8px)) scale(${scale})`
            this.element.style.opacity = String(opacity)
          }
        }
      }

      onRemove() {
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element)
        }
      }
    }

    return CustomLabelOverlayClass
  }

  // Agrupar geocercas cercanas según el nivel de zoom y proyección Mercator
  const groupGeocercasIntoClusters = (
    items: GeocercaParsed[],
    zoom: number
  ): { clusters: GeocercaCluster[]; singleItems: GeocercaParsed[] } => {
    const points = items.map(item => {
      const lat = item.centerLat
      const lng = item.centerLng
      const sinLat = Math.sin((lat * Math.PI) / 180)
      const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat))
      const scale = 256 * Math.pow(2, zoom)
      const x = ((lng + 180) / 360) * scale
      const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale
      return { item, lat, lng, x, y, visited: false }
    })

    const clusters: GeocercaCluster[] = []
    const singleItems: GeocercaParsed[] = []

    for (let i = 0; i < points.length; i++) {
      if (points[i].visited) continue
      points[i].visited = true

      const currentCluster: typeof points = [points[i]]

      for (let j = i + 1; j < points.length; j++) {
        if (points[j].visited) continue
        const dx = points[i].x - points[j].x
        const dy = points[i].y - points[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= CLUSTER_RADIUS_PX) {
          points[j].visited = true
          currentCluster.push(points[j])
        }
      }

      if (currentCluster.length > 1) {
        let sumLat = 0
        let sumLng = 0
        currentCluster.forEach(p => {
          sumLat += p.lat
          sumLng += p.lng
        })
        const centerLat = sumLat / currentCluster.length
        const centerLng = sumLng / currentCluster.length

        clusters.push({
          id: `geocluster_${centerLat.toFixed(5)}_${centerLng.toFixed(5)}_${currentCluster.length}`,
          centerLat,
          centerLng,
          geocercas: currentCluster.map(p => p.item)
        })
      } else {
        singleItems.push(currentCluster[0].item)
      }
    }

    return { clusters, singleItems }
  }

  // Generar elemento DOM para marcador de cluster de geocercas
  const createGeocercaClusterMarkerElement = (cluster: GeocercaCluster, getMarker?: () => any) => {
    const container = document.createElement('div')
    container.className = 'custom-cluster-marker'
    container.style.cssText = 'position: relative; width: 0; height: 0; cursor: pointer; user-select: none; pointer-events: auto;'

    const count = cluster.geocercas.length
    const labelText = count === 1 ? 'Geocerca' : 'Geocercas'

    // Se posiciona en un nivel superior (bottom: 36px) para apilarse limpiamente por encima de los clusters de dispositivos
    container.innerHTML = `
      <div style="position: absolute; bottom: 36px; left: 50%; transform: translate(-50%, 0); display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
        <!-- Insignia sobria y profesional para Geocercas -->
        <div class="px-2.5 py-1 rounded-lg bg-[#0f121a]/95 border border-amber-500/70 shadow-lg backdrop-blur-md flex items-center gap-2 text-white hover:border-amber-400 hover:scale-105 transition-all">
          <div class="w-5 h-5 rounded bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div class="flex items-center gap-1 font-sans">
            <span class="text-[12px] font-bold text-amber-400 font-mono leading-none">${count}</span>
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-200 leading-none">
              ${labelText}
            </span>
          </div>
        </div>
        <!-- Puntero sutil hacia el mapa -->
        <div class="w-[1.5px] h-2 bg-amber-500/60"></div>
        <div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-amber-500 -mt-[0.5px]"></div>
      </div>
    `

    container.addEventListener('mouseenter', () => {
      const mapDiv = mapRef.value?.getDiv()
      if (!mapDiv) return
      const mapRect = mapDiv.getBoundingClientRect()
      const badgeElem = container.firstElementChild as HTMLElement
      const badgeRect = badgeElem ? badgeElem.getBoundingClientRect() : container.getBoundingClientRect()

      hoveredGeocercaClusterPosition.value = {
        top: badgeRect.top - mapRect.top - 10,
        left: badgeRect.left - mapRect.left + (badgeRect.width / 2)
      }
      hoveredGeocercaCluster.value = cluster
      const m = getMarker?.()
      if (m) m.zIndex = 1000
    })

    container.addEventListener('mouseleave', () => {
      hoveredGeocercaCluster.value = null
      const m = getMarker?.()
      if (m) m.zIndex = 600
    })

    return container
  }

  // Dibujar una geocerca individual en el mapa
  const drawSingleGeocerca = (g: GeocercaParsed) => {
    if (!mapRef.value || geocercaSingleDrawings.has(g.id)) return
    const LabelClass = getCustomLabelClass()
    const drawings: any[] = []
    const detalle = g.detalle
    const color = g.color

    if (detalle.tipo === 'Circular') {
      const p = detalle.puntos[0]
      const center = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }
      const radius = parseFloat(p.radio || '0')
      const circle = markRaw(new (window as any).google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.2,
        map: mapRef.value,
        center,
        radius,
        clickable: false
      }))
      drawings.push(circle)
    } else {
      const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
      const polygon = markRaw(new (window as any).google.maps.Polygon({
        paths,
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.2,
        map: mapRef.value,
        clickable: false
      }))
      drawings.push(polygon)
    }

    if (g.bounds && mapRef.value && LabelClass) {
      const topPosition = new (window as any).google.maps.LatLng(
        g.bounds.getNorthEast().lat(),
        g.bounds.getCenter().lng()
      )
      const labelOverlay = markRaw(new LabelClass(topPosition, g.nombre, color))
      labelOverlay.setMap(mapRef.value)
      drawings.push(labelOverlay)
    }

    geocercaSingleDrawings.set(g.id, drawings)
  }

  // Remover dibujos de una geocerca individual
  const removeSingleGeocerca = (id: string) => {
    const drawings = geocercaSingleDrawings.get(id)
    if (drawings) {
      drawings.forEach(d => {
        if (d) {
          const raw = toRaw(d)
          if (typeof raw.setMap === 'function') {
            try { raw.setMap(null) } catch (_) {}
          }
        }
      })
      geocercaSingleDrawings.delete(id)
    }
  }

  // Actualizar la vista agrupada o individual según el zoom actual
  const updateGeocercasClustering = () => {
    if (!showGeocercas.value || !mapRef.value || parsedGeocercasList.value.length === 0) {
      clearAllGeocercaOverlays()
      return
    }

    const currentZoom = mapRef.value.getZoom() || 13
    // Agrupar solo en vistas lejanas (zoom inferior a 15)
    const shouldCluster = currentZoom < 15

    let singleItems: GeocercaParsed[] = []
    let clusters: GeocercaCluster[] = []

    if (shouldCluster && parsedGeocercasList.value.length > 1) {
      const grouped = groupGeocercasIntoClusters(parsedGeocercasList.value, currentZoom)
      clusters = grouped.clusters
      singleItems = grouped.singleItems
    } else {
      singleItems = parsedGeocercasList.value
    }

    const activeSingleIds = new Set<string>()
    singleItems.forEach(item => activeSingleIds.add(item.id))

    const activeClusterIds = new Set<string>()
    clusters.forEach(c => activeClusterIds.add(c.id))

    // 1. Dibujar o mantener las geocercas individuales que no estén en cluster
    singleItems.forEach(item => {
      drawSingleGeocerca(item)
    })

    // 2. Remover dibujos de las geocercas que ahora están agrupadas
    parsedGeocercasList.value.forEach(item => {
      if (!activeSingleIds.has(item.id)) {
        removeSingleGeocerca(item.id)
      }
    })

    // 3. Crear / actualizar marcadores de cluster
    clusters.forEach(cluster => {
      let cMarker = geocercaClustersMap.get(cluster.id)
      if (cMarker) {
        if (!cMarker.map) cMarker.map = mapRef.value
        cMarker.position = { lat: cluster.centerLat, lng: cluster.centerLng }
      } else {
        let cMarkerInstance: any = null
        const content = createGeocercaClusterMarkerElement(cluster, () => cMarkerInstance)
        const googleMaps = (window as any).google?.maps
        if (googleMaps?.marker?.AdvancedMarkerElement) {
          cMarker = new googleMaps.marker.AdvancedMarkerElement({
            position: { lat: cluster.centerLat, lng: cluster.centerLng },
            map: mapRef.value,
            content,
            title: `${cluster.geocercas.length} geocercas agrupadas`,
            zIndex: 600
          })
          cMarkerInstance = cMarker

          cMarker.addListener('click', () => {
            hoveredGeocercaCluster.value = null
            mapRef.value.panTo({ lat: cluster.centerLat, lng: cluster.centerLng })
            const nextZoom = Math.min(20, (mapRef.value.getZoom() || 13) + 2)
            mapRef.value.setZoom(nextZoom)
          })
        }
        geocercaClustersMap.set(cluster.id, cMarker)
      }
    })

    // 4. Limpiar marcadores de cluster que ya no están activos
    geocercaClustersMap.forEach((cMarker, key) => {
      if (!activeClusterIds.has(key)) {
        if (cMarker) cMarker.map = null
        geocercaClustersMap.delete(key)
      }
    })
  }

  // Limpiar todos los elementos dibujados
  const clearAllGeocercaOverlays = () => {
    renderSequence++
    hoveredGeocercaCluster.value = null

    // Limpiar dibujos individuales
    geocercaSingleDrawings.forEach((drawings) => {
      drawings.forEach(d => {
        if (d) {
          const raw = toRaw(d)
          if (typeof raw.setMap === 'function') {
            try { raw.setMap(null) } catch (_) {}
          }
        }
      })
    })
    geocercaSingleDrawings.clear()

    // Limpiar marcadores de cluster
    geocercaClustersMap.forEach((cMarker) => {
      if (cMarker) cMarker.map = null
    })
    geocercaClustersMap.clear()
  }

  // Vincular eventos del mapa para clustering reactivo
  const attachMapListeners = () => {
    if (!mapRef.value || mapListenersAttached) return
    mapListenersAttached = true

    mapRef.value.addListener('zoom_changed', () => {
      hoveredGeocercaCluster.value = null
      if (showGeocercas.value) {
        updateGeocercasClustering()
      }
    })

    mapRef.value.addListener('idle', () => {
      if (showGeocercas.value) {
        updateGeocercasClustering()
      }
    })

    mapRef.value.addListener('dragstart', () => {
      hoveredGeocercaCluster.value = null
    })
  }

  // Cargar datos y renderizar todas las geocercas en el mapa
  const renderGeocercasOnMap = async () => {
    clearAllGeocercaOverlays()
    if (!showGeocercas.value || !selectedGroup.value?.id || !mapRef.value) return

    attachMapListeners()
    const currentRenderId = renderSequence
    loadingGeocercas.value = true

    try {
      if (geocercas.value.length === 0) {
        geocercas.value = await fetchGeocercasApi(selectedGroup.value.id)
      }

      if (currentRenderId !== renderSequence || !showGeocercas.value) {
        clearAllGeocercaOverlays()
        return
      }

      if (geocercas.value.length === 0) {
        parsedGeocercasList.value = []
        return
      }

      const promises = geocercas.value.map(g =>
        fetchGeocercaDetallesApi(selectedGroup.value!.id, g.id_geocerca).catch(() => null)
      )

      const detalles = await Promise.all(promises)

      if (currentRenderId !== renderSequence || !showGeocercas.value) {
        clearAllGeocercaOverlays()
        return
      }

      const parsedList: GeocercaParsed[] = []

      detalles.forEach((detalle, index) => {
        if (!detalle || !detalle.puntos || detalle.puntos.length === 0) return
        const gMeta = geocercas.value[index]
        const color = detalle.color || '#f59e0b'
        let bounds: any = null
        let centerLat = 0
        let centerLng = 0

        if (detalle.tipo === 'Circular') {
          const p = detalle.puntos[0]
          centerLat = parseFloat(p.lat)
          centerLng = parseFloat(p.lon)
          const radius = parseFloat(p.radio || '0')
          const tempCircle = new (window as any).google.maps.Circle({
            center: { lat: centerLat, lng: centerLng },
            radius
          })
          bounds = tempCircle.getBounds()
        } else {
          const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
          const polyBounds = new (window as any).google.maps.LatLngBounds()
          paths.forEach(p => polyBounds.extend(p))
          bounds = polyBounds
          centerLat = polyBounds.getCenter().lat()
          centerLng = polyBounds.getCenter().lng()
        }

        parsedList.push({
          id: gMeta?.id_geocerca || detalle.id_geocerca || `geo_${index}`,
          nombre: detalle.nombre || gMeta?.nombre || 'Geocerca',
          color,
          tipo: detalle.tipo || 'Polígono',
          centerLat,
          centerLng,
          bounds,
          detalle
        })
      })

      parsedGeocercasList.value = parsedList
      updateGeocercasClustering()
    } catch (err) {
      console.error('Error al renderizar geocercas en el mapa:', err)
    } finally {
      if (currentRenderId === renderSequence) {
        loadingGeocercas.value = false
      }
    }
  }

  const toggleGeocercas = () => {
    showGeocercas.value = !showGeocercas.value
  }

  // Reactividad
  watch(showGeocercas, (val) => {
    if (val) {
      renderGeocercasOnMap()
    } else {
      clearAllGeocercaOverlays()
    }
  })

  watch(selectedGroup, () => {
    geocercas.value = []
    parsedGeocercasList.value = []
    if (showGeocercas.value) {
      renderGeocercasOnMap()
    } else {
      clearAllGeocercaOverlays()
    }
  })

  watch(() => mapRef.value, (newMap) => {
    if (newMap && showGeocercas.value) {
      renderGeocercasOnMap()
    }
  })

  onUnmounted(() => {
    clearAllGeocercaOverlays()
  })

  return {
    showGeocercas,
    loadingGeocercas,
    toggleGeocercas,
    renderGeocercasOnMap,
    clearGeocercaDrawings: clearAllGeocercaOverlays,
    hoveredGeocercaCluster,
    hoveredGeocercaClusterPosition,
    clearGeocercaHoverStates
  }
}
