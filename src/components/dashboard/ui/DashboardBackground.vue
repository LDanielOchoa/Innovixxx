<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createTimeline } from 'animejs'

declare global {
  interface Window {
    google?: any;
  }
}

interface AlertaDetalle {
  id_grupo: number;
  id_servicio: number;
  id_hardware: number;
  tipo: number;
  lat: string;
  lon: string;
  fecha_hora: string;
  token: string;
  in_main_db: boolean;
  ws_sync: boolean;
}

const props = withDefaults(defineProps<{
  alertasDetalle?: AlertaDetalle[]
}>(), {
  alertasDetalle: () => []
})

const emit = defineEmits<{
  (e: 'selectAlert', alerta: AlertaDetalle): void
}>()

const getNombreTipoAlerta = (tipo: number): string => {
  switch (tipo) {
    case 1:
      return t('dashboard.tacticalMap.overspeed') || 'Exceso de velocidad'
    case 2:
      return t('dashboard.tacticalMap.sos') || 'SOS / Emergencia'
    case 3:
      return t('dashboard.tacticalMap.routeDeviation') || 'Alejamiento de ruta'
    case 4:
      return t('dashboard.tacticalMap.lockOpen') || 'Candado abierto'
    case 5:
      return t('dashboard.tacticalMap.lockClose') || 'Candado cerrado'
    case 6:
      return t('dashboard.tacticalMap.routeReturn') || 'Ruta en su lugar'
    default:
      return `Alerta activa (${tipo})`
  }
}

const containerRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const bgMapContainerRef = ref<HTMLElement | null>(null)
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const mapInstance = ref<any>(null)
const bgMapInstance = ref<any>(null)
const isDark = ref(document.documentElement.classList.contains('dark'))
const markers = ref<any[]>([])
const { t, locale } = useI18n()

// Toma exclusivamente la última alerta recibida según su fecha_hora para mantener 1 solo marcador enfocado
const alarmLocations = computed(() => {
  if (!props.alertasDetalle || props.alertasDetalle.length === 0) {
    return []
  }

  // Ordenar de más antigua a más reciente para tomar la última cronológica
  const ordenadas = [...props.alertasDetalle].sort((a, b) => {
    const fechaA = new Date(a.fecha_hora).getTime()
    const fechaB = new Date(b.fecha_hora).getTime()
    if (!isNaN(fechaA) && !isNaN(fechaB)) {
      return fechaA - fechaB
    }
    return 0
  })

  const ultimaAlerta = ordenadas[ordenadas.length - 1]
  if (!ultimaAlerta) return []

  const lat = parseFloat(ultimaAlerta.lat)
  const lng = parseFloat(ultimaAlerta.lon)

  if (isNaN(lat) || isNaN(lng)) return []

  return [{
    name: `Serv. #${ultimaAlerta.id_servicio}`,
    lat: lat,
    lng: lng,
    alarm: getNombreTipoAlerta(ultimaAlerta.tipo),
    fecha_hora: ultimaAlerta.fecha_hora || '',
    alerta: ultimaAlerta
  }]
})

// Tactical theme for the dashboard map
const getTacticalMapStyle = (isDark: boolean) => {
  const land = isDark ? "#0f172a" : "#e2e8f0";
  const water = isDark ? "#020617" : "#cbd5e1";
  const road = isDark ? "#1e293b" : "#f1f5f9";
  const highway = isDark ? "#334155" : "#ffffff";
  const text = isDark ? "#64748b" : "#64748b";
  const accent = isDark ? "#3b82f6" : "#2563eb";

  return [
    { elementType: "geometry", stylers: [{ color: land }] },
    { elementType: "labels.text.stroke", stylers: [{ color: land }, { weight: 2 }] },
    { elementType: "labels.text.fill", stylers: [{ color: text }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: accent }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.business", stylers: [{ visibility: "off" }] },
    { featureType: "poi.government", stylers: [{ visibility: "off" }] },
    { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: isDark ? "#020617" : "#d1d5db" }] },
    { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
    { featureType: "poi.school", stylers: [{ visibility: "off" }] },
    { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: road }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: highway }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: accent }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: water }] },
  ];
}

