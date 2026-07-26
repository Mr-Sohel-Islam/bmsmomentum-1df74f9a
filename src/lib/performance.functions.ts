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
