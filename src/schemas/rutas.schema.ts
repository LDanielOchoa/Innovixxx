import { z } from 'zod'

const puntoSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  radio: z.number().optional()
})

export const createRutaSchema = z.object({
  id_grupo: z.string().length(8, 'Debe seleccionar un grupo válido'),
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  color: z.string().default('#3b82f6'),
  paradas: z.array(puntoSchema).min(2, 'La ruta debe tener al menos 2 paradas')
})

export const updateRutaSchema = z.object({
  id_grupo: z.string().length(8),
  id_ruta: z.string().min(1),
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  color: z.string(),
  paradas: z.array(puntoSchema).min(2, 'La ruta debe tener al menos 2 paradas')
})

export type CreateRutaInput = z.infer<typeof createRutaSchema>
export type UpdateRutaInput = z.infer<typeof updateRutaSchema>