const getBgMapStyle = () => {
  const ground = "#0a1628";
  const water = "#061220";
  const road = "#1a2d4a";
  const highway = "#2a3f5f";
  const label = "#4a7ab5";
  const labelStroke = "#0a1628";

  return [
    { elementType: "geometry", stylers: [{ color: ground }] },
    { elementType: "labels.text.stroke", stylers: [{ color: labelStroke }, { weight: 2 }] },
    { elementType: "labels.text.fill", stylers: [{ color: label }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: ground }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#5a8cc5" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#4a7ab5" }] },
    { featureType: "landscape", stylers: [{ color: ground }] },
    { featureType: "landscape.natural", stylers: [{ color: "#0c1a30" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: road }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#152540" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5a8cc5" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: highway }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f3350" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: water }] },
  ];
}

const initializeBgMap = () => {
  if (!bgMapContainerRef.value || !(window as any).google) return

  bgMapInstance.value = new (window as any).google.maps.Map(bgMapContainerRef.value, {
    center: { lat: 4.7110, lng: -74.0721 },
    zoom: 5,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    gestureHandling: "none",
    draggable: false,
    scrollwheel: false,
    styles: getBgMapStyle(),
    backgroundColor: "#0a1628",
    clickableIcons: false,
  })
}

const loadGoogleMapsScript = () => {
  if ((window as any).google && (window as any).google.maps) {
    initializeMap()
    initializeBgMap()
    return
  }

  const script = document.createElement('script')
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  script.async = true
  script.defer = true
  script.onload = () => {
    initializeMap()
    initializeBgMap()
  }
  document.head.appendChild(script)
}

const initializeMap = () => {
  if (!mapContainerRef.value || !(window as any).google) return

  const isDark = document.documentElement.classList.contains('dark')
  const mapStyle = getTacticalMapStyle(isDark)
  const google = (window as any).google

  const initialCenter = alarmLocations.value.length > 0 && alarmLocations.value[0]
    ? { lat: alarmLocations.value[0].lat, lng: alarmLocations.value[0].lng }
    : { lat: 4.7110, lng: -74.0721 }

  const mapOptions = {
    center: initialCenter,
    zoom: 13,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: mapStyle,
    backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
  }

  mapInstance.value = new google.maps.Map(mapContainerRef.value, mapOptions)

  // Crear marcadores de alarmas y ajustar vista
  createAlarmMarkers()

  if (alarmLocations.value.length > 1) {
    const bounds = new google.maps.LatLngBounds()
    alarmLocations.value.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }))
    mapInstance.value.fitBounds(bounds)
  }
}

const createAlarmMarkers = () => {
  if (!mapInstance.value || !(window as any).google) return

  alarmLocations.value.forEach((location) => {
    // Overlay personalizado anclado perfectamente al mapa sin desfasarse
    const AlarmOverlay = class extends (window as any).google.maps.OverlayView {
      div: HTMLDivElement | null = null
      latLng: any

      constructor(position: any) {
        super()
        this.latLng = position
      }

      onAdd() {
        this.div = document.createElement('div')
        this.div.className = 'alarm-label'
        this.div.style.pointerEvents = 'auto'
        this.div.style.cursor = 'pointer'
        this.div.innerHTML = `
          <div class="alarm-label__dot"></div>
          <div class="alarm-label__text">
            <span class="alarm-label__alarm">${location.alarm}</span>
            <span class="alarm-label__city">${location.name}</span>
            ${location.fecha_hora ? `<span class="alarm-label__time">${location.fecha_hora}</span>` : ''}
          </div>
        `
        this.div.addEventListener('click', (e: Event) => {
          e.stopPropagation()
          if (location.alerta) {
            emit('selectAlert', location.alerta)
          }
        })
        const panes = this.getPanes()
        panes?.overlayLayer.appendChild(this.div)
      }

      draw() {
        const projection = this.getProjection()
        if (projection && this.latLng && this.div) {
          const point = projection.fromLatLngToDivPixel(this.latLng)
          if (point) {
            this.div.style.left = '0px'
            this.div.style.top = '0px'
            this.div.style.transform = `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0px) translate(-5px, -17px)`
          }
        }
      }

      onRemove() {
        if (this.div) {
          this.div.remove()
          this.div = null
        }
      }

      highlight() {
        this.div?.classList.add('alarm-label--active')
        setTimeout(() => {
          this.div?.classList.remove('alarm-label--active')
        }, 3000)
      }
    }

    const google = (window as any).google
    const overlay = new AlarmOverlay(new google.maps.LatLng(location.lat, location.lng))
    overlay.setMap(mapInstance.value)
    markers.value.push(overlay)
  })
}

// Watch for dark mode changes and update map style
watch(isDark, (dark) => {
  if (mapInstance.value) {
    mapInstance.value.setOptions({
      styles: getTacticalMapStyle(dark),
      backgroundColor: dark ? '#0f172a' : '#e2e8f0'
    })
  }
})

// Watch for changes in alarmLocations to update markers dynamically
watch(alarmLocations, (newLocs) => {
  if (mapInstance.value && (window as any).google) {
    // Limpiar marcadores
    markers.value.forEach(m => m.setMap(null))
    markers.value = []

    // Recrear marcador de la última alerta
    createAlarmMarkers()

    if (newLocs.length > 0 && newLocs[0]) {
      mapInstance.value.panTo({ lat: newLocs[0].lat, lng: newLocs[0].lng })
      mapInstance.value.setZoom(13)
    }
  }
}, { deep: true, immediate: true })

// Watch for language changes and update map markers
watch(locale, () => {
  if (mapInstance.value) {
    // Limpiar marcadores existentes antes de recrear
    markers.value.forEach(m => m.setMap(null))
    markers.value = []
    createAlarmMarkers()
  }
})

