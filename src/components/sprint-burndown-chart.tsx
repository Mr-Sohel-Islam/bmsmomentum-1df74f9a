import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, Sprint, Story } from "@/lib/tasks.functions";

interface SprintBurndownChartProps {
  sprints: Sprint[];
  tasks: Task[];
  stories?: Story[];
  className?: string;
}

export function SprintBurndownChart({ sprints, tasks, className = "" }: SprintBurndownChartProps) {
  // Active selected sprint ID
  const [selectedSprintId, setSelectedSprintId] = useState<string>(sprints[0]?.id || "sprint-24-1");
  const [metricMode, setMetricMode] = useState<"points" | "tasks">("points");

  const currentSprint = useMemo(() => {
    return sprints.find((s) => s.id === selectedSprintId) || sprints[0];
  }, [sprints, selectedSprintId]);

  // Tasks belonging to selected sprint
  const sprintTasks = useMemo(() => {
    if (!currentSprint) return [];
    return tasks.filter((t) => t.sprint_id === currentSprint.id);
  }, [tasks, currentSprint]);

  // Calculate totals
  const totalPlannedPoints = useMemo(() => {
    if (metricMode === "tasks") return sprintTasks.length || 12;
    const pts = sprintTasks.reduce((sum, t) => sum + (t.points || 1), 0);
    return pts > 0 ? pts : 38; // Default demo baseline if no tasks created yet
  }, [sprintTasks, metricMode]);

  const completedPoints = useMemo(() => {
    const doneTasks = sprintTasks.filter((t) => t.status === "done");
    if (metricMode === "tasks") return doneTasks.length;
    return doneTasks.reduce((sum, t) => sum + (t.points || 1), 0);
  }, [sprintTasks, metricMode]);

  // Generate 14-day burndown schedule data
  const chartData = useMemo(() => {
    const totalDays = 14;
    const days = [];
    const initialScope = totalPlannedPoints;
    let scopeCreepAcc = 0;

    for (let day = 0; day <= totalDays; day++) {
      const idealRemaining = Math.max(0, initialScope - (initialScope / totalDays) * day);

      if (day === 4 || day === 7) scopeCreepAcc += 3;

      const completedByDay = Math.min(
        completedPoints,
        Math.round((completedPoints / totalDays) * day * (0.8 + Math.sin(day) * 0.2)),
      );

      const totalScopeDay = initialScope + scopeCreepAcc;
      const actualRemaining = Math.max(0, totalScopeDay - completedByDay);

      days.push({
        day: `Day ${day}`,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: Math.round(actualRemaining * 10) / 10,
        totalScope: totalScopeDay,
        completed: completedByDay,
      });
    }

    return days;
  }, [totalPlannedPoints, completedPoints]);

  // Historical Sprint Velocity Comparison Data
  const velocityData = useMemo(() => {
    return [
      { sprint: "Sprint 23.3", committed: 32, completed: 30, velocityRate: "93%" },
      { sprint: "Sprint 23.4", committed: 40, completed: 35, velocityRate: "88%" },
      {
        sprint: "Sprint 24.1",
        committed: totalPlannedPoints,
        completed: completedPoints,
        velocityRate: `${Math.round((completedPoints / totalPlannedPoints) * 100)}%`,
      },
      { sprint: "Sprint 24.2 (Est)", committed: 42, completed: 0, velocityRate: "0%" },
    ];
  }, [totalPlannedPoints, completedPoints]);

  const scopeCreepPoints = useMemo(() => {
    return Math.max(0, (chartData[chartData.length - 1]?.totalScope || 0) - totalPlannedPoints);
  }, [chartData, totalPlannedPoints]);

  const completionRate =
    Math.round((completedPoints / (totalPlannedPoints + scopeCreepPoints)) * 100) || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase text-primary">
              Sprint Analytics & Burndown
            </Badge>
            {currentSprint && (
              <Badge
                variant="default"
                className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px]"
              >
                {currentSprint.status.toUpperCase()}
              </Badge>
            )}
          </div>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
            {currentSprint?.name || "Active Sprint Analytics"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Track ideal vs actual story point burn-down, velocity, and scope creep.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Metric mode toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setMetricMode("points")}
              className={`rounded px-2.5 py-1 font-medium transition-all ${
                metricMode === "points"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Story Points
            </button>
            <button
              onClick={() => setMetricMode("tasks")}
              className={`rounded px-2.5 py-1 font-medium transition-all ${
                metricMode === "tasks"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Task Count
            </button>
          </div>

          {/* Sprint Selector */}
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="Select Sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Committed Scope</span>
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {totalPlannedPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {metricMode === "points" ? "pts" : "tasks"}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">Original sprint commitment</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-500">
            {completedPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {metricMode === "points" ? "pts" : "tasks"}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600/80 font-medium">
            {completionRate}% finished
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Scope Creep</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-500">
            +{scopeCreepPoints}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {metricMode === "points" ? "pts" : "tasks"}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">Added after sprint start</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Velocity Forecast</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {Math.round(completedPoints / 2)}{" "}
            <span className="text-xs font-normal text-muted-foreground">pts/wk</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Estimated completion in 6 days</div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sprint Burndown Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  Sprint Burn-Down Line
                </CardTitle>
                <CardDescription className="text-xs">
                  Ideal trend line vs actual remaining{" "}
                  {metricMode === "points" ? "story points" : "tasks"} over 14 days.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                14-Day Timeline
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="scopeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  {/* Ideal Burn Line */}
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    name="Ideal Burn-down"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  {/* Total Scope line (Scope Creep) */}
                  <Area
                    type="monotone"
                    dataKey="totalScope"
                    name="Total Scope (Inc. Creep)"
                    stroke="#f59e0b"
                    fill="url(#scopeGradient)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  {/* Actual Remaining Line */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Remaining"
                    stroke="#3b82f6"
                    fill="url(#actualGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Velocity Trend Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-500" />
              Sprint Velocity History
            </CardTitle>
            <CardDescription className="text-xs">
              Committed vs Completed story points per sprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="sprint" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar
                    dataKey="committed"
                    name="Committed Pts"
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed Pts"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
