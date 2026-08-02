import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Store, Building2, Truck, Plus, FileText, Phone, Mail, CreditCard, Tag, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { listTradeEntities, createTradeEntity, TradeEntityRecord } from "@/lib/pharma.functions";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/_authenticated/trade")({
  head: () => ({
    meta: [
      { title: "Trade & Chemists Management · MOMENTUM" },
      { name: "description", content: "Manage Chemists, Wholesalers, Distributors, Drug Licenses, and Scheme details." },
    ],
  }),
  component: TradePage,
});

function TradePage() {
  const qc = useQueryClient();
  const addTrade = useServerFn(createTradeEntity);

  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState<"chemist" | "wholesaler" | "distributor">("chemist");
  const [firmName, setFirmName] = useState("");
  const [drugLicenseNo, setDrugLicenseNo] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [proprietorName, setProprietorName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [commModes, setCommModes] = useState("");
  const [billingDetails, setBillingDetails] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [offerSchemeDetails, setOfferSchemeDetails] = useState("");

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ["trade-entities", category],
    queryFn: () => {
      const q = category && category !== "all" ? `?category=${category}` : "";
      return apiClient.get<TradeEntityRecord[]>(`/pharma/trade-entities${q}`);
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      addTrade({
        data: {
          category: formCategory,
          firm_name: firmName,
          drug_license_no: drugLicenseNo,
          gst_number: gstNumber,
          address,
          proprietor_name: proprietorName,
          contact_number: contactNumber,
          email: email || null,
          comm_modes: commModes || null,
          billing_details: billingDetails || null,
          payment_details: paymentDetails || null,
          offer_scheme_details: offerSchemeDetails || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-entities"] });
      toast.success("Trade Firm Entity created successfully");
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save firm"),
  });

  function resetForm() {
    setFirmName("");
    setDrugLicenseNo("");
    setGstNumber("");
    setAddress("");
    setProprietorName("");
    setContactNumber("");
    setEmail("");
    setCommModes("");
    setBillingDetails("");
    setPaymentDetails("");
    setOfferSchemeDetails("");
  }

  const filtered = entities.filter(
    (e) =>
      e.firm_name.toLowerCase().includes(search.toLowerCase()) ||
      e.proprietor_name.toLowerCase().includes(search.toLowerCase()) ||
      e.drug_license_no.toLowerCase().includes(search.toLowerCase()) ||
      e.gst_number.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Commercial Trade Network</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <Store className="h-7 w-7 text-primary" /> Wholesale, Distributor & Chemists
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage trade partners, drug licenses, GST records, billing terms, and active trade schemes.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Register New Trade Firm
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> New Trade Entity Registration
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
                <Label>Entity Category *</Label>
                <div className="flex gap-2">
                  {(["chemist", "wholesaler", "distributor"] as const).map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={formCategory === cat ? "default" : "outline"}
                      size="sm"
                      className="capitalize flex-1"
                      onClick={() => setFormCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name of Trade (Firm Name) *</Label>
                  <Input
                    required
                    placeholder="e.g. Apollo Pharmacy Store #482"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Proprietor / Partners Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Mr. Suresh Agarwal"
                    value={proprietorName}
                    onChange={(e) => setProprietorName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Drug License Number (D.L.) *</Label>
                  <Input
                    required
                    placeholder="e.g. DL-20B/10492/2021"
                    value={drugLicenseNo}
                    onChange={(e) => setDrugLicenseNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>GST Number *</Label>
                  <Input
                    required
                    placeholder="e.g. 07AAACA40921Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Firm Address *</Label>
                <Textarea
                  required
                  placeholder="Complete postal address of trade firm..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Call / WhatsApp Number *</Label>
                  <Input
                    required
                    placeholder="e.g. +91 98102 33445"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email ID</Label>
                  <Input
                    type="email"
                    placeholder="e.g. sales@firm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Billing Details / Credit Terms</Label>
                <Input
                  placeholder="e.g. 15 Days Credit Period with Net Billing"
                  value={billingDetails}
                  onChange={(e) => setBillingDetails(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Details</Label>
                <Input
                  placeholder="e.g. HDFC Bank NEFT / UPI ID: apollo@hdfcbank"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Offer or Scheme Details</Label>
                <Input
                  placeholder="e.g. 10+2 Free Scheme on Antibiotics Range"
                  value={offerSchemeDetails}
                  onChange={(e) => setOfferSchemeDetails(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? "Registering..." : "Register Firm Entity"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={setCategory} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All Trade</TabsTrigger>
            <TabsTrigger value="chemist" className="gap-1.5">
              <Store className="h-3.5 w-3.5" /> Chemists
            </TabsTrigger>
            <TabsTrigger value="wholesaler" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Wholesalers
            </TabsTrigger>
            <TabsTrigger value="distributor" className="gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Distributors
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 sm:max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by firm name, proprietor, GST or DL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent h-8 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs"
          />
        </div>
      </div>

      {/* Trade Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {isLoading && <div className="col-span-full p-8 text-center text-sm text-muted-foreground">Loading trade network...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No trade entities match the selected criteria.
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.id} className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        t.category === "chemist"
                          ? "default"
                          : t.category === "wholesaler"
                            ? "secondary"
                            : "outline"
                      }
                      className="uppercase text-[10px]"
                    >
                      {t.category}
                    </Badge>
                  </div>
                  <h3 className="mt-1.5 text-xl font-bold tracking-tight text-foreground">{t.firm_name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Proprietor: <strong>{t.proprietor_name}</strong></p>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>D.L.: <strong>{t.drug_license_no}</strong></span>
                  <span className="mx-1">•</span>
                  <span>GST: <strong>{t.gst_number}</strong></span>
                </div>

                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground shrink-0">Address:</span>
                  <span>{t.address}</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{t.contact_number}</span>
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      <span>{t.email}</span>
                    </div>
                  )}
                </div>

                {t.billing_details && (
                  <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-muted-foreground">
                    <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <div>
                      <span className="font-semibold text-foreground">Billing / Credit: </span>
                      {t.billing_details}
                    </div>
                  </div>
                )}

                {t.offer_scheme_details && (
                  <div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-600 dark:text-emerald-400">
                    <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <span className="font-semibold">Active Scheme / Offer: </span>
                      {t.offer_scheme_details}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
