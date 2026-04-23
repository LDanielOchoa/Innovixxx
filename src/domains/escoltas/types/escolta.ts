export interface Escolta {
  id_escolta: string
  nombre: string
  cedula: string
  email: string
  celular: string
  id_grupo: string
}

export interface EscoltaCreatePayload {
  nombre: string
  cedula: string
  email: string
  celular: string
  id_grupo: string
}

export interface EscoltaUpdatePayload extends EscoltaCreatePayload {
  id_escolta: string
}

export interface EscoltaDeletePayload {
  id_grupo: string
  id_escolta: string
}

export interface EscoltaValidatePrePayload {
  id_grupo: string
  id_escolta: string
}

export interface EscoltaValidatePostPayload extends EscoltaValidatePrePayload {
  codigo: string
}
