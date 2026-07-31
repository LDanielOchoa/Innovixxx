<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import { HugeiconsIcon } from '@hugeicons/vue'
import { ChipIcon, UserGroupIcon, MapsIcon, Loading03Icon } from '@hugeicons/core-free-icons'
import type { HardwareWs } from '../types/tracking'
import { useTrackingWebSocket } from '../composables/useTrackingWebSocket'
import { useTrackingGeocercas } from '../composables/useTrackingGeocercas'
import TrackingSidebar from '../components/TrackingSidebar.vue'

import { useRouteDrawer } from '../../rutas/composables/useRouteDrawer'
import { fetchRutaDetallesApi } from '../../rutas/services/rutas.api'

const { loadGoogleMaps } = useGoogleMaps()

// ── Arranque inmediato (sin esperar al montaje del DOM) ──
const googleMapsPromise = loadGoogleMaps()

// three.js es, con diferencia, el módulo más pesado de esta vista.
// IMPORTANTE: se carga con import dinámico en segundo plano para NO retrasar
// la ejecución del setup (donde se conecta el WebSocket y se piden los datos).
// Con un import estático, el setup no corre hasta que three.js termine de
// descargarse, y la petición del WebSocket sale varios segundos tarde.
type ThreeMarkerRendererInstance = import('../../../utils/threeMarkerRenderer').ThreeMarkerRenderer
type ThreeMarkerRendererCtor = new (canvas: HTMLCanvasElement) => ThreeMarkerRendererInstance
let threeMarkerRendererCtor: ThreeMarkerRendererCtor | null = null

const threeModulePromise = Promise.all([
  import('../../../utils/threeMarkerRenderer'),
  import('../../../utils/three3dLoader')
])
threeModulePromise
  .then(([rendererMod, loaderMod]) => {
    threeMarkerRendererCtor = rendererMod.ThreeMarkerRenderer
    // Precargar el modelo 3D y la textura apenas el módulo esté disponible
    loaderMod.load3dAssets().catch(() => {})
  })
  .catch(err => console.error('Error cargando el motor 3D de marcadores:', err))

// Estado
const activeTab = ref<'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS'>('SERVICIOS')
const searchQuery = ref('')
const selectedItem = ref<any | null>(null)

// Helper para determinar si un ítem pertenece al servicio seleccionado actualmente
const isItemBelongingToSelectedService = (itemServiceId?: string) => {
  if (!selectedItem.value) return true // Si no hay nada seleccionado, todos se ven normales
  const selectedServId = String(selectedItem.value.id_servicio || '').trim().toLowerCase()
  if (!selectedServId) return true // Si el ítem seleccionado no es/tiene servicio, se ven normales
  const targetId = String(itemServiceId || '').trim().toLowerCase()
  return targetId === selectedServId
}

// Hover state para popovers
const hoveredItem = ref<HardwareWs | null>(null)
const hoveredPosition = ref({ top: 0, left: 0 })

const hoveredEscoltaItem = ref<any | null>(null)
const hoveredEscoltaPosition = ref({ top: 0, left: 0 })

// Agrupa múltiples solicitudes de repintado en un solo frame (rAF).
// El WebSocket puede entregar varios mensajes por segundo; sin esto
// cada mensaje dispararía un repintado completo de todos los marcadores.
let markersUpdateScheduled = false
const scheduleMarkersUpdate = () => {
  if (markersUpdateScheduled) return
  markersUpdateScheduled = true
  requestAnimationFrame(() => {
    markersUpdateScheduled = false
    updateMarkersOnMap()
  })
}

const {
  hardwareList,
  serviciosList,
  escoltasList,
  vehiculosList,
  refServicios,
  refEscoltas,
  refVehiculos,
  isLoadingSecondary,
  wsStatus,
  wsError,
  showWsModal,
  loadAllReferenceData,
  connectWebSocket,
  disconnectWebSocket
} = useTrackingWebSocket(activeTab, selectedItem, scheduleMarkersUpdate)

// Conectar el WebSocket y cargar las referencias de inmediato (no necesitan
// el DOM): gana el tiempo que antes se perdía esperando al onMounted.
connectWebSocket()
loadAllReferenceData()

// Computeds para encontrar información relacionada en hover
const hoveredService = computed(() => {
  if (!hoveredItem.value || !hoveredItem.value.id_servicio) return null
  return refServicios.value.find(s => s.id_servicio === hoveredItem.value!.id_servicio)
})

const hoveredVehiculo = computed(() => {
  if (!hoveredItem.value) return null
  const serviceId = hoveredItem.value.id_servicio
  if (serviceId) {
    return refVehiculos.value.find(v => v.id_servicio === serviceId)
  }
  return null
})

const hoveredEscolta = computed(() => {
  if (!hoveredItem.value) return null
  const escId = hoveredItem.value.id_escolta
  if (escId) {
    return refEscoltas.value.find(e => e.id_escolta === escId)
  }
  const serviceId = hoveredItem.value.id_servicio
  if (serviceId) {
    return refEscoltas.value.find(e => e.id_servicio === serviceId)
  }
  return null
})

const hoveredEscoltaService = computed(() => {
  if (!hoveredEscoltaItem.value) return null
  const serviceId = hoveredEscoltaItem.value.id_servicio
  if (serviceId) {
    return refServicios.value.find(s => s.id_servicio === serviceId)
  }
  return null
})

// Estado del mapa y marcadores
let markersMap = new Map<string, any>()
const {
  map,
  initMap: initMapInstance,
  startDarkModeObserver
} = useMapSetup('google-map-container', {
  defaultZoom: 13,
  gestureHandling: 'greedy',
  forceDark: false,
  mapId: '688c00fbadb30bbb930f73e2'
})

const directionsServiceRef = ref<any>(null)
const { drawFullRoute, clearAll: clearRouteLines } = useRouteDrawer(map, directionsServiceRef)

const {
  showGeocercas,
  loadingGeocercas,
  toggleGeocercas
} = useTrackingGeocercas(map)

let infoWindow: any = null

const initMap = async () => {
  try {
    const googleMaps = await googleMapsPromise
    initMapInstance(googleMaps)
    if (googleMaps.DirectionsService) {
      directionsServiceRef.value = new googleMaps.DirectionsService()
    }
    infoWindow = new googleMaps.InfoWindow({
      disableAutoPan: true
    })
    startDarkModeObserver()
    updateMarkersOnMap()
  } catch (err) {
    console.error('Error inicializando mapa:', err)
  }
}

