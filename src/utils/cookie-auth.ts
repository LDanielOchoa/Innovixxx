/**
 * Utilidades para manejar cookies de sesión desde el frontend.
 * Nota: Ya que el backend no gestiona cookies HttpOnly, usamos cookies con
 * Secure y SameSite=Strict para mitigar riesgos como CSRF.
 */

export const CookieAuth = {
  setToken(token: string, days = 7) {
    const d = new Date()
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
    const expires = `expires=${d.toUTCString()}`
    // Configuramos Secure y SameSite=Strict
    // Solo si estamos en localhost quitamos el Secure temporalmente si no hay https, pero
    // por seguridad lo dejamos asumiendo https en prod o proxy local.
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const secureFlag = isLocal ? '' : 'Secure;'
    document.cookie = `auth-token=${token};${expires};path=/;${secureFlag}SameSite=Strict`
  },

  getToken(): string | null {
    const name = 'auth-token='
    const decodedCookie = decodeURIComponent(document.cookie)
    const ca = decodedCookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') {
        c = c.substring(1)
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length)
      }
    }
    return null
  },

  removeToken() {
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  }
}
