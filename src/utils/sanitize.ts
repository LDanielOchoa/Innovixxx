import DOMPurify from 'dompurify'

/**
 * Sanitiza un string de HTML para prevenir ataques XSS.
 * Permite configuración opcional.
 */
export function sanitizeHTML(dirtyHTML: string, config?: DOMPurify.Config): string {
  if (!dirtyHTML) return ''
  return DOMPurify.sanitize(dirtyHTML, config || {
    USE_PROFILES: { html: true } // Por defecto solo permite HTML básico, no SVG o MathML si no es necesario
  }) as string
}
