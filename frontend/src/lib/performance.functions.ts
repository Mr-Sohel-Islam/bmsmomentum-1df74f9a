import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient } from "./api-client";

// ---------- Metric Scores ----------
export const listMyScores = createServerFn({ method: "GET" }).handler(async () => {
  const me = await apiClient.get<any>("/auth/me");
  const userId = me?.user?.id || me?.profile?.id;
  if (!userId) return [];
  return apiClient.get<any[]>(`/metrics/scores/user/${userId}`);
});

export const listTeamScores = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/metrics/scores");
});

const scoreInput = z.object({
  user_id: z.string().min(1),
  metric_id: z.string().min(1),
  value: z.number(),
  period: z.string().min(1).max(20),
});

export const recordScore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => scoreInput.parse(d))
  .handler(async ({ data }) => {
    return apiClient.post<any>("/metrics/scores", {
      ...data,
      score: data.value,
    });
  });

export const deleteScore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/metrics/scores/${data.id}`);
  });

// ---------- Appreciations ----------
export const listAppreciations = createServerFn({ method: "GET" }).handler(async () => {
  const items = await apiClient.get<any[]>("/appreciations");
  const me = await apiClient.get<any>("/auth/me");
  return { items: items || [], me: me?.user?.id || "" };
});

export const sendAppreciation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        to_user: z.string().min(1),
        message: z.string().min(1).max(500),
        points: z.number().int().min(1).max(100).default(5),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<any>("/appreciations", {
      to_user: data.to_user,
      message: data.message,
      points: data.points,
    });
  });

export const leaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const items = await apiClient.get<any[]>("/appreciations");
  const totals = new Map<string, { points: number; count: number }>();
  for (const a of items ?? []) {
    const t = totals.get(a.to_user) ?? { points: 0, count: 0 };
    t.points += a.points || 0;
    t.count += 1;
    totals.set(a.to_user, t);
  }
  const ids = Array.from(totals.keys());
  if (ids.length === 0) return [];
  const profiles = await apiClient.get<any[]>("/profiles");
  const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
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

export const myDelivery = createServerFn({ method: "GET" }).handler(
  async (): Promise<DeliverySummary> => {
    const tasks = await apiClient.get<any[]>("/tasks");
    const rows = tasks ?? [];

    const done = rows.filter((t) => t.status === "done");
    const credited = done.filter(
      (t) => t.approval_status === "approved" || t.approval_status === "not_required" || !t.approval_status,
    );
    const pending = done.filter((t) => t.approval_status === "pending");

    const byPeriod = new Map<string, DeliveryPeriod>();
    for (const t of done) {
      const period = (t.completed_at ?? t.created_at ?? new Date().toISOString()).slice(0, 7);
      const entry = byPeriod.get(period) ?? { period, credited: 0, pending: 0, tasks: 0 };
      if (t.approval_status === "pending") entry.pending += t.points || 0;
      else entry.credited += t.points || 0;
      entry.tasks += 1;
      byPeriod.set(period, entry);
    }

    const stories = await apiClient.get<any[]>("/stories");
    const epics = await apiClient.get<any[]>("/epics");

    const storiesCompleted = (stories ?? []).filter((s) => s.status === "done").length;
    const epicsCompleted = (epics ?? []).filter((e) => e.status === "completed").length;

    return {
      periods: Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period)),
      totals: {
        creditedPoints: credited.reduce((s, t) => s + (t.points || 0), 0),
        pendingPoints: pending.reduce((s, t) => s + (t.points || 0), 0),
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
          points: t.points || 0,
          approval_status: t.approval_status || "approved",
          completed_at: t.completed_at || null,
        })),
    };
  },
);

// ---------- Sharing performance ----------
export const listShareTargets = createServerFn({ method: "GET" }).handler(async () => {
  const profiles = await apiClient.get<any[]>("/profiles");
  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    department: p.department,
    roles: [],
    is_my_manager: false,
  }));
});

export const sharePerformance = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        recipients: z.array(z.string().min(1)).min(1).max(25),
        period: z.string().min(1).max(20),
        note: z.string().max(1000).optional().nullable(),
        snapshot: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return { count: data.recipients.length };
  });

export interface PerformanceShare {
  id: string;
  owner_id?: string;
  shared_with?: string;
  period: string;
  note?: string | null;
  snapshot?: Record<string, any>;
  created_at?: string;
  owner_name?: string;
  recipient_name?: string;
}

export const listSharedWithMe = createServerFn({ method: "GET" }).handler(
  async (): Promise<PerformanceShare[]> => {
    return [];
  },
);

export const listMyShares = createServerFn({ method: "GET" }).handler(
  async (): Promise<PerformanceShare[]> => {
    return [];
  },
);
