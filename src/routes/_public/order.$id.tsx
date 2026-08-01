import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Package, Truck, Home, Clock, XCircle } from "lucide-react";
import { fmt } from "@/lib/currency";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/order/$id")({ component: OrderPage });

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500" },
  pending_payment_review: { label: "Awaiting payment review", icon: Clock, color: "text-amber-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-500" },
  processing: { label: "Preparing", icon: Package, color: "text-blue-500" },
  packed: { label: "Packed", icon: Package, color: "text-blue-500" },
  shipped: { label: "Shipped", icon: Truck, color: "text-indigo-500" },
  delivered: { label: "Delivered", icon: Home, color: "text-emerald-500" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-500" },
  refunded: { label: "Refunded", icon: XCircle, color: "text-red-500" },
};

function OrderPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const [{ data: order }, { data: items }, { data: history }, { data: payments }, { data: deliveries }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("order_status_history").select("*").eq("order_id", id).eq("is_internal", false).order("created_at"),
        supabase.from("payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        (supabase as any)
          .from("deliveries")
          .select("*, delivery_statuses(code,name_en,name_ar), delivery_partners(name_en,name_ar), delivery_attempts(*, delivery_failure_reasons(code,name_en,name_ar))")
          .eq("order_id", id),
      ]);
      return { order, items: items ?? [], history: history ?? [], payment: payments?.[0] ?? null, delivery: (deliveries as any[])?.[0] ?? null };
    },
  });

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-16">Loading…</div>;
  if (!data?.order) return <div className="mx-auto max-w-4xl px-4 py-16 text-center">Order not found</div>;

  const { order, items, history, payment, delivery } = data;
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  const addr: any = order.shipping_address;
  const paymentStatus: string = payment?.status ?? order.payment_status;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card-premium p-8 text-center mb-6">
        <div className={`mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ${meta.color}`}><Icon className="h-8 w-8" /></div>
        <h1 className="text-2xl font-bold">Thank you — order {order.order_number}</h1>
        <p className="text-muted-foreground mt-1">Status: <span className={`font-semibold ${meta.color}`}>{meta.label}</span></p>
        {order.status === "pending_payment_review" && (
          <p className="text-xs text-muted-foreground mt-2">We received your transfer proof and will confirm within a few hours.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <h2 className="font-bold mb-4">Items</h2>
            <div className="space-y-3">
              {items.map((i: any) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <div><div className="font-medium">{i.product_name}</div><div className="text-muted-foreground">Qty {i.quantity} × {fmt(i.unit_price)}</div></div>
                  <div className="font-semibold">{fmt(i.total_price)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-premium p-6">
            <h2 className="font-bold mb-4">Timeline</h2>
            <div className="space-y-3">
              {history.length === 0 && <div className="text-sm text-muted-foreground">No updates yet.</div>}
              {history.map((h: any) => {
                const m = STATUS_META[h.status] ?? STATUS_META.pending;
                const I = m.icon;
                return (
                  <div key={h.id} className="flex gap-3">
                    <I className={`h-5 w-5 mt-0.5 ${m.color}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{m.label}</div>
                      {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-premium p-6 text-sm space-y-2">
            <h2 className="font-bold mb-2">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(order.tax)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{fmt(order.shipping)}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{fmt(order.discount)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span className="text-primary">{fmt(order.total)}</span></div>
            <div className="pt-2 text-xs text-muted-foreground capitalize">Payment: {order.payment_method} · {paymentStatus}</div>
            {payment?.transfer_reference && <div className="text-xs text-muted-foreground">Ref: {payment.transfer_reference}</div>}
          </div>

          {delivery && <DeliveryCard delivery={delivery} />}

          {addr && (
            <div className="card-premium p-6 text-sm">
              <h2 className="font-bold mb-2">Delivery to</h2>
              <div>{addr.full_name}</div>
              <div className="text-muted-foreground">{addr.phone}</div>
              <div className="text-muted-foreground">{addr.street}, {addr.city}, {addr.governorate}</div>
            </div>
          )}
          <Button asChild variant="outline" className="w-full"><Link to="/orders">View all orders</Link></Button>
        </div>
      </div>
    </div>
  );
}
