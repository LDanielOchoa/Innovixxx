<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
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
  SquareIcon,
  Alert01Icon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { fetchGeocercasApi, fetchGeocercaDetallesApi, deleteGeocercaApi } from '../services/geocercas.api'
import type { Geocerca, GeocercaDetalle } from '../types/geocerca'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppDeleteConfirm from '../../../components/ui/AppDeleteConfirm.vue'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
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

// Google Maps Setup (shared composable)
const { loadGoogleMaps } = useGoogleMaps()
const {
  map,
  isLoadingMap,
  mapLoadError,
  initMap,
  startDarkModeObserver
} = useMapSetup('geocercas-map-container', {
  defaultZoom: 12,
  gestureHandling: 'cooperative'
})

const initializeMap = async (googleMapsApi: any) => {
  initMap(googleMapsApi)
}

onMounted(() => {
  startDarkModeObserver()

  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('Error cargando Google Maps:', err)
    mapLoadError.value = true
    isLoadingMap.value = false
  })

  fetchGeocercas()
})

onUnmounted(() => {
  clearHoverTimer()
  // Cleanup handled by useMapSetup onUnmounted
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

const hoverTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const hoveredGeocerca = ref<Geocerca | null>(null)

const onGeocercaMouseEnter = (geocerca: Geocerca) => {
  clearHoverTimer()
  hoveredGeocerca.value = geocerca
  hoverTimer.value = setTimeout(() => {
    if (hoveredGeocerca.value?.id_geocerca === geocerca.id_geocerca) {
      onGeocercaClick(geocerca)
    }
  }, 3000)
}

const onGeocercaMouseLeave = () => {
  clearHoverTimer()
  hoveredGeocerca.value = null
}

const clearHoverTimer = () => {
  if (hoverTimer.value) {
    clearTimeout(hoverTimer.value)
    hoverTimer.value = null
  }
}

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
  clearHoverTimer()
  hoveredGeocerca.value = null
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

      <!-- Map Loading State -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingMap && !mapLoadError"
          class="absolute inset-0 z-[5] flex items-center justify-center bg-slate-100 dark:bg-[#0d1116]"
        >
          <div class="flex flex-col items-center gap-4">
            <div class="w-14 h-14 border-[3px] border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin"></div>
            <p class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando mapa...</p>
          </div>
        </div>
      </Transition>

      <!-- Map Error State -->
      <Transition name="fade-overlay">
        <div 
          v-if="mapLoadError"
          class="absolute inset-0 z-[5] flex items-center justify-center bg-slate-100 dark:bg-[#0d1116]"
        >
          <div class="flex flex-col items-center gap-3 text-center">
            <div class="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <HugeiconsIcon :icon="Alert01Icon" :size="28" class="text-red-500" />
            </div>
            <p class="text-sm font-bold text-slate-600 dark:text-slate-300">Error al cargar el mapa</p>
            <p class="text-xs text-slate-400">Verifica tu conexión a internet</p>
          </div>
        </div>
      </Transition>



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

      <!-- Indicación de mapa vacío -->
      <Transition name="fade-overlay">
        <div
          v-if="!isLoadingMap && !mapLoadError && !selectedGeocerca && !isLoadingDetails"
          class="absolute z-[6] flex items-end justify-end pointer-events-none"
          style="bottom:24px;right:24px;"
        >
          <div class="bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-white/20 dark:border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3">
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Selecciona una geocerca para verla en el mapa</p>
          </div>
        </div>
      </Transition>

      <!-- PANEL LATERAL FLOTANTE (Estilo docked consistente con RutasListView y Sidebar.vue) -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[320px] md:w-[350px] lg:w-[380px] flex flex-col">
        <!-- Panel acoplado consistente con Sidebar.vue -->
        <div class="flex-1 flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden">
          
          <!-- Encabezado -->
          <div class="relative px-5 py-5 border-b border-slate-200/60 dark:border-white/5 shrink-0">
            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
                  <HugeiconsIcon :icon="MapsIcon" :size="18" :stroke-width="2" />
                </div>
                <div>
                  <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">{{ $t('geocercas.title') }}</h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider mt-0.5">
                    {{ $t('geocercas.activeGeocercas', { count: filteredGeocercas.length }) }}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <!-- Botón Exportar Plano -->
                <button @click="exportToExcel"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
                  title="Exportar">
                  <HugeiconsIcon :icon="Download01Icon" :size="14" :stroke-width="2" />
                </button>
                <!-- Botón Nueva Geocerca Plano -->
                <button v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_CREATE)" @click="router.push('/geocercas/nueva')"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-[0.97] transition-all duration-200"
                  title="Nueva Geocerca">
                  <HugeiconsIcon :icon="PlusSignIcon" :size="14" :stroke-width="2" />
                </button>
              </div>
            </div>

            <!-- Búsqueda -->
            <div class="relative mt-4">
              <AppSearch v-model="searchQuery" :placeholder="$t('geocercas.searchPlaceholder')" />
            </div>
          </div>

          <!-- Lista de geocercas -->
          <div class="flex-1 overflow-y-auto geocercas-scrollbar px-4 py-4 space-y-2">
            <!-- Cargando -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-10 h-10 border-[3px] border-[#3b82f6]/15 border-t-[#3b82f6] rounded-full animate-spin"></div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Cargando...</p>
            </div>
            
            <!-- Sin resultados -->
            <div v-else-if="filteredGeocercas.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_16px_rgba(0,0,0,0.3)]">
                <HugeiconsIcon :icon="Search01Icon" :size="28" :stroke-width="1.5" />
              </div>
              <div class="space-y-1">
                <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">{{ $t('geocercas.noResults') }}</p>
                <p class="text-[11px] font-medium text-slate-400 dark:text-slate-500">Prueba con otro término</p>
              </div>
            </div>
            
            <!-- Elementos -->
            <template v-else>
              <div
                v-for="geocerca in paginatedGeocercas"
                :key="geocerca.id_geocerca"
                @click="onGeocercaClick(geocerca)"
                @mouseenter="onGeocercaMouseEnter(geocerca)"
                @mouseleave="onGeocercaMouseLeave()"
                class="group relative cursor-pointer rounded-[14px] transition-all duration-300 select-none border overflow-hidden"
                :class="[
                  selectedGeocerca?.id_geocerca === geocerca.id_geocerca
                    ? 'bg-gradient-to-r from-[#3b82f6]/10 to-transparent dark:from-[#3b82f6]/15 border-[#3b82f6]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(59,130,246,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_12px_rgba(59,130,246,0.1)]'
                    : 'bg-white/80 dark:bg-[#20242D]/40 border-slate-200/60 dark:border-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'
                ]"
              >
                <!-- Barra lateral activa -->
                <div
                  class="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3b82f6] dark:bg-[#5da6fc] transition-all duration-200"
                  :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'opacity-100' : 'opacity-0'"
                ></div>

                <!-- Barra de progreso al pasar el mouse (superior) -->
                <div
                  v-if="hoveredGeocerca?.id_geocerca === geocerca.id_geocerca && selectedGeocerca?.id_geocerca !== geocerca.id_geocerca"
                  class="absolute top-0 left-0 right-0 h-[2px] bg-[#3b82f6]/40 overflow-hidden"
                >
                  <div class="h-full bg-[#3b82f6] animate-[hover-progress_3s_linear_forwards]"></div>
                </div>

                <div class="p-2.5 pl-3.5 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <!-- Icono tipo de geocerca (pequeño y elegante) -->
                    <div
                      class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300"
                      :style="{ backgroundColor: selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? `${geocerca.color}20` : 'transparent', borderColor: `${geocerca.color}40` }"
                    >
                      <HugeiconsIcon :icon="geocerca.tipo === 'Circular' ? CircleIcon : SquareIcon" :size="14" :stroke-width="2" :style="{ color: geocerca.color }" />
                    </div>

                    <!-- Información -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-1.5">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <h3
                            class="text-[12px] font-semibold uppercase tracking-tight truncate transition-colors duration-200"
                            :class="selectedGeocerca?.id_geocerca === geocerca.id_geocerca ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                          >{{ geocerca.nombre }}</h3>
                          <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono shrink-0">({{ geocerca.id_geocerca }})</span>
                        </div>
                        <!-- Etiqueta de Tipo -->
                        <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.04] text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                          {{ geocerca.tipo }}
                        </span>
                      </div>
                      <p class="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {{ geocerca.descripcion || 'Sin descripción' }}
                      </p>
                    </div>
                  </div>

                  <!-- Botones de Acción (Visibles al pasar el mouse) -->
                  <div class="flex items-center gap-1 shrink-0 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <!-- Botón Editar Plano -->
                    <button
                      v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_EDIT)"
                      @click.stop="router.push(`/geocercas/${geocerca.id_geocerca}/editar`)"
                      class="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-[#20242D] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                      title="Editar Geocerca"
                    >
                      <HugeiconsIcon :icon="Edit02Icon" :size="12" :stroke-width="2" />
                    </button>

                    <!-- Botón Eliminar Plano -->
                    <button
                      v-if="authStore.hasPermission(PERMISSIONS.GEOCERCAS_DELETE)"
                      @click.stop="confirmDelete(geocerca)"
                      class="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-[#20242D] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 hover:bg-white/5 active:scale-95 transition-all"
                      title="Eliminar Geocerca"
                    >
                      <HugeiconsIcon :icon="Delete02Icon" :size="12" :stroke-width="2" />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Paginación -->
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

/* Barra de desplazamiento del panel lateral */
.geocercas-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(100, 116, 139, 0.18) transparent;
}
.geocercas-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.geocercas-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.geocercas-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.18);
  border-radius: 10px;
}
.geocercas-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.35);
}

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

@keyframes hover-progress {
  0% { width: 0%; }
  100% { width: 100%; }
}

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
</style>
