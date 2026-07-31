import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Briefcase, Plus, Calendar, Stethoscope, Store, Building2, Truck, DollarSign, Award, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { listDailyReports, createDailyReport, DailyReportRecord } from "@/lib/pharma.functions";

export const Route = createFileRoute("/_authenticated/workstation")({
  head: () => ({
    meta: [
      { title: "Employee Workstation & Daily Reporting · MOMENTUM" },
      { name: "description", content: "Submit daily activity logs, doctor/chemist visits, billing, payments, and achievements." },
    ],
  }),
  component: WorkstationPage,
});

function WorkstationPage() {
  const qc = useQueryClient();
  const fetchReports = useServerFn(listDailyReports);
  const addReport = useServerFn(createDailyReport);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);

  // Form state
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [docVisits, setDocVisits] = useState("0");
  const [chemistVisits, setChemistVisits] = useState("0");
  const [wholesaleVisits, setWholesaleVisits] = useState("0");
  const [distributorVisits, setDistributorVisits] = useState("0");
  const [billing, setBilling] = useState("0");
  const [payment, setPayment] = useState("0");
  const [offers, setOffers] = useState("");
  const [achievements, setAchievements] = useState("");
  const [notes, setNotes] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["daily-reports", dateFrom, dateTo],
    queryFn: () => fetchReports({ data: { date_from: dateFrom || undefined, date_to: dateTo || undefined } }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      addReport({
        data: {
          report_date: reportDate,
          doctor_visits_count: Number(docVisits) || 0,
          chemist_visits_count: Number(chemistVisits) || 0,
          wholesale_visits_count: Number(wholesaleVisits) || 0,
          distributor_visits_count: Number(distributorVisits) || 0,
          billing_amount: Number(billing) || 0,
          payment_amount: Number(payment) || 0,
          offers_distributed: offers || null,
          special_achievements: achievements || null,
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-reports"] });
      toast.success("Daily Workstation Activity Report submitted successfully");
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to submit report"),
  });

  function resetForm() {
    setDocVisits("0");
    setChemistVisits("0");
    setWholesaleVisits("0");
    setDistributorVisits("0");
    setBilling("0");
    setPayment("0");
    setOffers("");
    setAchievements("");
    setNotes("");
  }

  // Calculate Aggregates
  const totalDocVisits = reports.reduce((acc, r) => acc + (r.doctor_visits_count || 0), 0);
  const totalChemistVisits = reports.reduce((acc, r) => acc + (r.chemist_visits_count || 0), 0);
  const totalWholesaleVisits = reports.reduce((acc, r) => acc + (r.wholesale_visits_count || 0), 0);
  const totalDistributorVisits = reports.reduce((acc, r) => acc + (r.distributor_visits_count || 0), 0);
  const totalBilling = reports.reduce((acc, r) => acc + Number(r.billing_amount || 0), 0);
  const totalPayment = reports.reduce((acc, r) => acc + Number(r.payment_amount || 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Field Operations Workstation</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <Briefcase className="h-7 w-7 text-primary" /> Employee Workstation & Reporting
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log daily field activities, track doctor/chemist visits, collections, billing, and special achievements.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Submit Daily Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Daily Activity & Performance Entry
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1.5">
                <Label>Report Date *</Label>
                <Input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Doctor Visits Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={docVisits}
                    onChange={(e) => setDocVisits(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chemist Visits Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={chemistVisits}
                    onChange={(e) => setChemistVisits(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Wholesale Visits Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={wholesaleVisits}
                    onChange={(e) => setWholesaleVisits(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Distributor Visits Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={distributorVisits}
                    onChange={(e) => setDistributorVisits(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Billing Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billing}
                    onChange={(e) => setBilling(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Collection (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Offers / Samples Distributed</Label>
                <Input
                  placeholder="e.g. 5 boxes of MOMENTUM-CV 625 samples & Doctor Pen Sets"
                  value={offers}
                  onChange={(e) => setOffers(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Special Achievements / Major Conversions</Label>
                <Textarea
                  placeholder="e.g. Converted Dr. Swaminathan for monthly 100-strip commitment..."
                  value={achievements}
                  onChange={(e) => setAchievements(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Additional Field Notes</Label>
                <Input
                  placeholder="Any additional remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Submitting..." : "Submit Activity Log"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Stethoscope className="h-4 w-4 text-blue-500" /> Total Doctor Visits
          </div>
          <div className="mt-2 text-2xl font-bold">{totalDocVisits}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Store className="h-4 w-4 text-emerald-500" /> Total Chemist Visits
          </div>
          <div className="mt-2 text-2xl font-bold">{totalChemistVisits}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <DollarSign className="h-4 w-4 text-amber-500" /> Total Billing Value
          </div>
          <div className="mt-2 text-2xl font-bold">₹{totalBilling.toLocaleString("en-IN")}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Total Collections
          </div>
          <div className="mt-2 text-2xl font-bold">₹{totalPayment.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <span className="text-xs font-semibold text-muted-foreground">Filter Date Range:</span>
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-4 w-4 text-primary" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs" />
          <span>to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
      </div>

      {/* Daily Reports List */}
      <div className="space-y-4">
        {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading workstation activity logs...</div>}
        {!isLoading && reports.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No workstation reports submitted for this period.
          </div>
        )}
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">{r.user_name || r.user_id}</h3>
                <p className="text-xs text-muted-foreground">Report Date: <strong>{r.report_date}</strong></p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs text-amber-600">
                  Billing: ₹{Number(r.billing_amount).toLocaleString("en-IN")}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs text-emerald-600">
                  Payment: ₹{Number(r.payment_amount).toLocaleString("en-IN")}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                <Stethoscope className="h-4 w-4 text-blue-500" />
                <span>Doctor Visits: <strong>{r.doctor_visits_count}</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                <Store className="h-4 w-4 text-emerald-500" />
                <span>Chemist Visits: <strong>{r.chemist_visits_count}</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                <Building2 className="h-4 w-4 text-purple-500" />
                <span>Wholesale Visits: <strong>{r.wholesale_visits_count}</strong></span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5">
                <Truck className="h-4 w-4 text-amber-500" />
                <span>Distributor Visits: <strong>{r.distributor_visits_count}</strong></span>
              </div>
            </div>

            {r.special_achievements && (
              <div className="flex items-start gap-2 rounded-md border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-600 dark:text-indigo-400">
                <Award className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <span className="font-bold">Special Achievements / Major Conversion: </span>
                  {r.special_achievements}
                </div>
              </div>
            )}

            {r.offers_distributed && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Offers & Samples Distributed: </span>
                {r.offers_distributed}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
