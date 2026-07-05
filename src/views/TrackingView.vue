<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useGoogleMaps } from '../composables/useGoogleMaps'
import { useMapSetup } from '../composables/useMapSetup'
import { apiClient } from '../utils/api-client'
import { HugeiconsIcon } from '@hugeicons/vue'
import { useRouter, useRoute } from 'vue-router'
import AppInput from '../components/ui/AppInput.vue'
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

// Tipos de datos
interface HardwareWs {
  serial: string
  id_familia: number
  nombre: string
  descripcion: string
  id_grupo_servicio: string
  estado: number
  id_servicio: string
  id_hardware: string
  lat: number
  lon: number
  time_fx: number
  speed: number
  course: number
  battery: number
  comm_pending?: string
  sos?: boolean
  status_lock?: string
  device_ts?: string
  gps_valido?: boolean
}

const router = useRouter()
const route = useRoute()
const { loadGoogleMaps } = useGoogleMaps()

// Estado
const activeTab = ref<'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS'>('HARDWARE')
const searchQuery = ref('')
const selectedItem = ref<any | null>(null)
const hardwareList = ref<HardwareWs[]>([])
const svgTemplate = ref<string>('')

// Mocks y datos cargados de APIs secundarias
const serviciosList = ref<any[]>([])
const escoltasList = ref<any[]>([])
const vehiculosList = ref<any[]>([])

const isLoadingSecondary = ref(false)

// Estado del mapa y markers (variable plana, sin reactividad Vue para evitar interferencia con Google Maps)
let markersMap = new Map<string, google.maps.Marker>()
const {
  map,
  isLoadingMap,
  initMap: initMapInstance,
  startDarkModeObserver
} = useMapSetup('google-map-container', {
  defaultZoom: 13,
  gestureHandling: 'greedy',
  forceDark: true
})

// WebSocket
let socket: WebSocket | null = null
let infoWindow: any = null
const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const wsError = ref<string | null>(null)
let reconnectTimeoutId: any = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5
let isManualDisconnect = false
let wsSessionId = 0 // ID de sesión que se incrementa en cada nueva conexión

// Cargar APIs secundarias
const loadSecondaryData = async () => {
  isLoadingSecondary.value = true
  try {
    if (activeTab.value === 'SERVICIOS') {
      const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/servicio/listar_tabla/', {
        method: 'POST',
        body: JSON.stringify({})
      })
      if (res.done) serviciosList.value = res.data
    } else if (activeTab.value === 'ESCOLTAS') {
      const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/escolta/listar_simple/', {
        method: 'POST',
        body: JSON.stringify({})
      })
      if (res.done) escoltasList.value = res.data
    } else if (activeTab.value === 'VEHICULOS') {
      const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/vehiculo/listar_simple/', {
        method: 'POST',
        body: JSON.stringify({})
      })
      if (res.done) vehiculosList.value = res.data
    }
  } catch (err) {
    console.error('Error cargando datos de pestaña:', err)
  } finally {
    isLoadingSecondary.value = false
  }
}

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
    const frameId = m.get('animationFrameId')
    if (frameId) cancelAnimationFrame(frameId)
    m.set('animationFrameId', null)
    m.setMap(null)
  })
  markersMap.clear()
}

