import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { fmt, priceOf } from "@/lib/currency";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Upload } from "lucide-react";
import { uploadFile } from "@/components/admin/media-picker";

export const Route = createFileRoute("/_public/checkout")({ component: CheckoutPage });

const EGY_GOV = [
  "Cairo","Giza","Alexandria","Qalyubia","Sharqia","Dakahlia","Beheira","Kafr El Sheikh","Gharbia","Monufia",
  "Damietta","Port Said","Ismailia","Suez","North Sinai","South Sinai","Red Sea","Matrouh","Fayoum","Beni Suef",
  "Minya","Assiut","Sohag","Qena","Luxor","Aswan","New Valley",
];

function CheckoutPage() {
  const { user } = useAuth();
  const { pick } = useI18n();
  const { items, clearCart } = useCart();
  const nav = useNavigate();
  const active = items.filter((i) => !i.saved_for_later);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [payment, setPayment] = useState<string>("cod");
  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [proof, setProof] = useState<{ id: string | null; url: string } | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const requiresProof = payment === "instapay" || payment === "wallet";

  // Address form
  const [af, setAf] = useState({ label: "Home", full_name: "", phone: "", governorate: "Cairo", city: "", street: "", building: "", apartment: "", landmark: "" });

  const { data: addresses = [], refetch: refetchAddr } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id).order("is_default", { ascending: false })).data ?? [],
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["pm-enabled"],
    queryFn: async () => (await supabase.from("payment_methods").select("code, name_en, name_ar, description_en, description_ar, instructions_en, instructions_ar, icon_url").eq("is_enabled", true).eq("is_available_at_launch", true).order("sort_order")).data ?? [],
  });

  useEffect(() => {
    if (addresses.length > 0 && !addressId) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  const subtotal = active.reduce((s, i) => s + priceOf(i.product) * i.quantity, 0);
  const tax = active.reduce((s, i) => s + priceOf(i.product) * i.quantity * (Number(i.product?.tax_rate ?? 0) / 100), 0);
  const shipping = subtotal > 2000 ? 0 : 50;
  const total = subtotal + tax + shipping;

  if (!user) return <div className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-muted-foreground mb-4">Sign in to checkout.</p><Button asChild className="btn-gold"><Link to="/auth">Sign in</Link></Button></div>;
  if (active.length === 0) return <div className="mx-auto max-w-md px-4 py-20 text-center"><p className="text-muted-foreground mb-4">Your cart is empty.</p><Button asChild className="btn-gold"><Link to="/products">Browse products</Link></Button></div>;

  async function saveAddress() {
    if (!af.full_name || !af.phone || !af.street || !af.city) { toast.error("Please fill required fields"); return; }
    const { data, error } = await supabase.from("addresses").insert({ ...af, user_id: user!.id, is_default: addresses.length === 0 }).select().single();
    if (error) { toast.error(error.message); return; }
    setAddressId(data.id);
    await refetchAddr();
    toast.success("Address saved");
  }

  async function placeOrder() {
    if (!addressId) { toast.error("Please select or add a delivery address"); return; }
    if (requiresProof && (!proof || !transferRef.trim())) {
      toast.error("Please upload proof of transfer and enter the reference number");
      return;
    }
    setPlacing(true);
    try {
      const addr = addresses.find((a: any) => a.id === addressId);
      const orderNumber = `SC-${Date.now().toString().slice(-8)}`;
      const initialStatus = requiresProof ? "pending_payment_review" : "pending";
      const { data: order, error } = await supabase.from("orders").insert({
        buyer_id: user!.id,
        order_number: orderNumber,
        subtotal, tax, shipping, discount: 0, total,
        payment_method: payment as any,
        payment_status: "pending",
        status: initialStatus as any,
        currency: "EGP",
        shipping_address: addr,
        address_id: addressId,
        contact_phone: addr?.phone,
        customer_email: user!.email,
        notes,
      }).select().single();
      if (error) throw error;

      const itemsInsert = active.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.product?.name_en ?? "Product",
        quantity: i.quantity,
        unit_price: priceOf(i.product),
        total_price: priceOf(i.product) * i.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemsInsert);
      if (itemsErr) throw itemsErr;

      // Create payment record (source of truth)
      const { error: payErr } = await supabase.from("payments").insert({
        order_id: order.id,
        method: payment as any,
        amount: total,
        currency: "EGP",
        status: "pending",
        transfer_reference: requiresProof ? transferRef.trim() : null,
        proof_media_id: requiresProof ? proof?.id ?? null : null,
        proof_url: requiresProof ? proof?.url ?? null : null,
        transferred_at: requiresProof ? new Date().toISOString() : null,
      });
      if (payErr) throw payErr;

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: initialStatus,
        note: requiresProof ? "Awaiting payment review" : "Order placed",
        created_by: user!.id,
      });
      await clearCart();
      nav({ to: "/order/$id", params: { id: order.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  async function handleProofFile(f: File | null) {
    if (!f) return;
    setUploadingProof(true);
    const res = await uploadFile(f);
    setUploadingProof(false);
    if (res) setProof({ id: res.id, url: res.url });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="mb-6 flex items-center gap-2 text-sm">
        {[1,2,3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold ${step >= (s as any) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
            <span className={step >= (s as any) ? "font-medium" : "text-muted-foreground"}>{s===1?"Address":s===2?"Payment":"Review"}</span>
            {s < 3 && <div className="w-8 h-px bg-border mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-bold">Delivery Address</h2>
              {addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map((a: any) => (
                    <label key={a.id} className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${addressId === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                      <div className="text-sm">
                        <div className="font-semibold">{a.full_name} · {a.phone}</div>
                        <div className="text-muted-foreground">{a.street}, {a.city}, {a.governorate}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <details className="rounded-xl border border-border p-4">
                <summary className="cursor-pointer font-medium">+ Add new address</summary>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input label="Full name *" value={af.full_name} onChange={(v) => setAf({ ...af, full_name: v })} />
                  <Input label="Phone *" value={af.phone} onChange={(v) => setAf({ ...af, phone: v })} />
                  <div>
                    <label className="text-xs text-muted-foreground">Governorate *</label>
                    <select value={af.governorate} onChange={(e) => setAf({ ...af, governorate: e.target.value })} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      {EGY_GOV.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <Input label="City *" value={af.city} onChange={(v) => setAf({ ...af, city: v })} />
                  <Input label="Street *" value={af.street} onChange={(v) => setAf({ ...af, street: v })} />
                  <Input label="Building" value={af.building} onChange={(v) => setAf({ ...af, building: v })} />
                  <Input label="Apartment" value={af.apartment} onChange={(v) => setAf({ ...af, apartment: v })} />
                  <Input label="Landmark" value={af.landmark} onChange={(v) => setAf({ ...af, landmark: v })} />
                </div>
                <Button className="mt-4" onClick={saveAddress}>Save address</Button>
              </details>
              <Button className="btn-gold" disabled={!addressId} onClick={() => setStep(2)}>Continue to payment</Button>
            </div>
          )}

          {step === 2 && (
            <div className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-bold">Payment Method</h2>
              <div className="space-y-2">
                {methods.map((m: any) => (
                  <label key={m.code} className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${payment === m.code ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" checked={payment === m.code} onChange={() => setPayment(m.code)} className="mt-1" />
                    <div>
                      <div className="font-semibold">{pick(m, "name")}</div>
                      <div className="text-sm text-muted-foreground">{pick(m, "description")}</div>
                      {payment === m.code && pick(m, "instructions") && <div className="mt-2 text-xs text-primary">{pick(m, "instructions")}</div>}
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Order notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="btn-gold" onClick={() => setStep(3)}>Review order</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-bold">Review your order</h2>
              <div className="space-y-2">
                {active.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="h-14 w-14 rounded bg-muted overflow-hidden">{i.product?.images?.[0] && <img src={i.product.images[0]} className="h-full w-full object-cover" alt="" />}</div>
                    <div className="flex-1 text-sm"><div className="font-medium">{pick(i.product, "name")}</div><div className="text-muted-foreground">Qty {i.quantity}</div></div>
                    <div className="font-semibold">{fmt(priceOf(i.product) * i.quantity)}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button className="btn-gold flex-1" disabled={placing} onClick={placeOrder}>
                  {placing ? <><Loader2 className="h-4 w-4 me-2 animate-spin" /> Placing…</> : <><CheckCircle2 className="h-4 w-4 me-2" /> Place order</>}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="card-premium p-6 h-fit space-y-3 sticky top-20">
          <h2 className="text-lg font-bold">Summary</h2>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : fmt(shipping)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span className="text-primary">{fmt(total)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}
