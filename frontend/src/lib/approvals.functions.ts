import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ENTITY_TYPES = ["task", "score", "appreciation", "report"] as const;
export const APPROVER_TYPES = [
  "role",
  "permission",
  "specific_user",
  "manager_of_requester",
] as const;

export const myApprovalAuthority = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: level }, { data: admin }, { data: superAdmin }] = await Promise.all([
      context.supabase.rpc("authority_level", { _user_id: context.userId }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    return {
      level: (level as number | null) ?? 10,
      isAdmin: Boolean(admin) || Boolean(superAdmin),
    };
  });

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: workflows, error } = await context.supabase
      .from("approval_workflows")
      .select("id, name, entity_type, active, created_at, created_by, authority_level")
      .order("created_at");
    if (error) throw new Error(error.message);
    const { data: steps } = await context.supabase
      .from("approval_steps")
      .select("id, workflow_id, step_order, approver_type, approver_ref")
      .order("step_order");
    const { data: owners } = await context.supabase
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        Array.from(
          new Set((workflows ?? []).map((w) => w.created_by).filter((v): v is string => Boolean(v))),
        ),
      );
    const ownerMap = new Map((owners ?? []).map((o) => [o.id, o.full_name]));
    return (workflows ?? []).map((w) => ({
      ...w,
      owner_name: w.created_by ? (ownerMap.get(w.created_by) ?? null) : null,
      steps: (steps ?? []).filter((s: Record<string, unknown>) => s.workflow_id === w.id),
    }));
  });


export const createWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        entity_type: z.enum(ENTITY_TYPES),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("approval_workflows")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("approval_workflows").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("approval_workflows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        approver_type: z.enum(APPROVER_TYPES),
        approver_ref: z.string().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("approval_steps")
      .select("step_order")
      .eq("workflow_id", data.workflow_id)
      .order("step_order", { ascending: false })
      .limit(1);
    const next = ((existing?.[0]?.step_order as number) ?? 0) + 1;
    const { error } = await context.supabase.from("approval_steps").insert({
      workflow_id: data.workflow_id,
      approver_type: data.approver_type,
      approver_ref: data.approver_ref || null,
      step_order: next,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("approval_steps").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: requests, error } = await context.supabase
      .from("approval_requests")
      .select(
        "id, workflow_id, entity_type, entity_id, requester_id, status, current_step, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = requests ?? [];
    if (rows.length === 0) return [];

    const [{ data: workflows }, { data: steps }, { data: profiles }, { data: tasks }] =
      await Promise.all([
        context.supabase.from("approval_workflows").select("id, name, entity_type"),
        context.supabase
          .from("approval_steps")
          .select("workflow_id, step_order, approver_type, approver_ref"),
        context.supabase
          .from("profiles")
          .select("id, full_name")
          .in(
            "id",
            Array.from(new Set(rows.map((r: Record<string, unknown>) => r.requester_id as string))),
          ),
        context.supabase
          .from("tasks")
          .select("id, title, points")
          .in(
            "id",
            rows
              .filter((r: Record<string, unknown>) => r.entity_type === "task")
              .map((r: Record<string, unknown>) => r.entity_id as string),
          ),
      ]);

    const wfMap = new Map(
      (workflows ?? []).map((w: Record<string, unknown>) => [w.id as string, w]),
    );
    const pMap = new Map(
      (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p.full_name as string]),
    );
    const tMap = new Map((tasks ?? []).map((t: Record<string, unknown>) => [t.id as string, t]));

    const decided = await Promise.all(
      rows.map(async (r: Record<string, unknown>) => {
        const { data: can } = await context.supabase.rpc("can_approve_request", {
          _user_id: context.userId,
          _request_id: r.id as string,
        });
        const step = (steps ?? []).find(
          (s: Record<string, unknown>) =>
            s.workflow_id === r.workflow_id && s.step_order === r.current_step,
        );
        const totalSteps = (steps ?? []).filter(
          (s: Record<string, unknown>) => s.workflow_id === r.workflow_id,
        ).length;
        const entity = tMap.get(r.entity_id as string) as Record<string, unknown> | undefined;
        return {
          ...r,
          workflow_name:
            (wfMap.get(r.workflow_id as string) as Record<string, unknown> | undefined)?.name ??
            "Workflow",
          requester_name: pMap.get(r.requester_id as string) ?? null,
          entity_label:
            (entity?.title as string | undefined) ?? (r.entity_id as string).slice(0, 8),
          entity_points: entity?.points ?? null,
          total_steps: totalSteps,
          current_step_type: step?.approver_type ?? null,
          current_step_ref: step?.approver_ref ?? null,
          can_decide: Boolean(can),
        };
      }),
    );
    return decided;
  });

export const decideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        request_id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("decide_approval", {
      _request_id: data.request_id,
      _decision: data.decision,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
