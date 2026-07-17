/**
 * useMapSetup.ts (shared)
 * ─────────────────────────────────────────────────────────────
 * Responsabilidad: inicialización del mapa de Google Maps,
 * aplicación de temas (dark/light), y observación de cambios
 * de clase en el <html> para sincronizar el modo oscuro.
 *
 * Compatible con:
 *   - RutasListView / RutasFormView (rutas domain)
 *   - GeocercasListView / GeocercaFormView (geocercas domain)
 * ─────────────────────────────────────────────────────────────
 */
import { ref, shallowRef, watch, onUnmounted } from 'vue'

export interface MapSetupOptions {
  defaultZoom?: number
  gestureHandling?: 'cooperative' | 'greedy' | 'auto'
  forceDark?: boolean
  /** Map ID de Google Cloud — habilita mapas vectoriales con setTilt() y setHeading() nativos */
  mapId?: string
}

export interface MapSetupReturn {
  map: ReturnType<typeof shallowRef>
  isLoadingMap: ReturnType<typeof ref>
  mapLoadError: ReturnType<typeof ref>
  activeTheme: ReturnType<typeof ref>
  isDarkMapMode: ReturnType<typeof ref>
  initMap: (googleMapsApi: any, onMapClick?: (lat: number, lng: number) => void) => void
  initPlacesSearch: (googleMapsApi: any, inputId: string) => void
  startDarkModeObserver: () => void
  setMapTheme: (themeId: string) => void
}

// ── Definición de Temas ──────────────────────────────────────
const themes = [
  {
    id: 'tactical',
    name: 'Tactical (Standard)',
    getStyle: (isDark: boolean) => {
      const land    = isDark ? '#0f172a' : '#e2e8f0'
      const water   = isDark ? '#020617' : '#cbd5e1'
      const road    = isDark ? '#1e293b' : '#f1f5f9'
      const highway = isDark ? '#334155' : '#ffffff'
      const text    = '#64748b'
      const accent  = isDark ? '#3b82f6' : '#2563eb'

      return [
        { elementType: 'geometry',              stylers: [{ color: land }] },
        { elementType: 'labels.text.stroke',    stylers: [{ color: land }, { weight: 2 }] },
        { elementType: 'labels.text.fill',      stylers: [{ color: text }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'poi',                   stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',               stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: isDark ? '#020617' : '#d1d5db' }] },
        { featureType: 'road', elementType: 'geometry',     stylers: [{ color: road }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: highway }] },
        { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'water', elementType: 'geometry',    stylers: [{ color: water }] }
      ]
    }
  }
]

const getMapStyle = (themeId: string, isDark: boolean = true) => {
  const theme = themes.find(t => t.id === themeId)
  return theme ? theme.getStyle(isDark) : []
}

// ── Composable ───────────────────────────────────────────────
export function useMapSetup(containerId: string, options: MapSetupOptions = {}) {
  const map             = shallowRef<any>(null)
  const isLoadingMap    = ref(true)
  const mapLoadError    = ref(false)
  const activeTheme     = ref('tactical')
  const isDarkMapMode   = ref(
    options.forceDark ||
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark')
  )
  const htmlClassObserver = ref<MutationObserver | null>(null)

  const {
    defaultZoom = 12,
    gestureHandling,
    mapId
  } = options

  /** Inicializa el mapa de Google Maps en el contenedor dado */
  const initMap = (googleMapsApi: any, onMapClick?: (lat: number, lng: number) => void) => {
    const container = document.getElementById(containerId)
    if (!container) return

    isLoadingMap.value = false

    const mapOptions: google.maps.MapOptions = {
      center: { lat: 4.6097, lng: -74.0817 }, // Bogotá
      zoom: defaultZoom,
      disableDefaultUI: true,
      zoomControl: true,
    }

    if (mapId) {
      // Mapa vectorial con Map ID — el estilo personalizado se carga automáticamente
      mapOptions.mapId = mapId
    } else {
      // Fallback: mapa raster con estilos JS (sin soporte de tilt nativo)
      mapOptions.styles = getMapStyle(activeTheme.value, isDarkMapMode.value)
    }

    if (gestureHandling) {
      mapOptions.gestureHandling = gestureHandling
    }

    map.value = new googleMapsApi.Map(container, mapOptions)

    if (onMapClick) {
      map.value.addListener('click', (e: any) => {
        onMapClick(e.latLng.lat(), e.latLng.lng())
      })
    }
  }

  /** Configura el buscador de Places en un input del DOM */
  const initPlacesSearch = (googleMapsApi: any, inputId: string) => {
    const searchInput = document.getElementById(inputId) as HTMLInputElement
    if (!searchInput || !googleMapsApi.places) return

    const autocomplete = new googleMapsApi.places.Autocomplete(searchInput, {
      fields: ['geometry', 'name']
    })
    autocomplete.bindTo('bounds', map.value)

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place.geometry?.location) return

      if (place.geometry.viewport) {
        map.value.fitBounds(place.geometry.viewport)
      } else {
        map.value.setCenter(place.geometry.location)
        map.value.setZoom(17)
      }
    })
  }

  /** Observa cambios de clase en <html> para detectar dark mode */
  const startDarkModeObserver = () => {
    htmlClassObserver.value = new MutationObserver(() => {
      isDarkMapMode.value =
        options.forceDark ||
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')
    })
    htmlClassObserver.value.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    htmlClassObserver.value.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }

  const setMapTheme = (themeId: string) => {
    activeTheme.value = themeId
    if (map.value) {
      map.value.setOptions({ styles: getMapStyle(themeId, isDarkMapMode.value) })
    }
  }

  // Reactivo al cambio de tema oscuro/claro (solo aplica en mapas raster sin mapId)
  watch(isDarkMapMode, (isDark) => {
    if (map.value && !mapId) {
      map.value.setOptions({ styles: getMapStyle(activeTheme.value, isDark) })
    }
  })

  onUnmounted(() => {
    htmlClassObserver.value?.disconnect()
    htmlClassObserver.value = null
  })

  return {
    map,
    isLoadingMap,
    mapLoadError,
    activeTheme,
    isDarkMapMode,
    initMap,
    initPlacesSearch,
    startDarkModeObserver,
    setMapTheme,
  }
}