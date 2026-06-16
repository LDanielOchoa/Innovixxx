import { z } from 'zod'

export const createRoleSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500, 'Máximo 500 caracteres'),
  id_grupo: z.string().length(8, 'Grupo inválido')
})

export const updateRoleSchema = z.object({
  id_role: z.string().min(1, 'ID de rol requerido'),
  nombre: z.string().min(2, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500, 'Máximo 500 caracteres'),
  id_grupo: z.string().length(8, 'Grupo inválido')
})

export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
