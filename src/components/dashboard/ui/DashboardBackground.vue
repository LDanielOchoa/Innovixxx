<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createTimeline } from 'animejs'

declare global {
  interface Window {
    google?: any;
  }
}

const containerRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const bgMapContainerRef = ref<HTMLElement | null>(null)
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const mapInstance = ref<any>(null)
const bgMapInstance = ref<any>(null)
const isDark = ref(document.documentElement.classList.contains('dark'))
const { t, locale } = useI18n()

// Ubicaciones de alarmas en Colombia
const alarmLocations = computed(() => [
  { name: 'Bogotá', lat: 4.7110, lng: -74.0721, alarm: t('dashboard.tacticalMap.overspeed') },
  { name: 'Medellín', lat: 6.2442, lng: -75.5812, alarm: t('dashboard.tacticalMap.hardBraking') },
  { name: 'Cali', lat: 3.4516, lng: -76.5320, alarm: t('dashboard.tacticalMap.routeDeviation') },
  { name: 'Barranquilla', lat: 10.9685, lng: -74.7813, alarm: t('dashboard.tacticalMap.engineOff') },
  { name: 'Cartagena', lat: 10.3910, lng: -75.4794, alarm: t('dashboard.tacticalMap.lowBattery') },
  { name: 'Bucaramanga', lat: 7.1193, lng: -73.1227, alarm: t('dashboard.tacticalMap.sos') },
  { name: 'Pereira', lat: 4.8133, lng: -75.6961, alarm: t('dashboard.tacticalMap.doorOpen') },
  { name: 'Manizales', lat: 5.0689, lng: -75.5174, alarm: t('dashboard.tacticalMap.overspeed') },
])

const markers = ref<any[]>([])
const currentLocationIndex = ref(0)
let alarmInterval: ReturnType<typeof setInterval> | null = null

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

  const mapOptions = {
    center: { lat: 4.7110, lng: -74.0721 }, // Bogotá, Colombia
    zoom: 12,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: mapStyle,
    backgroundColor: isDark ? '#0f172a' : '#e2e8f0',
  }

  mapInstance.value = new (window as any).google.maps.Map(mapContainerRef.value, mapOptions)

  // Crear marcadores de alarmas
  createAlarmMarkers()

  // Iniciar rotación de alarmas
  startAlarmRotation()
}

