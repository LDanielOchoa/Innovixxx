export interface Comando {
  id_comando?: string
  mask: string
  id_familia: number
  nombre: string
  texto: string
}

export interface ListarComandosPayload {
  id_grupo: string
  id_familia: number
}

export interface CrearComandoPayload {
  id_grupo: string
  id_familia: number
  nombre: string
  texto: string
}

export interface ActualizarComandoPayload {
  id_grupo: string
  id_comando: string
  id_familia: number
  nombre: string
  texto: string
}

export interface BorrarComandoPayload {
  id_grupo: string
  id_comando: string
}

