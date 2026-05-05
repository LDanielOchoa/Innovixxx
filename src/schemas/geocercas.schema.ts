import { z } from 'zod'

const puntoSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  radio: z.number().optional()
})

export const createGeocercaSchema = z.object({
  id_grupo: z.string().length(8, 'Debe seleccionar un grupo válido'),
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  color: z.string().default('#3b82f6'),
  tipo: z.union([z.literal(1), z.literal(2)]),
  paradas: z.array(puntoSchema).min(1, 'Debe trazar la geocerca en el mapa')
})

export const updateGeocercaSchema = z.object({
  id_grupo: z.string().length(8),
  id_geocerca: z.string().min(1),
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  color: z.string(),
  tipo: z.union([z.literal(1), z.literal(2)]),
  paradas: z.array(puntoSchema).min(1)
})

export type CreateGeocercaInput = z.infer<typeof createGeocercaSchema>
export type UpdateGeocercaInput = z.infer<typeof updateGeocercaSchema>