const ICONS = {
  alert: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none"><path d="M0 0h24v24H0z" stroke="none"/><path d="M12 9v4M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0zM12 16h.01"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none"><path d="M0 0h24v24H0z" stroke="none"/><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  car: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2M9 17h6M3 11h15M12 11V6"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" fill="none"><path stroke="none" d="M0 0h24v24H0z"/><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/></svg>`
}

const cardTemplates = computed(() => {
  if (!props.alertasDetalle || props.alertasDetalle.length === 0) {
    return []
  }
  return props.alertasDetalle.map((alerta) => ({
    icon: alerta.tipo === 2 ? ICONS.alert : (alerta.tipo === 4 ? ICONS.info : ICONS.pin),
    label: `HW #${alerta.id_hardware}`,
    value: getNombreTipoAlerta(alerta.tipo),
    tag: alerta.tipo === 2 ? 'CRÍTICO' : 'ALERTA'
  }))
})

interface ActiveCardEntry {
  el: HTMLElement
  isLeft: boolean
  slotX: number
}

const cardMap = new Map<string, ActiveCardEntry>()

const getAlertKey = (alerta: AlertaDetalle) => {
  return alerta.token || `${alerta.id_hardware}-${alerta.id_servicio}-${alerta.fecha_hora}`
}

function clearActiveCards() {
  cardMap.forEach(({ el }) => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el)
    }
  })
  cardMap.clear()
}

function animateCardAbsorption(entry: ActiveCardEntry) {
  if (!containerRef.value || !entry.el) return

  const card = entry.el
  const isLeft = entry.isLeft
  const rect = containerRef.value.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  const cx = w / 2

  const endX = cx + (entry.slotX * 0.4)
  const endY = h * 0.42

  createTimeline()
    // FASE 4 — absorción hacia portal superior (pantalla táctica)
    .add(card, {
      opacity:  [1, 0],
      scale:    [1, 0.05],
      rotateX:  [0, 68],
      rotateY:  [isLeft ? 12 : -12, isLeft ? -45 : 45],
      left:     endX,
      top:      endY,
      duration: 850,
      ease: 'inQuart',
      onComplete: () => {
        if (card.parentNode) {
          card.parentNode.removeChild(card)
        }
      }
    })
}

