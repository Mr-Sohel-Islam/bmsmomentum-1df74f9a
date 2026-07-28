import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient } from "./api-client";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "lead" | "manager" | "member" | "reviewer";
  user_name: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  lead_name: string | null;
  created_at: string;
  members: TeamMember[];
}

export const listTeams = createServerFn({ method: "GET" }).handler(async (): Promise<Team[]> => {
  return apiClient.get<Team[]>("/teams");
});

export const createTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional().nullable(),
        lead_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<Team>("/teams", data);
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/teams/${data.id}`);
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        team_id: z.string().uuid(),
        user_id: z.string().uuid(),
        role: z.enum(["lead", "manager", "member", "reviewer"]).default("member"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<TeamMember>(`/teams/${data.team_id}/members`, {
      user_id: data.user_id,
      role: data.role,
    });
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    // Note: data.id can be team_id or member ID; if passed team_id & user_id or id:
    return apiClient.delete<{ success: boolean }>(`/teams/${data.id}/members/${data.id}`);
  });

export const delegatePower = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["super_admin", "admin", "manager", "member"]),
        permissions: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await apiClient.put(`/profiles/${data.user_id}/roles`, { role: data.role });
    if (data.permissions) {
      await apiClient.put(`/profiles/${data.user_id}/permissions`, {
        permissions: data.permissions,
      });
    }
    return { success: true };
  });
