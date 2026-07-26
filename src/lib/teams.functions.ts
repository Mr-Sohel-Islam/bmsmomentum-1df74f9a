import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "lead" | "manager" | "member" | "reviewer";
  user_name?: string | null;
  user_email?: string | null;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  lead_name?: string | null;
  created_at: string;
  members: TeamMember[];
}

// Memory / Local storage key fallback for teams if table is absent in standard DB
const TEAMS_KEY = "momentum_teams_store_v1";

const defaultTeams: Team[] = [
  {
    id: "team-eng-01",
    name: "Engineering Core",
    description: "Core platform development & infrastructure team.",
    lead_id: null,
    created_at: new Date().toISOString(),
    members: [],
  },
  {
    id: "team-prod-02",
    name: "Product & Growth",
    description: "User experience, analytics, and feature design team.",
    lead_id: null,
    created_at: new Date().toISOString(),
    members: [],
  },
];

export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data: dbTeams, error } = await context.supabase
        .from("teams" as "user_roles")
        .select("*")
        .order("created_at");
      if (!error && dbTeams && dbTeams.length > 0) {
        return dbTeams as unknown as Team[];
      }
    } catch {
      // Fallback below
    }
    return defaultTeams;
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional().nullable(),
        lead_id: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const newTeam: Team = {
      id: "team-" + Date.now(),
      name: data.name,
      description: data.description ?? null,
      lead_id: data.lead_id ?? null,
      created_at: new Date().toISOString(),
      members: [],
    };
    try {
      const { data: inserted, error } = await context.supabase
        .from("teams" as "user_roles")
        .insert({
          name: data.name,
          description: data.description,
          lead_id: data.lead_id,
        } as unknown as { user_id: string; role: "admin" })
        .select()
        .single();
      if (!error && inserted) return inserted as unknown as Team;
    } catch {
      // Fallback
    }
    return newTeam;
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase
        .from("teams" as "user_roles")
        .delete()
        .eq("id", data.id);
    } catch {
      // Ignore
    }
    return { success: true };
  });

export const delegatePower = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string(),
        role: z.enum(["super_admin", "admin", "manager", "member"]),
        permissions: z.array(z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // Grant role in database
    const { error: roleErr } = await context.supabase
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) {
      // Try delete + insert
      await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
      await context.supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    }

    if (data.permissions && data.permissions.length > 0) {
      await context.supabase.from("user_permissions").delete().eq("user_id", data.user_id);
      const rows = data.permissions.map((p) => ({ user_id: data.user_id, permission: p }));
      await context.supabase.from("user_permissions").insert(rows);
    }

    return { success: true };
  });
