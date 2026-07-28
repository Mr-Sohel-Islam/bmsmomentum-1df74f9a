import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listRequests, decideRequest } from "@/lib/approvals.functions";

interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_label: string;
  entity_points: number | null;
  workflow_name: string;
  current_step: number;
  total_steps: number;
  requester_name: string | null;
  can_decide: boolean;
  status: string;
  current_step_type: string | null;
}

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals · MOMENTUM" },
      { name: "description", content: "Review and decide on approval requests waiting on you." },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const qc = useQueryClient();
  const fetchRequests = useServerFn(listRequests);
  const decide = useServerFn(decideRequest);
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-requests"],
    queryFn: () => fetchRequests(),
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: (v: { request_id: string; decision: "approved" | "rejected" }) =>
      decide({ data: { ...v, note: notes[v.request_id] || null } }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["approval-requests"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to record decision"),
  });

  const reqList = requests as unknown as ApprovalRequest[];
  const pending = reqList.filter((r) => r.status === "pending");
  const history = reqList.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Workspace</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Inbox className="h-7 w-7 text-primary" /> Approvals
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Items routed to you through approval flows, plus the ones you raised.
        </p>
      </div>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Pending
        </h2>
        {pending.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nothing waiting.</p>
        )}
        {pending.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.entity_type}</Badge>
                  <span className="font-medium">{r.entity_label}</span>
                  {r.entity_points ? (
                    <span className="font-mono text-xs text-primary">+{r.entity_points}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.workflow_name} · step {r.current_step}/{r.total_steps} · raised by{" "}
                  {r.requester_name ?? "user"}
                </div>
              </div>
              {r.can_decide ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-9 w-44"
                    placeholder="Note (optional)"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ request_id: r.id, decision: "approved" })}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={mut.isPending}
                    onClick={() => mut.mutate({ request_id: r.id, decision: "rejected" })}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" /> Reject
                  </Button>
                </div>
              ) : (
                <Badge variant="secondary">Awaiting {r.current_step_type ?? "approver"}</Badge>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          History
        </h2>
        {history.length === 0 && <p className="text-sm text-muted-foreground">No decisions yet.</p>}
        {history.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3"
          >
            <div className="text-sm">
              <span className="font-medium">{r.entity_label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{r.workflow_name}</span>
            </div>
            <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>
          </div>
        ))}
      </section>
    </div>
  );
}
