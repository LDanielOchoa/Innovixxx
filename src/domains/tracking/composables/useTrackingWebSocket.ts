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
  const refRutas = ref<any[]>([])
  const refHardware = ref<any[]>([])

  const isLoadingSecondary = ref(false)
  const wsStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const wsError = ref<string | null>(null)

  const alertBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('innovix_alert_channel')
    : null

  const removeAlertFromList = (token: string) => {
    if (!token) return
    // 1. Eliminar de serviciosList
    serviciosList.value.forEach(serv => {
      if (Array.isArray(serv.alertas)) {
        serv.alertas = serv.alertas.filter((a: any) => a.token !== token)
      }
    })
    // 2. Eliminar de selectedItem
    if (selectedItem.value && Array.isArray(selectedItem.value.alertas)) {
      selectedItem.value.alertas = selectedItem.value.alertas.filter((a: any) => a.token !== token)
    }
  }

  if (alertBroadcastChannel) {
    alertBroadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'ALERT_SOLVED' && event.data.token) {
        removeAlertFromList(event.data.token)
      }
    }
  }

  const solveAlertByToken = (token: string) => {
    removeAlertFromList(token)
    alertBroadcastChannel?.postMessage({ type: 'ALERT_SOLVED', token })
  }

  let socket: WebSocket | null = null
  let reconnectTimeoutId: any = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 3
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
    // Mostrar el skeleton de la pestaña SERVICIOS mientras no haya datos
    const showLoading = activeTab.value === 'SERVICIOS' && serviciosList.value.length === 0
    if (showLoading) isLoadingSecondary.value = true
    try {
      // Cargar Rutas, Servicios, Escoltas, Vehículos y Hardware en paralelo
      const [rutasRes, serviciosRes, escoltasRes, vehiculosRes, hardwareRes] = await Promise.all([
        apiClient<{ done: boolean; data: any[] }>('/api/v1/ruta/listar/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId })
        }),
        apiClient<{ done: boolean; data: any[] }>('/api/v1/servicio/listar_tabla/', {
          method: 'POST',
          body: JSON.stringify(getServiceListPayload(groupId))
        }),
        apiClient<{ done: boolean; data: any[] }>('/api/v1/escolta/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 0 })
        }),
        apiClient<{ done: boolean; data: any[] }>('/api/v1/vehiculo/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 0 })
        }),
        apiClient<{ done: boolean; data: any[] }>('/api/v1/hardware/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 0 })
        })
      ])

      if (rutasRes.done && Array.isArray(rutasRes.data)) {
        refRutas.value = rutasRes.data
      }
      if (serviciosRes.done && Array.isArray(serviciosRes.data)) {
        refServicios.value = serviciosRes.data
      }
      if (escoltasRes.done && Array.isArray(escoltasRes.data)) {
        refEscoltas.value = escoltasRes.data
      }
      if (vehiculosRes.done && Array.isArray(vehiculosRes.data)) {
        refVehiculos.value = vehiculosRes.data
      }
      if (hardwareRes.done && Array.isArray(hardwareRes.data)) {
        refHardware.value = hardwareRes.data
      }

      // Consolidar la lista de servicios actual con las referencias resueltas
      if (serviciosList.value.length > 0) {
        serviciosList.value = serviciosList.value.map(wsServ => {
          const wsId = String(wsServ.id_servicio || '').trim().toLowerCase()
          const ref = refServicios.value.find(s => String(s.id_servicio || '').trim().toLowerCase() === wsId)
          const rutaId = String(wsServ.id_ruta || ref?.id_ruta || '').trim()
          const rutaRef = refRutas.value.find(r => String(r.id_ruta || '').trim() === rutaId)
          const nombreRuta = rutaRef?.nombre || ref?.nombre_ruta || ref?.ruta || rutaId || 'Sin Ruta'
          return {
            ...(ref || {}),
            ...wsServ,
            id_ruta: rutaId || ref?.id_ruta || wsServ.id_ruta || '',
            nombre_ruta: nombreRuta,
            descripcion: nombreRuta
          }
        })
      }
    } catch (err) {
      console.error('Error al cargar datos de referencia:', err)
    } finally {
      if (showLoading) isLoadingSecondary.value = false
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
        if (res.done && Array.isArray(res.data)) {
          refServicios.value = res.data
          if (serviciosList.value.length > 0) {
            serviciosList.value = serviciosList.value.map(wsServ => {
              const wsId = String(wsServ.id_servicio || '').trim().toLowerCase()
              const ref = refServicios.value.find(s => String(s.id_servicio || '').trim().toLowerCase() === wsId)
              const rutaId = String(wsServ.id_ruta || ref?.id_ruta || '').trim()
              const rutaRef = refRutas.value.find(r => String(r.id_ruta || '').trim() === rutaId)
              const nombreRuta = rutaRef?.nombre || ref?.nombre_ruta || ref?.ruta || wsServ.nombre_ruta || (rutaId ? `Ruta ${rutaId}` : 'Sin Ruta')
              return {
                ...(ref || {}),
                ...wsServ,
                id_ruta: rutaId,
                nombre_ruta: nombreRuta,
                descripcion: nombreRuta
              }
            })
          }
        }
      } else if (activeTab.value === 'ESCOLTAS') {
        const res = await apiClient<{ done: boolean; data: any[] }>('/api/v1/escolta/listar_simple/', {
          method: 'POST',
          body: JSON.stringify({ id_grupo: groupId, estado: 1 })
        })
        if (res.done && Array.isArray(res.data)) {
          refEscoltas.value = res.data
          const existingMap = new Map<string, any>(escoltasList.value.map(e => [e.id_escolta || e.identificacion, e]))
          res.data.forEach((newItem: any) => {
            const key = newItem.id_escolta || newItem.identificacion
            if (key) {
              const existing = existingMap.get(key)
              existingMap.set(key, { ...existing, ...newItem })
            }
          })
          escoltasList.value = Array.from(existingMap.values())
        }
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
      // Notificar para repintar el mapa con los datos REST recién cargados
      onDataUpdated()
    }
  }

  const showWsModal = ref(false)

  const connectWebSocket = (isManualReset = false) => {
    if (isManualReset) {
      reconnectAttempts = 0
    }
    // Desconectar inmediatamente la conexión previa y anular sus handlers
    disconnectWebSocket()

    // Limpiar listas en vivo para asegurar que solo se muestren los datos que entregue el WebSocket actual
    if (activeTab.value === 'SERVICIOS') serviciosList.value = []
    else if (activeTab.value === 'HARDWARE') hardwareList.value = []
    // Para ESCOLTAS no vaciamos la lista, para conservar escoltas obtenidos en SERVICIOS hasta recibir la data del WS o REST

    isManualDisconnect = false
    wsStatus.value = 'connecting'
    wsError.value = null

    const queryToken = route?.query?.token_ws as string | undefined
    const queryGroupId = route?.query?.group_id as string | undefined

    if (queryToken) localStorage.setItem('auth-token-ws', queryToken.trim())
    if (queryGroupId) localStorage.setItem('auth-grupo-id', queryGroupId.trim())

    const tokenWs = localStorage.getItem('auth-token-ws') || ''
    const groupId = localStorage.getItem('auth-grupo-id') || ''

    if (!tokenWs || !groupId) {
      wsStatus.value = 'disconnected'
      wsError.value = 'No hay sesión activa. Inicia sesión primero.'
      showWsModal.value = true
      return
    }

    wsSessionId++
    const mySessionId = wsSessionId
    const myTab = activeTab.value
    const modo = myTab === 'SERVICIOS' ? '1' : (myTab === 'ESCOLTAS' ? '3' : '2')
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = window.location.host
    const wsUrl = `${wsProtocol}://${wsHost}/ws-flota/start/?token=${tokenWs}&modo=${modo}&group_id=${groupId}`

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        if (wsSessionId !== mySessionId) return
        wsStatus.value = 'connected'
        wsError.value = null
        showWsModal.value = false
        console.log(`%c[WebSocket CONECTADO] Pestaña: ${myTab} (Modo ${modo})`, 'color: #10b981; font-weight: bold;')
      }

      socket.onmessage = (event) => {
        if (wsSessionId !== mySessionId) return
        reconnectAttempts = 0
        try {
          const payload = JSON.parse(event.data)
          console.log(`%c[WebSocket DATA][Pestaña: ${myTab}][Modo ${modo}]`, 'color: #3b82f6; font-weight: bold;', payload)
          if (payload && payload.ev === 50) {
            // 1. Procesar si el payload contiene "servicios" (Modo 1)
            if (Array.isArray(payload.servicios)) {
              const serviciosData = payload.servicios

              const mergeServicioInfo = (wsServ: any) => {
                const wsId = String(wsServ.id_servicio || '').trim().toLowerCase()
                const existing = serviciosList.value.find(s => String(s.id_servicio || '').trim().toLowerCase() === wsId)
                const ref = refServicios.value.find(s => String(s.id_servicio || '').trim().toLowerCase() === wsId)
                const rutaId = String(wsServ.id_ruta || existing?.id_ruta || ref?.id_ruta || '').trim()
                const rutaRef = refRutas.value.find(r => String(r.id_ruta || '').trim() === rutaId)
                const nombreRuta = rutaRef?.nombre || existing?.nombre_ruta || ref?.nombre_ruta || ref?.ruta || (rutaId ? `Ruta ${rutaId}` : 'Sin Ruta')
                return {
                  ...(ref || {}),
                  ...(existing || {}),
                  ...wsServ,
                  id_ruta: rutaId,
                  nombre_ruta: nombreRuta,
                  descripcion: nombreRuta
                }
              }

              const enrichedServicios = serviciosData.map(mergeServicioInfo)

              if (payload.msg && payload.msg.toLowerCase().includes('inicial')) {
                serviciosList.value = enrichedServicios
              } else {
                enrichedServicios.forEach((updatedServicio: any) => {
                  const upId = String(updatedServicio.id_servicio || '').trim().toLowerCase()
                  const index = serviciosList.value.findIndex(s => String(s.id_servicio || '').trim().toLowerCase() === upId)
                  if (index !== -1) {
                    const prevIdRuta = serviciosList.value[index].id_ruta
                    const newIdRuta = updatedServicio.id_ruta || prevIdRuta || ''
                    serviciosList.value[index] = {
                      ...serviciosList.value[index],
                      ...updatedServicio,
                      id_ruta: newIdRuta
                    }
                  } else {
                    serviciosList.value.push(updatedServicio)
                  }
                  if (selectedItem.value && String(selectedItem.value.id_servicio || '').trim().toLowerCase() === upId) {
                    const prevIdRuta = selectedItem.value.id_ruta
                    const newIdRuta = updatedServicio.id_ruta || prevIdRuta || ''
                    selectedItem.value = {
                      ...selectedItem.value,
                      ...updatedServicio,
                      id_ruta: newIdRuta
                    }
                  }
                })
              }

              // Extraer vehículos y escoltas de los servicios para pintar en el mapa
              const allVehiculos: any[] = []
              const allEscoltas: any[] = []
              const allHardware: HardwareWs[] = []

              const sourceServicios = serviciosList.value.length > 0 ? serviciosList.value : serviciosData

              sourceServicios.forEach((serv: any) => {
                if (Array.isArray(serv.vehiculos)) {
                  serv.vehiculos.forEach((v: any) => {
                    allVehiculos.push({
                      ...v,
                      id_servicio: serv.id_servicio,
                      serial: v.id_hardware || v.id_vehiculo,
                      nombre: v.id_vehiculo,
                      descripcion: `Servicio: ${serv.id_servicio}`,
                      time_fx: v.time_fx || Date.now(),
                      speed: v.speed || 0,
                      course: v.course || 0,
                      battery: v.battery ?? 100,
                      status_lock: v.status_lock || ''
                    })
                    if (v.id_hardware) {
                      allHardware.push({
                        serial: v.id_hardware,
                        id_familia: 1,
                        nombre: v.id_vehiculo || v.id_hardware,
                        descripcion: `Vehículo de servicio ${serv.id_servicio}`,
                        id_grupo_servicio: '',
                        estado: serv.estado,
                        id_servicio: serv.id_servicio,
                        id_hardware: v.id_hardware,
                        lat: v.lat || 0,
                        lon: v.lon || 0,
                        time_fx: v.time_fx || Date.now(),
                        speed: v.speed || 0,
                        course: v.course || 0,
                        battery: v.battery ?? 100,
                        status_lock: v.status_lock || ''
                      })
                    }
                  })
                }

                if (Array.isArray(serv.alertas)) {
                  serv.alertas.forEach((a: any) => {
                    if (a.id_hardware) {
                      const existingIndex = allHardware.findIndex(h => h.serial === a.id_hardware)
                      if (existingIndex !== -1) {
                        // Si en vehiculos venía con lat=0 lon=0 pero en alertas tiene coordenadas, actualizar
                        if (allHardware[existingIndex].lat === 0 && allHardware[existingIndex].lon === 0 && a.lat && a.lon) {
                          allHardware[existingIndex].lat = a.lat
                          allHardware[existingIndex].lon = a.lon
                        }
                      } else {
                        allHardware.push({
                          serial: a.id_hardware,
                          id_familia: 1,
                          nombre: a.id_hardware,
                          descripcion: `Servicio ${serv.id_servicio}`,
                          id_grupo_servicio: '',
                          estado: serv.estado,
                          id_servicio: serv.id_servicio,
                          id_hardware: a.id_hardware,
                          lat: a.lat || 0,
                          lon: a.lon || 0,
                          time_fx: a.fecha_hora || Date.now(),
                          speed: 0,
                          course: 0,
                          battery: 0,
                          status_lock: ''
                        })
                      }
                    }
                  })
                }

                if (Array.isArray(serv.escoltas)) {
                  serv.escoltas.forEach((e: any) => {
                    const escId = e.id_escolta || e.identificacion || ''
                    const foundRef = refEscoltas.value.find(r => r.id_escolta === escId || r.identificacion === escId)
                    allEscoltas.push({
                      ...e,
                      id_servicio: serv.id_servicio,
                      nombre: foundRef?.nombre || foundRef?.nombres || e.nombre || escId,
                      identificacion: foundRef?.identificacion || e.identificacion || escId,
                      celular: foundRef?.celular || foundRef?.telefono || e.celular || ''
                    })
                  })
                }
              })

              vehiculosList.value = allVehiculos
              if (allHardware.length > 0) hardwareList.value = allHardware
              if (allEscoltas.length > 0) escoltasList.value = allEscoltas

              onDataUpdated()
            }

            // 2. Procesar si el payload contiene "flota" (Modo 2)
            if (Array.isArray(payload.flota)) {
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
            }

            // 3. Procesar si el payload contiene "escoltas" (Modo 3)
            if (Array.isArray(payload.escoltas)) {
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

      socket.onerror = (err) => {
        if (wsSessionId !== mySessionId) return
        wsError.value = 'Error en la conexión del servidor'
        console.error(`[WebSocket ERROR][Pestaña: ${myTab}]`, err)
      }

      socket.onclose = (event) => {
        if (wsSessionId !== mySessionId) return
        console.log(`%c[WebSocket DESCONECTADO][Pestaña: ${myTab}]`, 'color: #f59e0b; font-weight: bold;', event)
        wsStatus.value = 'disconnected'
        socket = null
        if (!isManualDisconnect) {
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            // Reintentar exactamente a los 5 segundos (5000 ms)
            reconnectTimeoutId = setTimeout(() => connectWebSocket(), 5000)
          } else {
            wsError.value = 'Su sesión ha vencido. Le recomendamos cerrar sesión en el aplicativo y volver a ingresar.'
            showWsModal.value = true
          }
        }
      }
    } catch (err) {
      wsStatus.value = 'disconnected'
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        reconnectTimeoutId = setTimeout(() => connectWebSocket(), 5000)
      } else {
        wsError.value = 'Su sesión ha vencido. Le recomendamos cerrar sesión en el aplicativo y volver a ingresar.'
        showWsModal.value = true
      }
    }
  }

  const disconnectWebSocket = () => {
    if (socket) {
      console.log(`%c[WebSocket CERRANDO CONEXIÓN PREVIA] Pestaña: ${activeTab.value}`, 'color: #ef4444;')
    }
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

  // Punto único de reacción al cambio de pestaña: carga REST inmediata
  // y (re)conexión del WebSocket. La vista solo cambia activeTab.
  watch(activeTab, () => {
    loadSecondaryData()
    if (activeTab.value === 'SERVICIOS' || activeTab.value === 'HARDWARE' || activeTab.value === 'ESCOLTAS') {
      connectWebSocket(true)
    } else {
      disconnectWebSocket()
    }
  })

  onUnmounted(() => {
    disconnectWebSocket()
    alertBroadcastChannel?.close()
  })

  return {
    hardwareList,
    serviciosList,
    escoltasList,
    vehiculosList,
    refServicios,
    refEscoltas,
    refVehiculos,
    refHardware,
    isLoadingSecondary,
    wsStatus,
    wsError,
    showWsModal,
    loadAllReferenceData,
    loadSecondaryData,
    connectWebSocket,
    disconnectWebSocket,
    solveAlertByToken
  }
}
