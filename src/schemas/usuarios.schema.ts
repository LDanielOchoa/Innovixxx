import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().min(1, 'El correo es requerido').email('Correo electrónico inválido'),
  pass: passwordSchema,
  id_role: z.string().min(1, 'Debe seleccionar un rol'),
  id_grupo: z.string().length(8, 'Grupo inválido'),
  lang: z.string().min(2).default('es')
})

export const updateUsuarioSchema = z.object({
  id_usuario: z.string().min(1, 'ID de usuario requerido'),
  id_role: z.string().min(1, 'Debe seleccionar un rol'),
  nombre: z.string().min(2, 'El nombre es requerido').max(100),
  email: z.string().min(1, 'El correo es requerido').email('Correo electrónico inválido'),
  lang: z.string().min(2).default('es'),
  pass: z.preprocess((val) => (val === '' || val === undefined ? undefined : val), passwordSchema.optional())
})

export const deleteUsuarioSchema = z.object({
  id_grupo: z.string().length(8),
  id_usuario: z.string().min(1),
  lang: z.string().default('es')
})

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>
export type DeleteUsuarioInput = z.infer<typeof deleteUsuarioSchema>