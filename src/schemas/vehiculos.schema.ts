import { z } from 'zod'

export const createVehiculoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  placa: z.string().min(1, 'La placa es requerida').max(20),
  serial: z.string().max(50).optional(),
  tipo: z.union([z.string(), z.number()]).refine(val => val !== '' && val !== null && val !== undefined, {
    message: 'Debe seleccionar un tipo'
  }),
  id_grupo: z.string().length(8)
})

export const updateVehiculoSchema = createVehiculoSchema.extend({
  id_vehiculo: z.string().min(1)
})

export type CreateVehiculoInput = z.infer<typeof createVehiculoSchema>
export type UpdateVehiculoInput = z.infer<typeof updateVehiculoSchema>