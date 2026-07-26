import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, Gauge } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { listMyScores } from "@/lib/performance.functions";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "My Performance · MOMENTUM" },
      { name: "description", content: "Track your metric scores over time." },
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

function PerformancePage() {
  const fn = useServerFn(listMyScores);
  const { data, isLoading } = useQuery({ queryKey: ["my-scores"], queryFn: () => fn() });
  const rows = (data ?? []) as Row[];

  // Pivot: [{ period, [metricName]: value }]
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

  const colors = [
    "var(--primary)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Workspace</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <TrendingUp className="h-7 w-7 text-primary" /> My Performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your metric scores over time, weighted for aggregate.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Tracked metrics"
          value={String(metricNames.length)}
          hint="Distinct metrics scored"
        />
        <Stat label="Current period" value={latest ?? "—"} hint="Most recent recorded" />
        <Stat
          label="Weighted total"
          value={latest ? totalWeighted.toFixed(1) : "—"}
          hint="This period"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Performance trend</h3>
        </div>
        <div className="mt-4 h-80">
          {isLoading && (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Loading…
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
                    stroke={colors[i % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border/60 px-5 py-3">
          <h3 className="font-semibold">Score history</h3>
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
    </div>
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
