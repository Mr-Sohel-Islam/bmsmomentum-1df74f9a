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
    queryFn: () => getTasks(),
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ["sprints"],
    queryFn: () => getSprints(),
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => getStories(),
  });

  const activeTasksCount = tasks.filter((t) => t.status !== "done").length;
  const completedTasksCount = tasks.filter((t) => t.status === "done").length;
  const activeSprint = sprints.find((s) => s.status === "active") || sprints[0];

  const sprintTasks = activeSprint ? tasks.filter((t) => t.sprint_id === activeSprint.id) : [];
  const sprintPoints = sprintTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const sprintDonePoints = sprintTasks
    .filter((t) => t.status === "done")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const completionPct = sprintPoints > 0 ? Math.round((sprintDonePoints / sprintPoints) * 100) : 0;

  const daysRemaining = activeSprint?.end_date
    ? Math.max(
        0,
        Math.ceil((new Date(activeSprint.end_date).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  const since = Date.now() - 28 * 86_400_000;
  const recentDonePoints = tasks
    .filter((t) => t.status === "done" && t.completed_at && new Date(t.completed_at).getTime() >= since)
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const velocity = Math.round((recentDonePoints / 4) * 10) / 10;

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
          value={activeSprint?.name || "No sprint"}
          hint={
            daysRemaining === null
              ? "No end date set"
              : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
          }
        />
        <Stat
          icon={CheckSquare}
          label="Open Tasks"
          value={String(activeTasksCount)}
          hint={`${completedTasksCount} tasks completed`}
        />
        <Stat
          icon={TrendingUp}
          label="Sprint Completion"
          value={`${completionPct}%`}
          hint={`${sprintDonePoints} of ${sprintPoints} points done`}
        />
        <Stat
          icon={Activity}
          label="Velocity Rate"
          value={`${velocity} pts/wk`}
          hint="Trailing 4-week average"
        />
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
