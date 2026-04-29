<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Settings02Icon,
  Location01Icon,
  MapsIcon,
  Delete02Icon,
  CircleIcon,
  SquareIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { fetchGeocercasApi, fetchGeocercaDetallesApi, deleteGeocercaApi } from '../services/geocercas.api'
import type { Geocerca, GeocercaDetalle } from '../types/geocerca'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../rutas/composables/useGoogleMaps'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)
const { t } = useI18n()

const geocercas = ref<Geocerca[]>([])
const loading = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')

const currentPage = ref(1)
const itemsPerPage = 10

const fetchGeocercas = async () => {
  if (!selectedGroup.value?.id) {
    geocercas.value = []
    return
  }
  loading.value = true
  try {
    geocercas.value = await fetchGeocercasApi(selectedGroup.value.id)
  } catch (error) {
    console.error('Error al obtener geocercas:', error)
    geocercas.value = []
  } finally {
    loading.value = false
  }
}

// Google Maps Setup (Pattern from RutasListView)
const { loadGoogleMaps } = useGoogleMaps()
const map = shallowRef<any>(null)
const isLoadingMap = ref(true)
const isDarkMapMode = ref(document.documentElement.classList.contains('dark'))
const htmlClassObserver = ref<MutationObserver | null>(null)

const themes = [
  {
    id: 'tactical',
    name: 'Tactical',
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

const initializeMap = async (googleMapsApi: any) => {
  await nextTick()
  const container = document.getElementById('geocercas-map-container')
  if (!container) return

  // Darle tiempo a la animación de carga inicial para que se vea premium
  await new Promise(resolve => setTimeout(resolve, 2000))

  isLoadingMap.value = false
  map.value = new googleMapsApi.Map(container, {
    center: { lat: 4.6097, lng: -74.0817 },
    zoom: 6,
    styles: themes[0].getStyle(isDarkMapMode.value),
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
  })
}

onMounted(() => {
  htmlClassObserver.value = new MutationObserver(() => {
    isDarkMapMode.value = document.documentElement.classList.contains('dark')
    if (map.value) {
      map.value.setOptions({ styles: themes[0].getStyle(isDarkMapMode.value) })
    }
  })
  htmlClassObserver.value.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    isLoadingMap.value = false
  })

  fetchGeocercas()
})

onUnmounted(() => {
  htmlClassObserver.value?.disconnect()
})

watch(selectedGroup, async (newGroup) => {
  if (newGroup?.id) {
    await fetchGeocercas()
  } else {
    geocercas.value = []
  }
}, { immediate: true })

const filteredGeocercas = computed(() => {
  let result = [...geocercas.value]
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(g =>
      g.nombre.toLowerCase().includes(query) ||
      g.descripcion.toLowerCase().includes(query) ||
      g.id_geocerca.toLowerCase().includes(query)
    )
  }
  return result
})

const paginatedGeocercas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredGeocercas.value.slice(start, start + itemsPerPage)
})

const selectedGeocerca = ref<Geocerca | null>(null)
const currentDrawing = shallowRef<any>(null)
const isLoadingDetails = ref(false)

const clearDrawings = () => {
  if (currentDrawing.value) {
    currentDrawing.value.setMap(null)
    currentDrawing.value = null
  }
}

// Custom Cinematic Fly-To Animation
const flyToMap = async (mapInstance: any, targetLatLng: any, targetZoom: number | null, bounds?: any) => {
  return new Promise<void>((resolve) => {
    const startZoom = mapInstance.getZoom()
    const startCenter = mapInstance.getCenter()
    
    // Si estamos muy cerca, usar nativo para evitar salto brusco
    const dist = (window as any).google.maps.geometry.spherical.computeDistanceBetween(startCenter, targetLatLng)
    if (dist < 2000 && startZoom >= 13) {
      mapInstance.panTo(targetLatLng)
      setTimeout(() => {
        if (bounds) mapInstance.fitBounds(bounds)
        else mapInstance.setZoom(targetZoom)
        resolve()
      }, 500)
      return
    }

    const duration = 1800 // 1.8 seconds cinematic flight
    const startTime = performance.now()
    
    // Zoom out farther if distance is huge
    const finalZoom = targetZoom || 15
    let midZoom = Math.min(startZoom, finalZoom) - 3
    if (dist > 50000) midZoom = Math.min(startZoom, 8)
    if (dist > 500000) midZoom = Math.min(startZoom, 6)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing In-Out Cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

      // Interpolar centro
      const currentLat = startCenter.lat() + (targetLatLng.lat() - startCenter.lat()) * ease
      const currentLng = startCenter.lng() + (targetLatLng.lng() - startCenter.lng()) * ease
      mapInstance.setCenter({ lat: currentLat, lng: currentLng })

      // Interpolar zoom (parábola)
      let currentZoom
      if (progress < 0.5) {
        const p2 = progress * 2
        const easeZoom = p2 < 0.5 ? 2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 2) / 2
        currentZoom = startZoom + (midZoom - startZoom) * easeZoom
      } else {
        const p2 = (progress - 0.5) * 2
        const easeZoom = p2 < 0.5 ? 2 * p2 * p2 : 1 - Math.pow(-2 * p2 + 2, 2) / 2
        currentZoom = midZoom + (finalZoom - midZoom) * easeZoom
      }
      
      // Si tenemos bounds, al final hacemos fitBounds, mientras tanto animamos zoom manual
      if (!bounds || progress < 0.95) {
        mapInstance.setZoom(currentZoom)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        mapInstance.setCenter(targetLatLng)
        if (bounds) {
          mapInstance.fitBounds(bounds)
        } else if (targetZoom) {
          mapInstance.setZoom(targetZoom)
        }
        resolve()
      }
    }

    requestAnimationFrame(animate)
  })
}

