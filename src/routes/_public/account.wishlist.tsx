import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Sparkles } from "lucide-react";
import { fmt, priceOf } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/account/wishlist")({
  component: AccountWishlistPage,
  head: () => ({
    meta: [
      { title: "My Wishlist — Share CoreMar" },
      { name: "description", content: "Your saved FMCG products on Share CoreMar — add them to your cart whenever you are ready to restock." },
      { property: "og:title", content: "My Wishlist — Share CoreMar" },
      { property: "og:description", content: "Your saved products on Share CoreMar, ready to add to cart." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AccountWishlistPage() {
  const { user } = useAuth();
  const { pick, t } = useI18n();
  const { addToCart, toggleWishlist, wishlist } = useCart();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist-full", user?.id, wishlist.join(",")],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("wishlist_items")
          .select("id, product:products(*, brand:brands(name), category:categories(name_en, name_ar))")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-accent">
          <Heart className="h-7 w-7 text-ink" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Your wishlist</h1>
        <p className="mt-2 text-muted-foreground">Sign in to save products and pick up where you left off.</p>
        <Button asChild className="btn-gold mt-7">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">My Wishlist</h1>
        <p className="mt-2 text-muted-foreground">
          {items.length} saved {items.length === 1 ? "product" : "products"}
        </p>
      </header>

      {isLoading ? (
        <div className="card-premium p-16 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/products">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((row: any) => {
            const p = row.product;
            if (!p) return null;
            const stock = Number(p.stock ?? 0);
            return (
              <div key={row.id} className="card-premium flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Link
                  to="/product/$slug"
                  params={{ slug: p.slug }}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={pick(p, "name")} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Sparkles className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-semibold hover:text-primary">
                    {pick(p, "name")}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold">{fmt(priceOf(p))}</span>
                    {p.is_offer && p.offer_price && (
                      <span className="text-sm text-muted-foreground line-through">{fmt(p.retail_price)}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs">
                    {stock === 0 ? (
                      <span className="text-muted-foreground">{t("product.out_of_stock")}</span>
                    ) : (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{t("product.in_stock")}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button className="btn-gold" disabled={stock === 0} onClick={() => addToCart(p.id, 1)}>
                    <ShoppingCart className="me-2 h-4 w-4" /> {t("product.add_to_cart")}
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Remove" onClick={() => toggleWishlist(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
