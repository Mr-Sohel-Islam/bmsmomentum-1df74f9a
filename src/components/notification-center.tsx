import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

export interface NotificationItem {
  id: string;
  type: "assignment" | "mention" | "status_change";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  taskId?: string;
  teamName?: string;
  authorName?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    type: "assignment",
    title: "New Task Assignment",
    message: "Sarah Connor assigned you to 'Implement OAuth 2.0 PKCE Flow'",
    timestamp: "10 mins ago",
    read: false,
    taskId: "task-1",
    authorName: "Sarah Connor",
  },
  {
    id: "notif-2",
    type: "mention",
    title: "Mentioned in Comment",
    message: "Alex Rivera mentioned you: '@admin please review the API specs for team metrics'",
    timestamp: "1 hour ago",
    read: false,
    taskId: "task-2",
    authorName: "Alex Rivera",
  },
  {
    id: "notif-3",
    type: "status_change",
    title: "Task Status Updated",
    message: "Core Platform Team: 'Database Index Optimization' changed status to Completed",
    timestamp: "2 hours ago",
    read: true,
    teamName: "Core Platform",
    authorName: "Database Bot",
  },
  {
    id: "notif-4",
    type: "assignment",
    title: "Task Reassigned",
    message: "You were assigned to 'Setup CI/CD Pipeline for Docker Deployments'",
    timestamp: "Yesterday",
    read: true,
    taskId: "task-3",
    authorName: "DevOps Team",
  },
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<
    "all" | "unread" | "assignment" | "mention" | "status_change"
  >("all");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Setup real-time listener for tasks & team events
  useEffect(() => {
    const channel = supabase
      .channel("realtime-team-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        const newNotif: NotificationItem = {
          id: `notif-${Date.now()}`,
          type: "status_change",
          title: "Real-time Task Update",
          message: `Task status updated in real-time by team member.`,
          timestamp: "Just now",
          read: false,
        };

        setNotifications((prev) => [newNotif, ...prev]);
        toast.info(newNotif.title, {
          description: newNotif.message,
          icon: <Bell className="h-4 w-4 text-primary" />,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success("Cleared all notifications");
  };

  const toggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    setIsOpen(false);
    navigate({ to: "/tasks" });
  };

  // Quick Action: Simulate an incoming alert
  const simulateIncomingAlert = () => {
    const types: ("assignment" | "mention" | "status_change")[] = [
      "assignment",
      "mention",
      "status_change",
    ];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let alertTitle = "New Alert";
    let alertMsg = "An update occurred in your workspace.";

    if (chosenType === "assignment") {
      alertTitle = "Task Assigned";
      alertMsg = "You were assigned to 'Security Audit & RBAC Validation'";
    } else if (chosenType === "mention") {
      alertTitle = "Mentioned in Discussion";
      alertMsg = "Taylor Reed mentioned you: '@admin can you approve PR #104?'";
    } else {
      alertTitle = "Status Changed";
      alertMsg = "Frontend Team: Task 'Burn-down Recharts Widget' moved to Done";
    }

    const simulated: NotificationItem = {
      id: `sim-${Date.now()}`,
      type: chosenType,
      title: alertTitle,
      message: alertMsg,
      timestamp: "Just now",
      read: false,
      authorName: "System Realtime",
    };

    setNotifications((prev) => [simulated, ...prev]);
    toast.success(`⚡ Real-time Alert: ${alertTitle}`, {
      description: alertMsg,
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter !== "all") return n.type === filter;
    return true;
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8.5 w-8.5 rounded-lg border-border/80 bg-background/80 shadow-xs hover:text-foreground"
        >
          <Bell className="h-4 w-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-l border-border">
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] px-2 py-0.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={simulateIncomingAlert}
                className="h-7 text-[11px] text-muted-foreground hover:text-primary gap-1 px-2"
                title="Simulate incoming real-time notification"
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="hidden sm:inline">Test Alert</span>
              </Button>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            Real-time updates for assignments, mentions, and team status updates.
          </SheetDescription>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="h-7 text-[11px] gap-1 px-2 text-muted-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={notifications.length === 0}
              className="h-7 text-[11px] gap-1 px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3 w-3" /> Clear list
            </Button>
          </div>
        </SheetHeader>

        {/* Filter Tabs */}
        <div className="px-4 py-2 border-b border-border/60 bg-muted/20">
          <Tabs
            value={filter}
            onValueChange={(v) =>
              setFilter(v as "all" | "unread" | "assignment" | "mention" | "status_change")
            }
          >
            <TabsList className="grid w-full grid-cols-5 text-[10px] h-7 p-0.5">
              <TabsTrigger value="all" className="text-[10px] py-0.5 px-1">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-[10px] py-0.5 px-1">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="assignment" className="text-[10px] py-0.5 px-1">
                Assigned
              </TabsTrigger>
              <TabsTrigger value="mention" className="text-[10px] py-0.5 px-1">
                Mentions
              </TabsTrigger>
              <TabsTrigger value="status_change" className="text-[10px] py-0.5 px-1">
                Status
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notifications Scroll List */}
        <ScrollArea className="flex-1 px-4 py-3">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Bell className="h-8 w-8 mx-auto stroke-1 text-muted-foreground/50" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground/80">
                You're all caught up! Real-time alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
                    notif.read
                      ? "border-border/50 bg-card/60 opacity-80 hover:bg-card hover:opacity-100"
                      : "border-primary/40 bg-primary/5 shadow-2xs hover:bg-primary/10"
                  }`}
                >
                  {/* Icon Indicator */}
                  <div className="mt-0.5 shrink-0">
                    {notif.type === "assignment" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                        <UserPlus className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {notif.type === "mention" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {notif.type === "status_change" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                      <span className="truncate">
                        {notif.authorName && `By ${notif.authorName}`}
                      </span>

                      <button
                        onClick={(e) => toggleRead(notif.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground underline"
                      >
                        {notif.read ? "Mark unread" : "Mark read"}
                      </button>
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.read && (
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