function spawnCardForAlert(alerta: AlertaDetalle, index: number) {
  if (!containerRef.value) return

  const key = getAlertKey(alerta)

  const template = {
    icon: alerta.tipo === 2 ? ICONS.alert : (alerta.tipo === 4 ? ICONS.info : ICONS.pin),
    label: `SERV. #${alerta.id_servicio}`,
    value: getNombreTipoAlerta(alerta.tipo),
    tag: alerta.tipo === 2 ? 'CRÍTICO' : 'ALERTA'
  }

  const rect = containerRef.value.getBoundingClientRect()
  
  const w = rect.width
  const h = rect.height
  const cx = w / 2

  // Constelación orgánica 3D alrededor del vórtice (20 slots alternados en espiral sin columnas)
  const baseSlots = [
    { x: -210, y:  50, rx: -3, ry:  16 }, // Slot 0: Izq Bajo-Medio
    { x:  270, y:  80, rx:  2, ry: -14 }, // Slot 1: Der Bajo-Exterior
    { x: -330, y: -20, rx: -4, ry:  20 }, // Slot 2: Izq Centro-Exterior
    { x:  190, y: -45, rx:  3, ry: -12 }, // Slot 3: Der Alto-Interior
    { x: -160, y: -90, rx: -2, ry:  10 }, // Slot 4: Izq Alto-Interior
    { x:  350, y:  15, rx:  4, ry: -22 }, // Slot 5: Der Centro-Exterior
    { x: -270, y:  95, rx: -3, ry:  18 }, // Slot 6: Izq Bajo-Exterior
    { x:  220, y: -105,rx:  2, ry: -15 }, // Slot 7: Der Alto-Medio
    { x: -380, y:  40, rx: -5, ry:  24 }, // Slot 8: Izq Exterior-Abajo
    { x:  160, y:  30, rx:  1, ry: -10 }, // Slot 9: Der Interior-Abajo
    { x: -230, y: -60, rx: -3, ry:  15 }, // Slot 10: Izq Alto-Medio
    { x:  310, y: -60, rx:  3, ry: -18 }, // Slot 11: Der Alto-Exterior
    { x: -170, y:  10, rx: -2, ry:  12 }, // Slot 12: Izq Interior-Centro
    { x:  250, y: -20, rx:  2, ry: -14 }, // Slot 13: Der Centro-Medio
    { x: -340, y: -100,rx: -4, ry:  22 }, // Slot 14: Izq Alto-Exterior
    { x:  370, y: -80, rx:  5, ry: -24 }, // Slot 15: Der Superior-Exterior
    { x: -290, y: -130,rx: -3, ry:  18 }, // Slot 16: Izq Superior-Cúpula
    { x:  200, y:  100,rx:  2, ry: -12 }, // Slot 17: Der Cerca-Abajo
    { x: -400, y: -45, rx: -5, ry:  25 }, // Slot 18: Izq Lejano-Centro
    { x:  330, y: -125,rx:  4, ry: -20 }, // Slot 19: Der Superior-Alto
  ]
  const baseSlot = baseSlots[index % baseSlots.length]!

  const slotX = baseSlot.x
  const slotY = baseSlot.y

  const isLeft = slotX < 0

  const startX = cx + slotX
  const startY = h * 0.78
  const midY   = h * 0.65 + slotY

  const restRotateY = baseSlot.ry
  const restRotateX = baseSlot.rx

  const isDarkMode = document.documentElement.classList.contains('dark')

  const card = document.createElement('div')
  card.className = `absolute flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} portal-data-card`
  
  const bg          = isDarkMode ? 'rgba(19, 22, 28, 0.85)'   : 'rgba(255, 255, 255, 0.85)'
  const borderCol   = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(100, 116, 139, 0.15)'
  const accentColor = isDarkMode ? '#5da6fc'                  : '#3b82f6'
  const accentGlow  = isDarkMode ? 'rgba(93, 166, 252, 0.2)'  : 'rgba(59, 130, 246, 0.1)'
  const labelColor  = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(71, 85, 105, 0.8)'
  const valueColor  = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)'
  const tagBg       = isDarkMode ? 'rgba(93, 166, 252, 0.1)'  : 'rgba(59, 130, 246, 0.05)'
  const tagColor    = isDarkMode ? '#5da6fc'                  : '#3b82f6'
  const boxShadow   = isDarkMode
    ? `0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px ${borderCol}`
    : `0 10px 30px rgba(100, 116, 139, 0.1), 0 0 0 1px ${borderCol}`

  card.innerHTML = `
    <div style="
      width:100%; height:100%;
      background: ${bg};
      border-radius: 12px;
      box-shadow: ${boxShadow};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      padding: 6px 10px;
      position: relative;
      overflow: hidden;
      border: 1px solid ${borderCol};
    ">
      <!-- Top Glow Line -->
      <div style="position:absolute; top:0; left:0; right:0; height:1.5px; background:linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%); opacity:0.85;"></div>
      
      <!-- Shine Effect -->
      <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%); pointer-events:none;"></div>

      <!-- Top row: icon + plate + tag -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:4px; z-index:1;">
        <div style="display:flex; align-items:center; gap:4px; min-width:0;">
          <span style="color:${accentColor}; display:flex; filter:drop-shadow(0 0 8px ${accentGlow}); flex-shrink:0;">${template.icon}</span>
          <span style="font-size:8.5px; font-weight:900; letter-spacing:0.08em; color:${labelColor}; font-family:Inter, sans-serif; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${template.label}</span>
        </div>
        <span style="
          font-size:7px; font-weight:900; letter-spacing:0.08em; text-transform:uppercase;
          color:${tagColor}; background:${tagBg}; padding:1px 5px; border-radius:5px;
          border: 1px solid ${isDarkMode ? 'rgba(93,166,252,0.25)' : 'rgba(59,130,246,0.15)'}; font-family:Inter, sans-serif; flex-shrink:0;
        ">${template.tag}</span>
      </div>

      <!-- Value row -->
      <div style="display:flex; align-items:center; z-index:1; margin-top:1px;">
        <span style="font-size:10px; font-weight:900; letter-spacing:0.01em; text-transform:uppercase; color:${valueColor}; font-family:Inter, sans-serif; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${template.value}</span>
      </div>
    </div>
  `

  card.style.cssText = `
    width: 175px;
    height: 48px;
    margin-left: -87.5px;
    margin-top: -24px;
    left: ${startX}px;
    top: ${startY}px;
    opacity: 0;
    transform: perspective(1600px) rotateX(72deg) rotateY(${isLeft ? -50 : 50}deg) scale(0.06);
    transform-origin: center center;
    z-index: ${50 + Math.round(slotY / 5)};
    pointer-events: auto;
    cursor: pointer;
    transform-style: preserve-3d;
    will-change: transform, opacity;
  `
  
  card.addEventListener('click', (e: Event) => {
    e.stopPropagation()
    emit('selectAlert', alerta)
  })
  
  containerRef.value.appendChild(card)
  cardMap.set(key, { el: card, isLeft, slotX })

  // Animación de entrada y luego flotación continua sin desaparecer
  createTimeline()
    // FASE 1 — materialización: emerge del portal inferior
    .add(card, {
      opacity: [0, 1],
      scale:   [0.06, 1.04],
      rotateX: [72, restRotateX],
      rotateY: [isLeft ? -50 : 50, restRotateY + (isLeft ? 6 : -6)],
      top:     [startY, midY],
      duration: 950,
      ease: 'outExpo',
    })
    // FASE 2 — asentamiento: reposo inicial
    .add(card, {
      scale:   1,
      rotateX: restRotateX,
      rotateY: restRotateY,
      duration: 350,
      ease: 'outQuad',
      onComplete: () => {
        // FASE 3 — Flotación orgánica perpetua (Loop continuo en el espacio de la card)
        createTimeline({ loop: true, alternate: true })
          .add(card, {
            top:     midY - 14,
            rotateX: restRotateX - 2.5,
            rotateY: restRotateY + (isLeft ? 4 : -4),
            duration: 3200 + (index % 4) * 600,
            ease: 'inOutSine',
          })
      }
    })
}

