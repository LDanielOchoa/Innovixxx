
import { PERMISSIONS as UTILS_PERMISSIONS } from '../utils/permissions'

export const PERMISSIONS = UTILS_PERMISSIONS
export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS] | string

