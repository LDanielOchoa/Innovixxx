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

// Estado del mapa y markers
const markers = ref<Map<string, google.maps.Marker>>(new Map())
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

// Conectar WebSocket para HARDWARE
const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('[WebSocket] Conexión ya activa o en curso, ignorando duplicado.')
    return
  }

  if (socket) {
    socket.close()
  }

  // Cancelar cualquier intento de reconexión pendiente
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }

  isManualDisconnect = false
  wsStatus.value = 'connecting'
  wsError.value = null

  // Header.vue pasa token_ws y group_id en la URL al abrir la ventana
  // Tienen prioridad porque vienen del groupStore (valor en tiempo real)
  const queryToken = route.query.token_ws as string | undefined
  const queryGroupId = route.query.group_id as string | undefined

  const tokenWs = (queryToken && queryToken.trim()) || localStorage.getItem('auth-token-ws') || ''
  const groupId = (queryGroupId && queryGroupId.trim()) || localStorage.getItem('auth-grupo-id') || ''

  if (!tokenWs || !groupId) {
    wsStatus.value = 'disconnected'
    wsError.value = 'No hay sesión activa. Inicia sesión primero.'
    console.error('[WebSocket] Faltan credenciales:', { tokenWs: tokenWs || '(vacío)', groupId: groupId || '(vacío)', queryToken, queryGroupId })
    return
  }

  // Persistir en localStorage para futuras reconexiones
  localStorage.setItem('auth-token-ws', tokenWs)
  localStorage.setItem('auth-grupo-id', groupId)

  const wsUrl = `ws://66.179.190.248:8900/start/?token=${tokenWs}&modo=2&group_id=${groupId}`
  console.log('[WebSocket] Intentando conectar a:', wsUrl)
  
  try {
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      wsStatus.value = 'connected'
      wsError.value = null
      reconnectAttempts = 0 // Reiniciar contador de intentos en caso de éxito
      console.log('[WebSocket] Conectado exitosamente')
    }

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.ev === 50 && Array.isArray(payload.flota)) {
          if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
            // Carga inicial
            hardwareList.value = payload.flota
          } else {
            // Sincronización periódica/actualizaciones
            payload.flota.forEach((updatedItem: HardwareWs) => {
              const index = hardwareList.value.findIndex(h => h.serial === updatedItem.serial)
              if (index !== -1) {
                hardwareList.value[index] = { ...hardwareList.value[index], ...updatedItem }
              } else {
                hardwareList.value.push(updatedItem)
              }

              // Si el elemento actualizado es el seleccionado, refrescar su detalle
              if (selectedItem.value && selectedItem.value.serial === updatedItem.serial) {
                selectedItem.value = { ...selectedItem.value, ...updatedItem }
              }
            })
          }
          updateMarkersOnMap()
        }
      } catch (err) {
        console.error('[WebSocket] Error al procesar mensaje:', err)
      }
    }

    socket.onerror = (err) => {
      console.error('[WebSocket] Error:', err)
      wsError.value = 'Error en la conexión del servidor'
    }

    socket.onclose = (event) => {
      wsStatus.value = 'disconnected'
      console.log(`[WebSocket] Conexión cerrada. Código: ${event.code}, Razón: ${event.reason || 'No provista'}, Limpio: ${event.wasClean}`)
      socket = null

      // Intentar reconectar si no fue desconexión manual y no se superó el límite
      if (!isManualDisconnect) {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          console.log(`[WebSocket] Intentando reconectar en ${delay}ms... (Intento ${reconnectAttempts}/${maxReconnectAttempts})`)
          reconnectTimeoutId = setTimeout(() => {
            connectWebSocket()
          }, delay)
        } else {
          console.error('[WebSocket] Máximo de intentos de reconexión alcanzado.')
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
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }
  if (socket) {
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

  // Interpolar color del círculo del candado (Rojo #EF4444 cuando está abierto (0), Verde #10B981 cuando está cerrado (1))
  const rLock = Math.round(239 + (16 - 239) * lockProgress)
  const gLock = Math.round(68 + (185 - 68) * lockProgress)
  const bLock = Math.round(68 + (129 - 68) * lockProgress)
  const lockCircleColor = `rgb(${rLock}, ${gLock}, ${bLock})`

  const cerradoOpacity = lockProgress
  const abiertoOpacity = 1 - lockProgress

  // Dinámicos de batería y velocidad
  const batteryVal = batteryValue !== undefined ? Math.round(batteryValue) : (hw.battery !== undefined ? hw.battery : 100)
  const speedVal = speedValue !== undefined ? Math.round(speedValue) : Math.round(hw.speed || 0)
  
  // Interpolar color de la batería
  const batteryThresholdFactor = batteryVal < 20 ? 0 : 1
  const rBat = Math.round(239 + (16 - 239) * batteryThresholdFactor)
  const gBat = Math.round(68 + (185 - 68) * batteryThresholdFactor)
  const bBat = Math.round(68 + (129 - 68) * batteryThresholdFactor)
  const batteryCircleColor = `rgb(${rBat}, ${gBat}, ${bBat})`

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

  const svgString = `<svg width="701" height="874" viewBox="0 0 701 874" fill="none" xmlns="http://www.w3.org/2000/svg">
${filterDef}
<g id="Pin Brujula" ${filterAttr}>
<g id="Pin Mapa">
<path id="Pin" fill-rule="evenodd" clip-rule="evenodd" d="M449.5 215C588.4 215 701 327.6 701 466.5C701 483.454 699.322 500.017 696.124 516.031C673.926 683.308 450.822 873.69 450.822 873.69C450.822 873.69 260.958 711.673 214.103 555.239C203.695 527.644 198 497.737 198 466.5C198 327.6 310.6 215 449.5 215Z" fill="${pinColor}"/>
<path id="Circulo" d="M653.191 472.595C653.191 360.153 562.038 269 449.595 269C337.153 269 246 360.153 246 472.595C246 585.038 337.153 676.191 449.595 676.191C562.038 676.191 653.191 585.038 653.191 472.595Z" fill="white"/>
</g>
<g id="Brujula">
<g transform="rotate(${course}, 449.5, 472.595)">
<path id="Icono de Brujula" d="M531.361 546.013L471.646 522.202H471.645C457.407 516.525 441.593 516.525 427.355 522.202L367.638 546.015L449.5 376.275L531.361 546.013Z" fill="white" stroke="#0083F6" stroke-width="20" stroke-linejoin="round"/>
</g>
<g id="Letras Direccion">
<path id="N" d="M461.958 280.453V316H455.22L440.107 291.342V316H433.394V280.453H440.107L455.269 305.136V280.453H461.958Z" fill="#838383"/>
<path id="S" d="M451.997 654.771C451.997 654.088 451.891 653.478 451.68 652.94C451.484 652.387 451.118 651.891 450.581 651.451C450.06 650.995 449.32 650.556 448.359 650.133C447.415 649.693 446.195 649.238 444.697 648.766C443.037 648.245 441.491 647.659 440.059 647.008C438.626 646.357 437.365 645.6 436.274 644.737C435.2 643.875 434.362 642.882 433.76 641.759C433.158 640.619 432.856 639.301 432.856 637.804C432.856 636.339 433.166 635.004 433.784 633.8C434.419 632.595 435.314 631.562 436.47 630.699C437.625 629.82 438.984 629.145 440.547 628.673C442.126 628.201 443.867 627.965 445.771 627.965C448.408 627.965 450.687 628.445 452.607 629.405C454.544 630.366 456.042 631.668 457.1 633.312C458.158 634.955 458.687 636.803 458.687 638.854H451.997C451.997 637.747 451.761 636.77 451.289 635.924C450.833 635.077 450.133 634.41 449.189 633.922C448.262 633.434 447.09 633.189 445.674 633.189C444.307 633.189 443.167 633.393 442.256 633.8C441.361 634.207 440.685 634.76 440.229 635.46C439.79 636.16 439.57 636.941 439.57 637.804C439.57 638.455 439.725 639.041 440.034 639.562C440.343 640.066 440.807 640.546 441.426 641.002C442.044 641.441 442.809 641.856 443.721 642.247C444.648 642.621 445.723 642.996 446.943 643.37C448.896 643.956 450.605 644.607 452.07 645.323C453.551 646.039 454.78 646.853 455.757 647.765C456.75 648.676 457.49 649.701 457.979 650.841C458.483 651.98 458.735 653.274 458.735 654.723C458.735 656.253 458.434 657.62 457.832 658.824C457.23 660.029 456.367 661.054 455.244 661.9C454.121 662.747 452.77 663.39 451.191 663.829C449.629 664.269 447.879 664.488 445.942 664.488C444.217 664.488 442.508 664.26 440.815 663.805C439.139 663.333 437.617 662.633 436.25 661.705C434.883 660.761 433.792 659.573 432.979 658.141C432.165 656.692 431.758 654.999 431.758 653.062H438.496C438.496 654.186 438.675 655.146 439.033 655.943C439.408 656.725 439.928 657.368 440.596 657.872C441.279 658.36 442.077 658.718 442.988 658.946C443.9 659.174 444.884 659.288 445.942 659.288C447.31 659.288 448.433 659.101 449.312 658.727C450.207 658.336 450.874 657.799 451.313 657.115C451.769 656.432 451.997 655.65 451.997 654.771Z" fill="#838383"/>
<path id="E" d="M640.953 476.727V482H622.057V476.727H640.953ZM624.107 446.453V482H617.394V446.453H624.107ZM638.487 461.126V466.277H622.057V461.126H638.487ZM640.88 446.453V451.751H622.057V446.453H640.88Z" fill="#838383"/>
<path id="W" d="M267.134 478.188L274.214 449.453H278.047L278.291 455.508L270.723 485H266.67L267.134 478.188ZM262.666 449.453L268.477 478.091V485H264.058L256.001 449.453H262.666ZM285.64 477.969L291.353 449.453H298.042L289.985 485H285.566L285.64 477.969ZM279.878 449.453L286.958 478.286L287.373 485H283.32L275.776 455.483L276.069 449.453H279.878Z" fill="#838383"/>
</g>
</g>
<g id="Candado">
<circle id="Circulo del Candado" cx="99" cy="355" r="99" fill="${lockCircleColor}"/>
<g id="Candado Cerrado" opacity="${cerradoOpacity}">
<path id="Vector" d="M121.107 340.25V327.958C121.107 315.739 111.202 305.833 98.9823 305.833C86.763 305.833 76.8573 315.739 76.8573 327.958V340.25" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path id="Vector_2" d="M106.354 340.25H91.6073C80.1277 340.25 74.388 340.25 70.0432 342.572C66.6126 344.406 63.8029 347.216 61.9694 350.647C59.6473 354.992 59.6479 360.732 59.649 372.211C59.65 383.689 59.6505 389.428 61.9729 393.772C63.8066 397.202 66.6162 400.011 70.0464 401.845C74.3908 404.167 80.1296 404.167 91.6073 404.167H106.354C117.833 404.167 123.572 404.167 127.917 401.845C131.347 400.011 134.157 397.201 135.99 393.771C138.313 389.426 138.313 383.687 138.313 372.208C138.313 360.73 138.313 354.991 135.99 350.646C134.157 347.215 131.347 344.406 127.917 342.572C123.572 340.25 117.833 340.25 106.354 340.25Z" stroke="white" stroke-width="10" stroke-linecap="round"/>
<path id="Vector_3" d="M98.9823 382.042C104.413 382.042 108.816 377.639 108.816 372.208C108.816 366.778 104.413 362.375 98.9823 362.375C93.5515 362.375 89.1489 366.778 89.1489 372.208C89.1489 377.639 93.5515 382.042 98.9823 382.042Z" stroke="white" stroke-width="10"/>
</g>
<g id="Candado Abierto" opacity="${abiertoOpacity}">
<path id="Vector_4" d="M98.9808 382.042C104.412 382.042 108.814 377.639 108.814 372.208C108.814 350.778 104.412 346.375 98.9808 346.375C93.55 346.375 89.1475 350.778 89.1475 356.208C89.1475 361.639 93.55 366.042 98.9808 382.042Z" stroke="white" stroke-width="10"/>
<path id="Vector_5" d="M76.8558 340.25V327.958C76.8558 315.739 86.7615 305.833 98.9809 305.833C108.614 305.833 115.61 311.99 118.648 320.583" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
<path id="Vector_6" d="M106.353 340.25H91.6058C80.1263 340.25 74.3865 340.25 70.0417 342.572C66.6112 344.406 63.8015 347.216 61.968 350.647C59.6459 354.992 59.6465 360.732 59.6475 372.211C59.6486 383.689 59.6491 389.428 61.9715 393.772C63.8051 397.202 66.6148 400.011 70.045 401.845C74.3894 404.167 80.1282 404.167 91.6058 404.167H106.353C117.831 404.167 123.571 404.167 127.915 401.845C131.346 400.011 134.156 397.201 135.989 393.771C138.311 389.426 138.311 383.687 138.311 372.208C138.311 360.73 138.311 354.991 135.989 350.646C134.156 347.215 131.346 344.406 127.915 342.572C123.571 340.25 117.831 340.25 106.353 340.25Z" stroke="white" stroke-width="10" stroke-linecap="round"/>
</g>
</g>
<g id="Velocidad">
<circle id="Circulo de la velocidad" cx="246" cy="128" r="128" fill="#0088FF"/>
<path id="KM/H" d="M194.166 150.453V186H187.452V150.453H194.166ZM215.504 150.453L201.246 167.787L193.092 176.503L191.896 169.984L197.56 162.636L207.276 150.453H215.504ZM208.033 186L196.974 169.35L201.783 165.004L216.017 186H208.033ZM222.071 150.453H227.882L237.599 177.211L247.291 150.453H253.126L239.918 186H235.255L222.071 150.453ZM219.142 150.453H224.83L225.855 175.038V186H219.142V150.453ZM250.343 150.453H256.056V186H249.342V175.038L250.343 150.453ZM277.687 150.453L264.259 189.052H259.352L272.779 150.453H277.687ZM305.519 165.126V170.399H286.817V165.126H305.519ZM288.648 150.453V186H281.935V150.453H288.648ZM310.499 150.453V186H303.785V150.453H310.499Z" fill="white"/>
<text x="246" y="125" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="76" fill="white" text-anchor="middle">${speedVal}</text>
</g>
<g id="Bateria">
<circle id="Circulo de la bateria" cx="509.5" cy="117.5" r="94.5" fill="${batteryCircleColor}"/>
<text x="509.5" y="130" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="52" fill="white" text-anchor="middle">${batteryVal}%</text>
</g>
</g>
</svg>`

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString),
    anchor: isSelected ? new google.maps.Point(77, 151) : new google.maps.Point(64, 126),
    scaledSize: isSelected ? new google.maps.Size(120, 151) : new google.maps.Size(100, 126)
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

  const activeSerials = new Set<string>()

  hardwareList.value.forEach(hw => {
    const hasCoordinates = hw.lat !== 0 && hw.lon !== 0
    if (!hasCoordinates) return

    activeSerials.add(hw.serial)

    let marker = markers.value.get(hw.serial)
    const isSelected = selectedItem.value && selectedItem.value.serial === hw.serial

    if (marker) {
      animateMarker(marker, hw.lat, hw.lon, hw.course || 0, hw)
      marker.setZIndex(isSelected ? 1000 : 1)
    } else {
      const position = { lat: hw.lat, lng: hw.lon }
      // Crear marcador personalizado inicial
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

      markers.value.set(hw.serial, marker)
    }
  })

  // Limpiar marcadores obsoletos
  markers.value.forEach((marker, serial) => {
    if (!activeSerials.has(serial)) {
      // Cancelar cualquier animación pendiente del marcador eliminado
      const oldFrameId = marker.get('animationFrameId')
      if (oldFrameId) {
        cancelAnimationFrame(oldFrameId)
      }
      marker.setMap(null)
      markers.value.delete(serial)
    }
  })
}



