import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserCircle, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getMyProfile, changeMyPassword } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account · MOMENTUM" },
      { name: "description", content: "Manage your MOMENTUM account and password." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const fetchMe = useServerFn(getMyProfile);
  const changePw = useServerFn(changeMyPassword);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw1 !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await changePw({ data: { new_password: pw1 } });
      toast.success("Password updated");
      setPw1("");
      setPw2("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Workspace</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <UserCircle className="h-7 w-7 text-primary" /> Account
        </h1>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Identity
        </h2>
        {isLoading && <Loader2 className="mt-4 h-4 w-4 animate-spin" />}
        {data && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="font-medium">{data.profile?.full_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">User ID</div>
              <div className="font-mono text-xs">{data.userId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Roles</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {data.roles.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
                {data.roles.map((r: string) => (
                  <Badge
                    key={r}
                    variant={r === "super_admin" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {r === "super_admin" && <ShieldCheck className="h-3 w-3" />}
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Permissions</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {data.permissions.length === 0 && (
                  <span className="text-xs text-muted-foreground">Inherited from role</span>
                )}
                {data.permissions.map((p: string) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <KeyRound className="h-4 w-4" /> Change password
        </h2>
        <form onSubmit={submit} className="mt-4 max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input
              id="np"
              type="password"
              minLength={8}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np2">Confirm</Label>
            <Input
              id="np2"
              type="password"
              minLength={8}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </section>
    </div>
  );
}
