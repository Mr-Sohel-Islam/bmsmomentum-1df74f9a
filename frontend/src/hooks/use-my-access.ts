import { useQuery } from "@tanstack/react-query";
import type { Permission } from "@/lib/admin.functions";
import { apiClient, getAuthToken } from "@/lib/api-client";
import { ADMIN_ROLES, MANAGER_ROLES, hasAnyRole } from "@/lib/access";

type AccessPayload = {
  id?: string;
  userId?: string;
  user?: { id?: string; roles?: string[]; permissions?: string[] };
  roles?: string[];
  permissions?: string[];
};

function decodeTokenAccess(): AccessPayload | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as AccessPayload;
  } catch {
    return null;
  }
}

export function useMyAccess() {
  const tokenAccess = decodeTokenAccess();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<AccessPayload>("/auth/me"),
    retry: false,
  });

  const roles: string[] = data?.roles ?? data?.user?.roles ?? tokenAccess?.roles ?? [];
  const permissions: string[] =
    data?.permissions ?? data?.user?.permissions ?? tokenAccess?.permissions ?? [];
  const hasAllAccess = permissions.includes("all");
  const isAdmin = hasAllAccess || hasAnyRole(roles, ADMIN_ROLES);
  const can = (p: Permission | string) => isAdmin || hasAllAccess || permissions.includes(p);

  return {
    isLoading: isLoading && !tokenAccess,
    userId: data?.userId ?? data?.user?.id ?? tokenAccess?.userId ?? tokenAccess?.user?.id ?? tokenAccess?.id,
    roles,
    permissions,
    isAdmin,
    isManager: isAdmin || hasAnyRole(roles, MANAGER_ROLES),
    can,
    canAny: (items: Array<Permission | string>) => items.some(can),
  };
}
