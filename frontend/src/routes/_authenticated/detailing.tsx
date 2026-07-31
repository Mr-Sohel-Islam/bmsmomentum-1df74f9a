import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Layers, CheckCircle2, Tag, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listPharmaProducts, PharmaProductRecord } from "@/lib/pharma.functions";

export const Route = createFileRoute("/_authenticated/detailing")({
  head: () => ({
    meta: [
      { title: "3D Product Detailing & Visual Presentation · MOMENTUM" },
      { name: "description", content: "Interactive 3D detailing presentations for pharmaceutical products to showcase to Doctors and Clients." },
    ],
  }),
  component: DetailingPage,
});

function DetailingPage() {
  const fetchProducts = useServerFn(listPharmaProducts);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pharma-products"],
    queryFn: () => fetchProducts(),
  });

  const [activeProduct, setActiveProduct] = useState<PharmaProductRecord | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Interactive Client Showcase</p>
        <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <Sparkles className="h-7 w-7 text-primary" /> Product & Offer 3D Detailing Visualizer
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Showcase pharmaceutical products with interactive 3D visual detailing models, dual-synergy clinical evidence, pricing structure (MRP/PTR/PTS), and active promotional schemes during Doctor and Client visits.
        </p>
      </div>

      {/* Product Detailing Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {isLoading && <div className="col-span-full p-8 text-center text-sm text-muted-foreground">Loading 3D detailing presentations...</div>}
        {!isLoading && products.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No pharmaceutical products available for detailing.
          </div>
        )}
        {products.map((p) => {
          const benefits = Array.isArray(p.key_benefits)
            ? p.key_benefits
            : typeof p.key_benefits === "string"
              ? JSON.parse(p.key_benefits || "[]")
              : [];

          return (
            <div key={p.id} className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  <img
                    src={p.image_url || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600"}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-background/90 text-foreground backdrop-blur-md">
                      {p.category}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="secondary" className="font-mono text-[11px] backdrop-blur-md">
                      3D Enabled
                    </Badge>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{p.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-primary">{p.composition}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2.5 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">MRP</div>
                      <div className="font-mono font-bold text-foreground">₹{p.mrp}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">PTR</div>
                      <div className="font-mono font-bold text-emerald-600">₹{p.ptr}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">PTS</div>
                      <div className="font-mono font-bold text-blue-600">₹{p.pts}</div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span>Packaging: <strong>{p.packaging}</strong></span>
                  </div>

                  {benefits.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Clinical Benefits</div>
                      {benefits.slice(0, 2).map((b: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.active_promotional_scheme && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-600 dark:text-amber-400">
                      <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div>
                        <span className="font-bold">Scheme: </span>
                        {p.active_promotional_scheme}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 pt-0">
                <Button
                  className="w-full gap-2"
                  onClick={() => setActiveProduct(p)}
                >
                  <Layers className="h-4 w-4" /> Launch 3D Detailing Mode
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3D Presentation Modal */}
      {activeProduct && (
        <Dialog open={!!activeProduct} onOpenChange={() => setActiveProduct(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>3D Detailing Presentation — {activeProduct.name}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-emerald-600">
                  Active Doctor Presentation Mode
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 flex flex-col items-center justify-center text-white border border-border">
                <img
                  src={activeProduct.image_url || ""}
                  alt={activeProduct.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-30 blur-sm"
                />
                <div className="relative z-10 text-center p-6 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-primary-foreground border border-primary/30">
                    <Sparkles className="h-3.5 w-3.5" /> 3D Interactive Detailing Engine Ready
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">{activeProduct.name}</h2>
                  <p className="text-sm text-slate-300 font-mono max-w-lg mx-auto">{activeProduct.composition}</p>
                  <div className="pt-2">
                    <Button variant="secondary" className="gap-2" asChild>
                      <a href={activeProduct.detailing_presentation_url || "#"} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" /> Open Fullscreen 3D Presentation
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Commercial Pricing Structure</h4>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    <div className="rounded-md bg-muted p-2">
                      <div className="text-[10px] text-muted-foreground">MRP</div>
                      <div className="text-sm font-bold text-foreground">₹{activeProduct.mrp}</div>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px]">PTR</div>
                      <div className="text-sm font-bold">₹{activeProduct.ptr}</div>
                    </div>
                    <div className="rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                      <div className="text-[10px]">PTS</div>
                      <div className="text-sm font-bold">₹{activeProduct.pts}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Promotional Offer Scheme</h4>
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold">Doctor & Chemist Scheme:</div>
                      <div>{activeProduct.active_promotional_scheme}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