const onGeocercaClick = async (geocerca: Geocerca) => {
  if (selectedGeocerca.value?.id_geocerca === geocerca.id_geocerca) return
  selectedGeocerca.value = geocerca
  
  if (!selectedGroup.value?.id || !map.value) return
  
  isLoadingDetails.value = true
  clearDrawings()
  
  try {
    const detalle = await fetchGeocercaDetallesApi(selectedGroup.value.id, geocerca.id_geocerca)
    if (!detalle) return
    
    const color = detalle.color || '#3b82f6'

    if (detalle.tipo === 'Circular' && detalle.puntos && detalle.puntos.length > 0) {
      const p = detalle.puntos[0]
      const center = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) }
      const radius = parseFloat(p.radio || '0')
      
      // 1. Dibujar la figura primero
      currentDrawing.value = new (window as any).google.maps.Circle({
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        map: map.value,
        center: center,
        radius: radius
      })
      
      // 2. Vuelo parabólico personalizado
      const targetLatLng = new (window as any).google.maps.LatLng(center.lat, center.lng)
      await flyToMap(map.value, targetLatLng, 15)
      
    } else if (detalle.tipo === 'Poligonal' && detalle.puntos && detalle.puntos.length > 0) {
      const paths = detalle.puntos.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lon) }))
      const bounds = new (window as any).google.maps.LatLngBounds()
      paths.forEach(p => bounds.extend(p))
      
      // 1. Dibujar la figura primero
      currentDrawing.value = new (window as any).google.maps.Polygon({
        paths: paths,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.35,
        map: map.value
      })
      
      // 2. Vuelo parabólico hacia el centro del polígono
      const center = bounds.getCenter()
      await flyToMap(map.value, center, 15, bounds)
    }
    
  } catch (error) {
    console.error('Error al cargar detalles de geocerca:', error)
  } finally {
    isLoadingDetails.value = false
  }
}

