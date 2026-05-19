import { z } from 'zod'

export const createVehiculoServicioSchema = z.object({
  placa: z.string().min(1, 'La placa es requerida').max(20),
  serial_chasis: z.string().max(50).optional().or(z.literal('')),
  marca: z.string().min(1, 'La marca es requerida').max(50),
  referencia: z.string().min(1, 'La referencia es requerida').max(50),
  modelo: z.coerce.number().int().min(1900, 'El modelo debe ser un año válido').max(new Date().getFullYear() + 5, 'El modelo no es válido'),
  color: z.string().min(1, 'El color es requerido').max(20),
  cilindrada: z.coerce.number().min(0, 'La cilindrada debe ser un número positivo'),
  soat: z.string().max(50).optional().or(z.literal('')),
  soat_vence: z.string().optional().or(z.literal('')),
  tecnomecanica: z.string().max(50).optional().or(z.literal('')),
  tecnomecanica_vence: z.string().optional().or(z.literal('')),
  tipo: z.coerce.number().int().min(1, 'El tipo es requerido'),
  id_grupo: z.string().length(8)
})

export const updateVehiculoServicioSchema = createVehiculoServicioSchema.extend({
  id_vehiculo: z.string().min(1)
})

export type CreateVehiculoServicioInput = z.infer<typeof createVehiculoServicioSchema>
export type UpdateVehiculoServicioInput = z.infer<typeof updateVehiculoServicioSchema>
