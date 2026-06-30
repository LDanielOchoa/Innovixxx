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

  const tokenWs = (queryToken && queryToken.trim()) || localStorage.getItem('auth-token-ws') || ''
  const groupId = (queryGroupId && queryGroupId.trim()) || localStorage.getItem('auth-grupo-id') || ''

  if (!tokenWs || !groupId) {
    wsStatus.value = 'disconnected'
    wsError.value = 'No hay sesión activa. Inicia sesión primero.'
    console.error('[WebSocket] Faltan credenciales:', { tokenWs: tokenWs || '(vacío)', groupId: groupId || '(vacío)' })
    return
  }

  localStorage.setItem('auth-token-ws', tokenWs)
  localStorage.setItem('auth-grupo-id', groupId)

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

// Helper para obtener el marcador personalizado con la brújula rotada y candado dinámico
const getCustomMarkerIcon = (
  hw: HardwareWs,
  courseValue?: number,
  speedValue?: number,
  batteryValue?: number,
  lockProgressValue?: number
) => {
  const course = courseValue !== undefined ? courseValue : (hw.course || 0)
  const pinColor = hw.sos ? '#EF4444' : '#0088FF'
  const isSelected = selectedItem.value && selectedItem.value.serial === hw.serial

  // Normalizar candado
  const isClosed = formatLockStatus(hw.status_lock) === 'CERRADO'
  const lockProgress = lockProgressValue !== undefined ? lockProgressValue : (isClosed ? 1 : 0)

  // Interpolar color del círculo del candado (Rojo #EF4444 al estar abierto, Verde #10B981 al estar cerrado)
  const rLock = Math.round(239 + (16 - 239) * lockProgress)
  const gLock = Math.round(68 + (185 - 68) * lockProgress)
  const bLock = Math.round(68 + (129 - 68) * lockProgress)
  const lockCircleColor = `rgb(${rLock}, ${gLock}, ${bLock})`

  const cerradoOpacity = lockProgress
  const abiertoOpacity = 1 - lockProgress

  // Dinámicos de batería y velocidad
  const batteryVal = batteryValue !== undefined ? Math.round(batteryValue) : (hw.battery !== undefined ? hw.battery : 100)
  const speedVal = speedValue !== undefined ? Math.round(speedValue) : Math.round(hw.speed || 0)

  // Color de la barra de progreso de batería
  const batteryColor = batteryVal < 20 ? '#EF4444' : '#10B981'

  // Calcular el sector circular para el clipPath de la barra de progreso
  const cx = 460.595
  const cy = 323.595
  const r = 300
  const startAngle = Math.PI // 180 grados (izquierda)
  const endAngle = Math.PI + (Math.PI * (batteryVal / 100)) // hasta 360 grados (derecha)
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArcFlag = (batteryVal > 50) ? 1 : 0
  const clipPathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

  // Filtro de resplandor/sombra si está seleccionado
  const filterDef = isSelected 
    ? `<defs>
        <filter id="selectedGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
       </defs>` 
    : ''
  const filterAttr = isSelected ? 'filter="url(#selectedGlow)"' : ''

  const svgString = `<svg width="782" height="727" viewBox="0 0 782 727" fill="none" xmlns="http://www.w3.org/2000/svg">
${filterDef}
<defs>
  <clipPath id="battery-clip-${hw.serial}">
    <path d="${clipPathD}" />
  </clipPath>
  <!-- Curva guía para el texto del kilometraje/velocidad -->
  <path id="speed-curve-${hw.serial}" d="M 300 94 A 280 280 0 0 1 621 94" fill="none" />
</defs>
<g id="Pin Brujula" ${filterAttr}>
<g id="Pin Mapa">
<path id="Pin" fill-rule="evenodd" clip-rule="evenodd" d="M460.5 68C599.4 68 712 180.6 712 319.5C712 336.454 710.322 353.017 707.124 369.031C684.926 536.308 461.822 726.69 461.822 726.69C461.822 726.69 271.958 564.673 225.103 408.239C214.695 380.644 209 350.737 209 319.5C209 180.6 321.6 68 460.5 68Z" fill="${pinColor}"/>
<ellipse id="Ellipse 41" cx="456.5" cy="124" rx="199.5" ry="124" fill="${pinColor}"/>
<path id="Circulo" d="M664.191 323.595C664.191 211.153 573.038 120 460.595 120C348.153 120 257 211.153 257 323.595C257 436.038 348.153 527.191 460.595 527.191C573.038 527.191 664.191 436.038 664.191 323.595Z" fill="white"/>
</g>
<g id="Brujula">
<g transform="rotate(${course}, 460.595, 323.595)">
<path id="Icono de Brujula" d="M542.361 397.013L482.646 373.202H482.645C468.407 367.525 452.593 367.525 438.355 373.202L378.638 397.015L460.5 227.275L542.361 397.013Z" fill="white" stroke="#0083F6" stroke-width="20" stroke-linejoin="round"/>
</g>
<g id="Letras Direccion">
<path id="N" d="M472.958 131.453V167H466.22L451.107 142.342V167H444.394V131.453H451.107L466.269 156.136V131.453H472.958Z" fill="#838383"/>
<path id="S" d="M462.997 505.771C462.997 505.088 462.891 504.478 462.68 503.94C462.484 503.387 462.118 502.891 461.581 502.451C461.06 501.995 460.32 501.556 459.359 501.133C458.415 500.693 457.195 500.238 455.697 499.766C454.037 499.245 452.491 498.659 451.059 498.008C449.626 497.357 448.365 496.6 447.274 495.737C446.2 494.875 445.362 493.882 444.76 492.759C444.158 491.619 443.856 490.301 443.856 488.804C443.856 487.339 444.166 486.004 444.784 484.8C445.419 483.595 446.314 482.562 447.47 481.699C448.625 480.82 449.984 480.145 451.547 479.673C453.126 479.201 454.867 478.965 456.771 478.965C459.408 478.965 461.687 479.445 463.607 480.405C465.544 481.366 467.042 482.668 468.1 484.312C469.158 485.955 469.687 487.803 469.687 489.854H462.997C462.997 488.747 462.761 487.77 462.289 486.924C461.833 486.077 461.133 485.41 460.189 484.922C459.262 484.434 458.09 484.189 456.674 484.189C455.307 484.189 454.167 484.393 453.256 484.8C452.361 485.207 451.685 485.76 451.229 486.46C450.79 487.16 450.57 487.941 450.57 488.804C450.57 489.455 450.725 490.041 451.034 490.562C451.343 491.066 451.807 491.546 452.426 492.002C453.044 492.441 453.809 492.856 454.721 493.247C455.648 493.621 456.723 493.996 457.943 493.996C459.896 494.956 461.605 495.607 463.07 496.323C464.551 497.039 465.78 497.853 466.757 498.765C467.75 499.676 468.49 500.701 468.979 501.841C469.483 502.98 469.735 504.274 469.735 505.723C469.735 507.253 469.434 508.62 468.832 509.824C468.23 511.029 467.367 512.054 466.244 512.9C465.121 513.747 463.77 514.39 462.191 514.829C460.629 515.269 458.879 515.488 456.942 515.488C455.217 515.488 453.508 515.26 451.815 514.805C450.139 514.333 448.617 513.633 447.25 512.705C445.883 511.761 444.792 510.573 443.979 509.141C443.165 507.692 442.758 505.999 442.758 504.062H449.496C449.496 505.186 449.675 506.146 450.033 506.943C450.408 507.725 450.928 508.368 451.596 508.872C452.279 509.36 453.077 509.718 453.988 509.946C454.9 510.174 455.884 510.288 456.942 510.288C458.31 510.288 459.433 510.101 460.312 509.727C461.207 509.336 461.874 508.799 462.313 508.115C462.769 507.432 462.997 506.65 462.997 505.771Z" fill="#838383"/>
<path id="E" d="M651.953 327.727V333H633.057V327.727H651.953ZM635.107 297.453V333H628.394V297.453H635.107ZM649.487 312.126V317.277H633.057V312.126H649.487ZM651.88 297.453V302.751H633.057V297.453H651.88Z" fill="#838383"/>
<path id="W" d="M278.134 329.188L285.214 300.453H289.047L289.291 306.508L281.723 336H277.67L278.134 329.188ZM273.666 300.453L279.477 329.091V336H275.058L267.001 300.453H273.666ZM296.64 328.969L302.353 300.453H309.042L300.985 336H296.566L296.64 328.969ZM290.878 300.453L297.958 329.286L298.373 336H294.32L286.776 306.483L287.069 300.453H290.878Z" fill="#838383"/>
</g>
</g>
<g id="Candado">
<circle id="Circulo del Candado" cx="99" cy="116" r="99" fill="${lockCircleColor}"/>
<g id="Candado Cerrado" opacity="${cerradoOpacity}">
<path id="Vector" d="M121.107 101.25V88.9583C121.107 76.739 111.202 66.8333 98.9823 66.8333C86.763 66.8333 76.8573 76.739 76.8573 88.9583V101.25" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path id="Vector_2" d="M106.354 101.25H91.6073C80.1277 101.25 74.388 101.25 70.0432 103.572C66.6126 105.406 63.8029 108.216 61.9694 111.647C59.6473 115.992 59.6479 121.732 59.649 133.211C59.65 144.689 59.6505 150.428 61.9729 154.772C63.8066 158.202 66.6162 161.011 70.0464 162.845C74.3908 165.167 80.1296 165.167 91.6073 165.167H106.354C117.833 165.167 123.572 165.167 127.917 162.845C131.347 161.011 134.157 158.201 135.99 154.771C138.313 150.426 138.313 144.687 138.313 133.208C138.313 121.73 138.313 115.991 135.99 111.646C134.157 108.215 131.347 105.406 127.917 103.572C123.572 101.25 117.833 101.25 106.354 101.25Z" stroke="white" stroke-width="10" stroke-linecap="round"/>
<path id="Vector_3" d="M98.9823 143.042C104.413 143.042 108.816 138.639 108.816 133.208C108.816 127.778 104.413 123.375 98.9823 123.375C93.5515 123.375 89.1489 127.778 89.1489 133.208C89.1489 138.639 93.5515 143.042 98.9823 143.042Z" stroke="white" stroke-width="10"/>
</g>
<g id="Candado Abierto" opacity="${abiertoOpacity}">
<path id="Vector_4" d="M98.9808 143.042C104.412 143.042 108.814 138.639 108.814 133.208C108.814 127.778 104.412 123.375 98.9808 123.375C93.55 123.375 89.1475 127.778 89.1475 133.208C89.1475 138.639 93.55 143.042 98.9808 143.042Z" stroke="white" stroke-width="10"/>
<path id="Vector_5" d="M76.8558 101.25V88.9583C76.8558 76.739 86.7615 66.8333 98.9809 66.8333C108.614 66.8333 115.61 72.99 118.648 81.5833" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="10"/>
<path id="Vector_6" d="M106.353 101.25H91.6058C80.1263 101.25 74.3865 101.25 70.0417 103.572C66.6112 105.406 63.8015 108.216 61.968 111.647C59.6459 115.992 59.6465 121.732 59.6475 133.211C59.6486 144.689 59.6491 150.428 61.9715 154.772C63.8051 158.202 66.6148 161.011 70.045 162.845C74.3894 165.167 80.1282 165.167 91.6058 165.167H106.353C117.831 165.167 123.571 165.167 127.915 162.845C131.346 161.011 134.156 158.201 135.989 154.771C138.311 150.426 138.311 144.687 138.311 133.208C138.311 121.73 138.311 115.991 135.989 111.646C134.156 108.215 131.346 105.406 127.915 103.572C123.571 101.25 117.831 101.25 106.353 101.25Z" stroke="white" stroke-linecap="round" stroke-width="10"/>
</g>
</g>
<g id="Velocidad Dispositivo">
  <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="80" fill="white">
    <textPath href="#speed-curve-${hw.serial}" startOffset="50%" text-anchor="middle">
      ${speedVal} <tspan font-size="38" font-weight="bold" fill="#D1D5DB">KM/H</tspan>
    </textPath>
  </text>
</g>
<g id="Bateria Dispositivo">
<path id="Barra de bateria" d="M679.82 326.5C680.24 326.5 679.19 326.5 679.264 326.499C690.199 326.418 699.877 315.908 699.059 305.004C699.054 304.93 699.248 307.281 699.17 306.341C694.494 249.674 670.218 196.248 630.291 155.734C585.658 110.444 525.122 85 462 85C398.878 85 338.342 110.444 293.709 155.734C253.782 196.248 229.506 249.674 224.83 306.341C224.752 307.281 224.947 304.929 224.941 305.004C224.123 315.908 233.801 326.418 244.736 326.499C244.81 326.5 243.76 326.5 244.18 326.5V326.5C244.935 326.5 245.313 326.5 245.379 326.5C256.314 326.427 263.98 319.486 265.135 308.612C265.142 308.546 265.214 307.815 265.36 306.352C269.915 260.564 289.893 217.523 322.248 184.693C359.312 147.083 409.583 125.954 462 125.954C514.417 125.954 564.688 147.083 601.752 184.693C634.107 217.523 654.085 260.564 658.64 306.352C658.786 307.815 658.858 308.546 658.865 308.612C660.02 319.486 667.686 326.427 678.621 326.5C678.687 326.5 679.065 326.5 679.82 326.5V326.5Z" fill="#838383" fill-opacity="0.34"/>
<path id="Progreso de bateria" clip-path="url(#battery-clip-${hw.serial})" d="M679.82 326.5C680.24 326.5 679.19 326.5 679.264 326.499C690.199 326.418 699.877 315.908 699.059 305.004C699.054 304.93 699.248 307.281 699.17 306.341C694.494 249.674 670.218 196.248 630.291 155.734C585.658 110.444 525.122 85 462 85C398.878 85 338.342 110.444 293.709 155.734C253.782 196.248 229.506 249.674 224.83 306.341C224.752 307.281 224.947 304.929 224.941 305.004C224.123 315.908 233.801 326.418 244.736 326.499C244.81 326.5 243.76 326.5 244.18 326.5V326.5C244.935 326.5 245.313 326.5 245.379 326.5C256.314 326.427 263.98 319.486 265.135 308.612C265.142 308.546 265.214 307.815 265.36 306.352C269.915 260.564 289.893 217.523 322.248 184.693C359.312 147.083 409.583 125.954 462 125.954C514.417 125.954 564.688 147.083 601.752 184.693C634.107 217.523 654.085 260.564 658.64 306.352C658.786 307.815 658.858 308.546 658.865 308.612C660.02 319.486 667.686 326.427 678.621 326.5C678.687 326.5 679.065 326.5 679.82 326.5V326.5Z" fill="${batteryColor}"/>
</g>
</g>
</svg>`

  const scale = getZoomScaleFactor()
  const w = isSelected ? 120 * scale : 100 * scale
  const h = isSelected ? 112 * scale : 93 * scale
  const ax = isSelected ? 71 * scale : 59 * scale
  const ay = h

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString),
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
