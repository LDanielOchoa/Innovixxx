<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Route01Icon,
  Settings02Icon,
  Location01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { fetchRutasApi, setRutaEstadoApi, fetchRutaDetallesApi } from '../services/rutas.api'
import type { Ruta } from '../types/ruta'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import AppButton from '../../../components/ui/AppButton.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppModal from '../../../components/ui/AppModal.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

const rutas = ref<Ruta[]>([])
const loading = ref(false)
const modalMessage = ref<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const { t } = useI18n()

const showModalMessage = (text: string, type: 'success' | 'error' | 'warning' = 'error') => {
  modalMessage.value = { text, type }
  if (type === 'success') {
    setTimeout(() => {
      if (modalMessage.value?.text === text) modalMessage.value = null
    }, 4000)
  }
}

const sortKey = ref<keyof Ruta>('nombre')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRutas.value.length / itemsPerPage)))

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

const fetchRutas = async () => {
  if (!selectedGroup.value?.id) {
    rutas.value = []
    return
  }
  loading.value = true
  try {
    rutas.value = await fetchRutasApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error al obtener rutas:', error)
    rutas.value = []
  } finally {
    loading.value = false
  }
}

const selectedRuta = ref<Ruta | null>(null)
const MAP_KEY = 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'
const map = shallowRef<any>(null)
const directionsService = shallowRef<any>(null)
const directionsRenderers = shallowRef<any[]>([])
const paradasMarkers = ref<any[]>([])
const paradasInfoWindows = ref<any[]>([])
const isLoadingMap = ref(true)
const isDarkMapMode = ref(document.documentElement.classList.contains('dark'))
const htmlClassObserver = ref<MutationObserver | null>(null)
const isLoadingRouteDetails = ref(false)

const themes = [
  {
    id: 'tactical',
    name: 'Tactical (Standard)',
    getStyle: (isDark: boolean) => {
      const land = isDark ? '#0f172a' : '#e2e8f0'
      const water = isDark ? '#020617' : '#cbd5e1'
      const road = isDark ? '#1e293b' : '#f1f5f9'
      const highway = isDark ? '#334155' : '#ffffff'
      const text = '#64748b'
      const accent = isDark ? '#3b82f6' : '#2563eb'

      return [
        { elementType: 'geometry', stylers: [{ color: land }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: land }, { weight: 2 }] },
        { elementType: 'labels.text.fill', stylers: [{ color: text }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: isDark ? '#020617' : '#d1d5db' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: road }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: highway }] },
        { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: accent }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: water }] }
      ]
    }
  }
]

const getMapStyle = (themeId: string, isDark: boolean = true) => {
  const theme = themes.find(t => t.id === themeId)
  return theme ? theme.getStyle(isDark) : []
}

const initializeMap = async (googleMapsApi: any) => {
  await nextTick() // Esperar a que el DOM esté listo
  const container = document.getElementById('google-map-container')
  if (!container) return

  isLoadingMap.value = false

  map.value = new googleMapsApi.Map(container, {
    center: { lat: 4.6097, lng: -74.0817 },
    zoom: 6,
    styles: getMapStyle('tactical', isDarkMapMode.value),
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
  })

  directionsService.value = new googleMapsApi.DirectionsService()
}

