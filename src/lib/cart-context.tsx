import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  saved_for_later: boolean;
  product?: any;
};

interface CartCtx {
  items: CartRow[];
  wishlist: string[];
  loading: boolean;
  count: number;
  addToCart: (productId: string, qty?: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  saveForLater: (id: string, saved: boolean) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CartCtx | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartRow[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setWishlist([]); return; }
    setLoading(true);
    const [{ data: c }, { data: w }] = await Promise.all([
      supabase.from("cart_items").select("id, product_id, quantity, saved_for_later, product:products(*)").eq("user_id", user.id),
      supabase.from("wishlist_items").select("product_id").eq("user_id", user.id),
    ]);
    setItems((c ?? []) as any);
    setWishlist((w ?? []).map((x: any) => x.product_id));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  async function requireAuth() {
    if (!user) { toast.error("Please sign in first"); return false; }
    return true;
  }

  const addToCart: CartCtx["addToCart"] = async (productId, qty = 1) => {
    if (!(await requireAuth())) return;
    const existing = items.find((i) => i.product_id === productId && !i.saved_for_later);
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qty, saved_for_later: false }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").upsert({ user_id: user!.id, product_id: productId, quantity: qty, saved_for_later: false }, { onConflict: "user_id,product_id" });
    }
    await refresh();
    toast.success("Added to cart");
  };

  const removeFromCart: CartCtx["removeFromCart"] = async (id) => {
    await supabase.from("cart_items").delete().eq("id", id);
    await refresh();
  };

  const updateQty: CartCtx["updateQty"] = async (id, qty) => {
    if (qty <= 0) return removeFromCart(id);
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    await refresh();
  };

  const saveForLater: CartCtx["saveForLater"] = async (id, saved) => {
    await supabase.from("cart_items").update({ saved_for_later: saved }).eq("id", id);
    await refresh();
  };

  const toggleWishlist: CartCtx["toggleWishlist"] = async (productId) => {
    if (!(await requireAuth())) return;
    if (wishlist.includes(productId)) {
      await supabase.from("wishlist_items").delete().eq("user_id", user!.id).eq("product_id", productId);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user!.id, product_id: productId });
      toast.success("Added to wishlist");
    }
    await refresh();
  };

  const clearCart: CartCtx["clearCart"] = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    await refresh();
  };

  const active = items.filter((i) => !i.saved_for_later);
  const count = active.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, wishlist, loading, count, addToCart, removeFromCart, updateQty, saveForLater, toggleWishlist, clearCart, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