// Conectar WebSocket (modo dinámico según pestaña activa)
const connectWebSocket = () => {
  // Cancelar cualquier intento de reconexión pendiente
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }

  // Cerrar socket previo limpiamente (nullear handlers para evitar callbacks tardíos)
  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket.close()
    socket = null
  }

  isManualDisconnect = false
  wsStatus.value = 'connecting'
  wsError.value = null

  const queryToken = route.query.token_ws as string | undefined
  const queryGroupId = route.query.group_id as string | undefined

  if (queryToken || queryGroupId) {
    if (queryToken) localStorage.setItem('auth-token-ws', queryToken.trim())
    if (queryGroupId) localStorage.setItem('auth-grupo-id', queryGroupId.trim())
    router.replace({ path: route.path, query: {} }).catch(err => {
      console.error('Error al limpiar los query params de la URL:', err)
    })
  }

  const tokenWs = localStorage.getItem('auth-token-ws') || ''
  const groupId = localStorage.getItem('auth-grupo-id') || ''

  if (!tokenWs || !groupId) {
    wsStatus.value = 'disconnected'
    wsError.value = 'No hay sesión activa. Inicia sesión primero.'
    console.error('[WebSocket] Faltan credenciales:', { tokenWs: tokenWs || '(vacío)', groupId: groupId || '(vacío)' })
    return
  }

  // Capturar el sessionId y la pestaña activa en el momento de la conexión
  wsSessionId++
  const mySessionId = wsSessionId
  const myTab = activeTab.value
  const modo = myTab === 'ESCOLTAS' ? '3' : '2'
  const wsUrl = `ws://66.179.190.248:8900/start/?token=${tokenWs}&modo=${modo}&group_id=${groupId}`
  console.log(`[WebSocket][sid=${mySessionId}] Conectando modo=${modo} tab=${myTab}`)

  try {
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      if (wsSessionId !== mySessionId) return
      wsStatus.value = 'connected'
      wsError.value = null
      reconnectAttempts = 0
      console.log(`[WebSocket][sid=${mySessionId}] Conectado`)
    }

    socket.onmessage = (event) => {
      // Si el sessionId cambió, este socket ya no es el activo → ignorar
      if (wsSessionId !== mySessionId) return
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.ev === 50) {
          if (Array.isArray(payload.flota) && myTab === 'HARDWARE') {
            if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
              hardwareList.value = payload.flota
            } else {
              payload.flota.forEach((updatedItem: HardwareWs) => {
                const index = hardwareList.value.findIndex(h => h.serial === updatedItem.serial)
                if (index !== -1) {
                  hardwareList.value[index] = { ...hardwareList.value[index], ...updatedItem }
                } else {
                  hardwareList.value.push(updatedItem)
                }
                if (selectedItem.value && selectedItem.value.serial === updatedItem.serial) {
                  selectedItem.value = { ...selectedItem.value, ...updatedItem }
                }
              })
            }
            updateMarkersOnMap()
          } else if (Array.isArray(payload.escoltas) && myTab === 'ESCOLTAS') {
            if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
              escoltasList.value = payload.escoltas
            } else {
              payload.escoltas.forEach((updatedItem: any) => {
                const index = escoltasList.value.findIndex(e => e.id_escolta === updatedItem.id_escolta)
                if (index !== -1) {
                  escoltasList.value[index] = { ...escoltasList.value[index], ...updatedItem }
                } else {
                  escoltasList.value.push(updatedItem)
                }
                if (selectedItem.value && selectedItem.value.id_escolta === updatedItem.id_escolta) {
                  selectedItem.value = { ...selectedItem.value, ...updatedItem }
                }
              })
            }
            updateMarkersOnMap()
          }
        }
      } catch (err) {
        console.error('[WebSocket] Error al procesar mensaje:', err)
      }
    }

    socket.onerror = () => {
      if (wsSessionId !== mySessionId) return
      wsError.value = 'Error en la conexión del servidor'
    }

    socket.onclose = (event) => {
      if (wsSessionId !== mySessionId) return
      wsStatus.value = 'disconnected'
      console.log(`[WebSocket][sid=${mySessionId}] Cerrado. Código: ${event.code}`)
      socket = null
      if (!isManualDisconnect) {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectTimeoutId = setTimeout(() => connectWebSocket(), delay)
        } else {
          wsError.value = 'No se pudo reconectar después de varios intentos'
        }
      }
    }
  } catch (err) {
    wsStatus.value = 'disconnected'
    wsError.value = 'No se pudo establecer la conexión'
    console.error('[WebSocket] Excepción al conectar:', err)
  }
}

// Desconectar WebSocket
const disconnectWebSocket = () => {
  isManualDisconnect = true
  wsSessionId++ // Invalidar cualquier callback pendiente de sesiones anteriores
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }
  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket.close()
    socket = null
  }
  wsStatus.value = 'disconnected'
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
  if (!map.value) return 1
  const zoom = map.value.getZoom() || 13
  if (zoom >= 15) return 1
  // Reduce el tamaño un 12% por cada nivel por debajo de 15, mínimo 0.45 de escala
  return Math.max(0.45, 1 - (15 - zoom) * 0.12)
}

