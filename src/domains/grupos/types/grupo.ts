export interface Grupo {
  id: string
  nombre: string
  created_at: string
  time_zone: string
  i18n: string
  logo?: string
}

export interface GrupoCreatePayload {
  id?: string
  nombre: string
  time_zone: string
  i18n: string
  logo?: File | null
}