const createAlarmMarkers = () => {
  if (!mapInstance.value || !(window as any).google) return

  alarmLocations.value.forEach((location) => {
    // Overlay personalizado para label minimalista
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
        this.div.innerHTML = `
          <div class="alarm-label__dot"></div>
          <div class="alarm-label__text">
            <span class="alarm-label__alarm">${location.alarm}</span>
            <span class="alarm-label__city">${location.name}</span>
          </div>
        `
        const panes = this.getPanes()
        panes?.overlayMouseTarget.appendChild(this.div)
      }

      draw() {
        const projection = this.getProjection()
        const point = projection.fromLatLngToDivPixel(this.latLng)
        if (point && this.div) {
          this.div.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`
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

    const handleMapMouseMove = (e: MouseEvent) => {
      const mapCard = e.currentTarget as HTMLElement
      if (!mapCard) return
      const rect = mapCard.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      const rotX = 12 + -((y - centerY) / 25)
      const rotY = (x - centerX) / 35
      
      mapCard.style.setProperty('--map-rot-x', `${rotX}deg`)
      mapCard.style.setProperty('--map-rot-y', `${rotY}deg`)
      mapCard.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`)
      mapCard.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`)
    }

    const handleMapMouseLeave = (e: MouseEvent) => {
      const mapCard = e.currentTarget as HTMLElement
      if (!mapCard) return
      mapCard.style.setProperty('--map-rot-x', '12deg')
      mapCard.style.setProperty('--map-rot-y', '0deg')
    }

    const google = (window as any).google
    const overlay = new AlarmOverlay(new google.maps.LatLng(location.lat, location.lng))
    overlay.setMap(mapInstance.value)
    markers.value.push(overlay)
  })
}

const moveToAlarmLocation = (index: number) => {
  if (!mapInstance.value) return

  const location = alarmLocations.value[index]
  if (!location) return

  currentLocationIndex.value = index

  // Animar el movimiento de la cámara
  mapInstance.value.panTo({ lat: location.lat, lng: location.lng })
  mapInstance.value.setZoom(13)

  // Resaltar el label correspondiente
  setTimeout(() => {
    const overlay = markers.value[index]
    if (overlay && typeof overlay.highlight === 'function') {
      overlay.highlight()
    }
  }, 500)
}

const startAlarmRotation = () => {
  // Mover a una alarma aleatoria cada 8 segundos
  alarmInterval = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * alarmLocations.value.length)
    moveToAlarmLocation(randomIndex)
  }, 8000)
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

const cardTemplates = computed(() => [
  { icon: ICONS.alert, label: 'ABC-123', value: t('dashboard.tacticalMap.overspeed'), tag: t('dashboard.vortex.tags.critical') },
  { icon: ICONS.alert, label: 'XYZ-987', value: t('dashboard.tacticalMap.hardBraking'), tag: t('dashboard.vortex.tags.alert') },
  { icon: ICONS.pin,   label: 'JKL-456', value: t('dashboard.tacticalMap.routeDeviation'), tag: t('dashboard.vortex.tags.control') },
  { icon: ICONS.car,   label: 'MNO-654', value: t('dashboard.tacticalMap.engineOff'), tag: t('dashboard.vortex.tags.status') },
  { icon: ICONS.info,  label: 'PQR-321', value: t('dashboard.tacticalMap.lowBattery'), tag: t('dashboard.vortex.tags.system') },
  { icon: ICONS.alert, label: 'STU-987', value: t('dashboard.widgets.alarms.alarmTypes.acceleration'), tag: t('dashboard.vortex.tags.alert') },
  { icon: ICONS.alert, label: 'VWX-654', value: t('dashboard.tacticalMap.sos'), tag: t('dashboard.vortex.tags.sos') },
  { icon: ICONS.info,  label: 'DEF-111', value: t('dashboard.tacticalMap.doorOpen'), tag: t('dashboard.vortex.tags.status') },
])

let cardIndex = 0

function spawnCard() {
  if (!containerRef.value) return

  const template = cardTemplates.value[cardIndex % cardTemplates.value.length]!
  const rect = containerRef.value.getBoundingClientRect()
  
  const w = rect.width
  const h = rect.height
  const cx = w / 2

  const maxSpread = 170
  const minSpread = 80

  const baseSlots = [
    { x: -minSpread, y: -4 },
    { x:  maxSpread, y: 18 },
    { x: -maxSpread, y: 10 },
    { x:  minSpread, y: -2 },
    { x: -minSpread - 20, y: 22 },
    { x:  maxSpread + 20, y: -8 },
    { x: -maxSpread - 20, y: 20 },
    { x:  minSpread + 20, y: 26 },
  ]
  const baseSlot = baseSlots[cardIndex % baseSlots.length]!
  
  cardIndex++

  const jitterX = (Math.random() - 0.5) * 24
  const jitterY = (Math.random() - 0.5) * 18
  
  const slotX = baseSlot.x + jitterX
  const slotY = baseSlot.y + jitterY

  const isLeft = slotX < 0

  const startX = cx + slotX
  const startY = h * 0.78
  const midY   = h * 0.65 + slotY
  const endX   = cx + (slotX * 0.5)
  const endY   = h * 0.55

  const restRotateY = isLeft ? 12 : -12

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
      border-radius: 14px;
      box-shadow: ${boxShadow};
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      padding: 8px 12px;
      position: relative;
      overflow: hidden;
      border: 1px solid ${borderCol};
    ">
      <!-- Shine Effect -->
      <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%); pointer-events:none;"></div>

      <!-- Top row: icon + plate + tag -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; z-index:1;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="color:${accentColor}; display:flex; filter:drop-shadow(0 0 8px ${accentGlow});">${template.icon}</span>
          <span style="font-size:9px; font-weight:900; letter-spacing:0.1em; color:${labelColor}; font-family:Inter, sans-serif; text-transform:uppercase;">${template.label}</span>
        </div>
        <span style="
          font-size:7px; font-weight:900; letter-spacing:0.1em; text-transform:uppercase;
          color:${tagColor}; background:${tagBg}; padding:2px 8px; border-radius:6px;
          border: 1px solid ${isDarkMode ? 'rgba(93,166,252,0.2)' : 'rgba(59,130,246,0.1)'}; font-family:Inter, sans-serif;
        ">${template.tag}</span>
      </div>

      <!-- Value row -->
      <div style="display:flex; align-items:center; z-index:1; margin-top:2px;">
        <span style="font-size:12px; font-weight:900; letter-spacing:-0.01em; text-transform:uppercase; color:${valueColor}; font-family:Inter, sans-serif; line-height:1;">${template.value}</span>
      </div>
    </div>
  `

  card.style.cssText = `
    width: 165px;
    height: 52px;
    margin-left: -82px;
    margin-top: -26px;
    left: ${startX}px;
    top: ${startY}px;
    opacity: 0;
    transform: perspective(1600px) rotateX(72deg) rotateY(${isLeft ? -50 : 50}deg) scale(0.06);
    transform-origin: center center;
    z-index: 20;
    pointer-events: none;
    transform-style: preserve-3d;
    will-change: transform, opacity, top, left;
  `
  
  containerRef.value.appendChild(card)

  createTimeline()
    // FASE 1 — materialización: emerge del portal inferior
    .add(card, {
      opacity: [0, 1],
      scale:   [0.06, 1.04],
      rotateX: [72, -5],
      rotateY: [isLeft ? -50 : 50, restRotateY + (isLeft ? 6 : -6)],
      top:     [startY, midY],
      duration: 950,
      ease: 'outExpo',
    })
    // FASE 2 — asentamiento: rebote y reposo
    .add(card, {
      scale:   1,
      rotateX: 0,
      rotateY: restRotateY,
      duration: 350,
      ease: 'outQuad',
    })
    // FASE 3 — flotación orgánica: dos ciclos asimétricos
    .add(card, {
      top:     midY - 16,
      rotateX: -2.5,
      rotateY: restRotateY + (isLeft ? 4 : -4),
      duration: 3000,
      ease: 'inOutSine',
    })
    .add(card, {
      top:     midY + 6,
      rotateX: 1.5,
      rotateY: restRotateY - (isLeft ? 2 : -2),
      duration: 3500,
      ease: 'inOutSine',
    })
    // FASE 4 — absorción hacia portal superior
    .add(card, {
      opacity:  0,
      scale:    0.05,
      rotateX:  68,
      rotateY:  isLeft ? -45 : 45,
      left:     endX,
      top:      endY,
      duration: 750,
      ease: 'inQuart',
      onComplete: () => card.remove(),
    })
}

let themeObserver: MutationObserver | null = null

onMounted(() => {
  loadGoogleMapsScript()
  setTimeout(() => spawnCard(), 500)
  setTimeout(() => spawnCard(), 3500)
  intervalId.value = setInterval(spawnCard, 5500)

  // Observar cambios en la clase del html para detectar cambio de tema
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => {
  if (intervalId.value) clearInterval(intervalId.value)
  if (alarmInterval) clearInterval(alarmInterval)
  if (themeObserver) themeObserver.disconnect()
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
      <div ref="mapContainerRef" class="w-full h-full scale-[1.2] grayscale-[0.1] brightness-[1.1] contrast-[1.1] transition-transform duration-500"></div>
      
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
  transition: all 0.3s ease;
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


