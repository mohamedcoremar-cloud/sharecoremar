import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, ShieldCheck, Tag, Headphones, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Share CoreMar — Premium FMCG Marketplace in Egypt" },
      { name: "description", content: "Egypt's premium unified marketplace for FMCG — connecting trusted suppliers with businesses and personal buyers. Wholesale and retail in one place." },
    ],
  }),
});

const iconMap: Record<string, any> = { truck: Truck, "shield-check": ShieldCheck, tag: Tag, headphones: Headphones };

function Home() {
  const { t, lang, pick } = useI18n();
  const { data: categories = [] } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    queryFn: async () => (await supabase.from("brands").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => (await supabase.from("products").select("*").eq("is_active", true).limit(8).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["home-sections"],
    queryFn: async () => (await supabase.from("homepage_sections").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  const hero = sections.find((s: any) => s.section_key === "hero");
  const features = sections.find((s: any) => s.section_key === "features");
  const stats = sections.find((s: any) => s.section_key === "stats");
  const ctaSupplier = sections.find((s: any) => s.section_key === "cta_supplier");

  const heroBadge = (hero?.content as any)?.[`badge_${lang}`];
  const heroCta1 = (hero?.content as any)?.[`cta_primary_${lang}`] ?? "Start Shopping";
  const heroCta2 = (hero?.content as any)?.[`cta_secondary_${lang}`] ?? "Become a Supplier";

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24 items-center">
          <div>
            {heroBadge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft/40 px-3 py-1 text-xs font-semibold text-ink">
                <Sparkles className="h-3.5 w-3.5" /> {heroBadge}
              </div>
            )}
            <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-6xl leading-[1.05]">
              {pick(hero, "title")}
              <span className="block bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.55_0.14_60)] bg-clip-text text-transparent">
                {pick(hero, "subtitle")}
              </span>
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-gold">
                <Link to="/products">{heroCta1} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-supplier">{heroCta2}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-gold-soft to-transparent blur-2xl opacity-60" />
            <img src={heroImg} alt="Premium FMCG marketplace" className="relative rounded-3xl shadow-2xl w-full" width={1600} height={1200} />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{t("home.shop_by_category")}</h2>
            <p className="text-muted-foreground mt-1">{t("home.explore")}</p>
          </div>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">{t("home.view_all")}</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.slice(0, 12).map((c: any) => (
            <Link key={c.id} to="/categories/$slug" params={{ slug: c.slug }} className="card-premium p-5 text-center group">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-soft to-accent group-hover:scale-110 transition-transform overflow-hidden">
                {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6 text-ink" />}
              </div>
              <div className="text-sm font-semibold">{pick(c, "name")}</div>
            </Link>
          ))}
          {categories.length === 0 && <div className="col-span-full text-center text-muted-foreground text-sm py-8">No categories yet. Add them from the admin dashboard.</div>}
        </div>
      </section>

      {/* FEATURES */}
      {features && (features.content as any)?.items && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">{pick(features, "title")}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(features.content as any).items.map((f: any, i: number) => {
                const Icon = iconMap[f.icon] ?? Sparkles;
                return (
                  <div key={i} className="card-premium p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-gold)" }}>
                      <Icon className="h-6 w-6 text-ink" />
                    </div>
                    <h3 className="mt-4 font-semibold">{f[`title_${lang}`] ?? f.title_en}</h3>
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
          <h2 className="text-3xl font-bold tracking-tight">{t("home.featured_products")}</h2>
          <Link to="/products" className="text-sm font-medium text-primary hover:underline">{t("home.view_all")}</Link>
        </div>
        {products.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <p className="text-muted-foreground">{t("home.no_products")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p: any) => (
              <div key={p.id} className="card-premium overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {p.images?.[0] ? <img src={p.images[0]} alt={pick(p, "name")} className="h-full w-full object-cover" /> : <Sparkles className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-2">{pick(p, "name")}</h3>
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
      {brands.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-10">{t("home.trusted_brands")}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {brands.map((b: any) => (
                <div key={b.id} className="card-premium p-6 flex items-center justify-center h-24 text-center">
                  {b.logo_url ? <img src={b.logo_url} alt={b.name} className="max-h-14 object-contain" /> : <div className="font-semibold text-sm">{b.name}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      {stats && (stats.content as any)?.items && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {(stats.content as any).items.map((s: any, i: number) => (
              <div key={i} className="card-premium p-8">
                <div className="text-4xl font-bold bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.55_0.14_60)] bg-clip-text text-transparent">{s.value}</div>
                <div className="mt-2 text-sm font-medium">{s[`label_${lang}`] ?? s.label_en}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BECOME SUPPLIER CTA */}
      {ctaSupplier && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center" style={{ background: "var(--gradient-gold)" }}>
            <h2 className="text-3xl md:text-5xl font-bold text-ink">{pick(ctaSupplier, "title")}</h2>
            <p className="mt-4 text-ink/80 max-w-2xl mx-auto">{pick(ctaSupplier, "subtitle")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/become-supplier">{(ctaSupplier.content as any)?.[`cta_${lang}`] ?? "Become a Supplier"}</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