const exportToExcel = () => {
  const dataToExport = filteredGeocercas.value.map(g => ({
    'ID': g.id_geocerca,
    'Nombre': g.nombre,
    'Descripción': g.descripcion,
    'Tipo': g.tipo,
    'Color': g.color,
    'Fecha Creada': g.fecha_creada
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Geocercas')
  XLSX.writeFile(workbook, 'Listado_Geocercas.xlsx')
}

// Borrar Geocerca
const isDeleteDialogOpen = ref(false)
const geocercaToDelete = ref<Geocerca | null>(null)
const isDeleting = ref(false)

const confirmDelete = (geocerca: Geocerca) => {
  geocercaToDelete.value = geocerca
  isDeleteDialogOpen.value = true
}

const handleDeleteGeocerca = async () => {
  if (!selectedGroup.value?.id || !geocercaToDelete.value) return
  
  isDeleting.value = true
  try {
    const success = await deleteGeocercaApi(selectedGroup.value.id, geocercaToDelete.value.id_geocerca)
    if (success) {
      if (selectedGeocerca.value?.id_geocerca === geocercaToDelete.value.id_geocerca) {
        selectedGeocerca.value = null
        clearDrawings()
      }
      await fetchGeocercas()
      isDeleteDialogOpen.value = false
    }
  } catch (error) {
    console.error('Error al borrar geocerca:', error)
  } finally {
    isDeleting.value = false
    geocercaToDelete.value = null
  }
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] w-full">
    <div class="relative w-full h-full overflow-hidden">
      
      <!-- MAP -->
      <div
        id="geocercas-map-container"
        class="absolute inset-0 z-0"
        style="width:100%;height:100%;"
      ></div>



      <!-- Overlay Carga Detalles (High-Impact Design) -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingDetails" 
          class="absolute inset-0 z-[20] flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] pointer-events-none"
        >
          <!-- Grid Background Effect (appearing only during load) -->
          <div class="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_10%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]"></div>

          <div class="relative group flex flex-col items-center">
            <!-- Central Radar Scanner -->
            <div class="relative w-40 h-40 flex items-center justify-center">
              <div class="absolute inset-0 border-2 border-[#3b82f6]/20 rounded-full animate-[ping_3s_infinite]"></div>
              <div class="absolute inset-4 border border-[#3b82f6]/30 rounded-full animate-[ping_2s_infinite]"></div>
              <div class="absolute inset-0 border-t-2 border-l-2 border-[#3b82f6] rounded-full animate-spin [animation-duration:1.5s]"></div>
              
              <!-- Core Icon -->
              <div class="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-white shadow-[0_0_50px_rgba(59,130,246,0.5)] border border-white/20 transform rotate-45 group-hover:rotate-0 transition-transform duration-700">
                <HugeiconsIcon :icon="Location01Icon" :size="36" :stroke-width="1.5" class="-rotate-45 group-hover:rotate-0 transition-transform duration-700" />
              </div>
            </div>

            <!-- Text Content -->
            <div class="mt-8 text-center">
              <div class="flex flex-col items-center gap-1">
                <p class="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-[0.5em] leading-none [text-shadow:0_0_20px_rgba(59,130,246,0.3)]">Cargando...</p>
                <div class="h-0.5 w-24 bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent mt-3 overflow-hidden">
                  <div class="h-full bg-white w-full animate-[scan-line_2s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- FLOATING SIDEBAR -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[340px] md:w-[380px] lg:w-[420px] flex flex-col animate-fade-in">
        <div class="flex-1 flex flex-col m-4 rounded-xl bg-white/95 dark:bg-[#0C0E13] backdrop-blur-3xl border border-slate-200 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden">
          
          <!-- Header -->
          <div class="relative px-5 pt-6 pb-5 border-b border-slate-100 dark:border-white/[0.05] shrink-0 overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/[0.06] via-transparent to-transparent pointer-events-none"></div>
            
            <div class="relative flex items-start justify-between">
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(59,130,246,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-white/10">
                  <HugeiconsIcon :icon="MapsIcon" :size="20" :stroke-width="2" />
                </div>
                <div>
                  <h1 class="text-[17px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{{ $t('geocercas.title') }}</h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.15em] mt-1">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      {{ $t('geocercas.activeGeocercas', { count: filteredGeocercas.length }) }}
                    </span>
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <button @click="router.push('/geocercas/nueva')"
                  class="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-b from-[#60a5fa] to-[#3b82f6] text-white shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(59,130,246,0.6),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-all active:scale-95 border border-[#2563eb]/50 active:shadow-inner"
                  title="Nueva Geocerca">
                  <HugeiconsIcon :icon="PlusSignIcon" :size="18" :stroke-width="2.5" />
                </button>
                <button @click="exportToExcel"
                  class="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/5 hover:border-[#3b82f6]/20 transition-all active:scale-95 shadow-[0_4px_8px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  title="Exportar">
                  <HugeiconsIcon :icon="Download01Icon" :size="16" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Search -->
            <div class="relative mt-5">
              <AppSearch v-model="searchQuery" :placeholder="$t('geocercas.searchPlaceholder')" />
            </div>
          </div>

          <!-- List -->
          <div class="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-10 h-10 border-[3px] border-[#3b82f6]/15 border-t-[#3b82f6] rounded-full animate-spin"></div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando...</p>
            </div>
            
            <!-- Empty -->
            <div v-else-if="filteredGeocercas.length === 0" class="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-white/[0.03] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/[0.05]">
                <HugeiconsIcon :icon="Search01Icon" :size="28" :stroke-width="1.5" />
              </div>
              <div>
                <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">{{ $t('geocercas.noResults') }}</p>
              </div>
            </div>
            
            <!-- Items -->
            <template v-else>
              <div
                v-for="geocerca in paginatedGeocercas"
                :key="geocerca.id_geocerca"
                @click="onGeocercaClick(geocerca)"
                class="group relative cursor-pointer rounded-2xl transition-all duration-300 select-none border overflow-hidden"
                :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca
                  ? 'bg-gradient-to-br from-white to-slate-50 dark:from-[#15181E] dark:to-[#0A0C10] shadow-[0_15px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] border-[#3b82f6]/40 dark:border-[#3b82f6]/30'
                  : 'bg-white/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/[0.04] hover:bg-white dark:hover:bg-white/[0.04] hover:border-slate-300 dark:hover:border-white/[0.08] shadow-sm hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,0.4)]'"
              >
                <!-- Active Sidebar -->
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-gradient-to-b from-[#60a5fa] to-[#2563eb] shadow-[1px_0_12px_rgba(59,130,246,0.8)] transition-all duration-400"
                  :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'opacity-100 h-[70%]' : 'opacity-0 h-0'"
                ></div>

                <div class="p-4 pl-5">
                  <div class="flex items-center gap-3.5">
                    <!-- Icon based on type -->
                    <div
                      class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 border"
                      :style="{ backgroundColor: selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? geocerca.color : 'transparent', borderColor: geocerca.color }"
                      :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca
                        ? 'text-white border-transparent shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
                        : 'bg-slate-50 dark:bg-[#1A1D24] text-slate-400 dark:text-slate-500 shadow-sm'"
                    >
                      <HugeiconsIcon :icon="geocerca.tipo === 'Circular' ? CircleIcon : SquareIcon" :size="22" :stroke-width="1.8" :style="{ color: selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'white' : geocerca.color }" />
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <h3
                          class="text-[13px] font-black uppercase tracking-tight truncate transition-colors duration-200"
                          :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-800 dark:text-white'"
                        >{{ geocerca.nombre }}</h3>
                        
                        <!-- Badge Tipo -->
                        <div class="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.05] text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-sm">
                          {{ geocerca.tipo }}
                        </div>
                      </div>

                      <div class="flex items-center gap-2 mt-1.5">
                        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">{{ geocerca.id_geocerca }}</span>
                        <span class="text-slate-300 dark:text-white/10">·</span>
                        <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{{ geocerca.descripcion || 'Sin descripción' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div class="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                    <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {{ geocerca.fecha_creada }}
                    </div>
                    
                    <div class="flex items-center gap-2">
                      <!-- Botón Editar -->
                      <button
                        @click.stop="router.push(`/geocercas/${geocerca.id_geocerca}/editar`)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white hover:border-[#3b82f6] transition-all duration-300 shadow-sm active:scale-95"
                        title="Editar Geocerca"
                      >
                        <HugeiconsIcon :icon="Edit02Icon" :size="14" :stroke-width="2" />
                      </button>
                      
                      <!-- Botón Borrar siempre visible -->
                      <button
                        @click.stop="confirmDelete(geocerca)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 shadow-sm active:scale-95"
                        title="Eliminar Geocerca"
                      >
                        <HugeiconsIcon :icon="Delete02Icon" :size="14" :stroke-width="2" />
                      </button>
                      
                      <!-- Indicador de color -->
                      <div class="w-3 h-3 ml-1 rounded-full shadow-[0_0_10px_currentColor] border border-white/20" :style="{ backgroundColor: geocerca.color, color: geocerca.color }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Pagination -->
          <div v-if="filteredGeocercas.length > itemsPerPage" class="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-white/[0.05] flex justify-center">
            <AppPagination
              :totalRecords="filteredGeocercas.length"
              v-model:currentPage="currentPage"
              :rowsPerPage="itemsPerPage"
            />
          </div>
          
          <div class="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {{ filteredGeocercas.length > 0 ? `Mostrando ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredGeocercas.length)}–${Math.min(currentPage * itemsPerPage, filteredGeocercas.length)} de ${filteredGeocercas.length}` : 'Sin geocercas' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmación de Eliminación -->
  <AppDeleteConfirm
    v-model:isOpen="isDeleteDialogOpen"
    :itemName="geocercaToDelete?.nombre"
    :loading="isDeleting"
    @confirm="handleDeleteGeocerca"
  />
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

.animate-fade-in {
  font-family: 'Inter', sans-serif;
  animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.18); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.35); }

#geocercas-map-container :deep(.gm-style-cc),
#geocercas-map-container :deep(.gmnoprint),
#geocercas-map-container :deep(a[href^="https://maps.google.com/maps"]) {
  display: none !important;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { transform: translateX(-150%) rotate(45deg); }
  100% { transform: translateX(150%) rotate(45deg); }
}

@keyframes scan-line {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes progress-ind {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
  transform: scale(1.1);
  filter: blur(20px);
}
</style>
