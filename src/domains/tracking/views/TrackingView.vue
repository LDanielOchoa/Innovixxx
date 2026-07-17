<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ThreeMarkerRenderer } from '../../../utils/threeMarkerRenderer'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import { apiClient } from '../../../utils/api-client'
import { HugeiconsIcon } from '@hugeicons/vue'
import { useRouter, useRoute } from 'vue-router'
import AppInput from '../../../components/ui/AppInput.vue'
import {
  Location01Icon,
  ArrowLeft01Icon,
  ChipIcon,
  UserGroupIcon,
  Settings02Icon,
  Car02Icon,
  BatteryCharging01Icon,
  CompassIcon,
  DashboardBrowsingIcon,
  LockIcon,
  RefreshIcon,
  Search01Icon
} from '@hugeicons/core-free-icons'
import type { HardwareWs } from '../types/tracking'

const router = useRouter()
const route = useRoute()
const { loadGoogleMaps } = useGoogleMaps()

// Estado
const activeTab = ref<'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS'>('HARDWARE')
const searchQuery = ref('')
const selectedItem = ref<any | null>(null)


// Hover state for custom popup card
const hoveredItem = ref<HardwareWs | null>(null)
const hoveredPosition = ref({ top: 0, left: 0 })

// Hover state para escoltas
const hoveredEscoltaItem = ref<any | null>(null)
const hoveredEscoltaPosition = ref({ top: 0, left: 0 })



// Computeds to find linked service, vehicle, and escolta
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

import { useTrackingWebSocket } from '../composables/useTrackingWebSocket'
import TrackingSidebar from '../components/TrackingSidebar.vue'

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
  loadAllReferenceData,
  loadSecondaryData,
  connectWebSocket,
  disconnectWebSocket
} = useTrackingWebSocket(activeTab, selectedItem, () => {
  updateMarkersOnMap()
})

// Estado del mapa y markers (variable plana, sin reactividad Vue para evitar interferencia con Google Maps)
let markersMap = new Map<string, any>()
const {
  map,
  isLoadingMap,
  initMap: initMapInstance,
  startDarkModeObserver
} = useMapSetup('google-map-container', {
  defaultZoom: 13,
  gestureHandling: 'greedy',
  forceDark: true,
  mapId: '688c00fbadb30bbb930f73e2'
})

let infoWindow: any = null

// Inicializar Google Maps
const initMap = async () => {
  try {
    const googleMaps = await loadGoogleMaps()
    initMapInstance(googleMaps)
    infoWindow = new googleMaps.InfoWindow({
      disableAutoPan: true
    })
    startDarkModeObserver()
    updateMarkersOnMap()
  } catch (err) {
    console.error('Error inicializando mapa:', err)
  }
}

