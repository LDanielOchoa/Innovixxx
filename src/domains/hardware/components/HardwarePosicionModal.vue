<script setup lang="ts">
import { ref, watch, shallowRef, nextTick, computed, onUnmounted } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Location01Icon,
  Calendar01Icon,
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
  FastWindIcon
} from '@hugeicons/core-free-icons'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import { fetchMapPositionsApi } from '../services/hardware.api'
import type { Hardware, Posicion } from '../types/hardware'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppDateRangePicker from '../../../components/ui/AppDateRangePicker.vue'

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
  isDarkMapMode
} = useMapSetup('hardware-posicion-map-container', {
  defaultZoom: 13,
  gestureHandling: 'cooperative'
})

const posiciones = ref<Posicion[]>([])
const isLoading = ref(false)
const mapReady = ref(false)
const markers = shallowRef<google.maps.Marker[]>([])
const polyline = shallowRef<google.maps.Polyline | null>(null)
const playbackMarker = shallowRef<google.maps.Marker | null>(null)
const playbackPath = shallowRef<google.maps.LatLngLiteral[]>([])

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

const getLastWeek = () => {
  const today = new Date()
  const lastWeek = new Date(today)
  lastWeek.setDate(today.getDate() - 7)
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(lastWeek), end: fmt(today) }
}

const fechaRango = ref(getLastWeek())

const close = () => {
  stopPlayback()
  emit('update:isOpen', false)
}

const fetchPosiciones = async () => {
  if (!props.hardware || !selectedGroup.value?.id) return
  stopPlayback()
  isLoading.value = true
  posiciones.value = []
  clearMapElements()

  try {
    const desde = `${fechaRango.value.start} 00:00:00`
    const hasta = `${fechaRango.value.end} 23:59:59`
    posiciones.value = await fetchMapPositionsApi({
      id_hardware: props.hardware.id_hardware,
      id_grupo: selectedGroup.value.id,
      desde,
      hasta
    })
    await nextTick()
    drawPositions()
  } catch (error) {
    console.error('Error fetching positions:', error)
  } finally {
    isLoading.value = false
  }
}