// Rastrea la cantidad anterior de alertas para brotar las tarjetas correspondientes
let prevAlertCount = 0

watch(
  () => props.alertasDetalle,
  (nuevasAlertas) => {
    if (!nuevasAlertas || nuevasAlertas.length === 0) {
      cardMap.forEach((entry) => animateCardAbsorption(entry))
      cardMap.clear()
      prevAlertCount = 0
      return
    }

    const currentKeys = new Set(nuevasAlertas.map(getAlertKey))

    // Detectar alertas que fueron solventadas o removidas
    cardMap.forEach((entry, key) => {
      if (!currentKeys.has(key)) {
        cardMap.delete(key)
        animateCardAbsorption(entry)
      }
    })

    // Ordenar cronológicamente por fecha_hora ascendente
    const ordenadas = [...nuevasAlertas].sort((a, b) => {
      const fechaA = new Date(a.fecha_hora).getTime()
      const fechaB = new Date(b.fecha_hora).getTime()
      if (!isNaN(fechaA) && !isNaN(fechaB)) {
        return fechaA - fechaB
      }
      return 0
    })

    // Si llegaron nuevas alertas vía WebSocket, brotamos las adicionales
    if (prevAlertCount > 0 && nuevasAlertas.length > prevAlertCount) {
      const recienLlegadas = ordenadas.slice(prevAlertCount)
      recienLlegadas.forEach((alerta, idx) => {
        const k = getAlertKey(alerta)
        if (!cardMap.has(k)) {
          setTimeout(() => {
            spawnCardForAlert(alerta, cardMap.size + idx)
          }, idx * 400)
        }
      })
    } else if (cardMap.size === 0) {
      // Al inicializar o cambiar las alertas, brotar tarjetas para las alertas disponibles (hasta 20 slots)
      clearActiveCards()
      const ultimasAlertas = ordenadas.slice(-20)
      ultimasAlertas.forEach((alerta, idx) => {
        setTimeout(() => {
          spawnCardForAlert(alerta, idx)
        }, idx * 250)
      })
    }

    prevAlertCount = nuevasAlertas.length
  },
  { deep: true, immediate: true }
)

let themeObserver: MutationObserver | null = null

onMounted(() => {
  loadGoogleMapsScript()

  // Observar cambios en la clase del html para detectar cambio de tema
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (intervalId.value) clearInterval(intervalId.value)
  if (themeObserver) themeObserver.disconnect()
  clearActiveCards()
})
</script>

