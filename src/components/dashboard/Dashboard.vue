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
import SolventarAlertaModal from '../../domains/servicios/components/SolventarAlertaModal.vue'
import { fetchHardwareSimplesApi } from '../../domains/servicios/services/servicios.api'
import type { HardwareSimple } from '../../domains/servicios/types/servicio'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { loadModuleMessages } from '../../i18n'
import { useSintesisVoz } from '../../composables/useSintesisVoz'
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
  Loading02Icon,
  EyeIcon,
  ViewOffIcon,
  Comment01Icon
} from '@hugeicons/core-free-icons'

loadModuleMessages('dashboard')
const { t, locale } = useI18n()

const router = useRouter()
const route = useRoute()
const groupStore = useGroupStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const toast = useToast()
const { selectedGroup } = storeToRefs(groupStore)

// Estado para resolución de alarmas
const selectedAlertaForSolve = ref<any | null>(null)

// Alarma enfocada manualmente mediante click derecho
const alertaEnfocada = ref<any | null>(null)

// Obtener idioma activo configurado en el perfil del usuario (/me) o selector de idioma
const obtenerIdiomaUsuario = (): 'es' | 'en' => {
  const idioma = (locale.value || authStore.userData?.idioma || localStorage.getItem('app-locale') || 'es').toLowerCase()
  return idioma.startsWith('en') ? 'en' : 'es'
}

const handleEnfocarAlerta = (alerta: any) => {
  if (!alerta) return
  alertaEnfocada.value = alerta
  const idiomaActual = obtenerIdiomaUsuario()
  toast.add({
    severity: 'info',
    summary: idiomaActual === 'en' ? 'Alert Focused on Map' : 'Alarma Enfocada en Mapa',
    detail: `${getNombreTipoAlerta(alerta.tipo, idiomaActual)} - ${idiomaActual === 'en' ? 'Device' : 'HW'}: ${getHardwareInfo(alerta.id_hardware)}`,
    life: 2500
  })
}

const hardwareList = ref<HardwareSimple[]>([])

const cargarHardwareList = async () => {
  if (!selectedGroup.value?.id) return
  try {
    hardwareList.value = await fetchHardwareSimplesApi(selectedGroup.value.id, 0)
  } catch (err) {
    console.error('[Dashboard] Error cargando lista de hardware:', err)
  }
}

const getHardwareInfo = (id: string | number) => {
  if (!id) return '---'
  const idStr = String(id)
  const h = hardwareList.value.find(item => item.id_hardware === idStr)
  return h ? `${h.nombre}${h.familia ? ` (${h.familia})` : ''}` : idStr
}

// Obtener únicamente el nombre real del hardware si existe en catálogo (sin fallback de ID numérico para voz)
const getHardwareNombreReal = (id: string | number): string | null => {
  if (!id) return null
  const idStr = String(id)
  const h = hardwareList.value.find(item => item.id_hardware === idStr)
  return h?.nombre ? h.nombre.trim() : null
}

const getNombreTipoAlerta = (tipo: number, idioma?: 'es' | 'en'): string => {
  const lang = idioma || obtenerIdiomaUsuario()
  if (lang === 'en') {
    switch (tipo) {
      case 1: return 'Overspeed'
      case 2: return 'SOS Emergency'
      case 3: return 'Route Deviation'
      case 4: return 'Lock Open'
      case 5: return 'Lock Closed'
      case 6: return 'Route Return'
      default: return `Alert type ${tipo}`
    }
  }

  // Español
  switch (tipo) {
    case 1: return 'Exceso de velocidad'
    case 2: return 'SOS / Emergencia'
    case 3: return 'Alejamiento de ruta'
    case 4: return 'Candado abierto'
    case 5: return 'Candado cerrado'
    case 6: return 'Retorno Ruta'
    default: return `Alerta tipo ${tipo}`
  }
}

const handleSelectAlert = (alerta: any) => {
  if (alerta) {
    selectedAlertaForSolve.value = alerta
  }
}

