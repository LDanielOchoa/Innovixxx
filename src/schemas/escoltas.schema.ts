import { z } from 'zod'


export const createEscoltaSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' }).min(2, 'El nombre es requerido').max(100),
  cedula: z.string({ required_error: 'La cédula es requerida', invalid_type_error: 'La cédula debe ser texto' }).min(5, 'La cédula debe tener al menos 5 dígitos').max(20),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  celular: z
    .string()
    .min(7, 'El celular debe tener al menos 7 dígitos')
    .optional()
    .or(z.literal('')),
  id_grupo: z.string({ required_error: 'Debe seleccionar un grupo' }),
  id_servicio: z.string().optional().or(z.literal('')),
  id_vehiculo: z.string().optional().or(z.literal('')),
  id_hardware: z.string().optional().or(z.literal('')),
  tipo_pase: z.string().optional().or(z.literal('')),
  pase: z.string().optional().or(z.literal('')),
  pase_vence: z.string().optional().or(z.literal(''))
})

export const updateEscoltaSchema = createEscoltaSchema.extend({
  id_escolta: z.string({ required_error: 'ID de escolta requerido' }).min(1).optional().or(z.literal(''))
})

export type CreateEscoltaInput = z.infer<typeof createEscoltaSchema>
export type UpdateEscoltaInput = z.infer<typeof updateEscoltaSchema>