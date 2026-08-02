import { useState, useEffect } from "react";
import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { Search, Sparkles, UserCircle, LogOut, User } from "lucide-react";
import { getAuthToken, setAuthToken } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const token = getAuthToken();
    if (!token) throw redirect({ to: "/auth" });
    return { user: { id: "authenticated-user" } };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meData } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiClient.get<any>("/auth/me").catch(() => null),
  });

  const currentUser = meData?.user;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenCommandPalette((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    setAuthToken(null);
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                MOMENTUM · Field Operations
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 3D Product Detailing Shortcut Button in Top Bar */}
              <Link to="/detailing">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 h-8.5 px-3 text-xs font-semibold text-purple-400 hover:text-purple-300 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 shadow-xs transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">3D Detailing</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenCommandPalette(true)}
                className="flex items-center gap-2 h-8.5 px-3 text-xs text-muted-foreground hover:text-foreground border-border/80 bg-background/80 shadow-xs"
              >
                <Search className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Search hierarchy...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-[10px]">⌘</span>K
                </kbd>
              </Button>

              {/* Theme Toggle: Dark Mode (Signal Green) vs Light Mode (Soft Pink, Pale Green, Sunny Yellow) */}
              <ThemeToggle />

              {/* Real-time Notification Center Bell & Sidebar */}
              <NotificationCenter />

              {/* Account Section & Logout Dropdown Menu in Top Bar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 h-8.5 px-2 rounded-full border border-border/80 bg-muted/50 hover:bg-muted"
                  >
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="Avatar" className="h-6 w-6 rounded-full" />
                    ) : (
                      <UserCircle className="h-5 w-5 text-foreground" />
                    )}
                    <span className="hidden lg:inline text-xs font-medium text-foreground max-w-[130px] truncate">
                      {currentUser?.full_name || "Account Profile"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-bold leading-none text-foreground">
                        {currentUser?.full_name || "Authenticated User"}
                      </p>
                      <p className="text-xs leading-none text-primary font-medium mt-0.5">
                        {currentUser?.designation || currentUser?.department || "MOMENTUM Pyramid"}
                      </p>
                      <p className="text-[11px] leading-none text-muted-foreground font-mono truncate mt-1">
                        {currentUser?.email || currentUser?.official_email || "Active Session"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/account" className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4 text-primary" />
                      <span>My Account Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </SidebarProvider>
  );
}
