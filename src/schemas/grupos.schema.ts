import { z } from 'zod'

export const createGrupoSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido').max(100, 'Máximo 100 caracteres').trim(),
  time_zone: z.string().min(1, 'Debe seleccionar una zona horaria'),
  i18n: z.string().min(2).default('es'),
  logo: z.instanceof(File).nullable().optional()
})

export const updateGrupoSchema = createGrupoSchema.extend({
  id: z.string().min(8).max(8)
})

export type CreateGrupoInput = z.infer<typeof createGrupoSchema>
export type UpdateGrupoInput = z.infer<typeof updateGrupoSchema>