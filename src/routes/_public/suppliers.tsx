import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, BadgeCheck, MapPin } from "lucide-react";

export const Route = createFileRoute("/_public/suppliers")({
  component: SuppliersPage,
  head: () => ({
    meta: [
      { title: "Verified Suppliers — Share CoreMar" },
      { name: "description", content: "Meet the approved Egyptian FMCG suppliers selling on Share CoreMar — each reviewed before listing a single product." },
      { property: "og:title", content: "Verified Suppliers — Share CoreMar" },
      { property: "og:description", content: "Approved Egyptian FMCG suppliers, each reviewed before listing a single product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["public-suppliers"],
    queryFn: async () => (await (supabase as any).from("public_suppliers").select("*").order("is_featured", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Verified Suppliers</h1>
        <p className="mt-2 text-muted-foreground">
          Every supplier on Share CoreMar is reviewed and approved before a single product goes live.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card-premium h-40 animate-pulse" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Approved suppliers will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s: any) => (
            <div key={s.id} className="card-premium flex flex-col p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-gold-soft to-accent">
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.company_name} loading="lazy" className="h-full w-full object-cover" />
                    : <Building2 className="h-6 w-6 text-ink" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">{s.company_name}</h3>
                  {s.brand_name && <div className="mt-1 truncate text-xs text-muted-foreground">{s.brand_name}</div>}
                  {s.is_featured && (
                    <span className="mt-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {s.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-primary" /> Verified supplier</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.city ? `${s.city}, ` : ""}{s.governorate ?? "Egypt"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
