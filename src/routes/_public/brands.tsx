import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";

export const Route = createFileRoute("/_public/brands")({
  component: BrandsPage,
  head: () => ({
    meta: [
      { title: "Trusted FMCG Brands — Share CoreMar" },
      { name: "description", content: "Discover the Egyptian and international FMCG brands available on Share CoreMar, listed by verified suppliers." },
      { property: "og:title", content: "Trusted FMCG Brands — Share CoreMar" },
      { property: "og:description", content: "Egyptian and international FMCG brands listed by verified Share CoreMar suppliers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function BrandsPage() {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["public-brands-all"],
    queryFn: async () => (await supabase.from("brands").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Brands</h1>
        <p className="mt-2 text-muted-foreground">
          The brands our suppliers stock — from Egyptian household names to imported favourites.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="card-premium h-36 animate-pulse" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Brands will appear here once they are published.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {brands.map((b: any) => (
            <div key={b.id} className="card-premium flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-gold-soft to-accent">
                {b.logo_url
                  ? <img src={b.logo_url} alt={b.name} loading="lazy" className="h-full w-full object-contain p-1.5" />
                  : <Award className="h-7 w-7 text-ink" />}
              </div>
              <div>
                <div className="font-semibold leading-tight">{b.name}</div>
                {b.country && <div className="mt-1 text-xs text-muted-foreground">{b.country}</div>}
              </div>
              {b.is_featured && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                  Featured
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
