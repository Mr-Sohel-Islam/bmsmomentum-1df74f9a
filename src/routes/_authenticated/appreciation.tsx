import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MessageSquareHeart, Send, Trophy } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAppreciations, sendAppreciation, leaderboard } from "@/lib/performance.functions";
import { listUsers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/appreciation")({
  head: () => ({
    meta: [
      { title: "Appreciation · MOMENTUM" },
      { name: "description", content: "Give and receive kudos across the team." },
    ],
  }),
  component: AppreciationPage,
});

type FeedItem = {
  id: string;
  from_user: string;
  to_user: string;
  message: string;
  points: number;
  created_at: string;
  from: { id: string; full_name: string | null; avatar_url: string | null };
  to: { id: string; full_name: string | null; avatar_url: string | null };
};

function AppreciationPage() {
  const feedFn = useServerFn(listAppreciations);
  const boardFn = useServerFn(leaderboard);
  const usersFn = useServerFn(listUsers);

  const { data: feed, isLoading } = useQuery({
    queryKey: ["appreciations"],
    queryFn: () => feedFn(),
  });
  const { data: board } = useQuery({ queryKey: ["leaderboard"], queryFn: () => boardFn() });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersFn() });

  const items = (feed?.items ?? []) as FeedItem[];
  const me = feed?.me;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Workspace</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <MessageSquareHeart className="h-7 w-7 text-primary" /> Appreciation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recognize peers, managers, or reports. Points feed the leaderboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SendForm users={(users ?? []).filter((u: { id: string }) => u.id !== me)} />

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border/60 px-5 py-3">
              <h3 className="font-semibold">Recent</h3>
            </div>
            {isLoading && (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!isLoading && items.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No appreciations yet. Send the first one above.
              </div>
            )}
            {items.map((a) => (
              <FeedRow key={a.id} item={a} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Leaderboard</h3>
            </div>
            {(!board || board.length === 0) && (
              <div className="p-6 text-center text-sm text-muted-foreground">No points yet.</div>
            )}
            {(board ?? []).map((row, i) => (
              <div
                key={row.user_id}
                className="flex items-center gap-3 border-b border-border/40 px-5 py-3 last:border-0"
              >
                <div className="w-5 text-right font-mono text-xs text-muted-foreground">
                  {i + 1}
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={row.avatar_url ?? undefined} />
                  <AvatarFallback>{(row.full_name ?? "?").slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 truncate text-sm">{row.full_name ?? "Unknown"}</div>
                <div className="font-mono text-sm font-semibold text-primary">{row.points}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/40 px-5 py-4 last:border-0">
      <Avatar className="h-9 w-9">
        <AvatarImage src={item.from.avatar_url ?? undefined} />
        <AvatarFallback>{(item.from.full_name ?? "?").slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
          <span className="font-medium">{item.from.full_name ?? "Unknown"}</span>
          <span className="text-muted-foreground">appreciated</span>
          <span className="font-medium">{item.to.full_name ?? "Unknown"}</span>
          <Badge variant="secondary" className="ml-1 font-mono text-[10px]">
            +{item.points}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground/90">{item.message}</p>
      </div>
    </div>
  );
}

function SendForm({ users }: { users: Array<{ id: string; full_name: string | null }> }) {
  const [toUser, setToUser] = useState<string>("");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState("5");
  const qc = useQueryClient();
  const send = useServerFn(sendAppreciation);

  const mut = useMutation({
    mutationFn: () => send({ data: { to_user: toUser, message, points: Number(points) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appreciations"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Appreciation sent");
      setMessage("");
      setToUser("");
      setPoints("5");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="font-semibold">Send appreciation</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_100px]">
        <div className="space-y-2">
          <Label>To</Label>
          <Select value={toUser} onValueChange={setToUser}>
            <SelectTrigger>
              <SelectValue placeholder="Select a teammate" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name ?? u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Points</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Label>Message</Label>
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nailed the launch handoff — clean docs and zero surprises."
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={!toUser || !message || mut.isPending}>
          <Send className="h-4 w-4" />
          {mut.isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
