<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Settings02Icon,
  Location01Icon,
  MapsIcon,
  Delete02Icon,
  CircleIcon,
  SquareIcon,
  Alert01Icon,
  Loading03Icon,
  RefreshIcon
} from '@hugeicons/core-free-icons'
import { loadModuleMessages } from '../../../i18n'
import * as XLSX from 'xlsx'
import { fetchGeocercasApi, fetchGeocercaDetallesApi, deleteGeocercaApi } from '../services/geocercas.api'
import type { Geocerca, GeocercaDetalle, ElementoGeocercaCluster, GeocercaCluster } from '../types/geocerca'
import { calcularCentroGeocerca, agruparGeocercasEnClusters } from '../composables/useGeocercaClustering'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import AppInput from '../../../components/ui/AppInput.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

// Estado principal de geocercas
const geocercas = ref<Geocerca[]>([])
const geocercasConDetalles = ref<ElementoGeocercaCluster[]>([])
const loading = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const currentPage = ref(typeof route.query.page === 'string' ? parseInt(route.query.page, 10) || 1 : 1)
const itemsPerPage = 10

// Estado de agrupación (clustering) y Tooltips flotantes
let clustersMap = new Map<string, any>()
const hoveredCluster = ref<GeocercaCluster | null>(null)
const hoveredClusterPosition = ref({ top: 0, left: 0 })

// Menú de opciones por elemento
const openMenuGeocercaId = ref<string | null>(null)
const toggleMenu = (geocercaId: string, event: Event) => {
  event.stopPropagation()
  if (openMenuGeocercaId.value === geocercaId) {
    openMenuGeocercaId.value = null
  } else {
    openMenuGeocercaId.value = geocercaId
  }
}
const closeAllMenus = () => {
  openMenuGeocercaId.value = null
}

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

watch(searchQuery, () => {
  currentPage.value = 1
  syncStateToUrl()
})

watch(currentPage, () => {
  syncStateToUrl()
})

const filteredGeocercas = computed(() => {
  let result = [...geocercas.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(g =>
      g.nombre.toLowerCase().includes(query) ||
      g.descripcion.toLowerCase().includes(query) ||
      g.id_geocerca.toLowerCase().includes(query)
    )
  }
  return result
})

const paginatedGeocercas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredGeocercas.value.slice(start, start + itemsPerPage)
})

const selectedGeocerca = ref<Geocerca | null>(null)
const currentDrawing = shallowRef<any>(null)
const allDrawings = ref<any[]>([])
const isLoadingDetails = ref(false)

const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const hoveredGeocerca = ref<Geocerca | null>(null)

const clearHoverTimer = () => {
  if (hoverTimer.value) {
    clearTimeout(hoverTimer.value)
    hoverTimer.value = null
  }
}

const clearAllClusters = () => {
  clustersMap.forEach(m => {
    if (m) m.map = null
  })
  clustersMap.clear()
  hoveredCluster.value = null
}

const clearAllDrawings = () => {
  allDrawings.value.forEach(d => d.setMap(null))
  allDrawings.value = []
}

const clearDrawings = () => {
  if (currentDrawing.value) {
    currentDrawing.value.setMap(null)
    currentDrawing.value = null
  }
  if (selectedLabelOverlay.value) {
    selectedLabelOverlay.value.setMap(null)
    selectedLabelOverlay.value = null
  }
  clearAllDrawings()
  clearAllClusters()
}

// Google Maps Setup (shared composable)
const { loadGoogleMaps } = useGoogleMaps()
const {
  map,
  isLoadingMap,
  mapLoadError,
  initMap,
  startDarkModeObserver,
  currentMapType,
  setMapType
} = useMapSetup('geocercas-map-container', {
  defaultZoom: 12,
  gestureHandling: 'greedy',
  mapId: '688c00fbadb30bbb930f73e2'
})

let CustomLabelOverlay: any = null
const selectedLabelOverlay = ref<any>(null)

/**
 * Crea el elemento DOM del marcador de grupo (cluster) para geocercas
 */