const clearAllMarkers = () => {
  clearRouteLines()
  markersMap.forEach(m => {
    const frameId = m.animationFrameId
    if (frameId) cancelAnimationFrame(frameId)
    m.animationFrameId = null
    if (m.threeRenderer) {
      m.threeRenderer.destroy()
      m.threeRenderer = null
    }
    m.map = null
  })
  markersMap.clear()
}

const formatLockStatus = (status: string | undefined) => {
  if (!status) return 'CERRADO'
  const normalized = status.trim().toUpperCase()
  if (normalized === 'CERRADA' || normalized === 'CERRADO') return 'CERRADO'
  if (normalized === 'ABIERTA' || normalized === 'ABIERTO') return 'ABIERTO'
  return normalized
}

const getZoomScaleFactor = () => {
  return 1
}

const getArrowColorHex = (timeFx?: number | string, isSelected = false): number => {
  if (isSelected) return 0x22d3ee
  if (!timeFx) return 0x10b981

  let timeFxSeconds = Number(timeFx)
  if (isNaN(timeFxSeconds) || timeFxSeconds <= 0) return 0x10b981

  if (timeFxSeconds > 1e11) {
    timeFxSeconds = Math.floor(timeFxSeconds / 1000)
  }

  const nowUnix = Math.floor(Date.now() / 1000)
  const diffMinutes = (nowUnix - timeFxSeconds) / 60

  return diffMinutes <= 30 ? 0x10b981 : 0xf59e0b
}

const createHardwareMarkerElement = (hw: HardwareWs, isSelected: boolean) => {
  const container = document.createElement('div')
  container.className = 'custom-gps-marker'
  container.style.cssText = 'position:relative;width:112px;height:148px;cursor:pointer;display:flex;flex-direction:column;align-items:center;'

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

  const speedVal = hw.speed || 0
  const hasLockStatus = hw.status_lock !== undefined && hw.status_lock !== null && hw.status_lock !== ''
  const lockStatus = hasLockStatus ? formatLockStatus(hw.status_lock) : ''
  const isLocked = lockStatus === 'CERRADO'

  const speedIconSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 13L15.5 9.5" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="12" cy="13" r="1.5" fill="#38bdf8"/>
    <path d="M20.5 15A9 9 0 1 0 3.5 15" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-dasharray="32 2"/>
  </svg>`

  const lockClosedSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="2"/>
    <path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="16" r="1.2" fill="#10b981"/>
  </svg>`

  const lockOpenSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2"/>
    <path d="M8 11V7a4 4 0 0 1 8 0" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    <circle cx="12" cy="16" r="1.2" fill="#f59e0b"/>
  </svg>`

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
    'pointer-events:none',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
    'z-index:3',
    'position:relative',
    'transition:all 0.3s cubic-bezier(0.16,1,0.3,1)'
  ].join(';')

  const speedSection = document.createElement('div')
  speedSection.style.cssText = 'display:flex;align-items:center;gap:4px;'

  const speedIconEl = document.createElement('div')
  speedIconEl.innerHTML = speedIconSvg
  speedIconEl.style.cssText = 'display:flex;align-items:center;'

  const speedBadge = document.createElement('span')
  speedBadge.className = 'tail-speed'
  speedBadge.style.cssText = 'font-size:11px;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-0.02em;color:#ffffff;line-height:1;'
  speedBadge.textContent = `${Math.round(speedVal)}`

  const speedUnit = document.createElement('span')
  speedUnit.style.cssText = 'font-size:8px;font-weight:700;font-family:Inter,sans-serif;color:rgba(148,163,184,0.7);letter-spacing:0.05em;text-transform:uppercase;line-height:1;'
  speedUnit.textContent = 'km/h'

  speedSection.appendChild(speedIconEl)
  speedSection.appendChild(speedBadge)
  speedSection.appendChild(speedUnit)

  tail.appendChild(speedSection)

  if (hasLockStatus) {
    const dotDivider = document.createElement('div')
    dotDivider.className = 'tail-lock-divider'
    dotDivider.style.cssText = 'width:3px;height:3px;border-radius:9999px;background:rgba(255,255,255,0.25);flex-shrink:0;'

    const lockSection = document.createElement('div')
    lockSection.className = 'tail-lock-section'
    lockSection.style.cssText = 'display:flex;align-items:center;gap:4px;'

    const lockIconEl = document.createElement('div')
    lockIconEl.className = 'tail-lock-icon'
    lockIconEl.innerHTML = isLocked ? lockClosedSvg : lockOpenSvg
    lockIconEl.style.cssText = 'display:flex;align-items:center;'

    const lockLabel = document.createElement('span')
    lockLabel.className = 'tail-lock'
    lockLabel.style.cssText = `font-size:9px;font-weight:800;font-family:Inter,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:${isLocked ? '#34d399' : '#fbbf24'};line-height:1;`
    lockLabel.textContent = isLocked ? 'Cerrado' : 'Abierto'

    lockSection.appendChild(lockIconEl)
    lockSection.appendChild(lockLabel)

    tail.appendChild(dotDivider)
    tail.appendChild(lockSection)
  }

  container.addEventListener('mouseenter', () => {
    const mapDiv = map.value?.getDiv()
    if (!mapDiv) return
    const mapRect = mapDiv.getBoundingClientRect()
    const markerRect = container.getBoundingClientRect()

    hoveredPosition.value = {
      top: markerRect.top - mapRect.top - 10,
      left: markerRect.left - mapRect.left + (markerRect.width / 2)
    }
    hoveredItem.value = hw
  })

  container.addEventListener('mouseleave', () => {
    hoveredItem.value = null
  })

  container.appendChild(inner)
  container.appendChild(connector)
  container.appendChild(tail)
  return container
}

const createEscoltaMarkerElement = (esc: any, isSelected: boolean) => {
  const container = document.createElement('div')
  container.className = 'custom-escolta-marker'
  container.style.cssText = 'position:relative;width:112px;height:112px;cursor:pointer;'

  const inner = document.createElement('div')
  inner.className = 'marker-inner-wrapper'
  inner.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:112px',
    'height:112px',
    'transform-origin:center center',
    'transition:transform 0.1s ease-out'
  ].join(';')

  const canvas = document.createElement('canvas')
  canvas.className = 'marker-3d-canvas'
  canvas.width = 112
  canvas.height = 112
  canvas.style.cssText = 'position:absolute;top:0px;left:0px;width:112px;height:112px;pointer-events:none;z-index:2;'
  inner.appendChild(canvas)

  container.addEventListener('mouseenter', () => {
    const mapDiv = map.value?.getDiv()
    if (!mapDiv) return
    const mapRect = mapDiv.getBoundingClientRect()
    const markerRect = container.getBoundingClientRect()

    hoveredEscoltaPosition.value = {
      top: markerRect.top - mapRect.top - 10,
      left: markerRect.left - mapRect.left + (markerRect.width / 2)
    }
    hoveredEscoltaItem.value = esc
  })

  container.addEventListener('mouseleave', () => {
    hoveredEscoltaItem.value = null
  })

  container.appendChild(inner)
  return container
}

const updateEscoltaMarkerContent = (marker: any, esc: any, isSelected: boolean) => {
  const content = marker.content as HTMLElement
  if (!content) return

  const course = marker.currentCourse !== undefined ? marker.currentCourse : (esc.course || 0)

  if (marker.threeRenderer) {
    const mapTilt = map.value ? map.value.getTilt() || 0 : 0
    const colorHex = isSelected ? 0x22d3ee : 0x0088ff
    marker.threeRenderer.update(course, isSelected, mapTilt, 100, colorHex, false)
  }

  const scale = getZoomScaleFactor()
  const inner = content.querySelector('.marker-inner-wrapper') as HTMLElement | null
  if (inner) {
    inner.style.transform = `scale(${scale})`
  }
}

const updateMarkerContent = (marker: any, hw: HardwareWs, isSelected: boolean) => {
  const content = marker.content as HTMLElement
  if (!content) return

  const course = marker.currentCourse !== undefined ? marker.currentCourse : (hw.course || 0)
  const speedVal = marker.currentSpeed !== undefined ? marker.currentSpeed : (hw.speed || 0)
  const batteryVal = marker.currentBattery !== undefined ? marker.currentBattery : (hw.battery ?? 100)
  const lockProgress = marker.currentLockProgress !== undefined
    ? marker.currentLockProgress
    : (formatLockStatus(hw.status_lock) === 'CERRADO' ? 1 : 0)

  if (marker.threeRenderer) {
    const mapTilt = map.value ? map.value.getTilt() || 0 : 0
    const arrowColorHex = getArrowColorHex(hw.time_fx, isSelected)
    const showBatteryRing = activeTab.value !== 'SERVICIOS'
    marker.threeRenderer.update(course, isSelected, mapTilt, batteryVal, arrowColorHex, showBatteryRing)
  }

  const scale = getZoomScaleFactor()
  const inner = content.querySelector('.marker-inner-wrapper') as HTMLElement | null
  if (inner) {
    inner.style.transform = `scale(${scale})`
  }

  const speedBadge = content.querySelector('.tail-speed') as HTMLElement | null
  if (speedBadge) {
    speedBadge.textContent = `${Math.round(speedVal)}`
  }
  const lockBadge = content.querySelector('.tail-lock') as HTMLElement | null
  const lockIconEl = content.querySelector('.tail-lock-icon') as HTMLElement | null
  if (lockBadge && lockIconEl) {
    const isLocked = lockProgress >= 0.5
    const lockClosedSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="#10b981" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#10b981"/></svg>`
    const lockOpenSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#f59e0b"/></svg>`
    lockIconEl.innerHTML = isLocked ? lockClosedSvg : lockOpenSvg
    lockBadge.textContent = isLocked ? 'Cerrado' : 'Abierto'
    lockBadge.style.color = isLocked ? '#34d399' : '#fbbf24'
  }
}

