import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgePercent,
  CalendarClock,
  Gift,
  Image as ImageIcon,
  Mail,
  Plus,
  Send,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { offersApi, type Offer, type OfferInput, type RecipientType } from "@/lib/offers.api";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
  active: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  paused: "bg-slate-500/15 text-slate-400",
  expired: "bg-destructive/10 text-destructive",
};

const emptyOffer: OfferInput = {
  title: "",
  promo_code: "",
  description: "",
  details: "",
  image_url: "",
  offer_type: "scheme",
  value_details: "",
  terms: "",
  valid_from: "",
  valid_to: "",
  status: "draft",
  scheduled_at: "",
  email_subject: "",
  email_body: "",
};

export function OffersSection() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [sendFor, setSendFor] = useState<Offer | null>(null);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: offersApi.list,
  });
  const { data: recipients = [] } = useQuery({
    queryKey: ["offer-recipients"],
    queryFn: offersApi.recipients,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => offersApi.remove(id),
    onSuccess: () => {
      toast.success("Offer deleted");
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["offer-recipients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dispatchMut = useMutation({
    mutationFn: (id: string) => offersApi.dispatch(id),
    onSuccess: () => {
      toast.success("Offer dispatched to its saved recipients");
      qc.invalidateQueries({ queryKey: ["offers"] });
      qc.invalidateQueries({ queryKey: ["offer-recipients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Rewards</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight">
            <Gift className="h-5 w-5 text-primary" /> Offers &amp; Schemes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-save offers, schedule them, and send to employees, doctors, trade partners or
            outside contacts. Employees also receive an in-app notification.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New offer
        </Button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Loading offers…</div>}

      {!isLoading && offers.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No offers saved yet. Create your first offer to schedule and share it.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
          >
            {offer.image_url ? (
              <img
                src={offer.image_url}
                alt={offer.title}
                className="h-32 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-muted/40 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{offer.title}</h3>
                <Badge className={STATUS_STYLES[offer.status] ?? ""}>{offer.status}</Badge>
              </div>
              {offer.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {offer.promo_code && (
                  <span className="inline-flex items-center gap-1 rounded border border-dashed border-primary/40 px-2 py-0.5 font-mono text-primary">
                    <Tag className="h-3 w-3" /> {offer.promo_code}
                  </span>
                )}
                {offer.value_details && (
                  <span className="inline-flex items-center gap-1">
                    <BadgePercent className="h-3 w-3" /> {offer.value_details}
                  </span>
                )}
                {offer.scheduled_at && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {new Date(offer.scheduled_at).toLocaleString()}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {offer.sent_count ?? 0}/{offer.recipient_count ?? 0}{" "}
                  sent
                </span>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button size="sm" onClick={() => setSendFor(offer)}>
                  <Send className="h-3.5 w-3.5" /> Send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(offer);
                    setFormOpen(true);
                  }}
                >
                  Edit
                </Button>
                {(offer.recipient_count ?? 0) > (offer.sent_count ?? 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dispatchMut.mutate(offer.id)}
                    disabled={dispatchMut.isPending}
                  >
                    Dispatch now
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeMut.mutate(offer.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Delivery log</h3>
        </div>
        {recipients.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No deliveries yet.</div>
        ) : (
          <ScrollArea className="max-h-80">
            {recipients.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/40 px-5 py-3 text-sm last:border-0"
              >
                <span className="font-medium">{r.recipient_name || r.recipient_email || "—"}</span>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {r.recipient_type}
                </Badge>
                <span className="text-muted-foreground">{r.offer_title}</span>
                <Badge
                  className={`ml-auto text-[10px] ${
                    r.delivery_status === "sent"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : r.delivery_status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {r.delivery_status}
                </Badge>
              </div>
            ))}
          </ScrollArea>
        )}
      </div>

      <OfferFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        offer={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["offers"] });
          setFormOpen(false);
        }}
      />

      <SendOfferDialog
        offer={sendFor}
        onOpenChange={(open) => !open && setSendFor(null)}
        onSent={() => {
          qc.invalidateQueries({ queryKey: ["offers"] });
          qc.invalidateQueries({ queryKey: ["offer-recipients"] });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          setSendFor(null);
        }}
      />
    </div>
  );
}

function OfferFormDialog({
  open,
  onOpenChange,
  offer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  offer: Offer | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<OfferInput>(emptyOffer);
  const [initialised, setInitialised] = useState<string | null>(null);

  // Sync the form with the offer being edited whenever the dialog opens.
  const key = `${open}-${offer?.id ?? "new"}`;
  if (initialised !== key) {
    setInitialised(key);
    setForm(
      offer
        ? {
            title: offer.title,
            promo_code: offer.promo_code ?? "",
            description: offer.description ?? "",
            details: offer.details ?? "",
            image_url: offer.image_url ?? "",
            offer_type: offer.offer_type ?? "scheme",
            value_details: offer.value_details ?? "",
            terms: offer.terms ?? "",
            valid_from: offer.valid_from?.slice(0, 10) ?? "",
            valid_to: offer.valid_to?.slice(0, 10) ?? "",
            status: offer.status,
            scheduled_at: offer.scheduled_at ? offer.scheduled_at.slice(0, 16) : "",
            email_subject: offer.email_subject ?? "",
            email_body: offer.email_body ?? "",
          }
        : emptyOffer,
    );
  }

  const set = (patch: Partial<OfferInput>) => setForm((f) => ({ ...f, ...patch }));

  const mut = useMutation({
    mutationFn: () => {
      const payload: OfferInput = {
        ...form,
        scheduled_at: form.scheduled_at ? form.scheduled_at.replace("T", " ") + ":00" : null,
        status: form.scheduled_at ? "scheduled" : form.status || "draft",
      };
      return offer ? offersApi.update(offer.id, payload) : offersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(offer ? "Offer updated" : "Offer saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer ? "Edit offer" : "Create offer"}</DialogTitle>
          <DialogDescription>
            Save it as a draft, or set a schedule date and MOMENTUM will send it automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Promo code</Label>
            <Input
              value={form.promo_code ?? ""}
              onChange={(e) => set({ promo_code: e.target.value.toUpperCase() })}
              placeholder="MOM25"
            />
          </div>
          <div className="space-y-2">
            <Label>Offer type</Label>
            <Select
              value={form.offer_type ?? "scheme"}
              onValueChange={(v) => set({ offer_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheme">Trade scheme</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="gift">Gift / sample</SelectItem>
                <SelectItem value="reward">Employee reward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Image URL</Label>
            <Input
              value={form.image_url ?? ""}
              onChange={(e) => set({ image_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Short description</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Details</Label>
            <Textarea
              rows={3}
              value={form.details ?? ""}
              onChange={(e) => set({ details: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input
              value={form.value_details ?? ""}
              onChange={(e) => set({ value_details: e.target.value })}
              placeholder="10% off / 10+1"
            />
          </div>
          <div className="space-y-2">
            <Label>Schedule send</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_at ?? ""}
              onChange={(e) => set({ scheduled_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Valid from</Label>
            <Input
              type="date"
              value={form.valid_from ?? ""}
              onChange={(e) => set({ valid_from: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Valid to</Label>
            <Input
              type="date"
              value={form.valid_to ?? ""}
              onChange={(e) => set({ valid_to: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Email subject</Label>
            <Input
              value={form.email_subject ?? ""}
              onChange={(e) => set({ email_subject: e.target.value })}
              placeholder="Leave blank to use the offer title"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Email template (optional)</Label>
            <Textarea
              rows={4}
              value={form.email_body ?? ""}
              onChange={(e) => set({ email_body: e.target.value })}
              placeholder="Supports {{name}}, {{title}}, {{promo_code}}, {{details}}, {{valid_to}}"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Terms</Label>
            <Textarea
              rows={2}
              value={form.terms ?? ""}
              onChange={(e) => set({ terms: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!form.title || mut.isPending}>
            {mut.isPending ? "Saving…" : offer ? "Save changes" : "Save offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Target = { id: string; label: string; email?: string | null; type: RecipientType };

function SendOfferDialog({
  offer,
  onOpenChange,
  onSent,
}: {
  offer: Offer | null;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, Target>>({});
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [schedule, setSchedule] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiClient.get<any[]>("/profiles"),
    enabled: Boolean(offer),
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiClient.get<any[]>("/pharma/doctors").catch(() => []),
    enabled: Boolean(offer),
  });
  const { data: trade = [] } = useQuery({
    queryKey: ["trade-entities"],
    queryFn: () => apiClient.get<any[]>("/pharma/trade-entities").catch(() => []),
    enabled: Boolean(offer),
  });

  const groups = useMemo(
    () => [
      {
        key: "employee" as RecipientType,
        label: "Employees (email + notification)",
        items: (employees ?? []).map((e: any) => ({
          id: e.id,
          label: e.full_name || e.email || e.id,
          email: e.email,
          type: "employee" as RecipientType,
        })),
      },
      {
        key: "doctor" as RecipientType,
        label: "Doctors (email)",
        items: (doctors ?? []).map((d: any) => ({
          id: d.id,
          label: d.name || d.doctor_name || d.id,
          email: d.email,
          type: "doctor" as RecipientType,
        })),
      },
      {
        key: "trade" as RecipientType,
        label: "Trade partners (email)",
        items: (trade ?? []).map((t: any) => ({
          id: t.id,
          label: t.firm_name || t.name || t.id,
          email: t.email,
          type: "trade" as RecipientType,
        })),
      },
    ],
    [employees, doctors, trade],
  );

  const toggle = (t: Target) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[t.id]) delete next[t.id];
      else next[t.id] = t;
      return next;
    });

  const mut = useMutation({
    mutationFn: () => {
      const recipients = Object.values(selected).map((t) => ({
        recipient_type: t.type,
        recipient_id: t.type === "external" ? null : t.id,
        recipient_name: t.label,
        recipient_email: t.email ?? null,
        channel: t.type === "employee" ? ("both" as const) : ("email" as const),
      }));
      return offersApi.send(offer!.id, recipients, schedule);
    },
    onSuccess: () => {
      toast.success(schedule ? "Recipients queued for the scheduled send" : "Offer sent");
      setSelected({});
      onSent();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(offer)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Send “{offer?.title}”</DialogTitle>
          <DialogDescription>
            Pick internal employees, doctors, trade partners, or add an outside contact by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {group.label}
              </Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {group.items.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">Nothing available.</p>
                )}
                {group.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={Boolean(selected[item.id])}
                      onCheckedChange={() => toggle(item)}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.email || "no email"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 rounded-md border border-dashed border-border p-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Outside contact
            </Label>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Name"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
              />
              <Input
                placeholder="email@example.com"
                value={externalEmail}
                onChange={(e) => setExternalEmail(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!externalEmail) return toast.error("Email is required");
                  const id = `ext:${externalEmail}`;
                  setSelected((p) => ({
                    ...p,
                    [id]: {
                      id,
                      label: externalName || externalEmail,
                      email: externalEmail,
                      type: "external",
                    },
                  }));
                  setExternalName("");
                  setExternalEmail("");
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={schedule} onCheckedChange={(v) => setSchedule(Boolean(v))} />
            Queue for the offer&apos;s scheduled time instead of sending now
          </label>

          <p className="text-xs text-muted-foreground">
            {Object.keys(selected).length} recipient(s) selected.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={Object.keys(selected).length === 0 || mut.isPending}
          >
            <Send className="h-4 w-4" />
            {mut.isPending ? "Sending…" : schedule ? "Queue" : "Send now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
