import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Sparkles,
  Users,
  ArrowRight,
  Gauge,
  MessageSquareHeart,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOMENTUM — Performance & Recognition Platform" },
      {
        name: "description",
        content:
          "Track team performance with customizable metrics, recognize great work in every direction, and roll it up to leadership with one operational dashboard.",
      },
      { property: "og:title", content: "MOMENTUM — Performance & Recognition Platform" },
      {
        property: "og:description",
        content:
          "Track team performance with customizable metrics, recognize great work in every direction, and roll it up to leadership.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" strokeWidth={2.75} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">MOMENTUM</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#roles"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              For admins
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Role-based performance operations
            </div>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Momentum is <span className="text-gradient-primary">measurable</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Custom metrics. Multi-directional appreciation. Manager reports that roll up cleanly.
              MOMENTUM turns team performance into a single operational surface.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start tracking <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  See what's inside
                </Button>
              </a>
            </div>
          </div>

          {/* Fake dashboard preview */}
          <div className="relative mx-auto mt-20 max-w-5xl">
            <div className="rounded-xl border border-border bg-card/60 p-2 shadow-[var(--shadow-panel)] backdrop-blur">
              <div className="rounded-lg border border-border bg-background/60 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <StatCard label="Team performance" value="87.4" trend="+4.2%" />
                  <StatCard label="Appreciations sent" value="132" trend="+18 this week" />
                  <StatCard label="Reports pending" value="6" trend="Due Friday" muted />
                </div>
                <div className="mt-6 h-40 rounded-md border border-border bg-muted/20 grid-bg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Platform</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Everything performance needs, in one place.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={Gauge}
              title="Custom metrics"
              desc="Define the KPIs that matter to your team, weight them, and track them over any period."
            />
            <Feature
              icon={MessageSquareHeart}
              title="Multi-directional appreciation"
              desc="Peers, managers, and reports can recognize each other. Kudos flow in every direction."
            />
            <Feature
              icon={FileText}
              title="Rollup reports"
              desc="Managers compose period summaries that pull metric snapshots and send them upward."
            />
            <Feature
              icon={BarChart3}
              title="Custom dashboards"
              desc="Pick the widgets that matter — trends, heatmaps, leaderboards — and arrange your view."
            />
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border/60 py-24">
        <div className="mx-auto grid max-w-7xl gap-16 px-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Flow</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              Configured once. Runs on rails.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Admins define roles, metrics, and communication flows. Everyone else just does their
              job — MOMENTUM keeps score.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { n: "01", t: "Set the model", d: "Roles, metrics, weights, reporting cadence." },
              { n: "02", t: "Capture signal", d: "Scores, kudos, and updates land in one feed." },
              { n: "03", t: "Roll it up", d: "Auto-composed reports go to the next level." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4 rounded-lg border border-border bg-card/60 p-5">
                <div className="font-mono text-sm text-primary">{s.n}</div>
                <div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin CTA */}
      <section id="roles" className="border-t border-border/60 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> Admin-first
          </div>
          <h2 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            Built around the person configuring the system.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            MOMENTUM ships with an admin console for roles, metrics, and communication flows.
            Additional roles slot in as your organization grows.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                <Users className="h-4 w-4" /> Create admin account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>MOMENTUM</span>
          </div>
          <div>© {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  muted,
}: {
  label: string;
  value: string;
  trend: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card/70 p-4">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      <div className={`mt-1 text-xs ${muted ? "text-muted-foreground" : "text-primary"}`}>
        {trend}
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-lg border border-border bg-card/60 p-6 transition-colors hover:border-primary/40">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
