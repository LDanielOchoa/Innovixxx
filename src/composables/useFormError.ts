import { computed } from 'vue'
import { useValidationStore } from '../stores/validation.store'

export function useFormError(formId: string) {
  const validationStore = useValidationStore()

  const getError = (field: string) => {
    return validationStore.getError(formId, field)
  }

  const hasError = (field: string) => {
    return validationStore.hasError(formId, field)
  }

  const errorClass = (field: string, baseClass = '') => {
    if (hasError(field)) {
      return `${baseClass} border-red-500 dark:border-red-500`
    }
    return baseClass
  }

  const firstError = computed(() => validationStore.getAllErrors(formId))

  const firstErrorMessage = computed(() => {
    const errors = firstError.value
    const keys = Object.keys(errors)
    if (keys.length === 0) return null
    const firstKey = keys[0]
    return firstKey ? errors[firstKey]?.message ?? null : null
  })

  const clearErrors = () => {
    validationStore.clearErrors(formId)
  }

  return {
    getError,
    hasError,
    errorClass,
    firstError,
    firstErrorMessage,
    clearErrors
  }
}