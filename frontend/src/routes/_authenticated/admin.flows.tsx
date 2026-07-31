import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Radio, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listFlows, createFlow, updateFlow, deleteFlow } from "@/lib/admin.functions";
import { AdminGuard } from "@/components/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/flows")({
  head: () => ({
    meta: [
      { title: "Communication Flows · MOMENTUM" },
      { name: "description", content: "Define who reports to whom, and how often." },
    ],
  }),
  component: FlowsPage,
});

type Flow = {
  id: string;
  name: string;
  from_role: string;
  to_role: string;
  cadence: string;
  active: boolean;
};

const CADENCES = ["daily", "weekly", "biweekly", "monthly", "quarterly"];

function FlowsPage() {
  const list = useServerFn(listFlows);
  const { data, isLoading } = useQuery({ queryKey: ["flows"], queryFn: () => list() });

  return (
    <AdminGuard>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Radio className="h-7 w-7 text-primary" /> Communication flows
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wire up who sends performance reports to whom, and on what cadence.
          </p>
        </div>
        <FlowDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              New flow
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && (
          <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {!isLoading && (!data || data.length === 0) && (
          <div className="col-span-full rounded-lg border border-dashed border-border/80 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No flows configured yet.
          </div>
        )}
        {data?.map((f: Flow) => (
          <div key={f.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-lg font-semibold">{f.name}</div>
                <div className="mt-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  <span>{f.from_role}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{f.to_role}</span>
                </div>
              </div>
              <Badge variant={f.active ? "default" : "secondary"}>
                {f.active ? "Active" : "Off"}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-widest text-primary">
                {f.cadence}
              </span>
              <div className="flex gap-1">
                <FlowDialog
                  flow={f}
                  trigger={
                    <Button size="icon" variant="ghost">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <DeleteFlowButton id={f.id} name={f.name} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </AdminGuard>
  );
}

function FlowDialog({ trigger, flow }: { trigger: React.ReactNode; flow?: Flow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(flow?.name ?? "");
  const [fromRole, setFromRole] = useState(flow?.from_role ?? "");
  const [toRole, setToRole] = useState(flow?.to_role ?? "");
  const [cadence, setCadence] = useState(flow?.cadence ?? "weekly");
  const [active, setActive] = useState(flow?.active ?? true);
  const qc = useQueryClient();
  const create = useServerFn(createFlow);
  const update = useServerFn(updateFlow);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { name, from_role: fromRole, to_role: toRole, cadence, active };
      if (flow) return update({ data: { id: flow.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success(flow ? "Flow updated" : "Flow created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{flow ? "Edit flow" : "New flow"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly team roll-up"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From role</Label>
              <Input
                value={fromRole}
                onChange={(e) => setFromRole(e.target.value)}
                placeholder="Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>To role</Label>
              <Input
                value={toRole}
                onChange={(e) => setToRole(e.target.value)}
                placeholder="Director"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cadence</Label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label>Active</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !name || !fromRole || !toRole}
          >
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFlowButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteFlow);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This flow will be removed. Cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => mut.mutate()}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
