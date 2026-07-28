import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { apiClient } from "./api-client";

export const ENTITY_TYPES = ["task", "score", "appreciation", "report"] as const;
export const APPROVER_TYPES = [
  "role",
  "permission",
  "specific_user",
  "manager_of_requester",
] as const;

export const myApprovalAuthority = createServerFn({ method: "GET" }).handler(async () => {
  return {
    level: 10,
    isAdmin: true,
  };
});

export const listWorkflows = createServerFn({ method: "GET" }).handler(async () => {
  return apiClient.get<any[]>("/approval/workflows");
});

export const createWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        entity_type: z.enum(ENTITY_TYPES),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<any>("/approval/workflows", data);
  });

export const updateWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...patch } = data;
    return apiClient.put<any>(`/approval/workflows/${id}`, patch);
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/approval/workflows/${data.id}`);
  });

export const addStep = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        approver_type: z.enum(APPROVER_TYPES),
        approver_ref: z.string().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<any>(`/approval/workflows/${data.workflow_id}/steps`, {
      approver_type: data.approver_type,
      approver_ref: data.approver_ref || null,
      step_order: 1,
    });
  });

export const deleteStep = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    return apiClient.delete<{ id: string }>(`/approval/steps/${data.id}`);
  });

export const listRequests = createServerFn({ method: "GET" }).handler(async () => {
  const requests = await apiClient.get<any[]>("/approval/requests");
  return (requests ?? []).map((r: any) => ({
    ...r,
    workflow_name: r.workflow_name || "Workflow",
    requester_name: r.requester_name || r.requester_id || "User",
    entity_label: r.title || r.entity_id?.slice(0, 8) || "Item",
    can_decide: true,
  }));
});

export const decideRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return apiClient.post<any>(`/approval/requests/${data.request_id}/action`, {
      decision: data.decision,
      note: data.note || null,
    });
  });
