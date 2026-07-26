import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Users,
  Shield,
  Activity,
  Layers,
  Award,
  User,
  FolderKanban,
  Zap,
  ArrowRight,
  Sparkles,
  Kanban,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { listTasks, listEpics, listAssignableUsers } from "@/lib/tasks.functions";
import { listTeams } from "@/lib/teams.functions";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const getTasks = useServerFn(listTasks);
  const getEpics = useServerFn(listEpics);
  const getTeams = useServerFn(listTeams);
  const getUsers = useServerFn(listAssignableUsers);

  // Queries for real-time search across hierarchy
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks({ data: {} }),
    enabled: open,
  });

  const { data: epics = [] } = useQuery({
    queryKey: ["epics"],
    queryFn: () => getEpics({ data: {} }),
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => getTeams({ data: undefined }),
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["assignable_users"],
    queryFn: () => getUsers({ data: {} }),
    enabled: open,
  });

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tasks, teams, epics, users, or navigate..." />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          No matching tasks, teams, or actions found.
        </CommandEmpty>

        {/* Quick Navigation Group */}
        <CommandGroup heading="Navigation & Dashboard Views">
          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/dashboard" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-xs">Executive Dashboard</span>
            <CommandShortcut className="text-[10px]">Overview</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/tasks" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-xs">Global Task Dashboard</span>
            <CommandShortcut className="text-[10px]">Kanban & Backlog</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/admin/team" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Users className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="font-medium text-xs">Team & Org Management</span>
            <CommandShortcut className="text-[10px]">Roster & Matrix</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/admin/users" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Shield className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="font-medium text-xs">User Security Directory</span>
            <CommandShortcut className="text-[10px]">Roles & Access</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/admin/approvals" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Zap className="h-4 w-4 text-purple-500 shrink-0" />
            <span className="font-medium text-xs">Approvals Hub</span>
            <CommandShortcut className="text-[10px]">Requests</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect(() => navigate({ to: "/admin/metrics" }))}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Activity className="h-4 w-4 text-rose-500 shrink-0" />
            <span className="font-medium text-xs">Admin Metrics</span>
            <CommandShortcut className="text-[10px]">KPIs</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Tasks Group */}
        {tasks.length > 0 && (
          <CommandGroup heading={`Tasks (${tasks.length})`}>
            {tasks.slice(0, 10).map((t) => (
              <CommandItem
                key={t.id}
                value={`task ${t.title} ${t.status} ${t.priority} ${t.assignee_name || ""}`}
                onSelect={() => handleSelect(() => navigate({ to: "/tasks" }))}
                className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-medium text-xs text-foreground truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">
                    {t.status.replace("_", " ")}
                  </Badge>
                  {t.assignee_name && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      👤 {t.assignee_name}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1" />

        {/* Epics & Projects Group */}
        {epics.length > 0 && (
          <CommandGroup heading={`Epics & Projects (${epics.length})`}>
            {epics.slice(0, 6).map((e) => (
              <CommandItem
                key={e.id}
                value={`epic ${e.title} ${e.status} ${e.priority}`}
                onSelect={() => handleSelect(() => navigate({ to: "/tasks" }))}
                className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FolderKanban className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="font-medium text-xs text-foreground truncate">{e.title}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {e.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1" />

        {/* Teams Group */}
        {teams.length > 0 && (
          <CommandGroup heading={`Teams (${teams.length})`}>
            {teams.slice(0, 6).map((tm) => (
              <CommandItem
                key={tm.id}
                value={`team ${tm.name} ${tm.description || ""}`}
                onSelect={() => handleSelect(() => navigate({ to: "/admin/team" }))}
                className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="font-medium text-xs text-foreground truncate">{tm.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {tm.members?.length || 0} member(s)
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1" />

        {/* Team Members Group */}
        {users.length > 0 && (
          <CommandGroup heading={`Team Members (${users.length})`}>
            {users.slice(0, 8).map((u) => (
              <CommandItem
                key={u.id}
                value={`user ${u.full_name || ""} ${u.email || ""}`}
                onSelect={() => handleSelect(() => navigate({ to: "/admin/users" }))}
                className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <User className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium text-xs text-foreground truncate">
                    {u.full_name || u.email || u.id.slice(0, 8)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {u.email || "No email"}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
