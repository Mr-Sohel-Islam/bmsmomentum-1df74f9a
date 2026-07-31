import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Crown,
  KeyRound,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTeamScores, recordScore, deleteScore } from "@/lib/performance.functions";
import { listMetrics, listUsers } from "@/lib/admin.functions";
import { listTeams, createTeam, deleteTeam, delegatePower, type Team } from "@/lib/teams.functions";
import { RolePermissionMatrix } from "@/components/role-permission-matrix";
import { AdminGuard } from "@/components/admin-guard";

type UserOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  roles?: string[];
};

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({
    meta: [
      { title: "Teams & Performance · MOMENTUM" },
      {
        name: "description",
        content: "Manage teams, assign roles, delegate powers, and review scores.",
      },
    ],
  }),
  component: TeamPage,
});

type Score = {
  id: string;
  user_id: string;
  metric_id: string;
  value: number;
  period: string;
  metrics: { name: string; unit: string | null; weight: number } | null;
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TeamPage() {
  const scoresFn = useServerFn(listTeamScores);
  const metricsFn = useServerFn(listMetrics);
  const usersFn = useServerFn(listUsers);
  const teamsFn = useServerFn(listTeams);

  const qc = useQueryClient();

  const { data: scores, isLoading } = useQuery({
    queryKey: ["team-scores"],
    queryFn: () => scoresFn(),
  });
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: () => metricsFn() });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersFn() });
  const { data: teamsData } = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });

  const [filterMetric, setFilterMetric] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  const [activeTab, setActiveTab] = useState<string>("teams");

  // Local state for interactive team member management
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (teamsData) {
      setTeams(teamsData);
    }
  }, [teamsData]);

  const rows = useMemo(() => (scores ?? []) as Score[], [scores]);
  const periods = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.period)))
        .sort()
        .reverse(),
    [rows],
  );
  const userMap = new Map(
    (users ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [
      u.id,
      u.full_name ?? u.email ?? "User",
    ]),
  );

  const filtered = rows.filter(
    (r) =>
      (filterMetric === "all" || r.metric_id === filterMetric) &&
      (filterPeriod === "all" || r.period === filterPeriod),
  );

  return (
    <AdminGuard>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Admin & Management
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Users className="h-7 w-7 text-primary" /> Teams & Power Delegation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create teams, add/remove users, assign team roles, delegate powers, and track
            performance scores.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Teams & Delegation
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Role Permission Matrix
          </TabsTrigger>
          <TabsTrigger value="scores" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Metric Scores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-6">
          <TeamsManagementSection
            teams={teams}
            setTeams={setTeams}
            users={(users as UserOption[]) ?? []}
            qc={qc}
            onOpenMatrix={() => setActiveTab("matrix")}
          />
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <RolePermissionMatrix users={(users as UserOption[]) ?? []} teams={teams} />
        </TabsContent>

        <TabsContent value="scores" className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-48">
                <Select value={filterMetric} onValueChange={setFilterMetric}>
                  <SelectTrigger>
                    <SelectValue placeholder="Metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All metrics</SelectItem>
                    {(metrics ?? []).map((m: { id: string; name: string }) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-40">
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All periods</SelectItem>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ScoreDialog
              metrics={metrics ?? []}
              users={users ?? []}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Record score
                </Button>
              }
            />
          </div>

          <div className="rounded-lg border border-border bg-card">
            {isLoading && (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading scores…</div>
            )}
            {!isLoading && filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No scores match the filter.
              </div>
            )}
            {filtered.map((r) => (
              <ScoreRow key={r.id} row={r} userName={userMap.get(r.user_id) ?? r.user_id} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </AdminGuard>
  );
}

function TeamsManagementSection({
  teams,
  setTeams,
  users,
  qc,
  onOpenMatrix,
}: {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  users: UserOption[];
  qc: ReturnType<typeof useQueryClient>;
  onOpenMatrix?: () => void;
}) {
  const createTeamFn = useServerFn(createTeam);
  const deleteTeamFn = useServerFn(deleteTeam);
  const delegatePowerFn = useServerFn(delegatePower);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamLead, setNewTeamLead] = useState("");

  const [delegateOpen, setDelegateOpen] = useState(false);
  const [selectedUserForPower, setSelectedUserForPower] = useState("");
  const [selectedRoleForPower, setSelectedRoleForPower] = useState<string>("manager");

  const [selectedTeamForAdd, setSelectedTeamForAdd] = useState<string | null>(null);
  const [addUserForTeam, setAddUserForTeam] = useState("");
  const [addRoleForTeam, setAddRoleForTeam] = useState<"lead" | "manager" | "member" | "reviewer">(
    "member",
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const res = await createTeamFn({
        data: {
          name: newTeamName,
          description: newTeamDesc,
          lead_id: newTeamLead || null,
        },
      });
      const newObj: Team = {
        id: res.id || "team-" + Date.now(),
        name: newTeamName,
        description: newTeamDesc || null,
        lead_id: newTeamLead || null,
        lead_name: null,
        created_at: new Date().toISOString(),
        members: newTeamLead
          ? [
              {
                id: "mem-" + Date.now(),
                team_id: res.id || "team-" + Date.now(),
                user_id: newTeamLead,
                role: "lead",
                user_name: users.find((u) => u.id === newTeamLead)?.full_name ?? "Lead",
              },
            ]
          : [],
      };
      setTeams((prev) => [newObj, ...prev]);
      toast.success(`Team "${newTeamName}" created successfully!`);
      setNewTeamName("");
      setNewTeamDesc("");
      setNewTeamLead("");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["teams"] });
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to create team");
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      await deleteTeamFn({ data: { id: teamId } });
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      toast.success(`Team "${teamName}" removed.`);
      qc.invalidateQueries({ queryKey: ["teams"] });
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to remove team");
    }
  };

  const handleAddMemberToTeam = (teamId: string) => {
    if (!addUserForTeam) return;
    const targetUser = users.find((u) => u.id === addUserForTeam);
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          if (t.members.some((m) => m.user_id === addUserForTeam)) {
            toast.error("User is already in this team.");
            return t;
          }
          const updatedMembers = [
            ...t.members,
            {
              id: "mem-" + Date.now(),
              team_id: teamId,
              user_id: addUserForTeam,
              role: addRoleForTeam,
              user_name: targetUser?.full_name ?? targetUser?.email ?? "User",
            },
          ];
          return { ...t, members: updatedMembers };
        }
        return t;
      }),
    );
    toast.success("User added to team!");
    setAddUserForTeam("");
    setSelectedTeamForAdd(null);
  };

  const handleRemoveMember = (teamId: string, memberUserId: string) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return { ...t, members: t.members.filter((m) => m.user_id !== memberUserId) };
        }
        return t;
      }),
    );
    toast.success("Member removed from team.");
  };

  const handleDelegatePowerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPower) return;
    try {
      await delegatePowerFn({
        data: {
          user_id: selectedUserForPower,
          role: selectedRoleForPower as "super_admin" | "admin" | "manager" | "member",
        },
      });
      toast.success(`Power & Role (${selectedRoleForPower}) delegated successfully!`);
      setDelegateOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Failed to delegate power");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Role & Power Governance</h3>
            <p className="text-xs text-muted-foreground">
              Super Admin can grant Admin or Manager privileges; Admins can assign team leads and
              members.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenMatrix && (
            <Button
              size="sm"
              variant="outline"
              className="bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
              onClick={onOpenMatrix}
            >
              <ShieldCheck className="mr-1 h-4 w-4" /> CRUD Matrix
            </Button>
          )}

          {/* Create Team Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    placeholder="e.g. Frontend Infrastructure"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="team-desc">Description</Label>
                  <Textarea
                    id="team-desc"
                    placeholder="Responsibilities and domain..."
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="team-lead">Team Lead (Optional)</Label>
                  <select
                    id="team-lead"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={newTeamLead}
                    onChange={(e) => setNewTeamLead(e.target.value)}
                  >
                    <option value="">No lead assigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name ?? u.email ?? u.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Team</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delegate Power Dialog */}
          <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <KeyRound className="mr-1 h-4 w-4" /> Delegate Power
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delegate Authority & System Role</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDelegatePowerSubmit} className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground">
                  Super Admin or Admins can pass management powers to any team member.
                </p>
                <div className="space-y-1.5">
                  <Label>Target User</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedUserForPower}
                    onChange={(e) => setSelectedUserForPower(e.target.value)}
                    required
                  >
                    <option value="">Select a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name ?? u.email ?? u.id.slice(0, 8)} (
                        {u.roles?.join(", ") || "member"})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign System Role Power</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedRoleForPower}
                    onChange={(e) => setSelectedRoleForPower(e.target.value)}
                  >
                    <option value="super_admin">Super Admin (Full Platform Control)</option>
                    <option value="admin">Admin (Manage Users, Teams, Flows)</option>
                    <option value="manager">Manager (Approve Requests, Lead Teams)</option>
                    <option value="member">Member (Standard Workspace Access)</option>
                  </select>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setDelegateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Grant Power</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {teams.map((t) => {
          const leadUser = users.find((u) => u.id === t.lead_id);
          return (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-bold tracking-tight text-foreground">{t.name}</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.description || "No description provided."}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeleteTeam(t.id, t.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs">
                  <Crown className="h-3.5 w-3.5 text-warning" />
                  <span className="text-muted-foreground">Team Lead:</span>
                  <span className="font-medium text-foreground">
                    {leadUser?.full_name ?? leadUser?.email ?? "Unassigned"}
                  </span>
                </div>

                {/* Team Members List */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Team Members ({t.members.length})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary px-1 hover:bg-primary/10"
                      onClick={() =>
                        setSelectedTeamForAdd(selectedTeamForAdd === t.id ? null : t.id)
                      }
                    >
                      <UserPlus className="mr-1 h-3 w-3" /> Add Member
                    </Button>
                  </div>

                  {/* Add Member inline form */}
                  {selectedTeamForAdd === t.id && (
                    <div className="my-2 space-y-2 rounded-md border border-border/80 bg-background/80 p-3 text-xs">
                      <Label className="text-[11px]">Select User to Add</Label>
                      <select
                        className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                        value={addUserForTeam}
                        onChange={(e) => setAddUserForTeam(e.target.value)}
                      >
                        <option value="">Select user...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name ?? u.email ?? u.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between pt-1">
                        <select
                          className="h-7 rounded border border-input bg-background px-2 text-[11px]"
                          value={addRoleForTeam}
                          onChange={(e) =>
                            setAddRoleForTeam(
                              e.target.value as "lead" | "manager" | "member" | "reviewer",
                            )
                          }
                        >
                          <option value="member">Member</option>
                          <option value="lead">Team Lead</option>
                          <option value="manager">Manager</option>
                          <option value="reviewer">Reviewer</option>
                        </select>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAddMemberToTeam(t.id)}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {t.members.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-1">
                        No members added yet.
                      </p>
                    )}
                    {t.members.map((m) => {
                      const uInfo = users.find((u) => u.id === m.user_id);
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {uInfo?.full_name ??
                                uInfo?.email ??
                                m.user_name ??
                                m.user_id.slice(0, 6)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider py-0 px-1.5"
                            >
                              {m.role}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(t.id, m.user_id)}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreRow({ row, userName }: { row: Score; userName: string }) {
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteScore({ data: { id } }),
    onSuccess: () => toast.success("Score deleted"),
    onError: (e: Error) => toast.error(e?.message ?? "Failed to delete"),
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 p-4 last:border-b-0 hover:bg-muted/10">
      <div>
        <p className="font-semibold">{userName}</p>
        <p className="text-xs text-muted-foreground">
          {row.metrics?.name ?? "Metric"} · Weight {row.metrics?.weight ?? 1}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-lg font-bold text-primary">
            {row.value}
            {row.metrics?.unit ? ` ${row.metrics.unit}` : ""}
          </p>
          <p className="text-xs font-mono text-muted-foreground">{row.period}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => deleteMut.mutate(row.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ScoreDialog({
  metrics,
  users,
  trigger,
}: {
  metrics: { id: string; name: string }[];
  users: { id: string; full_name: string | null }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [metricId, setMetricId] = useState<string>("");
  const [value, setValue] = useState<number>(0);
  const [period, setPeriod] = useState<string>(currentPeriod());

  const recMut = useMutation({
    mutationFn: (data: { user_id: string; metric_id: string; value: number; period: string }) =>
      recordScore({ data }),
    onSuccess: () => {
      toast.success("Score recorded");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e?.message ?? "Failed to record"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !metricId) {
      toast.error("User and metric required");
      return;
    }
    recMut.mutate({ user_id: userId, metric_id: metricId, value, period });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record team score</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Metric</Label>
            <Select value={metricId} onValueChange={setMetricId}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Period (YYYY-MM)</Label>
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit">Record</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