<template>
  <div ref="containerRef" class="absolute inset-0 pointer-events-none z-0" style="perspective: 1600px;">
    <!-- Background Map (deepest layer) -->
    <div
      ref="bgMapContainerRef"
      class="absolute inset-0 z-[-1] pointer-events-none opacity-[0.32] dark:opacity-[0.35] saturate-[0.5] brightness-[0.6] contrast-[1.1]"
    />

    <!-- Bottom-to-top dark gradient overlay (subtle) -->
    <div class="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0a1628]/[0.5] dark:from-[#0a1628]/[0.6] via-[#0a1628]/[0.15] dark:via-[#0a1628]/[0.2] to-transparent pointer-events-none z-0"></div>

    <!-- Background Grid -->
    <div class="absolute inset-0 bg-[linear-gradient(rgba(100,116,139,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(93,166,252,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(93,166,252,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none transition-colors duration-700"></div>

    <!-- Ambient Lights -->
    <div class="absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(ellipse_at_top,rgba(100,116,139,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(93,166,252,0.15)_0%,transparent_65%)] pointer-events-none z-0 transition-colors duration-700"></div>
    <div class="absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(ellipse_at_bottom,rgba(100,116,139,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_bottom,rgba(93,166,252,0.15)_0%,transparent_65%)] pointer-events-none z-0 transition-colors duration-700"></div>

    <!-- Google Map (above vortex) - Enhanced Dynamic 3D Holographic Screen -->
    <div 
      class="absolute top-[6%] left-[22.5%] w-[55%] h-[32%] [z-index:8] pointer-events-auto rounded-[2.5rem] overflow-hidden border border-[#3b82f6]/40 dark:border-[#5da6fc]/50 shadow-[0_50px_100px_rgba(0,0,0,0.5),0_0_60px_rgba(59,130,246,0.15)] transition-all duration-300 group/map animate-hologram-float hover:shadow-[0_60px_120px_rgba(0,0,0,0.6),0_0_80px_rgba(59,130,246,0.2)]"
      @mousemove="handleMapMouseMove"
      @mouseleave="handleMapMouseLeave"
      style="
        transform: perspective(1400px) rotateX(var(--map-rot-x, 12deg)) rotateY(var(--map-rot-y, 0deg)) scale(0.95); 
        transform-style: preserve-3d;
        --map-rot-x: 12deg;
        --map-rot-y: 0deg;
      "
    >
      <!-- Interior Map Container -->
      <div ref="mapContainerRef" class="w-full h-full"></div>
      
      <!-- Premium Glass Edge Glow -->
      <div class="absolute inset-0 pointer-events-none border-[1.5px] border-white/20 dark:border-white/10 rounded-[2.5rem]"></div>
      <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.08)_0%,transparent_50%)]"></div>
      
      <!-- HUD Top Bar Glow -->
      <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#5da6fc] to-transparent opacity-90 shadow-[0_0_20px_#5da6fc]"></div>
      
      <!-- Bottom Light Projection -->
      <div class="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-[280px] h-[60px] bg-[radial-gradient(ellipse_at_center,rgba(93,166,252,0.5)_0%,transparent_75%)] blur-2xl"></div>
    </div>

    <!-- Sci-Fi Effects Container (Visible in light mode as subtle blue/gray rings, vibrant in dark mode) -->
    <div class="absolute inset-0 pointer-events-none transition-all duration-700 opacity-[0.8] dark:opacity-100 z-0">
      <!-- Energy Beam (connects from map to bottom portal) -->
      <div class="absolute top-[32%] bottom-[2%] left-1/2 -translate-x-1/2 w-[300px] pointer-events-none z-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]">
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-[#60a5fa]/[0.05] dark:via-[#5da6fc]/[0.05] to-transparent"></div>
        <div class="absolute inset-0 left-1/2 -translate-x-1/2 w-[80px] bg-gradient-to-r from-transparent via-[#60a5fa]/[0.08] dark:via-[#5da6fc]/[0.1] to-transparent"></div>
        <!-- Central energy line with pulse -->
        <div class="absolute inset-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#60a5fa]/40 dark:bg-[#5da6fc]/50 shadow-[0_0_15px_rgba(96,165,250,0.6),0_0_30px_rgba(96,165,250,0.3)] dark:shadow-[0_0_15px_rgba(93,166,252,0.8),0_0_30px_rgba(93,166,252,0.5)] animate-beam-pulse"></div>
        <!-- Secondary glow line -->
        <div class="absolute inset-0 left-1/2 -translate-x-1/2 w-[6px] bg-gradient-to-r from-transparent via-[#60a5fa]/10 dark:via-[#5da6fc]/15 to-transparent blur-sm"></div>

        <!-- Particles flowing upward -->
        <div class="absolute w-[1px] h-[20%] bg-gradient-to-t from-transparent via-[#93c5fd]/40 dark:via-[#a8cfff]/60 to-transparent left-[20%] beam-up-fast" style="animation-duration: 2.5s; animation-delay: 0s;"></div>
        <div class="absolute w-[1px] h-[20%] bg-gradient-to-t from-transparent via-[#93c5fd]/40 dark:via-[#a8cfff]/60 to-transparent left-[40%] beam-up-fast" style="animation-duration: 3.0s; animation-delay: 0.8s;"></div>
        <div class="absolute w-[2px] h-[25%] bg-gradient-to-t from-transparent via-[#93c5fd]/60 dark:via-[#a8cfff]/80 to-transparent left-[50%] beam-up" style="animation-duration: 4.5s; animation-delay: 1.2s;"></div>
        <div class="absolute w-[1px] h-[20%] bg-gradient-to-t from-transparent via-[#93c5fd]/40 dark:via-[#a8cfff]/60 to-transparent left-[60%] beam-up-fast" style="animation-duration: 2.8s; animation-delay: 0.4s;"></div>
        <div class="absolute w-[1px] h-[20%] bg-gradient-to-t from-transparent via-[#93c5fd]/40 dark:via-[#a8cfff]/60 to-transparent left-[80%] beam-up-fast" style="animation-duration: 3.5s; animation-delay: 1.5s;"></div>
        <!-- Particles flowing downward -->
        <div class="absolute w-[1px] h-[30%] bg-gradient-to-b from-transparent via-[#60a5fa]/30 dark:via-[#5da6fc]/40 to-transparent left-[30%] beam-down-slow" style="animation-duration: 5.0s; animation-delay: 0.2s;"></div>
        <div class="absolute w-[2px] h-[25%] bg-gradient-to-b from-transparent via-[#93c5fd]/50 dark:via-[#a8cfff]/70 to-transparent left-[70%] beam-down" style="animation-duration: 3.8s; animation-delay: 0.9s;"></div>
      </div>

      <!-- BOTTOM PORTAL - Redesigned -->
      <div class="absolute top-[93%] left-1/2 w-[850px] h-[850px] perspective-[1100px] pointer-events-none z-10 flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="relative w-full h-full flex items-center justify-center transform-style-3d" style="transform: rotateX(75deg);">
          <!-- Deep core glow -->
          <div class="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(22,25,29,0.98)_0%,transparent_70%)] shadow-[inset_0_0_60px_rgba(96,165,250,0.15)] dark:shadow-[inset_0_0_60px_rgba(93,166,252,0.4)] z-[-1]"></div>
          
          <!-- Core pulse -->
          <div class="absolute w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.3)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(93,166,252,0.5)_0%,transparent_70%)] animate-portal-pulse"></div>
          
          <!-- Outer glow layers -->
          <div class="absolute w-[420px] h-[420px] rounded-full bg-[#60a5fa] dark:bg-[#5da6fc] blur-[100px] opacity-[0.06] dark:opacity-[0.12]"></div>
          <div class="absolute w-[220px] h-[220px] rounded-full bg-[#60a5fa] dark:bg-[#5da6fc] blur-[60px] opacity-[0.1] dark:opacity-[0.2]"></div>
          
          <!-- Outer ring - large dashed -->
          <div class="absolute w-[780px] h-[780px] rounded-full border border-slate-300/60 dark:border-[#5da6fc]/10"></div>
          
          <!-- Spinning dashed ring (slow reverse) -->
          <div class="absolute w-[600px] h-[600px] rounded-full border border-slate-400/40 dark:border-[#5da6fc]/20 border-dashed animate-[spin_120s_linear_infinite_reverse]"></div>
          
          <!-- Main spinning ring with dots -->
          <div class="absolute w-[460px] h-[460px] rounded-full border border-[#60a5fa]/20 dark:border-[#5da6fc]/30 shadow-[0_0_15px_rgba(96,165,250,0.1)] dark:shadow-[0_0_15px_rgba(93,166,252,0.2)] animate-[spin_30s_linear_infinite]">
            <div class="absolute top-[-3px] left-[35%] w-1.5 h-1.5 bg-[#60a5fa] dark:bg-[#a8cfff] rounded-full shadow-[0_0_8px_#60a5fa] dark:shadow-[0_0_12px_#a8cfff,0_0_20px_#5da6fc]"></div>
            <div class="absolute bottom-[-3px] right-[35%] w-1.5 h-1.5 bg-[#60a5fa] dark:bg-[#a8cfff] rounded-full shadow-[0_0_8px_#60a5fa] dark:shadow-[0_0_12px_#a8cfff,0_0_20px_#5da6fc]"></div>
          </div>
          
          <!-- Mid ring -->
          <div class="absolute w-[300px] h-[300px] rounded-full border border-[#60a5fa]/30 dark:border-[#5da6fc]/40 shadow-[0_0_15px_rgba(96,165,250,0.15)] dark:shadow-[0_0_15px_rgba(93,166,252,0.25)]"></div>
          
          <!-- Inner spinning arc ring -->
          <div class="absolute w-[170px] h-[170px] rounded-full border-[2px] border-transparent border-l-[#60a5fa]/60 dark:border-l-[#5da6fc]/80 border-r-[#60a5fa]/60 dark:border-r-[#5da6fc]/80 shadow-[0_0_15px_rgba(96,165,250,0.2)] dark:shadow-[0_0_15px_rgba(93,166,252,0.4)] animate-[spin_10s_linear_infinite]"></div>
          
          <!-- Dotted inner ring -->
          <div class="absolute w-[90px] h-[90px] rounded-full border border-slate-400/50 dark:border-[#5da6fc]/70 border-dotted animate-[spin_20s_linear_infinite]"></div>
          
          <!-- Center point -->
          <div class="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(96,165,250,0.5)] dark:shadow-[0_0_10px_#ffffff,0_0_25px_#5da6fc,0_0_50px_#5da6fc]"></div>
        </div>
      </div>
    </div> <!-- Close Sci-Fi Container -->
    
    <!-- End Background Container -->
  </div>
</template>

<style scoped>
.transform-style-3d {
  transform-style: preserve-3d;
}

:deep(.portal-data-card) {
  will-change: transform, opacity, top, left;
}

.animate-portal-pulse {
  animation: portal-pulse 3s ease-in-out infinite alternate;
}

@keyframes hologram-float {
  0%, 100% { transform: perspective(1400px) rotateX(var(--map-rot-x, 12deg)) rotateY(var(--map-rot-y, 0deg)) translateY(0) scale(0.95); }
  50%      { transform: perspective(1400px) rotateX(var(--map-rot-x, 12deg)) rotateY(var(--map-rot-y, 0deg)) translateY(-10px) scale(0.96); }
}

.animate-hologram-float {
  animation: hologram-float 6s ease-in-out infinite;
}

@keyframes portal-pulse {
  0% { transform: scale(0.9); opacity: 0.4; }
  100% { transform: scale(1.15); opacity: 0.9; }
}

.beam-up {
  animation: floatUp linear infinite;
  opacity: 0;
}
.beam-up-fast {
  animation: floatUp linear infinite;
  opacity: 0;
}
.beam-down {
  animation: floatDown linear infinite;
  opacity: 0;
}
.beam-down-slow {
  animation: floatDown linear infinite;
  opacity: 0;
}

.animate-beam-pulse {
  animation: beamPulse 3s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulseSlow 4s ease-in-out infinite;
}

@keyframes beamPulse {
  0%, 100% { opacity: 0.4; transform: translateX(-50%) scaleY(1); }
  50% { opacity: 0.8; transform: translateX(-50%) scaleY(1.02); }
}

@keyframes pulseSlow {
  0%, 100% { opacity: 0.3; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.5; transform: translateX(-50%) scale(1.05); }
}

@keyframes floatUp {
  0%   { top: 100%; opacity: 0; }
  15%  { opacity: 0.8; }
  85%  { opacity: 0.8; }
  100% { top: -25%; opacity: 0; }
}

@keyframes floatDown {
  0%   { top: -25%; opacity: 0; }
  15%  { opacity: 0.8; }
  85%  { opacity: 0.8; }
  100% { top: 100%; opacity: 0; }
}

/* Labels minimalistas de alarmas - siempre visibles */
:deep(.alarm-label) {
  position: absolute;
  display: flex;
  align-items: flex-start;
  gap: 0;
  pointer-events: none;
  z-index: 1000;
  will-change: transform;
}

:deep(.alarm-label__dot) {
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  box-shadow:
    0 0 0 3px rgba(239, 68, 68, 0.2),
    0 0 0 6px rgba(239, 68, 68, 0.1),
    0 0 20px rgba(239, 68, 68, 0.5);
  animation: pulse-ring 2s ease-out infinite;
  flex-shrink: 0;
  margin-top: 12px;
  position: relative;
}

/* Línea conectora punteada desde el punto hasta la caja */
:deep(.alarm-label__dot)::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 2px;
  background: repeating-linear-gradient(
    to right,
    rgba(239, 68, 68, 0.6) 0px,
    rgba(239, 68, 68, 0.6) 3px,
    transparent 3px,
    transparent 6px
  );
  transform: translateY(-50%);
  z-index: -1;
}

