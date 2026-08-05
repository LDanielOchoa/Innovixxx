<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGroupStore } from '../../stores/group.store'
import { useThemeStore } from '../../stores/theme.store'
import { storeToRefs } from 'pinia'
import DashboardBackground from './ui/DashboardBackground.vue'
import WidgetDevices from './widgets/WidgetDevices.vue'
import WidgetEscoltas from './widgets/WidgetEscoltas.vue'
import WidgetAlarms from './widgets/WidgetAlarms.vue'
import WidgetServices from './widgets/WidgetServices.vue'
import WidgetVehiculosTotal from './widgets/WidgetVehiculosTotal.vue'
import WidgetRutasTotal from './widgets/WidgetRutasTotal.vue'
import { useAuthStore } from '../../stores/auth.store'
import AppModal from '../ui/AppModal.vue'
import { solventarAlertaApi } from '../../domains/servicios/services/servicios.api'
import { useToast } from 'primevue/usetoast'
import { HugeiconsIcon } from '@hugeicons/vue'
import {
  Alert01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  User02Icon,
  HardDriveIcon,
  Tick02Icon,
  MapsIcon,
  ArrowLeft02Icon,
  Loading02Icon
} from '@hugeicons/core-free-icons'

const router = useRouter()
const route = useRoute()
const groupStore = useGroupStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const toast = useToast()
const { selectedGroup } = storeToRefs(groupStore)

// Estado para resolución de alarmas y mapa
const selectedAlertaForSolve = ref<any | null>(null)
const isSolventandoAlerta = ref(false)
const modalActiveView = ref<'list' | 'map'>('list')
const mapZoom = ref(16)
const isMapImageLoading = ref(true)

const MAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDIUxzochI7PvqdE8pNL6b5jy77NOnO1Ko'

const staticMapUrl = computed(() => {
  if (!selectedAlertaForSolve.value) return ''
  const lat = selectedAlertaForSolve.value.lat
  const lng = selectedAlertaForSolve.value.lon
  if (!lat || !lng) return ''

  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${mapZoom.value}&size=640x460&scale=2&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${MAP_KEY}`

  if (themeStore.isDark || document.documentElement.classList.contains('dark')) {
    const darkStyles = [
      'element:geometry|color:0x242f3e',
      'element:labels.text.stroke|color:0x242f3e',
      'element:labels.text.fill|color:0x746855',
      'feature:administrative.locality|element:labels.text.fill|color:0xd59563',
      'feature:poi|element:labels.text.fill|color:0xd59563',
      'feature:poi.park|element:geometry|color:0x263c3f',
      'feature:poi.park|element:labels.text.fill|color:0x6b9a76',
      'feature:road|element:geometry|color:0x38414e',
      'feature:road|element:geometry.stroke|color:0x212a37',
      'feature:road|element:labels.text.fill|color:0x9ca5b3',
      'feature:road.highway|element:geometry|color:0x746855',
      'feature:road.highway|element:geometry.stroke|color:0x1f2835',
      'feature:road.highway|element:labels.text.fill|color:0xf3d19c',
      'feature:transit|element:geometry|color:0x2f3948',
      'feature:transit.station|element:labels.text.fill|color:0xd59563',
      'feature:water|element:geometry|color:0x17263c',
      'feature:water|element:labels.text.fill|color:0x515c6d',
      'feature:water|element:labels.text.stroke|color:0x17263c'
    ].map(s => `style=${encodeURIComponent(s)}`).join('&')

    url += `&${darkStyles}`
  }

  return url
})

const googleMapsExternalUrl = computed(() => {
  if (!selectedAlertaForSolve.value) return '#'
  return `https://www.google.com/maps/search/?api=1&query=${selectedAlertaForSolve.value.lat},${selectedAlertaForSolve.value.lon}`
})

const zoomIn = () => {
  if (mapZoom.value < 20) {
    isMapImageLoading.value = true
    mapZoom.value++
  }
}

const zoomOut = () => {
  if (mapZoom.value > 10) {
    isMapImageLoading.value = true
    mapZoom.value--
  }
}

const openMapView = () => {
  mapZoom.value = 16
  isMapImageLoading.value = true
  modalActiveView.value = 'map'
}

const backToList = () => {
  modalActiveView.value = 'list'
}

const getNombreTipoAlerta = (tipo: number): string => {
  switch (tipo) {
    case 1: return 'Exceso de velocidad'
    case 2: return 'SOS / Emergencia'
    case 3: return 'Alejamiento de ruta'
    case 4: return 'Candado abierto'
    case 5: return 'Candado cerrado'
    case 6: return 'Ruta en su lugar'
    default: return `Alerta tipo ${tipo}`
  }
}