const animateMarker = (
  marker: any,
  targetLat: number,
  targetLng: number,
  targetCourse: number,
  hw: HardwareWs,
  duration = 1000
) => {
  const isSelected = selectedItem.value && selectedItem.value.serial === hw.serial
  const isClosedTarget = formatLockStatus(hw.status_lock) === 'CERRADO'
  const targetLockProgress = isClosedTarget ? 1 : 0
  const targetSpeed = hw.speed || 0
  const targetBattery = hw.battery !== undefined ? hw.battery : 100

  const startPosition = marker.position
  if (!startPosition || !startPosition.lat) {
    marker.position = { lat: targetLat, lng: targetLng }
    marker.currentCourse = targetCourse
    marker.currentSpeed = targetSpeed
    marker.currentBattery = targetBattery
    marker.currentLockProgress = targetLockProgress
    updateMarkerContent(marker, hw, isSelected)
    return
  }

  const startLat = typeof startPosition.lat === 'function' ? startPosition.lat() : startPosition.lat
  const startLng = typeof startPosition.lng === 'function' ? startPosition.lng() : startPosition.lng

  const latDiff = Math.abs(targetLat - startLat)
  const lngDiff = Math.abs(targetLng - startLng)
  if (latDiff < 0.00001 && lngDiff < 0.00001) {
    marker.position = { lat: targetLat, lng: targetLng }
    marker.currentCourse = targetCourse
    marker.currentSpeed = targetSpeed
    marker.currentBattery = targetBattery
    marker.currentLockProgress = targetLockProgress
    updateMarkerContent(marker, hw, isSelected)

    const oldFrameId = marker.animationFrameId
    if (oldFrameId) {
      cancelAnimationFrame(oldFrameId)
      marker.animationFrameId = null
    }
    return
  }

  let startCourse = marker.currentCourse
  if (startCourse === undefined || startCourse === null) {
    startCourse = targetCourse
  }

  let startSpeed = marker.currentSpeed
  if (startSpeed === undefined || startSpeed === null) {
    startSpeed = targetSpeed
  }

  let startBattery = marker.currentBattery
  if (startBattery === undefined || startBattery === null) {
    startBattery = targetBattery
  }

  let startLockProgress = marker.currentLockProgress
  if (startLockProgress === undefined || startLockProgress === null) {
    startLockProgress = targetLockProgress
  }

  let diff = targetCourse - startCourse
  while (diff < -180) diff += 360
  while (diff > 180) diff -= 360
  const adjustedTargetCourse = startCourse + diff

  const startTime = performance.now()
  const oldFrameId = marker.animationFrameId
  if (oldFrameId) {
    cancelAnimationFrame(oldFrameId)
  }

  const animateStep = (time: number) => {
    const elapsed = time - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2

    const currentLat = startLat + (targetLat - startLat) * easeProgress
    const currentLng = startLng + (targetLng - startLng) * easeProgress
    marker.position = { lat: currentLat, lng: currentLng }

    const currentCourse = startCourse + (adjustedTargetCourse - startCourse) * easeProgress
    const currentSpeed = startSpeed + (targetSpeed - startSpeed) * easeProgress
    const currentBattery = startBattery + (targetBattery - startBattery) * easeProgress
    const currentLockProgress = startLockProgress + (targetLockProgress - startLockProgress) * easeProgress

    marker.currentCourse = currentCourse
    marker.currentSpeed = currentSpeed
    marker.currentBattery = currentBattery
    marker.currentLockProgress = currentLockProgress

    const tailContent = marker.content as HTMLElement
    const speedBadge = tailContent?.querySelector('.tail-speed') as HTMLElement | null
    if (speedBadge) {
      speedBadge.textContent = `${Math.round(currentSpeed)}`
    }
    const lockBadge = tailContent?.querySelector('.tail-lock') as HTMLElement | null
    const lockIconEl = tailContent?.querySelector('.tail-lock-icon') as HTMLElement | null
    if (lockBadge && lockIconEl) {
      const isLocked = currentLockProgress >= 0.5
      const lockClosedSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(16,185,129,0.15)" stroke="#10b981" stroke-width="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4" stroke="#10b981" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#10b981"/></svg>`
      const lockOpenSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="3" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16" r="1.2" fill="#f59e0b"/></svg>`
      lockIconEl.innerHTML = isLocked ? lockClosedSvg : lockOpenSvg
      lockBadge.textContent = isLocked ? 'Cerrado' : 'Abierto'
      lockBadge.style.color = isLocked ? '#34d399' : '#fbbf24'
    }

    if (marker.threeRenderer) {
      const mapTilt = map.value ? map.value.getTilt() || 0 : 0
      const arrowColorHex = getArrowColorHex(hw.time_fx, isSelected)
      const showBatteryRing = activeTab.value !== 'SERVICIOS'
      marker.threeRenderer.update(currentCourse, isSelected, mapTilt, currentBattery, arrowColorHex, showBatteryRing)
    }

    if (progress < 1) {
      marker.animationFrameId = requestAnimationFrame(animateStep)
    } else {
      marker.animationFrameId = null
      marker.position = { lat: targetLat, lng: targetLng }
      marker.currentCourse = targetCourse % 360
      marker.currentSpeed = targetSpeed
      marker.currentBattery = targetBattery
      marker.currentLockProgress = targetLockProgress
      updateMarkerContent(marker, hw, isSelected)
    }
  }

  marker.animationFrameId = requestAnimationFrame(animateStep)
}

