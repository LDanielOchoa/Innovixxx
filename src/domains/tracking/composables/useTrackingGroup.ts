import { ref, readonly } from 'vue'
import { setGrupoOverride } from '../../../utils/api-client'

/**
 * Sesión de grupo por ventana de tracking.
 *
 * El grupo de cada ventana ya NO viaja en la URL. El flujo es:
 *  1. Header.vue guarda un "handoff" de un solo uso en localStorage
 *     (`tracking-handoff:<id>`) y abre `/tracking` con window.name = `TrackingWindow_<id>`.
 *  2. La ventana nueva consume el handoff (lo borra) y guarda su grupo en
 *     sessionStorage, que es exclusivo de esa ventana y sobrevive a recargas.
 *
 * Así cada ventana mantiene su propio grupo aunque haya varias abiertas, y nunca
 * escribe el grupo global (`auth-grupo-id` / `auth-grupo-obj`) de la ventana principal.
 * El token WS no se transfiere: la ventana lo lee del almacenamiento de sesión (mismo origen).
 */

export const TRACKING_WINDOW_PREFIX = 'TrackingWindow_'
const HANDOFF_PREFIX = 'tracking-handoff:'
const HANDOFF_TTL_MS = 60_000
const SESSION_KEY = 'tracking-group-session'

interface TrackingHandoff {
  groupId: string
  // true: la ventana sigue los cambios de grupo de la ventana principal
  followMain: boolean
  expiresAt: number
}

interface TrackingSession {
  groupId: string
  followMain: boolean
}

// Llamado desde la ventana principal justo antes de window.open
export const createTrackingHandoff = (windowId: string, groupId: string, followMain: boolean) => {
  purgeExpiredHandoffs()
  const handoff: TrackingHandoff = { groupId, followMain, expiresAt: Date.now() + HANDOFF_TTL_MS }
  try {
    localStorage.setItem(HANDOFF_PREFIX + windowId, JSON.stringify(handoff))
  } catch (err) {
    console.error('[Tracking] No se pudo preparar la ventana de tracking:', err)
  }
}

const purgeExpiredHandoffs = () => {
  try {
    const now = Date.now()
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key?.startsWith(HANDOFF_PREFIX)) continue
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}') as Partial<TrackingHandoff>
        if (!data.expiresAt || data.expiresAt < now) localStorage.removeItem(key)
      } catch {
        localStorage.removeItem(key)
      }
    }
  } catch { /* almacenamiento no disponible */ }
}

const readSession = (): TrackingSession | null => {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as TrackingSession | null
    return data?.groupId?.trim() ? data : null
  } catch {
    return null
  }
}

const writeSession = (session: TrackingSession) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch { /* almacenamiento no disponible */ }
}

const consumeHandoff = (): TrackingSession | null => {
  if (!window.name.startsWith(TRACKING_WINDOW_PREFIX)) return null
  const key = HANDOFF_PREFIX + window.name.slice(TRACKING_WINDOW_PREFIX.length)
  try {
    const raw = localStorage.getItem(key)
    localStorage.removeItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as TrackingHandoff
    if (!data.groupId?.trim() || data.expiresAt < Date.now()) return null
    return { groupId: data.groupId.trim(), followMain: !!data.followMain }
  } catch {
    return null
  } finally {
    purgeExpiredHandoffs()
  }
}

// Compatibilidad con enlaces antiguos `/tracking?token_ws=...&group_id=...`:
// se toman los valores y se eliminan de la URL sin recargar ni crear entrada en el historial.
const consumeLegacyQuery = (): TrackingSession | null => {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('token_ws')?.trim()
  const groupId = url.searchParams.get('group_id')?.trim()
  if (!url.searchParams.has('token_ws') && !url.searchParams.has('group_id')) return null

  if (token && !localStorage.getItem('auth-token-ws')) localStorage.setItem('auth-token-ws', token)
  url.searchParams.delete('token_ws')
  url.searchParams.delete('group_id')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)

  return groupId ? { groupId, followMain: true } : null
}

const resolveInitialSession = (): TrackingSession => {
  // El orden importa: la URL antigua debe limpiarse siempre, y un handoff nuevo
  // (ventana reutilizada) tiene prioridad sobre la sesión guardada.
  const legacy = consumeLegacyQuery()
  const session = consumeHandoff() || legacy || readSession() || {
    groupId: (localStorage.getItem('auth-grupo-id') || '').trim(),
    followMain: true
  }
  if (session.groupId) writeSession(session)
  return session
}

// Estado a nivel de módulo: una instancia por ventana (cada ventana tiene su propio contexto JS)
let initialized = false
const groupId = ref('')
const followMain = ref(true)

const initTrackingGroup = () => {
  if (initialized) return
  initialized = true
  const session = resolveInitialSession()
  groupId.value = session.groupId
  followMain.value = session.followMain
  setGrupoOverride(session.groupId || null)
}

export function useTrackingGroup() {
  initTrackingGroup()

  const setTrackingGroupId = (newGroupId: string) => {
    const id = newGroupId.trim()
    if (!id || id === groupId.value) return
    groupId.value = id
    writeSession({ groupId: id, followMain: followMain.value })
    setGrupoOverride(id)
  }

  return {
    trackingGroupId: readonly(groupId),
    followsMainWindow: readonly(followMain),
    setTrackingGroupId
  }
}
