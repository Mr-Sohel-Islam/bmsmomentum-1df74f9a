import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Network, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { listPositions, createPosition, deletePosition } from "@/lib/admin.functions";
import { AdminGuard } from "@/components/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/positions")({
  head: () => ({
    meta: [
      { title: "Positions · MOMENTUM" },
      { name: "description", content: "Define organizational positions and hierarchy." },
    ],
  }),
  component: PositionsPage,
});

type Position = {
  id: string;
  title: string;
  level: number;
  parent_position_id: string | null;
};

function PositionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPositions);
  const create = useServerFn(createPosition);
  const remove = useServerFn(deletePosition);
  const { data, isLoading } = useQuery({ queryKey: ["positions"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("0");
  const [parent, setParent] = useState<string>("none");

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          title,
          level: Number(level) || 0,
          parent_position_id: parent === "none" ? null : parent,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Position added");
      setOpen(false);
      setTitle("");
      setLevel("0");
      setParent("none");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Position removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminGuard>
      <div className="mx-auto max-w-4xl space-y-8 p-6 md:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Admin</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Network className="h-7 w-7 text-primary" /> Positions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Define positions and their hierarchy. Lower level number = higher rank.
            </p>
          </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New position</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Regional Manager"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Level (0 = highest)</Label>
                <Input
                  type="number"
                  min={0}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reports to (optional)</Label>
                <Select value={parent} onValueChange={setParent}>
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
            </div>
            <DialogFooter>
              <Button onClick={() => createMut.mutate()} disabled={!title || createMut.isPending}>
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
        {positions.map((p) => {
          const parent = positions.find((x) => x.id === p.parent_position_id);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-border/40 px-5 py-4 last:border-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">L{p.level}</span>
                  <span className="font-medium">{p.title}</span>
                </div>
                {parent && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reports to {parent.title}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => delMut.mutate(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {!isLoading && positions.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No positions yet. Add your first one.
          </div>
        )}
      </div>
    </div>
  </AdminGuard>
  );
}
