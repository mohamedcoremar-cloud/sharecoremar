import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/_public/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "All FMCG Products — Share CoreMar" },
      { name: "description", content: "Shop the full Share CoreMar catalog — dairy, beverages, cooking essentials and home care with clear retail and wholesale pricing." },
      { property: "og:title", content: "All FMCG Products — Share CoreMar" },
      { property: "og:description", content: "The full Share CoreMar catalog with clear retail and wholesale pricing from verified Egyptian suppliers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
] as const;

function ProductsPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("newest");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => (await supabase.from("products").select("*, brand:brands(name), category:categories(name_en, name_ar)").eq("is_active", true).order("created_at", { ascending: false })).data ?? [],
  });

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = products.filter((p: any) =>
      !needle ||
      p.name_en?.toLowerCase().includes(needle) ||
      p.name_ar?.includes(q.trim()) ||
      p.brand?.name?.toLowerCase().includes(needle)
    );
    const priced = (p: any) => Number(p.is_offer && p.offer_price ? p.offer_price : p.retail_price);
    if (sort === "price_asc") return [...list].sort((a, b) => priced(a) - priced(b));
    if (sort === "price_desc") return [...list].sort((a, b) => priced(b) - priced(a));
    return list;
  }, [products, q, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">All Products</h1>
        <p className="mt-2 text-muted-foreground">
          Retail and wholesale pricing side by side, straight from verified Egyptian suppliers.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or brands..." className="ps-9" aria-label="Search products" />
        </div>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                sort === s.key ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card-premium aspect-[3/4] animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {q ? "No products match your search." : "No products yet. Products added by suppliers or admins will appear here."}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{visible.length} products</p>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