// Crea el renderer 3D del marcador si el módulo de three.js ya cargó;
// si aún no, lo adjunta en cuanto termine la descarga en segundo plano.
// El marcador (DOM + etiqueta) es visible desde el primer momento mientras tanto.
const attachThreeRenderer = (marker: any, canvas: HTMLCanvasElement | null, refreshContent: () => void) => {
  if (!canvas) return
  if (threeMarkerRendererCtor) {
    marker.threeRenderer = new threeMarkerRendererCtor(canvas)
    return
  }
  threeModulePromise.then(() => {
    // Si el marcador fue removido del mapa o ya tiene renderer, no hacer nada
    if (!threeMarkerRendererCtor || marker.threeRenderer || !marker.map) return
    marker.threeRenderer = new threeMarkerRendererCtor(canvas)
    refreshContent()
  }).catch(() => {})
}

const updateMarkersOnMap = () => {
  if (!map.value) return
  const activeKeys = new Set<string>()

  hardwareList.value.forEach(hw => {
    const latNum = Number(hw.lat)
    const lonNum = Number(hw.lon)
    const hasCoordinates = !isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0
    if (!hasCoordinates) return

    activeKeys.add(hw.serial)

    let marker = markersMap.get(hw.serial)
    const isSelected = selectedItem.value && (selectedItem.value.serial === hw.serial || selectedItem.value.id_hardware === hw.serial)
    const isBelonging = isItemBelongingToSelectedService(hw.id_servicio)

    if (marker) {
      // animateMarker ya actualiza el contenido del marcador en cada frame
      // y al finalizar; no es necesario un updateMarkerContent extra aquí.
      animateMarker(marker, latNum, lonNum, hw.course || 0, hw)
      marker.zIndex = isSelected ? 1000 : (isBelonging ? 10 : 1)
      if (marker.content) {
        (marker.content as HTMLElement).style.opacity = isBelonging ? '1' : '0.25';
        (marker.content as HTMLElement).style.filter = isBelonging ? 'none' : 'grayscale(60%) brightness(0.6)'
      }
    } else {
      const position = { lat: latNum, lng: lonNum }
      const content = createHardwareMarkerElement(hw, isSelected)
      content.style.opacity = isBelonging ? '1' : '0.25'
      content.style.filter = isBelonging ? 'none' : 'grayscale(60%) brightness(0.6)'
      content.style.transition = 'opacity 0.3s ease, filter 0.3s ease'
      
      marker = new (google.maps as any).marker.AdvancedMarkerElement({
        position,
        map: map.value,
        title: hw.nombre,
        content,
        zIndex: isSelected ? 1000 : (isBelonging ? 10 : 1)
      })

      const canvas = content.querySelector('.marker-3d-canvas') as HTMLCanvasElement | null
      attachThreeRenderer(marker, canvas, () => {
        const stillSelected = selectedItem.value && (selectedItem.value.serial === hw.serial || selectedItem.value.id_hardware === hw.serial)
        updateMarkerContent(marker, hw, !!stillSelected)
      })

      marker.currentCourse = hw.course || 0
      marker.currentSpeed = hw.speed || 0
      marker.currentBattery = hw.battery !== undefined ? hw.battery : 100
      marker.currentLockProgress = formatLockStatus(hw.status_lock) === 'CERRADO' ? 1 : 0

      updateMarkerContent(marker, hw, isSelected)

      marker.addListener('click', () => {
        selectItem(hw)
      })

      markersMap.set(hw.serial, marker)
    }
  })

  escoltasList.value.forEach(esc => {
    const latNum = Number(esc.lat)
    const lonNum = Number(esc.lon)
    const hasCoordinates = !isNaN(latNum) && !isNaN(lonNum) && latNum !== 0 && lonNum !== 0
    if (!hasCoordinates) return

    activeKeys.add(esc.id_escolta)

    let marker = markersMap.get(esc.id_escolta)
    const isSelected = selectedItem.value && selectedItem.value.id_escolta === esc.id_escolta
    const isBelonging = isItemBelongingToSelectedService(esc.id_servicio)

    if (marker) {
      marker.position = { lat: latNum, lng: lonNum }
      marker.zIndex = isSelected ? 1000 : (isBelonging ? 10 : 1)
      updateEscoltaMarkerContent(marker, esc, isSelected)
      if (marker.content) {
        (marker.content as HTMLElement).style.opacity = isBelonging ? '1' : '0.25';
        (marker.content as HTMLElement).style.filter = isBelonging ? 'none' : 'grayscale(60%) brightness(0.6)'
      }
    } else {
      const position = { lat: latNum, lng: lonNum }
      const content = createEscoltaMarkerElement(esc, isSelected)
      content.style.opacity = isBelonging ? '1' : '0.25'
      content.style.filter = isBelonging ? 'none' : 'grayscale(60%) brightness(0.6)'
      content.style.transition = 'opacity 0.3s ease, filter 0.3s ease'

      marker = new (google.maps as any).marker.AdvancedMarkerElement({
        position,
        map: map.value,
        title: esc.nombre,
        content,
        zIndex: isSelected ? 1000 : (isBelonging ? 10 : 1)
      })

      const canvas = content.querySelector('.marker-3d-canvas') as HTMLCanvasElement | null
      attachThreeRenderer(marker, canvas, () => {
        const stillSelected = selectedItem.value && selectedItem.value.id_escolta === esc.id_escolta
        updateEscoltaMarkerContent(marker, esc, !!stillSelected)
      })

      marker.currentCourse = esc.course || 0
      updateEscoltaMarkerContent(marker, esc, isSelected)

      marker.addListener('click', () => {
        selectItem(esc)
      })

      markersMap.set(esc.id_escolta, marker)
    }
  })

  markersMap.forEach((marker, key) => {
    if (!activeKeys.has(key)) {
      const oldFrameId = marker.animationFrameId
      if (oldFrameId) {
        cancelAnimationFrame(oldFrameId)
        marker.animationFrameId = null
      }
      if (marker.threeRenderer) {
        marker.threeRenderer.destroy()
        marker.threeRenderer = null
      }
      marker.map = null
      markersMap.delete(key)
    }
  })
}