@keyframes pulse-ring {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(239, 68, 68, 0.2),
      0 0 0 6px rgba(239, 68, 68, 0.1),
      0 0 20px rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow:
      0 0 0 5px rgba(239, 68, 68, 0.2),
      0 0 0 10px rgba(239, 68, 68, 0.1),
      0 0 30px rgba(239, 68, 68, 0.7);
  }
}

:deep(.alarm-label__text) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
  margin-left: 20px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(239, 68, 68, 0.1);
  min-width: 100px;
  position: relative;
}

/* Pequeño triángulo indicador en la caja */
:deep(.alarm-label__text)::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 14px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 6px solid rgba(239, 68, 68, 0.25);
}

:deep(.alarm-label__text)::after {
  content: '';
  position: absolute;
  left: -4px;
  top: 15px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-right: 5px solid rgba(15, 23, 42, 0.85);
}

:deep(.alarm-label__alarm) {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #fca5a5;
  text-transform: uppercase;
  white-space: nowrap;
  line-height: 1.3;
}

:deep(.alarm-label__city) {
  font-size: 9px;
  color: #64748b;
  letter-spacing: 0.06em;
  white-space: nowrap;
  line-height: 1.2;
}

:deep(.alarm-label__time) {
  font-size: 8px;
  color: #94a3b8;
  letter-spacing: 0.04em;
  white-space: nowrap;
  line-height: 1.1;
  margin-top: 1px;
}