const getCustomMarkerIcon = (
  hw: HardwareWs,
  courseValue?: number,
  speedValue?: number,
  batteryValue?: number,
  lockProgressValue?: number
) => {
  const isSelected = selectedItem.value && selectedItem.value.serial === hw.serial
  const scale = getZoomScaleFactor()

  // Dimensiones de Market Mapa.svg (391 x 519)
  const baseWidth = isSelected ? 120 : 100
  const w = baseWidth * scale
  const h = w * (519 / 391)
  const ax = w / 2
  const ay = h

  // Normalizar candado
  const hasLock = hw.status_lock !== undefined && hw.status_lock !== null && hw.status_lock !== ''
  console.log(`[GPS Lock Debug] serial: ${hw.serial}, status_lock: ${hw.status_lock}, hasLock: ${hasLock}`)
  const isClosed = formatLockStatus(hw.status_lock) === 'CERRADO'
  const lockProgress = lockProgressValue !== undefined ? lockProgressValue : (isClosed ? 1 : 0)
  const cerradoOpacity = hasLock ? lockProgress : 0
  const abiertoOpacity = hasLock ? (1 - lockProgress) : 0

  // Normalizar batería
  const batteryVal = batteryValue !== undefined ? Math.round(batteryValue) : (hw.battery !== undefined ? hw.battery : 100)

  // Determinar color de la batería según rangos
  let batteryColor = '#7CFF6B' // Verde (51% - 100%)
  if (batteryVal <= 25) {
    batteryColor = '#EF4444' // Rojo (0% - 25%)
  } else if (batteryVal <= 50) {
    batteryColor = '#FFFF00' // Amarillo (26% - 50%)
  }

  // Normalizar dirección (curso) y velocidad
  const course = courseValue !== undefined ? courseValue : (hw.course || 0)
  const speedVal = speedValue !== undefined ? Math.round(speedValue) : Math.round(hw.speed || 0)

  if (!svgTemplate.value) {
    return {
      url: '/Market Mapa.svg',
      anchor: new google.maps.Point(ax, ay),
      scaledSize: new google.maps.Size(w, h)
    }
  }

  // Calcular el sector circular para el clipPath de la barra de progreso
  const cx = 195.218
  const cy = 208.709
  const r = 300
  const startAngle = Math.PI
  const endAngle = Math.PI + (Math.PI * (batteryVal / 100))
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArcFlag = (batteryVal > 50) ? 1 : 0
  const clipPathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

  // Reemplazar opacidades de candados, el d del clip-path, color de batería, rotación de dirección y texto de velocidad en la plantilla SVG
  const customSvg = svgTemplate.value
    .replace('id="closed-lock" opacity="1"', `id="closed-lock" opacity="${cerradoOpacity}"`)
    .replace('id="open-lock" opacity="0"', `id="open-lock" opacity="${abiertoOpacity}"`)
    .replace('id="battery-clip-path" d="M 195 230 L 195 230 A 300 300 0 1 1 195 230 Z"', `id="battery-clip-path" d="${clipPathD}"`)
    .replace('fill="#7CFF6B"', `fill="${batteryColor}"`)
    .replace('stop-color="#7CFF6B"', `stop-color="${batteryColor}"`)
    .replace('transform="rotate(0, 195, 153)"', `transform="rotate(${course}, 195, 153)"`)
    .replace('100KM', `${speedVal} KM/H`)
    .replace('id="lock-line" opacity="1"', `id="lock-line" opacity="${hasLock ? 1 : 0}"`)

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(customSvg),
    anchor: new google.maps.Point(ax, ay),
    scaledSize: new google.maps.Size(w, h)
  }
}

