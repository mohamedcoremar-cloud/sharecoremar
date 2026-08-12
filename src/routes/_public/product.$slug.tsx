import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Heart, Share2, ShoppingCart, Minus, Plus, Truck, ShieldCheck, Package, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { fmt, priceOf } from "@/lib/currency";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { RatingSummary, ReviewAction, ApprovedReviewList } from "@/components/product-reviews";

export const Route = createFileRoute("/_public/product/$slug")({
  component: ProductPage,
  head: () => ({
    meta: [
      { title: "Product Details — Share CoreMar" },
      { name: "description", content: "See full product details on Share CoreMar — retail and wholesale pricing, stock, specifications and the verified supplier behind it." },
      { property: "og:title", content: "Product Details — Share CoreMar" },
      { property: "og:description", content: "Retail and wholesale pricing, stock, specifications and the verified supplier behind every product." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { lang, pick } = useI18n();
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [zoom, setZoom] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await supabase.from("products").select("*, brand:brands(*), category:categories(*), supplier:public_suppliers(*)").eq("slug", slug).eq("is_active", true).maybeSingle()).data,
  });

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.category_id],
    enabled: !!product?.category_id,
    queryFn: async () => (await supabase.from("products").select("id, slug, name_en, name_ar, retail_price, offer_price, is_offer, images").eq("category_id", product!.category_id!).eq("is_active", true).neq("id", product!.id).limit(4)).data ?? [],
  });

  if (isLoading) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!product) return <div className="mx-auto max-w-7xl px-4 py-16 text-center">Product not found. <Link to="/products" className="text-primary underline">Browse all products</Link></div>;

  const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : [];
  const price = priceOf(product);
  const hasOffer = product.is_offer && product.offer_price;
  const stock = product.stock ?? 0;
  const inStock = stock > 0;
  const inWishlist = wishlist.includes(product.id);
  const name = pick(product, "name");

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) { try { await navigator.share({ title: name, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch {}
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1 flex-wrap">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/products" className="hover:text-foreground">Products</Link>
        {product.category && <><ChevronRight className="h-3 w-3" /><span>{pick(product.category, "name")}</span></>}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[240px]">{name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="aspect-square rounded-2xl border border-border bg-muted overflow-hidden relative cursor-zoom-in"
            onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}
            onMouseMove={(e) => {
              const el = e.currentTarget; const r = el.getBoundingClientRect();
              const x = ((e.clientX - r.left) / r.width) * 100;
              const y = ((e.clientY - r.top) / r.height) * 100;
              el.style.setProperty("--zx", `${x}%`); el.style.setProperty("--zy", `${y}%`);
            }}
          >
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={name}
                className="h-full w-full object-cover transition-transform duration-200"
                style={zoom ? { transformOrigin: "var(--zx) var(--zy)", transform: "scale(2)" } : {}}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center"><Sparkles className="h-12 w-12 text-muted-foreground" /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((im, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square rounded-lg border overflow-hidden ${i === activeImg ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
                  <img src={im} className="h-full w-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && <div className="text-sm text-muted-foreground">{pick(product.brand, "name") || product.brand.name}</div>}
          <h1 className="text-3xl font-bold mt-1">{name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">SKU: {product.sku || "—"}</div>

          <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight text-primary">{fmt(price)}</span>
              {hasOffer && <span className="text-lg text-muted-foreground line-through">{fmt(product.retail_price)}</span>}
              {hasOffer && (
                <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
                  −{Math.round((1 - Number(product.offer_price) / Number(product.retail_price)) * 100)}%
                </span>
              )}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Retail price · incl. unit {product.unit || "piece"}</div>

            {product.wholesale_price && (
              <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-border pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wholesale</span>
                <span className="text-xl font-bold">{fmt(product.wholesale_price)}</span>
                {product.min_quantity ? (
                  <span className="text-xs text-muted-foreground">· min {product.min_quantity} {product.unit || "pcs"}</span>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {inStock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400"><Package className="h-3.5 w-3.5" /> {stock <= 20 ? `Low stock · ${stock} left` : `In stock (${stock})`}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-destructive"><Package className="h-3.5 w-3.5" /> Out of stock</span>
            )}
          </div>


          {product.description && <p className="mt-5 text-muted-foreground leading-relaxed">{product.description}</p>}

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-border">
              <button className="p-2 hover:bg-muted" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center font-semibold">{qty}</span>
              <button className="p-2 hover:bg-muted" onClick={() => setQty(Math.min(stock || 99, qty + 1))}><Plus className="h-4 w-4" /></button>
            </div>
            <Button className="btn-gold flex-1" disabled={!inStock} onClick={() => addToCart(product.id, qty)}>
              <ShoppingCart className="h-4 w-4 me-2" /> Add to cart
            </Button>
            <Button variant="outline" size="icon" onClick={() => toggleWishlist(product.id)} aria-label="Wishlist">
              <Heart className={`h-4 w-4 ${inWishlist ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={share} aria-label="Share"><Share2 className="h-4 w-4" /></Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border border-border p-3"><Truck className="h-4 w-4 text-primary" /> Nationwide delivery</div>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3"><ShieldCheck className="h-4 w-4 text-primary" /> Verified supplier</div>
          </div>

          {product.supplier && (
            <div className="mt-6 rounded-xl border border-border p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Sold by</div>
              <div className="font-semibold mt-1">{product.supplier.company_name}</div>
              {product.supplier.city && <div className="text-sm text-muted-foreground">{product.supplier.city}{product.supplier.governorate ? `, ${product.supplier.governorate}` : ""}</div>}
            </div>
          )}
        </div>
      </div>

      {product.specifications && Object.keys(product.specifications as any).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Specifications</h2>
          <div className="rounded-xl border border-border divide-y divide-border">
            {Object.entries(product.specifications as Record<string, any>).map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold mb-4">Related products</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {related.map((p: any) => (
              <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="card-premium overflow-hidden group">
                <div className="aspect-square bg-muted">
                  {p.images?.[0] ? <img src={p.images[0]} className="h-full w-full object-cover group-hover:scale-105 transition-transform" alt="" /> : <div className="h-full flex items-center justify-center"><Sparkles className="h-8 w-8 text-muted-foreground" /></div>}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium line-clamp-2">{lang === "ar" ? p.name_ar : p.name_en}</div>
                  <div className="text-primary font-bold mt-1">{fmt(priceOf(p))}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