/* Estado activo cuando la cámara se mueve a esta alarma */
:deep(.alarm-label--active) .alarm-label__dot {
  background: #fbbf24;
  animation: pulse-active 1s ease-out infinite;
}

:deep(.alarm-label--active) .alarm-label__dot::after {
  background: repeating-linear-gradient(
    to right,
    rgba(251, 191, 36, 0.8) 0px,
    rgba(251, 191, 36, 0.8) 3px,
    transparent 3px,
    transparent 6px
  );
}

:deep(.alarm-label--active) .alarm-label__text {
  background: rgba(28, 25, 23, 0.9);
  border-color: rgba(251, 191, 36, 0.4);
  box-shadow:
    0 4px 25px rgba(251, 191, 36, 0.15),
    0 0 0 1px rgba(251, 191, 36, 0.2);
}

:deep(.alarm-label--active) .alarm-label__text::before {
  border-right-color: rgba(251, 191, 36, 0.4);
}

:deep(.alarm-label--active) .alarm-label__text::after {
  border-right-color: rgba(28, 25, 23, 0.9);
}

:deep(.alarm-label--active) .alarm-label__alarm {
  color: #fbbf24;
  font-weight: 700;
}

:deep(.alarm-label--active) .alarm-label__city {
  color: #a8a29e;
}

@keyframes pulse-active {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.3),
      0 0 0 6px rgba(251, 191, 36, 0.15),
      0 0 25px rgba(251, 191, 36, 0.6);
  }
  50% {
    box-shadow:
      0 0 0 5px rgba(251, 191, 36, 0.3),
      0 0 0 10px rgba(251, 191, 36, 0.15),
      0 0 40px rgba(251, 191, 36, 0.9);
  }
}
</style>


