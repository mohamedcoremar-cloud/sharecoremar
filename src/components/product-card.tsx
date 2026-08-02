import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { fmt, priceOf } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";

type Props = {
  product: any;
  /** Optional contextual ribbon, e.g. "New" */
  ribbon?: string;
  compact?: boolean;
};


export function ProductCard({ product: p, ribbon, compact = false }: Props) {
  const { pick, t } = useI18n();
  const { addToCart, toggleWishlist, wishlist } = useCart();

  const price = priceOf(p);
  const hasOffer = Boolean(p.is_offer && p.offer_price);
  const off = hasOffer && Number(p.retail_price) > 0
    ? Math.round((1 - Number(p.offer_price) / Number(p.retail_price)) * 100)
    : 0;
  const stock = Number(p.stock ?? 0);
  const lowStock = stock > 0 && stock <= 20;
  const inWishlist = wishlist?.includes(p.id);
  const name = pick(p, "name");
  const label = p.brand?.name ?? pick(p.category ?? {}, "name") ?? "";

  return (
    <div className="card-premium group relative flex flex-col overflow-hidden">
      {/* Badges */}
      <div className="pointer-events-none absolute start-3 top-3 z-10 flex flex-col items-start gap-1.5">
        {off > 0 && (
          <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-bold text-destructive-foreground shadow-sm">
            −{off}%
          </span>
        )}
        {ribbon && (
          <span className="rounded-full bg-ink/90 px-2.5 py-0.5 text-[11px] font-semibold text-background shadow-sm">
            {ribbon}
          </span>
        )}
        {stock === 0 && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-sm">
            {t("product.out_of_stock")}
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label={t("product.wishlist")}
        onClick={() => toggleWishlist(p.id)}
        className="absolute end-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-border bg-card/90 backdrop-blur transition-colors hover:bg-card"
      >
        <Heart className={`h-4 w-4 ${inWishlist ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
      </button>

      <Link
        to="/product/$slug"
        params={{ slug: p.slug }}
        className="block aspect-square overflow-hidden bg-muted"
      >
        {p.images?.[0] ? (
          <img
            src={p.images[0]}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Sparkles className="h-9 w-9 text-muted-foreground/50" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {label && (
          <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        )}
        <Link to="/product/$slug" params={{ slug: p.slug }} className="mt-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">{name}</h3>
        </Link>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-bold tracking-tight">{fmt(price)}</span>
          {hasOffer && (
            <span className="text-sm text-muted-foreground line-through">{fmt(p.retail_price)}</span>
          )}
        </div>

        {p.wholesale_price && (
          <div className="mt-1 text-xs text-muted-foreground">
            {t("product.wholesale_from")} <span className="font-semibold text-foreground">{fmt(p.wholesale_price)}</span>
            {p.min_quantity ? ` · ${t("product.min_qty")} ${p.min_quantity}` : ""}
          </div>
        )}

        <div className="mt-3 text-xs">
          {stock === 0 ? (
            <span className="text-muted-foreground">{t("product.out_of_stock")}</span>
          ) : lowStock ? (
            <span className="font-medium text-destructive">{t("product.low_stock")} · {stock}</span>
          ) : (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{t("product.in_stock")}</span>
          )}
        </div>

        {!compact && (
          <Button
            size="sm"
            className="btn-gold mt-4 w-full"
            disabled={stock === 0}
            onClick={() => addToCart(p.id, 1)}
          >
            <ShoppingCart className="me-2 h-4 w-4" /> {t("product.add_to_cart")}
          </Button>
        )}
      </div>
    </div>
  );
}
