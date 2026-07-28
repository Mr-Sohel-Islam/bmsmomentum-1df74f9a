import { useState, useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [openCommandPalette, setOpenCommandPalette] = useState(false);

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

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                MOMENTUM · Admin
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              {/* Real-time Notification Center Bell & Sidebar */}
              <NotificationCenter />
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
