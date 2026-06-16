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
  ServicioCambiarEstadoPayload
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

export const fetchVehiculosSimplesApi = async (id_grupo: string, estado: number = 1): Promise<VehiculoSimple[]> => {
  const data = await apiClient<{ done: boolean; data: VehiculoSimple[] }>('/api/v1/vehiculo_servicio/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Obtener dispositivos de hardware disponibles para el grupo
export const fetchHardwareSimplesApi = async (id_grupo: string, estado: number = 1): Promise<HardwareSimple[]> => {
  const data = await apiClient<{ done: boolean; data: HardwareSimple[] }>('/api/v1/hardware/listar_simple/', {
    method: 'POST',
    body: JSON.stringify({ id_grupo, estado })
  })
  return data.done && Array.isArray(data.data) ? data.data : []
}

// Obtener escoltas disponibles para el grupo
export const fetchEscoltasSimplesApi = async (id_grupo: string, estado: number = 1): Promise<EscoltaSimple[]> => {
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