const createClusterMarkerElement = (cluster: GeocercaCluster) => {
  const container = document.createElement('div')
  container.className = 'custom-cluster-marker'
  container.style.cssText = 'position: relative; width: 0; height: 0; cursor: pointer; user-select: none; pointer-events: auto;'

  const count = cluster.elementos.length
  const borderStyle = 'border-[#3b82f6]/50'
  const textStyle = 'text-[#3b82f6]'
  const iconBg = 'bg-[#3b82f6]/10'
  const needleBorder = 'border-t-[#3b82f6]'
  const labelText = count === 1 ? t('geocercas.geocerca') : t('geocercas.title')

  const iconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`

  container.innerHTML = `
    <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 0); display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
      <!-- Insignia sobria y profesional -->
      <div class="px-2.5 py-1 rounded-lg bg-[#0f121a]/95 border ${borderStyle} shadow-md backdrop-blur-md flex items-center gap-2 text-white">
        <div class="w-5 h-5 rounded ${iconBg} ${textStyle} flex items-center justify-center shrink-0">
          ${iconSvg}
        </div>
        <div class="flex items-center gap-1 font-sans">
          <span class="text-[12px] font-bold ${textStyle} font-mono leading-none">${count}</span>
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-300 leading-none">
            ${labelText}
          </span>
        </div>
      </div>
      <!-- Puntero sutil al mapa -->
      <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] ${needleBorder} -mt-[0.5px]"></div>
    </div>
  `

  container.addEventListener('mouseenter', () => {
    const mapDiv = map.value?.getDiv()
    if (!mapDiv) return
    const mapRect = mapDiv.getBoundingClientRect()
    const markerRect = container.getBoundingClientRect()

    hoveredClusterPosition.value = {
      top: markerRect.top - mapRect.top - 10,
      left: markerRect.left - mapRect.left + (markerRect.width / 2)
    }
    hoveredCluster.value = cluster
  })

  container.addEventListener('mouseleave', () => {
    hoveredCluster.value = null
  })

  return container
}

/**
 * Renderiza todas las geocercas en el mapa aplicando agrupación (clustering) inteligente según el nivel de zoom
 */
const drawAllGeocercas = () => {
  clearAllDrawings()
  if (!map.value || geocercasConDetalles.value.length === 0) {
    clearAllClusters()
    return
  }

  const currentZoom = map.value.getZoom() || 12
  const shouldCluster = currentZoom < 14 && geocercasConDetalles.value.length > 1

  let clusters: GeocercaCluster[] = []
  let singleItems: ElementoGeocercaCluster[] = []

  if (shouldCluster) {
    const agrupados = agruparGeocercasEnClusters(geocercasConDetalles.value, currentZoom, 75)
    clusters = agrupados.clusters
    singleItems = agrupados.elementosIndividuales
  } else {
    singleItems = geocercasConDetalles.value
  }

  const activeClusterKeys = new Set<string>()
  clusters.forEach(c => activeClusterKeys.add(c.id))

  if (hoveredCluster.value && !activeClusterKeys.has(hoveredCluster.value.id)) {
    hoveredCluster.value = null
  }

  // 1. Renderizar / actualizar marcadores de agrupaciones (clusters)
  clusters.forEach(cluster => {
    let cMarker = clustersMap.get(cluster.id)
    if (cMarker) {
      cMarker.map = map.value
      cMarker.position = { lat: cluster.latCentro, lng: cluster.lngCentro }
    } else {
      const content = createClusterMarkerElement(cluster)
      if ((window as any).google?.maps?.marker?.AdvancedMarkerElement) {
        cMarker = new (window as any).google.maps.marker.AdvancedMarkerElement({
          position: { lat: cluster.latCentro, lng: cluster.lngCentro },
          map: map.value,
          title: `${cluster.elementos.length} geocercas agrupadas`,
          content,
          zIndex: 500
        })

        cMarker.addListener('click', () => {
          hoveredCluster.value = null
          if (map.value) {
            map.value.panTo({ lat: cluster.latCentro, lng: cluster.lngCentro })
            map.value.setZoom(Math.min((map.value.getZoom() || 12) + 3, 16))
            drawAllGeocercas()
          }
        })

        clustersMap.set(cluster.id, cMarker)
      }
    }
  })

  // Limpiar agrupaciones que ya no existen
  clustersMap.forEach((cMarker, key) => {
    if (!activeClusterKeys.has(key)) {
      cMarker.map = null
      clustersMap.delete(key)
    }
  })

  // 2. Renderizar figuras individuales no agrupadas
  singleItems.forEach(item => {
    const detalle = item.detalle
    if (!detalle || !detalle.puntos || detalle.puntos.length === 0) return
    const color = detalle.color || '#3b82f6'
    let bounds: any = null

    if (detalle.tipo === 'Circular') {
      const p = detalle.puntos[0]
      const center = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }
      const radius = parseFloat(p.radio || '0')
      const circle = new (window as any).google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.45,
        strokeWeight: 1.2,
        fillColor: color,
        fillOpacity: 0.12,
        map: map.value,
        center,
        radius
      })
      circle.addListener('click', () => {
        onGeocercaClick(detalle)
      })
      allDrawings.value.push(circle)
      bounds = circle.getBounds()
    } else {
      const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
      const polygon = new (window as any).google.maps.Polygon({
        paths,
        strokeColor: color,
        strokeOpacity: 0.45,
        strokeWeight: 1.2,
        fillColor: color,
        fillOpacity: 0.12,
        map: map.value
      })
      polygon.addListener('click', () => {
        onGeocercaClick(detalle)
      })
      allDrawings.value.push(polygon)
      const polyBounds = new (window as any).google.maps.LatLngBounds()
      paths.forEach(p => polyBounds.extend(p))
      bounds = polyBounds
    }

    if (bounds && map.value && CustomLabelOverlay) {
      const topPosition = new (window as any).google.maps.LatLng(
        bounds.getNorthEast().lat(),
        bounds.getCenter().lng()
      )
      const labelOverlay = new CustomLabelOverlay(topPosition, detalle.nombre, color)
      labelOverlay.setMap(map.value)
      allDrawings.value.push(labelOverlay)
    }
  })
}

const onGeocercaClickFromCluster = (item: ElementoGeocercaCluster) => {
  hoveredCluster.value = null
  const original = geocercas.value.find(g => g.id_geocerca === item.id) || item.detalle
  onGeocercaClick(original)
}

const getMapPadding = () => {
  const isDesktop = window.innerWidth >= 768
  return {
    top: 120,
    right: 80,
    bottom: 120,
    left: isDesktop ? 440 : 60
  }
}

// Animación de vuelo cinemático suave
const flyToMap = async (mapInstance: any, targetLatLng: any, targetZoom: number | null, bounds?: any) => {
  return new Promise<void>((resolve) => {
    const startZoom = mapInstance.getZoom()
    const startCenter = mapInstance.getCenter()
    
    // Si estamos muy cerca, usar nativo para evitar salto brusco
    const dist = (window as any).google.maps.geometry.spherical.computeDistanceBetween(startCenter, targetLatLng)
    if (dist < 2000 && startZoom >= 13) {
      mapInstance.panTo(targetLatLng)
      setTimeout(() => {
        if (bounds) {
          mapInstance.fitBounds(bounds, getMapPadding())
          if (mapInstance.getZoom() > 15) {
            mapInstance.setZoom(15)
          }
        } else if (targetZoom) {
          mapInstance.setZoom(targetZoom)
        }
        resolve()
      }, 500)
      return
    }

    const duration = 600 // Vuelo cinemático rápido
    const startTime = performance.now()
    
    const finalZoom = targetZoom || 15
    let midZoom = Math.min(startZoom, finalZoom) - 3
    if (dist > 50000) midZoom = Math.min(startZoom, 8)
    if (dist > 500000) midZoom = Math.min(startZoom, 6)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing In-Out Cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const currentLat = startCenter.lat() + (targetLatLng.lat() - startCenter.lat()) * ease
      const currentLng = startCenter.lng() + (targetLatLng.lng() - startCenter.lng()) * ease
      mapInstance.setCenter({ lat: currentLat, lng: currentLng })

      let currentZoom
      if (progress < 0.5) {
        const p2 = progress * 2
        const easeZoom = p2 < 0.5 ? 2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 2) / 2
        currentZoom = startZoom + (midZoom - startZoom) * easeZoom
      } else {
        const p2 = (progress - 0.5) * 2
        const easeZoom = p2 < 0.5 ? 2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 2) / 2
        currentZoom = midZoom + (finalZoom - midZoom) * easeZoom
      }
      
      if (!bounds || progress < 0.95) {
        mapInstance.setZoom(currentZoom)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        mapInstance.setCenter(targetLatLng)
        if (bounds) {
          mapInstance.fitBounds(bounds, getMapPadding())
          if (mapInstance.getZoom() > 15) {
            mapInstance.setZoom(15)
          }
        } else if (targetZoom) {
          mapInstance.setZoom(targetZoom)
        }
        resolve()
      }
    }

    requestAnimationFrame(animate)
  })
}

const onGeocercaClick = async (geocerca: Geocerca) => {
  clearHoverTimer()
  hoveredGeocerca.value = null
  if (selectedGeocerca.value?.id_geocerca === geocerca.id_geocerca) {
    selectedGeocerca.value = null
    clearDrawings()
    drawAllGeocercas()
    return
  }
  if (!map.value || !selectedGroup.value?.id) return
  if (!authStore.hasPermission(PERMISSIONS.GEOCERCAS_DETAILS)) return
  selectedGeocerca.value = geocerca
  clearDrawings()
  
  try {
    const detalle = await fetchGeocercaDetallesApi(selectedGroup.value.id, geocerca.id_geocerca)
    if (!detalle) return
    
    const color = detalle.color || '#3b82f6'

    if (detalle.tipo === 'Circular' && detalle.puntos && detalle.puntos.length > 0) {
      const p = detalle.puntos[0]
      const center = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }
      const radius = parseFloat(p.radio || '0')
      
      // 1. Dibujar la figura
      const circle = new (window as any).google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.65,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.18,
        map: map.value,
        center: center,
        radius: radius
      })
      currentDrawing.value = circle
      const bounds = circle.getBounds()

      // Dibujar etiqueta arriba del trazo
      if (CustomLabelOverlay && bounds) {
        const topPosition = new (window as any).google.maps.LatLng(
          bounds.getNorthEast().lat(),
          bounds.getCenter().lng()
        )
        selectedLabelOverlay.value = new CustomLabelOverlay(topPosition, detalle.nombre, color)
        selectedLabelOverlay.value.setMap(map.value)
      }
      
      // 2. Vuelo parabólico hacia la geocerca
      const targetLatLng = new (window as any).google.maps.LatLng(center.lat, center.lng)
      await flyToMap(map.value, targetLatLng, 15, bounds)
      
    } else if (detalle.tipo === 'Poligonal' && detalle.puntos && detalle.puntos.length > 0) {
      const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
      const bounds = new (window as any).google.maps.LatLngBounds()
      paths.forEach(p => bounds.extend(p))
      
      // 1. Dibujar la figura
      currentDrawing.value = new (window as any).google.maps.Polygon({
        paths: paths,
        strokeColor: color,
        strokeOpacity: 0.65,
        strokeWeight: 1.5,
        fillColor: color,
        fillOpacity: 0.18,
        map: map.value
      })

      // Dibujar etiqueta arriba del trazo
      if (CustomLabelOverlay) {
        const topPosition = new (window as any).google.maps.LatLng(
          bounds.getNorthEast().lat(),
          bounds.getCenter().lng()
        )
        selectedLabelOverlay.value = new CustomLabelOverlay(topPosition, detalle.nombre, color)
        selectedLabelOverlay.value.setMap(map.value)
      }
      
      // 2. Vuelo hacia el centro del polígono
      const center = bounds.getCenter()
      await flyToMap(map.value, center, 15, bounds)
    }
    
  } catch (error) {
    console.error('Error al cargar detalles de geocerca:', error)
  } finally {
    isLoadingDetails.value = false
  }
}

const onGeocercaMouseEnter = (geocerca: Geocerca) => {
  clearHoverTimer()
  hoveredGeocerca.value = geocerca
  hoverTimer.value = setTimeout(() => {
    if (hoveredGeocerca.value?.id_geocerca === geocerca.id_geocerca) {
      onGeocercaClick(geocerca)
    }
  }, 3000)
}

const onGeocercaMouseLeave = () => {
  clearHoverTimer()
  hoveredGeocerca.value = null
}

const fetchGeocercas = async () => {
  if (!selectedGroup.value?.id) {
    geocercas.value = []
    geocercasConDetalles.value = []
    clearDrawings()
    return
  }
  loading.value = true
  try {
    const listado = await fetchGeocercasApi(selectedGroup.value.id)
    geocercas.value = listado

    // Precargar detalles para cálculo de clusters en mapa
    const promesas = listado.map(g =>
      fetchGeocercaDetallesApi(selectedGroup.value!.id, g.id_geocerca).catch(() => null)
    )
    const detalles = await Promise.all(promesas)
    const elementosValidos: ElementoGeocercaCluster[] = []

    detalles.forEach(detalle => {
      if (!detalle) return
      const centro = calcularCentroGeocerca(detalle)
      if (centro) {
        elementosValidos.push({
          id: detalle.id_geocerca,
          nombre: detalle.nombre,
          tipo: detalle.tipo,
          color: detalle.color || '#3b82f6',
          lat: centro.lat,
          lon: centro.lon,
          detalle
        })
      }
    })

    geocercasConDetalles.value = elementosValidos

    if (map.value && !selectedGeocerca.value) {
      drawAllGeocercas()
    }
  } catch (error) {
    console.error('Error al obtener geocercas:', error)
    geocercas.value = []
    geocercasConDetalles.value = []
    clearDrawings()
  } finally {
    loading.value = false
  }
}

const initializeMap = async (googleMapsApi: any) => {
  initMap(googleMapsApi)
  
  // Registrar la clase de etiqueta personalizada cuando la API esté disponible
  CustomLabelOverlay = class extends (window as any).google.maps.OverlayView {
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
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element)
      }
    }
  }

  // Listener para re-calcular clusters al hacer zoom o desplazar el mapa
  if (map.value) {
    map.value.addListener('idle', () => {
      if (!selectedGeocerca.value) {
        drawAllGeocercas()
      }
    })
  }

  if (geocercasConDetalles.value.length > 0 && !selectedGeocerca.value) {
    drawAllGeocercas()
  }
}

onMounted(() => {
  loadModuleMessages('geocercas')
  startDarkModeObserver()
  window.addEventListener('click', closeAllMenus)

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    mapLoadError.value = true
    isLoadingMap.value = false
  })

  fetchGeocercas()
})

onUnmounted(() => {
  clearHoverTimer()
  clearAllClusters()
  window.removeEventListener('click', closeAllMenus)
  // Cleanup handled by useMapSetup onUnmounted
})

watch(selectedGroup, async (newGroup) => {
  clearDrawings()
  geocercasConDetalles.value = []
  if (newGroup?.id) {
    await fetchGeocercas()
  } else {
    geocercas.value = []
  }
}, { immediate: true })

const openCreateModal = () => {
  const query: Record<string, string> = {}
  if (map.value) {
    const center = map.value.getCenter()
    const zoom = map.value.getZoom()
    if (center) {
      query.lat = String(center.lat().toFixed(6))
      query.lng = String(center.lng().toFixed(6))
    }
    if (zoom !== undefined) query.zoom = String(zoom)
  }
  router.push({ path: '/geocercas/nueva', query })
}

const exportToExcel = () => {
  const dataToExport = filteredGeocercas.value.map(g => ({
    [t('geocercas.id')]: g.id_geocerca,
    [t('geocercas.nombre')]: g.nombre,
    [t('geocercas.descripcion')]: g.descripcion,
    [t('geocercas.tipo')]: g.tipo,
    [t('geocercas.color')]: g.color,
    [t('geocercas.fechaCreada')]: g.fecha_creada
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, t('geocercas.title'))
  XLSX.writeFile(workbook, `${t('geocercas.title')}.xlsx`)
}

// Borrar Geocerca
const isDeleteDialogOpen = ref(false)
const geocercaToDelete = ref<Geocerca | null>(null)
const isDeleting = ref(false)

const confirmDelete = (geocerca: Geocerca) => {
  geocercaToDelete.value = geocerca
  isDeleteDialogOpen.value = true
}

const handleDeleteGeocerca = async () => {
  if (!selectedGroup.value?.id || !geocercaToDelete.value) return
  
  isDeleting.value = true
  try {
    const success = await deleteGeocercaApi(selectedGroup.value.id, geocercaToDelete.value.id_geocerca)
    if (success) {
      if (selectedGeocerca.value?.id_geocerca === geocercaToDelete.value.id_geocerca) {
        selectedGeocerca.value = null
        clearDrawings()
      }
      await fetchGeocercas()
      isDeleteDialogOpen.value = false
    }
  } catch (error) {
    console.error('Error al borrar geocerca:', error)
  } finally {
    isDeleting.value = false
    geocercaToDelete.value = null
  }
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] w-full">
    <div class="relative w-full h-full overflow-hidden">
      
      <!-- MAP -->
      <div
        id="geocercas-map-container"
        class="absolute inset-0 z-0"
        style="width:100%;height:100%;"
      ></div>

      <!-- Popover de información de Agrupación (Cluster de Geocercas) -->
      <Transition name="hover-card-pop">
        <div 
          v-if="hoveredCluster" 
          :style="{ top: hoveredClusterPosition.top + 'px', left: hoveredClusterPosition.left + 'px' }"
          class="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center select-none"
        >
          <div class="w-[260px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl rounded-[16px] p-3.5 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-left flex flex-col gap-3 font-sans pointer-events-auto">
            <div class="flex items-center justify-between min-w-0 pb-2 border-b border-slate-200/60 dark:border-white/5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] dark:text-[#5da6fc] flex items-center justify-center shrink-0 border border-[#3b82f6]/20">
                  <HugeiconsIcon :icon="MapsIcon" :size="15" />
                </div>
                <div class="min-w-0">
                  <h4 class="text-[12px] font-bold text-slate-800 dark:text-white truncate tracking-tight">
                    {{ t('geocercas.clusterGroup', { count: hoveredCluster.elementos.length }) }}
                  </h4>
                  <span class="text-[9px] font-medium text-slate-500 dark:text-white/40 block truncate">
                    {{ t('geocercas.clickToZoom') }}
                  </span>
                </div>
              </div>
              <span class="text-[9px] font-mono font-bold text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-2 py-0.5 rounded-lg shrink-0">
                {{ hoveredCluster.elementos.length }}
              </span>
            </div>

            <div class="max-h-[160px] overflow-y-auto geocercas-scrollbar flex flex-col gap-1.5 pr-0.5">
              <div 
                v-for="(item, idx) in hoveredCluster.elementos" 
                :key="idx"
                @click="onGeocercaClickFromCluster(item)"
                class="flex items-center justify-between p-2 rounded-[12px] bg-slate-50 dark:bg-[#181C24]/80 border border-slate-200/60 dark:border-white/5 hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/5 dark:hover:bg-[#3b82f6]/10 cursor-pointer transition-all text-[10px]"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span 
                    class="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                    :style="{ backgroundColor: item.color || '#3b82f6' }"
                  ></span>
                  <span class="text-slate-800 dark:text-slate-200 font-bold truncate">{{ item.nombre }}</span>
                </div>
                <span class="text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-400 shrink-0">
                  {{ item.tipo === 'Circular' ? t('geocercas.circular') : t('geocercas.poligonal') }}
                </span>
              </div>
            </div>
          </div>
          <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-[#13161C] -mt-[1px]"></div>
        </div>
      </Transition>

      <!-- Selector de Tipo de Mapa Flotante en Geocercas -->
      <div class="absolute top-4 right-4 z-20 flex items-center p-0.5 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-white/10 shadow-lg">
        <button
          type="button"
          @click="setMapType('roadmap')"
          title="Mapa Estándar Vectorial"
          class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          :class="currentMapType === 'roadmap'
            ? 'bg-[#3b82f6] text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'"
        >
          <HugeiconsIcon :icon="MapsIcon" :size="13" />
          <span>Estándar</span>
        </button>
        <button
          type="button"
          @click="setMapType('hybrid')"
          title="Mapa Satélite con etiquetas"
          class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          :class="currentMapType === 'hybrid'
            ? 'bg-[#3b82f6] text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M3.6 9h16.8M3.6 15h16.8" />
            <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
          </svg>
          <span>Satélite</span>
        </button>
      </div>

      <!-- Map Loading State -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingMap && !mapLoadError"
          class="absolute inset-0 z-[5] flex items-center justify-center bg-slate-100 dark:bg-[#0d1116]"
        >
          <div class="flex flex-col items-center gap-4">
            <div class="w-14 h-14 border-[3px] border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin"></div>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">{{ t('geocercas.loadingMap') }}</p>
          </div>
        </div>
      </Transition>

      <!-- Map Error State -->
      <Transition name="fade-overlay">
        <div 
          v-if="mapLoadError"
          class="absolute inset-0 z-[5] flex items-center justify-center bg-slate-100 dark:bg-[#0d1116]"
        >
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <HugeiconsIcon :icon="Alert01Icon" :size="28" class="text-red-500" />
            </div>
            <p class="text-sm font-bold text-slate-600 dark:text-slate-300">{{ t('geocercas.errorLoadingMap') }}</p>
            <p class="text-xs text-slate-400">{{ t('geocercas.checkInternet') }}</p>
          </div>
        </div>
      </Transition>

      <!-- Overlay Carga Detalles -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingDetails" 
          class="absolute inset-0 z-[20] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300 pointer-events-none"
        >
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">{{ t('geocercas.loadingGeocerca') }}</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Indicación de mapa vacío -->
      <Transition name="fade-overlay">
        <div
          v-if="!isLoadingMap && !mapLoadError && !selectedGeocerca && !isLoadingDetails"
          class="absolute z-[6] flex items-end justify-end pointer-events-none"
          style="bottom:24px;right:24px;"
        >
          <div class="bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-white/20 dark:border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3">
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">{{ t('geocercas.selectGeocercaPrompt') }}</p>
          </div>
        </div>
      </Transition>

      <!-- PANEL LATERAL FLOTANTE (Estilo docked consistente con RutasListView y Sidebar.vue) -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[320px] md:w-[350px] lg:w-[380px] flex flex-col">
        <!-- Panel acoplado consistente con Sidebar.vue -->
        <div class="flex-1 flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden">
          
          <!-- Encabezado -->
          <div class="relative px-5 py-5 border-b border-slate-200/60 dark:border-white/5 shrink-0">
            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
                  <HugeiconsIcon :icon="MapsIcon" :size="18" :stroke-width="2" />
                </div>
                <div>
                  <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">{{ t('geocercas.title') }}</h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider mt-0.5">
                    {{ t('geocercas.activeGeocercas', { count: filteredGeocercas.length }) }}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <!-- Botón Exportar Plano -->
                <button @click="exportToExcel"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
                  :title="t('geocercas.export')">
                  <HugeiconsIcon :icon="Download01Icon" :size="14" :stroke-width="2" />
                </button>
                <!-- Botón Nueva Geocerca Plano -->
                <button v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_CREATE)" @click="openCreateModal"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-[0.97] transition-all duration-200"
                  :title="t('geocercas.newGeocerca')">
                  <HugeiconsIcon :icon="PlusSignIcon" :size="14" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Búsqueda -->
            <div class="relative mt-4 flex items-center gap-2">
              <div class="relative flex-1">
                <AppInput v-model="searchQuery" :placeholder="t('geocercas.searchPlaceholder')" :icon="Search01Icon" />
              </div>
              <button 
                @click="fetchGeocercas"
                :disabled="loading"
                :title="t('common.reload')"
                class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
              >
                <HugeiconsIcon 
                  :icon="RefreshIcon" 
                  :size="16" 
                  :class="{ 'animate-spin': loading }"
                />
              </button>
            </div>
          </div>

          <!-- Lista de geocercas -->
          <div class="flex-1 overflow-y-auto geocercas-scrollbar px-4 py-4 space-y-2">
            <!-- Cargando -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-10 h-10 border-[3px] border-[#3b82f6]/15 border-t-[#3b82f6] rounded-full animate-spin"></div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">{{ t('geocercas.loading') }}</p>
            </div>
            
            <!-- Sin resultados -->
            <div v-else-if="filteredGeocercas.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_16px_rgba(0,0,0,0.3)]">
                <HugeiconsIcon :icon="Search01Icon" :size="28" :stroke-width="1.5" />
              </div>
              <div class="space-y-1">
                <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">{{ t('geocercas.noResults') }}</p>
                <p class="text-[11px] font-medium text-slate-400 dark:text-slate-500">{{ t('geocercas.tryAnotherTerm') }}</p>
              </div>
            </div>
            
            <!-- Elementos -->
            <template v-else>
              <div
                v-for="geocerca in paginatedGeocercas"
                :key="geocerca.id_geocerca"
                @click="onGeocercaClick(geocerca)"
                class="group relative cursor-pointer rounded-xl transition-all duration-300 select-none border p-2.5 px-3.5 flex items-center justify-between gap-3"
                :class="[
                  selectedGeocerca?.id_geocerca === geocerca.id_geocerca
                    ? 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.05)]'
                    : 'bg-white dark:bg-[#1E222B]/40 border-slate-200/60 dark:border-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-[#232732]/70',
                  openMenuGeocercaId === geocerca.id_geocerca ? 'z-30' : 'z-10'
                ]"
              >
                <!-- Glow Effect background -->
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.04),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <!-- Content container -->
                <div class="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
                  <!-- Icono tipo de geocerca (pequeño y elegante) -->
                  <div
                    class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300"
                    :style="{ backgroundColor: selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? `${geocerca.color}20` : 'transparent', borderColor: `${geocerca.color}40` }"
                  >
                    <HugeiconsIcon :icon="geocerca.tipo === 'Circular' ? CircleIcon : SquareIcon" :size="14" :stroke-width="2" :style="{ color: geocerca.color }" />
                  </div>

                  <!-- Información -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-1.5">
                      <h3
                        class="text-[12px] font-bold uppercase tracking-tight truncate transition-colors duration-200"
                        :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                      >
                        {{ geocerca.nombre }}
                      </h3>
                      <!-- Etiqueta de Tipo -->
                      <span class="text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none select-none tracking-wide bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.04] text-slate-500 dark:text-slate-400 uppercase">
                        {{ geocerca.tipo === 'Circular' ? t('geocercas.circular') : t('geocercas.poligonal') }}
                      </span>
                    </div>
                    <p class="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate mt-1">
                      {{ geocerca.descripcion || t('geocercas.noDescription') }}
                    </p>
                  </div>
                </div>

                <!-- Actions block (Three Dots Menu) -->
                <div class="relative shrink-0 z-20">
                  <button
                    type="button"
                    @click.stop="toggleMenu(geocerca.id_geocerca, $event)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-[#11141A] border border-slate-200/60 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-350 dark:hover:border-white/20 transition-all duration-200"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  <!-- Dropdown Menu -->
                  <Transition name="menu-fade">
                    <div
                      v-if="openMenuGeocercaId === geocerca.id_geocerca"
                      class="absolute right-0 w-32 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-50 overflow-hidden"
                      :class="[
                        paginatedGeocercas.indexOf(geocerca) >= paginatedGeocercas.length - 2 && paginatedGeocercas.length > 3
                          ? 'bottom-full mb-1.5'
                          : 'top-full mt-1.5'
                      ]"
                      @click.stop
                    >
                      <button
                        v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_EDIT)"
                        @click.stop="router.push(`/geocercas/${geocerca.id_geocerca}/editar`); openMenuGeocercaId = null"
                        class="w-full px-3 py-1.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <HugeiconsIcon :icon="Edit02Icon" :size="12" class="text-slate-400" />
                        {{ t('common.edit') }}
                      </button>

                      <button
                        v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_DELETE)"
                        @click.stop="confirmDelete(geocerca); openMenuGeocercaId = null"
                        class="w-full px-3 py-1.5 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors flex items-center gap-2"
                      >
                        <HugeiconsIcon :icon="Delete02Icon" :size="12" class="text-red-400" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </Transition>
                </div>
              </div>
            </template>
          </div>

          <!-- Paginación -->
          <div v-if="filteredGeocercas.length > itemsPerPage" class="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-white/[0.05] flex justify-center">
            <AppPagination
              :totalRecords="filteredGeocercas.length"
              v-model:currentPage="currentPage"
              :rowsPerPage="itemsPerPage"
            />
          </div>
          
          <div class="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {{ filteredGeocercas.length > 0 ? t('geocercas.showingCount', { from: Math.min((currentPage - 1) * itemsPerPage + 1, filteredGeocercas.length), to: Math.min(currentPage * itemsPerPage, filteredGeocercas.length), total: filteredGeocercas.length }) : t('geocercas.noGeocercas') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmación de Eliminación -->
  <AppDeleteConfirm
    v-model:isOpen="isDeleteDialogOpen"
    :itemName="geocercaToDelete?.nombre"
    :loading="isDeleting"
    @confirm="handleDeleteGeocerca"
  />
</template>

<style scoped>
.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Barra de desplazamiento del panel lateral */
.geocercas-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.18) transparent;
}
.geocercas-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.geocercas-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.geocercas-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.18);
  border-radius: 10px;
}
.geocercas-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}

#geocercas-map-container :deep(.gm-style-cc),
#geocercas-map-container :deep(.gmnoprint),
#geocercas-map-container :deep(a[href^="https://maps.google.com/maps"]) {
  display: none !important;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { transform: translateX(-150%) rotate(45deg); }
  100% { transform: translateX(150%) rotate(45deg); }
}

@keyframes scan-line {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes progress-ind {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

@keyframes hover-progress {
  0% { width: 0%; }
  100% { width: 100%; }
}

.hover-card-pop-enter-active {
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hover-card-pop-leave-active {
  transition: all 0.15s cubic-bezier(0.25, 1, 0.50, 1);
}
.hover-card-pop-enter-from {
  opacity: 0;
  transform: translate(-50%, -92%) scale(0.92);
}
.hover-card-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -96%) scale(0.95);
}

.fade-overlay-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-overlay-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-overlay-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-overlay-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
