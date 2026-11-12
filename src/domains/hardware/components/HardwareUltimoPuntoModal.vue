<script setup lang="ts">
import { ref, watch, shallowRef, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Location01Icon,
  Loading02Icon,
  BatteryFullIcon,
  BatteryMedium01Icon,
  BatteryLowIcon,
  BatteryEmptyIcon,
  Clock01Icon,
  MapsIcon
} from '@hugeicons/core-free-icons'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import type { Hardware } from '../types/hardware'

const { t } = useI18n()

const props = defineProps<{
  isOpen: boolean
  hardware: Hardware | null
}>()

const emit = defineEmits(['update:isOpen'])

const { loadGoogleMaps } = useGoogleMaps()
const {
  map,
  isLoadingMap,
  initMap,
  startDarkModeObserver,
  currentMapType,
  setMapType
} = useMapSetup('hardware-ultimo-punto-map-container', {
  defaultZoom: 16,
  gestureHandling: 'greedy',
  mapId: '688c00fbadb30bbb930f73e2'
})

const mapReady = ref(false)
const markerRef = shallowRef<any>(null)
const infoWindowRef = shallowRef<any>(null)

const hasValidCoords = computed(() => {
  if (!props.hardware) return false
  const lat = parseFloat(String(props.hardware.ultimo_lat))
  const lon = parseFloat(String(props.hardware.ultimo_lon))
  return !isNaN(lat) && !isNaN(lon)
})

const parsedCoords = computed(() => {
  if (!hasValidCoords.value || !props.hardware) return null
  return {
    lat: parseFloat(String(props.hardware.ultimo_lat)),
    lng: parseFloat(String(props.hardware.ultimo_lon))
  }
})

const batteryPercentage = computed(() => {
  if (!props.hardware || props.hardware.bateria === undefined || props.hardware.bateria === null || props.hardware.bateria === '') {
    return null
  }
  const num = Number(props.hardware.bateria)
  return isNaN(num) ? null : Math.min(Math.max(num, 0), 100)
})

const batteryIcon = computed(() => {
  const p = batteryPercentage.value
  if (p === null) return BatteryEmptyIcon
  if (p >= 75) return BatteryFullIcon
  if (p >= 40) return BatteryMedium01Icon
  if (p >= 15) return BatteryLowIcon
  return BatteryEmptyIcon
})

const batteryColor = computed(() => {
  const p = batteryPercentage.value
  if (p === null) return 'text-slate-400 dark:text-slate-500'
  if (p >= 50) return 'text-emerald-500 dark:text-emerald-400'
  if (p >= 20) return 'text-amber-500 dark:text-amber-400'
  return 'text-rose-500 dark:text-rose-400'
})

const close = () => {
  emit('update:isOpen', false)
}

const clearMapElements = () => {
  if (infoWindowRef.value) {
    try {
      infoWindowRef.value.close()
    } catch (_) {}
    infoWindowRef.value = null
  }
  if (markerRef.value) {
    try {
      if (typeof markerRef.value.setMap === 'function') {
        markerRef.value.setMap(null)
      } else {
        markerRef.value.map = null
      }
    } catch (_) {}
    markerRef.value = null
  }
}

