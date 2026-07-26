import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/admin.functions";
import type { Permission } from "@/lib/admin.functions";

export function useMyAccess() {
  const fetchMe = useServerFn(getMyProfile);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const roles: string[] = data?.roles ?? [];
  const permissions: string[] = data?.permissions ?? [];
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  return {
    isLoading,
    userId: data?.userId as string | undefined,
    roles,
    permissions,
    isAdmin,
    isManager: isAdmin || roles.includes("manager"),
    can: (p: Permission) => isAdmin || permissions.includes(p),
  };
}
