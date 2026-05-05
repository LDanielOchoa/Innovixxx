import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
})

export const recoverEmailSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Correo electrónico inválido')
})

export const resetPasswordSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Correo electrónico inválido'),
  token_recover: z.string().min(1, 'Token de recuperación faltante'),
  new_pass: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
})

export type LoginInput = z.infer<typeof loginSchema>
export type RecoverEmailInput = z.infer<typeof recoverEmailSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>