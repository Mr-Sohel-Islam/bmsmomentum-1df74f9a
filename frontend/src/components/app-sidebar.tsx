import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  LayoutDashboard,
  Gauge,
  MessageSquareHeart,
  FileText,
  Radio,
  LogOut,
  Users,
  TrendingUp,
  UserCircle,
  Network,
  CheckSquare,
  Inbox,
  GitBranch,
  ShieldCheck,
  Package,
  Stethoscope,
  Store,
  Briefcase,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { setAuthToken } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMyAccess } from "@/hooks/use-my-access";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permissions: [] },
  { title: "Workstation Activity", url: "/workstation", icon: Briefcase, permissions: ["reports:read"] },
  { title: "Products", url: "/products", icon: Package, permissions: ["products:read"] },
  { title: "Tasks & Backlog", url: "/tasks", icon: CheckSquare, permissions: ["tasks:read"] },
  { title: "My Performance", url: "/performance", icon: TrendingUp, permissions: ["performance:read"] },
  { title: "Appreciation", url: "/appreciation", icon: MessageSquareHeart, permissions: ["performance:read"] },
  { title: "Approvals", url: "/approvals", icon: Inbox, permissions: ["approvals:read"] },
];

const admin = [
  { title: "Users", url: "/admin/users", icon: Users, permissions: ["users:manage", "users:read"] },
  { title: "Teams & Governance", url: "/admin/team", icon: ShieldCheck, permissions: ["teams:manage", "teams:read"] },
  { title: "Positions", url: "/admin/positions", icon: Network, permissions: ["teams:manage", "teams:read"] },
  { title: "Metrics", url: "/admin/metrics", icon: Gauge, permissions: ["metrics:manage"] },
  { title: "Flows", url: "/admin/flows", icon: Radio, permissions: ["approvals:manage"] },
  { title: "Approval flows", url: "/admin/approvals", icon: GitBranch, permissions: ["approvals:manage"] },
];

const soon = [{ title: "Reports", icon: FileText }];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, canAny } = useMyAccess();
  const visibleMain = main.filter((item) => item.permissions.length === 0 || canAny(item.permissions));
  const visibleAdmin = admin.filter((item) => isAdmin || canAny(item.permissions));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    setAuthToken(null);
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" strokeWidth={2.75} />
          </div>
          <span className="font-display text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            MOMENTUM
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isAdmin || visibleAdmin.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname.startsWith(item.url)}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                {soon.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton disabled tooltip={item.title} className="opacity-50">
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
