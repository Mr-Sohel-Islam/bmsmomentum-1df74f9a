import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gauge, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { listMetrics, createMetric, updateMetric, deleteMetric } from "@/lib/admin.functions";
import { AdminGuard } from "@/components/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics · MOMENTUM" },
      { name: "description", content: "Configure performance metrics for your organization." },
    ],
  }),
  component: MetricsPage,
});

type Metric = {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  weight: number;
  active: boolean;
};

function MetricsPage() {
  const list = useServerFn(listMetrics);
  const { data, isLoading } = useQuery({ queryKey: ["metrics"], queryFn: () => list() });

  return (
    <AdminGuard>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Gauge className="h-7 w-7 text-primary" /> Metrics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define what "performance" means for your team. Weights drive score aggregation.
          </p>
        </div>
        <MetricDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              New metric
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-12 gap-3 border-b border-border/60 px-5 py-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <div className="col-span-4">Name</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-1">Unit</div>
          <div className="col-span-1">Weight</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (!data || data.length === 0) && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No metrics yet. Create your first one to get started.
          </div>
        )}
        {data?.map((m: Metric) => (
          <div
            key={m.id}
            className="grid grid-cols-12 items-center gap-3 border-b border-border/40 px-5 py-4 last:border-0"
          >
            <div className="col-span-4 font-medium">{m.name}</div>
            <div className="col-span-4 truncate text-sm text-muted-foreground">
              {m.description ?? "—"}
            </div>
            <div className="col-span-1 font-mono text-xs text-muted-foreground">
              {m.unit ?? "—"}
            </div>
            <div className="col-span-1 font-mono text-sm">{m.weight}</div>
            <div className="col-span-1">
              <Badge variant={m.active ? "default" : "secondary"}>
                {m.active ? "Active" : "Off"}
              </Badge>
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <MetricDialog
                metric={m}
                trigger={
                  <Button size="icon" variant="ghost">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <DeleteMetricButton id={m.id} name={m.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
    </AdminGuard>
  );
}

function MetricDialog({ trigger, metric }: { trigger: React.ReactNode; metric?: Metric }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(metric?.name ?? "");
  const [description, setDescription] = useState(metric?.description ?? "");
  const [unit, setUnit] = useState(metric?.unit ?? "");
  const [weight, setWeight] = useState(String(metric?.weight ?? 1));
  const [active, setActive] = useState(metric?.active ?? true);
  const qc = useQueryClient();
  const create = useServerFn(createMetric);
  const update = useServerFn(updateMetric);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        unit: unit || null,
        weight: Number(weight),
        active,
      };
      if (metric) return update({ data: { id: metric.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success(metric ? "Metric updated" : "Metric created");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{metric ? "Edit metric" : "New metric"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="On-time delivery"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit ?? ""} onChange={(e) => setUnit(e.target.value)} placeholder="%" />
            </div>
            <div className="space-y-2">
              <Label>Weight</Label>
              <Input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
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
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !name}>
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMetricButton({ id, name }: { id: string; name: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteMetric);
  const mut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Metric deleted");
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
            This also removes all recorded scores for this metric. Cannot be undone.
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