// Limpieza de marcadores del mapa
const clearAllMarkers = () => {
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

// Normalizar estado del candado
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



const createHardwareMarkerElement = (hw: HardwareWs, isSelected: boolean) => {
  const container = document.createElement('div')
  container.className = 'custom-gps-marker'
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

  // Añadir el canvas para Three.js que ocupará los 112px completos del marcador
  const canvas = document.createElement('canvas')
  canvas.className = 'marker-3d-canvas'
  canvas.width = 112
  canvas.height = 112
  canvas.style.cssText = 'position:absolute;top:0px;left:0px;width:112px;height:112px;pointer-events:none;z-index:2;'
  inner.appendChild(canvas)

  // Hover popover event listeners
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
  return container
}

const createEscoltaMarkerElement = (esc: any, isSelected: boolean) => {
  const container = document.createElement('div')
  container.className = 'custom-escolta-marker'
  container.style.cssText = 'position:relative;width:48px;height:48px;cursor:pointer;'

  const inner = document.createElement('div')
  inner.className = 'marker-inner-wrapper'
  inner.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:48px',
    'height:48px',
    'transform-origin:center center',
    'transition:transform 0.15s ease-out'
  ].join(';')

  const circleColor = isSelected ? '#10B981' : '#0088FF'
  const filterDef = isSelected
    ? `<defs><filter id="escoltaGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
       </filter></defs>`
    : ''
  const filterAttr = isSelected ? 'filter="url(#escoltaGlow)"' : ''

  inner.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      ${filterDef}
      <g ${filterAttr}>
        <circle cx="60" cy="60" r="60" fill="${circleColor}"/>
        <path d="M70 41C70 29.9543 61.0456 21 50 21C38.9543 21 30 29.9543 30 41C30 52.0456 38.9543 61 50 61C61.0456 61 70 52.0456 70 41Z" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M78 89C78 73.536 65.464 61 50 61C34.536 61 22 73.536 22 89" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M102 52.3752V44.25C95.7144 44.25 91 41 91 41C91 41 86.2856 44.25 80 44.25V52.3752C80 63.75 91 67 91 67C91 67 102 63.75 102 52.3752Z" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `

  const scale = getZoomScaleFactor()
  inner.style.transform = `scale(${scale})`

  container.appendChild(inner)

  // Event listeners para hover popover de escoltas
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

  return container
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
    marker.threeRenderer.update(course, isSelected, mapTilt, batteryVal)
  }

  // Scale based on zoom
  const scale = getZoomScaleFactor()
  const inner = content.querySelector('.marker-inner-wrapper') as HTMLElement | null
  if (inner) {
    inner.style.transform = `scale(${scale})`
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

  // If the coordinate change is negligible (less than 0.00001 degrees, approx. 1m), skip animation
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

    // Update SVG elements live during animation
    const svgEl = (marker.content as HTMLElement)?.querySelector('svg')
    if (svgEl) {
      const speedText = svgEl.querySelector('[id^="speed-text"]')
      if (speedText) speedText.textContent = `${Math.round(currentSpeed)}KM`
    }

    if (marker.threeRenderer) {
      const mapTilt = map.value ? map.value.getTilt() || 0 : 0
      marker.threeRenderer.update(currentCourse, isSelected, mapTilt, currentBattery)
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

const updateMarkersOnMap = () => {
  if (!map.value) return

  const activeKeys = new Set<string>()

  if (activeTab.value === 'HARDWARE') {
    hardwareList.value.forEach(hw => {
      const hasCoordinates = hw.lat !== 0 && hw.lon !== 0
      if (!hasCoordinates) return

      activeKeys.add(hw.serial)

      let marker = markersMap.get(hw.serial)
      const isSelected = selectedItem.value && selectedItem.value.serial === hw.serial

      if (marker) {
        animateMarker(marker, hw.lat, hw.lon, hw.course || 0, hw)
        marker.zIndex = isSelected ? 1000 : 1
      } else {
        const position = { lat: hw.lat, lng: hw.lon }
        const content = createHardwareMarkerElement(hw, isSelected)
        
        marker = new (google.maps as any).marker.AdvancedMarkerElement({
          position,
          map: map.value,
          title: hw.nombre,
          content,
          zIndex: isSelected ? 1000 : 1
        })

        const canvas = content.querySelector('.marker-3d-canvas') as HTMLCanvasElement | null
        if (canvas) {
          marker.threeRenderer = new ThreeMarkerRenderer(canvas)
        }
        
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
  } else if (activeTab.value === 'ESCOLTAS') {
    escoltasList.value.forEach(esc => {
      const hasCoordinates = esc.lat !== 0 && esc.lon !== 0
      if (!hasCoordinates) return

      activeKeys.add(esc.id_escolta)

      let marker = markersMap.get(esc.id_escolta)
      const isSelected = selectedItem.value && selectedItem.value.id_escolta === esc.id_escolta

      if (marker) {
        marker.position = { lat: esc.lat, lng: esc.lon }
        marker.content = createEscoltaMarkerElement(esc, isSelected)
        marker.zIndex = isSelected ? 1000 : 1
      } else {
        const position = { lat: esc.lat, lng: esc.lon }
        
        marker = new (google.maps as any).marker.AdvancedMarkerElement({
          position,
          map: map.value,
          title: esc.nombre,
          content: createEscoltaMarkerElement(esc, isSelected),
          zIndex: isSelected ? 1000 : 1
        })

        marker.addListener('click', () => {
          selectItem(esc)
        })

        markersMap.set(esc.id_escolta, marker)
      }
    })
  }

  markersMap.forEach((marker, key) => {
    if (!activeKeys.has(key)) {
      const oldFrameId = marker.animationFrameId
      if (oldFrameId) {
        cancelAnimationFrame(oldFrameId)
        marker.animationFrameId = null
      }
      marker.map = null
      markersMap.delete(key)
    }
  })
}

// Adaptar inclinación del mapa de forma fluida y progresiva utilizando el soporte nativo de Google Maps
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
    updateMarkersOnMap()
    adjustMapTilt(newMap)

    // El motor vectorial puede requerir que el mapa esté inactivo (idle) para aplicar setTilt la primera vez
    newMap.addListener('idle', () => {
      adjustMapTilt(newMap)
    })

    newMap.addListener('zoom_changed', () => {
      adjustMapTilt(newMap)
    })

    // Sincronizar los renderers Three.js cada vez que el tilt del mapa cambie
    newMap.addListener('tilt_changed', () => {
      const currentTilt = newMap.getTilt() || 0
      markersMap.forEach((marker, serial) => {
        if (!marker.threeRenderer) return
        const hw = hardwareList.value.find((h: any) => h.serial === serial)
        if (!hw) return
        const isSelected = selectedItem.value && selectedItem.value.serial === serial
        const course = marker.currentCourse !== undefined ? marker.currentCourse : (hw.course || 0)
        const batteryVal = marker.currentBattery !== undefined ? marker.currentBattery : (hw.battery ?? 100)
        marker.threeRenderer.update(course, isSelected, currentTilt, batteryVal)
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

watch(selectedItem, (newVal, oldVal) => {
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
    if (m) {
      m.content = createEscoltaMarkerElement(oldVal, false)
      m.zIndex = 1
    }
  }
  if (newVal && newVal.id_escolta) {
    const m = markersMap.get(newVal.id_escolta)
    if (m) {
      m.content = createEscoltaMarkerElement(newVal, true)
      m.zIndex = 1000
    }
  }
})

// Filtrar la lista
const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase()
  if (activeTab.value === 'HARDWARE') {
    if (!query) return hardwareList.value
    return hardwareList.value.filter(h => 
      h.nombre.toLowerCase().includes(query) || 
      h.serial.toLowerCase().includes(query) ||
      h.descripcion.toLowerCase().includes(query)
    )
  } else if (activeTab.value === 'SERVICIOS') {
    if (!query) return serviciosList.value
    return serviciosList.value.filter(s => 
      (s.id_servicio && s.id_servicio.toLowerCase().includes(query)) ||
      (s.estado && s.estado.toLowerCase().includes(query))
    )
  } else if (activeTab.value === 'ESCOLTAS') {
    if (!query) return escoltasList.value
    return escoltasList.value.filter(e => 
      (e.nombre && e.nombre.toLowerCase().includes(query)) ||
      (e.identificacion && e.identificacion.toLowerCase().includes(query))
    )
  } else if (activeTab.value === 'VEHICULOS') {
    if (!query) return vehiculosList.value
    return vehiculosList.value.filter(v => 
      (v.placa && v.placa.toLowerCase().includes(query)) ||
      (v.marca && v.marca.toLowerCase().includes(query)) ||
      (v.modelo && v.modelo.toLowerCase().includes(query))
    )
  }
  return []
})

// Helper para saber si un elemento está seleccionado
const isItemSelected = (item: any) => {
  if (!selectedItem.value) return false
  if (item.serial && selectedItem.value.serial === item.serial) return true
  if (item.id_servicio && selectedItem.value.id_servicio === item.id_servicio) return true
  if (item.id_escolta && selectedItem.value.id_escolta === item.id_escolta) return true
  if (item.placa && selectedItem.value.placa === item.placa) return true
  return false
}

// Cambiar de pestaña
const changeTab = (tab: 'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS') => {
  // 1. Limpiar marcadores del mapa físicamente ANTES de todo
  clearAllMarkers()

  // 2. Limpiar la lista de la pestaña anterior
  hardwareList.value = []
  escoltasList.value = []
  serviciosList.value = []
  vehiculosList.value = []

  // 3. Desconectar socket anterior (invalida sessionId → ningún callback tardío podrá dibujar)
  disconnectWebSocket()

  // 4. Actualizar estado
  activeTab.value = tab
  selectedItem.value = null
  searchQuery.value = ''

  // 5. Iniciar nueva conexión/carga
  if (tab === 'HARDWARE' || tab === 'ESCOLTAS') {
    connectWebSocket()
  } else {
    loadSecondaryData()
  }
}


onMounted(() => {
  initMap()
  // La pestaña por defecto es HARDWARE, conectar inmediatamente
  connectWebSocket()
  loadAllReferenceData()

  // Cargar plantilla del SVG de forma externa
  fetch('/Market Mapa.svg?t=' + Date.now())
    .then(res => res.text())
    .then(text => {
      svgTemplate.value = text
    })
    .catch(err => {
      console.error('Error al cargar plantilla de Market Mapa.svg:', err)
    })
})

onUnmounted(() => {
  disconnectWebSocket()
  clearAllMarkers()
})
</script>

<template>
  <div class="dark h-screen w-screen flex bg-[#0B0D11] text-slate-100 overflow-hidden font-sans relative">
    
    <!-- MAPA BACKDROP -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <div id="google-map-container" class="w-full h-full bg-[#0d1116]"></div>

      <!-- Popover de información de Hardware (con animación premium) -->
      <Transition name="hover-card-pop">
        <div 
          v-if="hoveredItem" 
          :style="{ top: hoveredPosition.top + 'px', left: hoveredPosition.left + 'px' }"
          class="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center select-none"
        >
          <!-- Contenido de la Tarjeta Minimalista -->
          <div class="w-[200px] bg-slate-950/85 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-lg text-left flex flex-col gap-2 font-sans">
            <!-- Header -->
            <div class="flex items-baseline justify-between min-w-0">
              <h4 class="text-[11px] font-bold text-white truncate max-w-[120px]">{{ hoveredItem.nombre }}</h4>
              <span class="text-[8px] font-medium text-slate-400 font-mono shrink-0">{{ hoveredItem.serial }}</span>
            </div>

            <!-- Separador sutil -->
            <div class="h-[1px] bg-white/5"></div>

            <!-- Información principal -->
            <div class="flex flex-col gap-1.5 text-[9.5px]">
              <!-- Servicio -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-400">Servicio</span>
                <span class="text-white font-medium truncate max-w-[120px]">{{ hoveredService?.id_servicio || hoveredItem.id_servicio || 'Sin servicio' }}</span>
              </div>

              <!-- Escolta -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-400">Escolta</span>
                <span class="text-white font-medium truncate max-w-[120px]">{{ hoveredEscolta?.nombre || 'Sin escolta' }}</span>
              </div>

              <!-- Celular (si está disponible) -->
              <div v-if="hoveredEscolta?.celular" class="flex items-center justify-between gap-2 text-[9px]">
                <span class="text-slate-400">Celular</span>
                <span class="text-slate-300 font-mono">{{ hoveredEscolta.celular }}</span>
              </div>
            </div>
          </div>
          <!-- Triángulo indicador -->
          <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-slate-950/85 -mt-[1px]"></div>
        </div>
      </Transition>

      <!-- Popover de información de Escolta (con animación premium) -->
      <Transition name="hover-card-pop">
        <div 
          v-if="hoveredEscoltaItem" 
          :style="{ top: hoveredEscoltaPosition.top + 'px', left: hoveredEscoltaPosition.left + 'px' }"
          class="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center select-none"
        >
          <!-- Contenido de la Tarjeta Minimalista -->
          <div class="w-[200px] bg-slate-950/85 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-lg text-left flex flex-col gap-2 font-sans">
            <!-- Header -->
            <div class="flex items-baseline justify-between min-w-0">
              <h4 class="text-[11px] font-bold text-white truncate max-w-[120px]">{{ hoveredEscoltaItem.nombre }}</h4>
              <span v-if="hoveredEscoltaItem.identificacion" class="text-[8px] font-medium text-slate-400 font-mono shrink-0">{{ hoveredEscoltaItem.identificacion }}</span>
            </div>

            <!-- Separador sutil -->
            <div class="h-[1px] bg-white/5"></div>

            <!-- Información principal -->
            <div class="flex flex-col gap-1.5 text-[9.5px]">
              <!-- Servicio -->
              <div class="flex items-center justify-between gap-2">
                <span class="text-slate-400">Servicio</span>
                <span class="text-white font-medium truncate max-w-[120px]">{{ hoveredEscoltaService?.id_servicio || hoveredEscoltaItem.id_servicio || 'Sin servicio' }}</span>
              </div>

              <!-- Celular -->
              <div v-if="hoveredEscoltaItem.celular" class="flex items-center justify-between gap-2">
                <span class="text-slate-400">Celular</span>
                <span class="text-white font-medium truncate max-w-[120px] font-mono">{{ hoveredEscoltaItem.celular }}</span>
              </div>

              <!-- Email -->
              <div v-if="hoveredEscoltaItem.email" class="flex items-center justify-between gap-2">
                <span class="text-slate-400">Email</span>
                <span class="text-white font-medium truncate max-w-[120px] font-mono">{{ hoveredEscoltaItem.email }}</span>
              </div>
            </div>
          </div>
          <!-- Triángulo indicador -->
          <div class="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-slate-950/85 -mt-[1px]"></div>
        </div>
      </Transition>
    </div>

    <div class="absolute top-0 left-[340px] md:left-[370px] lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] z-20">
      <div class="flex bg-[#15171C]/80 backdrop-blur-xl border-x border-b border-white/5 rounded-b-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
        <!-- Conectores de esquina redondeada invertida (Estilo Notch integrado con blur) -->
        <div class="absolute top-0 -left-4 w-4 h-4 bg-[#15171C]/80 backdrop-blur-xl pointer-events-none" style="clip-path: path('M 0 0 A 16 16 0 0 1 16 16 L 16 0 Z');"></div>
        <div class="absolute top-0 -right-4 w-4 h-4 bg-[#15171C]/80 backdrop-blur-xl pointer-events-none" style="clip-path: path('M 16 0 A 16 16 0 0 0 0 16 L 0 0 Z');"></div>
        <button
          v-for="tab in (['SERVICIOS', 'HARDWARE', 'ESCOLTAS', 'VEHICULOS'] as const)"
          :key="tab"
          @click="changeTab(tab)"
          class="flex-1 py-2 text-[11px] font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 focus:outline-none"
          :class="activeTab === tab 
            ? 'bg-[#5da6fc]/15 text-[#5da6fc] border border-[#5da6fc]/20 shadow-[0_2px_12px_rgba(93,166,252,0.15)]'
            : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'"
        >
          {{ tab }}
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
      :isLoadingSecondary="isLoadingSecondary"
      :wsStatus="wsStatus"
      :wsError="wsError"
      :selectedItem="selectedItem"
      @reconnect="connectWebSocket"
      @select="selectItem"
    />
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
/* Estilos globales para personalizar el InfoWindow de Google Maps a modo oscuro */
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
  display: none !important; /* Ocultar botón de cierre nativo al ser hover */
}

/* Animación de entrada para el contenido del InfoWindow */
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

/* Hover Card Transitions */
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
