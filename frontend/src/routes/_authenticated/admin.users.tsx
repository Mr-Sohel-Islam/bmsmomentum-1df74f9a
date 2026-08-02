import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  Plus,
  KeyRound,
  Trash2,
  Loader2,
  Lock,
  UserCog,
  Search,
  Filter,
  Shield,
  Stethoscope,
  CheckSquare,
  Zap,
  Package,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUser,
  setUserRoles,
  setUserPermissions,
  resetUserPassword,
  updateUserProfile,
  deleteUser,
  ROLES,
  type Permission,
  type Role,
} from "@/lib/admin.functions";
import { apiClient } from "@/lib/api-client";

import { AdminGuard } from "@/components/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users · MOMENTUM" },
      { name: "description", content: "Onboard users, assign roles and fine-grained permissions, reset passwords." },
    ],
  }),
  component: UsersPage,
});

type UserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  position_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  email: string | null;
  roles: string[];
  permissions: string[];
  is_super_admin: boolean;
};
type Position = { id: string; title: string; level: number };

const PERMISSION_GROUPS: {
  title: string;
  icon: typeof Shield;
  permissions: { key: Permission; label: string }[];
}[] = [
  {
    title: "System Administration",
    icon: Shield,
    permissions: [
      { key: "users:read", label: "users:read (View users directory)" },
      { key: "users:manage", label: "users:manage (Onboard & manage users)" },
      { key: "teams:read", label: "teams:read (View teams & members)" },
      { key: "teams:manage", label: "teams:manage (Manage teams & governance)" },
      { key: "teams:members", label: "teams:members (Manage team memberships)" },
      { key: "metrics:manage", label: "metrics:manage (Configure KPI metrics)" },
      { key: "all", label: "all (Master system override)" },
    ],
  },
  {
    title: "Pharma & Field Operations",
    icon: Stethoscope,
    permissions: [
      { key: "pharma:read", label: "pharma:read (View doctors directory)" },
      { key: "pharma:create", label: "pharma:create (Create doctor records)" },
      { key: "trade:read", label: "trade:read (View chemist & trade network)" },
      { key: "trade:create", label: "trade:create (Register trade entities)" },
      { key: "reports:read", label: "reports:read (View daily field activity)" },
      { key: "reports:create", label: "reports:create (Submit daily reports)" },
      { key: "detailing:read", label: "detailing:read (Access 3D visual detailing)" },
    ],
  },
  {
    title: "Tasks & Backlog",
    icon: CheckSquare,
    permissions: [
      { key: "tasks:read", label: "tasks:read (View tasks)" },
      { key: "tasks:create", label: "tasks:create (Create tasks)" },
      { key: "tasks:update", label: "tasks:update (Update tasks)" },
      { key: "tasks:delete", label: "tasks:delete (Delete tasks)" },
      { key: "tasks:bulk", label: "tasks:bulk (Bulk operations)" },
      { key: "tasks:update_status", label: "tasks:update_status (Change task status)" },
      { key: "tasks:manage", label: "tasks:manage (Full task management)" },
      { key: "sprints:read", label: "sprints:read (View sprints)" },
      { key: "sprints:manage", label: "sprints:manage (Manage sprint cycles)" },
      { key: "epics:read", label: "epics:read (View epics)" },
      { key: "epics:manage", label: "epics:manage (Manage epic projects)" },
    ],
  },
  {
    title: "Approvals Engine",
    icon: Zap,
    permissions: [
      { key: "approvals:read", label: "approvals:read (View approval requests)" },
      { key: "approvals:create", label: "approvals:create (Submit requests)" },
      { key: "approvals:action", label: "approvals:action (Approve or reject requests)" },
      { key: "approvals:manage", label: "approvals:manage (Configure approval flows)" },
    ],
  },
  {
    title: "Products & Onboarding",
    icon: Package,
    permissions: [
      { key: "products:read", label: "products:read (View product catalog)" },
      { key: "products:manage", label: "products:manage (Manage products & pricing)" },
      { key: "products:onboard_item", label: "products:onboard_item (Submit items for onboarding)" },
    ],
  },
  {
    title: "Performance & Evaluation",
    icon: TrendingUp,
    permissions: [
      { key: "performance:read", label: "performance:read (View performance scores)" },
      { key: "performance:evaluate", label: "performance:evaluate (Submit performance ratings)" },
    ],
  },
];

