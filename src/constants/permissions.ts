
export const PERMISSIONS = {
  USERS_VIEW: 7,
  ROLES_VIEW: 2,
  HARDWARE_VIEW: 11,
  BODYGUARDS_VIEW: 20,
  ROUTES_VIEW: 22,
  GEOFENCES_VIEW: 26,
} as const

export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS]
