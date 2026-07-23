import { ref, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiClient } from '../../../utils/api-client'
import type { HardwareWs } from '../types/tracking'

export function useTrackingWebSocket(activeTab: ReturnType<typeof ref<'SERVICIOS' | 'HARDWARE' | 'ESCOLTAS' | 'VEHICULOS'>>, selectedItem: ReturnType<typeof ref<any | null>>, onDataUpdated: () => void) {
  const router = useRouter()
  const route = useRoute()

  const hardwareList = ref<HardwareWs[]>([])
  const serviciosList = ref<any[]>([])
  const escoltasList = ref<any[]>([])
  const vehiculosList = ref<any[]>([])

  const refServicios = ref<any[]>([])
  const refEscoltas = ref<any[]>([])
  const refVehiculos = ref<any[]>([])

  const isLoadingSecondary = ref(false)
  const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const wsError = ref<string | null>(null)

  let socket: WebSocket | null = null
  let reconnectTimeoutId: any = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  let isManualDisconnect = false
  let wsSessionId = 0

  const getServiceListPayload = (groupId: string) => {
    const today = new Date()
    const pastDate = new Date()
    pastDate.setMonth(today.getMonth() - 4)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    return {
      id_grupo: groupId,
      estado: 0,
      fecha_registro_inicial: formatDate(pastDate),
      fecha_registro_final: formatDate(today),
      id_ruta: 'all',
      id_escolta: 'all'
    }
  }

  const loadAllReferenceData = async () => {
    const groupId = localStorage.getItem('auth-grupo-id') || ''
    if (!groupId) return
    try {
      apiClient<{ done: boolean; data: any[] }>('/api/v1/servicio/listar_tabla/', {
        method: 'POST',
        body: JSON.stringify(getServiceListPayload(groupId))
      }).then(res => {
        if (res.done && Array.isArray(res.data)) refServicios.value = res.data
      })

      apiClient<{ done: boolean; data: any[] }>('/api/v1/escolta/listar_simple/', {
        method: 'POST',
        body: JSON.stringify({ id_grupo: groupId, estado: 1 })
      }).then(res => {
        if (res.done) refEscoltas.value = res.data
      })

      apiClient<{ done: boolean; data: any[] }>('/api/v1/vehiculo/listar_simple/', {
        method: 'POST',
        body: JSON.stringify({ id_grupo: groupId, estado: 1 })
      }).then(res => {
        if (res.done) refVehiculos.value = res.data
      })
    } catch (err) {
      console.error('Error al cargar datos de referencia:', err)
    }
  }

  const loadSecondaryData = async () => {
    const groupId = localStorage.getItem('auth-grupo-id') || ''
    isLoadingSecondary.value = true
    try {
      if (activeTab.value === 'SERVICIOS') {
        const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/servicio/listar_tabla/', {
          method: 'POST',
          body: JSON.stringify(getServiceListPayload(groupId))
        })
        if (res.done) serviciosList.value = res.data
      } else if (activeTab.value === 'ESCOLTAS') {
        const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/escolta/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 1 })
        })
        if (res.done) escoltasList.value = res.data
      } else if (activeTab.value === 'VEHICULOS') {
        const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/vehiculo/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 1 })
        })
        if (res.done) vehiculosList.value = res.data
      }
    } catch (err) {
      console.error('Error cargando datos de pestaña:', err)
    } finally {
      isLoadingSecondary.value = false
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

    const queryToken = route?.query?.token_ws as string | undefined
    const queryGroupId = route?.query?.group_id as string | undefined

    if (queryToken || queryGroupId) {
      if (queryToken) localStorage.setItem('auth-token-ws', queryToken.trim())
      if (queryGroupId) localStorage.setItem('auth-grupo-id', queryGroupId.trim())
      router.replace({ path: route.path, query: {} }).catch(err => {
        console.error('Error al limpiar los query params de la URL:', err)
      })
    }

    const tokenWs = localStorage.getItem('auth-token-ws') || ''
    const groupId = localStorage.getItem('auth-grupo-id') || ''

    if (!tokenWs || !groupId) {
      wsStatus.value = 'disconnected'
      wsError.value = 'No hay sesión activa. Inicia sesión primero.'
      return
    }

    wsSessionId++
    const mySessionId = wsSessionId
    const myTab = activeTab.value
    const modo = myTab === 'ESCOLTAS' ? '3' : '2'
    const wsUrl = `ws://66.179.190.248:8901/start/?token=${tokenWs}&modo=${modo}&group_id=${groupId}`

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        if (wsSessionId !== mySessionId) return
        wsStatus.value = 'connected'
        wsError.value = null
        reconnectAttempts = 0
      }

      socket.onmessage = (event) => {
        if (wsSessionId !== mySessionId) return
        try {
          const payload = JSON.parse(event.data)
          if (payload && payload.ev === 50) {
            if (Array.isArray(payload.flota) && myTab === 'HARDWARE') {
              if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
                hardwareList.value = payload.flota
              } else {
                payload.flota.forEach((updatedItem: HardwareWs) => {
                  const index = hardwareList.value.findIndex(h => h.serial === updatedItem.serial)
                  if (index !== -1) {
                    hardwareList.value[index] = { ...hardwareList.value[index], ...updatedItem }
                  } else {
                    hardwareList.value.push(updatedItem)
                  }
                  if (selectedItem.value && selectedItem.value.serial === updatedItem.serial) {
                    selectedItem.value = { ...selectedItem.value, ...updatedItem }
                  }
                })
              }
              onDataUpdated()
            } else if (Array.isArray(payload.escoltas) && myTab === 'ESCOLTAS') {
              if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
                escoltasList.value = payload.escoltas
              } else {
                payload.escoltas.forEach((updatedItem: any) => {
                  const index = escoltasList.value.findIndex(e => e.id_escolta === updatedItem.id_escolta)
                  if (index !== -1) {
                    escoltasList.value[index] = { ...escoltasList.value[index], ...updatedItem }
                  } else {
                    escoltasList.value.push(updatedItem)
                  }
                  if (selectedItem.value && selectedItem.value.id_escolta === updatedItem.id_escolta) {
                    selectedItem.value = { ...selectedItem.value, ...updatedItem }
                  }
                })
              }
              onDataUpdated()
            }
          }
        } catch (err) {
          console.error('[WebSocket] Error al procesar mensaje:', err)
        }
      }

      socket.onerror = () => {
        if (wsSessionId !== mySessionId) return
        wsError.value = 'Error en la conexión del servidor'
      }

      socket.onclose = (event) => {
        if (wsSessionId !== mySessionId) return
        wsStatus.value = 'disconnected'
        socket = null
        if (!isManualDisconnect) {
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
            reconnectTimeoutId = setTimeout(() => connectWebSocket(), delay)
          } else {
            wsError.value = 'No se pudo reconectar después de varios intentos'
          }
        }
      }
    } catch (err) {
      wsStatus.value = 'disconnected'
      wsError.value = 'No se pudo establecer la conexión'
    }
  }

  const disconnectWebSocket = () => {
    isManualDisconnect = true
    wsSessionId++
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
    wsStatus.value = 'disconnected'
  }

  watch(activeTab, () => {
    if (activeTab.value === 'HARDWARE' || activeTab.value === 'ESCOLTAS') {
      connectWebSocket()
    } else {
      disconnectWebSocket()
      loadSecondaryData()
    }
  })

  return {
    hardwareList,
    serviciosList,
    escoltasList,
    vehiculosList,
    refServicios,
    refEscoltas,
    refVehiculos,
    isLoadingSecondary,
    wsStatus,
    wsError,
    loadAllReferenceData,
    loadSecondaryData,
    connectWebSocket,
    disconnectWebSocket
  }
}