const modalTitle = computed(() => {
  if (modalActiveView.value === 'map' && selectedAlertaForSolve.value) {
    return `Ubicación de Alarma: ${getNombreTipoAlerta(selectedAlertaForSolve.value.tipo)}`
  }
  return 'Solventar Alerta de Seguridad'
})

const handleSelectAlert = (alerta: any) => {
  if (alerta) {
    selectedAlertaForSolve.value = alerta
    modalActiveView.value = 'list'
    mapZoom.value = 16
    isMapImageLoading.value = true
  }
}

const handleSolventarAlerta = async () => {
  if (!selectedAlertaForSolve.value?.token || isSolventandoAlerta.value) return
  
  isSolventandoAlerta.value = true
  const token = selectedAlertaForSolve.value.token
  
  try {
    const res = await solventarAlertaApi(token)
    if (res?.done !== false) {
      toast.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Alarma solventada correctamente',
        life: 3000
      })
      // Filtrar la alerta solventada de la lista local
      alertasDetalleRes.value = alertasDetalleRes.value.filter(a => a.token !== token)
      selectedAlertaForSolve.value = null
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: res?.msg || res?.message || 'No se pudo solventar la alarma',
        life: 4000
      })
    }
  } catch (err: any) {
    console.error('Error al solventar alerta:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err?.message || 'Error de conexión al solventar la alerta',
      life: 4000
    })
  } finally {
    isSolventandoAlerta.value = false
  }
}

// Evaluar credenciales de forma sincrónica para evitar condiciones de carrera con onMounted de los hijos
const checkCredentials = () => {
  const queryToken = route.query.token_ws as string | undefined
  const queryGroupId = route.query.group_id as string | undefined

  if (queryToken || queryGroupId) {
    if (queryToken) localStorage.setItem('auth-token-ws', queryToken.trim())
    if (queryGroupId) localStorage.setItem('auth-grupo-id', queryGroupId.trim())
    router.replace({ path: route.path, query: {} }).catch(err => {
      console.error('Error al limpiar los query params de la URL:', err)
    })
  }

  const token = localStorage.getItem('auth-token-ws') || ''
  const group = selectedGroup.value?.id || localStorage.getItem('auth-grupo-id') || ''
  return { token, group }
}

const creds = checkCredentials()

// WebSocket state
let socket: WebSocket | null = null
const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const wsError = ref<string | null>(null)
const showWsModal = ref(false)
let reconnectTimeoutId: any = null
let reconnectAttempts = 0
const maxReconnectAttempts = 3
let isManualDisconnect = false

const handleLogoutFromWsModal = () => {
  showWsModal.value = false
  authStore.logout(router)
}

// Data fetched from websocket (mode 5)
const isLive = ref(!!creds.token && !!creds.group)
const hardwareRes = ref<{ total: number, inactivo: number, activo: number } | null>(null)
const serviciosRes = ref<{ precarga: number, en_espera: number, ejecucion_ok: number, ejecucion_fail: number } | null>(null)
const escoltasRes = ref<{ total: number, disponible: number, en_servicio: number, no_disponible: number } | null>(null)
const vehiculosRes = ref<{ total: number } | null>(null)
const rutasRes = ref<{ total: number } | null>(null)
const alertasRes = ref<{ SOS: number, velocidad: number, ruta_alejamiento: number, candado_open: number, candado_close: number, ruta_retorno: number } | null>(null)
const alertasDetalleRes = ref<Array<{
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
}>>([])

