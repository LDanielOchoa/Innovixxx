<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Search01Icon,
  Download01Icon,
  PlusSignIcon,
  Edit02Icon,
  Route01Icon,
  Settings02Icon,
  Location01Icon,
  Alert01Icon,
  Calendar01Icon,
  CpuIcon
} from '@hugeicons/core-free-icons'
import * as XLSX from 'xlsx'
import { fetchRutasApi, setRutaEstadoApi, fetchRutaDetallesApi, fetchTiposParadaApi } from '../services/rutas.api'
import { fetchHardwareSimplesApi } from '../../servicios/services/servicios.api'
import { fetchMapPositionsApi } from '../../hardware/services/hardware.api'
import type { Ruta, TipoParada } from '../types/ruta'
import type { HardwareSimple } from '../../servicios/types/servicio'
import { useI18n } from 'vue-i18n'
import { useGroupStore } from '../../../stores/group.store'
import { storeToRefs } from 'pinia'
import { useGoogleMaps } from '../../../composables/useGoogleMaps'
import { useMapSetup } from '../../../composables/useMapSetup'
import { useParadasManager } from '../composables/useParadasManager'
import { useRouteDrawer } from '../composables/useRouteDrawer'
import AppButton from '../../../components/ui/AppButton.vue'
import AppSearch from '../../../components/ui/AppSearch.vue'
import AppPagination from '../../../components/ui/AppPagination.vue'
import AppModal from '../../../components/ui/AppModal.vue'
import AppSelect from '../../../components/ui/AppSelect.vue'
import AppDateTimePicker from '../../../components/ui/AppDateTimePicker.vue'
import { useAuthStore } from '../../../stores/auth.store'
import { PERMISSIONS } from '../../../utils/permissions'

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const authStore = useAuthStore()
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
const { loadGoogleMaps } = useGoogleMaps()
const directionsService = shallowRef<any>(null)
const isLoadingRouteDetails = ref(false)

const activeRouteColor = ref('#60a5fa')
const tiposParada = ref<TipoParada[]>([])

// ── Map Setup (shared composable) ───────────────────────────
const {
  map,
  isLoadingMap,
  mapLoadError,
  initMap,
  startDarkModeObserver
} = useMapSetup('google-map-container', {
  defaultZoom: 12,
  gestureHandling: 'cooperative'
})

const initializeMap = async (googleMapsApi: any) => {
  initMap(googleMapsApi)
  directionsService.value = new googleMapsApi.DirectionsService()
}

// ── Paradas Manager ───────────────────────────────────────────
const {
  paradasTemporales,
  clearMarkers,
  redrawMarkers
} = useParadasManager(map, tiposParada, activeRouteColor, (_idx: number) => {
  // Vista de lista no interactúa con clic en marcadores
})

// ── Route Drawer ──────────────────────────────────────────────
const {
  drawFullRoute,
  clearAll: clearAllRoutes
} = useRouteDrawer(map, directionsService)

const clearMap = () => {
  clearMarkers()
  clearAllRoutes()
}

// Custom Cinematic Fly-To Animation
const flyToMap = async (mapInstance: any, targetLatLng: any, targetZoom: number | null, bounds?: any) => {
  return new Promise<void>((resolve) => {
    const startZoom = mapInstance.getZoom()
    const startCenter = mapInstance.getCenter()
    
    // Si estamos muy cerca, usar nativo
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

    const duration = 1800 // 1.8s
    const startTime = performance.now()
    
    const finalZoom = targetZoom || 15
    let midZoom = Math.min(startZoom, finalZoom) - 3
    if (dist > 50000) midZoom = Math.min(startZoom, 8)
    if (dist > 500000) midZoom = Math.min(startZoom, 6)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

      const currentLat = startCenter.lat() + (targetLatLng.lat() - startCenter.lat()) * ease
      const currentLng = startCenter.lng() + (targetLatLng.lng() - startCenter.lng()) * ease
      mapInstance.setCenter({ lat: currentLat, lng: currentLng })

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

const onRowClick = async (ruta: Ruta) => {
  if (selectedRuta.value?.id_ruta === ruta.id_ruta) return // Toggle o no volver a cargar
  selectedRuta.value = ruta
  
  if (!selectedGroup.value?.id || !map.value) return
  
  isLoadingRouteDetails.value = true
  clearMap()
  
  try {
    const detalle = await fetchRutaDetallesApi(selectedGroup.value.id, ruta.id_ruta)
    
    // Alejar la cámara para ganar perspectiva
    const currentZoom = map.value.getZoom()
    if (currentZoom > 11) {
      map.value.setZoom(11)
      await new Promise(resolve => setTimeout(resolve, 400)) // Esperar la animación del zoom nativo
    }

    if (detalle && detalle.paradas && detalle.paradas.length > 0) {
      activeRouteColor.value = detalle.color || '#60a5fa'
      paradasTemporales.value = detalle.paradas.map(p => ({
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        tipo: p.id_tipo_parada
      }))
      
      // Dibujamos marcadores y pedimos rutas a DirectionsService
      redrawMarkers()
      drawFullRoute(paradasTemporales.value, activeRouteColor.value)
      
      // Calculamos bounds y centro
      const bounds = new (window as any).google.maps.LatLngBounds()
      paradasTemporales.value.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }))
      
      const targetLatLng = bounds.getCenter()
      
      // Vuelo cinemático
      await flyToMap(map.value, targetLatLng, 15, bounds)
    }
  } catch(e) {
    console.error('Error fetching ruta detalles:', e)
  } finally {
    isLoadingRouteDetails.value = false
  }
}

