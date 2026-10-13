import { apiClient } from '../../../utils/api-client'
import type {
  Conductor,
  ConductorListResponse,
  ConductorCreatePayload,
  ConductorCreateResponse,
  ConductorUpdatePayload,
  ConductorUpdateResponse,
  ConductorDeletePayload,
  ConductorDeleteResponse
} from '../types/conductor'

export const fetchConductoresApi = async (id_grupo?: string): Promise<Conductor[]> => {
  const data = await apiClient<ConductorListResponse>('/api/v1/conductor/listar/', {
    method: 'POST',
    body: JSON.stringify(id_grupo ? { id_grupo } : {})
  })
  return data?.done && Array.isArray(data?.data) ? data.data : []
}

export const createConductorApi = async (
  payload: FormData | ConductorCreatePayload
): Promise<ConductorCreateResponse> => {
  let body: FormData
  if (payload instanceof FormData) {
    body = payload
  } else {
    body = new FormData()
    body.append('id_grupo', payload.id_grupo)
    body.append('nombre', payload.nombre)
    body.append('cedula', payload.cedula)
    body.append('email', payload.email)
    body.append('celular', payload.celular)
    body.append('tipo_pase', payload.tipo_pase)
    body.append('pase', payload.pase)
    body.append('pase_vence', payload.pase_vence)
    if (payload.foto) {
      body.append('foto', payload.foto)
    }
  }

  return apiClient<ConductorCreateResponse>('/api/v1/conductor/crear/', {
    method: 'POST',
    body
  })
}

export const updateConductorApi = async (
  payload: FormData | ConductorUpdatePayload
): Promise<ConductorUpdateResponse> => {
  let body: FormData
  if (payload instanceof FormData) {
    body = payload
  } else {
    body = new FormData()
    body.append('id_grupo', payload.id_grupo)
    body.append('id_conductor', payload.id_conductor)
    if (payload.nombre) body.append('nombre', payload.nombre)
    if (payload.cedula) body.append('cedula', payload.cedula)
    if (payload.email) body.append('email', payload.email)
    if (payload.celular) body.append('celular', payload.celular)
    if (payload.tipo_pase) body.append('tipo_pase', payload.tipo_pase)
    if (payload.pase) body.append('pase', payload.pase)
    if (payload.pase_vence) body.append('pase_vence', payload.pase_vence)
    if (payload.foto) {
      body.append('foto', payload.foto)
    }
  }

  return apiClient<ConductorUpdateResponse>('/api/v1/conductor/actualizar/', {
    method: 'POST',
    body
  })
}

export const deleteConductorApi = async (
  payload: ConductorDeletePayload
): Promise<ConductorDeleteResponse> => {
  return apiClient<ConductorDeleteResponse>('/api/v1/conductor/borrar/', {
    method: 'POST',
    body: JSON.stringify({
      id_grupo: payload.id_grupo,
      id_conductor: payload.id_conductor,
      id_escolta: payload.id_conductor
    })
  })
}