const adjustMapTilt = (targetMap: any) => {
  if (!targetMap) return
  const zoom = targetMap.getZoom() || 13
  
  let target = 0
  if (zoom >= 17) {
    target = 45
  } else if (zoom >= 15) {
    target = (zoom - 15) * 22.5
  } else {
    target = 0
  }
  
  if (targetMap.getTilt() !== target) {
    targetMap.setTilt(target)
  }
}

watch(map, (newMap) => {
  if (newMap) {
    // Primer pintado apenas el mapa esté listo (por si los datos del
    // WebSocket llegaron antes de que se inicializara el mapa)
    updateMarkersOnMap()
    adjustMapTilt(newMap)

    newMap.addListener('idle', () => {
      adjustMapTilt(newMap)
    })

    newMap.addListener('zoom_changed', () => {
      // Solo ajustar el tilt: la escala de los marcadores es constante,
      // por lo que no es necesario repintarlos en cada paso de zoom.
      adjustMapTilt(newMap)
    })

    newMap.addListener('tilt_changed', () => {
      const currentTilt = newMap.getTilt() || 0
      // Índices O(1) para evitar un find() lineal por cada marcador
      const hwBySerial = new Map(hardwareList.value.map((h: any) => [h.serial, h]))
      const escById = new Map(escoltasList.value.map((e: any) => [e.id_escolta, e]))
      markersMap.forEach((marker, key) => {
        if (!marker.threeRenderer) return
        const hw = hwBySerial.get(key)
        if (hw) {
          const isSelected = selectedItem.value && (selectedItem.value.serial === key || selectedItem.value.id_hardware === key)
          const course = marker.currentCourse !== undefined ? marker.currentCourse : (hw.course || 0)
          const batteryVal = marker.currentBattery !== undefined ? marker.currentBattery : (hw.battery ?? 100)
          const arrowColorHex = getArrowColorHex(hw.time_fx, isSelected)
          const showBatteryRing = activeTab.value !== 'SERVICIOS'
          marker.threeRenderer.update(course, isSelected, currentTilt, batteryVal, arrowColorHex, showBatteryRing)
          return
        }
        const esc = escById.get(key)
        if (esc) {
          const isSelected = selectedItem.value && selectedItem.value.id_escolta === key
          const course = marker.currentCourse !== undefined ? marker.currentCourse : (esc.course || 0)
          const colorHex = isSelected ? 0x22d3ee : 0x0088ff
          marker.threeRenderer.update(course, isSelected, currentTilt, 100, colorHex, false)
        }
      })
    })
  }
})

const selectItem = (item: any) => {
  selectedItem.value = item

  if (item.lat && item.lon && map.value) {
    map.value.panTo({ lat: item.lat, lng: item.lon })
    map.value.setZoom(17)
    adjustMapTilt(map.value)
  }
}

// Caché de paradas por ruta para que re-seleccionar un servicio dibuje
// su polilínea al instante, sin esperar de nuevo a la red.
const routeParadasCache = new Map<string, any[]>()
// Secuencia para descartar respuestas de red que llegan tarde cuando el
// usuario ya seleccionó otro ítem (evita dibujar rutas obsoletas).
let routeRequestSeq = 0

