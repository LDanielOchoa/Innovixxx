export interface Grupo {
  id: string
  nombre: string
  created_at: string
  time_zone: string
  i18n: string
}

export interface GrupoCreatePayload {
  nombre: string
  time_zone: string
  i18n: string
}
