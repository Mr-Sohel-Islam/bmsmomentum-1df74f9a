import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  addStep,
  deleteStep,
  ENTITY_TYPES,
  APPROVER_TYPES,
} from "@/lib/approvals.functions";
import { listUsers, PERMISSIONS, ROLES } from "@/lib/admin.functions";
import { AdminGuard } from "@/components/admin-guard";

interface Step {
  id: string;
  workflow_id: string;
  step_order: number;
  approver_type: string;
  approver_ref: string | null;
}

interface Workflow {
  id: string;
  name: string;
  entity_type: string;
  active: boolean;
  steps: Step[];
}

interface AdminUser {
  id: string;
  full_name: string | null;
}

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Approval flows · MOMENTUM" },
      {
        name: "description",
        content: "Design multi-step approval flows for tasks, scores and appreciation.",
      },
    ],
  }),
  component: AdminApprovalsPage,
});

import { apiClient } from "@/lib/api-client";

function AdminApprovalsPage() {
  const qc = useQueryClient();
  const create = useServerFn(createWorkflow);
  const update = useServerFn(updateWorkflow);
  const remove = useServerFn(deleteWorkflow);
  const stepAdd = useServerFn(addStep);
  const stepDel = useServerFn(deleteStep);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => apiClient.get<Workflow[]>("/approvals/workflows"),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiClient.get<AdminUser[]>("/profiles"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["workflows"] });
  const onErr = (e: { message?: string }) => toast.error(e?.message ?? "Action failed");

  const createMut = useMutation({
    mutationFn: (v: { name: string; entity_type: (typeof ENTITY_TYPES)[number] }) =>
      create({ data: v }),
    onSuccess: () => {
      toast.success("Flow created");
      invalidate();
    },
    onError: onErr,
  });
  const updateMut = useMutation({
    mutationFn: (v: { id: string; name?: string; active?: boolean }) => update({ data: v }),
    onSuccess: invalidate,
    onError: onErr,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Flow deleted");
      invalidate();
    },
    onError: onErr,
  });
  const addStepMut = useMutation({
    mutationFn: (v: { workflow_id: string; approver_type: string; approver_ref: string | null }) =>
      stepAdd({ data: v }),
    onSuccess: invalidate,
    onError: onErr,
  });
  const delStepMut = useMutation({
    mutationFn: (id: string) => stepDel({ data: { id } }),
    onSuccess: invalidate,
    onError: onErr,
  });

  const [name, setName] = useState("");
  const [entity, setEntity] = useState<string>("task");

  return (
    <AdminGuard>
      <div className="space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <GitBranch className="h-7 w-7 text-primary" /> Approval flows
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Insert an approval gate between any two processes. Steps run in order.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMut.mutate({
            name,
            entity_type: entity as "task" | "score" | "report" | "appreciation",
          });
          setName("");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="wf-name">Flow name</Label>
          <Input
            id="wf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task completion review"
            className="w-64"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wf-entity">Applies to</Label>
          <select
            id="wf-entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={createMut.isPending}>
          {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Plus className="mr-2 h-4 w-4" /> Add flow
        </Button>
      </form>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

      <div className="space-y-4">
        {workflows.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            No flows yet. Items are auto-approved until you add one.
          </p>
        )}
        {(workflows as Workflow[]).map((w) => (
          <div key={w.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{w.name}</span>
                <Badge variant="outline">{w.entity_type}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Active
                  <Switch
                    checked={w.active}
                    onCheckedChange={(v) => updateMut.mutate({ id: w.id, active: v })}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(w.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {w.steps.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  No steps — this flow is inactive until a step is added.
                </li>
              )}
              {w.steps.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <span className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      Step {s.step_order}
                    </span>{" "}
                    · {labelStep(s, users as AdminUser[])}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => delStepMut.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ol>

            <StepForm
              users={users as AdminUser[]}
              onAdd={(v) => addStepMut.mutate({ workflow_id: w.id, ...v })}
            />
          </div>
        ))}
      </div>
    </div>
    </AdminGuard>
  );
}

function labelStep(s: Step, users: AdminUser[]) {
  switch (s.approver_type) {
    case "role":
      return `anyone with role "${s.approver_ref}"`;
    case "permission":
      return `anyone with permission "${s.approver_ref}"`;
    case "specific_user": {
      const u = users.find((x) => x.id === s.approver_ref);
      return `${u?.full_name ?? s.approver_ref}`;
    }
    default:
      return "the requester's manager";
  }
}

function StepForm({
  users,
  onAdd,
}: {
  users: AdminUser[];
  onAdd: (v: { approver_type: string; approver_ref: string | null }) => void;
}) {
  const [type, setType] = useState<string>("role");
  const [ref, setRef] = useState<string>("admin");

  function change(t: string) {
    setType(t);
    setRef(
      t === "role"
        ? "admin"
        : t === "permission"
          ? "approve_requests"
          : t === "specific_user"
            ? (users[0]?.id ?? "")
            : "",
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <select
        value={type}
        onChange={(e) => change(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {APPROVER_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {type === "role" && (
        <select
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      )}
      {type === "permission" && (
        <select
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {PERMISSIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}
      {type === "specific_user" && (
        <select
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.id.slice(0, 8)}
            </option>
          ))}
        </select>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAdd({ approver_type: type, approver_ref: ref || null })}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
      </Button>
    </div>
  );
}
