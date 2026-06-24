<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useGoogleMaps } from '../composables/useGoogleMaps'
import { useMapSetup } from '../composables/useMapSetup'
import { apiClient } from '../utils/api-client'
import { HugeiconsIcon } from '@hugeicons/vue'
import { useRouter, useRoute } from 'vue-router'
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
  RefreshIcon
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
  gestureHandling: 'cooperative'
})

// WebSocket
let socket: WebSocket | null = null
const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const wsError = ref<string | null>(null)

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
    }
  } catch (err) {
    wsStatus.value = 'disconnected'
    wsError.value = 'No se pudo establecer la conexión'
    console.error('[WebSocket] Excepción al conectar:', err)
  }
}

// Desconectar WebSocket
const disconnectWebSocket = () => {
  if (socket) {
    socket.close()
    socket = null
  }
  wsStatus.value = 'disconnected'
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
    const position = { lat: hw.lat, lng: hw.lon }

    if (marker) {
      marker.setPosition(position)
    } else {
      // Crear marcador personalizado
      const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: hw.sos ? '#EF4444' : '#3B82F6',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2.5,
        scale: 9.5
      }

      marker = new google.maps.Marker({
        position,
        map: map.value,
        title: hw.nombre,
        icon: markerIcon
      })

      marker.addListener('click', () => {
        selectItem(hw)
      })

      markers.value.set(hw.serial, marker)
    }
  })

  // Limpiar marcadores obsoletos
  markers.value.forEach((marker, serial) => {
    if (!activeSerials.has(serial)) {
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

// Foto de perfil o avatar según el elemento
const getProfilePhoto = (item: any) => {
  if (item && item.foto) return item.foto
  // URL de avatar aleatorio o predeterminado basado en el nombre
  const name = item?.nombre || item?.placa || item?.serial || 'User'
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
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
  <div class="h-screen w-screen flex bg-slate-100 dark:bg-[#0B0D11] text-slate-800 dark:text-slate-100 overflow-hidden font-sans relative">
    
    <!-- MAPA BACKDROP -->
    <div class="absolute inset-0 z-0">
      <div id="google-map-container" class="w-full h-full bg-[#F1F4F8] dark:bg-[#0d1116]"></div>
    </div>

    <!-- CONTROLES FLOTANTES -->
    <!-- Botón Volver -->
    <button 
      @click="router.push('/dashboard')"
      class="absolute top-4 left-4 z-20 flex items-center justify-center w-10 h-10 rounded-xl bg-white/90 dark:bg-[#15171C]/90 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-[#1C1F26] transition-all shadow-lg active:scale-95 group focus:outline-none"
    >
      <HugeiconsIcon :icon="ArrowLeft01Icon" :size="18" :stroke-width="2.5" class="group-hover:-translate-x-0.5 transition-transform" />
    </button>

    <!-- PESTAÑAS SUPERIORES -->
    <div class="absolute top-4 left-16 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:w-[600px] z-20">
      <div class="flex bg-white/90 dark:bg-[#15171C]/80 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-2xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <button
          v-for="tab in (['SERVICIOS', 'HARDWARE', 'ESCOLTAS', 'VEHICULOS'] as const)"
          :key="tab"
          @click="changeTab(tab)"
          class="flex-1 py-2 text-[11px] font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 focus:outline-none"
          :class="activeTab === tab 
            ? 'bg-[#3b82f6]/10 dark:bg-[#5da6fc]/15 text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/20 dark:border-[#5da6fc]/20 shadow-[0_2px_12px_rgba(93,166,252,0.15)]'
            : 'text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- PANEL LATERAL IZQUIERDO -->
    <div class="absolute top-20 bottom-4 left-4 w-[320px] md:w-[360px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 rounded-2xl z-20 flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      
      <!-- Cabecera Panel -->
      <div class="p-4 border-b border-slate-100 dark:border-white/5 shrink-0">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 flex items-center justify-center text-[#3b82f6] dark:text-[#5da6fc]">
              <HugeiconsIcon v-if="activeTab === 'HARDWARE'" :icon="ChipIcon" :size="16" />
              <HugeiconsIcon v-else-if="activeTab === 'SERVICIOS'" :icon="Settings02Icon" :size="16" />
              <HugeiconsIcon v-else-if="activeTab === 'ESCOLTAS'" :icon="UserGroupIcon" :size="16" />
              <HugeiconsIcon v-else :icon="Car02Icon" :size="16" />
            </div>
            <div>
              <h2 class="text-[13px] font-bold text-slate-800 dark:text-white tracking-tight capitalize">{{ activeTab.toLowerCase() }}</h2>
              <span class="text-[9px] font-medium text-slate-400 dark:text-white/40 uppercase tracking-widest">
                {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'elemento' : 'elementos' }}
              </span>
            </div>
          </div>

          <!-- Indicador WebSocket para Hardware -->
          <div v-if="activeTab === 'HARDWARE'" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <span 
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse': wsStatus === 'connected',
                'bg-amber-500 animate-pulse': wsStatus === 'connecting',
                'bg-rose-500': wsStatus === 'disconnected'
              }"
            ></span>
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
              {{ wsStatus === 'connected' ? 'LIVE' : wsStatus === 'connecting' ? 'CONECTANDO' : 'DISCONNECT' }}
            </span>
          </div>
        </div>

        <!-- Buscador -->
        <div class="relative">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Buscar..."
            class="w-full bg-slate-50 dark:bg-[#0F1115] border border-slate-200/60 dark:border-white/5 rounded-xl pl-4 pr-10 py-2.5 text-[11px] font-medium text-slate-800 dark:text-white outline-none focus:border-[#3b82f6]/30 dark:focus:border-[#5da6fc]/30 focus:ring-1 focus:ring-[#3b82f6]/10 dark:focus:ring-[#5da6fc]/10 transition-all placeholder:text-slate-400 dark:placeholder:text-white/30"
          />
          <button 
            v-if="activeTab === 'HARDWARE'"
            @click="connectWebSocket"
            title="Reconectar"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <HugeiconsIcon :icon="RefreshIcon" :size="13" :class="{ 'animate-spin': wsStatus === 'connecting' }" />
          </button>
        </div>
      </div>

      <!-- Cuerpo / Lista -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-slate-50/30 dark:bg-[#13161C]/50">
        <!-- Error de sesión / credenciales -->
        <div v-if="wsError && activeTab === 'HARDWARE'" class="mx-2 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2">
          <p class="text-[10px] font-bold text-rose-500 dark:text-rose-400">{{ wsError }}</p>
          <button @click="connectWebSocket" class="text-[9px] font-black uppercase tracking-wider text-[#3b82f6] dark:text-[#5da6fc] hover:underline self-start">
            Reintentar
          </button>
        </div>

        <!-- Loader -->
        <div v-if="isLoadingSecondary" class="py-12 flex flex-col items-center justify-center gap-3">
          <div class="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/10 border-t-[#3b82f6] dark:border-t-[#5da6fc] animate-spin"></div>
          <span class="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Cargando datos...</span>
        </div>

        <!-- Lista Vacía -->
        <div v-else-if="filteredItems.length === 0 && !wsError" class="py-16 text-center flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 dark:text-white/20">
            <HugeiconsIcon :icon="Location01Icon" :size="20" />
          </div>
          <p class="text-[11px] font-bold text-slate-400 dark:text-white/30">No se encontraron elementos</p>
        </div>

        <!-- Elementos -->
        <template v-else>
          <button
            v-for="item in filteredItems"
            :key="item.serial || item.id_servicio || item.id_escolta || item.placa"
            @click="selectItem(item)"
            class="w-full text-left p-3 rounded-xl transition-all duration-200 border outline-none flex items-center gap-3"
            :class="[
              selectedItem && (selectedItem.serial === item.serial || selectedItem.id_servicio === item.id_servicio)
                ? 'bg-[#3b82f6]/10 dark:bg-[#5da6fc]/10 border-[#3b82f6]/30 dark:border-[#5da6fc]/30 text-[#3b82f6] dark:text-white shadow-lg'
                : 'bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-100 dark:border-transparent hover:border-slate-200/60 dark:hover:border-white/5 text-slate-700 dark:text-white/80'
            ]"
          >
            <!-- Avatar / Foto -->
            <div class="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center">
              <img :src="getProfilePhoto(item)" class="w-full h-full object-cover" />
            </div>

            <!-- Info principal -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1.5">
                <span class="text-[12px] font-bold tracking-tight truncate block">
                  {{ item.nombre || item.placa || item.id_servicio }}
                </span>
                <!-- Badge de batería -->
                <span v-if="item.battery !== undefined" class="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5">
                  <HugeiconsIcon :icon="BatteryCharging01Icon" :size="10" />
                  {{ item.battery }}%
                </span>
              </div>
              <span class="text-[10px] text-slate-400 dark:text-white/40 truncate block mt-0.5">
                {{ item.descripcion || item.serial || item.identificacion || 'Sin descripción' }}
              </span>
            </div>
          </button>
        </template>
      </div>
    </div>

    <!-- PANEL DETALLE DERECHO -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-20 opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-20 opacity-0"
    >
      <div 
        v-if="selectedItem" 
        class="absolute top-20 bottom-4 right-4 w-[340px] md:w-[380px] bg-white/95 dark:bg-[#13161C]/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/5 rounded-2xl z-20 flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <!-- Cabecera de Detalle -->
        <div class="p-6 border-b border-slate-100 dark:border-white/5 relative shrink-0">
          <button 
            @click="selectedItem = null" 
            class="absolute top-4 right-4 text-slate-400 dark:text-white/40 hover:text-slate-800 dark:hover:text-white transition-colors text-[11px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 px-2.5 py-1 rounded-lg"
          >
            Cerrar
          </button>

          <div class="flex flex-col items-center text-center mt-4">
            <!-- Foto de perfil grande -->
            <div class="w-20 h-20 rounded-full border-2 border-[#3b82f6]/30 dark:border-[#5da6fc]/30 p-1 bg-slate-50 dark:bg-white/5 shadow-2xl relative">
              <img :src="getProfilePhoto(selectedItem)" class="w-full h-full object-cover rounded-full" />
              <!-- Estado online -->
              <span 
                v-if="selectedItem.lat && selectedItem.lon"
                class="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#13161C] bg-emerald-500 shadow-[0_0_8px_#10B981]"
              ></span>
            </div>

            <h3 class="text-[15px] font-black text-slate-800 dark:text-white mt-4 tracking-tight">
              {{ selectedItem.nombre || selectedItem.placa || selectedItem.id_servicio }}
            </h3>
            <span class="text-[10px] font-bold uppercase tracking-widest text-[#3b82f6] dark:text-[#5da6fc] mt-1">
              {{ selectedItem.serial || selectedItem.identificacion || 'ID / Serial' }}
            </span>
            <p class="text-[11px] text-slate-400 dark:text-white/50 max-w-[240px] mt-2">
              {{ selectedItem.descripcion || 'Sin información adicional del dispositivo' }}
            </p>
          </div>
        </div>

        <!-- Detalles Metadatos -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-slate-50/10 dark:bg-[#13161C]/30">
          <!-- Ubicación / GPS -->
          <div class="space-y-3">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 block">Ubicación y Estado</span>
            
            <div class="grid grid-cols-2 gap-2.5">
              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                <HugeiconsIcon :icon="DashboardBrowsingIcon" :size="14" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <div>
                  <span class="text-[9px] text-slate-400 dark:text-white/40 block">Velocidad</span>
                  <span class="text-[11px] font-bold text-slate-800 dark:text-white">{{ selectedItem.speed || 0 }} km/h</span>
                </div>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                <HugeiconsIcon :icon="CompassIcon" :size="14" class="text-[#3b82f6] dark:text-[#5da6fc]" />
                <div>
                  <span class="text-[9px] text-slate-400 dark:text-white/40 block">Rumbo</span>
                  <span class="text-[11px] font-bold text-slate-800 dark:text-white">{{ selectedItem.course || 0 }}°</span>
                </div>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                <HugeiconsIcon :icon="BatteryCharging01Icon" :size="14" class="text-emerald-500 dark:text-emerald-400" />
                <div>
                  <span class="text-[9px] text-slate-400 dark:text-white/40 block">Batería</span>
                  <span class="text-[11px] font-bold text-emerald-500 dark:text-emerald-400">{{ selectedItem.battery !== undefined ? selectedItem.battery : 100 }}%</span>
                </div>
              </div>

              <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                <HugeiconsIcon :icon="LockIcon" :size="14" class="text-amber-500 dark:text-amber-400" />
                <div>
                  <span class="text-[9px] text-slate-400 dark:text-white/40 block">Candado</span>
                  <span class="text-[11px] font-bold text-slate-800 dark:text-white">{{ selectedItem.status_lock || 'CERRADO' }}</span>
                </div>
              </div>
            </div>

            <!-- Coordenadas -->
            <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
              <span class="text-[9px] text-slate-400 dark:text-white/40 block">Coordenadas GPS</span>
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-mono text-slate-800 dark:text-white/90">
                  {{ selectedItem.lat }}, {{ selectedItem.lon }}
                </span>
                <span 
                  class="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  :class="selectedItem.lat !== 0 && selectedItem.lon !== 0 ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'"
                >
                  {{ selectedItem.lat !== 0 && selectedItem.lon !== 0 ? 'Válido' : 'Sin señal' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Más Información -->
          <div class="space-y-3">
            <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 block">Configuración</span>
            
            <div class="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-2 text-[11px]">
              <div class="flex justify-between">
                <span class="text-slate-400 dark:text-white/40">ID Servicio:</span>
                <span class="font-bold text-slate-800 dark:text-white">{{ selectedItem.id_servicio || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 dark:text-white/40">Familia:</span>
                <span class="font-bold text-slate-800 dark:text-white">{{ selectedItem.id_familia || 'Hardware Genérico' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400 dark:text-white/40">Último Reporte:</span>
                <span class="text-slate-600 dark:text-white/70">{{ selectedItem.time_fx ? new Date(selectedItem.time_fx * 1000).toLocaleString() : 'Recientemente' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
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
