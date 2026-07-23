<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGroupStore } from '../../stores/group.store'
import { storeToRefs } from 'pinia'
import DashboardBackground from './ui/DashboardBackground.vue'
import WidgetDevices from './widgets/WidgetDevices.vue'
import WidgetKilometers from './widgets/WidgetKilometers.vue'
import WidgetAlarms from './widgets/WidgetAlarms.vue'
import WidgetServices from './widgets/WidgetServices.vue'
import WidgetVehicles from './widgets/WidgetVehicles.vue'

const router = useRouter()
const route = useRoute()
const groupStore = useGroupStore()
const { selectedGroup } = storeToRefs(groupStore)

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
let reconnectTimeoutId: any = null
let reconnectAttempts = 0
const maxReconnectAttempts = 5
let isManualDisconnect = false

// Data fetched from websocket (mode 5)
const isLive = ref(!!creds.token && !!creds.group)
const hardwareRes = ref<{ total: number, inactivo: number, activo: number } | null>(null)
const serviciosRes = ref<{ precarga: number, en_espera: number, ejecucion_ok: number, ejecucion_fail: number } | null>(null)

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

  const { token: tokenWs, group: groupId } = checkCredentials()

  if (!tokenWs || !groupId) {
    wsStatus.value = 'disconnected'
    isLive.value = false
    console.warn('[Dashboard WebSocket] Faltan credenciales en URL, store y localStorage, esperando...', { tokenWs, groupId })
    return
  }

  isLive.value = true
  localStorage.setItem('auth-token-ws', tokenWs)
  localStorage.setItem('auth-grupo-id', groupId)

  const wsUrl = `ws://66.179.190.248:8901/start/?token=${tokenWs}&modo=5&group_id=${groupId}`
  console.log(`[Dashboard WebSocket] Conectando a ${wsUrl}`)

  try {
    socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      wsStatus.value = 'connected'
      reconnectAttempts = 0
      console.log(`[Dashboard WebSocket] Conectado exitosamente en modo=5`)
    }

    socket.onmessage = (event) => {
      console.log('[Dashboard WebSocket] Mensaje recibido:', event.data)
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.ev === 50 && payload.resumen) {
          if (payload.resumen.hardware) {
            hardwareRes.value = payload.resumen.hardware
          }
          if (payload.resumen.servicios) {
            serviciosRes.value = payload.resumen.servicios
          }
        }
      } catch (err) {
        console.error('[Dashboard WebSocket] Error parseando datos:', err)
      }
    }

    socket.onerror = (err) => {
      console.error('[Dashboard WebSocket] Error detectado en socket:', err)
      wsStatus.value = 'disconnected'
    }

    socket.onclose = (event) => {
      console.log('[Dashboard WebSocket] Socket cerrado:', event)
      wsStatus.value = 'disconnected'
      socket = null
      if (!isManualDisconnect && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
        console.log(`[Dashboard WebSocket] Reconectando en ${delay}ms... (Intento ${reconnectAttempts}/${maxReconnectAttempts})`)
        reconnectTimeoutId = setTimeout(connectWebSocket, delay)
      }
    }
  } catch (err) {
    console.error('[Dashboard WebSocket] Excepción de conexión:', err)
    wsStatus.value = 'disconnected'
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
    <DashboardBackground />

    <!-- LEFT PANEL (WIDGETS) -->
    <div class="absolute left-6 top-6 bottom-6 w-[260px] lg:w-[280px] xl:w-[300px] z-30 flex flex-col gap-5 pointer-events-auto">
      <WidgetDevices 
        :online="hardwareRes?.activo" 
        :inactive="hardwareRes?.inactivo" 
        :total="hardwareRes?.total" 
        :is-live="isLive"
      />
      <WidgetKilometers />
      <WidgetAlarms class="flex-1 min-h-0" />
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
      <WidgetVehicles class="flex-1 min-h-0" />
    </div>

  </div>
</template>

<style scoped>
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


