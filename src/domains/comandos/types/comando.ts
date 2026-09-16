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

export interface EjecutarComandoPayload {
  id_grupo: string
  id_comando: string
  id_hardware: string
}

export interface HistorialComandoItem {
  id_comando: string
  comando_nombre: string
  id_hardware: string
  hardware_nombre: string
  fecha_hora: string
  ejecutado_por: string
}

export interface HistorialComandosPayload {
  id_grupo: string
  desde: string
  hasta: string
  id_familia: number
  id_usuario?: string
}


