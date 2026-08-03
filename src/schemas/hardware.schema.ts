import { z } from 'zod'

export const createHardwareSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  serial: z.string().min(1, 'El serial es requerido').max(50),
  imei: z.string().optional().or(z.literal('')),
  mac: z.string().optional().or(z.literal('')),
  id_familia: z.number().min(1, 'Debe seleccionar una familia'),
  id_grupo: z.string().length(8),
  estado: z.number().default(1),
  id_ruta: z.union([z.number(), z.string()]).optional(),
  numero_sms: z.string().optional().or(z.literal('')),
  id_binario: z.string().optional().or(z.literal('')),
  clave_open: z.string().optional().or(z.literal(''))
})

export const updateHardwareSchema = createHardwareSchema.extend({
  id_hardware: z.string().min(1)
})

export type CreateHardwareInput = z.infer<typeof createHardwareSchema>
export type UpdateHardwareInput = z.infer<typeof updateHardwareSchema>