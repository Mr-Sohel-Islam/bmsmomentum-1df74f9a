import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { bootstrapSuperAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MOMENTUM" },
      { name: "description", content: "Sign in to your MOMENTUM performance workspace." },
      { property: "og:title", content: "Sign in — MOMENTUM" },
      { property: "og:description", content: "Access your MOMENTUM performance dashboard." },
    ],
  }),
  component: AuthPage,
});

const SUPER_ADMIN_EMAIL = "soheljavadeveloper@gmail.com";
const SUPER_ADMIN_PASSWORD = "Sohel@34892";

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const bootstrap = useServerFn(bootstrapSuperAdmin);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // If reserved super admin — ensure the account exists first (idempotent)
      if (email.trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
        try {
          await bootstrap({ data: { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD } });
        } catch {
          /* ignore — account probably exists */
        }
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r border-border/60 lg:block">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.75} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">MOMENTUM</span>
          </Link>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Performance is a<br />
              <span className="text-gradient-primary">team sport.</span>
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Track metrics, recognize contributions, and roll it up to leadership — all in one
              operational surface.
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} MOMENTUM
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" strokeWidth={2.75} />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">MOMENTUM</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access to MOMENTUM is by invitation. Contact your administrator for an account.
          </p>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Public sign-up is disabled. Admins onboard new users from the Users page.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
