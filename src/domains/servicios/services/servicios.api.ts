import { apiClient } from '../../../utils/api-client'
import type {
  Servicio,
  ServicioListPayload,
  ServicioCreatePayload,
  RutaSimple,
  VehiculoSimple,
  HardwareSimple,
  EscoltaSimple,
  ServicioAsignarRecursosPayload,
  ServicioDashboardPayload,
  ServicioDashboardResponse,
  ServicioActualizarEscoltasPayload,
  ServicioActualizarVehiculosPayload,
  ServicioHistorialPayload,
  ServicioHistorialResponse,
  ServicioCambiarEstadoPayload,
  ServicioAlertasPayload,
  ServicioAlertasResponse,
  ServicioEventoItem,
  ServicioEventoListPayload,
  ServicioEventoListResponse,
  ServicioEventoCreatePayload
} from '../types/servicio'

export const fetchServiciosApi = async (payload: ServicioListPayload): Promise<Servicio[]> => {
  const data = await apiClient<{ done: boolean; data: Servicio[] }>('/api/v1/servicio/listar_tabla/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const registrarServicioApi = async (payload: ServicioCreatePayload): Promise<any> => {
  return apiClient('/api/v1/servicio/registrar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchRutasSimplesApi = async (id_grupo: string): Promise<RutaSimple[]> => {
  const data = await apiClient<{ done: boolean; data: RutaSimple[] }>('/api/v1/ruta/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

export const fetchVehiculosSimplesApi = async (id_grupo: string, estado: number = 0): Promise<VehiculoSimple[]> => {
  const data = await apiClient<{ done: boolean; data: VehiculoSimple[] }>('/api/v1/vehiculo/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, estado })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Obtener dispositivos de hardware disponibles para el grupo
export const fetchHardwareSimplesApi = async (id_grupo: string, estado: number = 0): Promise<HardwareSimple[]> => {
  const data = await apiClient<{ done: boolean; data: HardwareSimple[] }>('/api/v1/hardware/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, estado })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Obtener escoltas disponibles para el grupo
export const fetchEscoltasSimplesApi = async (id_grupo: string, estado: number = 0): Promise<EscoltaSimple[]> => {
  const data = await apiClient<{ done: boolean; data: EscoltaSimple[] }>('/api/v1/escolta/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, estado })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Obtener servicios para dropdowns (listado simple por grupo)
export const fetchServiciosDropdownApi = async (id_grupo: string): Promise<Servicio[]> => {
  const data = await apiClient<{ done: boolean; data: Servicio[] }>('/api/v1/servicio/listar_tabla/', {
    method: 'POST',
    body: JSON.stringify({
      id_grupo,
      estado: 0,
      fecha_registro_inicial: '2020-01-01',
      fecha_registro_final: '2099-12-31',
      id_ruta: 'all',
      id_escolta: 'all'
    })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Enviar los datos para asignar los recursos al servicio
export const asignarRecursosServicioApi = async (payload: ServicioAsignarRecursosPayload): Promise<any> => {
  return apiClient('/api/v1/servicio/asignar_src/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export interface ServicioCambiarRutaPayload {
  id_grupo: string
  id_servicio: string
  id_ruta_old: string
  id_ruta_new: string
}

export const cambiarRutaServicioApi = async (payload: ServicioCambiarRutaPayload): Promise<any> => {
  return apiClient('/api/v1/servicio/cambiar_ruta/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchServicioDashboardApi = async (payload: ServicioDashboardPayload): Promise<ServicioDashboardResponse> => {
  return apiClient<ServicioDashboardResponse>('/api/v1/servicio/listar_dashboard/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const actualizarEscoltasApi = async (payload: ServicioActualizarEscoltasPayload): Promise<any> => {
  return apiClient('/api/v1/servicio/actualizar_escoltas/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const actualizarVehiculosApi = async (payload: ServicioActualizarVehiculosPayload): Promise<any> => {
  return apiClient('/api/v1/servicio/actualizar_vehiculos/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const verHistorialServicioApi = async (payload: ServicioHistorialPayload): Promise<ServicioHistorialResponse> => {
  return apiClient<ServicioHistorialResponse>('/api/v1/servicio/ver_historial/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const cambiarEstadoServicioApi = async (payload: ServicioCambiarEstadoPayload): Promise<any> => {
  return apiClient('/api/v1/servicio/cambiar_estado/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const solventarAlertaApi = async (token: string): Promise<any> => {
  return apiClient('/api/v1/servicio/solventar_alerta/', {
    method: 'POST',
    body: JSON.stringify({ token })
  })
}

export interface AlertasServicioListadoPayload {
  id_grupo: string
  desde: string
  hasta: string
  id_servicio: string
}

export interface AlertaServicioGlobalItem {
  token: string
  id_servicio: string
  fecha_hora: string
  hardware: string
  tipo_alerta: string
  atendida: boolean
  solventada: boolean
  solventada_por: string
  latitud: string
  longitud: string
  visible: boolean
}

export interface AlertasServicioListadoResponse {
  message: string
  done: boolean
  data: AlertaServicioGlobalItem[]
}

export const fetchAlertasListadoApi = async (payload: AlertasServicioListadoPayload): Promise<AlertasServicioListadoResponse> => {
  return apiClient<AlertasServicioListadoResponse>('/api/v1/alertas/listado/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchServicioAlertasApi = async (payload: ServicioAlertasPayload): Promise<ServicioAlertasResponse> => {
  return apiClient<ServicioAlertasResponse>('/api/v1/servicio/ver_alertas/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const fetchServicioEventosApi = async (payload: ServicioEventoListPayload): Promise<ServicioEventoListResponse> => {
  return apiClient<ServicioEventoListResponse>('/api/v1/servicio_evento/listar/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export const registrarServicioEventoApi = async (payload: ServicioEventoCreatePayload): Promise<any> => {
  const formData = new FormData()
  formData.append('id_grupo', payload.id_grupo)
  formData.append('id_servicio', payload.id_servicio)
  formData.append('tipo_evento', String(payload.tipo_evento))
  formData.append('observacion', payload.observacion || '')
  if (payload.visible !== undefined) {
    formData.append('visible', payload.visible ? 'True' : 'False')
  }
  if (payload.foto_1) formData.append('foto_1', payload.foto_1)
  if (payload.foto_2) formData.append('foto_2', payload.foto_2)
  if (payload.foto_3) formData.append('foto_3', payload.foto_3)

  return apiClient('/api/v1/servicio_evento/crear/', {
    method: 'POST',
    body: formData
  })
}

export interface ServicioEventoVerFotosPayload {
  id_grupo: string
  id_evento: string
}

export interface ServicioEventoVerFotosItem {
  url: string
}

export interface ServicioEventoVerFotosResponse {
  message: string
  done: boolean
  data: ServicioEventoVerFotosItem[]
}

export const fetchVerFotosServicioEventoApi = async (payload: ServicioEventoVerFotosPayload): Promise<ServicioEventoVerFotosResponse> => {
  return apiClient<ServicioEventoVerFotosResponse>('/api/v1/servicio_evento/ver_fotos/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export interface ServicioEventoCambiarVisibilidadPayload {
  id_grupo: string
  id_evento: string
  visible: boolean | string
}

export const cambiarVisibilidadServicioEventoApi = async (payload: ServicioEventoCambiarVisibilidadPayload): Promise<any> => {
  const formattedPayload = {
    ...payload,
    visible: typeof payload.visible === 'boolean' ? (payload.visible ? 'True' : 'False') : payload.visible
  }

  return apiClient('/api/v1/servicio_evento/cambiar_visibilidad/', {
    method: 'POST',
    body: JSON.stringify(formattedPayload)
  })
}




