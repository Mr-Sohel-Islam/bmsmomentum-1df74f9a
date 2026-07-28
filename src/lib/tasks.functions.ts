import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { withNames, namesFor } from "./tasks.server";
import type { TaskWithNames } from "./tasks.server";
import type { Database } from "@/integrations/supabase/types";

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type Task = TaskWithNames;

export type Epic = Database["public"]["Tables"]["epics"]["Row"];
export type Sprint = Database["public"]["Tables"]["sprints"]["Row"];
export type Story = Database["public"]["Tables"]["stories"]["Row"];

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Task[]> => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return withNames(context.supabase, data ?? []);
  });

export const listAssignableUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, avatar_url, department, is_active")
      .eq("is_active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const ESTIMATE_UNITS = ["hours", "days"] as const;
export type EstimateUnit = (typeof ESTIMATE_UNITS)[number];

const taskInput = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  epic_id: z.string().uuid().optional().nullable(),
  sprint_id: z.string().uuid().optional().nullable(),
  story_id: z.string().uuid().optional().nullable(),
  status: z.enum(TASK_STATUSES).default("todo"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  points: z.number().int().min(0).max(1000).default(0),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimate_value: z.number().min(0).max(10000).optional().nullable(),
  estimate_unit: z.enum(ESTIMATE_UNITS).default("hours"),
});

export type TaskInput = z.input<typeof taskInput>;
export type TaskUpdateInput = Partial<TaskInput> & { id: string };
export type EpicInput = {
  title: string;
  description?: string | null;
  status?: "planning" | "in_progress" | "completed";
  color?: string;
};
export type SprintInput = {
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: "planning" | "active" | "completed";
  total_points?: number;
};
export type StoryInput = {
  title: string;
  description?: string | null;
  epic_id?: string | null;
  sprint_id?: string | null;
  points?: number;
  status?: "backlog" | "in_progress" | "review" | "done";
};



export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        title: data.title,
        description: data.description || null,
        assignee_id: data.assignee_id || context.userId,
        assigner_id: context.userId,
        team_id: data.team_id || null,
        epic_id: data.epic_id || null,
        sprint_id: data.sprint_id || null,
        story_id: data.story_id || null,
        status: data.status,
        priority: data.priority,
        points: data.points,
        due_date: data.due_date || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, assignee_id, due_date, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("tasks")
      .update({
        ...rest,
        ...(assignee_id ? { assignee_id } : {}),
        ...("due_date" in data ? { due_date: due_date || null } : {}),
        ...(rest.status === "done" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", id)

      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkAssignTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()),
        assignee_id: z.string().uuid().optional().nullable(),
        team_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { count: 0 };
    const { error } = await context.supabase
      .from("tasks")
      .update({
        ...(data.assignee_id ? { assignee_id: data.assignee_id } : {}),
        ...(data.team_id !== undefined ? { team_id: data.team_id } : {}),
      })

      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { count: data.ids.length };
  });

export const bulkUpdateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()), status: z.enum(TASK_STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { count: 0 };
    const { error } = await context.supabase
      .from("tasks")
      .update({
        status: data.status,
        ...(data.status === "done" ? { completed_at: new Date().toISOString() } : {}),
      })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { count: data.ids.length };
  });

export const bulkDeleteTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { count: 0 };
    const { error } = await context.supabase.from("tasks").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { count: data.ids.length };
  });

export const listTaskComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ task_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at")
      .eq("task_id", data.task_id)
      .order("created_at");
    if (error) throw new Error(error.message);
    const map = await namesFor(
      context.supabase,
      (rows ?? []).map((r) => r.author_id),
    );
    return (rows ?? []).map((r) => ({
      ...r,
      author_name: (map.get(r.author_id) ?? null) as string | null,
    }));
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("task_comments")
      .insert({ task_id: data.task_id, body: data.body, author_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Epics ----------
export const listEpics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Epic[]> => {
    const { data, error } = await context.supabase
      .from("epics")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createEpic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(160),
        description: z.string().max(1000).optional().nullable(),
        status: z.enum(["planning", "in_progress", "completed"]).default("planning"),
        color: z.string().max(20).default("#10b981"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("epics")
      .insert({ ...data, description: data.description || null })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEpic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("epics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Sprints ----------
export const listSprints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Sprint[]> => {
    const { data, error } = await context.supabase
      .from("sprints")
      .select("*")
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        goal: z.string().max(500).optional().nullable(),
        start_date: z.string().optional().nullable(),
        end_date: z.string().optional().nullable(),
        status: z.enum(["planning", "active", "completed"]).default("planning"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sprints")
      .insert({
        name: data.name,
        goal: data.goal || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        status: data.status,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sprints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Stories ----------
export const listStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Story[]> => {
    const { data, error } = await context.supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(160),
        description: z.string().max(1000).optional().nullable(),
        epic_id: z.string().uuid().optional().nullable(),
        sprint_id: z.string().uuid().optional().nullable(),
        points: z.number().int().min(0).max(200).default(0),
        status: z.enum(["backlog", "in_progress", "review", "done"]).default("backlog"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        title: data.title,
        description: data.description || null,
        epic_id: data.epic_id || null,
        sprint_id: data.sprint_id || null,
        points: data.points,
        status: data.status,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
