<script setup lang="ts">
import { ref, watch, shallowRef, nextTick, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Location01Icon,
  Loading02Icon,
  BatteryFullIcon,
  BatteryMedium01Icon,
  BatteryLowIcon,
  BatteryEmptyIcon,
  DashboardSpeed01Icon,
  PlayIcon,
  PauseIcon,
  ArrowLeftDoubleIcon,
  ArrowRightDoubleIcon,
  FastWindIcon,
  MapsIcon
} from '@hugeicons/core-free-icons'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import { ThreeMarkerRenderer } from '../../../utils/threeMarkerRenderer'
import { load3dAssets } from '../../../utils/three3dLoader'
import { fetchMapPositionsApi } from '../services/hardware.api'
import type { Hardware, Posicion } from '../types/hardware'
import { fetchGeocercasApi, fetchGeocercaDetallesApi } from '../../geocercas/services/geocercas.api'
import type { Geocerca, GeocercaDetalle, GeocercaCluster, ElementoGeocercaCluster } from '../../geocercas/types/geocerca'
import { calcularCentroGeocerca, agruparGeocercasEnClusters } from '../../geocercas/composables/useGeocercaClustering'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'

// Precargar modelo 3D y texturas
load3dAssets().catch(() => {})

const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits(['update:isOpen'])

const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { loadGoogleMaps } = useGoogleMaps()
const {
  map,
  isLoadingMap,
  initMap,
  startDarkModeObserver,
  isDarkMapMode,
  currentMapType,
  setMapType
} = useMapSetup('hardware-posicion-map-container', {
  defaultZoom: 13,
  gestureHandling: 'greedy',
  mapId: '688c00fbadb30bbb930f73e2'
})

interface PosicionItem {
  index: number
  lat: number
  lon: number
  speed: string
  battery: string
  course: string
  time_fx: string
  sos: string
  isFirst: boolean
  isLast: boolean
}

const posiciones = ref<Posicion[]>([])
const allPosicionItems = shallowRef<PosicionItem[]>([])
const isLoading = ref(false)
const mapReady = ref(false)
const pointMarkers = shallowRef<any[]>([])
const visiblePointCount = ref(0)
let zoomListenerAttached = false

const polyline = shallowRef<google.maps.Polyline | null>(null)
const playbackMarker = shallowRef<any>(null)
const playbackPath = shallowRef<google.maps.LatLngLiteral[]>([])

let playbackThreeRenderer: ThreeMarkerRenderer | null = null
let playbackSpeedBadgeEl: HTMLElement | null = null

const isPlaying = ref(false)
const currentIndex = ref(0)
const smoothProgress = ref(0)
const playbackSpeed = ref(0.25)
const animationFrameId = ref<number | null>(null)
const lastFrameTime = ref(0)
const isDragging = ref(false)
const wasPlayingBeforeDrag = ref(false)
const hoverSpeed = ref<{ x: number; speed: number; percent: number } | null>(null)

const BASE_DURATION = 180000
const speedOptions = [0.25, 0.5, 1, 2, 4, 8]

const fechaDesde = ref<Date | null>(null)
const fechaHasta = ref<Date | null>(null)

