import { z } from 'zod'

const celularRegex = /^[+]?[0-9]{7,15}$/

export const createEscoltaSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  cedula: z.string().min(5, 'La cédula debe tener al menos 5 dígitos').max(20),
  email: z.string().email('Correo electrónico inválido').or(z.literal('')).optional(),
  celular: z
    .string()
    .min(7, 'El celular debe tener al menos 7 dígitos')
    .regex(celularRegex, 'Formato de celular inválido')
    .optional()
    .or(z.literal('')),
  id_grupo: z.string().length(8),
  id_servicio: z.string().optional().or(z.literal('')),
  id_vehiculo: z.string().optional().or(z.literal('')),
  id_hardware: z.string().optional().or(z.literal('')),
  tipo_pase: z.string().optional().or(z.literal('')),
  pase: z.string().optional().or(z.literal('')),
  pase_vence: z.string().optional().or(z.literal(''))
})

export const updateEscoltaSchema = createEscoltaSchema.extend({
  id_escolta: z.string().min(1)
})

export type CreateEscoltaInput = z.infer<typeof createEscoltaSchema>
export type UpdateEscoltaInput = z.infer<typeof updateEscoltaSchema>