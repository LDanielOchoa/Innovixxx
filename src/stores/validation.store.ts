import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface FieldError {
  message: string
  type: 'required' | 'format' | 'min' | 'max' | 'pattern' | 'custom'
}

export const useValidationStore = defineStore('validation', () => {
  const errors = ref<Record<string, Record<string, FieldError>>>({})

  const getError = (formId: string, field: string): string | null => {
    return errors.value[formId]?.[field]?.message ?? null
  }

  const hasError = (formId: string, field: string): boolean => {
    return !!errors.value[formId]?.[field]
  }

  const setError = (formId: string, field: string, error: FieldError) => {
    if (!errors.value[formId]) errors.value[formId] = {}
    errors.value[formId][field] = error
  }

  const setErrors = (formId: string, fieldErrors: Record<string, FieldError>) => {
    errors.value[formId] = fieldErrors
  }

  const clearError = (formId: string, field: string) => {
    delete errors.value[formId]?.[field]
  }

  const clearErrors = (formId: string) => {
    errors.value[formId] = {}
  }

  const clearAllErrors = () => {
    errors.value = {}
  }

  const getAllErrors = (formId: string): Record<string, FieldError> => {
    return errors.value[formId] ?? {}
  }

  return {
    errors,
    getError,
    hasError,
    setError,
    setErrors,
    clearError,
    clearErrors,
    clearAllErrors,
    getAllErrors
  }
})