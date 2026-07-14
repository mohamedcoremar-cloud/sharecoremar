import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_public/products")({ component: ProductsPage });

function ProductsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => (await supabase.from("products").select("*, brand:brands(name), category:categories(name_en)").eq("is_active", true).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">All Products</h1>
        <p className="text-muted-foreground mt-1">Browse our full catalog</p>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card-premium aspect-[3/4] animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No products yet. Products added by suppliers or admins will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p: any) => (
            <div key={p.id} className="card-premium overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name_en} className="h-full w-full object-cover" /> : <Sparkles className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{p.brand?.name ?? p.category?.name_en}</div>
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
    </div>
  );
}
