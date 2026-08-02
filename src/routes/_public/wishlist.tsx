import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/_public/wishlist")({
  component: WishlistPage,
  head: () => ({
    meta: [
      { title: "My Wishlist — Share CoreMar" },
      { name: "description", content: "Save FMCG products on Share CoreMar and come back to add them to your cart whenever you are ready to restock." },
      { property: "og:title", content: "My Wishlist — Share CoreMar" },
      { property: "og:description", content: "Save products on Share CoreMar and add them to your cart whenever you are ready to restock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WishlistPage() {
  const { user } = useAuth();

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist-full", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("wishlist_items").select("product:products(*, brand:brands(name), category:categories(name_en, name_ar))").eq("user_id", user!.id)).data ?? [],
  });

  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-accent">
        <Heart className="h-7 w-7 text-ink" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Your wishlist</h1>
      <p className="mt-2 text-muted-foreground">Sign in to save products and pick up where you left off.</p>
      <Button asChild className="btn-gold mt-7"><Link to="/auth">Sign in</Link></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">My Wishlist</h1>
        <p className="mt-2 text-muted-foreground">{items.length} saved {items.length === 1 ? "product" : "products"}</p>
      </header>

      {items.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/products">Browse products</Link></Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i: any) => i.product && <ProductCard key={i.product.id} product={i.product} />)}
        </div>
      )}
    </div>
  );
}
