import { z } from 'zod'

export const createConductorSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100),
  cedula: z.string({ required_error: 'La cédula es requerida', invalid_type_error: 'La cédula debe ser texto' })
    .min(5, 'La cédula debe tener al menos 5 dígitos')
    .max(20),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  celular: z.string().min(7, 'El celular debe tener al menos 7 dígitos').optional().or(z.literal('')),
  id_grupo: z.string({ required_error: 'Debe seleccionar un grupo' }),
  tipo_pase: z.string().min(1, 'Seleccione la categoría de pase').optional().or(z.literal('')),
  pase: z.string().min(1, 'El número de pase es requerido').optional().or(z.literal('')),
  pase_vence: z.string().optional().or(z.literal(''))
})

export type CreateConductorInput = z.infer<typeof createConductorSchema>

export const updateConductorSchema = z.object({
  id_conductor: z.string().min(1, 'ID del conductor requerido'),
  id_grupo: z.string({ required_error: 'Debe seleccionar un grupo' }),
  nombre: z.string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100),
  cedula: z.string().optional().or(z.literal('')),
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  celular: z.string().min(7, 'El celular debe tener al menos 7 dígitos').optional().or(z.literal('')),
  tipo_pase: z.string().optional().or(z.literal('')),
  pase: z.string().optional().or(z.literal('')),
  pase_vence: z.string().optional().or(z.literal(''))
})

export type UpdateConductorInput = z.infer<typeof updateConductorSchema>
