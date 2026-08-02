import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import promoWholesale from "@/assets/promo-wholesale.jpg";
import promoDelivery from "@/assets/promo-delivery.jpg";
import categoryFallback from "@/assets/category-fallback.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import {
  ArrowRight, Truck, ShieldCheck, Tag, Headphones, Sparkles, BadgeCheck,
  Wallet, Building2, Layers,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Share CoreMar — Premium FMCG Marketplace in Egypt" },
      { name: "description", content: "Egypt's premium unified marketplace for FMCG — verified suppliers, wholesale and retail pricing, tracked nationwide delivery and secure payments." },
      { property: "og:title", content: "Share CoreMar — Premium FMCG Marketplace in Egypt" },
      { property: "og:description", content: "Verified Egyptian suppliers, wholesale and retail pricing, tracked delivery and secure payments in one marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const iconMap: Record<string, any> = { truck: Truck, "shield-check": ShieldCheck, tag: Tag, headphones: Headphones };

function SectionHead({ title, sub, to }: { title: string; sub?: string; to?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {sub && <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{sub}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-primary hover:underline">
          {t("home.view_all")}
        </Link>
      )}
    </div>
  );
}

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
    queryFn: async () => (await supabase.from("products").select("*, brand:brands(name), category:categories(name_en, name_ar)").eq("is_active", true).limit(24).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["home-sections"],
    queryFn: async () => (await supabase.from("homepage_sections").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["home-suppliers"],
    queryFn: async () => (await (supabase as any).from("public_suppliers").select("*").order("is_featured", { ascending: false }).limit(6)).data ?? [],
  });

  const hero = sections.find((s: any) => s.section_key === "hero");
  const features = sections.find((s: any) => s.section_key === "features");
  const stats = sections.find((s: any) => s.section_key === "stats");
  const ctaSupplier = sections.find((s: any) => s.section_key === "cta_supplier");

  const heroBadge = (hero?.content as any)?.[`badge_${lang}`];
  const heroCta1 = (hero?.content as any)?.[`cta_primary_${lang}`] ?? "Start Shopping";
  const heroCta2 = (hero?.content as any)?.[`cta_secondary_${lang}`] ?? "Become a Supplier";

  const offers = products.filter((p: any) => p.is_offer && p.offer_price).slice(0, 4);
  const featured = products.filter((p: any) => p.is_featured).slice(0, 8);
  const newArrivals = products.slice(0, 4);
  const bestSellers = [...products]
    .sort((a: any, b: any) => Number(b.reviews_count ?? 0) - Number(a.reviews_count ?? 0) || Number(b.rating ?? 0) - Number(a.rating ?? 0))
    .slice(0, 4);
  const featuredRail = featured.length > 0 ? featured.slice(0, 4) : products.slice(0, 4);

  const whyItems = [
    { Icon: BadgeCheck, title: t("home.why_suppliers"), desc: t("home.why_suppliers_d") },
    { Icon: Truck, title: t("home.why_delivery"), desc: t("home.why_delivery_d") },
    { Icon: Wallet, title: t("home.why_payments"), desc: t("home.why_payments_d") },
    { Icon: Layers, title: t("home.why_pricing"), desc: t("home.why_pricing_d") },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--gradient-gold)" }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1.05fr_1fr] md:py-28">
          <div>
            {heroBadge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-soft/50 px-3.5 py-1.5 text-xs font-semibold text-ink">
                <Sparkles className="h-3.5 w-3.5" /> {heroBadge}
              </div>
            )}
            <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.03] tracking-tight md:text-6xl">
              {pick(hero, "title")}
              <span className="mt-1 block bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.55_0.14_60)] bg-clip-text text-transparent">
                {pick(hero, "subtitle")}
              </span>
            </h1>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg" className="btn-gold">
                <Link to="/products">{heroCta1} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-supplier">{heroCta2}</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" /> {t("home.why_suppliers")}</span>
              <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {t("home.why_delivery")}</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("home.why_payments")}</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-gold-soft to-transparent opacity-60 blur-2xl" />
            <img
              src={heroImg}
              alt="Egyptian FMCG products on a premium marketplace"
              className="relative w-full rounded-[1.75rem] shadow-2xl"
              width={1600}
              height={1200}
            />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <SectionHead title={t("home.shop_by_category")} sub={t("home.explore")} to="/categories" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((c: any) => (
            <Link
              key={c.id}
              to="/products"
              className="card-premium group relative overflow-hidden"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={c.image_url || categoryFallback}
                  alt={pick(c, "name")}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{pick(c, "name")}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {lang === "ar" ? c.name_en : c.name_ar}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </div>
            </Link>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No categories yet. Add them from the admin dashboard.
            </div>
          )}
        </div>
      </section>

      {/* PROMO BANNERS */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { img: promoWholesale, title: t("home.promo_wholesale_t"), desc: t("home.promo_wholesale_d"), cta: t("home.promo_wholesale_cta"), to: "/products" },
            { img: promoDelivery, title: t("home.promo_delivery_t"), desc: t("home.promo_delivery_d"), cta: t("home.promo_delivery_cta"), to: "/products" },
          ].map((b) => (
            <div key={b.title} className="relative overflow-hidden rounded-[1.5rem] border border-border">
              <img src={b.img} alt="" loading="lazy" className="h-64 w-full object-cover md:h-72" width={1600} height={912} />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/60 to-transparent rtl:bg-gradient-to-l" />
              <div className="absolute inset-0 flex max-w-md flex-col justify-center gap-3 p-8">
                <h3 className="text-2xl font-bold text-background md:text-3xl">{b.title}</h3>
                <p className="text-sm text-background/80">{b.desc}</p>
                <Button asChild size="sm" className="btn-gold mt-2 w-fit">
                  <Link to={b.to}>{b.cta} <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" /></Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WEEKLY OFFERS */}
      {offers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <SectionHead title={t("home.offers")} sub={t("home.offers_sub")} to="/products" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionHead title={t("home.featured_products")} to="/products" />
        {products.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t("home.no_products")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredRail.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* WHY SHARE COREMAR */}
      <section className="border-y border-border bg-muted/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t("home.why")}</h2>
            <p className="mt-2 text-muted-foreground">{t("home.why_sub")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ Icon, title, desc }) => (
              <div key={title} className="card-premium p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-gold)" }}>
                  <Icon className="h-6 w-6 text-ink" />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <SectionHead title={t("home.new_arrivals")} sub={t("home.new_arrivals_sub")} to="/products" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((p: any) => <ProductCard key={p.id} product={p} ribbon={t("home.new_arrivals")} />)}
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHead title={t("home.best_sellers")} sub={t("home.best_sellers_sub")} to="/products" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {bestSellers.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* CMS FEATURES */}
      {features && (features.content as any)?.items && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl">{pick(features, "title")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>
      )}

      {/* TRUSTED SUPPLIERS */}
      {suppliers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <SectionHead title={t("home.suppliers_title")} sub={t("home.suppliers_sub")} to="/suppliers" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s: any) => (
              <div key={s.id} className="card-premium flex items-start gap-4 p-6">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-soft to-accent">
                  <Building2 className="h-6 w-6 text-ink" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{s.company_name}</h3>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" /> {s.governorate ?? "Egypt"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BRANDS */}
      {brands.length > 0 && (
        <section className="border-y border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl">{t("home.trusted_brands")}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {brands.slice(0, 12).map((b: any) => (
                <div key={b.id} className="card-premium flex h-24 items-center justify-center p-6 text-center">
                  {b.logo_url
                    ? <img src={b.logo_url} alt={b.name} loading="lazy" className="max-h-14 object-contain" />
                    : <div className="text-sm font-semibold">{b.name}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STATS */}
      {stats && (stats.content as any)?.items && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-5 text-center sm:grid-cols-2 lg:grid-cols-4">
            {(stats.content as any).items.map((s: any, i: number) => (
              <div key={i} className="card-premium p-8">
                <div className="bg-gradient-to-r from-[oklch(0.78_0.14_82)] to-[oklch(0.55_0.14_60)] bg-clip-text text-4xl font-bold text-transparent">{s.value}</div>
                <div className="mt-2 text-sm font-medium">{s[`label_${lang}`] ?? s.label_en}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BECOME SUPPLIER CTA */}
      {ctaSupplier && (
        <section className="mx-auto max-w-7xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-[1.75rem] p-10 text-center md:p-16" style={{ background: "var(--gradient-gold)" }}>
            <h2 className="text-3xl font-bold text-ink md:text-5xl">{pick(ctaSupplier, "title")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink/80">{pick(ctaSupplier, "subtitle")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/become-supplier">{(ctaSupplier.content as any)?.[`cta_${lang}`] ?? "Become a Supplier"}</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
