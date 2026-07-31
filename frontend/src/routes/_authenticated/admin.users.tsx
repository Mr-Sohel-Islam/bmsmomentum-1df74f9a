import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Users, ShieldCheck, Plus, KeyRound, Trash2, Loader2, Lock, UserCog } from "lucide-react";
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
  listUsers,
  createUser,
  setUserRoles,
  setUserPermissions,
  resetUserPassword,
  updateUserProfile,
  deleteUser,
  listPositions,
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "@/lib/admin.functions";

import { AdminGuard } from "@/components/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Users · MOMENTUM" },
      { name: "description", content: "Create users, assign roles, and manage permissions." },
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

function UsersPage() {
  const list = useServerFn(listUsers);
  const listPos = useServerFn(listPositions);
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => list() });
  const { data: positions } = useQuery({ queryKey: ["positions"], queryFn: () => listPos() });

  return (
    <AdminGuard>
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Users className="h-7 w-7 text-primary" /> Users
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard users, assign roles and fine-grained permissions, reset passwords.
          </p>
        </div>
        <CreateUserDialog positions={(positions as Position[] | undefined) ?? []} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {(data as UserRow[] | undefined)?.map((u) => (
          <UserRowItem
            key={u.id}
            user={u}
            positions={(positions as Position[] | undefined) ?? []}
          />
        ))}
        {!isLoading && (!data || (data as UserRow[]).length === 0) && (
          <div className="p-10 text-center text-sm text-muted-foreground">No users yet.</div>
        )}
      </div>
    </div>
  </AdminGuard>
  );
}

function CreateUserDialog({ positions }: { positions: Position[] }) {
  const qc = useQueryClient();
  const create = useServerFn(createUser);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [positionId, setPositionId] = useState<string>("none");
  const [roles, setRoles] = useState<Role[]>(["member"]);
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
          manager_id: null,
          roles,
          permissions: perms,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
      setOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
      setPositionId("none");
      setRoles(["member"]);
      setPerms([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> Onboard user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onboard a new user</DialogTitle>
          <DialogDescription>
            You set the initial credentials. They can change their password later from Account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Initial password</Label>
            <Input
              type="text"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
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
          <RolesPicker value={roles} onChange={setRoles} />
          <PermissionsPicker value={perms} onChange={setPerms} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => mut.mutate()}
            disabled={!email || !password || !fullName || mut.isPending}
          >
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RolesPicker({ value, onChange }: { value: Role[]; onChange: (v: Role[]) => void }) {
  const options = ROLES.filter((r) => r !== "super_admin");
  return (
    <div className="space-y-2">
      <Label>Roles</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((r) => (
          <label
            key={r}
            className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
          >
            <Checkbox
              checked={value.includes(r as Role)}
              onCheckedChange={(c) =>
                onChange(c ? [...value, r as Role] : value.filter((x) => x !== r))
              }
            />
            {r}
          </label>
        ))}
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
    <div className="space-y-2">
      <Label>Permissions</Label>
      <div className="grid grid-cols-1 gap-2">
        {PERMISSIONS.map((p) => (
          <label
            key={p}
            className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
          >
            <Checkbox
              checked={value.includes(p)}
              onCheckedChange={(c) => onChange(c ? [...value, p] : value.filter((x) => x !== p))}
            />
            <span className="font-mono text-xs">{p}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function UserRowItem({ user, positions }: { user: UserRow; positions: Position[] }) {
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

  const initials = (user.full_name ?? "?").slice(0, 2).toUpperCase();
  const isSuper = user.is_super_admin;
  const position = positions.find((p) => p.id === user.position_id);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const saveMut = useMutation({
    mutationFn: async () => {
      await setRoles({ data: { user_id: user.id, roles: rolesDraft } });
      await setPerms({ data: { user_id: user.id, permissions: permsDraft } });
      await updateProf({
        data: {
          user_id: user.id,
          position_id: posDraft === "none" ? null : posDraft,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
      setManageOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (v: boolean) => updateProf({ data: { user_id: user.id, is_active: v } }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: () => resetPw({ data: { user_id: user.id, new_password: newPw } }),
    onSuccess: () => {
      toast.success("Password reset");
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
    <div className="flex flex-wrap items-center gap-4 border-b border-border/40 px-5 py-4 last:border-0">
      <Avatar>
        <AvatarImage src={user.avatar_url ?? undefined} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{user.full_name ?? "Unnamed"}</span>
          {isSuper && (
            <Badge className="gap-1">
              <Lock className="h-3 w-3" /> Super admin
            </Badge>
          )}
          {!user.is_active && <Badge variant="secondary">Inactive</Badge>}
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {user.email ?? "—"} · {position?.title ?? "no position"}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <Badge
              key={r}
              variant={r === "super_admin" ? "default" : "outline"}
              className="gap-1 text-[10px]"
            >
              {r === "super_admin" && <ShieldCheck className="h-2.5 w-2.5" />}
              {r}
            </Badge>
          ))}
          {user.permissions.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] font-mono">
              {p}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Active</span>
          <Switch
            checked={user.is_active}
            disabled={isSuper}
            onCheckedChange={(v) => activeMut.mutate(v)}
          />
        </div>

        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isSuper}>
              <UserCog className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage {user.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Position</Label>
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
              <RolesPicker value={rolesDraft} onChange={setRolesDraft} />
              <PermissionsPicker value={permsDraft} onChange={setPermsDraft} />
            </div>
            <DialogFooter>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isSuper}>
              <KeyRound className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                Set a new password for {user.full_name}. Share it with them securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="text"
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => pwMut.mutate()} disabled={newPw.length < 8 || pwMut.isPending}>
                {pwMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="ghost"
          size="sm"
          disabled={isSuper}
          onClick={() => {
            if (confirm(`Delete ${user.full_name}? This cannot be undone.`)) delMut.mutate();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
