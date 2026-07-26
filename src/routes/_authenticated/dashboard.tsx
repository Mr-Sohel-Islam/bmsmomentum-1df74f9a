import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Zap, CheckSquare, TrendingUp } from "lucide-react";
import { listTasks, listSprints, listStories } from "@/lib/tasks.functions";
import { SprintBurndownChart } from "@/components/sprint-burndown-chart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const getTasks = useServerFn(listTasks);
  const getSprints = useServerFn(listSprints);
  const getStories = useServerFn(listStories);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks({ data: {} }),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints"],
    queryFn: () => getSprints({ data: {} }),
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => getStories({ data: {} }),
  });

  const activeTasksCount = tasks.filter((t) => t.status !== "done").length;
  const completedTasksCount = tasks.filter((t) => t.status === "done").length;
  const activeSprint = sprints.find((s) => s.status === "active") || sprints[0];

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Overview</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track sprint burn-down, team velocity, scope creep, and global project milestones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Zap}
          label="Active Sprint"
          value={activeSprint?.name || "Sprint 24.1"}
          hint="14 days remaining"
        />
        <Stat
          icon={CheckSquare}
          label="Open Tasks"
          value={String(activeTasksCount)}
          hint={`${completedTasksCount} tasks completed`}
        />
        <Stat icon={TrendingUp} label="Sprint Completion" value="68%" hint="On track for target" />
        <Stat icon={Activity} label="Velocity Rate" value="18 pts/wk" hint="+12% vs last sprint" />
      </div>

      {/* Main Recharts Sprint Burn-down & Velocity Analytics Component */}
      <div className="pt-2">
        <SprintBurndownChart sprints={sprints} tasks={tasks} stories={stories} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
