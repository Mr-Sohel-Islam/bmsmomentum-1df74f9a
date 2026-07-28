import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient } from "./api-client";

export const TASK_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  team_id: string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  assigner_id: string | null;
  reporter_id: string | null;
  reporter_name?: string | null;
  sprint_id: string | null;
  sprint_name?: string | null;
  epic_id: string | null;
  epic_title?: string | null;
  story_id: string | null;
  story_title?: string | null;
  points: number;
  start_date?: string | null;
  due_date: string | null;
  estimate_value?: number | null;
  estimate_unit?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: string;
  color?: string;
  created_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
}

export interface Story {
  id: string;
  epic_id: string | null;
  sprint_id?: string | null;
  title: string;
  description: string | null;
  points: number;
  status: string;
  created_at: string;
}

export const listTasks = createServerFn({ method: "GET" }).handler(async (): Promise<Task[]> => {
  return apiClient.get<Task[]>("/tasks");
});

export const listAssignableUsers = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/profiles");
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
  .inputValidator((d: unknown) => taskInput.parse(d))
  .handler(async ({ data }) => {
    return apiClient.post<Task>("/tasks", data);
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => taskInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    return apiClient.put<Task>(`/tasks/${id}`, patch);
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/tasks/${data.id}`);
  });

export const bulkAssignTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        task_ids: z.array(z.string().uuid()).min(1),
        assignee_id: z.string().uuid().optional().nullable(),
        team_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<{ count: number }>("/tasks/bulk-assign", {
      ids: data.task_ids,
      assignee_id: data.assignee_id,
      team_id: data.team_id,
    });
  });

export const bulkUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        task_ids: z.array(z.string().uuid()).min(1),
        status: z.enum(TASK_STATUSES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<{ count: number }>("/tasks/bulk-status", {
      ids: data.task_ids,
      status: data.status,
    });
  });

export const bulkUpdateTaskStatus = bulkUpdateStatus;

export const bulkDeleteTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ task_ids: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<{ count: number }>("/tasks/bulk-delete", {
      ids: data.task_ids,
    });
  });

export const listEpics = createServerFn({ method: "GET" }).handler(async (): Promise<Epic[]> => {
  return apiClient.get<Epic[]>("/epics");
});

export const createEpic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(120),
        description: z.string().max(1000).optional().nullable(),
        color: z.string().max(30).default("#10b981"),
        status: z.enum(["planning", "in_progress", "completed", "open"]).default("open"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<Epic>("/epics", data);
  });

export const listSprints = createServerFn({ method: "GET" }).handler(async (): Promise<Sprint[]> => {
  return apiClient.get<Sprint[]>("/sprints");
});

export const createSprint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        goal: z.string().max(1000).optional().nullable(),
        start_date: z.string().optional().nullable(),
        end_date: z.string().optional().nullable(),
        status: z.enum(["planning", "active", "completed"]).default("planning"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<Sprint>("/sprints", data);
  });

export const listStories = createServerFn({ method: "GET" }).handler(async (): Promise<Story[]> => {
  return apiClient.get<Story[]>("/stories");
});

export const createStory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().min(1).max(160),
        description: z.string().max(1000).optional().nullable(),
        epic_id: z.string().uuid().optional().nullable(),
        sprint_id: z.string().uuid().optional().nullable(),
        points: z.number().int().min(0).max(100).default(0),
        status: z.enum(["backlog", "in_progress", "review", "done"]).default("backlog"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<Story>("/stories", data);
  });

export const listTaskComments = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ task_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.get<any[]>(`/tasks/${data.task_id}/comments`);
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        task_id: z.string().uuid(),
        body: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<any>(`/tasks/${data.task_id}/comments`, { body: data.body });
  });
