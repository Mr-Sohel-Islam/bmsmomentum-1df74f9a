import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function assertAdmin(context: { supabase: SupabaseClient; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (userData?.user?.email === "soheljavadeveloper@gmail.com") {
        return ["super_admin", "admin"];
      }
    } catch {
      /* ignore auth.admin failure if service role key is absent/invalid */
    }
  }

  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (roles.includes("admin") || roles.includes("super_admin")) {
    return roles;
  }

  // If there are no user roles configured at all yet, grant admin
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true });
  if (count === 0) {
    return ["super_admin", "admin"];
  }

  throw new Error("Admin access required");
}

async function assertPermission(
  context: { supabase: SupabaseClient; userId: string },
  permission: Permission,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (userData?.user?.email === "soheljavadeveloper@gmail.com") return;
    } catch {
      /* ignore auth.admin failure if service role key is absent/invalid */
    }
  }

  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const roleList = (roles ?? []).map((r: { role: string }) => r.role);
  if (roleList.includes("admin") || roleList.includes("super_admin")) return;

  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true });
  if (count === 0) return;

  const { data: perms } = await supabaseAdmin
    .from("user_permissions")
    .select("permission")
    .eq("user_id", context.userId)
    .eq("permission", permission);
  if (!perms || perms.length === 0) throw new Error(`Missing permission: ${permission}`);
}

// ---------- Metrics ----------
export const listMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("metrics")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const metricInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  unit: z.string().max(40).optional().nullable(),
  weight: z.number().min(0).max(100),
  active: z.boolean(),
});

export const createMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => metricInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "manage_metrics");
    const { data: row, error } = await context.supabase
      .from("metrics")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => metricInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "manage_metrics");
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("metrics")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "manage_metrics");
    const { error } = await context.supabase.from("metrics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Users + Roles + Permissions ----------
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch profiles safely using supabaseAdmin
    let profiles: Record<string, unknown>[] = [];
    try {
      const { data, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, avatar_url, department, position_id, manager_id, is_active, created_at",
        )
        .order("created_at", { ascending: false });
      if (pErr) console.error("[listUsers] Error fetching profiles:", pErr);
      if (data) profiles = data as Record<string, unknown>[];
    } catch (e) {
      console.error("[listUsers] Exception fetching profiles:", e);
    }

    // 2. Fetch auth users via admin API safely if service role key is present
    let authUsers: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      created_at?: string;
    }[] = [];
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (authList?.users) authUsers = authList.users;
      } catch {
        /* Ignore auth.admin failure if service role key is missing/invalid */
      }
    }

    const emailByUser = new Map<string, string>();
    for (const u of authUsers) {
      if (u.email) emailByUser.set(u.id, u.email);
    }

    // 3. Fetch roles and permissions safely
    let roles: { user_id: string; role: string }[] = [];
    try {
      const { data: rData } = await supabaseAdmin.from("user_roles").select("user_id, role");
      if (rData) roles = rData as { user_id: string; role: string }[];
    } catch (e) {
      console.error("[listUsers] Exception fetching user_roles:", e);
    }

    let perms: { user_id: string; permission: string }[] = [];
    try {
      const { data: pData } = await supabaseAdmin
        .from("user_permissions")
        .select("user_id, permission");
      if (pData) perms = pData as { user_id: string; permission: string }[];
    } catch (e) {
      console.error("[listUsers] Exception fetching user_permissions:", e);
    }

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    const permsByUser = new Map<string, string[]>();
    for (const p of perms) {
      const arr = permsByUser.get(p.user_id) ?? [];
      arr.push(p.permission);
      permsByUser.set(p.user_id, arr);
    }

    let reservedEmails = new Set<string>();
    try {
      const { data: reserved } = await supabaseAdmin.from("reserved_super_admins").select("email");
      if (reserved) reservedEmails = new Set(reserved.map((r: { email: string }) => r.email));
    } catch {
      // Ignore if table missing
    }

    const profileMap = new Map<string, Record<string, unknown>>();
    for (const p of profiles) {
      if (p.id) profileMap.set(p.id as string, p);
    }

    // Combine with authUsers so any user created in Auth appears even if profile record missing
    for (const u of authUsers) {
      if (!profileMap.has(u.id)) {
        profileMap.set(u.id, {
          id: u.id,
          full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          avatar_url: u.user_metadata?.avatar_url || null,
          department: null,
          position_id: null,
          manager_id: null,
          is_active: true,
          created_at: u.created_at || new Date().toISOString(),
        });
      }
    }

    return Array.from(profileMap.values()).map((p) => {
      const id = p.id as string;
      const email = emailByUser.get(id) ?? null;
      return {
        ...p,
        email,
        roles: rolesByUser.get(id) ?? [],
        permissions: permsByUser.get(id) ?? [],
        is_super_admin: email
          ? reservedEmails.has(email) || email === "soheljavadeveloper@gmail.com"
          : false,
      };
    });
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .single();
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const { data: perms } = await supabaseAdmin
      .from("user_permissions")
      .select("permission")
      .eq("user_id", context.userId);

    const isSohel = context.user?.email === "soheljavadeveloper@gmail.com";
    const userRoles = Array.from(
      new Set([
        ...(isSohel ? ["super_admin", "admin"] : []),
        ...(roles ?? []).map((r: { role: string }) => r.role),
      ]),
    );

    return {
      userId: context.userId,
      profile,
      roles: userRoles,
      permissions: (perms ?? []).map((p: { permission: string }) => p.permission),
    };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
        full_name: z.string().min(1).max(120),
        department: z.string().max(120).optional().nullable(),
        position_id: z.string().uuid().optional().nullable(),
        manager_id: z.string().uuid().optional().nullable(),
        roles: z.array(z.enum(ROLES)).default([]),
        permissions: z.array(z.enum(PERMISSIONS)).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "onboard_users");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cerr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cerr || !created.user) throw new Error(cerr?.message ?? "Failed to create user");
    const uid = created.user.id;

    // Guarantee profile upsert
    try {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: uid,
          full_name: data.full_name,
          department: data.department ?? null,
          position_id: data.position_id ?? null,
          manager_id: data.manager_id ?? null,
        },
        { onConflict: "id" },
      );
    } catch (e) {
      console.error("Profile upsert warning:", e);
    }

    // Filter out super_admin — not grantable
    const roles = data.roles.filter((r) => r !== "super_admin");
    if (roles.length) {
      await supabaseAdmin.from("user_roles").upsert(
        roles.map((role) => ({ user_id: uid, role })),
        { onConflict: "user_id,role" },
      );
    }
    if (data.permissions.length) {
      await supabaseAdmin.from("user_permissions").upsert(
        data.permissions.map((permission) => ({ user_id: uid, permission })),
        { onConflict: "user_id,permission" },
      );
    }
    return { id: uid };
  });

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        roles: z.array(z.enum(ROLES)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Never modify super admin
    const { data: isReserved } = await supabaseAdmin.rpc("is_reserved_super_admin", {
      _user_id: data.user_id,
    });
    if (isReserved) throw new Error("Super admin roles are immutable");

    const roles = data.roles.filter((r) => r !== "super_admin");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (roles.length) {
      await supabaseAdmin
        .from("user_roles")
        .insert(roles.map((role) => ({ user_id: data.user_id, role })));
    }
    return { ok: true };
  });

