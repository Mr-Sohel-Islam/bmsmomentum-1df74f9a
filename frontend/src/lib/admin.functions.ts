import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient } from "./api-client";

export const PERMISSIONS = [
  "onboard_users",
  "score_performance",
  "send_appreciation",
  "approve_requests",
  "view_team",
  "manage_metrics",
  "manage_tasks",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = ["super_admin", "admin", "manager", "member"] as const;
export type Role = (typeof ROLES)[number];

// ---------- Metrics ----------
export const listMetrics = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/metrics");
});

const metricInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
  weight: z.number().min(0).max(100),
  active: z.boolean(),
});

export const createMetric = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => metricInput.parse(d))
  .handler(async ({ data }) => {
    return apiClient.post<any>("/metrics", data);
  });

export const updateMetric = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => metricInput.extend({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    return apiClient.put<any>(`/metrics/${id}`, patch);
  });

export const deleteMetric = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/metrics/${data.id}`);
  });

// ---------- Users + Roles + Permissions ----------
export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/profiles");
});

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any>("/auth/me");
});

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
        full_name: z.string().min(1).max(120),
        department: z.string().max(120).optional().nullable(),
        position_id: z.string().min(1).optional().nullable(),
        manager_id: z.string().min(1).optional().nullable(),
        roles: z.array(z.enum(ROLES)).default([]),
        permissions: z.array(z.enum(PERMISSIONS)).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const profile = await apiClient.post<any>("/profiles", {
      id: data.email.split("@")[0],
      full_name: data.full_name,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.email}`,
    });
    if (data.roles.length) {
      await apiClient.put(`/profiles/${profile.id}/roles`, { roles: data.roles });
    }
    if (data.permissions.length) {
      await apiClient.put(`/profiles/${profile.id}/permissions`, {
        permissions: data.permissions,
      });
    }
    return { id: profile.id || data.email };
  });

export const setUserRoles = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().min(1),
        roles: z.array(z.enum(ROLES)),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await apiClient.put(`/profiles/${data.user_id}/roles`, { roles: data.roles });
    return { ok: true };
  });

export const setUserPermissions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().min(1),
        permissions: z.array(z.enum(PERMISSIONS)),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await apiClient.put(`/profiles/${data.user_id}/permissions`, {
      permissions: data.permissions,
    });
    return { ok: true };
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().min(1),
        full_name: z.string().min(1).max(120).optional(),
        department: z.string().max(120).nullable().optional(),
        position_id: z.string().min(1).nullable().optional(),
        manager_id: z.string().min(1).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { user_id, ...patch } = data;
    await apiClient.put(`/profiles/${user_id}`, patch);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().min(1),
        new_password: z.string().min(8).max(128),
      })
      .parse(d),
  )
  .handler(async (): Promise<{ ok: boolean }> => {
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ new_password: z.string().min(8).max(128) }).parse(d))
  .handler(async (): Promise<{ ok: boolean }> => {
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ user_id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/profiles/${data.user_id}`);
  });

export const bootstrapSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await apiClient.post("/auth/login", { email: data.email, password: data.password });
    return { ok: true };
  });

// ---------- Positions ----------
const positionInput = z.object({
  title: z.string().min(1).max(120),
  department: z.string().max(120).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const listPositions = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/positions");
});

export const createPosition = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => positionInput.parse(d))
  .handler(async ({ data }) => {
    return apiClient.post<any>("/positions", data);
  });

export const updatePosition = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => positionInput.extend({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    return apiClient.put<any>(`/positions/${id}`, patch);
  });

export const deletePosition = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/positions/${data.id}`);
  });

// ---------- Communication Flows ----------
export const listFlows = createServerFn({ method: "GET" }).handler(async () => {
  return [];
});

const flowInput = z.object({
  name: z.string().min(1).max(120),
  from_role: z.string().min(1).max(60),
  to_role: z.string().min(1).max(60),
  cadence: z.string().min(1).max(60),
  active: z.boolean(),
});

export const createFlow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => flowInput.parse(d))
  .handler(async (): Promise<{ ok: boolean }> => {
    return { ok: true };
  });

export const updateFlow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => flowInput.extend({ id: z.string().min(1) }).parse(d))
  .handler(async (): Promise<{ ok: boolean }> => {
    return { ok: true };
  });

export const deleteFlow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async (): Promise<{ ok: boolean }> => {
    return { ok: true };
  });

export const toggleAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().min(1), make_admin: z.boolean() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const roles = data.make_admin ? ["admin"] : ["user"];
    await apiClient.put(`/profiles/${data.user_id}/roles`, { roles });
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" }).handler(async () => {
  const me = await apiClient.get<any>("/auth/me");
  return { roles: me?.roles || [], userId: me?.user?.id || "" };
});
