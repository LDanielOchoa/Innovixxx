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
  CpuIcon,
  Loading03Icon
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
import AppInput from '../../../components/ui/AppInput.vue'
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
const currentPage = ref(typeof route.query.page === 'string' ? parseInt(route.query.page, 10) || 1 : 1)
const itemsPerPage = 10
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRutas.value.length / itemsPerPage)))

const syncStateToUrl = () => {
  const nextQuery: Record<string, string> = {}
  if (searchQuery.value.trim()) nextQuery.q = searchQuery.value.trim()
  if (currentPage.value > 1) nextQuery.page = String(currentPage.value)
  void router.replace({ query: nextQuery })
}

watch(searchQuery, () => {
  currentPage.value = 1
  syncStateToUrl()
})

watch(currentPage, () => {
  syncStateToUrl()
})

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
      
      // Calculamos bounds e instantáneamente los aplicamos
      const bounds = new (window as any).google.maps.LatLngBounds()
      paradasTemporales.value.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }))
      
      map.value.fitBounds(bounds)
    }
  } catch(e) {
    console.error('Error fetching ruta detalles:', e)
  } finally {
    isLoadingRouteDetails.value = false
  }
}

const openMenuRutaId = ref<string | null>(null)
const toggleMenu = (rutaId: string, event: Event) => {
  event.stopPropagation()
  if (openMenuRutaId.value === rutaId) {
    openMenuRutaId.value = null
  } else {
    openMenuRutaId.value = rutaId
  }
}
const closeAllMenus = () => {
  openMenuRutaId.value = null
}

onMounted(async () => {
  startDarkModeObserver()
  window.addEventListener('click', closeAllMenus)

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
  window.removeEventListener('click', closeAllMenus)
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
  modalMessage.value = null
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
      showModalMessage('No hay puntos de ruta para el rango seleccionado para ese dispositivo', 'warning')
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



      <!-- Overlay Carga Detalles -->
      <Transition name="fade-overlay">
        <div 
          v-if="isLoadingRouteDetails" 
          class="absolute inset-0 z-[20] flex flex-col items-center justify-center bg-white/60 dark:bg-[#13161C]/60 backdrop-blur-md rounded-xl transition-all duration-300 pointer-events-none"
        >
          <div class="relative">
            <div class="absolute inset-0 bg-[#3b82f6]/20 blur-3xl rounded-full animate-pulse"></div>
            <HugeiconsIcon :icon="Loading03Icon" :size="40" class="text-[#3b82f6] animate-spin relative z-10" />
          </div>
          <div class="mt-5 flex flex-col items-center">
            <span class="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.3em] mb-1">Cargando Trayectoria...</span>
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span class="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-bounce"></span>
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
                  class="w-8 h-8 rounded-[10px] flex items-center justify-center bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-[#3b82f6] dark:hover:text-[#5da6fc] hover:bg-slate-100 dark:hover:bg-white/10 active:scale-[0.97] transition-all duration-200"
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
              <AppInput v-model="searchQuery" :placeholder="$t('rutas.searchPlaceholder')" :icon="Search01Icon" />
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
                class="group relative cursor-pointer rounded-xl transition-all duration-300 select-none border p-2.5 px-3.5 flex items-center justify-between gap-3"
                :class="[
                  selectedRuta?.id_ruta === ruta.id_ruta
                    ? 'bg-[#3b82f6]/5 dark:bg-[#3b82f6]/10 border-[#3b82f6]/30 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.05)]'
                    : 'bg-white dark:bg-[#1E222B]/40 border-slate-200/60 dark:border-white/[0.04] hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-[#232732]/70',
                  openMenuRutaId === ruta.id_ruta ? 'z-30' : 'z-10'
                ]"
              >
                <!-- Glow Effect background -->
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.04),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <!-- Content container -->
                <div class="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <h3
                        class="text-[12px] font-bold uppercase tracking-tight truncate transition-colors duration-200"
                        :class="selectedRuta?.id_ruta === ruta.id_ruta ? 'text-[#3b82f6] dark:text-[#5da6fc]' : 'text-slate-700 dark:text-slate-200'"
                      >
                        {{ ruta.nombre }}
                      </h3>
                      <!-- Status Text Badge -->
                      <span
                        class="text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none select-none tracking-wide"
                        :class="ruta.estado === 'Habilitada'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'"
                      >
                        {{ ruta.estado === 'Habilitada' ? 'Activo' : 'Inactiva' }}
                      </span>
                    </div>
                    <p class="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 truncate mt-1">
                      {{ ruta.descripcion || 'Sin descripción' }}
                    </p>
                  </div>
                </div>

                <!-- Actions block (Three Dots Menu) -->
                <div class="relative shrink-0 z-20">
                  <button
                    type="button"
                    @click.stop="toggleMenu(ruta.id_ruta, $event)"
                    class="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-[#11141A] border border-slate-200/60 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-350 dark:hover:border-white/20 transition-all duration-200"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  <!-- Dropdown Menu -->
                  <Transition name="menu-fade">
                    <div
                      v-if="openMenuRutaId === ruta.id_ruta"
                      class="absolute right-0 mt-1.5 w-32 bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-50 overflow-hidden"
                      @click.stop
                    >
                      <button
                        v-if="authStore.hasPermission(PERMISSIONS.RUTAS_EDIT)"
                        @click.stop="openEditModal(ruta); openMenuRutaId = null"
                        class="w-full px-3 py-1.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <HugeiconsIcon :icon="Edit02Icon" :size="12" class="text-slate-400" />
                        Editar
                      </button>

                      <button
                        v-if="authStore.hasPermission(PERMISSIONS.RUTAS_EDIT)"
                        @click.stop="toggleRutaEstado(ruta); openMenuRutaId = null"
                        class="w-full px-3 py-1.5 text-left text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <HugeiconsIcon :icon="Settings02Icon" :size="12" class="text-slate-400" />
                        {{ ruta.estado === 'Habilitada' ? 'Deshabilitar' : 'Habilitar' }}
                      </button>
                    </div>
                  </Transition>
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

        <!-- Message -->
        <div v-if="modalMessage"
             class="flex items-center gap-2.5 p-3 px-4 rounded-xl border text-[11px] font-bold transition-all duration-300"
             :class="{
               'text-red-500 bg-red-500/10 border-red-500/20': modalMessage.type === 'error',
               'text-amber-500 bg-amber-500/10 border-amber-500/20': modalMessage.type === 'warning',
               'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/20': modalMessage.type === 'success'
             }">
          <HugeiconsIcon v-if="modalMessage.type === 'error' || modalMessage.type === 'warning'" :icon="Alert01Icon" :size="18" />
          {{ modalMessage.text }}
        </div>

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

.menu-fade-enter-active, .menu-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.menu-fade-enter-from, .menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
