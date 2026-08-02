import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  MessageSquare,
  Send,
  Kanban,
  Layers,
  Zap,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  Edit,
  BarChart2,
} from "lucide-react";
import { SprintBurndownChart } from "@/components/sprint-burndown-chart";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  bulkAssignTasks,
  bulkUpdateTaskStatus,
  bulkDeleteTasks,
  listAssignableUsers,
  listTaskComments,
  addTaskComment,
  listEpics,
  listSprints,
  listStories,
  createEpic,
  createSprint,
  createStory,
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskStatus,
  type Epic,
  type Sprint,
  type Story,
  type TaskInput,
  type TaskUpdateInput,
  type EpicInput,
  type SprintInput,
  type StoryInput,
} from "@/lib/tasks.functions";
import { listTeams, type Team } from "@/lib/teams.functions";
import { useMyAccess } from "@/hooks/use-my-access";

type UserOption = {
  id: string;
  full_name: string | null;
  email?: string | null;
};

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Global Task Hierarchy & Board · MOMENTUM" },
      {
        name: "description",
        content: "Manage Epics, Sprints, Stories, and Tasks with user & team assignment.",
      },
    ],
  }),
  component: TasksPage,
});

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "border-border text-muted-foreground",
  medium: "border-primary/40 text-primary",
  high: "border-warning/50 text-warning",
  urgent: "border-destructive/60 text-destructive font-bold",
};

type Task = Awaited<ReturnType<typeof listTasks>>[number] & {
  epic_id?: string | null;
  sprint_id?: string | null;
  story_id?: string | null;
  team_id?: string | null;
};