watch(selectedItem, async (newVal, oldVal) => {
  updateMarkersOnMap()
  clearRouteLines()

  if (newVal) {
    // Intentar resolver id_ruta: puede que venga en el ítem directamente,
    // o que haya que buscarlo en refServicios a partir de id_servicio
    let routeId = String(newVal.id_ruta || '').trim()

    if (!routeId && newVal.id_servicio) {
      const servRef = refServicios.value.find(
        s => String(s.id_servicio || '').trim().toLowerCase() === String(newVal.id_servicio).trim().toLowerCase()
      )
      routeId = String(servRef?.id_ruta || '').trim()
    }

    const groupId = localStorage.getItem('auth-grupo-id') || ''

    console.log('[TrackingView] Ítem seleccionado:', newVal.id_servicio, '| id_ruta resuelto:', routeId || '(vacío)')

    if (routeId && groupId) {
      const requestId = ++routeRequestSeq

      const drawParadas = (paradas: any[]) => {
        if (requestId !== routeRequestSeq) return // la selección cambió mientras cargaba
        drawFullRoute(paradas, '#38bdf8')

        // Ajustar los límites del mapa para encuadrar la ruta
        if (map.value && (window as any).google?.maps?.LatLngBounds) {
          const bounds = new (window as any).google.maps.LatLngBounds()
          paradas.forEach((p: any) => bounds.extend({ lat: p.lat, lng: p.lon }))
          map.value.fitBounds(bounds)
        }
      }

      const cacheKey = routeId
      const cached = routeParadasCache.get(cacheKey)
      if (cached) {
        drawParadas(cached)
      } else {
        try {
          const rutaDetalle = await fetchRutaDetallesApi(groupId, routeId)
          console.log('[TrackingView] fetchRutaDetallesApi respuesta:', rutaDetalle)
          if (rutaDetalle && Array.isArray(rutaDetalle.paradas)) {
            const paradasValidas = rutaDetalle.paradas
              .map((p: any) => ({
                ...p,
                lat: parseFloat(p.lat),
                lon: parseFloat(p.lon)
              }))
              .filter((p: any) => !isNaN(p.lat) && !isNaN(p.lon) && isFinite(p.lat) && isFinite(p.lon))

            console.log('[TrackingView] Paradas válidas:', paradasValidas.length)

            if (paradasValidas.length >= 2) {
              routeParadasCache.set(cacheKey, paradasValidas)
              drawParadas(paradasValidas)
            } else {
              console.warn('[TrackingView] Menos de 2 paradas válidas, no se dibuja polilínea')
            }
          } else {
            console.warn('[TrackingView] No se encontraron paradas en la respuesta:', rutaDetalle)
          }
        } catch (err) {
          console.error('Error al trazar polilínea de la ruta:', err)
        }
      }
    } else {
      console.log('[TrackingView] Sin id_ruta válido para dibujar ruta. routeId:', routeId, '| groupId:', groupId ? '✓' : '✗')
    }
  }

  if (oldVal && oldVal.serial) {
    const m = markersMap.get(oldVal.serial)
    const hw = hardwareList.value.find(h => h.serial === oldVal.serial)
    if (m && hw) {
      updateMarkerContent(m, hw, false)
      m.zIndex = 1
    }
  }
  if (newVal && newVal.serial) {
    const m = markersMap.get(newVal.serial)
    const hw = hardwareList.value.find(h => h.serial === newVal.serial)
    if (m && hw) {
      updateMarkerContent(m, hw, true)
      m.zIndex = 1000
    }
  }

  if (oldVal && oldVal.id_escolta) {
    const m = markersMap.get(oldVal.id_escolta)
    const esc = escoltasList.value.find(e => e.id_escolta === oldVal.id_escolta)
    if (m && esc) {
      updateEscoltaMarkerContent(m, esc, false)
      m.zIndex = 1
    }
  }
  if (newVal && newVal.id_escolta) {
    const m = markersMap.get(newVal.id_escolta)
    const esc = escoltasList.value.find(e => e.id_escolta === newVal.id_escolta)
    if (m && esc) {
      updateEscoltaMarkerContent(m, esc, true)
      m.zIndex = 1000
    }
  }
})

const changeTab = (tab: 'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS') => {
  clearAllMarkers()

  // Al asignar la pestaña, el watch(activeTab) del composable se encarga
  // de la carga REST inmediata y de la (re)conexión del WebSocket.
  activeTab.value = tab
  selectedItem.value = null
  searchQuery.value = ''
}

onMounted(() => {
  // Los datos y las descargas ya se iniciaron en el setup; aquí solo
  // queda instanciar el mapa (requiere el contenedor del DOM).
  initMap()
})

onUnmounted(() => {
  disconnectWebSocket()
  clearAllMarkers()
})

const formatServiceDateTime = (fechaStr: string | undefined) => {
  if (!fechaStr) return { fecha: null, hora: null }
  try {
    const cleaned = fechaStr.replace(' ', 'T')
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) {
      const fecha = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' })
      const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
      return { fecha, hora }
    }
    const parts = fechaStr.split(' ')
    return { fecha: parts[0] || fechaStr, hora: parts[1] || null }
  } catch {
    return { fecha: fechaStr, hora: null }
  }
}

const getServicioEstadoInfo = (estadoVal: any) => {
  const num = Number(estadoVal)
  switch (num) {
    case 1:
      return { 
        label: 'PRERCARGA', 
        style: 'color: #D65900; background-color: rgba(214, 89, 0, 0.12); border-color: rgba(214, 89, 0, 0.3);', 
        dotStyle: 'background-color: #D65900;' 
      }
    case 2:
      return { 
        label: 'EN ESPERA', 
        style: 'color: #9D21D6; background-color: rgba(157, 33, 214, 0.12); border-color: rgba(157, 33, 214, 0.3);', 
        dotStyle: 'background-color: #9D21D6;' 
      }
    case 3:
      return { 
        label: 'EJECUCION OK', 
        style: 'color: #00C5D6; background-color: rgba(0, 197, 214, 0.12); border-color: rgba(0, 197, 214, 0.3);', 
        dotStyle: 'background-color: #00C5D6;' 
      }
    case 4:
      return { 
        label: 'EJECUCION FAIL', 
        style: 'color: #A1D600; background-color: rgba(161, 214, 0, 0.12); border-color: rgba(161, 214, 0, 0.3);', 
        dotStyle: 'background-color: #A1D600;' 
      }
    case 5:
      return { 
        label: 'FINALIZADO', 
        style: 'color: #814F2B; background-color: rgba(129, 79, 43, 0.12); border-color: rgba(129, 79, 43, 0.3);', 
        dotStyle: 'background-color: #814F2B;' 
      }
    case 6:
      return { 
        label: 'CANCELADO', 
        style: 'color: #ef4444; background-color: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.3);', 
        dotStyle: 'background-color: #ef4444;' 
      }
    default:
      return null
  }
}

const hoveredServiceDateTime = computed(() => {
  const service = hoveredService.value
  if (!service) return { fecha: null, hora: null }
  const fechaRaw = service.fecha_inicio || service.fecha_hora_inicio || service.fecha_creacion || service.fecha_creada || service.created_at
  return formatServiceDateTime(fechaRaw)
})

