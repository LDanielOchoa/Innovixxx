const TOKEN_COOKIE_NAME = 'auth-token'

function getCookieFlags(): string {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const secure = isLocal ? '' : 'Secure;'
  return `${secure}SameSite=Lax;Path=/`
}

function encodeToken(token: string): string {
  return btoa(unescape(encodeURIComponent(token)))
}

function decodeToken(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)))
  } catch {
    return ''
  }
}

export const CookieAuth = {
  setToken(token: string, days = 7) {
    const d = new Date()
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
    const expires = `expires=${d.toUTCString()}`
    const flags = getCookieFlags()
    const encoded = encodeToken(token)
    document.cookie = `${TOKEN_COOKIE_NAME}=${encoded};${expires};${flags}`
  },

  getToken(): string | null {
    const name = `${TOKEN_COOKIE_NAME}=`
    const decodedCookie = decodeURIComponent(document.cookie)
    const ca = decodedCookie.split(';')
    for (const cookieStr of ca) {
      const c = cookieStr?.trim() ?? ''
      if (c.startsWith(name)) {
        const encoded = c.substring(name.length)
        const decoded = decodeToken(encoded)
        return decoded || null
      }
    }
    return null
  },

  removeToken() {
    document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;Path=/;`
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocal) {
      document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;Secure;SameSite=Lax;Path=/;`
    }
  }
}
