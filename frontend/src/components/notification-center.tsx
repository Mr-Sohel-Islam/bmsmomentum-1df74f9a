import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "@/lib/notification-sound";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_id: string | null;
  read: boolean;
  created_at: string;
}

type Filter = "all" | "unread" | "assignment" | "approval" | "mention";

const TYPE_META: Record<string, { icon: typeof Bell; className: string }> = {
  assignment: { icon: UserPlus, className: "bg-blue-500/10 text-blue-500" },
  mention: { icon: MessageSquare, className: "bg-purple-500/10 text-purple-500" },
  status_change: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-500" },
  approval: { icon: ShieldCheck, className: "bg-amber-500/10 text-amber-500" },
  appreciation: { icon: Sparkles, className: "bg-pink-500/10 text-pink-500" },
  performance: { icon: TrendingUp, className: "bg-primary/10 text-primary" },
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationCenter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    apiClient.get<any>("/auth/me").then((data) => setUserId(data?.user?.id ?? "active-user")).catch(() => setUserId("active-user"));
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      return [] as NotificationItem[];
    },
  });

  // Seed the "already seen" set so the first load never plays a burst of sounds.
  useEffect(() => {
    if (notifications.length && seenIds.current.size === 0) {
      notifications.forEach((n) => seenIds.current.add(n.id));
    }
  }, [notifications]);

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(
    () =>
      notifications.filter((n) => {
        if (filter === "unread") return !n.read;
        if (filter === "all") return true;
        if (filter === "mention") return n.type === "mention" || n.type === "appreciation";
        return n.type === filter;
      }),
    [notifications, filter],
  );

  async function markAllRead() {
    refetch();
  }

  async function clearAll() {
    toast.success("Notifications cleared");
    refetch();
  }

  async function toggleRead(n: NotificationItem, e: React.MouseEvent) {
    e.stopPropagation();
    refetch();
  }

  async function open(n: NotificationItem) {
    setIsOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playNotificationSound();
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          className="relative h-8.5 w-8.5 rounded-lg border-border/80 bg-background/80 shadow-xs hover:text-foreground"
        >
          <Bell className="h-4 w-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex h-full w-full flex-col border-l border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="space-y-2 border-b border-border p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="flex items-center gap-2 text-base font-bold">
                <Bell className="h-4 w-4 text-primary" /> Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="px-2 py-0.5 text-[10px]">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-primary"
              title={soundOn ? "Mute alert sound" : "Enable alert sound"}
            >
              {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{soundOn ? "Sound on" : "Muted"}</span>
            </Button>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Live alerts for assignments, comments, approvals, appreciation and shared reports.
          </SheetDescription>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="h-7 gap-1 px-2 text-[11px] text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" /> Clear list
            </Button>
          </div>
        </SheetHeader>

        <div className="border-b border-border/60 bg-muted/20 px-4 py-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="grid h-7 w-full grid-cols-4 p-0.5 text-[10px]">
              <TabsTrigger value="all" className="px-1 py-0.5 text-[10px]">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="px-1 py-0.5 text-[10px]">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="assignment" className="px-1 py-0.5 text-[10px]">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="approval" className="px-1 py-0.5 text-[10px]">
                Approvals
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="space-y-2 py-12 text-center text-muted-foreground">
              <BellOff className="mx-auto h-8 w-8 stroke-1 text-muted-foreground/50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground/80">
                You're all caught up — new activity lands here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((n) => {
                const meta = TYPE_META[n.type] ?? {
                  icon: Bell,
                  className: "bg-muted text-muted-foreground",
                };
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => void open(n)}
                    className={`group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      n.read
                        ? "border-border/50 bg-card/60 opacity-80 hover:bg-card hover:opacity-100"
                        : "border-primary/40 bg-primary/5 shadow-2xs hover:bg-primary/10"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${meta.className}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {n.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>

                      <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                        <span className="truncate capitalize">{n.type.replace("_", " ")}</span>
                        <button
                          onClick={(e) => void toggleRead(n, e)}
                          className="underline opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        >
                          {n.read ? "Mark unread" : "Mark read"}
                        </button>
                      </div>
                    </div>

                    {!n.read && (
                      <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