const hoveredEscoltaServiceDateTime = computed(() => {
  const service = hoveredEscoltaService.value
  if (!service) return { fecha: null, hora: null }
  const fechaRaw = service.fecha_inicio || service.fecha_hora_inicio || service.fecha_creacion || service.fecha_creada || service.created_at
  return formatServiceDateTime(fechaRaw)
})

const hoveredServiceEstadoInfo = computed(() => {
  const service = hoveredService.value
  if (!service || service.estado === undefined || service.estado === null) return null
  return getServicioEstadoInfo(service.estado)
})

const hoveredEscoltaServiceEstadoInfo = computed(() => {
  const service = hoveredEscoltaService.value
  if (!service || service.estado === undefined || service.estado === null) return null
  return getServicioEstadoInfo(service.estado)
})
</script>

<template>
  <div class="dark h-screen w-screen flex bg-[#0B0D11] text-slate-100 overflow-hidden font-sans relative">
    
    <!-- MAPA BACKDROP -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <div id="google-map-container" class="w-full h-full bg-[#0d1116]"></div>

      <!-- Popover de información de Hardware -->
      <Transition name="hover-card-pop">
        <div 
          v-if="hoveredItem" 
          :style="{ top: hoveredPosition.top + 'px', left: hoveredPosition.left + 'px' }"
          class="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center select-none"
        >
          <div class="w-[240px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl rounded-[16px] p-3.5 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-left flex flex-col gap-3 font-sans">
            <div class="flex items-center justify-between min-w-0 pb-2 border-b border-slate-200/60 dark:border-white/5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shrink-0">
                  <HugeiconsIcon :icon="ChipIcon" :size="15" />
                </div>
                <div class="min-w-0">
                  <h4 class="text-[12px] font-bold text-slate-800 dark:text-white truncate tracking-tight">{{ hoveredItem.nombre }}</h4>
                  <span class="text-[9px] font-medium text-slate-500 dark:text-white/40 block truncate">Dispositivo GPS</span>
                </div>
              </div>
              <span class="text-[9px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2 py-0.5 rounded-lg shrink-0">{{ hoveredItem.serial }}</span>
            </div>

            <div class="bg-slate-50 dark:bg-[#181C24]/80 rounded-[12px] p-2.5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-widest text-[#3b82f6] dark:text-[#5da6fc]">Servicio</span>
                <span 
                  class="text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1.5 border"
                  :style="hoveredServiceEstadoInfo ? hoveredServiceEstadoInfo.style : ''"
                  :class="!hoveredServiceEstadoInfo ? 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-white/40 border-transparent' : ''"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="hoveredServiceEstadoInfo ? hoveredServiceEstadoInfo.dotStyle : ''" :class="!hoveredServiceEstadoInfo ? 'bg-slate-400' : ''"></span>
                  {{ hoveredServiceEstadoInfo ? hoveredServiceEstadoInfo.label : 'Sin Servicio' }}
                </span>
              </div>

              <template v-if="hoveredServiceDateTime.fecha || hoveredServiceDateTime.hora">
                <div class="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-200/60 dark:border-white/5">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Inicio</span>
                  <div class="flex items-center gap-1.5 font-mono text-[9.5px]">
                    <span class="text-slate-700 dark:text-slate-200 font-medium">{{ hoveredServiceDateTime.fecha }}</span>
                    <span v-if="hoveredServiceDateTime.hora" class="text-[#3b82f6] dark:text-[#5da6fc] font-bold">{{ hoveredServiceDateTime.hora }}</span>
                  </div>
                </div>
              </template>
            </div>

            <div class="flex items-center justify-between text-[10px] px-1">
              <div class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <HugeiconsIcon :icon="UserGroupIcon" :size="13" class="text-slate-400" />
                <span>Escolta</span>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-slate-800 dark:text-white font-semibold truncate max-w-[120px]">{{ hoveredEscolta?.nombre || 'Sin asignar' }}</span>
                <span v-if="hoveredEscolta?.celular" class="text-[9px] font-mono text-slate-500 dark:text-slate-400">{{ hoveredEscolta.celular }}</span>
              </div>
            </div>
          </div>
          <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-[#13161C] -mt-[1px]"></div>
        </div>
      </Transition>

      <!-- Popover de información de Escolta -->
      <Transition name="hover-card-pop">
        <div 
          v-if="hoveredEscoltaItem" 
          :style="{ top: hoveredEscoltaPosition.top + 'px', left: hoveredEscoltaPosition.left + 'px' }"
          class="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center select-none"
        >
          <div class="w-[240px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-xl rounded-[16px] p-3.5 border border-slate-200/80 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] text-left flex flex-col gap-3 font-sans">
            <div class="flex items-center justify-between min-w-0 pb-2 border-b border-slate-200/60 dark:border-white/5">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] shrink-0">
                  <HugeiconsIcon :icon="UserGroupIcon" :size="15" />
                </div>
                <div class="min-w-0">
                  <h4 class="text-[12px] font-bold text-slate-800 dark:text-white truncate tracking-tight">{{ hoveredEscoltaItem.nombre }}</h4>
                  <span class="text-[9px] font-medium text-slate-500 dark:text-white/40 block truncate">Escolta Oficial</span>
                </div>
              </div>
              <span v-if="hoveredEscoltaItem.identificacion" class="text-[9px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2 py-0.5 rounded-lg shrink-0">{{ hoveredEscoltaItem.identificacion }}</span>
            </div>

            <div class="bg-slate-50 dark:bg-[#181C24]/80 rounded-[12px] p-2.5 border border-slate-200/60 dark:border-white/5 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-extrabold uppercase tracking-widest text-[#3b82f6] dark:text-[#5da6fc]">Servicio</span>
                <span 
                  class="text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1.5 border"
                  :style="hoveredEscoltaServiceEstadoInfo ? hoveredEscoltaServiceEstadoInfo.style : ''"
                  :class="!hoveredEscoltaServiceEstadoInfo ? 'bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-white/40 border-transparent' : ''"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="hoveredEscoltaServiceEstadoInfo ? hoveredEscoltaServiceEstadoInfo.dotStyle : ''" :class="!hoveredEscoltaServiceEstadoInfo ? 'bg-slate-400' : ''"></span>
                  {{ hoveredEscoltaServiceEstadoInfo ? hoveredEscoltaServiceEstadoInfo.label : 'Sin Servicio' }}
                </span>
              </div>

              <template v-if="hoveredEscoltaServiceDateTime.fecha || hoveredEscoltaServiceDateTime.hora">
                <div class="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-200/60 dark:border-white/5">
                  <span class="text-slate-500 dark:text-slate-400 font-medium">Inicio</span>
                  <div class="flex items-center gap-1.5 font-mono text-[9.5px]">
                    <span class="text-slate-700 dark:text-slate-200 font-medium">{{ hoveredEscoltaServiceDateTime.fecha }}</span>
                    <span v-if="hoveredEscoltaServiceDateTime.hora" class="text-[#3b82f6] dark:text-[#5da6fc] font-bold">{{ hoveredEscoltaServiceDateTime.hora }}</span>
                  </div>
                </div>
              </template>
            </div>

            <div v-if="hoveredEscoltaItem.celular" class="flex items-center justify-between text-[10px] px-1">
              <span class="text-slate-500 dark:text-slate-400 font-medium">Celular</span>
              <span class="text-slate-800 dark:text-white font-mono font-semibold">{{ hoveredEscoltaItem.celular }}</span>
            </div>
          </div>
          <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-[#13161C] -mt-[1px]"></div>
        </div>
      </Transition>
    </div>

    <!-- Pestañas Superiores -->
    <div class="absolute top-0 left-[340px] md:left-[370px] lg:left-1/2 lg:-translate-x-1/2 lg:w-[540px] z-20">
      <div class="flex items-center gap-1.5 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-xl border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl p-1.5 shadow-md transition-all duration-300">
        
        <!-- Tab: SERVICIOS -->
        <button
          @click="changeTab('SERVICIOS')"
          class="flex-1 py-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase rounded-lg transition-colors focus:outline-none flex items-center justify-center gap-1.5"
          :class="activeTab === 'SERVICIOS' 
            ? 'bg-[#3b82f6]/90 text-white border border-[#3b82f6]/80'
            : 'text-blue-500/80 dark:text-blue-400/80 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-transparent'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-white" v-if="activeTab === 'SERVICIOS'"></span>
          SERVICIOS
        </button>

        <!-- Tab: HARDWARE -->
        <button
          @click="changeTab('HARDWARE')"
          class="flex-1 py-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase rounded-lg transition-colors focus:outline-none flex items-center justify-center gap-1.5"
          :class="activeTab === 'HARDWARE' 
            ? 'bg-emerald-600/90 text-white border border-emerald-500/80'
            : 'text-emerald-600/80 dark:text-emerald-400/80 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-white" v-if="activeTab === 'HARDWARE'"></span>
          HARDWARE
        </button>

        <!-- Tab: ESCOLTAS -->
        <button
          @click="changeTab('ESCOLTAS')"
          class="flex-1 py-1.5 px-2 text-[11px] font-semibold tracking-wider uppercase rounded-lg transition-colors focus:outline-none flex items-center justify-center gap-1.5"
          :class="activeTab === 'ESCOLTAS' 
            ? 'bg-purple-600/90 text-white border border-purple-500/80'
            : 'text-purple-600/80 dark:text-purple-400/80 hover:bg-purple-50 dark:hover:bg-purple-500/10 border border-transparent'"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-white" v-if="activeTab === 'ESCOLTAS'"></span>
          ESCOLTAS
        </button>

        <!-- Separador sutil -->
        <div class="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5"></div>

        <!-- Botón de Geocercas -->
        <button
          @click="toggleGeocercas"
          :title="showGeocercas ? 'Ocultar Geocercas' : 'Mostrar Geocercas'"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase rounded-lg transition-colors focus:outline-none shrink-0 border"
          :class="showGeocercas 
            ? 'bg-amber-500/90 text-white border-amber-500/80' 
            : 'text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-50 dark:hover:bg-amber-500/10 border-transparent'"
        >
          <HugeiconsIcon v-if="loadingGeocercas" :icon="Loading03Icon" :size="14" class="animate-spin" />
          <HugeiconsIcon v-else :icon="MapsIcon" :size="14" />
          <span>Geocercas</span>
        </button>
      </div>
    </div>

    <!-- PANEL LATERAL IZQUIERDO -->
    <TrackingSidebar
      v-model:searchQuery="searchQuery"
      :activeTab="activeTab"
      :hardwareList="hardwareList"
      :serviciosList="serviciosList"
      :escoltasList="escoltasList"
      :vehiculosList="vehiculosList"
      :refEscoltas="refEscoltas"
      :refVehiculos="refVehiculos"
      :isLoadingSecondary="isLoadingSecondary"
      :wsStatus="wsStatus"
      :wsError="wsError"
      :selectedItem="selectedItem"
      :showGeocercas="showGeocercas"
      :loadingGeocercas="loadingGeocercas"
      @reconnect="connectWebSocket"
      @select="selectItem"
      @toggleGeocercas="toggleGeocercas"
    />

    <!-- MODAL ERROR WEBSOCKET -->
    <Transition name="fade-scale">
      <div 
        v-if="showWsModal" 
        class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      >
        <div class="w-full max-w-md bg-[#13161C] border border-rose-500/30 rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center space-y-4 relative overflow-hidden">
          <!-- Background Glow Effect -->
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Icono de Alerta -->
          <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <!-- Textos -->
          <div class="space-y-1.5">
            <h3 class="text-lg font-black text-white tracking-tight">Fallo de Conexión</h3>
            <p class="text-xs font-medium text-slate-300 leading-relaxed max-w-xs mx-auto">
              El Websocket no funciona por favor comuniquese con el administrador
            </p>
          </div>

          <!-- Botón Entendido / Reintentar -->
          <div class="pt-2 w-full flex items-center gap-3">
            <button 
              @click="showWsModal = false"
              class="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all active:scale-95"
            >
              Cerrar
            </button>
            <button 
              @click="connectWebSocket"
              class="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-all active:scale-95"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.2);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.4);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(93, 166, 252, 0.4);
}
</style>

<style>
.gm-style-iw-c {
  background-color: #13161c !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  padding: 0 !important;
  box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.7) !important;
}

.gm-style-iw-d {
  overflow: hidden !important;
  padding: 0 !important;
}

.gm-style-iw-tc::after {
  background: #13161c !important;
  box-shadow: 3px 3px 7px rgba(0, 0, 0, 0.4);
}

.gm-ui-hover-effect {
  display: none !important;
}

@keyframes infowindowFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.custom-infowindow {
  animation: infowindowFadeIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  transform-origin: bottom center;
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
</style>