const connectWebSocket = () => {
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }

  if (socket) {
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    socket.close()
    socket = null
  }

  isManualDisconnect = false
  wsStatus.value = 'connecting'
  wsError.value = null

  const { token: tokenWs, group: groupId } = checkCredentials()

  if (!tokenWs || !groupId) {
    wsStatus.value = 'disconnected'
    isLive.value = false
    wsError.value = 'No hay sesión activa. Inicia sesión primero.'
    showWsModal.value = true
    console.warn('[Dashboard WebSocket] Faltan credenciales en URL, store y localStorage, esperando...', { tokenWs, groupId })
    return
  }

  isLive.value = true
  localStorage.setItem('auth-token-ws', tokenWs)
  localStorage.setItem('auth-grupo-id', groupId)

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsHost = window.location.host
  const wsUrl = `${wsProtocol}://${wsHost}/ws-flota/start/?token=${tokenWs}&modo=5&group_id=${groupId}`
  console.log(`[Dashboard WebSocket] Conectando a ${wsUrl}`)

  try {
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      wsStatus.value = 'connected'
      wsError.value = null
      showWsModal.value = false
      console.log(`[Dashboard WebSocket] Conectado exitosamente en modo=5`)
    }

    socket.onmessage = (event) => {
      console.log('[Dashboard WebSocket] Mensaje recibido:', event.data)
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.ev === 50 && payload.resumen) {
          reconnectAttempts = 0
          if (payload.resumen.hardware) {
            hardwareRes.value = payload.resumen.hardware
          }
          if (payload.resumen.servicios) {
            serviciosRes.value = payload.resumen.servicios
          }
          if (payload.resumen.escoltas) {
            escoltasRes.value = payload.resumen.escoltas
          }
          if (payload.resumen.vehiculos) {
            vehiculosRes.value = payload.resumen.vehiculos
          }
          if (payload.resumen.rutas) {
            rutasRes.value = payload.resumen.rutas
          }
          if (payload.resumen.alertas) {
            alertasRes.value = payload.resumen.alertas
          }
          if (Array.isArray(payload.resumen.alertas_detalle)) {
            alertasDetalleRes.value = payload.resumen.alertas_detalle
          }
        }
      } catch (err) {
        console.error('[Dashboard WebSocket] Error parseando datos:', err)
      }
    }

    socket.onerror = (err) => {
      console.error('[Dashboard WebSocket] Error detectado en socket:', err)
      wsError.value = 'Error en la conexión del servidor'
      wsStatus.value = 'disconnected'
    }

    socket.onclose = (event) => {
      console.log('[Dashboard WebSocket] Socket cerrado:', event)
      wsStatus.value = 'disconnected'
      socket = null
      if (!isManualDisconnect) {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          const delay = 5000
          console.log(`[Dashboard WebSocket] Reconectando en ${delay}ms... (Intento ${reconnectAttempts}/${maxReconnectAttempts})`)
          reconnectTimeoutId = setTimeout(connectWebSocket, delay)
        } else {
          wsError.value = 'Su sesión ha vencido. Le recomendamos cerrar sesión en el aplicativo y volver a ingresar.'
          showWsModal.value = true
        }
      }
    }
  } catch (err) {
    console.error('[Dashboard WebSocket] Excepción de conexión:', err)
    wsStatus.value = 'disconnected'
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++
      reconnectTimeoutId = setTimeout(connectWebSocket, 5000)
    } else {
      wsError.value = 'Su sesión ha vencido. Le recomendamos cerrar sesión en el aplicativo y volver a ingresar.'
      showWsModal.value = true
    }
  }
}

const disconnectWebSocket = () => {
  isManualDisconnect = true
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId)
    reconnectTimeoutId = null
  }
  if (socket) {
    socket.close()
    socket = null
  }
  wsStatus.value = 'disconnected'
}

// Escuchar cambios tardíos de query params y forzar conexión
watch(
  () => [route.query.token_ws, route.query.group_id],
  ([newToken, newGroup]) => {
    if (newToken || newGroup) {
      console.log('[Dashboard WebSocket] Detectado cambio en query params, reconectando...')
      connectWebSocket()
    }
  }
)

// Escuchar cambios de grupo en el Pinia store
watch(
  () => selectedGroup.value?.id,
  (newId) => {
    if (newId) {
      console.log('[Dashboard WebSocket] Grupo cambiado en Pinia store a:', newId)
      connectWebSocket()
    }
  }
)

onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<template>
  <div class="relative w-full h-full min-h-[600px] xl:min-h-[750px] bg-[#F1F4F8] dark:bg-[#13161C] overflow-hidden flex items-center justify-center font-sans transition-colors duration-500">
    
    <!-- Capa Visual Base y Holográfica -->
    <DashboardBackground 
      :alertas-detalle="alertasDetalleRes" 
      @select-alert="handleSelectAlert"
    />

    <!-- LEFT PANEL (WIDGETS) -->
    <div class="absolute left-6 top-6 bottom-6 w-[260px] lg:w-[280px] xl:w-[300px] z-30 flex flex-col gap-5 pointer-events-auto">
      <WidgetDevices 
        :online="hardwareRes?.activo" 
        :inactive="hardwareRes?.inactivo" 
        :total="hardwareRes?.total" 
        :is-live="isLive"
      />
      <WidgetEscoltas 
        :total="escoltasRes?.total"
        :disponible="escoltasRes?.disponible"
        :en-servicio="escoltasRes?.en_servicio"
        :no-disponible="escoltasRes?.no_disponible"
        :is-live="isLive"
      />
      <WidgetAlarms 
        :alertas="alertasRes"
        :alertas-detalle="alertasDetalleRes"
        :is-live="isLive"
        @select-alert="handleSelectAlert"
        class="flex-1 min-h-0" 
      />
    </div>

    <!-- RIGHT PANEL (WIDGETS) -->
    <div class="absolute right-6 top-6 bottom-6 w-[260px] lg:w-[280px] xl:w-[300px] z-30 flex flex-col gap-5 pointer-events-auto">
      <WidgetServices 
        :ejecucion_ok="serviciosRes?.ejecucion_ok"
        :en_espera="serviciosRes?.en_espera"
        :precarga="serviciosRes?.precarga"
        :ejecucion_fail="serviciosRes?.ejecucion_fail"
        :is-live="isLive"
      />
      <WidgetVehiculosTotal 
        :total="vehiculosRes?.total"
        :is-live="isLive"
      />
      <WidgetRutasTotal 
        :total="rutasRes?.total"
        :is-live="isLive"
        class="flex-1 min-h-0"
      />
    </div>

    <!-- MODAL SOLVENTAR ALERTA (Mismo diseño que ServicioVerAlarmasModal.vue) -->
    <AppModal
      :is-open="!!selectedAlertaForSolve"
      @update:is-open="selectedAlertaForSolve = null"
      @close="selectedAlertaForSolve = null"
      :title="modalTitle"
      cancel-text="Cerrar"
      :show-footer="false"
      size="xl"
    >
      <template #icon>
        <div v-if="modalActiveView === 'map'" class="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300">
          <HugeiconsIcon :icon="MapsIcon" :size="20" :stroke-width="2" />
        </div>
        <div v-else class="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-300">
          <HugeiconsIcon :icon="Alert01Icon" :size="20" :stroke-width="2" />
        </div>
      </template>

      <!-- Transición suave tipo Morph entre Vistas (Detalle <-> Mapa) -->
      <Transition name="modal-view-morph" mode="out-in">
        <!-- Vista de Mapa (Foto/Imagen Estática de Google Maps) -->
        <div v-if="modalActiveView === 'map'" key="map-view" class="flex flex-col gap-4">
          <!-- Top Toolbar del Mapa -->
          <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-md flex-wrap sm:flex-nowrap">
            <button
              @click="backToList"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1A1D24] hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 transition-all duration-200 flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            >
              <HugeiconsIcon :icon="ArrowLeft02Icon" :size="16" />
              <span>Volver a la vista detallada</span>
            </button>

            <div v-if="selectedAlertaForSolve" class="flex items-center gap-3 text-xs flex-wrap">
              <div class="flex items-center gap-2 bg-slate-200/60 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                <HugeiconsIcon :icon="HardDriveIcon" :size="14" class="text-slate-400" />
                <span class="font-medium text-slate-400 dark:text-slate-500">Hardware:</span>
                <span class="font-bold text-slate-800 dark:text-slate-100">HW #{{ selectedAlertaForSolve.id_hardware }}</span>
              </div>

              <a
                :href="googleMapsExternalUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <HugeiconsIcon :icon="MapsIcon" :size="14" />
                <span>Abrir en Google Maps</span>
              </a>
            </div>
          </div>

          <!-- Contenedor de la Imagen Estática de Mapa -->
          <div class="relative w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-lg bg-slate-100 dark:bg-[#13161C] flex items-center justify-center">
            <!-- Spinner Loader mientras carga la foto -->
            <div v-if="isMapImageLoading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-100/90 dark:bg-[#13161C]/90 backdrop-blur-sm">
              <HugeiconsIcon :icon="Loading02Icon" :size="32" class="text-blue-500 animate-spin" />
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cargando mapa...</span>
            </div>

            <!-- Imagen Estática de Google Maps con Marcador -->
            <img
              v-if="staticMapUrl"
              :src="staticMapUrl"
              :alt="`Mapa de ${getNombreTipoAlerta(selectedAlertaForSolve?.tipo)}`"
              class="w-full h-full object-cover transition-opacity duration-300"
              :class="{ 'opacity-0': isMapImageLoading, 'opacity-100': !isMapImageLoading }"
              @load="isMapImageLoading = false"
              @error="isMapImageLoading = false"
            />

            <!-- Controles de Zoom sobre la Imagen -->
            <div class="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg">
              <button
                @click="zoomIn"
                :disabled="mapZoom >= 20"
                class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-base leading-none"
                title="Acercar (+)"
              >
                +
              </button>
              <div class="h-px w-full bg-slate-200 dark:bg-white/10"></div>
              <button
                @click="zoomOut"
                :disabled="mapZoom <= 10"
                class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-base leading-none"
                title="Alejar (-)"
              >
                −
              </button>
            </div>
          </div>

          <!-- Barra de acción inferior -->
          <div class="flex items-center justify-end gap-3 pt-1">
            <button
              @click="handleSolventarAlerta"
              :disabled="isSolventandoAlerta"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm text-xs font-bold"
            >
              <HugeiconsIcon :icon="Tick02Icon" :size="16" />
              <span>{{ isSolventandoAlerta ? 'Solventando...' : 'Solventar Alarma' }}</span>
            </button>
          </div>
        </div>

        <!-- Vista Principal: Tarjeta Detallada de la Alerta -->
        <div v-else key="details-view" class="flex flex-col gap-4 relative">
          <div
            v-if="selectedAlertaForSolve"
            class="p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#13161C]/70 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] space-y-4"
          >
            <!-- Fila Superior: Tipo & Fecha -->
            <div class="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.06] flex-wrap sm:flex-nowrap">
              <div class="flex items-center gap-3 min-w-0">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] shrink-0">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <HugeiconsIcon :icon="Alert01Icon" :size="14" />
                  {{ getNombreTipoAlerta(selectedAlertaForSolve.tipo) }}
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1.5 font-medium tabular-nums shrink-0">
                  <HugeiconsIcon :icon="Clock01Icon" :size="13" class="opacity-70" />
                  {{ selectedAlertaForSolve.fecha_hora || '---' }}
                </span>
              </div>

              <!-- Botón Acción Solventar -->
              <div class="flex items-center gap-2 shrink-0">
                <button
                  @click="handleSolventarAlerta"
                  :disabled="isSolventandoAlerta"
                  class="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-b from-amber-500/10 to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/30 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <HugeiconsIcon :icon="Tick02Icon" :size="15" />
                  <span>{{ isSolventandoAlerta ? 'Solventando...' : 'Solventar' }}</span>
                </button>
              </div>
            </div>

            <!-- Fila Inferior: Información & Botón Ver en mapa -->
            <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-1 text-xs">
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <HugeiconsIcon :icon="HardDriveIcon" :size="15" class="text-slate-400 shrink-0" />
                  <span class="font-medium text-slate-400 dark:text-slate-400">Hardware:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">HW #{{ selectedAlertaForSolve.id_hardware }}</span>
                </div>

                <div class="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span class="font-medium text-slate-400 dark:text-slate-400">Servicio:</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200">Servicio #{{ selectedAlertaForSolve.id_servicio }}</span>
                </div>
              </div>

              <div v-if="selectedAlertaForSolve.lat && selectedAlertaForSolve.lon" class="flex items-center gap-2 text-slate-600 dark:text-slate-300 ml-auto">
                <button
                  @click="openMapView"
                  class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#3b82f6] dark:text-[#5da6fc] border border-[#3b82f6]/30 transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm hover:shadow-[#3b82f6]/10 cursor-pointer"
                >
                  <HugeiconsIcon :icon="MapsIcon" :size="14" />
                  <span>Ver en mapa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </AppModal>

    <!-- MODAL ERROR WEBSOCKET / SESIÓN EXPIRADA -->
    <Teleport to="body">
      <Transition name="fade-scale">
        <div 
          v-if="showWsModal" 
          class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div class="w-full max-w-md bg-[#13161C] border border-rose-500/30 rounded-2xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center space-y-4 relative overflow-hidden">
            <!-- Background Glow Effect -->
            <div class="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Icono de Alerta -->
            <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <!-- Textos -->
            <div class="space-y-1.5">
              <h3 class="text-lg font-black text-white tracking-tight">Sesión Expirada</h3>
              <p class="text-xs font-medium text-slate-300 leading-relaxed max-w-xs mx-auto">
                {{ wsError || 'Su sesión ha vencido. Le recomendamos cerrar sesión en el aplicativo y volver a ingresar.' }}
              </p>
            </div>

            <!-- Acción: Cerrar Sesión -->
            <div class="pt-2 w-full flex items-center">
              <button 
                @click="handleLogoutFromWsModal"
                class="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-[0_4px_15px_rgba(225,29,72,0.4)] transition-all active:scale-95 cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
/* Transición Morph Fluida entre Vistas */
.modal-view-morph-enter-active,
.modal-view-morph-leave-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-view-morph-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(12px);
  filter: blur(4px);
}

.modal-view-morph-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-12px);
  filter: blur(4px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(96, 165, 250, 0.35);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(93, 166, 252, 0.3);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(96, 165, 250, 0.6);
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(93, 166, 252, 0.5);
}
</style>


