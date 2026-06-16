import type { ZodSchema } from 'zod'
import { useValidationStore } from '../stores/validation.store'
import type { FieldError } from '../stores/validation.store'

function mapZodCodeToType(code: string): FieldError['type'] {
  switch (code) {
    case 'invalid_string':
      return 'format'
    case 'too_small':
      return 'min'
    case 'too_big':
      return 'max'
    case 'invalid_type':
      return 'format'
    default:
      return 'custom'
  }
}

export function useFormValidator<T extends Record<string, unknown>>(schema: any) {
  const validationStore = useValidationStore()

  const validate = (data: T, formId: string): boolean => {
    const unwrappedSchema = (schema && typeof schema === 'object' && 'value' in schema) 
      ? schema.value 
      : (typeof schema === 'function' && !schema.safeParse ? schema() : schema)
      
    const result = unwrappedSchema.safeParse(data)

    if (result.success) {
      validationStore.clearErrors(formId)
      return true
    }

    const fieldErrors: Record<string, FieldError> = {}
    for (const issue of result.error.issues) {
      const pathKey = issue.path.join('.')
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = {
          message: issue.message,
          type: mapZodCodeToType(issue.code)
        }
      }
    }

    validationStore.setErrors(formId, fieldErrors)
    return false
  }

  const getError = (formId: string, field: string): string | null => {
    return validationStore.getError(formId, field)
  }

  const hasError = (formId: string, field: string): boolean => {
    return validationStore.hasError(formId, field)
  }

  const getFirstError = (formId: string): string | null => {
    const allErrors = validationStore.getAllErrors(formId)
    const firstKey = Object.keys(allErrors)[0]
    return firstKey ? allErrors[firstKey]?.message ?? null : null
  }

  const resetErrors = (formId: string) => {
    validationStore.clearErrors(formId)
  }

  return { validate, getError, hasError, getFirstError, resetErrors }
}