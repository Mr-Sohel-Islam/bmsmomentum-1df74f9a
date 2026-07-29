import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Team[]> => {
    const { data: teams, error } = await context.supabase
      .from("teams")
      .select("id, name, description, lead_id, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);
    if (!teams || teams.length === 0) return [];

    const { data: members } = await context.supabase
      .from("team_members")
      .select("id, team_id, user_id, role");
    const ids = Array.from(
      new Set([
        ...teams.map((t) => t.lead_id).filter((v): v is string => Boolean(v)),
        ...(members ?? []).map((m) => m.user_id),
      ]),
    );
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      lead_id: t.lead_id,
      lead_name: t.lead_id ? ((nameMap.get(t.lead_id) ?? null) as string | null) : null,
      created_at: t.created_at,
      members: (members ?? [])
        .filter((m) => m.team_id === t.id)
        .map((m) => ({
          id: m.id,
          team_id: m.team_id,
          user_id: m.user_id,
          role: m.role as TeamMember["role"],
          user_name: (nameMap.get(m.user_id) ?? null) as string | null,
        })),
    }));
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional().nullable(),
        lead_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("teams")
      .insert({
        name: data.name,
        description: data.description || null,
        lead_id: data.lead_id || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.lead_id) {
      await context.supabase
        .from("team_members")
        .insert({ team_id: row.id, user_id: data.lead_id, role: "lead" });
    }
    return row;
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        team_id: z.string().uuid(),
        user_id: z.string().uuid(),
        role: z.enum(["lead", "manager", "member", "reviewer"]).default("member"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .upsert(data, { onConflict: "team_id,user_id" });
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const delegatePower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.enum(["super_admin", "admin", "manager", "member"]),
        permissions: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error: roleErr } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    if (data.permissions) {
      await context.supabase.from("user_permissions").delete().eq("user_id", data.user_id);
      if (data.permissions.length > 0) {
        const rows = data.permissions.map((p) => ({ user_id: data.user_id, permission: p }));
        const { error } = await context.supabase.from("user_permissions").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    return { success: true };
  });
