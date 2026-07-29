import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { TrendingUp, Gauge, Share2, Clock3, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  listMyScores,
  myDelivery,
  listShareTargets,
  sharePerformance,
  listSharedWithMe,
  listMyShares,
} from "@/lib/performance.functions";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "My Performance · MOMENTUM" },
      {
        name: "description",
        content:
          "Track metric scores, delivery points from completed epics, stories and tasks, and share your summary.",
      },
      { property: "og:title", content: "My Performance · MOMENTUM" },
      {
        property: "og:description",
        content: "Delivery points, metric trends and shareable performance summaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerformancePage,
});

type Row = {
  id: string;
  metric_id: string;
  value: number;
  period: string;
  created_at: string;
  metrics: { name: string; unit: string | null; weight: number } | null;
};

const COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function PerformancePage() {
  const fetchScores = useServerFn(listMyScores);
  const fetchDelivery = useServerFn(myDelivery);
  const fetchShared = useServerFn(listSharedWithMe);
  const fetchMyShares = useServerFn(listMyShares);

  const { data, isLoading } = useQuery({ queryKey: ["my-scores"], queryFn: () => fetchScores() });
  const { data: delivery, isLoading: deliveryLoading } = useQuery({
    queryKey: ["my-delivery"],
    queryFn: () => fetchDelivery(),
  });
  const { data: sharedWithMe = [] } = useQuery({
    queryKey: ["shared-with-me"],
    queryFn: () => fetchShared(),
  });
  const { data: myShares = [] } = useQuery({
    queryKey: ["my-shares"],
    queryFn: () => fetchMyShares(),
  });

  const rows = (data ?? []) as Row[];
  const [shareOpen, setShareOpen] = useState(false);

  const metricNames = Array.from(new Set(rows.map((r) => r.metrics?.name ?? "Unknown")));
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
  const chartData = periods.map((p) => {
    const entry: Record<string, string | number> = { period: p };
    for (const r of rows.filter((x) => x.period === p)) {
      entry[r.metrics?.name ?? "Unknown"] = r.value;
    }
    return entry;
  });

  const latest = periods.at(-1);
  const latestRows = rows.filter((r) => r.period === latest);
  const totalWeighted = latestRows.reduce((sum, r) => sum + r.value * (r.metrics?.weight ?? 1), 0);

  const totals = delivery?.totals;
  const currentPeriod = new Date().toISOString().slice(0, 7);

  const snapshot = useMemo(
    () => ({
      creditedPoints: totals?.creditedPoints ?? 0,
      pendingPoints: totals?.pendingPoints ?? 0,
      tasksDone: totals?.tasksDone ?? 0,
      storiesCompleted: totals?.storiesCompleted ?? 0,
      epicsCompleted: totals?.epicsCompleted ?? 0,
      weightedMetricTotal: Number(totalWeighted.toFixed(2)),
      metricPeriod: latest ?? null,
    }),
    [totals, totalWeighted, latest],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Workspace</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <TrendingUp className="h-7 w-7 text-primary" /> My Performance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery points from completed epics, stories and tasks, plus your scored metrics.
          </p>
        </div>
        <Button onClick={() => setShareOpen(true)}>
          <Share2 className="mr-2 h-4 w-4" /> Share summary
        </Button>
      </div>

      {/* Delivery scorecard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Credited points"
          value={String(totals?.creditedPoints ?? 0)}
          hint="Approved / no approval needed"
        />
        <Stat
          label="Awaiting approval"
          value={String(totals?.pendingPoints ?? 0)}
          hint={`${totals?.tasksPending ?? 0} task(s) pending`}
        />
        <Stat
          label="Stories completed"
          value={String(totals?.storiesCompleted ?? 0)}
          hint={`${totals?.epicsCompleted ?? 0} epic(s) completed`}
        />
        <Stat
          label="Open work"
          value={String(totals?.tasksOpen ?? 0)}
          hint="Tasks not yet finished"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Delivery points by period</h2>
        </div>
        <div className="mt-4 h-72">
          {deliveryLoading && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!deliveryLoading && (delivery?.periods.length ?? 0) === 0 && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Complete a task to start earning delivery points.
            </div>
          )}
          {(delivery?.periods.length ?? 0) > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={delivery?.periods}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="credited" name="Credited" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="pending"
                  name="Awaiting approval"
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {(delivery?.recent.length ?? 0) > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Recently completed
            </h3>
            {delivery?.recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{t.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs text-primary">+{t.points}</span>
                  <ApprovalBadge status={t.approval_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metric scores */}
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Tracked metrics"
          value={String(metricNames.length)}
          hint="Distinct metrics scored"
        />
        <Stat label="Metric period" value={latest ?? "—"} hint="Most recent recorded" />
        <Stat
          label="Weighted total"
          value={latest ? totalWeighted.toFixed(1) : "—"}
          hint="This period"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Metric trend</h2>
        </div>
        <div className="mt-4 h-80">
          {isLoading && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!isLoading && chartData.length === 0 && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              No scores recorded yet. Admins can add scores from the Team view.
            </div>
          )}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                {metricNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Shared with me */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Shared with me</h2>
        </div>
        {sharedWithMe.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No one has shared a performance summary with you yet.
          </p>
        ) : (
          sharedWithMe.map((s) => {
            const snap = (s.snapshot ?? {}) as Record<string, number | string | null>;
            return (
              <div key={s.id} className="border-b border-border/40 px-5 py-3 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{s.owner_name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s.period}
                  </Badge>
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {Number(snap.creditedPoints ?? 0)} credited pts ·{" "}
                  {Number(snap.tasksDone ?? 0)} tasks · {Number(snap.storiesCompleted ?? 0)} stories
                </div>
                {s.note && <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>}
              </div>
            );
          })
        )}
      </div>

      {myShares.length > 0 && (
        <p className="text-xs text-muted-foreground">
          You have shared your summary with{" "}
          {myShares.map((s) => s.recipient_name).join(", ")}.
        </p>
      )}

      {/* Score history */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border/60 px-5 py-3">
          <h2 className="font-semibold">Score history</h2>
        </div>
        {rows.length === 0 && !isLoading && (
          <div className="p-10 text-center text-sm text-muted-foreground">No scores yet.</div>
        )}
        {rows
          .slice()
          .reverse()
          .map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-12 items-center gap-3 border-b border-border/40 px-5 py-3 last:border-0"
            >
              <div className="col-span-5 font-medium">{r.metrics?.name ?? "—"}</div>
              <div className="col-span-3 font-mono text-xs text-muted-foreground">{r.period}</div>
              <div className="col-span-2 font-mono text-sm">
                {r.value}
                {r.metrics?.unit ? (
                  <span className="text-muted-foreground"> {r.metrics.unit}</span>
                ) : null}
              </div>
              <div className="col-span-2 text-right font-mono text-xs text-muted-foreground">
                w {r.metrics?.weight ?? 1}
              </div>
            </div>
          ))}
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        period={latest ?? currentPeriod}
        snapshot={snapshot}
      />
    </div>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-500">
        <Clock3 className="h-3 w-3" /> Approval pending
      </Badge>
    );
  }
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (status === "approved") return <Badge>Approved</Badge>;
  return <Badge variant="secondary">No approval needed</Badge>;
}