function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.get<UserRow[]>("/profiles"),
  });
  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => apiClient.get<Position[]>("/positions"),
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const usersList = (data as UserRow[] | undefined) ?? [];
  const positionsList = (positions as Position[] | undefined) ?? [];

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        !search ||
        (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.department ?? "").toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase());

      const matchRole =
        roleFilter === "all" || (u.roles && u.roles.includes(roleFilter));

      return matchSearch && matchRole;
    });
  }, [usersList, search, roleFilter]);

  return (
    <AdminGuard>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
              Admin & Governance
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
              <Users className="h-8 w-8 text-primary" /> Users Directory
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Onboard users, assign roles and fine-grained permissions, reset passwords.
            </p>
          </div>
          <CreateUserDialog positions={positionsList} allUsers={usersList} />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, department, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All System Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    Role: {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users List Container */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-5 py-3 border-b border-border text-xs font-mono font-medium text-muted-foreground flex justify-between items-center">
            <span>SHOWING {filteredUsers.length} OF {usersList.length} REGISTERED ACCOUNTS</span>
          </div>

          {isLoading && (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading user profiles...
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No matching user profiles found.
            </div>
          )}

          {filteredUsers.map((u) => (
            <UserRowItem
              key={u.id}
              user={u}
              positions={positionsList}
              allUsers={usersList}
            />
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}

function CreateUserDialog({ positions, allUsers }: { positions: Position[]; allUsers: UserRow[] }) {
  const qc = useQueryClient();
  const create = useServerFn(createUser);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [positionId, setPositionId] = useState<string>("none");
  const [managerId, setManagerId] = useState<string>("none");
  const [roles, setRoles] = useState<Role[]>(["mr"]);
  const [perms, setPerms] = useState<Permission[]>([]);

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          email,
          password,
          full_name: fullName,
          department: department || null,
          position_id: positionId === "none" ? null : positionId,
          manager_id: managerId === "none" ? null : managerId,
          roles,
          permissions: perms,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`User "${fullName}" successfully onboarded`);
      setOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
      setPositionId("none");
      setManagerId("none");
      setRoles(["mr"]);
      setPerms([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Onboard User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Onboard a New System User</DialogTitle>
          <DialogDescription>
            Configure initial user credentials, department position, hierarchy manager, system roles, and fine-grained permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. Dr. Rajesh Khanna"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                placeholder="e.g. Regional Sales"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Official Email *</Label>
              <Input
                type="email"
                placeholder="rajesh@momentumpharma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Password *</Label>
              <Input
                type="text"
                minLength={8}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Position Title</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reporting Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None (Top Tier) —</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.id} ({u.roles.join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <RolesPicker value={roles} onChange={setRoles} />
          <PermissionsPicker value={perms} onChange={setPerms} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!email || !password || !fullName || mut.isPending}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesPicker({ value, onChange }: { value: Role[]; onChange: (v: Role[]) => void }) {
  const options = ROLES.filter((r) => r !== "super_admin");
  return (
    <div className="space-y-2.5">
      <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
        Assigned System Roles
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((r) => {
          const checked = value.includes(r as Role);
          return (
            <label
              key={r}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                checked
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border/60 hover:bg-muted/30 text-foreground"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(c) =>
                  onChange(c ? [...value, r as Role] : value.filter((x) => x !== r))
                }
              />
              {r}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PermissionsPicker({
  value,
  onChange,
}: {
  value: Permission[];
  onChange: (v: Permission[]) => void;
}) {
  return (
    <div className="space-y-4 pt-2">
      <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
        Fine-Grained Explicit Permissions
      </Label>
      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{group.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.permissions.map((p) => {
                  const checked = value.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                        checked ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          onChange(c ? [...value, p.key] : value.filter((x) => x !== p.key))
                        }
                      />
                      <span className="font-mono text-[11px] truncate">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserRowItem({
  user,
  positions,
  allUsers,
}: {
  user: UserRow;
  positions: Position[];
  allUsers: UserRow[];
}) {
  const qc = useQueryClient();
  const setRoles = useServerFn(setUserRoles);
  const setPerms = useServerFn(setUserPermissions);
  const updateProf = useServerFn(updateUserProfile);
  const resetPw = useServerFn(resetUserPassword);
  const del = useServerFn(deleteUser);

  const [manageOpen, setManageOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [rolesDraft, setRolesDraft] = useState<Role[]>(
    user.roles.filter((r) => r !== "super_admin") as Role[],
  );
  const [permsDraft, setPermsDraft] = useState<Permission[]>(user.permissions as Permission[]);
  const [posDraft, setPosDraft] = useState<string>(user.position_id ?? "none");
  const [mgrDraft, setMgrDraft] = useState<string>(user.manager_id ?? "none");
  const [deptDraft, setDeptDraft] = useState<string>(user.department ?? "");

  const initials = (user.full_name ?? "?").slice(0, 2).toUpperCase();
  const isSuper = user.is_super_admin;
  const position = positions.find((p) => p.id === user.position_id);
  const manager = allUsers.find((u) => u.id === user.manager_id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const saveMut = useMutation({
    mutationFn: async () => {
      await setRoles({ data: { user_id: user.id, roles: rolesDraft } });
      await setPerms({ data: { user_id: user.id, permissions: permsDraft } });
      await updateProf({
        data: {
          user_id: user.id,
          department: deptDraft || null,
          position_id: posDraft === "none" ? null : posDraft,
          manager_id: mgrDraft === "none" ? null : mgrDraft,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(`User profile updated for ${user.full_name}`);
      setManageOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (v: boolean) => updateProf({ data: { user_id: user.id, is_active: v } }),
    onSuccess: (_, v) => {
      invalidate();
      toast.success(v ? `Activated ${user.full_name}` : `Deactivated ${user.full_name}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: () => resetPw({ data: { user_id: user.id, new_password: newPw } }),
    onSuccess: () => {
      toast.success(`Password reset successfully for ${user.full_name}`);
      setPwOpen(false);
      setNewPw("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: () => del({ data: { user_id: user.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("User deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border/50 px-5 py-4 last:border-0 hover:bg-muted/20 transition-colors">
      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={user.avatar_url ?? undefined} />
        <AvatarFallback className="font-semibold text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">{user.full_name ?? "Unnamed User"}</span>
          {isSuper && (
            <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 text-[10px]">
              <Lock className="h-2.5 w-2.5" /> Reserved Super Admin
            </Badge>
          )}
          {!user.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="font-mono">{user.email ?? user.id}</span>
          <span>·</span>
          <span>{position?.title ?? "No Position"}</span>
          {user.department && (
            <>
              <span>·</span>
              <span>{user.department}</span>
            </>
          )}
          {manager && (
            <>
              <span>·</span>
              <span className="text-primary/90 font-medium">Mgr: {manager.full_name || manager.id}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {user.roles.map((r) => (
            <Badge
              key={r}
              variant={r === "super_admin" || r === "admin" ? "default" : "outline"}
              className="gap-1 text-[10px] uppercase font-mono px-1.5 py-0"
            >
              {(r === "super_admin" || r === "admin") && <ShieldCheck className="h-2.5 w-2.5" />}
              {r}
            </Badge>
          ))}
          {user.permissions.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Active</span>
          <Switch
            checked={user.is_active}
            disabled={isSuper}
            onCheckedChange={(v) => activeMut.mutate(v)}
          />
        </div>

        {/* Manage Roles & Fine-Grained Permissions Dialog */}
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isSuper} className="h-8 gap-1 text-xs">
              <UserCog className="h-3.5 w-3.5" />
              <span>Roles & Perms</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Manage Roles & Permissions: {user.full_name}</DialogTitle>
              <DialogDescription>
                Update hierarchy position, reporting manager, assigned system roles, and fine-grained permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Position Title</Label>
                  <Select value={posDraft} onValueChange={setPosDraft}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reporting Manager</Label>
                  <Select value={mgrDraft} onValueChange={setMgrDraft}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None (Top Tier) —</SelectItem>
                      {allUsers
                        .filter((u) => u.id !== user.id)
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.id} ({u.roles.join(", ")})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input
                  value={deptDraft}
                  onChange={(e) => setDeptDraft(e.target.value)}
                  placeholder="e.g. Field Operations"
                />
              </div>

              <RolesPicker value={rolesDraft} onChange={setRolesDraft} />
              <PermissionsPicker value={permsDraft} onChange={setPermsDraft} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isSuper} className="h-8 gap-1 text-xs">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Reset Password</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset User Password</DialogTitle>
              <DialogDescription>
                Specify a new password for <span className="font-semibold text-foreground">{user.full_name}</span> ({user.email}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label>New Password *</Label>
              <Input
                type="text"
                minLength={8}
                placeholder="Enter at least 8 characters..."
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                The user will be required to sign in with this new password.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => pwMut.mutate()} disabled={newPw.length < 8 || pwMut.isPending}>
                {pwMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Button */}
        <Button
          variant="ghost"
          size="sm"
          disabled={isSuper}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm(`Are you sure you want to delete user "${user.full_name}"? This action cannot be undone.`)) {
              delMut.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