export const setUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        permissions: z.array(z.enum(PERMISSIONS)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.user_id);
    if (data.permissions.length) {
      await supabaseAdmin
        .from("user_permissions")
        .insert(data.permissions.map((permission) => ({ user_id: data.user_id, permission })));
    }
    return { ok: true };
  });

export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        full_name: z.string().min(1).max(120).optional(),
        department: z.string().max(120).nullable().optional(),
        position_id: z.string().uuid().nullable().optional(),
        manager_id: z.string().uuid().nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { user_id, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        new_password: z.string().min(8).max(128),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isReserved } = await supabaseAdmin.rpc("is_reserved_super_admin", {
      _user_id: data.user_id,
    });
    if (isReserved) throw new Error("Super admin password cannot be changed by other admins");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ new_password: z.string().min(8).max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.auth.updateUser({ password: data.new_password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isReserved } = await supabaseAdmin.rpc("is_reserved_super_admin", {
      _user_id: data.user_id,
    });
    if (isReserved) throw new Error("Super admin cannot be deleted");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reserved } = await supabaseAdmin
      .from("reserved_super_admins")
      .select("email")
      .eq("email", data.email)
      .maybeSingle();
    if (!reserved) throw new Error("Not a reserved super admin");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((u) => u.email === data.email);
    if (existing) {
      // Ensure role rows exist (bypass trigger via SECURITY DEFINER path uses insert directly)
      await supabaseAdmin.from("user_roles").upsert(
        [
          { user_id: existing.id, role: "super_admin" },
          { user_id: existing.id, role: "admin" },
        ],
        { onConflict: "user_id,role" },
      );
      return { ok: true, created: false };
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin" },
    });
    if (error) throw new Error(error.message);
    return { ok: true, created: true };
  });

// ---------- Positions ----------
const positionInput = z.object({
  title: z.string().min(1).max(120),
  level: z.number().int().min(0).max(20),
  parent_position_id: z.string().uuid().nullable().optional(),
});

export const listPositions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("positions")
      .select("*")
      .order("level", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const createPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => positionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("positions")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => positionInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("positions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Communication Flows (unchanged) ----------
export const listFlows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("communication_flows")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

const flowInput = z.object({
  name: z.string().min(1).max(120),
  from_role: z.string().min(1).max(60),
  to_role: z.string().min(1).max(60),
  cadence: z.string().min(1).max(60),
  active: z.boolean(),
});

export const createFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flowInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("communication_flows")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flowInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("communication_flows")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("communication_flows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Compatibility alias for existing admin.users page
export const toggleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), make_admin: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isReserved } = await supabaseAdmin.rpc("is_reserved_super_admin", {
      _user_id: data.user_id,
    });
    if (isReserved) throw new Error("Super admin roles are immutable");
    if (data.make_admin) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", "admin");
    }
    return { ok: true };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { roles: (data ?? []).map((r) => r.role), userId: context.userId };
  });
