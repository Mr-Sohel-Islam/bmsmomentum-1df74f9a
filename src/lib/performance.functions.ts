import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Metric Scores ----------
export const listMyScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("metric_scores")
      .select("id, metric_id, value, period, created_at, metrics(name, unit, weight)")
      .eq("user_id", context.userId)
      .order("period", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listTeamScores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("metric_scores")
      .select("id, user_id, metric_id, value, period, created_at, metrics(name, unit, weight)")
      .order("period", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const scoreInput = z.object({
  user_id: z.string().uuid(),
  metric_id: z.string().uuid(),
  value: z.number(),
  period: z.string().min(1).max(20), // e.g. "2026-07"
});

export const recordScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => scoreInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("metric_scores")
      .insert({ ...data, recorded_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("metric_scores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Appreciations ----------
export const listAppreciations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("appreciations")
      .select("id, from_user, to_user, message, points, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    // Enrich with profile names
    const ids = Array.from(new Set((data ?? []).flatMap((a) => [a.from_user, a.to_user])));
    if (ids.length === 0) return { items: [], me: context.userId };
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    const items = (data ?? []).map((a) => ({
      ...a,
      from: map.get(a.from_user) ?? { id: a.from_user, full_name: "Unknown", avatar_url: null },
      to: map.get(a.to_user) ?? { id: a.to_user, full_name: "Unknown", avatar_url: null },
    }));
    return { items, me: context.userId };
  });

export const sendAppreciation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        to_user: z.string().uuid(),
        message: z.string().min(1).max(500),
        points: z.number().int().min(1).max(100).default(5),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.to_user === context.userId) throw new Error("You cannot appreciate yourself.");
    const { data: row, error } = await context.supabase
      .from("appreciations")
      .insert({
        from_user: context.userId,
        to_user: data.to_user,
        message: data.message,
        points: data.points,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const leaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("appreciations").select("to_user, points");
    if (error) throw new Error(error.message);
    const totals = new Map<string, { points: number; count: number }>();
    for (const a of data ?? []) {
      const t = totals.get(a.to_user) ?? { points: 0, count: 0 };
      t.points += a.points;
      t.count += 1;
      totals.set(a.to_user, t);
    }
    const ids = Array.from(totals.keys());
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return ids
      .map((id) => ({
        user_id: id,
        full_name: map.get(id)?.full_name ?? "Unknown",
        avatar_url: map.get(id)?.avatar_url ?? null,
        points: totals.get(id)!.points,
        count: totals.get(id)!.count,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
  });

// ---------- Delivery performance (epics / stories / tasks) ----------
export type DeliveryPeriod = {
  period: string;
  credited: number;
  pending: number;
  tasks: number;
};

export type DeliverySummary = {
  periods: DeliveryPeriod[];
  totals: {
    creditedPoints: number;
    pendingPoints: number;
    tasksDone: number;
    tasksPending: number;
    tasksOpen: number;
    storiesCompleted: number;
    epicsCompleted: number;
  };
  recent: {
    id: string;
    title: string;
    points: number;
    approval_status: string;
    completed_at: string | null;
  }[];
};

export const myDelivery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliverySummary> => {
    const { data: tasks, error } = await context.supabase
      .from("tasks")
      .select("id, title, points, status, approval_status, completed_at, story_id, epic_id")
      .eq("assignee_id", context.userId);
    if (error) throw new Error(error.message);
    const rows = tasks ?? [];

    const done = rows.filter((t) => t.status === "done");
    const credited = done.filter(
      (t) => t.approval_status === "approved" || t.approval_status === "not_required",
    );
    const pending = done.filter((t) => t.approval_status === "pending");

    const byPeriod = new Map<string, DeliveryPeriod>();
    for (const t of done) {
      const period = (t.completed_at ?? new Date().toISOString()).slice(0, 7);
      const entry = byPeriod.get(period) ?? { period, credited: 0, pending: 0, tasks: 0 };
      if (t.approval_status === "pending") entry.pending += t.points;
      else if (t.approval_status !== "rejected") entry.credited += t.points;
      entry.tasks += 1;
      byPeriod.set(period, entry);
    }

    const storyIds = Array.from(
      new Set(rows.map((t) => t.story_id).filter((v): v is string => Boolean(v))),
    );
    const epicIds = Array.from(
      new Set(rows.map((t) => t.epic_id).filter((v): v is string => Boolean(v))),
    );

    let storiesCompleted = 0;
    if (storyIds.length) {
      const { data } = await context.supabase
        .from("stories")
        .select("id")
        .in("id", storyIds)
        .eq("status", "done");
      storiesCompleted = (data ?? []).length;
    }
    let epicsCompleted = 0;
    if (epicIds.length) {
      const { data } = await context.supabase
        .from("epics")
        .select("id")
        .in("id", epicIds)
        .eq("status", "completed");
      epicsCompleted = (data ?? []).length;
    }

    return {
      periods: Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period)),
      totals: {
        creditedPoints: credited.reduce((s, t) => s + t.points, 0),
        pendingPoints: pending.reduce((s, t) => s + t.points, 0),
        tasksDone: credited.length,
        tasksPending: pending.length,
        tasksOpen: rows.length - done.length,
        storiesCompleted,
        epicsCompleted,
      },
      recent: done
        .slice()
        .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          title: t.title,
          points: t.points,
          approval_status: t.approval_status,
          completed_at: t.completed_at,
        })),
    };
  });

// ---------- Sharing performance ----------
export const listShareTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profiles }, { data: me }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, department, position_id")
        .eq("is_active", true)
        .order("full_name"),
      context.supabase.from("profiles").select("manager_id").eq("id", context.userId).maybeSingle(),
    ]);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role as string]);
    }
    return (profiles ?? [])
      .filter((p) => p.id !== context.userId)
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        department: p.department,
        roles: roleMap.get(p.id) ?? [],
        is_my_manager: me?.manager_id === p.id,
      }));
  });

export const sharePerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        recipients: z.array(z.string().uuid()).min(1).max(25),
        period: z.string().min(1).max(20),
        note: z.string().max(1000).optional().nullable(),
        snapshot: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = data.recipients.map((r) => ({
      owner_id: context.userId,
      shared_with: r,
      period: data.period,
      note: data.note || null,
      snapshot: data.snapshot as never,
    }));
    const { error } = await context.supabase
      .from("performance_shares")
      .upsert(rows, { onConflict: "owner_id,shared_with,period" });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

export const listSharedWithMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("performance_shares")
      .select("id, owner_id, period, note, snapshot, created_at")
      .eq("shared_with", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((s) => s.owner_id)));
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((s) => ({ ...s, owner_name: map.get(s.owner_id) ?? "Colleague" }));
  });

export const listMyShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("performance_shares")
      .select("id, shared_with, period, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((s) => s.shared_with)));
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((s) => ({ ...s, recipient_name: map.get(s.shared_with) ?? "User" }));
  });