const drawLastPoint = () => {
  if (!map.value || !parsedCoords.value || !props.hardware) return
  const google = (window as any).google
  if (!google?.maps) return

  clearMapElements()

  const pos = parsedCoords.value
  map.value.setCenter(pos)
  map.value.setZoom(16)

  const marker = new google.maps.Marker({
    position: pos,
    map: map.value,
    title: `${props.hardware.nombre || t('hardware.device')} — ${props.hardware.ultimo_reporte || ''}`,
    zIndex: 100,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#3b82f6',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3
    }
  })

  const reporteText = props.hardware.ultimo_reporte || '---'
  const batText = batteryPercentage.value !== null ? `${batteryPercentage.value}%` : '---'
  const infoContent = `
    <div style="font-family:Inter,sans-serif;padding:6px 4px;min-width:195px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:#3b82f6;flex-shrink:0;"></span>
        <span>${props.hardware.nombre || t('hardware.device')}</span>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:11px;">
        <span style="color:#64748b;">${t('hardware.lastReportTime')}:</span>
        <span style="font-weight:700;color:#0f172a;font-family:monospace;">${reporteText}</span>
        <span style="color:#64748b;">${t('hardware.battery')}:</span>
        <span style="font-weight:700;color:#0f172a;">${batText}</span>
        <span style="color:#64748b;">Lat / Lon:</span>
        <span style="font-weight:700;color:#0f172a;font-family:monospace;">${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}</span>
      </div>
    </div>
  `
  const infoWindow = new google.maps.InfoWindow({ content: infoContent })
  marker.addListener('click', () => {
    infoWindow.open(map.value, marker)
  })

  markerRef.value = marker
  infoWindowRef.value = infoWindow
}

const initializeMap = async () => {
  const googleMapsApi = await loadGoogleMaps()
  setTimeout(() => {
    initMap(googleMapsApi)
    startDarkModeObserver()
    mapReady.value = true
    drawLastPoint()
  }, 150)
}

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    clearMapElements()
    initializeMap()
  } else {
    clearMapElements()
    mapReady.value = false
  }
})

onUnmounted(() => {
  clearMapElements()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col bg-slate-100 dark:bg-[#0F1115]">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc]">
            <HugeiconsIcon :icon="Location01Icon" :size="20" class="text-[#3b82f6] dark:text-[#5da6fc]" />
          </div>
          <div>
            <h3 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight">
              {{ t('hardware.lastPointModalTitle') }} — {{ hardware?.nombre || t('hardware.device') }}
            </h3>
            <span class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{{ hardware?.serial || hardware?.id_hardware }}</span>
          </div>
        </div>
        <button
          @click="close"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body / Map -->
      <div class="flex-1 relative flex flex-col">
        <div id="hardware-ultimo-punto-map-container" class="absolute inset-0 z-0" style="width:100%;height:100%;"></div>

        <!-- Selector de Tipo de Mapa Flotante -->
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

        <!-- Loading Map -->
        <div v-if="isLoadingMap" class="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-[#0F1115]/80">
          <div class="flex flex-col items-center gap-3">
            <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-[#3b82f6] animate-spin" />
            <span class="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{{ t('hardware.loadingMap') }}</span>
          </div>
        </div>

        <!-- Tarjeta Flotante con Información del Último Reporte -->
        <div
          v-if="hasValidCoords && parsedCoords"
          class="absolute top-4 left-4 z-20 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] px-4 py-3.5 max-w-sm"
        >
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <HugeiconsIcon :icon="Clock01Icon" :size="15" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {{ t('hardware.lastReportTime') }}
                </span>
              </div>
              <span class="font-mono text-[12px] font-bold text-slate-800 dark:text-white">
                {{ hardware?.ultimo_reporte || '---' }}
              </span>
            </div>

            <div class="h-px bg-slate-200/60 dark:bg-white/5"></div>

            <div class="flex items-center justify-between gap-4 text-[11px]">
              <span class="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                {{ t('hardware.coordinates') }}
              </span>
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {{ parsedCoords.lat.toFixed(6) }}, {{ parsedCoords.lng.toFixed(6) }}
              </span>
            </div>

            <div v-if="batteryPercentage !== null" class="flex items-center justify-between gap-4 text-[11px]">
              <span class="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                {{ t('hardware.battery') }}
              </span>
              <div class="flex items-center gap-1.5">
                <HugeiconsIcon :icon="batteryIcon" :size="14" :class="batteryColor" />
                <span class="font-bold" :class="batteryColor">{{ batteryPercentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Aviso cuando no hay coordenadas -->
        <div
          v-else-if="!isLoadingMap"
          class="absolute top-4 left-4 z-20 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-lg px-4 py-3 max-w-sm"
        >
          <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {{ t('hardware.noLastPositionAvailable') }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