// Icono personalizado para escoltas (un puntito con resplandor)
const getEscoltaMarkerIcon = (isSelected: boolean) => {
  const scale = getZoomScaleFactor()
  const baseSize = 48 // Tamaño base en el mapa
  const size = Math.max(20, baseSize * scale)
  const halfSize = size / 2

  const circleColor = isSelected ? '#10B981' : '#0088FF'
  const filterDef = isSelected 
    ? `<defs>
        <filter id="escoltaGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
       </defs>`
    : ''
  const filterAttr = isSelected ? 'filter="url(#escoltaGlow)"' : ''

  const svgString = `<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${filterDef}
    <g ${filterAttr}>
      <circle cx="60" cy="60" r="60" fill="${circleColor}"/>
      <path d="M70 41C70 29.9543 61.0456 21 50 21C38.9543 21 30 29.9543 30 41C30 52.0456 38.9543 61 50 61C61.0456 61 70 52.0456 70 41Z" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M78 89C78 73.536 65.464 61 50 61C34.536 61 22 73.536 22 89" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M102 52.3752V44.25C95.7144 44.25 91 41 91 41C91 41 86.2856 44.25 80 44.25V52.3752C80 63.75 91 67 91 67C91 67 102 63.75 102 52.3752Z" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString),
    anchor: new google.maps.Point(halfSize, halfSize),
    scaledSize: new google.maps.Size(size, size)
  }
}

// Animación suave de posición, rotación, velocidad, batería y candado del marcador
const animateMarker = (
  marker: google.maps.Marker,
  targetLat: number,
  targetLng: number,
  targetCourse: number,
  hw: HardwareWs,
  duration = 1000
) => {
  const isClosedTarget = formatLockStatus(hw.status_lock) === 'CERRADO'
  const targetLockProgress = isClosedTarget ? 1 : 0
  const targetSpeed = hw.speed || 0
  const targetBattery = hw.battery !== undefined ? hw.battery : 100

  const startPosition = marker.getPosition()
  if (!startPosition) {
    marker.setPosition({ lat: targetLat, lng: targetLng })
    marker.setIcon(getCustomMarkerIcon(hw, targetCourse, targetSpeed, targetBattery, targetLockProgress))
    marker.set('currentCourse', targetCourse)
    marker.set('currentSpeed', targetSpeed)
    marker.set('currentBattery', targetBattery)
    marker.set('currentLockProgress', targetLockProgress)
    return
  }

  const startLat = startPosition.lat()
  const startLng = startPosition.lng()
  
  let startCourse = marker.get('currentCourse')
  if (startCourse === undefined || startCourse === null) {
    startCourse = targetCourse
  }

  let startSpeed = marker.get('currentSpeed')
  if (startSpeed === undefined || startSpeed === null) {
    startSpeed = targetSpeed
  }

  let startBattery = marker.get('currentBattery')
  if (startBattery === undefined || startBattery === null) {
    startBattery = targetBattery
  }

  let startLockProgress = marker.get('currentLockProgress')
  if (startLockProgress === undefined || startLockProgress === null) {
    startLockProgress = targetLockProgress
  }

  // Encontrar el camino de rotación más corto
  let diff = targetCourse - startCourse
  while (diff < -180) diff += 360
  while (diff > 180) diff -= 360
  const adjustedTargetCourse = startCourse + diff

  const startTime = performance.now()
  const oldFrameId = marker.get('animationFrameId')
  if (oldFrameId) {
    cancelAnimationFrame(oldFrameId)
  }

  const animateStep = (time: number) => {
    const elapsed = time - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Easing sinusoidal para mayor suavidad
    const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2

    const currentLat = startLat + (targetLat - startLat) * easeProgress
    const currentLng = startLng + (targetLng - startLng) * easeProgress
    marker.setPosition({ lat: currentLat, lng: currentLng })

    const currentCourse = startCourse + (adjustedTargetCourse - startCourse) * easeProgress
    const currentSpeed = startSpeed + (targetSpeed - startSpeed) * easeProgress
    const currentBattery = startBattery + (targetBattery - startBattery) * easeProgress
    const currentLockProgress = startLockProgress + (targetLockProgress - startLockProgress) * easeProgress

    marker.setIcon(getCustomMarkerIcon(hw, currentCourse, currentSpeed, currentBattery, currentLockProgress))
    
    marker.set('currentCourse', currentCourse)
    marker.set('currentSpeed', currentSpeed)
    marker.set('currentBattery', currentBattery)
    marker.set('currentLockProgress', currentLockProgress)

    if (progress < 1) {
      const frameId = requestAnimationFrame(animateStep)
      marker.set('animationFrameId', frameId)
    } else {
      marker.set('animationFrameId', null)
      marker.setPosition({ lat: targetLat, lng: targetLng })
      marker.setIcon(getCustomMarkerIcon(hw, targetCourse, targetSpeed, targetBattery, targetLockProgress))
      marker.set('currentCourse', targetCourse % 360)
      marker.set('currentSpeed', targetSpeed)
      marker.set('currentBattery', targetBattery)
      marker.set('currentLockProgress', targetLockProgress)
    }
  }

  const frameId = requestAnimationFrame(animateStep)
  marker.set('animationFrameId', frameId)
}

// Actualizar marcadores en el mapa
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
        marker.setZIndex(isSelected ? 1000 : 1)
      } else {
        const position = { lat: hw.lat, lng: hw.lon }
        marker = new google.maps.Marker({
          position,
          map: map.value,
          title: hw.nombre,
          icon: getCustomMarkerIcon(hw),
          zIndex: isSelected ? 1000 : 1
        })
        marker.set('currentCourse', hw.course || 0)
        marker.set('currentSpeed', hw.speed || 0)
        marker.set('currentBattery', hw.battery !== undefined ? hw.battery : 100)
        marker.set('currentLockProgress', formatLockStatus(hw.status_lock) === 'CERRADO' ? 1 : 0)

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
        marker.setPosition({ lat: esc.lat, lng: esc.lon })
        marker.setIcon(getEscoltaMarkerIcon(isSelected))
        marker.setZIndex(isSelected ? 1000 : 1)
      } else {
        const position = { lat: esc.lat, lng: esc.lon }
        marker = new google.maps.Marker({
          position,
          map: map.value,
          title: esc.nombre,
          icon: getEscoltaMarkerIcon(isSelected),
          zIndex: isSelected ? 1000 : 1
        })

        marker.addListener('click', () => {
          selectItem(esc)
        })

        // Mostrar mini modal con información al pasar el cursor (hover)
        marker.addListener('mouseover', () => {
          if (infoWindow && map.value) {
            infoWindow.setContent(`
              <div class="custom-infowindow" style="
                padding: 10px 14px;
                color: #f8fafc;
                font-family: 'Inter', sans-serif;
                min-width: 170px;
              ">
                <div style="font-weight: 700; font-size: 13.5px; color: #ffffff; margin-bottom: 5px; letter-spacing: -0.01em;">
                  ${esc.nombre}
                </div>
                <div style="font-size: 11.5px; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5da6fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span style="font-weight: 500; color: #cbd5e1;">${esc.celular || 'Sin celular'}</span>
                </div>
              </div>
            `)
            infoWindow.open(map.value, marker)
          }
        })

        marker.addListener('mouseout', () => {
          if (infoWindow) {
            infoWindow.close()
          }
        })

        markersMap.set(esc.id_escolta, marker)
      }
    })
  }

  // Limpiar marcadores obsoletos
  markersMap.forEach((marker, key) => {
    if (!activeKeys.has(key)) {
      const oldFrameId = marker.get('animationFrameId')
      if (oldFrameId) {
        cancelAnimationFrame(oldFrameId)
        marker.set('animationFrameId', null)
      }
      marker.setMap(null)
      markersMap.delete(key)
    }
  })
}



// Sincronizar markers cuando el mapa se carga
watch(map, (newMap) => {
  if (newMap) {
    updateMarkersOnMap()
    // Escuchar cambios de zoom para re-escalar los marcadores
    newMap.addListener('zoom_changed', () => {
      updateMarkersOnMap()
    })
  }
})

// Selección de elementos
const selectItem = (item: any) => {
  selectedItem.value = item
  
  if (item.lat && item.lon && map.value) {
    map.value.panTo({ lat: item.lat, lng: item.lon })
    map.value.setZoom(16)
  }
}

// Redibujar marcadores al cambiar la selección para resaltar el seleccionado
watch(selectedItem, (newVal, oldVal) => {
  if (oldVal && oldVal.serial) {
    const m = markersMap.get(oldVal.serial)
    const hw = hardwareList.value.find(h => h.serial === oldVal.serial)
    if (m && hw) {
      m.setIcon(getCustomMarkerIcon(hw))
      m.setZIndex(1)
    }
  }
  if (newVal && newVal.serial) {
    const m = markersMap.get(newVal.serial)
    const hw = hardwareList.value.find(h => h.serial === newVal.serial)
    if (m && hw) {
      m.setIcon(getCustomMarkerIcon(hw))
      m.setZIndex(1000)
    }
  }

  if (oldVal && oldVal.id_escolta) {
    const m = markersMap.get(oldVal.id_escolta)
    if (m) {
      m.setIcon(getEscoltaMarkerIcon(false))
      m.setZIndex(1)
    }
  }
  if (newVal && newVal.id_escolta) {
    const m = markersMap.get(newVal.id_escolta)
    if (m) {
      m.setIcon(getEscoltaMarkerIcon(true))
      m.setZIndex(1000)
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
  markersMap.forEach(m => m.setMap(null))
  markersMap.clear()
})
</script>

<template>
  <div class="dark h-screen w-screen flex bg-[#0B0D11] text-slate-100 overflow-hidden font-sans relative">
    
    <!-- MAPA BACKDROP -->
    <div class="absolute inset-0 z-0">
      <div id="google-map-container" class="w-full h-full bg-[#0d1116]"></div>
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
    <div class="absolute top-0 bottom-0 left-0 w-[320px] md:w-[350px] lg:w-[380px] bg-[#13161C] border-r border-white/5 z-20 flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.4)]">
      
      <!-- Cabecera Panel -->
      <div class="p-5 border-b border-white/5 shrink-0">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-[#5da6fc]/10 flex items-center justify-center text-[#5da6fc] shadow-inner">
              <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="17" />
              <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="17" />
              <HugeiconsIcon v-else-if="activeTab === 'ESCOLTAS'" :icon="UserGroupIcon" :size="17" />
              <HugeiconsIcon v-else :icon="Car02Icon" :size="17" />
            </div>
            <div>
              <h2 class="text-[14px] font-bold text-white tracking-tight capitalize">{{ activeTab.toLowerCase() }}</h2>
              <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest block mt-0.5">
                {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'elemento' : 'elementos' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Buscador -->
        <div class="relative flex items-center gap-2">
          <AppInput 
            v-model="searchQuery"
            placeholder="Buscar..."
            :icon="Search01Icon"
            class="flex-1"
          />
          <button 
            v-if="activeTab === 'HARDWARE'"
            @click="connectWebSocket"
            title="Reconectar"
            class="w-10 h-10 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200 shrink-0"
          >
            <HugeiconsIcon :icon="RefreshIcon" :size="14" :class="{ 'animate-spin': wsStatus === 'connecting' }" />
          </button>
        </div>
      </div>

      <!-- Cuerpo / Lista -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#13161C]/50">
        <!-- Error de sesión / credenciales -->
        <div v-if="wsError && activeTab === 'HARDWARE'" class="mx-1 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2">
          <p class="text-[10px] font-bold text-rose-400">{{ wsError }}</p>
          <button @click="connectWebSocket" class="text-[9px] font-black uppercase tracking-wider text-[#5da6fc] hover:underline self-start">
            Reintentar
          </button>
        </div>

        <!-- Loader -->
        <div v-if="isLoadingSecondary" class="py-12 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#5da6fc] animate-spin"></div>
          <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cargando datos...</span>
        </div>

        <!-- Lista Vacía -->
        <div v-else-if="filteredItems.length === 0 && !wsError" class="py-16 text-center flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
            <HugeiconsIcon :icon="Location01Icon" :size="20" />
          </div>
          <p class="text-[11px] font-bold text-white/30">No se encontraron elementos</p>
        </div>

        <!-- Elementos -->
        <template v-else>
          <button
            v-for="item in filteredItems"
            :key="item.serial || item.id_servicio || item.id_escolta || item.placa"
            @click="selectItem(item)"
            class="group w-full text-left p-3 px-4 rounded-xl transition-all duration-300 border border-transparent outline-none flex items-center justify-between gap-3 relative overflow-hidden"
            :class="[
              isItemSelected(item)
                ? 'bg-[#5da6fc]/5 dark:bg-[#5da6fc]/10 border-[#5da6fc]/20 text-white z-10 shadow-[0_2px_8px_-2px_rgba(93,166,252,0.05)]'
                : (item.sos 
                    ? 'bg-rose-500/5 hover:bg-rose-500/10 border-red-500/15 text-white/80'
                    : 'bg-transparent border-transparent hover:bg-white/[0.02] dark:hover:bg-[#1E222B]/20 hover:border-white/5 text-white/80')
            ]"
          >
            <!-- Glow Effect background -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(93,166,252,0.04),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <!-- Content container -->
            <div class="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <h3
                    class="text-[12px] font-bold uppercase tracking-tight truncate transition-colors duration-200"
                    :class="isItemSelected(item) ? 'text-[#5da6fc]' : 'text-slate-200'"
                  >
                    {{ item.nombre || item.placa || item.id_servicio }}
                  </h3>
                  <!-- Badges de batería / SOS -->
                  <div class="flex items-center gap-2 shrink-0">
                    <span v-if="item.sos" class="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 leading-none select-none tracking-wide">
                      SOS
                    </span>
                    <span v-if="item.battery !== undefined" class="text-[10px] font-bold text-emerald-450 dark:text-emerald-400 flex items-center gap-0.5 leading-none select-none tracking-wide">
                      <HugeiconsIcon :icon="BatteryCharging01Icon" :size="10.5" class="opacity-80" />
                      {{ item.battery }}%
                    </span>
                  </div>
                </div>
                <div class="flex items-center justify-between mt-1.5 gap-2">
                  <p class="text-[10.5px] font-medium text-slate-450 dark:text-slate-500 truncate">
                    {{ item.descripcion || item.serial || item.celular || item.email || item.identificacion || 'Sin descripción' }}
                  </p>
                  <!-- Indicador de señal lat/lon -->
                  <span v-if="item.lat && item.lon" class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="GPS Activo"></span>
                </div>
              </div>
            </div>
          </button>
        </template>
      </div>
    </div>
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
</style>
