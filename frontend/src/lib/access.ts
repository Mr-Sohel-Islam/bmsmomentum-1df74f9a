export const ADMIN_ROLES = ["super_admin", "admin", "director", "gm"];
export const MANAGER_ROLES = [...ADMIN_ROLES, "manager", "rm", "bm", "sm", "am", "smr"];

export function hasAnyRole(userRoles: string[], allowedRoles: string[]) {
  return allowedRoles.some((role) => userRoles.includes(role));
}