const clearMapElements = () => {
  markers.value.forEach(m => m.setMap(null))
  markers.value = []
  if (polyline.value) {
    polyline.value.setMap(null)
    polyline.value = null
  }
  if (playbackMarker.value) {
    playbackMarker.value.setMap(null)
    playbackMarker.value = null
  }
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

const drawPositions = () => {
  if (!map.value || !posiciones.value.length) return
  const google = (window as any).google

  clearMapElements()

  const bounds = new google.maps.LatLngBounds()
  const newMarkers: google.maps.Marker[] = []
  const path: google.maps.LatLngLiteral[] = []

  posiciones.value.forEach((pos) => {
    const lat = parseFloat(pos.lat)
    const lng = parseFloat(pos.lon)
    if (isNaN(lat) || isNaN(lng)) return
    const latLng = { lat, lng }
    path.push(latLng)
    bounds.extend(latLng)
  })

  playbackPath.value = path

  const simplified = douglasPeucker(path, 0.0008)
  const simplifiedSet = new Set(simplified.map(p => `${p.lat},${p.lng}`))

  path.forEach((latLng, index) => {
    const key = `${latLng.lat},${latLng.lng}`
    const isFirst = index === 0
    const isLast = index === path.length - 1
    const isSimplified = simplifiedSet.has(key)

    if (!isFirst && !isLast && !isSimplified) return

    const marker = new google.maps.Marker({
      position: latLng,
      map: map.value,
      title: isFirst || isLast ? formatUnixTime(posiciones.value[index]?.time_dv || '') : undefined,
      icon: isFirst
        ? {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        : isLast
          ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          : {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1
            }
    })

    const pos = posiciones.value[index]
    if (pos) {
      const infoContent = `
        <div style="font-family:Inter,sans-serif;padding:4px 2px;min-width:180px;">
          <div style="font-size:12px;font-weight:700;color:#1e293b;margin-bottom:6px;">
            ${formatUnixTime(pos.time_dv)}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;">
            <span style="color:#64748b;">Velocidad</span>
            <span style="font-weight:600;color:#1e293b;">${pos.speed} km/h</span>
            <span style="color:#64748b;">Batería</span>
            <span style="font-weight:600;color:#1e293b;">${pos.battery}%</span>
            <span style="color:#64748b;">Dirección</span>
            <span style="font-weight:600;color:#1e293b;">${pos.course}°</span>
            ${pos.sos === 'True' ? '<span style="color:#ef4444;font-weight:700;grid-column:span 2;">SOS ACTIVO</span>' : ''}
          </div>
        </div>
      `
      const infoWindow = new google.maps.InfoWindow({ content: infoContent })
      marker.addListener('click', () => {
        infoWindow.open(map.value, marker)
      })
    }

    newMarkers.push(marker)
  })

  markers.value = newMarkers

  if (path.length > 1) {
    polyline.value = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: isDarkMapMode.value ? '#5da6fc' : '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: map.value
    })
  }

  if (path.length > 0) {
    playbackMarker.value = new google.maps.Marker({
      position: path[0],
      map: map.value,
      zIndex: 999,
      icon: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5
      }
    })
  }

  currentIndex.value = 0
  smoothProgress.value = 0
  updatePlaybackData(0)

  if (!bounds.isEmpty()) {
    map.value.fitBounds(bounds)
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
  if (pos) {
    playbackMarker.value?.setPosition(pos)
  }
  const data = getInterpolatedData(progress)
  batteryPercentage.value = data.battery
  currentSpeed.value = data.speed
  currentCourse.value = Math.round(data.course)
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
    fetchPosiciones()
  }, 150)
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fechaRango.value = getLastWeek()
    posiciones.value = []
    initializeMap()
  } else {
    stopPlayback()
    clearMapElements()
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

const positionCount = computed(() => posiciones.value.length)

const renderedMarkerCount = computed(() => {
  if (!posiciones.value.length) return 0
  const path: google.maps.LatLngLiteral[] = []
  posiciones.value.forEach((pos) => {
    const lat = parseFloat(pos.lat)
    const lng = parseFloat(pos.lon)
    if (!isNaN(lat) && !isNaN(lng)) path.push({ lat, lng })
  })
  if (path.length <= 2) return path.length
  const simplified = douglasPeucker(path, 0.0008)
  return simplified.length
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

const perpendicularDistance = (point: google.maps.LatLngLiteral, lineStart: google.maps.LatLngLiteral, lineEnd: google.maps.LatLngLiteral): number => {
  const dx = lineEnd.lng - lineStart.lng
  const dy = lineEnd.lat - lineStart.lat
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((point.lat - lineStart.lat) ** 2 + (point.lng - lineStart.lng) ** 2)
  const t = ((point.lat - lineStart.lat) * dy + (point.lng - lineStart.lng) * dx) / lenSq
  const projLat = lineStart.lat + t * dy
  const projLng = lineStart.lng + t * dx
  return Math.sqrt((point.lat - projLat) ** 2 + (point.lng - projLng) ** 2)
}

const douglasPeucker = (points: google.maps.LatLngLiteral[], tolerance: number): google.maps.LatLngLiteral[] => {
  if (points.length <= 2) return points
  let maxDist = 0
  let maxIndex = 0
  const start = points[0]
  const end = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }
  return [start, end]
}

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
  if (!posA?.time_dv) return '--:--'
  const timeA = parseInt(posA.time_dv) * 1000
  const timeB = parseInt(posB.time_dv) * 1000
  const interpTime = lerp(timeA, timeB, frac)
  const date = new Date(interpTime)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

const totalTimeDisplay = computed(() => {
  if (!posiciones.value.length) return '--:--'
  const pos = posiciones.value[posiciones.value.length - 1]
  if (!pos?.time_dv) return '--:--'
  return formatUnixTimeOnly(pos.time_dv)
})

const currentDateDisplay = computed(() => {
  if (!posiciones.value.length) return ''
  const scaled = smoothProgress.value * (posiciones.value.length - 1)
  const idx = Math.floor(scaled)
  const pos = posiciones.value[Math.min(idx, posiciones.value.length - 1)]
  if (!pos?.time_dv) return ''
  const date = new Date(parseInt(pos.time_dv) * 1000)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
})

onUnmounted(() => {
  stopPlayback()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-[#0F1115]">
      <div class="flex items-center justify-between px-5 py-3 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center">
            <HugeiconsIcon :icon="Location01Icon" :size="18" class="text-[#3b82f6] dark:text-[#5da6fc]" />
          </div>
          <div>
            <h3 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">{{ hardware?.nombre || 'Dispositivo' }}</h3>
            <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{{ hardware?.serial }}</span>
          </div>
        </div>
        <button @click="close" class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="flex-1 relative flex flex-col">
        <div id="hardware-posicion-map-container" class="absolute inset-0 z-0" style="width:100%;height:100%;"></div>

        <div v-if="isLoadingMap" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-[#0F1115]/80">
          <div class="flex flex-col items-center gap-3">
            <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-[#3b82f6] animate-spin" />
            <span class="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Cargando mapa...</span>
          </div>
        </div>

        <div class="absolute top-4 left-4 z-20 flex items-start gap-3" style="right: 180px;">
          <div class="bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] px-4 py-3 flex items-center gap-3 flex-1 max-w-xl">
            <HugeiconsIcon :icon="Calendar01Icon" :size="16" class="text-[#3b82f6] dark:text-[#5da6fc] shrink-0" />
            <div class="flex-1 min-w-0">
              <AppDateRangePicker v-model="fechaRango" placeholder="Rango de fechas" />
            </div>
            <button
              @click="fetchPosiciones"
              :disabled="isLoading"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <HugeiconsIcon v-if="isLoading" :icon="Loading02Icon" :size="14" class="animate-spin" />
              <span>{{ isLoading ? 'Cargando...' : 'Consultar' }}</span>
            </button>
          </div>
        </div>

        <div v-if="positionCount > 0" class="absolute top-[72px] left-4 z-20 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] px-4 py-3 max-w-xs">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Posiciones</span>
            <span class="text-[11px] font-bold text-[#3b82f6] dark:text-[#5da6fc] bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 px-2 py-0.5 rounded-full">{{ positionCount }}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">({{ renderedMarkerCount }} marcadores)</span>
          </div>
          <div class="space-y-1.5 text-[11px]">
            <div v-if="firstPosition" class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="text-slate-500 dark:text-slate-400">Inicio:</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ formatUnixTime(firstPosition.time_dv) }}</span>
            </div>
            <div v-if="lastPosition" class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span class="text-slate-500 dark:text-slate-400">Fin:</span>
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ formatUnixTime(lastPosition.time_dv) }}</span>
            </div>
          </div>
        </div>

        <div v-if="isLoading && !isLoadingMap" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/40 dark:bg-[#0F1115]/40">
          <div class="flex flex-col items-center gap-3 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl rounded-2xl px-6 py-4 border border-slate-200/60 dark:border-white/10 shadow-xl">
            <HugeiconsIcon :icon="Loading02Icon" :size="28" class="text-[#3b82f6] animate-spin" />
            <span class="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Cargando posiciones...</span>
          </div>
        </div>

        <div v-if="batteryPercentage !== null || currentSpeed !== null || currentCourse !== null" class="absolute top-[72px] right-4 z-20 bg-[#1e2128]/90 dark:bg-[#1A1D24]/90 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden min-w-[160px]">
          <div class="flex flex-col divide-y divide-white/5">
            <div class="flex flex-col items-center gap-1.5 px-5 py-4">
              <HugeiconsIcon :icon="batteryIcon" :size="28" :class="batteryColor" />
              <span class="text-[24px] font-bold text-white tabular-nums leading-none">{{ batteryPercentage ?? 0 }}%</span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">Batería</span>
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
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">km/h</span>
            </div>
            <div class="flex flex-col items-center gap-1.5 px-5 py-4">
              <div class="relative w-14 h-14">
                <svg viewBox="0 0 64 64" class="w-full h-full">
                  <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" class="text-white/10" stroke-width="2"/>
                  <text x="32" y="12" text-anchor="middle" class="text-[9px] font-bold fill-slate-500">N</text>
                  <text x="32" y="58" text-anchor="middle" class="text-[9px] font-bold fill-slate-600">S</text>
                  <text x="8" y="36" text-anchor="middle" class="text-[9px] font-bold fill-slate-600">O</text>
                  <text x="56" y="36" text-anchor="middle" class="text-[9px] font-bold fill-slate-600">E</text>
                </svg>
                <div
                  class="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                  :style="{ transform: `rotate(${currentCourse ?? 0}deg)` }"
                >
                  <svg viewBox="0 0 24 24" class="w-7 h-7">
                    <path d="M12 2L15 10L12 8L9 10L12 2Z" fill="#ef4444"/>
                    <path d="M12 22L9 14L12 16L15 14L12 22Z" fill="#64748b"/>
                  </svg>
                </div>
              </div>
              <span class="text-[20px] font-bold text-white tabular-nums leading-none">{{ currentCourse ?? 0 }}°</span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">Dirección</span>
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
                  class="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                  title="Retroceder"
                >
                  <HugeiconsIcon :icon="ArrowLeftDoubleIcon" :size="16" />
                </button>
                <button
                  @click="togglePlayback"
                  class="w-11 h-11 flex items-center justify-center rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all active:scale-95 shadow-lg shadow-[#3b82f6]/30"
                  :title="isPlaying ? 'Pausar' : 'Reproducir'"
                >
                  <HugeiconsIcon :icon="isPlaying ? PauseIcon : PlayIcon" :size="22" />
                </button>
                <button
                  @click="skipForward"
                  class="w-7 h-7 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                  title="Adelantar"
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
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Velocidad de reproducción"
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
  </Teleport>
</template>

<style scoped>
</style>