const formatDateTime = (val: Date | null, isEnd: boolean = false) => {
  if (!val) return ''
  const y = val.getFullYear()
  const m = String(val.getMonth() + 1).padStart(2, '0')
  const d = String(val.getDate()).padStart(2, '0')
  const h = String(val.getHours()).padStart(2, '0')
  const min = String(val.getMinutes()).padStart(2, '0')
  const s = isEnd && val.getSeconds() === 0 ? '59' : String(val.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

const close = () => {
  stopPlayback()
  emit('update:isOpen', false)
}

const fetchPosiciones = async () => {
  if (!props.hardware || !selectedGroup.value?.id) return
  if (!fechaDesde.value || !fechaHasta.value) return
  stopPlayback()
  isLoading.value = true
  posiciones.value = []
  clearMapElements()

  try {
    const desde = formatDateTime(fechaDesde.value, false)
    const hasta = formatDateTime(fechaHasta.value, true)
    posiciones.value = await fetchMapPositionsApi({
      id_hardware: props.hardware.id_hardware,
      id_grupo: selectedGroup.value.id,
      desde,
      hasta
    })
    await nextTick()
    await drawPositions()
  } catch (error) {
    console.error('Error al consultar posiciones:', error)
  } finally {
    isLoading.value = false
  }
}

const clearMapElements = () => {
  pointMarkers.value.forEach(m => {
    if (typeof m.setMap === 'function') m.setMap(null)
    else if ('map' in m) m.map = null
  })
  pointMarkers.value = []

  if (polyline.value) {
    polyline.value.setMap(null)
    polyline.value = null
  }
  if (playbackThreeRenderer) {
    playbackThreeRenderer.destroy()
    playbackThreeRenderer = null
  }
  if (playbackMarker.value) {
    if (typeof playbackMarker.value.setMap === 'function') {
      playbackMarker.value.setMap(null)
    } else {
      playbackMarker.value.map = null
    }
    playbackMarker.value = null
  }
  playbackSpeedBadgeEl = null
  allPosicionItems.value = []
  visiblePointCount.value = 0
  batteryPercentage.value = null
  currentSpeed.value = null
  currentCourse.value = null
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpLatLng = (
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
  t: number
): google.maps.LatLngLiteral => ({
  lat: lerp(a.lat, b.lat, t),
  lng: lerp(a.lng, b.lng, t)
})

const createPlaybackMarkerElement = (initialSpeed = 0) => {
  const container = document.createElement('div')
  container.className = 'custom-gps-marker'
  container.style.cssText = 'position:relative;width:112px;height:148px;display:flex;flex-direction:column;align-items:center;user-select:none;pointer-events:none;'

  const inner = document.createElement('div')
  inner.className = 'marker-inner-wrapper'
  inner.style.cssText = [
    'position:relative',
    'width:112px',
    'height:112px',
    'flex-shrink:0',
    'transform-origin:center center',
    'transition:transform 0.1s ease-out'
  ].join(';')

  const canvas = document.createElement('canvas')
  canvas.className = 'marker-3d-canvas'
  canvas.width = 112
  canvas.height = 112
  canvas.style.cssText = 'position:absolute;top:0px;left:0px;width:112px;height:112px;pointer-events:none;z-index:2;'
  inner.appendChild(canvas)

  const connector = document.createElement('div')
  connector.style.cssText = 'width:2px;height:7px;background:linear-gradient(to bottom, #38bdf8 0%, rgba(56,189,248,0) 100%);opacity:0.6;margin-top:-2px;border-radius:1px;'

  const tail = document.createElement('div')
  tail.className = 'marker-info-tail'
  tail.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:6px',
    'padding:3px 10px 3px 8px',
    'background:rgba(11, 15, 25, 0.92)',
    'border:1px solid rgba(255, 255, 255, 0.12)',
    'border-radius:9999px',
    'white-space:nowrap',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
    'z-index:3',
    'position:relative'
  ].join(';')

  const speedSection = document.createElement('div')
  speedSection.style.cssText = 'display:flex;align-items:center;gap:4px;'

  const speedIconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15.5 9.5" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="12" cy="13" r="1.5" fill="#38bdf8"/>
    <path d="M20.5 15A9 9 0 1 0 3.5 15" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-dasharray="32 2"/>
  </svg>`

  const speedIconEl = document.createElement('div')
  speedIconEl.innerHTML = speedIconSvg
  speedIconEl.style.cssText = 'display:flex;align-items:center;'

  const speedBadge = document.createElement('span')
  speedBadge.className = 'tail-speed'
  speedBadge.style.cssText = 'font-size:11px;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-0.02em;color:#ffffff;line-height:1;'
  speedBadge.textContent = `${Math.round(initialSpeed)}`

  const speedUnit = document.createElement('span')
  speedUnit.style.cssText = 'font-size:8px;font-weight:700;font-family:Inter,sans-serif;color:rgba(148,163,184,0.7);letter-spacing:0.05em;text-transform:uppercase;line-height:1;'
  speedUnit.textContent = 'km/h'

  speedSection.appendChild(speedIconEl)
  speedSection.appendChild(speedBadge)
  speedSection.appendChild(speedUnit)
  tail.appendChild(speedSection)

  container.appendChild(inner)
  container.appendChild(connector)
  container.appendChild(tail)

  return { container, canvas, speedBadge }
}

const CLUSTER_RADIUS_PX = 50

const groupPointsByZoom = (
  items: PosicionItem[],
  zoom: number
): PosicionItem[] => {
  if (items.length <= 2) return items
  if (zoom >= 18) return items

  const scale = Math.pow(2, zoom)
  const points = items.map(item => {
    const x = ((item.lon + 180) / 360) * 256 * scale
    const sinLat = Math.sin((item.lat * Math.PI) / 180)
    const y =
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      256 *
      scale
    return { item, x, y, visited: false }
  })

  const representatives: PosicionItem[] = []

  for (let i = 0; i < points.length; i++) {
    if (points[i].visited) continue
    points[i].visited = true

    // El primero del grupo es el representante
    representatives.push(points[i].item)

    for (let j = i + 1; j < points.length; j++) {
      if (points[j].visited) continue
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_PX) {
        points[j].visited = true
      }
    }
  }

  return representatives
}

// Etiqueta flotante (mismo estilo que las etiquetas de GeocercasListView):
// píldora oscura con borde del color, texto en mayúsculas y escala según el zoom.
let LabelOverlayClass: any = null
const getLabelOverlayClass = () => {
  if (LabelOverlayClass) return LabelOverlayClass
  const g = (window as any).google
  if (!g?.maps?.OverlayView) return null
  LabelOverlayClass = class extends g.maps.OverlayView {
    private element: HTMLDivElement
    private position: any
    private offsetPx: number
    constructor(position: any, text: string, color: string, offsetPx = 8) {
      super()
      this.position = position
      this.offsetPx = offsetPx
      this.element = document.createElement('div')
      const st = this.element.style
      st.position = 'absolute'
      st.transformOrigin = 'bottom center'
      st.transform = `translate(-50%, calc(-100% - ${offsetPx}px)) scale(1)`
      st.background = 'rgba(15, 23, 42, 0.9)'
      st.backdropFilter = 'blur(4px)'
      st.border = `1.5px solid ${color}`
      st.borderRadius = '6px'
      st.padding = '4px 8px'
      st.color = '#ffffff'
      st.fontSize = '9px'
      st.fontWeight = '800'
      st.fontFamily = 'Inter, sans-serif'
      st.whiteSpace = 'nowrap'
      st.maxWidth = '180px'
      st.overflow = 'hidden'
      st.textOverflow = 'ellipsis'
      st.pointerEvents = 'none'
      st.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
      st.textTransform = 'uppercase'
      st.letterSpacing = '0.06em'
      st.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out'
      this.element.innerText = text
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(this.element)
    }
    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position)
      if (!point) return
      this.element.style.left = point.x + 'px'
      this.element.style.top = point.y + 'px'
      const zoom = this.getMap()?.getZoom()
      if (zoom === undefined) return
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
      this.element.style.transform = `translate(-50%, calc(-100% - ${this.offsetPx}px)) scale(${scale})`
      this.element.style.opacity = String(opacity)
    }
    onRemove() {
      this.element.parentNode?.removeChild(this.element)
    }
  }
  return LabelOverlayClass
}

const createPointMarker = (item: PosicionItem) => {
  const isFirst = item.isFirst
  const isLast = item.isLast

  const marker = new google.maps.Marker({
    position: { lat: item.lat, lng: item.lon },
    map: map.value,
    title: isFirst
      ? `${t('hardware.start')} ${formatUnixTime(item.time_fx)}`
      : isLast
        ? `${t('hardware.end')} ${formatUnixTime(item.time_fx)}`
        : formatUnixTime(item.time_fx),
    zIndex: isFirst || isLast ? 100 : 10,
    icon: isFirst
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeWeight: 0
        }
      : isLast
        ? {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeWeight: 0
        }
      : {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6.5,
          fillColor: isDarkMapMode.value ? '#38bdf8' : '#3b82f6',
          fillOpacity: 0.95,
          strokeWeight: 0
        }
  })

  const dotColor = isFirst ? '#22c55e' : isLast ? '#ef4444' : '#38bdf8'
  const infoContent = `
    <div style="font-family:Inter,sans-serif;padding:6px 4px;min-width:185px;">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${dotColor};flex-shrink:0;"></span>
        <span>${formatUnixTime(item.time_fx)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;">
        <span style="color:#64748b;">${t('hardware.speed')}</span>
        <span style="font-weight:700;color:#0f172a;">${item.speed} km/h</span>
        <span style="color:#64748b;">${t('hardware.battery')}</span>
        <span style="font-weight:700;color:#0f172a;">${item.battery}%</span>
        <span style="color:#64748b;">${t('hardware.direction')}</span>
        <span style="font-weight:700;color:#0f172a;">${item.course}°</span>
      </div>
    </div>
  `
  const infoWindow = new google.maps.InfoWindow({ content: infoContent })
  marker.addListener('click', () => {
    infoWindow.open(map.value, marker)
  })

  return marker
}

const updatePositionMarkers = () => {
  if (!map.value || !allPosicionItems.value.length) return

  pointMarkers.value.forEach(m => {
    if (typeof m.setMap === 'function') m.setMap(null)
    else if ('map' in m) m.map = null
  })
  pointMarkers.value = []

  const currentZoom = map.value.getZoom() || 13
  const visibles = groupPointsByZoom(allPosicionItems.value, currentZoom)

  const newMarkers: any[] = []
  visibles.forEach(item => {
    newMarkers.push(createPointMarker(item))
  })
  pointMarkers.value = newMarkers
  visiblePointCount.value = visibles.length
}

const drawPositions = async () => {
  if (!map.value || !posiciones.value.length) return
  const google = (window as any).google

  clearMapElements()

  const bounds = new google.maps.LatLngBounds()
  const path: google.maps.LatLngLiteral[] = []
  const items: PosicionItem[] = []

  posiciones.value.forEach((pos, index) => {
    const lat = parseFloat(pos.lat)
    const lng = parseFloat(pos.lon)
    if (isNaN(lat) || isNaN(lng)) return
    const latLng = { lat, lng }
    path.push(latLng)
    bounds.extend(latLng)
    items.push({
      index,
      lat,
      lon: lng,
      speed: pos.speed ?? '0',
      battery: pos.battery ?? '0',
      course: pos.course ?? '0',
      time_fx: pos.time_fx ?? '',
      isFirst: index === 0,
      isLast: index === posiciones.value.length - 1
    })
  })

  playbackPath.value = path
  allPosicionItems.value = items

  if (path.length > 1) {
    polyline.value = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: isDarkMapMode.value ? '#5da6fc' : '#3b82f6',
      strokeOpacity: 0.85,
      strokeWeight: 3.5,
      map: map.value
    })
  }

  // Cursor 3D con ThreeMarkerRenderer
  if (path.length > 0) {
    const firstPos = posiciones.value[0]
    const initialSpeed = firstPos?.speed ? parseFloat(String(firstPos.speed)) : 0
    const initialBattery = firstPos?.battery !== undefined ? parseFloat(String(firstPos.battery)) : 100
    const initialCourse = firstPos?.course !== undefined ? parseFloat(String(firstPos.course)) : 0

    const { container, canvas, speedBadge } = createPlaybackMarkerElement(initialSpeed)
    playbackSpeedBadgeEl = speedBadge

    try {
      let AdvancedMarkerElementClass = (google.maps as any).marker?.AdvancedMarkerElement
      if (!AdvancedMarkerElementClass && typeof (google.maps as any).importLibrary === 'function') {
        try {
          const markerLib = await (google.maps as any).importLibrary('marker')
          AdvancedMarkerElementClass = markerLib?.AdvancedMarkerElement
        } catch (e) {
          console.warn('Error cargando marker library:', e)
        }
      }

      if (AdvancedMarkerElementClass) {
        playbackMarker.value = new AdvancedMarkerElementClass({
          position: path[0],
          map: map.value,
          content: container,
          anchorLeft: '-50%',
          anchorTop: '-56px',
          zIndex: 9999
        })
      } else {
        class CustomPlaybackOverlay extends google.maps.OverlayView {
          private pos: google.maps.LatLngLiteral
          private element: HTMLElement

          constructor(pos: google.maps.LatLngLiteral, el: HTMLElement) {
            super()
            this.pos = pos
            this.element = el
          }

          onAdd() {
            const panes = this.getPanes()
            panes?.floatPane.appendChild(this.element)
          }

          draw() {
            const projection = this.getProjection()
            if (!projection) return
            const point = projection.fromLatLngToDivPixel(new google.maps.LatLng(this.pos.lat, this.pos.lng))
            if (point) {
              this.element.style.position = 'absolute'
              this.element.style.left = `${point.x - 56}px`
              this.element.style.top = `${point.y - 112}px`
              this.element.style.zIndex = '9999'
            }
          }

          onRemove() {
            if (this.element.parentElement) {
              this.element.parentElement.removeChild(this.element)
            }
          }

          setPosition(newPos: google.maps.LatLngLiteral) {
            this.pos = newPos
            this.draw()
          }
        }

        const overlay = new CustomPlaybackOverlay(path[0], container)
        overlay.setMap(map.value)
        playbackMarker.value = overlay
      }
    } catch (e) {
      console.warn('Error creando marcador de reproducción 3D:', e)
    }

    playbackThreeRenderer = new ThreeMarkerRenderer(canvas)
    const mapTilt = map.value ? map.value.getTilt() || 0 : 0
    const mapHeading = map.value ? map.value.getHeading() || 0 : 0
    playbackThreeRenderer.update(initialCourse, false, mapTilt, initialBattery, 0x0088ff, false, mapHeading)
  }

  currentIndex.value = 0
  smoothProgress.value = 0
  updatePlaybackData(0)

  if (!bounds.isEmpty()) {
    map.value.fitBounds(bounds)
  }

  updatePositionMarkers()

  if (!zoomListenerAttached && map.value) {
    map.value.addListener('zoom_changed', () => {
      updatePositionMarkers()
    })
    zoomListenerAttached = true
  }
}

const getInterpolatedPosition = (progress: number): google.maps.LatLngLiteral | null => {
  const path = playbackPath.value
  if (!path.length) return null
  if (path.length === 1) return path[0]
  const scaled = progress * (path.length - 1)
  const idx = Math.floor(scaled)
  const frac = scaled - idx
  if (idx >= path.length - 1) return path[path.length - 1]
  return lerpLatLng(path[idx], path[idx + 1], frac)
}

const getInterpolatedData = (progress: number) => {
  if (!posiciones.value.length) return { battery: null, speed: null, course: null }
  const scaled = progress * (posiciones.value.length - 1)
  const idx = Math.floor(scaled)
  const frac = scaled - idx
  const posA = posiciones.value[Math.min(idx, posiciones.value.length - 1)]
  const posB = posiciones.value[Math.min(idx + 1, posiciones.value.length - 1)]
  const a = (v: string | undefined) => v !== undefined && v !== null ? parseFloat(String(v)) : 0
  return {
    battery: Math.round(lerp(a(posA.battery), a(posB.battery), frac)),
    speed: Math.round(lerp(a(posA.speed), a(posB.speed), frac)),
    course: lerp(a(posA.course), a(posB.course), frac)
  }
}

const updatePlaybackData = (progress: number) => {
  const pos = getInterpolatedPosition(progress)
  if (pos && playbackMarker.value) {
    if ('position' in playbackMarker.value) {
      playbackMarker.value.position = pos
    } else if (typeof playbackMarker.value.setPosition === 'function') {
      playbackMarker.value.setPosition(pos)
    }
  }
  const data = getInterpolatedData(progress)
  batteryPercentage.value = data.battery
  currentSpeed.value = data.speed
  currentCourse.value = Math.round(data.course)

  if (playbackSpeedBadgeEl) {
    playbackSpeedBadgeEl.textContent = `${data.speed ?? 0}`
  }

  if (playbackThreeRenderer) {
    const mapTilt = map.value ? map.value.getTilt() || 0 : 0
    const mapHeading = map.value ? map.value.getHeading() || 0 : 0
    playbackThreeRenderer.update(
      data.course,
      false,
      mapTilt,
      data.battery ?? 100,
      0x0088ff,
      false,
      mapHeading
    )
  }
}

const playbackProgress = computed(() => {
  if (!posiciones.value.length) return 0
  return smoothProgress.value * 100
})

const startPlayback = () => {
  if (!posiciones.value.length) return
  if (smoothProgress.value >= 1) {
    smoothProgress.value = 0
    currentIndex.value = 0
  }
  isPlaying.value = true
  lastFrameTime.value = performance.now()
  animationLoop()
}

const stopPlayback = () => {
  isPlaying.value = false
  if (animationFrameId.value !== null) {
    cancelAnimationFrame(animationFrameId.value)
    animationFrameId.value = null
  }
}

const togglePlayback = () => {
  if (isPlaying.value) {
    stopPlayback()
  } else {
    startPlayback()
  }
}

const animationLoop = () => {
  if (!isPlaying.value) return
  const now = performance.now()
  const delta = now - lastFrameTime.value
  lastFrameTime.value = now

  const step = (delta / BASE_DURATION) * playbackSpeed.value
  smoothProgress.value = Math.min(1, smoothProgress.value + step)
  currentIndex.value = Math.floor(smoothProgress.value * (posiciones.value.length - 1))

  updatePlaybackData(smoothProgress.value)

  if (smoothProgress.value >= 1) {
    stopPlayback()
    return
  }

  animationFrameId.value = requestAnimationFrame(animationLoop)
}

const seekTo = (percent: number) => {
  if (!posiciones.value.length) return
  smoothProgress.value = Math.max(0, Math.min(1, percent / 100))
  currentIndex.value = Math.floor(smoothProgress.value * (posiciones.value.length - 1))
  updatePlaybackData(smoothProgress.value)
}

const skipBack = () => {
  stopPlayback()
  seekTo(Math.max(0, smoothProgress.value * 100 - 5))
}

const skipForward = () => {
  stopPlayback()
  seekTo(Math.min(100, smoothProgress.value * 100 + 5))
}

const cycleSpeed = () => {
  const idx = speedOptions.indexOf(playbackSpeed.value)
  playbackSpeed.value = speedOptions[(idx + 1) % speedOptions.length]
}

const handleTimelineClick = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  seekTo(percent)
}

const handleTimelineDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  seekTo(percent)
}

const handleTimelineMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  wasPlayingBeforeDrag.value = isPlaying.value
  stopPlayback()
  handleTimelineClick(e)
}

const handleTimelineMouseUp = () => {
  if (isDragging.value && wasPlayingBeforeDrag.value) {
    startPlayback()
  }
  isDragging.value = false
}

const handleSpeedGraphHover = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  const scaled = (percent / 100) * (posiciones.value.length - 1)
  const idx = Math.floor(scaled)
  const frac = scaled - idx
  const posA = posiciones.value[Math.min(idx, posiciones.value.length - 1)]
  const posB = posiciones.value[Math.min(idx + 1, posiciones.value.length - 1)]
  const a = (v: string | undefined) => v !== undefined && v !== null ? parseFloat(String(v)) : 0
  const speed = Math.round(lerp(a(posA?.speed), a(posB?.speed), frac))
  hoverSpeed.value = { x: e.clientX - rect.left, speed, percent }
}

const handleSpeedGraphLeave = () => {
  hoverSpeed.value = null
}

const initializeMap = async () => {
  const googleMapsApi = await loadGoogleMaps()
  setTimeout(() => {
    initMap(googleMapsApi)
    startDarkModeObserver()
    mapReady.value = true
  }, 150)
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fechaDesde.value = null
    fechaHasta.value = null
    posiciones.value = []
    clearMapElements()
    clearAllGeocercas()
    geocercaListenerAttached = false
    geocercaSearch.value = ''
    geocercaDetalleCache.clear()
    loadGeocercasList()
    initializeMap()
  } else {
    stopPlayback()
    clearMapElements()
    clearAllGeocercas()
    fechaDesde.value = null
    fechaHasta.value = null
    posiciones.value = []
    mapReady.value = false
  }
})

watch(() => isDarkMapMode.value, () => {
  if (polyline.value) {
    polyline.value.setOptions({
      strokeColor: isDarkMapMode.value ? '#5da6fc' : '#3b82f6'
    })
  }
})

// ─── Geocercas (panel izquierdo) ───────────────────────────────────────────
const geocercasList = ref<Geocerca[]>([])
const loadingGeocercasList = ref(false)
const loadingGeocercaIds = ref<Set<string>>(new Set())
const selectedGeocercaIds = ref<Set<string>>(new Set())
const geocercaSearch = ref('')
const geocercaDetalleCache = new Map<string, GeocercaDetalle>()
// Dibujos individuales (figura + etiqueta) por geocerca y marcadores de cluster
const geocercaDrawings = new Map<string, any[]>()
const geocercaClusterMarkers = new Map<string, any>()
let geocercaListenerAttached = false

const filteredGeocercas = computed(() => {
  const q = geocercaSearch.value.trim().toLowerCase()
  if (!q) return geocercasList.value
  return geocercasList.value.filter(g => g.nombre?.toLowerCase().includes(q))
})

const removeGeocercaDrawing = (id: string) => {
  const drawings = geocercaDrawings.get(id)
  if (!drawings) return
  drawings.forEach(d => { try { d.setMap(null) } catch (_) {} })
  geocercaDrawings.delete(id)
}

const clearGeocercaClusters = () => {
  geocercaClusterMarkers.forEach(m => { if (m) m.map = null })
  geocercaClusterMarkers.clear()
}

const clearGeocercaDrawings = () => {
  Array.from(geocercaDrawings.keys()).forEach(removeGeocercaDrawing)
  clearGeocercaClusters()
}

// Mismo marcador de grupo (cluster) que GeocercasListView
const createGeocercaClusterElement = (count: number) => {
  const container = document.createElement('div')
  container.style.cssText = 'position: relative; width: 0; height: 0; cursor: pointer; user-select: none; pointer-events: auto;'
  const labelText = count === 1 ? 'Geocerca' : 'Geocercas'
  const iconSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>'
  container.innerHTML = `
    <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 0); display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
      <div style="padding: 4px 10px; border-radius: 8px; background: rgba(15,18,26,0.95); border: 1px solid rgba(59,130,246,0.5); box-shadow: 0 2px 12px rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; gap: 8px; color: white;">
        <div style="width: 20px; height: 20px; border-radius: 4px; background: rgba(59,130,246,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${iconSvg}</div>
        <div style="display: flex; align-items: center; gap: 4px; font-family: Inter, ui-sans-serif, system-ui, sans-serif;">
          <span style="font-size: 12px; font-weight: 700; color: #3b82f6; font-family: monospace; line-height: 1;">${count}</span>
          <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; line-height: 1;">${labelText}</span>
        </div>
      </div>
      <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #3b82f6; margin-top: -0.5px;"></div>
    </div>
  `
  return container
}

const drawGeocercaShape = (detalle: GeocercaDetalle) => {
  const g = (window as any).google
  if (!map.value || !g || !detalle.puntos?.length) return
  const color = detalle.color || '#3b82f6'
  const style = {
    strokeColor: color,
    strokeOpacity: 0.45,
    strokeWeight: 1.2,
    fillColor: color,
    fillOpacity: 0.12,
    map: map.value,
    clickable: false
  }
  const drawings: any[] = []
  let bounds: any = null
  if (detalle.tipo === 'Circular') {
    const p = detalle.puntos[0]
    const circle = new g.maps.Circle({
      ...style,
      center: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) },
      radius: parseFloat(p.radio || '0')
    })
    drawings.push(circle)
    bounds = circle.getBounds()
  } else {
    const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
    drawings.push(new g.maps.Polygon({ ...style, paths }))
    bounds = new g.maps.LatLngBounds()
    paths.forEach(pt => bounds.extend(pt))
  }
  const Cls = getLabelOverlayClass()
  if (bounds && Cls) {
    const top = new g.maps.LatLng(bounds.getNorthEast().lat(), bounds.getCenter().lng())
    const label = new Cls(top, detalle.nombre, color)
    label.setMap(map.value)
    drawings.push(label)
  }
  geocercaDrawings.set(detalle.id_geocerca, drawings)
}

// Dibuja las geocercas seleccionadas: figuras individuales o clusters según el zoom
const renderGeocercas = () => {
  const g = (window as any).google
  if (!map.value || !g) return

  const items: ElementoGeocercaCluster[] = []
  selectedGeocercaIds.value.forEach(id => {
    const detalle = geocercaDetalleCache.get(id)
    if (!detalle) return
    const c = calcularCentroGeocerca(detalle)
    if (!c) return
    items.push({
      id,
      nombre: detalle.nombre,
      tipo: detalle.tipo,
      color: detalle.color || '#3b82f6',
      lat: c.lat,
      lon: c.lon,
      detalle
    })
  })

  const zoom = map.value.getZoom() || 12
  let clusters: GeocercaCluster[] = []
  let singles: ElementoGeocercaCluster[] = items
  if (zoom < 15 && items.length > 1) {
    const grouped = agruparGeocercasEnClusters(items, zoom, 75)
    clusters = grouped.clusters
    singles = grouped.elementosIndividuales
  }

  // Figuras individuales
  const singleIds = new Set(singles.map(i => i.id))
  Array.from(geocercaDrawings.keys()).forEach(id => {
    if (!singleIds.has(id)) removeGeocercaDrawing(id)
  })
  singles.forEach(item => {
    if (!geocercaDrawings.has(item.id)) drawGeocercaShape(item.detalle)
  })

  // Clusters
  const activeClusterIds = new Set(clusters.map(c => c.id))
  geocercaClusterMarkers.forEach((m, key) => {
    if (!activeClusterIds.has(key)) {
      if (m) m.map = null
      geocercaClusterMarkers.delete(key)
    }
  })
  const AdvancedMarker = g.maps?.marker?.AdvancedMarkerElement
  if (!AdvancedMarker) return
  clusters.forEach(cluster => {
    const existing = geocercaClusterMarkers.get(cluster.id)
    if (existing) {
      existing.map = map.value
      existing.position = { lat: cluster.latCentro, lng: cluster.lngCentro }
      return
    }
    const marker = new AdvancedMarker({
      position: { lat: cluster.latCentro, lng: cluster.lngCentro },
      map: map.value,
      title: `${cluster.elementos.length} geocercas agrupadas`,
      content: createGeocercaClusterElement(cluster.elementos.length),
      zIndex: 500
    })
    marker.addListener('click', () => {
      map.value.panTo({ lat: cluster.latCentro, lng: cluster.lngCentro })
      map.value.setZoom(Math.min((map.value.getZoom() || 12) + 3, 16))
    })
    geocercaClusterMarkers.set(cluster.id, marker)
  })
}

const attachGeocercaListeners = () => {
  if (!map.value || geocercaListenerAttached) return
  geocercaListenerAttached = true
  map.value.addListener('idle', () => {
    if (selectedGeocercaIds.value.size > 0) renderGeocercas()
  })
}

const fitGeocerca = (id: string) => {
  const g = (window as any).google
  const detalle = geocercaDetalleCache.get(id)
  if (!map.value || !g || !detalle?.puntos?.length) return
  if (detalle.tipo === 'Circular') {
    const p = detalle.puntos[0]
    const c = new g.maps.Circle({ center: { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }, radius: parseFloat(p.radio || '0') })
    const b = c.getBounds()
    if (b) map.value.fitBounds(b)
  } else {
    const b = new g.maps.LatLngBounds()
    detalle.puntos.forEach(p => b.extend({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
    map.value.fitBounds(b)
  }
}

const setGeocercaSelected = async (id: string, selected: boolean) => {
  const next = new Set(selectedGeocercaIds.value)
  if (!selected) {
    next.delete(id)
    selectedGeocercaIds.value = next
    renderGeocercas()
    return
  }
  next.add(id)
  selectedGeocercaIds.value = next
  let detalle = geocercaDetalleCache.get(id)
  if (!detalle) {
    const groupId = selectedGroup.value?.id
    if (!groupId) return
    const loading = new Set(loadingGeocercaIds.value); loading.add(id)
    loadingGeocercaIds.value = loading
    try {
      const res = await fetchGeocercaDetallesApi(groupId, id)
      if (res) {
        geocercaDetalleCache.set(id, res)
        detalle = res
      }
    } catch (e) {
      console.error('Error cargando detalle de geocerca:', e)
    } finally {
      const l2 = new Set(loadingGeocercaIds.value); l2.delete(id)
      loadingGeocercaIds.value = l2
    }
  }
  // Pudo deseleccionarse mientras cargaba
  if (detalle && selectedGeocercaIds.value.has(id)) {
    attachGeocercaListeners()
    renderGeocercas()
  }
}

const toggleGeocerca = (id: string) => setGeocercaSelected(id, !selectedGeocercaIds.value.has(id))

const selectAllGeocercas = () => { filteredGeocercas.value.forEach(g => setGeocercaSelected(g.id_geocerca, true)) }
const clearAllGeocercas = () => {
  selectedGeocercaIds.value = new Set()
  clearGeocercaDrawings()
}

const loadGeocercasList = async () => {
  const groupId = selectedGroup.value?.id
  if (!groupId) return
  loadingGeocercasList.value = true
  try {
    geocercasList.value = await fetchGeocercasApi(groupId)
  } catch (e) {
    console.error('Error cargando geocercas:', e)
    geocercasList.value = []
  } finally {
    loadingGeocercasList.value = false
  }
}

const positionCount = computed(() => posiciones.value.length)

const clusterSummaryText = computed(() => {
  if (!posiciones.value.length) return ''
  return t('hardware.visibleOf', { visible: visiblePointCount.value, total: positionCount.value })
})

const batteryPercentage = ref<number | null>(null)
const currentSpeed = ref<number | null>(null)
const currentCourse = ref<number | null>(null)

const batteryIcon = computed(() => {
  const p = batteryPercentage.value
  if (p === null) return BatteryEmptyIcon
  if (p >= 75) return BatteryFullIcon
  if (p >= 50) return BatteryFullIcon
  if (p >= 25) return BatteryMedium01Icon
  if (p > 0) return BatteryLowIcon
  return BatteryEmptyIcon
})

const batteryColor = computed(() => {
  const p = batteryPercentage.value
  if (p === null) return 'text-slate-400 dark:text-slate-500'
  if (p >= 50) return 'text-emerald-400'
  if (p >= 25) return 'text-amber-400'
  return 'text-red-400'
})

const batteryBarColor = computed(() => {
  const p = batteryPercentage.value
  if (p === null) return 'bg-slate-600'
  if (p >= 50) return 'bg-emerald-400'
  if (p >= 25) return 'bg-amber-400'
  return 'bg-red-400'
})

const speedColor = computed(() => {
  const s = currentSpeed.value
  if (s === null) return 'text-slate-400'
  if (s >= 80) return 'text-red-400'
  if (s >= 40) return 'text-amber-400'
  return 'text-emerald-400'
})

const speedGraphPath = computed(() => {
  if (!posiciones.value.length) return ''
  const speeds = posiciones.value.map(p => parseFloat(String(p.speed)) || 0)
  const maxSpeed = Math.max(...speeds, 1)
  const w = 1000
  const h = 40
  const padding = 2
  const usableH = h - padding * 2
  const points: string[] = []
  speeds.forEach((s, i) => {
    const x = (i / (speeds.length - 1)) * w
    const y = h - padding - (s / maxSpeed) * usableH
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  })
  return points.join(' ')
})

const speedGraphMax = computed(() => {
  if (!posiciones.value.length) return 0
  return Math.max(...posiciones.value.map(p => parseFloat(String(p.speed)) || 0), 1)
})

const formatUnixTime = (unixTimestamp: string): string => {
  if (!unixTimestamp) return '---'
  const date = new Date(parseInt(unixTimestamp) * 1000)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const formatUnixTimeOnly = (unixTimestamp: string): string => {
  if (!unixTimestamp) return '--:--'
  const date = new Date(parseInt(unixTimestamp) * 1000)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const firstPosition = computed(() => posiciones.value.length ? posiciones.value[0] : null)
const lastPosition = computed(() => posiciones.value.length ? posiciones.value[posiciones.value.length - 1] : null)

const currentTimeDisplay = computed(() => {
  if (!posiciones.value.length) return '--:--'
  const scaled = smoothProgress.value * (posiciones.value.length - 1)
  const idx = Math.floor(scaled)
  const frac = scaled - idx
  const posA = posiciones.value[Math.min(idx, posiciones.value.length - 1)]
  const posB = posiciones.value[Math.min(idx + 1, posiciones.value.length - 1)]
  if (!posA?.time_fx) return '--:--'
  const timeA = parseInt(posA.time_fx) * 1000
  const timeB = parseInt(posB.time_fx) * 1000
  const interpTime = lerp(timeA, timeB, frac)
  const date = new Date(interpTime)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

const totalTimeDisplay = computed(() => {
  if (!posiciones.value.length) return '--:--'
  const pos = posiciones.value[posiciones.value.length - 1]
  if (!pos?.time_fx) return '--:--'
  return formatUnixTimeOnly(pos.time_fx)
})

const currentDateDisplay = computed(() => {
  if (!posiciones.value.length) return ''
  const scaled = smoothProgress.value * (posiciones.value.length - 1)
  const idx = Math.floor(scaled)
  const pos = posiciones.value[Math.min(idx, posiciones.value.length - 1)]
  if (!pos?.time_fx) return ''
  const date = new Date(parseInt(pos.time_fx) * 1000)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
})

onUnmounted(() => {
  stopPlayback()
  clearMapElements()
  clearGeocercaDrawings()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-[#0F1115]">
      <div class="flex items-center justify-between px-5 py-3 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc]">
            <HugeiconsIcon :icon="Location01Icon" :size="20" class="text-[#3b82f6] dark:text-[#5da6fc]" />
          </div>
          <div>
            <h3 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">{{ hardware?.nombre || t('hardware.device') }}</h3>
            <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{{ hardware?.serial }}</span>
          </div>
        </div>
        <button @click="close" class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="flex-1 min-h-0 relative flex flex-row">
      <!-- Panel flotante izquierdo: listado de geocercas -->
      <aside
        class="absolute left-4 top-[104px] w-[264px] flex flex-col overflow-hidden rounded-2xl bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] z-30"
        :class="positionCount > 0 ? 'max-h-[calc(100%-330px)]' : 'max-h-[calc(100%-132px)]'"
      >
        <div class="p-3 border-b border-slate-200/70 dark:border-white/5 shrink-0">
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-2">
              <HugeiconsIcon :icon="MapsIcon" :size="16" class="text-[#3b82f6]" />
              <h4 class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight">Geocercas</h4>
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {{ selectedGeocercaIds.size }}/{{ geocercasList.length }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="selectAllGeocercas"
                :disabled="filteredGeocercas.length === 0"
                class="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-40"
              >Todas</button>
              <button
                type="button"
                @click="clearAllGeocercas"
                :disabled="selectedGeocercaIds.size === 0"
                class="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer disabled:opacity-40"
              >Ninguna</button>
            </div>
          </div>
          <input
            v-model="geocercaSearch"
            type="text"
            placeholder="Buscar geocerca..."
            class="w-full px-3 py-2 rounded-xl text-[12px] bg-slate-100 dark:bg-white/5 border border-transparent focus:border-blue-500/40 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>

        <div class="geo-scroll flex-1 min-h-[72px] max-h-[340px] overflow-y-scroll p-2 pr-1.5 space-y-1">
          <div v-if="loadingGeocercasList" class="py-10 flex justify-center">
            <HugeiconsIcon :icon="Loading02Icon" :size="22" class="text-[#3b82f6] animate-spin" />
          </div>
          <p v-else-if="filteredGeocercas.length === 0" class="py-10 text-center text-[11px] font-bold text-slate-400 dark:text-white/30">
            No se encontraron geocercas
          </p>
          <template v-else>
            <button
              v-for="g in filteredGeocercas"
              :key="g.id_geocerca"
              type="button"
              @click="toggleGeocerca(g.id_geocerca)"
              class="w-full text-left py-2 px-2.5 rounded-lg border transition-colors flex items-center gap-2.5 cursor-pointer select-none"
              :class="selectedGeocercaIds.has(g.id_geocerca)
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-white dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'"
            >
              <span
                class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                :class="selectedGeocercaIds.has(g.id_geocerca) ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-slate-300 dark:border-white/20'"
              >
                <HugeiconsIcon v-if="loadingGeocercaIds.has(g.id_geocerca)" :icon="Loading02Icon" :size="10" class="animate-spin" />
                <svg v-else-if="selectedGeocercaIds.has(g.id_geocerca)" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              </span>
              <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: g.color || '#f59e0b' }"></span>
              <span class="flex-1 min-w-0">
                <span class="block text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">{{ g.nombre }}</span>
                <span class="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{{ g.tipo }}</span>
              </span>
              <span
                v-if="selectedGeocercaIds.has(g.id_geocerca) && geocercaDetalleCache.has(g.id_geocerca)"
                role="button"
                title="Centrar en el mapa"
                @click.stop="fitGeocerca(g.id_geocerca)"
                class="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-500/10"
              >
                <HugeiconsIcon :icon="Location01Icon" :size="13" />
              </span>
            </button>
          </template>
        </div>
      </aside>

      <div class="flex-1 min-w-0 relative flex flex-col">
        <div id="hardware-posicion-map-container" class="absolute inset-0 z-0" style="width:100%;height:100%;"></div>

        <!-- Selector de Tipo de Mapa Flotante en Hardware Posición -->
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

        <div v-if="isLoadingMap" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-[#0F1115]/80">
          <div class="flex flex-col items-center gap-3">
            <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-[#3b82f6] animate-spin" />
            <span class="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{{ t('hardware.loadingMap') }}</span>
          </div>
        </div>

        <!-- Barra Superior Flotante: DateTimePickers Desde/Hasta + Consultar -->
        <div class="absolute top-4 left-4 z-20 flex items-start gap-3" style="right: 180px;">
          <div class="bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div class="w-48 sm:w-56 min-w-0">
              <AppDateTimePicker
                v-model="fechaDesde"
                :placeholder="t('hardware.startDatePlaceholder')"
              />
            </div>
            <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">{{ t('hardware.rangeTo') }}</span>
            <div class="w-48 sm:w-56 min-w-0">
              <AppDateTimePicker
                v-model="fechaHasta"
                :placeholder="t('hardware.endDatePlaceholder')"
              />
            </div>
            <button
              @click="fetchPosiciones"
              :disabled="isLoading || !fechaDesde || !fechaHasta"
              class="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-[#3b82f6]/20"
            >
              <HugeiconsIcon v-if="isLoading" :icon="Loading02Icon" :size="14" class="animate-spin" />
              <span>{{ isLoading ? t('hardware.loading') : t('hardware.btnQuery') }}</span>
            </button>
          </div>
        </div>

        <div v-if="positionCount > 0" class="absolute top-[104px] left-[296px] z-20 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] px-4 py-3 max-w-xs">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{{ t('hardware.positions') }}</span>
            <span class="text-[11px] font-bold text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 px-2 py-0.5 rounded-full">{{ positionCount }}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">({{ clusterSummaryText }})</span>
          </div>
          <div class="space-y-1.5 text-[11px]">
            <div v-if="firstPosition" class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="text-slate-500 dark:text-slate-400">{{ t('hardware.start') }}</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ formatUnixTime(firstPosition.time_fx) }}</span>
            </div>
            <div v-if="lastPosition" class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span class="text-slate-500 dark:text-slate-400">{{ t('hardware.end') }}</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ formatUnixTime(lastPosition.time_fx) }}</span>
            </div>
          </div>
        </div>

        <div v-if="isLoading && !isLoadingMap" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/40 dark:bg-[#0F1115]/40">
          <div class="flex flex-col items-center gap-3 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl rounded-2xl px-6 py-4 border border-slate-200/60 dark:border-white/10 shadow-xl">
            <HugeiconsIcon :icon="Loading02Icon" :size="28" class="text-[#3b82f6] animate-spin" />
            <span class="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{{ t('hardware.loadingPositions') }}</span>
          </div>
        </div>

        <div v-if="positionCount > 0 && (batteryPercentage !== null || currentSpeed !== null)" class="absolute top-[72px] right-4 z-20 bg-[#1e2128]/90 dark:bg-[#1A1D24]/90 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden min-w-[160px]">
          <div class="flex flex-col divide-y divide-white/5">
            <div class="flex flex-col items-center gap-1.5 px-5 py-4">
              <HugeiconsIcon :icon="batteryIcon" :size="28" :class="batteryColor" />
              <span class="text-[24px] font-bold text-white tabular-nums leading-none">{{ batteryPercentage ?? 0 }}%</span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">{{ t('hardware.battery') }}</span>
              <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="batteryBarColor"
                  :style="{ width: (batteryPercentage ?? 0) + '%' }"
                ></div>
              </div>
            </div>
            <div class="flex flex-col items-center gap-1.5 px-5 py-4">
              <HugeiconsIcon :icon="DashboardSpeed01Icon" :size="28" :class="speedColor" />
              <span class="text-[24px] font-bold text-white tabular-nums leading-none">{{ currentSpeed ?? 0 }}</span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">{{ t('hardware.speed') }}</span>
            </div>
          </div>
        </div>

        <div v-if="positionCount > 0" class="absolute bottom-0 left-0 right-0 z-30">
          <div class="bg-gradient-to-t from-black/90 via-black/70 to-transparent px-6 pt-8 pb-5">
            <div
              v-if="speedGraphPath"
              class="relative h-12 mb-3 cursor-crosshair"
              @mousemove="handleSpeedGraphHover"
              @mouseleave="handleSpeedGraphLeave"
            >
              <svg viewBox="0 0 1000 48" preserveAspectRatio="none" class="absolute inset-0 w-full h-full">
                <defs>
                  <linearGradient id="speedGradient" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stop-color="#22c55e" stop-opacity="0.9"/>
                    <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#ef4444" stop-opacity="0.9"/>
                  </linearGradient>
                </defs>
                <path
                  :d="speedGraphPath"
                  fill="none"
                  stroke="url(#speedGradient)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div
                class="absolute top-0 bottom-0 w-px bg-white/60 pointer-events-none"
                :style="{ left: playbackProgress + '%' }"
              ></div>
              <div
                v-if="hoverSpeed"
                class="absolute -top-1 bg-slate-800/95 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-10 border border-white/10"
                :style="{ left: hoverSpeed.percent + '%', transform: 'translateX(-50%)' }"
              >
                {{ hoverSpeed.speed }} km/h
              </div>
              <div class="absolute right-0 top-0 text-[10px] font-bold text-slate-400 pointer-events-none bg-black/40 px-1.5 py-0.5 rounded">
                {{ speedGraphMax }} km/h
              </div>
            </div>

            <div class="flex items-center gap-5">
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="skipBack"
                  class="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  :title="t('hardware.rewind')"
                >
                  <HugeiconsIcon :icon="ArrowLeftDoubleIcon" :size="16" />
                </button>
                <button
                  @click="togglePlayback"
                  class="w-11 h-11 flex items-center justify-center rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all active:scale-95 shadow-lg shadow-[#3b82f6]/30 cursor-pointer"
                  :title="isPlaying ? t('hardware.pause') : t('hardware.play')"
                >
                  <HugeiconsIcon :icon="isPlaying ? PauseIcon : PlayIcon" :size="22" />
                </button>
                <button
                  @click="skipForward"
                  class="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  :title="t('hardware.forward')"
                >
                  <HugeiconsIcon :icon="ArrowRightDoubleIcon" :size="16" />
                </button>
              </div>

              <div class="flex-1 min-w-0 flex items-center gap-3">
                <div
                  class="relative h-6 flex items-center cursor-pointer group flex-1"
                  @mousedown="handleTimelineMouseDown"
                  @mousemove="handleTimelineDrag"
                  @mouseup="handleTimelineMouseUp"
                  @mouseleave="handleTimelineMouseUp"
                >
                  <div class="absolute inset-x-0 h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-[#3b82f6] rounded-full"
                      :style="{ width: playbackProgress + '%' }"
                    ></div>
                  </div>
                  <div
                    class="absolute w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 -translate-x-1/2"
                    :style="{ left: playbackProgress + '%' }"
                  ></div>
                  <div
                    v-if="isDragging"
                    class="absolute w-3.5 h-3.5 bg-[#3b82f6] rounded-full shadow-lg -translate-x-1/2"
                    :style="{ left: playbackProgress + '%' }"
                  >
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap border border-white/10">
                      {{ currentTimeDisplay }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-[11px] font-mono text-white/60 tabular-nums">
                    <span class="text-white font-semibold">{{ currentTimeDisplay }}</span>
                    <span class="mx-1 text-white/40">/</span>
                    <span>{{ totalTimeDisplay }}</span>
                  </div>
                  <button
                    @click="cycleSpeed"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                    :title="t('hardware.playbackSpeed')"
                  >
                    <HugeiconsIcon :icon="FastWindIcon" :size="12" />
                    <span>{{ playbackSpeed }}x</span>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="currentDateDisplay" class="text-center mt-2">
              <span class="text-[10px] font-medium text-white/40">{{ currentDateDisplay }} — {{ currentTimeDisplay }}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Barra de desplazamiento visible para la lista de geocercas */
.geo-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(59, 130, 246, 0.6) transparent;
}
.geo-scroll::-webkit-scrollbar {
  width: 6px;
}
.geo-scroll::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.15);
  border-radius: 9999px;
  margin: 4px 0;
}
.geo-scroll::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.6);
  border-radius: 9999px;
}
.geo-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.85);
}
</style>

