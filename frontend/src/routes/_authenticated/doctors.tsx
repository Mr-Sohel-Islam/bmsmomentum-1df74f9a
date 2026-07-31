import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Stethoscope, Plus, Gift, Calendar, Heart, User, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { listDoctors, createDoctor, updateDoctor, DoctorRecord } from "@/lib/pharma.functions";
import { useMyAccess } from "@/hooks/use-my-access";

export const Route = createFileRoute("/_authenticated/doctors")({
  head: () => ({
    meta: [
      { title: "Doctors Management · MOMENTUM" },
      { name: "description", content: "Manage Doctor profiles, special days, gifts, and territory assignments." },
    ],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const qc = useQueryClient();
  const fetchDoctors = useServerFn(listDoctors);
  const addDoc = useServerFn(createDoctor);
  const editDoc = useServerFn(updateDoctor);
  const { isAdmin } = useMyAccess();

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => fetchDoctors(),
  });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [area, setArea] = useState("");
  const [contact, setContact] = useState("");
  const [dob, setDob] = useState("");
  const [spouseDob, setSpouseDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [child1, setChild1] = useState("");
  const [child2, setChild2] = useState("");
  const [child3, setChild3] = useState("");
  const [child4, setChild4] = useState("");
  const [specialDay, setSpecialDay] = useState("");
  const [giftDetails, setGiftDetails] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      addDoc({
        data: {
          name,
          department,
          area_locality: area,
          whatsapp_contact: contact,
          dob: dob || null,
          spouse_dob: spouseDob || null,
          anniversary_date: anniversary || null,
          child_dobs: [child1, child2, child3, child4].filter(Boolean),
          special_day: specialDay || null,
          gift_accepted_details: giftDetails || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      toast.success("Doctor record created successfully");
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save doctor"),
  });

  function resetForm() {
    setName("");
    setDepartment("");
    setArea("");
    setContact("");
    setDob("");
    setSpouseDob("");
    setAnniversary("");
    setChild1("");
    setChild2("");
    setChild3("");
    setChild4("");
    setSpecialDay("");
    setGiftDetails("");
  }

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase()) ||
      d.area_locality.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Healthcare Operations</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <Stethoscope className="h-7 w-7 text-primary" /> Doctors Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register and manage doctor relationships, special days, gift tracking, and territorial access.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Add Doctor Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" /> New Doctor Entry
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate();
              }}
              className="space-y-4 py-2"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name of Doctor *</Label>
                  <Input
                    required
                    placeholder="e.g. Dr. Arvind Swaminathan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Department / Specialty *</Label>
                  <Input
                    required
                    placeholder="e.g. Cardiology"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Area / Locality *</Label>
                  <Input
                    required
                    placeholder="e.g. Connaught Place, New Delhi"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp / Contact No. *</Label>
                  <Input
                    required
                    placeholder="e.g. +91 98100 12345"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Doctor DOB</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Spouse DOB</Label>
                  <Input type="date" value={spouseDob} onChange={(e) => setSpouseDob(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Anniversary Date</Label>
                  <Input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Children DOBs (Up to 4)
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input type="date" placeholder="Child 1 DOB" value={child1} onChange={(e) => setChild1(e.target.value)} />
                  <Input type="date" placeholder="Child 2 DOB" value={child2} onChange={(e) => setChild2(e.target.value)} />
                  <Input type="date" placeholder="Child 3 DOB" value={child3} onChange={(e) => setChild3(e.target.value)} />
                  <Input type="date" placeholder="Child 4 DOB" value={child4} onChange={(e) => setChild4(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Special Day of Doctor</Label>
                <Input
                  placeholder="e.g. Doctor's Day Special (July 1st) / Clinic Anniversary"
                  value={specialDay}
                  onChange={(e) => setSpecialDay(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Promotional Offer or Gift Accepted Details</Label>
                <Input
                  placeholder="e.g. Littmann Stethoscope & Executive Leather Organiser"
                  value={giftDetails}
                  onChange={(e) => setGiftDetails(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Saving..." : "Save Doctor Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter doctors by name, department, or locality..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading && <div className="col-span-full p-8 text-center text-sm text-muted-foreground">Loading doctors...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No doctor records match your search query.
          </div>
        )}
        {filtered.map((d) => {
          const childDobsArr = Array.isArray(d.child_dobs)
            ? d.child_dobs
            : typeof d.child_dobs === "string"
              ? JSON.parse(d.child_dobs || "[]")
              : [];

          return (
            <div key={d.id} className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{d.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{d.department}</Badge>
                      <span>•</span>
                      <span>{d.area_locality}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px] text-primary">
                    {d.whatsapp_contact}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>DOB: <strong>{d.dob || "N/A"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    <span>Anniversary: <strong>{d.anniversary_date || "N/A"}</strong></span>
                  </div>
                </div>

                {childDobsArr.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Kids DOBs: </span>
                    {childDobsArr.join(", ")}
                  </div>
                )}

                {d.special_day && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-primary">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="font-semibold">Special Day: </span>
                      {d.special_day}
                    </div>
                  </div>
                )}

                {d.gift_accepted_details && (
                  <div className="mt-2.5 flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                    <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="font-semibold">Gift / Promo Accepted: </span>
                      {d.gift_accepted_details}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span>Entered by: {d.creator_name || d.created_by}</span>
                </div>
                {isAdmin && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 text-[10px]">
                    <ShieldCheck className="mr-1 h-3 w-3" /> Admin Reassign
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