const onAlertaSolventada = (token: string) => {
  // Filtrar la alerta solventada de la lista local
  alertasDetalleRes.value = alertasDetalleRes.value.filter(a => a.token !== token)
  if (alertaEnfocada.value?.token === token) {
    alertaEnfocada.value = null
  }
  selectedAlertaForSolve.value = null
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

// Síntesis de voz (TTS) para notificación de alarmas
const {
  hablar,
  cancelar,
  estaSilenciado,
  estaHablando,
  alternarSilencio,
  probarVoz
} = useSintesisVoz()

const alertasNotificadasPorVoz = new Set<string>()
const esCargaInicialAlertas = ref(true)

const procesarAlertasVoz = (alertas: typeof alertasDetalleRes.value) => {
  if (!alertas || alertas.length === 0) return

  // En la primera carga o cambio de grupo, registrar las alarmas existentes sin reproducir
  if (esCargaInicialAlertas.value) {
    for (const alerta of alertas) {
      const clave = alerta.token || `${alerta.id_hardware}_${alerta.tipo}_${alerta.fecha_hora}`
      alertasNotificadasPorVoz.add(clave)
    }
    esCargaInicialAlertas.value = false
    return
  }

  // Identificar alarmas nuevas entrantes
  const nuevasAlarmas: typeof alertas = []
  for (const alerta of alertas) {
    const clave = alerta.token || `${alerta.id_hardware}_${alerta.tipo}_${alerta.fecha_hora}`
    if (!alertasNotificadasPorVoz.has(clave)) {
      alertasNotificadasPorVoz.add(clave)
      nuevasAlarmas.push(alerta)
    }
  }

  // Dar prioridad a las nuevas alarmas entrantes
  if (nuevasAlarmas.length > 0) {
    // 1. Quitar el estado de enfoque manual previo: ninguna queda como "enfocada" y el mapa muestra la nueva alarma automáticamente
    alertaEnfocada.value = null

    // 2. Cancelar cualquier audio en curso para dar paso inmediato a la nueva emergencia
    cancelar()

    // 3. Notificar por voz las nuevas alarmas en el idioma del perfil (/me) únicamente si el usuario las tiene habilitadas
    for (const alerta of nuevasAlarmas) {
      if (!authStore.puedeEscucharAlarma(alerta.tipo)) {
        continue
      }

      const idiomaActual = obtenerIdiomaUsuario()
      const nombreTipo = getNombreTipoAlerta(alerta.tipo, idiomaActual)
      const nombreHwReal = getHardwareNombreReal(alerta.id_hardware)

      let mensajeVoz = ''
      if (idiomaActual === 'en') {
        mensajeVoz = nombreHwReal
          ? `Alert: ${nombreTipo}. Device: ${nombreHwReal}.`
          : `Alert: ${nombreTipo}.`
      } else {
        mensajeVoz = nombreHwReal
          ? `Alarma de ${nombreTipo}. Dispositivo: ${nombreHwReal}.`
          : `Alarma de ${nombreTipo}.`
      }

      hablar(mensajeVoz, { idioma: idiomaActual === 'en' ? 'en-US' : 'es-ES' })
    }
  }
}

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
            procesarAlertasVoz(payload.resumen.alertas_detalle)
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
      alertasNotificadasPorVoz.clear()
      alertaEnfocada.value = null
      esCargaInicialAlertas.value = true
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
      alertasNotificadasPorVoz.clear()
      alertaEnfocada.value = null
      esCargaInicialAlertas.value = true
      connectWebSocket()
      cargarHardwareList()
    }
  }
)

onMounted(() => {
  connectWebSocket()
  cargarHardwareList()
})

onUnmounted(() => {
  disconnectWebSocket()
  cancelar()
})
</script>

<template>
  <div class="relative w-full h-full min-h-[600px] xl:min-h-[750px] bg-[#F1F4F8] dark:bg-[#13161C] overflow-hidden flex items-center justify-center font-sans transition-colors duration-500">
    
    <!-- Capa Visual Base y Holográfica -->
    <DashboardBackground 
      :alertas-detalle="alertasDetalleRes" 
      :alerta-enfocada="alertaEnfocada"
      @select-alert="handleSelectAlert"
      @enfocar-alerta="handleEnfocarAlerta"
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
        :alerta-enfocada-token="alertaEnfocada?.token || ''"
        @select-alert="handleSelectAlert"
        @enfocar-alerta="handleEnfocarAlerta"
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

    <!-- MODAL SOLVENTAR ALERTA (Unificado y Limpio) -->
    <SolventarAlertaModal
      :is-open="!!selectedAlertaForSolve"
      :alerta="selectedAlertaForSolve"
      :hardware-list="hardwareList"
      @close="selectedAlertaForSolve = null"
      @solventada="onAlertaSolventada"
    />

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