function TasksPage() {
  const qc = useQueryClient();
  const access = useMyAccess();

  const fetchTasks = useServerFn(listTasks);
  const fetchUsers = useServerFn(listAssignableUsers);
  const fetchTeams = useServerFn(listTeams);
  const fetchEpics = useServerFn(listEpics);
  const fetchSprints = useServerFn(listSprints);
  const fetchStories = useServerFn(listStories);
  const createEpicFn = useServerFn(createEpic);
  const createSprintFn = useServerFn(createSprint);
  const createStoryFn = useServerFn(createStory);

  const create = useServerFn(createTask);
  const update = useServerFn(updateTask);
  const remove = useServerFn(deleteTask);
  const bulkAssignFn = useServerFn(bulkAssignTasks);
  const bulkStatusFn = useServerFn(bulkUpdateTaskStatus);
  const bulkDeleteFn = useServerFn(bulkDeleteTasks);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [prefillStory, setPrefillStory] = useState<Story | null>(null);


  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id],
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiClient.get<any[]>("/tasks"),
  });
  const { data: usersData = [] } = useQuery({
    queryKey: ["assignables"],
    queryFn: () => apiClient.get<UserOption[]>("/profiles"),
  });
  const users: UserOption[] = useMemo(
    () => usersData.map((u) => ({ id: u.id, full_name: u.full_name })),
    [usersData],
  );
  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: () => apiClient.get<any[]>("/teams") });
  const { data: epicsData = [] } = useQuery({ queryKey: ["epics"], queryFn: () => apiClient.get<any[]>("/epics") });
  const { data: sprintsData = [] } = useQuery({
    queryKey: ["sprints"],
    queryFn: () => apiClient.get<any[]>("/sprints"),
  });
  const { data: storiesData = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: () => apiClient.get<any[]>("/stories"),
  });

  const epics: Epic[] = epicsData;
  const sprints: Sprint[] = sprintsData;
  const stories: Story[] = storiesData;

  const epicMut = useMutation({
    mutationFn: (v: EpicInput) => createEpicFn({ data: v }),
    onSuccess: () => {
      toast.success("Epic created");
      setEpicDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["epics"] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to create epic"),
  });
  const sprintMut = useMutation({
    mutationFn: (v: SprintInput) => createSprintFn({ data: v }),
    onSuccess: () => {
      toast.success("Sprint created");
      setSprintDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["sprints"] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to create sprint"),
  });
  const storyMut = useMutation({
    mutationFn: (v: StoryInput) => createStoryFn({ data: v }),
    onSuccess: () => {
      toast.success("Story created");
      setStoryDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["stories"] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to create story"),
  });

  const [activeTab, setActiveTab] = useState("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [filterSprint, setFilterSprint] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const createMut = useMutation({
    mutationFn: (v: TaskInput) => create({ data: v }),
    onSuccess: () => {
      toast.success("Task created");
      setTaskDialogOpen(false);
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to create task"),
  });

  const updateMut = useMutation({
    mutationFn: (v: TaskUpdateInput) => update({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to update task"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Task deleted");
      setActiveTaskDetail(null);
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to delete task"),
  });

  const bulkAssignMut = useMutation({
    mutationFn: (v: { ids: string[]; assignee_id?: string | null; team_id?: string | null }) =>
      bulkAssignFn({ data: v }),
    onSuccess: (_, vars) => {
      toast.success(`Successfully assigned ${vars.ids.length} task(s)!`);
      setSelectedTaskIds([]);
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Bulk assign failed"),
  });

  const bulkStatusMut = useMutation({
    mutationFn: (v: { ids: string[]; status: TaskStatus }) => bulkStatusFn({ data: v }),
    onSuccess: (_, vars) => {
      toast.success(`Updated status for ${vars.ids.length} task(s)!`);
      setSelectedTaskIds([]);
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Bulk status change failed"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (v: { ids: string[] }) => bulkDeleteFn({ data: v }),
    onSuccess: (_, vars) => {
      toast.success(`Deleted ${vars.ids.length} task(s)!`);
      setSelectedTaskIds([]);
      invalidate();
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Bulk delete failed"),
  });

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return (tasks as Task[]).filter((t) => {
      if (filterEpic !== "all" && t.epic_id !== filterEpic) return false;
      if (filterSprint !== "all" && t.sprint_id !== filterSprint) return false;
      if (filterAssignee !== "all") {
        if (filterAssignee.startsWith("team:")) {
          const teamId = filterAssignee.replace("team:", "");
          if (t.team_id !== teamId) return false;
        } else if (t.assignee_id !== filterAssignee) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [tasks, filterEpic, filterSprint, filterAssignee, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Global Task Operations
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <CheckSquare className="h-8 w-8 text-primary" /> Task Hierarchy & Sprint Board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete hierarchy (Epics → Sprints → Stories → Tasks) with User & Team assignments.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEpicDialogOpen(true)}>
            <Layers className="mr-1 h-4 w-4 text-emerald-400" /> + Epic
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSprintDialogOpen(true)}>
            <Zap className="mr-1 h-4 w-4 text-blue-400" /> + Sprint
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStoryDialogOpen(true)}>
            <BookOpen className="mr-1 h-4 w-4 text-purple-400" /> + Story
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> + Task
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks, descriptions..."
              className="pl-9 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="min-w-40">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              value={filterEpic}
              onChange={(e) => setFilterEpic(e.target.value)}
            >
              <option value="all">All Epics</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>
                  Epic: {e.title}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-40">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              value={filterSprint}
              onChange={(e) => setFilterSprint(e.target.value)}
            >
              <option value="all">All Sprints</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  Sprint: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-44">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="all">All Assignees (Users & Teams)</option>
              <optgroup label="Individual Users">
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.full_name ?? u.id.slice(0, 8)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Teams">
                {teams.map((t) => (
                  <option key={t.id} value={`team:${t.id}`}>
                    👥 Team: {t.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-3">
            <Button
              variant={selectedTaskIds.length > 0 ? "secondary" : "outline"}
              size="sm"
              onClick={handleSelectAllFiltered}
              className="h-9 text-xs gap-1.5 font-medium"
            >
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
              {selectedTaskIds.length > 0 && selectedTaskIds.length === filteredTasks.length
                ? "Deselect All"
                : `Select All (${filteredTasks.length})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Selection Toolbar */}
      {selectedTaskIds.length > 0 && (
        <div className="sticky top-4 z-40 flex flex-col md:flex-row items-center justify-between gap-3 rounded-xl border border-primary/40 bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Badge
              variant="default"
              className="bg-primary text-primary-foreground font-mono px-2.5 py-1 text-xs font-semibold"
            >
              {selectedTaskIds.length} Selected
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              out of {filteredTasks.length} filtered tasks
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleSelectAllFiltered}
            >
              {selectedTaskIds.length === filteredTasks.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Assign Select */}
            <Select
              onValueChange={(val) => {
                if (val.startsWith("team:")) {
                  const tId = val.replace("team:", "");
                  bulkAssignMut.mutate({ ids: selectedTaskIds, team_id: tId, assignee_id: null });
                } else if (val === "unassigned") {
                  bulkAssignMut.mutate({ ids: selectedTaskIds, assignee_id: null, team_id: null });
                } else {
                  bulkAssignMut.mutate({ ids: selectedTaskIds, assignee_id: val, team_id: null });
                }
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs bg-background">
                <SelectValue placeholder="👥 Bulk Assign..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">👤 Unassigned</SelectItem>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  Individual Users
                </div>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    👤 {u.full_name || u.email || u.id.slice(0, 8)}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  Teams
                </div>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={`team:${t.id}`}>
                    👥 Team: {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bulk Status Select */}
            <Select
              onValueChange={(val) => {
                bulkStatusMut.mutate({ ids: selectedTaskIds, status: val as TaskStatus });
              }}
            >
              <SelectTrigger className="h-8 w-36 text-xs bg-background">
                <SelectValue placeholder="📌 Change Status..." />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((st) => (
                  <SelectItem key={st} value={st}>
                    Move to {STATUS_LABEL[st]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bulk Delete Button */}
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={bulkDeleteMut.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to permanently delete ${selectedTaskIds.length} task(s)?`,
                  )
                ) {
                  bulkDeleteMut.mutate({ ids: selectedTaskIds });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedTaskIds.length})
            </Button>

            {/* Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedTaskIds([])}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="board" className="flex items-center gap-1.5 text-xs">
            <Kanban className="h-3.5 w-3.5" /> Board
          </TabsTrigger>
          <TabsTrigger value="tree" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Hierarchy
          </TabsTrigger>
          <TabsTrigger value="epics" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5 text-emerald-400" /> Epics ({epics.length})
          </TabsTrigger>
          <TabsTrigger value="sprints" className="flex items-center gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5 text-blue-400" /> Sprints ({sprints.length})
          </TabsTrigger>
          <TabsTrigger value="stories" className="flex items-center gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5 text-purple-400" /> Stories ({stories.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs">
            <BarChart2 className="h-3.5 w-3.5 text-amber-400" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* Board View */}
        <TabsContent value="board" className="space-y-6">
          <KanbanBoard
            tasks={filteredTasks}
            users={users}
            teams={teams}
            epics={epics}
            sprints={sprints}
            selectedTaskIds={selectedTaskIds}
            onToggleSelectTask={toggleTaskSelection}
            onUpdateStatus={(taskId, newStatus) =>
              updateMut.mutate({
                id: taskId,
                status: newStatus as TaskStatus,
              })
            }
            onSelectTask={(t) => setActiveTaskDetail(t)}
          />
        </TabsContent>

        {/* Hierarchy Tree View */}
        <TabsContent value="tree" className="space-y-6">
          <HierarchyTreeView
            epics={epics}
            sprints={sprints}
            stories={stories}
            tasks={filteredTasks}
            users={users}
            teams={teams}
            selectedTaskIds={selectedTaskIds}
            onToggleSelectTask={toggleTaskSelection}
            onSelectTask={(t) => setActiveTaskDetail(t)}
          />
        </TabsContent>

        {/* Epics View */}
        <TabsContent value="epics" className="space-y-6">
          <EpicsManager
            epics={epics}
            tasks={tasks as Task[]}
            stories={stories}
          />
        </TabsContent>

        {/* Sprints View */}
        <TabsContent value="sprints" className="space-y-6">
          <SprintsManager sprints={sprints} tasks={tasks as Task[]} />
        </TabsContent>

        {/* Stories View */}
        <TabsContent value="stories" className="space-y-6">
          <StoriesManager
            stories={stories}
            epics={epics}
            sprints={sprints}
            tasks={tasks as Task[]}
            onAddTask={(story) => {
              setEditingTask(null);
              setPrefillStory(story);
              setTaskDialogOpen(true);
            }}
          />

        </TabsContent>

        {/* Analytics & Sprint Burndown View */}
        <TabsContent value="analytics" className="space-y-6">
          <SprintBurndownChart sprints={sprints} tasks={tasks as Task[]} stories={stories} />
        </TabsContent>
      </Tabs>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        key={editingTask?.id ?? prefillStory?.id ?? "new"}
        open={taskDialogOpen}
        setOpen={(o) => {
          setTaskDialogOpen(o);
          if (!o) setPrefillStory(null);
        }}
        task={editingTask}
        defaults={
          prefillStory
            ? {
                story_id: prefillStory.id,
                epic_id: prefillStory.epic_id,
                sprint_id: prefillStory.sprint_id,
              }
            : null
        }
        users={users}
        teams={teams}
        epics={epics}
        sprints={sprints}
        stories={stories}

        onSubmit={(vals) => {
          if (editingTask) {
            updateMut.mutate({ id: editingTask.id, ...vals });
          } else {
            createMut.mutate(vals);
          }
        }}
      />

      {/* Epic Modal */}
      <CreateEpicModal
        open={epicDialogOpen}
        setOpen={setEpicDialogOpen}
        onAdd={(epic) => epicMut.mutate(epic)}
      />

      {/* Sprint Modal */}
      <CreateSprintModal
        open={sprintDialogOpen}
        setOpen={setSprintDialogOpen}
        onAdd={(sprint) => sprintMut.mutate(sprint)}
      />

      {/* Story Modal */}
      <CreateStoryModal
        open={storyDialogOpen}
        setOpen={setStoryDialogOpen}
        epics={epics}
        sprints={sprints}
        stories={stories}

        onAdd={(story) => storyMut.mutate(story)}
      />

      {/* Task Detail Dialog */}
      {activeTaskDetail && (
        <TaskDetailDialog
          task={activeTaskDetail}
          onClose={() => setActiveTaskDetail(null)}
          onDelete={() => deleteMut.mutate(activeTaskDetail.id)}
          onUpdateStatus={(newStatus) => {
            updateMut.mutate({
              id: activeTaskDetail.id,
              status: newStatus as TaskStatus,
            });
            setActiveTaskDetail((prev) => (prev ? { ...prev, status: newStatus as TaskStatus } : null));
          }}
          users={users}
          teams={teams}
          epics={epics}
          sprints={sprints}
        />
      )}
    </div>
  );
}

// Kanban Board Component
function KanbanBoard({
  tasks,
  users,
  teams,
  epics,
  sprints,
  selectedTaskIds = [],
  onToggleSelectTask,
  onUpdateStatus,
  onSelectTask,
}: {
  tasks: Task[];
  users: UserOption[];
  teams: Team[];
  epics: Epic[];
  sprints: Sprint[];
  selectedTaskIds?: string[];
  onToggleSelectTask?: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onSelectTask: (t: Task) => void;
}) {
  const epicMap = new Map(epics.map((e) => [e.id, e.title]));
  const sprintMap = new Map(sprints.map((s) => [s.id, s.name]));
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {TASK_STATUSES.map((st) => {
        const colTasks = tasks.filter((t) => t.status === st);
        return (
          <div
            key={st}
            className="flex flex-col rounded-xl border border-border bg-card/40 p-3 min-h-[450px]"
          >
            <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2 px-1">
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-foreground">
                {STATUS_LABEL[st]} ({colTasks.length})
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {colTasks.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
                  No tasks in {STATUS_LABEL[st]}
                </div>
              )}
              {colTasks.map((t) => {
                const assignedTeam = t.team_id ? teamMap.get(t.team_id) : null;
                const epicTitle = t.epic_id ? epicMap.get(t.epic_id) : null;
                const sprintName = t.sprint_id ? sprintMap.get(t.sprint_id) : null;
                const isSelected = selectedTaskIds.includes(t.id);

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className={`group relative cursor-pointer rounded-lg border bg-card p-3 shadow-xs hover:border-primary/50 transition-all space-y-2 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {onToggleSelectTask && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              onToggleSelectTask(t.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                          />
                        )}
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {t.title}
                        </h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${PRIORITY_STYLE[t.priority] || ""}`}
                      >
                        {t.priority}
                      </Badge>
                    </div>

                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    )}

                    {/* Meta Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      {epicTitle && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0"
                        >
                          {epicTitle}
                        </Badge>
                      )}
                      {sprintName && (
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/10 text-blue-400 border-blue-500/20 py-0"
                        >
                          {sprintName}
                        </Badge>
                      )}
                      {assignedTeam && (
                        <Badge
                          variant="secondary"
                          className="bg-purple-500/10 text-purple-400 border-purple-500/20 py-0"
                        >
                          👥 {assignedTeam}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <span>👤 {t.assignee_name ?? "Unassigned"}</span>
                      <span className="font-mono font-semibold text-primary">{t.points} pts</span>
                    </div>

                    {/* Quick Move Selector */}
                    <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                      <select
                        className="h-6 rounded border border-input bg-background px-1 text-[10px]"
                        value={t.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(t.id, e.target.value);
                        }}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Move to {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hierarchy Tree View Component
function HierarchyTreeView({
  epics,
  sprints,
  stories,
  tasks,
  users,
  teams,
  selectedTaskIds = [],
  onToggleSelectTask,
  onSelectTask,
}: {
  epics: Epic[];
  sprints: Sprint[];
  stories: Story[];
  tasks: Task[];
  users: UserOption[];
  teams: Team[];
  selectedTaskIds?: string[];
  onToggleSelectTask?: (id: string) => void;
  onSelectTask: (t: Task) => void;
}) {
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  const toggleEpic = (id: string) => {
    setExpandedEpics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      {epics.map((epic) => {
        const isExp = expandedEpics[epic.id] ?? true;
        const epicStories = stories.filter((s) => s.epic_id === epic.id);
        const epicTasks = tasks.filter((t) => t.epic_id === epic.id);

        return (
          <div key={epic.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div
              className="flex cursor-pointer items-center justify-between font-semibold"
              onClick={() => toggleEpic(epic.id)}
            >
              <div className="flex items-center gap-2">
                {isExp ? (
                  <ChevronDown className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Layers className="h-4 w-4 text-emerald-400" />
                <span className="text-base font-bold text-foreground">{epic.title}</span>
                <Badge
                  variant="outline"
                  className="text-xs uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                >
                  Epic
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{epicTasks.length} linked tasks</span>
            </div>

            {isExp && (
              <div className="pl-6 space-y-3 border-l-2 border-emerald-500/20 ml-2">
                {/* Linked Stories */}
                {epicStories.map((story) => {
                  const storyTasks = tasks.filter((t) => t.story_id === story.id);
                  return (
                    <div
                      key={story.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-sm font-semibold">{story.title}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {story.points} pts
                          </Badge>
                        </div>
                      </div>

                      {/* Story Tasks */}
                      <div className="pl-4 space-y-1.5 border-l border-purple-500/20">
                        {storyTasks.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            No tasks created under this story.
                          </p>
                        )}
                        {storyTasks.map((t) => {
                          const isSelected = selectedTaskIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => onSelectTask(t)}
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded border px-3 py-1.5 text-xs transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/10 font-medium"
                                  : "border-border/40 bg-background hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {onToggleSelectTask && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      onToggleSelectTask(t.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
                                  />
                                )}
                                <span className="font-medium text-foreground truncate">
                                  {t.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-[10px]">
                                  {STATUS_LABEL[t.status]}
                                </Badge>
                                <span className="text-muted-foreground">
                                  👤 {t.assignee_name ?? "Unassigned"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Direct Epic Tasks not under story */}
                {epicTasks
                  .filter((t) => !t.story_id)
                  .map((t) => {
                    const isSelected = selectedTaskIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTask(t)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 font-medium"
                            : "border-border/60 bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {onToggleSelectTask ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                onToggleSelectTask(t.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
                            />
                          ) : (
                            <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span className="font-medium text-foreground truncate">{t.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_LABEL[t.status]}
                          </Badge>
                          <span className="text-muted-foreground">
                            👤 {t.assignee_name ?? "Unassigned"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Epics Manager
function EpicsManager({
  epics,
  tasks,
  stories,
}: {
  epics: Epic[];
  tasks: Task[];
  stories: Story[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {epics.map((epic) => {
        const linkedTasks = tasks.filter((t) => t.epic_id === epic.id);
        const doneCount = linkedTasks.filter((t) => t.status === "done").length;
        const pct = linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : 0;

        return (
          <div key={epic.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                  Epic
                </span>
                <h3 className="text-lg font-bold text-foreground">{epic.title}</h3>
              </div>
              <Badge variant="outline" className="capitalize">
                {epic.status}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">{epic.description || "No description."}</p>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>Completion</span>
                <span>
                  {pct}% ({doneCount}/{linkedTasks.length} tasks)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Sprints Manager
function SprintsManager({
  sprints,
  tasks,
}: {
  sprints: Sprint[];
  tasks: Task[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sprints.map((sprint) => {
        const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
        const doneTasks = sprintTasks.filter((t) => t.status === "done").length;

        return (
          <div key={sprint.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-blue-400">
                  Sprint
                </span>
                <h3 className="text-lg font-bold text-foreground">{sprint.name}</h3>
              </div>
              <Badge
                variant={sprint.status === "active" ? "default" : "outline"}
                className="capitalize"
              >
                {sprint.status}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {sprint.goal || "No sprint goal declared."}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>
                {sprint.start_date || "TBD"} → {sprint.end_date || "TBD"}
              </span>
            </div>

            <div className="border-t border-border/40 pt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Tasks in Sprint:</span>
              <span className="font-bold text-foreground">
                {doneTasks} / {sprintTasks.length} Done
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Stories Manager
function StoriesManager({
  stories,
  epics,
  sprints,
  tasks,
  onAddTask,
}: {
  stories: Story[];
  epics: Epic[];
  sprints: Sprint[];
  tasks: Task[];
  onAddTask?: (story: Story) => void;
}) {
  const epicMap = new Map(epics.map((e) => [e.id, e.title]));
  const sprintMap = new Map(sprints.map((s) => [s.id, s.name]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stories.map((story) => {
        const storyTasks = tasks.filter((t) => t.story_id === story.id);
        return (
          <div key={story.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-purple-400">
                  User Story
                </span>
                <h3 className="text-base font-bold text-foreground">{story.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{story.points} pts</Badge>
                {onAddTask && (
                  <Button size="sm" variant="outline" onClick={() => onAddTask(story)}>
                    + Task
                  </Button>
                )}
              </div>
            </div>

            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {storyTasks.length} task{storyTasks.length === 1 ? "" : "s"} ·{" "}
              {storyTasks.filter((t) => t.status === "done").length} done
            </p>


            <p className="text-xs text-muted-foreground">
              {story.description || "No story description."}
            </p>

            <div className="flex flex-wrap gap-2 text-[10px]">
              {story.epic_id && (
                <Badge variant="outline" className="text-emerald-400">
                  Epic: {epicMap.get(story.epic_id) ?? story.epic_id}
                </Badge>
              )}
              {story.sprint_id && (
                <Badge variant="outline" className="text-blue-400">
                  Sprint: {sprintMap.get(story.sprint_id) ?? story.sprint_id}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Task Modal
function TaskModal({
  open,
  setOpen,
  task,
  defaults,
  users,
  teams,
  epics,
  sprints,
  stories,
  onSubmit,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  task: Task | null;
  defaults?: { story_id?: string | null; epic_id?: string | null; sprint_id?: string | null } | null;
  users: UserOption[];

  teams: Team[];
  epics: Epic[];
  sprints: Sprint[];
  stories: Story[];
  onSubmit: (vals: TaskInput) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [teamId, setTeamId] = useState(task?.team_id ?? "");
  const [epicId, setEpicId] = useState(task?.epic_id ?? defaults?.epic_id ?? "");
  const [sprintId, setSprintId] = useState(task?.sprint_id ?? defaults?.sprint_id ?? "");
  const [storyId, setStoryId] = useState(task?.story_id ?? defaults?.story_id ?? "");

  const [status, setStatus] = useState<string>(task?.status ?? "todo");
  const [priority, setPriority] = useState<string>(task?.priority ?? "medium");
  const [points, setPoints] = useState<number>(task?.points ?? 1);
  const [dueDate, setDueDate] = useState<string>(task?.due_date ?? "");
  const [startDate, setStartDate] = useState<string>(
    (task as { start_date?: string | null } | null)?.start_date ?? "",
  );
  const [estimateValue, setEstimateValue] = useState<string>(
    String((task as { estimate_value?: number | null } | null)?.estimate_value ?? ""),
  );
  const [estimateUnit, setEstimateUnit] = useState<string>(
    (task as { estimate_unit?: string | null } | null)?.estimate_unit ?? "hours",
  );

  const derivedDays =
    startDate && dueDate
      ? Math.max(
          0,
          Math.round(
            (new Date(dueDate).getTime() - new Date(startDate).getTime()) / 86400000,
          ),
        )
      : null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title,
      description: description || null,
      assignee_id: assigneeId || null,
      team_id: teamId || null,
      epic_id: epicId || null,
      sprint_id: sprintId || null,
      story_id: storyId || null,
      status: status as TaskInput["status"],
      priority: priority as TaskInput["priority"],
      points,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimate_value: estimateValue === "" ? null : Number(estimateValue),
      estimate_unit: estimateUnit as TaskInput["estimate_unit"],
    });
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Task Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title..."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task instructions and criteria..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Assignee User</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? u.email ?? u.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Assignee Team</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">No team assigned</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Epic Hierarchy</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={epicId}
                onChange={(e) => setEpicId(e.target.value)}
              >
                <option value="">None</option>
                {epics.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Sprint</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
              >
                <option value="">None</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>User Story</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={storyId}
                onChange={(e) => setStoryId(e.target.value)}
              >
                <option value="">None</option>
                {stories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Estimate</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                placeholder="e.g. 8"
                value={estimateValue}
                onChange={(e) => setEstimateValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={estimateUnit}
                onChange={(e) => setEstimateUnit(e.target.value)}
              >
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          </div>
          {derivedDays !== null && (
            <p className="font-mono text-xs text-muted-foreground">
              Window: {startDate} → {dueDate} ({derivedDays} day{derivedDays === 1 ? "" : "s"})
            </p>
          )}



          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Epic Modal
function CreateEpicModal({
  open,
  setOpen,
  onAdd,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  onAdd: (epic: EpicInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, description: description || null, status: "in_progress" });
    setTitle("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Epic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Epic Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit">Create Epic</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sprint Modal
function CreateSprintModal({
  open,
  setOpen,
  onAdd,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  onAdd: (sprint: SprintInput) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [totalPoints, setTotalPoints] = useState(40);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name,
      goal: goal || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: "planning",
      total_points: totalPoints,
    });
    setName("");
    setGoal("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sprint Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Sprint 24.3..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sprint Goal</Label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Starts</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ends</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Point budget</Label>
              <Input
                type="number"
                min={0}
                value={totalPoints}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The total point budget is fixed at sprint creation; story and task points are
            distributed against it.
          </p>
          <DialogFooter>

            <Button type="submit">Create Sprint</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Story Modal
function CreateStoryModal({
  open,
  setOpen,
  epics,
  sprints,
  stories,
  onAdd,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  epics: Epic[];
  sprints: Sprint[];
  stories: Story[];
  onAdd: (story: StoryInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [epicId, setEpicId] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [points, setPoints] = useState(5);

  const sprint = sprints.find((s) => s.id === sprintId) ?? null;
  const budget = (sprint as { total_points?: number } | null)?.total_points ?? 0;
  const allocated = stories
    .filter((s) => s.sprint_id === sprintId)
    .reduce((sum, s) => sum + (s.points ?? 0), 0);
  const remaining = budget - allocated - points;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title,
      description: description || null,
      epic_id: epicId || null,
      sprint_id: sprintId || null,
      points,
      status: "in_progress",
    });
    setTitle("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User Story</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Story Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Epic</Label>
              <select
                className="h-9 w-full rounded border border-input bg-background px-2 text-xs"
                value={epicId}
                onChange={(e) => setEpicId(e.target.value)}
              >
                <option value="">None</option>
                {epics.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Sprint</Label>
              <select
                className="h-9 w-full rounded border border-input bg-background px-2 text-xs"
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
              >
                <option value="">None</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
          </div>

          {sprintId && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>Sprint point distribution</span>
                <span>
                  {allocated + points} / {budget || "∞"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${remaining < 0 ? "bg-destructive" : "bg-primary"}`}
                  style={{
                    width: budget
                      ? `${Math.min(100, ((allocated + points) / budget) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {budget === 0
                  ? "No point budget set for this sprint."
                  : remaining < 0
                    ? `Over budget by ${Math.abs(remaining)} pts.`
                    : `${remaining} pts remaining after this story.`}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit">Create Story</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Task Detail Dialog
function TaskDetailDialog({
  task,
  onClose,
  onDelete,
  onUpdateStatus,
  users,
  teams,
  epics,
  sprints,
}: {
  task: Task;
  onClose: () => void;
  onDelete: () => void;
  onUpdateStatus: (st: string) => void;
  users: UserOption[];
  teams: Team[];
  epics: Epic[];
  sprints: Sprint[];
}) {
  const fetchComments = useServerFn(listTaskComments);
  const addComment = useServerFn(addTaskComment);
  const qc = useQueryClient();

  const [commentText, setCommentText] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: () => fetchComments({ data: { task_id: task.id } }),
  });

  const commentMut = useMutation({
    mutationFn: (body: string) => addComment({ data: { task_id: task.id, body } }),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["task-comments", task.id] });
    },
    onError: (e: { message?: string }) => toast.error(e?.message ?? "Failed to comment"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task.description && (
            <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-md">
              {task.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs border-y border-border/60 py-3">
            <div>
              <span className="text-muted-foreground">Assignee:</span>{" "}
              <span className="font-semibold text-foreground">
                {task.assignee_name ?? "Unassigned"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Points:</span>{" "}
              <span className="font-mono font-semibold text-primary">{task.points} pts</span>
            </div>
            <div>
              <span className="text-muted-foreground">Priority:</span>{" "}
              <Badge variant="outline" className="capitalize">
                {task.priority}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <select
                className="h-7 rounded border border-input bg-background px-2 text-xs"
                value={task.status}
                onChange={(e) => onUpdateStatus(e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
            </h4>

            <div className="max-h-40 overflow-y-auto space-y-2">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No comments yet.</p>
              )}
              {(comments as { id: string; author_name: string | null; body: string }[]).map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs"
                >
                  <div className="font-semibold text-foreground">{c.author_name ?? "User"}</div>
                  <div className="mt-1 text-muted-foreground">{c.body}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                onClick={() => commentMut.mutate(commentText)}
                disabled={!commentText.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
