import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Sparkles } from "lucide-react";
import { fmt, priceOf } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const { user } = useAuth();
  const { pick } = useI18n();
  const { addToCart, toggleWishlist } = useCart();

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist-full", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("wishlist_items").select("product:products(*)").eq("user_id", user!.id)).data ?? [],
  });

  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Your wishlist</h1>
      <p className="text-muted-foreground mt-2">Sign in to save products for later.</p>
      <Button asChild className="btn-gold mt-6"><Link to="/auth">Sign in</Link></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
      {items.length === 0 ? (
        <div className="card-premium p-16 text-center"><Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">Your wishlist is empty.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i: any) => i.product && (
            <div key={i.product.id} className="card-premium overflow-hidden">
              <Link to="/product/$slug" params={{ slug: i.product.slug }} className="block aspect-square bg-muted">
                {i.product.images?.[0] ? <img src={i.product.images[0]} className="h-full w-full object-cover" alt="" /> : <div className="h-full flex items-center justify-center"><Sparkles className="h-8 w-8 text-muted-foreground" /></div>}
              </Link>
              <div className="p-3">
                <div className="text-sm font-medium line-clamp-2">{pick(i.product, "name")}</div>
                <div className="text-primary font-bold mt-1">{fmt(priceOf(i.product))}</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="btn-gold flex-1" onClick={() => addToCart(i.product.id)}><ShoppingCart className="h-3.5 w-3.5 me-1" /> Add</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleWishlist(i.product.id)}><Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