onMounted(async () => {
  startDarkModeObserver()

  // Cargar tipos de parada para poder mapear los marcadores
  if (tiposParada.value.length === 0) {
    try { tiposParada.value = await fetchTiposParadaApi() }
    catch (e) { console.error('Error al obtener tipos de parada:', e) }
  }

  // Usar el composable singleton — si Maps ya está cargado, resolve inmediato
  loadGoogleMaps().then(initializeMap).catch(err => {
    console.error('[RutasListView] Error cargando Google Maps:', err)
    mapLoadError.value = true
    isLoadingMap.value = false
  })

  fetchRutas()
})

onUnmounted(() => {
  // Cleanup handled by useMapSetup onUnmounted
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

// ── Lógica del modal para registro por GPS ──
const isGpsModalOpen = ref(false)
const hardwareList = ref<HardwareSimple[]>([])
const selectedHardwareId = ref('')
const fechaDesde = ref<Date | null>(null)
const fechaHasta = ref<Date | null>(null)
const loadingHardware = ref(false)
const trazandoGps = ref(false)

const hardwareOptions = computed(() => {
  return hardwareList.value.map(item => ({
    value: item.id_hardware,
    label: `${item.nombre} (${item.familia})`
  }))
})

const openGpsModal = async () => {
  isGpsModalOpen.value = true
  selectedHardwareId.value = ''
  fechaDesde.value = null
  fechaHasta.value = null
  if (!selectedGroup.value?.id) return
  
  loadingHardware.value = true
  try {
    const response = await fetchHardwareSimplesApi(selectedGroup.value.id, 0)
    hardwareList.value = response || []
  } catch (error) {
    console.error('Error al obtener hardware simple:', error)
    showModalMessage('Error al cargar dispositivos GPS', 'error')
  } finally {
    loadingHardware.value = false
  }
}

const trazarRutaGps = async () => {
  if (!selectedHardwareId.value || !fechaDesde.value || !fechaHasta.value) {
    showModalMessage('Por favor completa todos los campos requeridos', 'warning')
    return
  }
  
  trazandoGps.value = true
  try {
    const formatDateTime = (val: Date | null) => {
      if (!val) return ''
      const y = val.getFullYear()
      const m = String(val.getMonth() + 1).padStart(2, '0')
      const d = String(val.getDate()).padStart(2, '0')
      const h = String(val.getHours()).padStart(2, '0')
      const min = String(val.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}:00`
    }
    
    const desdeFormatted = formatDateTime(fechaDesde.value)
    const hastaFormatted = formatDateTime(fechaHasta.value)
    
    const data = await fetchMapPositionsApi({
      id_hardware: selectedHardwareId.value,
      id_grupo: selectedGroup.value.id,
      desde: desdeFormatted,
      hasta: hastaFormatted
    })
    
    if (data && data.length > 0) {
      sessionStorage.setItem('temp_gps_positions', JSON.stringify(data))
      isGpsModalOpen.value = false
      router.push('/rutas/nueva?gps=true')
    } else {
      showModalMessage('No se encontraron posiciones GPS para el rango de fechas seleccionado', 'warning')
    }
  } catch (error) {
    console.error('Error al obtener posiciones GPS:', error)
    showModalMessage('Error al consultar el historial GPS', 'error')
  } finally {
    trazandoGps.value = false
  }
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] w-full">
    <div class="relative w-full h-full overflow-hidden">
      
      <!-- MAP: ocupa todo el espacio del contenedor relativo -->
      <div
        id="google-map-container"
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
          v-if="isLoadingRouteDetails" 
          class="absolute inset-0 z-[20] flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] pointer-events-none"
        >
          <!-- Grid Background Effect -->
          <div class="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_10%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]"></div>

          <div class="relative group flex flex-col items-center">
            <!-- Central Radar Scanner -->
            <div class="relative w-40 h-40 flex items-center justify-center">
              <div class="absolute inset-0 border-2 border-[#3b82f6]/20 rounded-full animate-[ping_3s_infinite]"></div>
              <div class="absolute inset-4 border border-[#3b82f6]/30 rounded-full animate-[ping_2s_infinite]"></div>
              <div class="absolute inset-0 border-t-2 border-l-2 border-[#3b82f6] rounded-full animate-spin [animation-duration:1.5s]"></div>
              
              <!-- Core Icon -->
              <div class="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center text-white shadow-[0_0_50px_rgba(59,130,246,0.5)] border border-white/20 transform rotate-45 group-hover:rotate-0 transition-transform duration-700">
                <HugeiconsIcon :icon="Route01Icon" :size="36" :stroke-width="1.5" class="-rotate-45 group-hover:rotate-0 transition-transform duration-700" />
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

      <!-- Hint mapa vacio -->
      <Transition name="fade-overlay">
        <div
          v-if="!isLoadingMap && !mapLoadError && !selectedRuta && !isLoadingRouteDetails"
          class="absolute z-[6] flex items-end justify-end pointer-events-none"
          style="bottom:24px;right:24px;"
        >
          <div class="bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-white/20 dark:border-white/5 shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05)] flex items-center gap-3">
            <p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">Selecciona una ruta para ver su trayectoria</p>
          </div>
        </div>
      </Transition>
 
      <!-- FLOATING SIDEBAR (Docked style consistent with RutasFormView and Sidebar.vue) -->
      <div class="absolute top-0 bottom-0 left-0 z-10 w-[320px] md:w-[350px] lg:w-[380px] flex flex-col">
        <!-- Docked panel consistent with Sidebar.vue -->
        <div class="flex-1 flex flex-col bg-white dark:bg-[#13161C] border-r border-slate-200/70 dark:border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.02)] dark:shadow-[0_0_80px_rgba(0,0,0,0.4)] overflow-hidden">
          
          <!-- Header -->
          <div class="relative px-5 py-5 border-b border-slate-200/60 dark:border-white/5 shrink-0">
            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-[12px] bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 shrink-0">
                  <HugeiconsIcon :icon="Route01Icon" :size="18" :stroke-width="2" />
                </div>
                <div>
                  <h1 class="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight leading-tight">{{ $t('rutas.title') }}</h1>
                  <p class="text-[10px] font-bold text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-wider mt-0.5">
                    {{ filteredRutas.length }} rutas activas
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
                <!-- Botón Registrar por GPS Plano -->
                <button v-if="authStore.hasPermission(PERMISSIONS.RUTAS_CREATE)" @click="openGpsModal"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.97] transition-all duration-200"
                  title="Registrar por GPS">
                  <HugeiconsIcon :icon="Location01Icon" :size="14" :stroke-width="2" />
                </button>
                <!-- Botón Nueva Ruta Plano -->
                <button v-if="authStore.hasPermission(PERMISSIONS.RUTAS_CREATE)" @click="openCreateModal"
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#3b82f6] hover:bg-[#2563eb] text-white active:scale-[0.97] transition-all duration-200"
                  title="Nueva Ruta">
                  <HugeiconsIcon :icon="PlusSignIcon" :size="14" :stroke-width="2" />
                </button>
              </div>
            </div>
 
            <!-- Search -->
            <div class="relative mt-4">
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
            <div v-else-if="filteredRutas.length === 0" class="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-[#20242D] dark:to-[#1D1D24] flex items-center justify-center text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/10 shadow-[0_4px_0_#e2e8f0,0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_0_#1D1D24,0_4px_16px_rgba(0,0,0,0.3)]">
                <HugeiconsIcon :icon="Search01Icon" :size="28" :stroke-width="1.5" />
              </div>
              <div class="space-y-1">
                <p class="text-[13px] font-black text-slate-600 dark:text-slate-300">Sin resultados</p>
                <p class="text-[11px] font-medium text-slate-400 dark:text-slate-500">Prueba con otro término</p>
              </div>
            </div>
            
            <!-- Rutas -->
            <template v-else>
              <div
                v-for="ruta in paginatedRutas"
                :key="ruta.id_ruta"
                @click="onRowClick(ruta)"
                class="group relative cursor-pointer rounded-[14px] transition-all duration-300 select-none border overflow-hidden"
                :class="selectedRuta?.id_ruta === ruta.id_ruta
                  ? 'bg-gradient-to-r from-[#3b82f6]/10 to-transparent dark:from-[#3b82f6]/15 border-[#3b82f6]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_10px_rgba(59,130,246,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_12px_rgba(59,130,246,0.1)]'
                  : 'bg-white/80 dark:bg-[#20242D]/40 border-slate-200/60 dark:border-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] hover:bg-slate-50/50 dark:hover:bg-white/[0.02]'"
              >
                <!-- Barra lateral activa -->
                <div
                  class="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3b82f6] dark:bg-[#5da6fc] transition-all duration-200"
                  :class="selectedRuta?.id_ruta === ruta.id_ruta ? 'opacity-100' : 'opacity-0'"
                ></div>
 
                <div class="p-2.5 pl-3.5 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <!-- LED de estado -->
                    <span
                      class="w-2 h-2 rounded-full shrink-0"
                      :class="ruta.estado === 'Habilitada' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-slate-400'"
                      :title="ruta.estado === 'Habilitada' ? $t('rutas.statusEnabled') : $t('rutas.statusDisabled')"
                    ></span>
 
                    <!-- Info -->
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5">
                        <h3
                          class="text-[12px] font-semibold uppercase tracking-tight truncate transition-colors duration-200"
                          :class="selectedRuta?.id_ruta === ruta.id_ruta ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                        >{{ ruta.nombre }}</h3>
                        <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono shrink-0">({{ ruta.id_ruta }})</span>
                      </div>
                      <p class="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {{ ruta.descripcion || 'Sin descripción' }}
                      </p>
                    </div>
                  </div>
 
                  <!-- Botones de Acción (Visibles en hover) -->
                  <div class="flex items-center gap-1 shrink-0 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <!-- Botón Editar Plano -->
                    <button
                      v-if="authStore.hasPermission(PERMISSIONS.RUTAS_EDIT)"
                      @click.stop="openEditModal(ruta)"
                      class="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-[#20242D] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                      :title="$t('rutas.tooltipEdit')"
                    >
                      <HugeiconsIcon :icon="Edit02Icon" :size="12" :stroke-width="2" />
                    </button>
 
                    <!-- Botón Estado Plano -->
                    <button
                      v-if="authStore.hasPermission(PERMISSIONS.RUTAS_EDIT)"
                      @click.stop="toggleRutaEstado(ruta)"
                      class="w-6 h-6 rounded-md flex items-center justify-center bg-white dark:bg-[#20242D] border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                      :title="ruta.estado === 'Habilitada' ? $t('rutas.tooltipDisable') : $t('rutas.tooltipEnable')"
                    >
                      <HugeiconsIcon :icon="Settings02Icon" :size="12" :stroke-width="2" />
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
      :confirmButtonClass="statusConfirmData.nuevoEstado ? 'inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#047857,0_8px_20px_rgba(16,185,129,0.4)] active:translate-y-[4px] active:shadow-[0_0px_0_#047857,0_4px_10px_rgba(16,185,129,0.4)] transition-all duration-200 border border-emerald-600' : 'inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-b from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 px-6 py-3 text-[13px] font-bold text-white shadow-[0_4px_0_#b91c1c,0_8px_20px_rgba(239,68,68,0.4)] active:translate-y-[4px] active:shadow-[0_0px_0_#b91c1c,0_4px_10px_rgba(239,68,68,0.4)] transition-all duration-200 border border-red-600'"
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

    <!-- Modal Registrar por GPS -->
    <AppModal
      v-model:isOpen="isGpsModalOpen"
      title="Registrar Ruta por GPS"
      confirmText="Trazar Ruta"
      cancelText="Cancelar"
      @confirm="trazarRutaGps"
    >
      <template #icon>
        <div class="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20">
          <HugeiconsIcon :icon="Location01Icon" :size="20" :stroke-width="2" />
        </div>
      </template>

      <div class="flex flex-col gap-5 p-1 relative select-none">
        <!-- Overlay de carga al trazar -->
        <Transition name="fade-overlay">
          <div v-if="trazandoGps" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-xl">
            <div class="w-10 h-10 border-[3px] border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-[#3b82f6] dark:text-[#5da6fc] uppercase tracking-[0.2em] mt-3 animate-pulse">Obteniendo posiciones...</p>
          </div>
        </Transition>

        <!-- Dispositivo GPS -->
        <AppSelect
          v-model="selectedHardwareId"
          label="Dispositivo GPS"
          placeholder="Seleccione un dispositivo"
          :disabled="loadingHardware"
          :icon="CpuIcon"
          :options="hardwareOptions"
        />

        <!-- Rango de Fechas -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Desde -->
          <AppDateTimePicker
            v-model="fechaDesde"
            label="Desde"
            placeholder="Seleccione fecha desde"
          />

          <!-- Hasta -->
          <AppDateTimePicker
            v-model="fechaHasta"
            label="Hasta"
            placeholder="Seleccione fecha hasta"
          />
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