const loadGoogleMapsScript = () => {
  if ((window as any).google && (window as any).google.maps) {
    initializeMap((window as any).google.maps)
    return
  }
  
  // Si ya existe el script, esperar a que cargue
  const existingScript = document.getElementById('google-maps-script')
  if (existingScript) {
    existingScript.addEventListener('load', () => initializeMap((window as any).google.maps))
    return
  }

  const script = document.createElement('script')
  script.id = 'google-maps-script'
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_KEY}&libraries=places&language=es`
  script.async = true
  script.defer = true
  script.onload = () => {
    initializeMap((window as any).google.maps)
  }
  document.head.appendChild(script)
}

watch(isDarkMapMode, (isDark) => {
  if (map.value) {
    map.value.setOptions({ styles: getMapStyle('tactical', isDark) })
  }
})

const clearMap = () => {
  paradasInfoWindows.value.forEach(iw => {
    if (iw) { try { iw.close() } catch(e){} }
  })
  paradasInfoWindows.value = []
  
  paradasMarkers.value.forEach(m => {
    if (m) {
      try { m.setVisible(false); (window as any).google.maps.event.clearInstanceListeners(m); m.setMap(null); } catch(e){}
    }
  })
  paradasMarkers.value = []
  
  directionsRenderers.value.forEach(r => {
    if (r) { try { r.setMap(null) } catch(e){} }
  })
  directionsRenderers.value = []
}

const addParadaToMap = (lat: number, lon: number, tipoNombre: string, index: number, routeColor: string) => {
  if (!map.value || !(window as any).google) return

  const marker = new (window as any).google.maps.Marker({
    position: { lat, lng: lon },
    map: map.value,
    title: tipoNombre,
    zIndex: 100 + index,
    icon: {
      path: "M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z",
      fillColor: routeColor,
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 1.2,
      anchor: new (window as any).google.maps.Point(12, 36),
      labelOrigin: new (window as any).google.maps.Point(12, 12)
    },
    label: {
      text: (index + 1).toString(),
      color: 'white',
      fontSize: '11px',
      fontWeight: 'bold',
      fontFamily: "'Inter', sans-serif"
    },
    animation: (window as any).google.maps.Animation.DROP
  })
  
  const infoWindow = new (window as any).google.maps.InfoWindow({
    content: `<div style="color: #0d1116; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: bold; padding: 2px 4px; text-transform: uppercase;">${tipoNombre}</div>`
  })

  paradasInfoWindows.value.push(infoWindow)

  marker.addListener("mouseover", () => {
    infoWindow.open({ anchor: marker, map: map.value })
  })
  marker.addListener("mouseout", () => {
    infoWindow.close()
  })

  paradasMarkers.value.push(marker)
}

const drawExistingRoute = (paradas: any[], routeColor: string) => {
  if (!directionsService.value || paradas.length < 2) return

  const MAX_WAYPOINTS = 23
  const totalPoints = paradas.length
  const numChunks = Math.ceil((totalPoints - 1) / MAX_WAYPOINTS)

  for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
    const startIdx = chunkIndex * MAX_WAYPOINTS
    const endIdx = Math.min(startIdx + MAX_WAYPOINTS + 1, totalPoints)

    const chunk = paradas.slice(startIdx, endIdx)
    if (chunk.length < 2) continue

    const origin = chunk[0]
    const destination = chunk[chunk.length - 1]

    const waypoints = chunk.length > 2
      ? chunk.slice(1, -1).map((p: any) => ({
          location: { lat: p.lat, lng: p.lon },
          stopover: true
        }))
      : []

    const renderer = new (window as any).google.maps.DirectionsRenderer({
      map: map.value,
      suppressMarkers: true,
      preserveViewport: chunkIndex > 0,
      polylineOptions: {
        strokeColor: routeColor,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      }
    })
    
    directionsRenderers.value.push(renderer)
    
    directionsService.value.route({
      origin: { lat: origin.lat, lng: origin.lon },
      destination: { lat: destination.lat, lng: destination.lon },
      waypoints: waypoints,
      travelMode: (window as any).google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false
    }, (response: any, status: string) => {
      if (status === 'OK') {
        renderer.setDirections(response)
      } else if (waypoints.length > 0) {
        directionsService.value.route({
          origin: { lat: origin.lat, lng: origin.lon },
          destination: { lat: destination.lat, lng: destination.lon },
          travelMode: (window as any).google.maps.TravelMode.DRIVING
        }, (retryResponse: any, retryStatus: string) => {
          if (retryStatus === 'OK') renderer.setDirections(retryResponse)
        })
      }
    })
  }
}

const onRowClick = async (ruta: Ruta) => {
  if (selectedRuta.value?.id_ruta === ruta.id_ruta) return // Toggle o no volver a cargar
  selectedRuta.value = ruta
  
  if (!selectedGroup.value?.id || !map.value) return
  
  isLoadingRouteDetails.value = true
  clearMap()
  
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, ruta.id_ruta)
    if (detalle && detalle.paradas && detalle.paradas.length > 0) {
      const paradas = detalle.paradas.map(p => ({
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        tipo_nombre: p.tipo_nombre
      }))
      
      const routeColor = detalle.color || '#60a5fa'
      
      paradas.forEach((p, idx) => {
        addParadaToMap(p.lat, p.lon, p.tipo_nombre, idx, routeColor)
      })
      
      drawExistingRoute(paradas, routeColor)
      
      const firstParada = paradas[0]
      if (firstParada) {
        map.value.setCenter({ lat: firstParada.lat, lng: firstParada.lon })
        map.value.setZoom(13)
      }
    }
  } catch(e) {
    console.error('Error fetching ruta detalles:', e)
  } finally {
    isLoadingRouteDetails.value = false
  }
}

onMounted(() => {
  htmlClassObserver.value = new MutationObserver(() => {
    isDarkMapMode.value = document.documentElement.classList.contains('dark')
  })
  htmlClassObserver.value.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  loadGoogleMapsScript()
  fetchRutas()
})

onUnmounted(() => {
  htmlClassObserver.value?.disconnect()
  htmlClassObserver.value = null
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup && newGroup.id) {
    await fetchRutas()
  } else {
    rutas.value = []
  }
}, { immediate: true })

const filteredRutas = computed(() => {
  let result = [...rutas.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.nombre.toLowerCase().includes(query) ||
      (u.descripcion && u.descripcion.toLowerCase().includes(query)) ||
      u.id_ruta.toLowerCase().includes(query)
    )
  }
  return result
})

const paginatedRutas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredRutas.value.slice(start, start + itemsPerPage)
})

const exportToExcel = () => {
  const dataToExport = filteredRutas.value.map(u => ({
    'ID': u.id_ruta,
    'Nombre': u.nombre,
    'Descripción': u.descripcion,
    'Estado': u.estado
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rutas')
  XLSX.writeFile(workbook, 'Listado_Rutas.xlsx')
}

const openCreateModal = () => {
  router.push('/rutas/nueva')
}

const openEditModal = (ruta: Ruta) => {
  router.push(`/rutas/${ruta.id_ruta}/editar`)
}

const updatingEstadoId = ref<string | null>(null)
const isConfirmStatusModalOpen = ref(false)
const statusConfirmData = ref<{ ruta: Ruta | null, nuevoEstado: boolean }>({ ruta: null, nuevoEstado: false })

const toggleRutaEstado = (ruta: Ruta) => {
  if (!selectedGroup.value?.id || updatingEstadoId.value === ruta.id_ruta) return
  const nuevoEstado = ruta.estado !== 'Habilitada'
  statusConfirmData.value = { ruta, nuevoEstado }
  isConfirmStatusModalOpen.value = true
}

const processToggleEstado = async () => {
  const { ruta, nuevoEstado } = statusConfirmData.value
  if (!ruta || !selectedGroup.value?.id) return
  isConfirmStatusModalOpen.value = false
  updatingEstadoId.value = ruta.id_ruta
  try {
    const result = await setRutaEstadoApi(selectedGroup.value.id, ruta.id_ruta, nuevoEstado)
    if (result.done) {
      const index = rutas.value.findIndex(r => r.id_ruta === ruta.id_ruta)
      if (index !== -1) {
        rutas.value[index].estado = nuevoEstado ? 'Habilitada' : 'Deshabilitada'
      }
    }
  } finally {
    updatingEstadoId.value = null
  }
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] w-full p-3 md:p-5 lg:p-6 animate-fade-in">
    <div class="relative w-full h-full rounded-[1.75rem] overflow-hidden shadow-2xl">
      
      <!-- MAP: ocupa todo el espacio del contenedor relativo -->
      <div
        id="google-map-container"
        class="absolute inset-0 z-0"
        style="width:100%;height:100%;"
      ></div>

      <!-- Overlay Carga Mapa -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingMap" 
          class="absolute inset-0 z-[8] flex flex-col items-center justify-center bg-[#0d1116] gap-5"
          style="padding-left:440px"
        >
          <div class="w-16 h-16 rounded-2xl bg-[#1A1D24] border border-white/10 flex items-center justify-center text-[#5da6fc] shadow-xl animate-[float_3s_ease-in-out_infinite]">
            <HugeiconsIcon :icon="Location01Icon" :size="32" :stroke-width="1.5" />
          </div>
          <p class="text-[11px] font-black text-[#5da6fc] uppercase tracking-[0.25em] animate-pulse">{{ $t('rutas.initializingMap') }}</p>
        </div>
      </Transition>

      <!-- Overlay Trazando Ruta -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingRouteDetails" 
          class="absolute z-[8] flex items-end justify-end"
          style="bottom:24px;right:24px;"
        >
          <div class="bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-xl px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl flex items-center gap-4">
            <div class="relative w-10 h-10 flex items-center justify-center shrink-0">
              <div class="absolute inset-0 border-[3px] border-[#3b82f6]/15 border-t-[#3b82f6] rounded-full animate-spin"></div>
              <HugeiconsIcon :icon="Route01Icon" :size="16" class="text-[#3b82f6]" />
            </div>
            <div>
              <p class="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-wider">Trazando ruta</p>
              <p class="text-[10px] font-medium text-slate-400 mt-0.5">{{ selectedRuta?.nombre }}</p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Hint mapa vacio -->
      <Transition name="fade-overlay">
        <div
          v-if="!isLoadingMap && !selectedRuta && !isLoadingRouteDetails"
          class="absolute z-[6] flex items-end justify-end pointer-events-none"
          style="bottom:24px;right:24px;"
        >
          <div class="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-xl px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-xl flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6]">
              <HugeiconsIcon :icon="Location01Icon" :size="16" :stroke-width="1.5" />
            </div>
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Selecciona una ruta para ver su trayectoria</p>
          </div>
        </div>
      </Transition>

      <!-- FLOATING SIDEBAR -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[340px] md:w-[380px] lg:w-[420px] flex flex-col">
        <!-- Glassmorphic panel -->
        <div class="flex-1 flex flex-col m-3 rounded-[1.25rem] bg-white/90 dark:bg-[#0C0E13]/95 backdrop-blur-2xl border border-slate-200/70 dark:border-white/[0.06] shadow-[0_20px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          
          <!-- Header -->
          <div class="relative px-5 pt-6 pb-5 border-b border-slate-100 dark:border-white/[0.05] shrink-0 overflow-hidden">
            <!-- Fondo decorativo -->
            <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.06] via-transparent to-transparent pointer-events-none"></div>
            <div class="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <div class="relative flex items-start justify-between">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(59,130,246,0.35)]">
                  <HugeiconsIcon :icon="Route01Icon" :size="20" :stroke-width="2" />
                </div>
                <div>
                  <h1 class="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{{ $t('rutas.title') }}</h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.15em] mt-1">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      {{ filteredRutas.length }} rutas activas
                    </span>
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button @click="exportToExcel"
                  class="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 hover:border-[#3b82f6]/20 transition-all active:scale-95 shadow-sm"
                  title="Exportar">
                  <HugeiconsIcon :icon="Download01Icon" :size="16" :stroke-width="2" />
                </button>
                <button @click="openCreateModal"
                  class="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] transition-all active:scale-95 border border-[#2563eb]"
                  title="Nueva Ruta">
                  <HugeiconsIcon :icon="PlusSignIcon" :size="18" :stroke-width="2.5" />
                </button>
              </div>
            </div>

            <!-- Search -->
            <div class="relative mt-5">
              <AppSearch v-model="searchQuery" :placeholder="$t('rutas.searchPlaceholder')" />
            </div>
          </div>

          <!-- Lista de rutas -->
          <div class="flex-1 overflow-y-auto rutas-scrollbar px-4 py-4 space-y-2">
            
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-10 h-10 border-[3px] border-[#3b82f6]/15 border-t-[#3b82f6] rounded-full animate-spin"></div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando...</p>
            </div>
            
            <!-- Empty -->
            <div v-else-if="filteredRutas.length === 0" class="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/[0.03] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/[0.05]">
                <HugeiconsIcon :icon="Search01Icon" :size="28" :stroke-width="1.5" />
              </div>
              <div>
                <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">Sin resultados</p>
                <p class="text-[11px] font-medium text-slate-400 mt-1">Prueba con otro término</p>
              </div>
            </div>
            
            <!-- Rutas -->
            <template v-else>
              <div
                v-for="ruta in paginatedRutas"
                :key="ruta.id_ruta"
                @click="onRowClick(ruta)"
                class="group relative cursor-pointer rounded-2xl transition-all duration-300 select-none border"
                :class="selectedRuta?.id_ruta === ruta.id_ruta
                  ? 'bg-white dark:bg-[#15181E] shadow-[0_8px_30px_rgba(59,130,246,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)] border-[#3b82f6]/40 dark:border-[#3b82f6]/30 translate-x-1 ring-1 ring-[#3b82f6]/20'
                  : 'bg-slate-50/60 dark:bg-white/[0.01] border-transparent dark:border-white/[0.02] hover:bg-white dark:hover:bg-[#1A1D24]/80 hover:border-slate-300 dark:hover:border-white/[0.08] shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.02)]'"
              >
                <!-- Barra lateral activa -->
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] shadow-[1px_0_12px_rgba(59,130,246,0.8)] transition-all duration-400"
                  :class="selectedRuta?.id_ruta === ruta.id_ruta ? 'opacity-100 h-[70%]' : 'opacity-0 h-0'"
                ></div>

                <div class="pl-5 pr-4 py-4">
                  <div class="flex items-center gap-3.5">
                    <!-- Icon -->
                    <div
                      class="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-all duration-300 border"
                      :class="selectedRuta?.id_ruta === ruta.id_ruta
                        ? 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-white border-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_16px_rgba(59,130,246,0.4)]'
                        : 'bg-white dark:bg-[#1A1D24] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.02)] group-hover:text-[#3b82f6] dark:group-hover:text-[#5da6fc] group-hover:border-[#3b82f6]/30'"
                    >
                      <HugeiconsIcon :icon="Route01Icon" :size="22" :stroke-width="1.8" />
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <h3
                          class="text-[13px] font-black uppercase tracking-tight truncate transition-colors duration-200"
                          :class="selectedRuta?.id_ruta === ruta.id_ruta ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-800 dark:text-white'"
                        >{{ ruta.nombre }}</h3>
                        
                        <!-- Edit btn (hover/active) -->
                        <button
                          @click.stop="openEditModal(ruta)"
                          class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] hover:bg-gradient-to-b hover:from-[#3b82f6] hover:to-[#2563eb] hover:border-[#2563eb] hover:text-white hover:shadow-[0_4px_12px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 active:scale-95"
                          :class="selectedRuta?.id_ruta === ruta.id_ruta ? '!opacity-100 !translate-x-0' : ''"
                          :title="$t('rutas.tooltipEdit')"
                        >
                          <HugeiconsIcon :icon="Edit02Icon" :size="14" :stroke-width="2.5" />
                        </button>
                      </div>

                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">{{ ruta.id_ruta }}</span>
                        <span class="text-slate-200 dark:text-white/10">·</span>
                        <span class="text-[10px] font-medium text-slate-400 truncate" :title="ruta.descripcion">{{ ruta.descripcion || 'Sin descripción' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <div
                      class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.15em] transition-colors shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                      :class="ruta.estado === 'Habilitada'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.1)]'
                        : 'bg-slate-100/80 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-500'"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" :class="ruta.estado === 'Habilitada' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                      {{ ruta.estado === 'Habilitada' ? $t('rutas.statusEnabled') : $t('rutas.statusDisabled') }}
                    </div>

                    <button
                      @click.stop="toggleRutaEstado(ruta)"
                      class="w-8 h-8 flex items-center justify-center rounded-xl transition-all text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1E232E] border border-slate-200 dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)] hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#252A36] active:scale-95"
                      :title="ruta.estado === 'Habilitada' ? $t('rutas.tooltipDisable') : $t('rutas.tooltipEnable')"
                    >
                      <HugeiconsIcon :icon="Settings02Icon" :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer / Pagination -->
          <div v-if="filteredRutas.length > itemsPerPage" class="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-white/[0.05] flex justify-center">
            <AppPagination
              :totalRecords="filteredRutas.length"
              v-model:currentPage="currentPage"
              :rowsPerPage="itemsPerPage"
            />
          </div>
          
          <!-- Info footer -->
          <div class="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {{ filteredRutas.length > 0 ? `Mostrando ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredRutas.length)}–${Math.min(currentPage * itemsPerPage, filteredRutas.length)} de ${filteredRutas.length}` : 'Sin rutas' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Confirmación Estado -->
    <AppModal
      v-model:isOpen="isConfirmStatusModalOpen"
      :title="statusConfirmData.nuevoEstado ? $t('rutas.modalEnableTitle') : $t('rutas.modalDisableTitle')"
      :confirmText="statusConfirmData.nuevoEstado ? $t('rutas.btnEnable') : $t('rutas.btnDisable')"
      :confirmButtonClass="statusConfirmData.nuevoEstado ? 'bg-green-500' : 'bg-red-500'"
      :cancelText="$t('rutas.btnCancel')"
      @confirm="processToggleEstado"
    >
      <template #icon>
        <div :class="statusConfirmData.nuevoEstado ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'" class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors border border-current opacity-30">
          <HugeiconsIcon :icon="Route01Icon" :size="24" />
        </div>
      </template>
      <div class="py-4 flex flex-col items-center text-center gap-6">
        <p class="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-[280px]">
          {{ $t('rutas.confirmStatusChange', { action: statusConfirmData.nuevoEstado ? $t('rutas.actionEnable') : $t('rutas.actionDisable') }) }}
        </p>
        <div class="px-5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
          <span class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{{ statusConfirmData.ruta?.nombre }}</span>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scrollbar del panel lateral */
.rutas-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.18) transparent;
}
.rutas-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.rutas-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.rutas-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.18);
  border-radius: 10px;
}
.rutas-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}

/* Google Maps attribution */
#google-map-container :deep(.gm-style-cc),
#google-map-container :deep(.gmnoprint),
#google-map-container :deep(a[href^="https://maps.google.com/maps"]) {
  display: none !important;
}

/* Transición overlays */
.fade-overlay-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-overlay-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-overlay-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-overlay-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
