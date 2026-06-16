import { z } from 'zod'

export const servicioCreateSchema = z.object({
  id_grupo: z.string().length(8, 'Debe seleccionar un grupo válido'),
  id_ruta: z.string().min(1, 'La ruta es obligatoria'),
  fecha_hora_inicio: z.string().min(1, 'La fecha y hora de inicio es obligatoria'),
  modo_fin: z.number().int().min(1, 'El modo de fin es obligatorio'),
  vehiculos_id: z.array(z.string()).min(1, 'Debe seleccionar al menos un vehículo')
})

export const servicioCambiarRutaSchema = z.object({
  id_grupo: z.string().length(8),
  id_servicio: z.string().min(1),
  id_ruta_old: z.string().min(1),
  id_ruta_new: z.string().min(1, 'Debe seleccionar la nueva ruta')
})

export const servicioCambiarEstadoSchema = z.object({
  id_grupo: z.string().length(8),
  id_servicio: z.string().min(1),
  old_state: z.number().int(),
  new_state: z.number().int().min(1, 'Debe seleccionar un nuevo estado'),
  descripcion: z.string().max(500, 'La descripción no puede superar los 500 caracteres').optional().or(z.literal(''))
})

export const servicioAsignarRecursosSchema = z.object({
  id_grupo: z.string().length(8, 'Grupo inválido'),
  id_servicio: z.string().min(1),
  fecha_hora_inicio: z.string().min(1, 'La fecha y hora de inicio es obligatoria'),
  modo_fin: z.number().int(),
  nivel_riesgo: z.number().int().min(1, 'Debe seleccionar el nivel de riesgo'),
  alcance: z.number().int().min(1, 'Debe seleccionar el alcance'),
  id_ruta: z.string().min(1, 'La ruta es obligatoria'),
  vehiculos: z.record(z.array(z.string())).refine(val => Object.keys(val).length > 0, {
    message: 'Debe asignar al menos un vehículo'
  }),
  escoltas_id: z.array(z.string()).min(1, 'Debe asignar al menos un escolta')
})

export const servicioActualizarVehiculosSchema = z.object({
  id_grupo: z.string().length(8),
  id_servicio: z.string().min(1),
  ids_salen: z.array(z.string()),
  ids_entran: z.record(z.array(z.string()))
})

export const servicioActualizarEscoltaSchema = z.object({
  id_grupo: z.string().length(8),
  id_servicio: z.string().min(1),
  salen: z.array(z.string()),
  entran: z.array(z.string())
})

export type ServicioCreateInput = z.infer<typeof servicioCreateSchema>
export type ServicioCambiarRutaInput = z.infer<typeof servicioCambiarRutaSchema>
export type ServicioCambiarEstadoInput = z.infer<typeof servicioCambiarEstadoSchema>
export type ServicioAsignarRecursosInput = z.infer<typeof servicioAsignarRecursosSchema>
export type ServicioActualizarVehiculosInput = z.infer<typeof servicioActualizarVehiculosSchema>
export type ServicioActualizarEscoltaInput = z.infer<typeof servicioActualizarEscoltaSchema>
