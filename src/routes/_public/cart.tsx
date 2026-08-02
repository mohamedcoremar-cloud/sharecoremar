import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Heart, ShoppingBag, Bookmark } from "lucide-react";
import { fmt, priceOf } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_public/cart")({
  component: CartPage,
  head: () => ({
    meta: [
      { title: "Your Cart — Share CoreMar" },
      { name: "description", content: "Review the FMCG products in your Share CoreMar cart, adjust quantities and continue to secure checkout." },
      { property: "og:title", content: "Your Cart — Share CoreMar" },
      { property: "og:description", content: "Review your cart, adjust quantities and continue to secure checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CartPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, updateQty, removeFromCart, saveForLater, toggleWishlist } = useCart();
  const { pick } = useI18n();
  const nav = useNavigate();

  const active = items.filter((i) => !i.saved_for_later);
  const saved = items.filter((i) => i.saved_for_later);

  const subtotal = active.reduce((s, i) => s + priceOf(i.product) * i.quantity, 0);
  const tax = active.reduce((s, i) => s + priceOf(i.product) * i.quantity * (Number(i.product?.tax_rate ?? 0) / 100), 0);
  const shipping = active.length > 0 ? (subtotal > 2000 ? 0 : 50) : 0;
  const total = subtotal + tax + shipping;

  if (authLoading) return <div className="mx-auto max-w-6xl px-4 py-16">Loading…</div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Your cart</h1>
      <p className="text-muted-foreground mt-2">Please sign in to view and manage your cart.</p>
      <Button asChild className="btn-gold mt-6"><Link to="/auth">Sign in</Link></Button>
    </div>
  );

  if (active.length === 0 && saved.length === 0) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Your cart is empty</h1>
      <p className="text-muted-foreground mt-2">Discover our catalog and add products to your cart.</p>
      <Button asChild className="btn-gold mt-6"><Link to="/products">Browse products</Link></Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {active.map((i) => (
            <div key={i.id} className="card-premium p-4 flex gap-4">
              <Link to="/product/$slug" params={{ slug: i.product?.slug ?? "" }} className="h-24 w-24 shrink-0 rounded-lg bg-muted overflow-hidden">
                {i.product?.images?.[0] && <img src={i.product.images[0]} className="h-full w-full object-cover" alt="" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to="/product/$slug" params={{ slug: i.product?.slug ?? "" }} className="font-semibold hover:text-primary line-clamp-2">{pick(i.product, "name")}</Link>
                <div className="text-primary font-bold mt-1">{fmt(priceOf(i.product))}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button className="p-2 hover:bg-muted" onClick={() => updateQty(i.id, i.quantity - 1)}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-10 text-center font-medium">{i.quantity}</span>
                    <button className="p-2 hover:bg-muted" onClick={() => updateQty(i.id, i.quantity + 1)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => saveForLater(i.id, true)}><Bookmark className="h-3.5 w-3.5" /> Save for later</button>
                  <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => { toggleWishlist(i.product_id); removeFromCart(i.id); }}><Heart className="h-3.5 w-3.5" /> Move to wishlist</button>
                  <button className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 ms-auto" onClick={() => removeFromCart(i.id)}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              </div>
              <div className="text-right shrink-0"><div className="font-bold">{fmt(priceOf(i.product) * i.quantity)}</div></div>
            </div>
          ))}

          {saved.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-3">Saved for later ({saved.length})</h2>
              <div className="space-y-2">
                {saved.map((i) => (
                  <div key={i.id} className="rounded-xl border border-border p-3 flex items-center gap-3">
                    <div className="h-14 w-14 rounded bg-muted overflow-hidden shrink-0">
                      {i.product?.images?.[0] && <img src={i.product.images[0]} className="h-full w-full object-cover" alt="" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{pick(i.product, "name")}</div>
                      <div className="text-xs text-primary">{fmt(priceOf(i.product))}</div>
                    </div>
                    <button className="text-xs text-primary hover:underline" onClick={() => saveForLater(i.id, false)}>Move to cart</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => removeFromCart(i.id)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="card-premium p-6 h-fit space-y-3 sticky top-20">
          <h2 className="text-lg font-bold">Order Summary</h2>
          <CouponInput />
          <div className="text-sm space-y-2 pt-2 border-t border-border">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax (VAT)</span><span>{fmt(tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : fmt(shipping)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
          </div>
          <div className="text-xs text-muted-foreground">Estimated delivery: 2–5 business days</div>
          <Button className="btn-gold w-full" disabled={active.length === 0} onClick={() => nav({ to: "/checkout" })}>Proceed to checkout</Button>
          <Button asChild variant="outline" className="w-full"><Link to="/products">Continue shopping</Link></Button>
        </aside>
      </div>
    </div>
  );
}

function CouponInput() {
  const [code, setCode] = useState("");
  return (
    <div className="flex gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <Button variant="outline" size="sm" onClick={() => { if (code) alert("Coupons will be enabled soon."); }}>Apply</Button>
    </div>
  );
}