// Sincronizar markers cuando el mapa se carga
watch(map, (newMap) => {
  if (newMap) {
    updateMarkersOnMap()
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
    const m = markers.value.get(oldVal.serial)
    const hw = hardwareList.value.find(h => h.serial === oldVal.serial)
    if (m && hw) {
      m.setIcon(getCustomMarkerIcon(hw))
      m.setZIndex(1)
    }
  }
  if (newVal && newVal.serial) {
    const m = markers.value.get(newVal.serial)
    const hw = hardwareList.value.find(h => h.serial === newVal.serial)
    if (m && hw) {
      m.setIcon(getCustomMarkerIcon(hw))
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

// Cambiar de pestaña
const changeTab = (tab: 'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS') => {
  activeTab.value = tab
  selectedItem.value = null
  searchQuery.value = ''
  
  if (tab === 'HARDWARE') {
    connectWebSocket()
  } else {
    disconnectWebSocket()
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
  markers.value.forEach(m => m.setMap(null))
  markers.value.clear()
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
              selectedItem && (selectedItem.serial === item.serial || selectedItem.id_servicio === item.id_servicio)
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
                    :class="selectedItem && (selectedItem.serial === item.serial || selectedItem.id_servicio === item.id_servicio) ? 'text-[#5da6fc]' : 'text-slate-200'"
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
                    {{ item.descripcion || item.serial || item.identificacion || 'Sin descripción' }}
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
