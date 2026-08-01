import { ReactNode } from "react";
import { useMyAccess } from "@/hooks/use-my-access";
import { ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, canAny, isLoading } = useMyAccess();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying access permissions...</p>
      </div>
    );
  }

  const hasAccess = isAdmin || canAny(["users:manage", "users:read", "teams:manage", "teams:read", "all"]);

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have administrative permissions to access this area. This section is restricted to system administrators.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