function ShareDialog({
  open,
  onOpenChange,
  period,
  snapshot,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  period: string;
  snapshot: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const fetchTargets = useServerFn(listShareTargets);
  const share = useServerFn(sharePerformance);
  const { data: targets = [] } = useQuery({
    queryKey: ["share-targets"],
    queryFn: () => fetchTargets(),
    enabled: open,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      share({ data: { recipients: selected, period, note: note || null, snapshot } }),
    onSuccess: (r) => {
      toast.success(`Shared with ${r.count} ${r.count === 1 ? "person" : "people"}`);
      setSelected([]);
      setNote("");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["my-shares"] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to share"),
  });

  const higherAuthority = targets.filter(
    (t) => t.is_my_manager || t.roles.some((r) => r !== "member"),
  );
  const others = targets.filter((t) => !higherAuthority.includes(t));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share performance summary</DialogTitle>
          <DialogDescription>
            Sends a snapshot of your {period} delivery and metric results. Recipients get a
            notification instantly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 rounded-md border border-border/60 p-3">
          {targets.length === 0 && (
            <p className="text-sm text-muted-foreground">No colleagues available.</p>
          )}
          {higherAuthority.length > 0 && (
            <>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                Higher authority
              </p>
              {higherAuthority.map((t) => (
                <PersonRow
                  key={t.id}
                  id={t.id}
                  name={t.full_name}
                  meta={[t.is_my_manager ? "My manager" : null, ...t.roles]
                    .filter(Boolean)
                    .join(" · ")}
                  checked={selected.includes(t.id)}
                  onToggle={toggle}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="mb-1.5 mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Colleagues
              </p>
              {others.map((t) => (
                <PersonRow
                  key={t.id}
                  id={t.id}
                  name={t.full_name}
                  meta={t.department ?? ""}
                  checked={selected.includes(t.id)}
                  onToggle={toggle}
                />
              ))}
            </>
          )}
        </ScrollArea>

        <div className="space-y-1.5">
          <Label htmlFor="share-note">Note (optional)</Label>
          <Textarea
            id="share-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Context for this period…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected.length === 0 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Share with {selected.length || 0}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonRow({
  id,
  name,
  meta,
  checked,
  onToggle,
}: {
  id: string;
  name: string | null;
  meta: string;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(id)}
        className="h-4 w-4 accent-primary"
      />
      <span className="font-medium">{name ?? "User"}</span>
      {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
    </label>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
