import { authMessages } from './auth'
import { commonMessages } from './common'
import { errorMessages } from './errors'
import { loginMessages } from './login'
import { sidebarMessages } from './sidebar'

export const baseMessages = {
  es: {
    common: commonMessages.es,
    login: loginMessages.es,
    errors: errorMessages.es,
    auth: authMessages.es,
    sidebar: sidebarMessages.es
  },
  en: {
    common: commonMessages.en,
    login: loginMessages.en,
    errors: errorMessages.en,
    auth: authMessages.en,
    sidebar: sidebarMessages.en
  }
}

export const moduleMessageLoaders: Record<string, () => Promise<any>> = {
  users: () => import('./users').then(m => m.usersMessages),
  roles: () => import('./roles').then(m => m.rolesMessages),
  grupos: () => import('./grupos').then(m => m.gruposMessages),
  sidebar: () => import('./sidebar').then(m => m.sidebarMessages),
  escoltas: () => import('./escoltas').then(m => m.escoltasMessages),
  hardware: () => import('./hardware').then(m => m.hardwareMessages),
  vehiculos: () => import('./vehiculos').then(m => m.vehiculosMessages),
  vehiculosServicio: () => import('./vehiculos-servicio').then(m => m.vehiculosServicioMessages),
  header: () => import('./header').then(m => m.headerMessages),
  dashboard: () => import('./dashboard').then(m => m.dashboard),
  rutas: () => import('./rutas').then(m => m.rutasMessages),
  geocercas: () => import('./geocercas').then(m => m.geocercasMessages),
  servicios: () => import('./servicios').then(m => m.serviciosMessages)
}




