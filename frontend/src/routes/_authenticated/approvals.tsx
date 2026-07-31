import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  Clock,
  Eye,
  FileCheck,
  ShieldCheck,
  User,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  title?: string;
  description?: string;
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
  const [selectedRequestDrawer, setSelectedRequestDrawer] = useState<ApprovalRequest | null>(null);

  const mut = useMutation({
    mutationFn: (v: { request_id: string; decision: "approved" | "rejected" }) =>
      decide({ data: { ...v, note: notes[v.request_id] || null } }),
    onSuccess: () => {
      toast.success("Approval decision recorded!");
      qc.invalidateQueries({ queryKey: ["approval-requests"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["product-items"] });
      setSelectedRequestDrawer(null);
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to record decision"),
  });

  const reqList = requests as unknown as ApprovalRequest[];
  const pending = reqList.filter((r) => r.status === "pending");
  const history = reqList.filter((r) => r.status !== "pending");

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight flex items-center gap-2">
                Approvals Routing Queue
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tabular approval requests queue with icon decision triggers and side drawer inspection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
              {pending.length} Pending Actions
            </Badge>
            <Badge variant="outline" className="text-xs font-mono bg-muted/60">
              {history.length} Decisions Recorded
            </Badge>
          </div>
        </div>

        {/* Tabular Pending Approvals Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-1.5 font-bold">
              <Clock className="h-4 w-4" /> Pending Approvals Queue ({pending.length})
            </h2>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {pending.length === 0 && !isLoading ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-xs text-muted-foreground bg-card/20">
              No approval requests waiting in your queue.
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60 shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Entity / Request Item</TableHead>
                    <TableHead className="text-xs font-semibold">Workflow</TableHead>
                    <TableHead className="text-xs font-semibold">Progress</TableHead>
                    <TableHead className="text-xs font-semibold">Requester</TableHead>
                    <TableHead className="text-xs font-semibold">Quick Decision Note</TableHead>
                    <TableHead className="text-xs font-semibold text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-xs py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/20">
                            {r.entity_type}
                          </Badge>
                          <span>{r.entity_label || r.title}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-xs font-mono text-muted-foreground">
                        {r.workflow_name || "Approval Flow"}
                      </TableCell>

                      <TableCell className="py-3">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          Step {r.current_step || 1} of {r.total_steps || 1}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>{r.requester_name ?? "User"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 w-48">
                        {r.can_decide ? (
                          <Input
                            className="h-8 text-xs bg-background/80"
                            placeholder="Optional note..."
                            value={notes[r.id] ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Awaiting {r.current_step_type ?? "Approver"}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-right py-3 pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                onClick={() => setSelectedRequestDrawer(r)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Inspect Details in Side Drawer</TooltipContent>
                          </Tooltip>

                          {r.can_decide && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white"
                                    disabled={mut.isPending}
                                    onClick={() => mut.mutate({ request_id: r.id, decision: "approved" })}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Approve Request</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-rose-600 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white"
                                    disabled={mut.isPending}
                                    onClick={() => mut.mutate({ request_id: r.id, decision: "rejected" })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Reject Request</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Tabular History Approvals Section */}
        <section className="space-y-3 pt-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-bold">
            <FileCheck className="h-4 w-4" /> Decision History Audit Trail ({history.length})
          </h2>

          {history.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-xl text-xs text-muted-foreground bg-card/20">
              No approval decisions recorded yet.
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60 shadow-xs">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Entity Request</TableHead>
                    <TableHead className="text-xs font-semibold">Workflow Definition</TableHead>
                    <TableHead className="text-xs font-semibold">Final Decision Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-xs py-3">
                        {r.entity_label || r.title || r.id}
                      </TableCell>
                      <TableCell className="py-3 text-xs font-mono text-muted-foreground">
                        {r.workflow_name}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={r.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                          {r.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Side Drawer for Inspecting Request & Taking Decision Action */}
        <Sheet open={Boolean(selectedRequestDrawer)} onOpenChange={(open) => !open && setSelectedRequestDrawer(null)}>
          <SheetContent side="right" className="sm:max-w-md p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" /> Approval Request Inspection
              </SheetTitle>
              <SheetDescription className="text-xs">
                Review request metadata, requester identity, and submit decision with notes.
              </SheetDescription>
            </SheetHeader>

            {selectedRequestDrawer && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Item Label:</span>
                    <span className="font-bold text-foreground">{selectedRequestDrawer.entity_label || selectedRequestDrawer.title}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Entity Type:</span>
                    <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary">
                      {selectedRequestDrawer.entity_type}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Workflow:</span>
                    <span className="font-mono">{selectedRequestDrawer.workflow_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Requester:</span>
                    <span className="font-mono">{selectedRequestDrawer.requester_name || "System"}</span>
                  </div>
                </div>

                {selectedRequestDrawer.can_decide && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" /> Decision Note (Optional)
                      </label>
                      <Input
                        value={notes[selectedRequestDrawer.id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [selectedRequestDrawer.id]: e.target.value }))}
                        placeholder="Add decision notes for audit log..."
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ request_id: selectedRequestDrawer.id, decision: "approved" })}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve Request
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={mut.isPending}
                        onClick={() => mut.mutate({ request_id: selectedRequestDrawer.id, decision: "rejected" })}
                      >
                        <XCircle className="h-4 w-4" /> Reject Request
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
