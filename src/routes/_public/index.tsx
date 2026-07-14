import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, ShieldCheck, Tag, Headphones, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_public/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Share CoreMar — Smart Market. Core Solutions." },
      { name: "description", content: "Premium unified marketplace for FMCG in Egypt — suppliers, businesses, and personal buyers in one destination." },
    ],
  }),
});

const iconMap: Record<string, any> = { truck: Truck, "shield-check": ShieldCheck, tag: Tag, headphones: Headphones };

function Home() {
  const { data: categories = [] } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).eq("is_featured", true).order("sort_order");
      return data ?? [];
    },
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("*").eq("is_active", true).eq("is_featured", true).order("sort_order");
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("is_active", true).limit(8).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["home-sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const hero = sections.find((s) => s.section_key === "hero");
  const features = sections.find((s) => s.section_key === "features");
  const stats = sections.find((s) => s.section_key === "stats");

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/40 px-3 py-1 text-xs font-medium text-ink">
              <Sparkles className="h-3.5 w-3.5" /> Egypt's Premium Unified Marketplace
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl leading-[1.05]">
              {hero?.title_en ?? "Everything your business needs"}
              <span className="block bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.65_0.14_60)] bg-clip-text text-transparent">
                in one place.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {hero?.subtitle_en ?? "Trust. Professionalism. Wholesale and retail — all in one destination."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-gold">
                <Link to="/products">Start Shopping <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-supplier">Become a Supplier</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-gold-soft to-transparent blur-2xl opacity-60" />
            <img src={heroImg} alt="Premium marketplace" className="relative rounded-3xl shadow-2xl w-full" width={1600} height={1000} />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
            <p className="text-muted-foreground mt-1">Explore thousands of products across every category</p>
          </div>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c: any) => (
            <Link key={c.id} to="/categories/$slug" params={{ slug: c.slug }} className="card-premium p-5 text-center group">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft to-accent group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-ink" />
              </div>
              <div className="text-sm font-semibold">{c.name_en}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.name_ar}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      {features && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">Why Share CoreMar</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(features.content as any)?.items?.map((f: any, i: number) => {
                const Icon = iconMap[f.icon] ?? Sparkles;
                return (
                  <div key={i} className="card-premium p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-gold)" }}>
                      <Icon className="h-6 w-6 text-ink" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title_en}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.title_ar}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
          <Link to="/products" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        {products.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <p className="text-muted-foreground">Products will appear here once suppliers upload their catalog. The admin can add products from the dashboard.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p: any) => (
              <div key={p.id} className="card-premium overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name_en} className="h-full w-full object-cover" /> : <Sparkles className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2">{p.name_en}</h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-primary">{Number(p.retail_price).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">EGP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* BRANDS */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-10">Trusted Brands</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {brands.map((b: any) => (
              <div key={b.id} className="card-premium p-6 flex items-center justify-center h-24 text-center">
                <div className="font-semibold text-sm">{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      {stats && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {(stats.content as any)?.items?.map((s: any, i: number) => (
              <div key={i} className="card-premium p-8">
                <div className="text-4xl font-bold bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.65_0.14_60)] bg-clip-text text-transparent">{s.value}</div>
                <div className="mt-2 text-sm font-medium">{s.label_en}</div>
                <div className="text-xs text-muted-foreground">{s.label_ar}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BECOME SUPPLIER CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-gold)" }}>
          <h2 className="text-3xl md:text-5xl font-bold text-ink">Grow your business with us</h2>
          <p className="mt-4 text-ink/80 max-w-2xl mx-auto">Join hundreds of Egyptian suppliers, factories, and distributors reaching thousands of business and personal buyers every day.</p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link to="/become-supplier">Become a Supplier</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
