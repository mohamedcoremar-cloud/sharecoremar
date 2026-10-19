import { backofficeHead } from "@/lib/backoffice-head";
import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock, Eye, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/currency";
import { OrderTimeline, statusMeta } from "@/components/order-timeline";

export const Route = createFileRoute("/admin/orders")({ head: () => backofficeHead("Orders"), component: OrdersAdmin });

const REGULAR_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];


function OrdersAdmin() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"review" | "all">("review");
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [q, setQ] = useState("");


  // Internal columns (orders.internal_notes, payments.review_note/reviewed_by) are no longer
  // readable through the tables — admins read them through these guarded admin-only functions.
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const [{ data: rows, error }, { data: pays }] = await Promise.all([
        supabase.rpc("admin_orders" as any),
        supabase.rpc("admin_payments" as any),
      ]);
      if (error) throw error;
      const byOrder = new Map<string, any[]>();
      for (const p of ((pays as any[]) ?? [])) {
        const list = byOrder.get(p.order_id) ?? [];
        list.push(p);
        byOrder.set(p.order_id, list);
      }
      return ((rows as any[]) ?? []).map((o) => ({ ...o, payments: byOrder.get(o.id) ?? [] }));
    },
  });


  const update = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: id, status, note: `Status set to ${status}` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success(tr("Updated")); },
    onError: (e: any) => toast.error(e.message),
  });

  const matching = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return orders as any[];
    return (orders as any[]).filter((o) =>
      String(o.order_number ?? "").toLowerCase().includes(ql) ||
      String(o.contact_phone ?? "").toLowerCase().includes(ql),
    );
  }, [orders, q]);

  const reviewQueue = matching.filter((o) => o.status === "pending_payment_review");
  const rest = matching.filter((o) => o.status !== "pending_payment_review");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{tr("Orders")}</h1>
        <div className="flex rounded-md border border-border overflow-hidden text-sm">
          <button onClick={() => setTab("review")} className={`px-4 py-2 flex items-center gap-2 ${tab === "review" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <Clock className="h-4 w-4" /> {tr("Payment review")}{reviewQueue.length > 0 && <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-2">{reviewQueue.length}</span>}
          </button>
          <button onClick={() => setTab("all")} className={`px-4 py-2 ${tab === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{tr("All orders")}</button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search by order number or phone…")} className="ps-9" />
      </div>


      {tab === "review" ? (
        <PaymentReviewList
          orders={reviewQueue}
          isLoading={isLoading}
          onDone={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })}
          onOpen={setDetailOrder}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-start p-3">{tr("Order #")}</th>
                  <th className="text-start p-3">{tr("Status")}</th>
                  <th className="text-start p-3">{tr("Payment")}</th>
                  <th className="text-start p-3">{tr("Total")}</th>
                  <th className="text-start p-3">{tr("Date")}</th>
                  <th className="text-start p-3">{tr("Timeline")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={6} className="p-8 text-center">{tr("Loading…")}</td></tr>
                  : rest.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{tr("No orders yet")}</td></tr>
                  : rest.map((o: any) => {
                    const pay = (o.payments ?? [])[0];
                    return (
                      <tr key={o.id} className="border-b border-border last:border-0">
                        <td className="p-3 font-mono text-xs">
                          <button onClick={() => setDetailOrder(o)} className="hover:text-primary hover:underline">
                            {o.order_number}
                          </button>
                        </td>
                        <td className="p-3">
                          <select value={o.status} onChange={(e) => update.mutate({ id: o.id, status: e.target.value })} className="rounded border border-input bg-background px-2 py-1 text-sm">
                            {REGULAR_STATUSES.map((s) => <option key={s} value={s}>{tr(s)}</option>)}
                          </select>
                        </td>
                        <td className="p-3 capitalize">{tr(o.payment_method)} · {tr(pay?.status ?? o.payment_status ?? "—")}</td>
                        <td className="p-3 font-semibold">{fmt(o.total)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <Button variant="outline" size="sm" onClick={() => setDetailOrder(o)}>
                            <Eye className="h-4 w-4 me-1" /> {tr("View")}</Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrderDetailDialog order={detailOrder} onClose={() => setDetailOrder(null)} />
    </div>
  );

}

function PaymentReviewList({ orders, isLoading, onDone, onOpen }: { orders: any[]; isLoading: boolean; onDone: () => void; onOpen: (order: any) => void }) {
  const { tr } = useI18n();
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">{tr("Loading…")}</div>;
  if (orders.length === 0) return (
    <div className="card-premium p-16 text-center">
      <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
      <p className="text-muted-foreground">{tr("No orders awaiting payment review.")}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      {orders.map((o) => <ReviewCard key={o.id} order={o} onDone={onDone} onOpen={onOpen} />)}
    </div>
  );
}

/** Read-only admin view of one order: items, summary and the full fulfillment timeline
 *  (reuses the same OrderTimeline component as the buyer-facing order page). */
function OrderDetailDialog({ order, onClose }: { order: any; onClose: () => void }) {
  const { tr } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-order-detail", order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const [{ data: items }, { data: history }, { data: profile }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", order.id),
        // Admin sees every stage, internal notes included.
        supabase.from("order_status_history").select("*").eq("order_id", order.id).order("seq"),
        order.buyer_id
          ? supabase.from("profiles").select("ref_code, email").eq("id", order.buyer_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return { items: items ?? [], history: history ?? [], profile: profile as any };
    },
  });

  if (!order) return null;
  const meta = statusMeta(order.status);
  const Icon = meta.icon;
  const addr: any = order.shipping_address;
  const pay = (order.payments ?? [])[0];

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${meta.color}`} /> {tr("Order")}{order.order_number}
            {data?.profile?.ref_code && (
              <span className="ms-2 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">
                {tr("Customer")}{data.profile.ref_code}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{tr("Current status")}</div>
            <div className={`font-semibold ${meta.color}`}>{tr(meta.label)}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {tr("Payment:")}{tr(order.payment_method)} · {tr(pay?.status ?? order.payment_status ?? "—")}
            </div>
            {pay?.transfer_reference && <div className="text-xs text-muted-foreground">{tr("Ref:")}{pay.transfer_reference}</div>}
            <div className="font-semibold pt-1">{fmt(order.total)}</div>
            <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
          </div>
          {addr && (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{tr("Delivery to")}</div>
              <div>{addr.full_name}</div>
              <div className="text-muted-foreground">{addr.phone}</div>
              <div className="text-muted-foreground">{addr.street}, {addr.city}, {addr.governorate}</div>
              {order.internal_notes && <div className="text-xs text-muted-foreground">{tr("Internal:")}{order.internal_notes}</div>}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h3 className="font-bold mb-2">{tr("Items")}</h3>
          {isLoading ? <div className="text-sm text-muted-foreground">{tr("Loading…")}</div> : (
            <div className="space-y-2">
              {(data?.items ?? []).map((i: any) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.product_name} × {i.quantity}</span>
                  <span className="font-medium">{fmt(i.total_price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-3">{tr("Fulfillment timeline")}</h3>
          {isLoading ? <div className="text-sm text-muted-foreground">{tr("Loading…")}</div> : <OrderTimeline history={data?.history ?? []} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ order, onDone, onOpen }: { order: any; onDone: () => void; onOpen: (order: any) => void }) {
  const { tr } = useI18n();

  const pay = (order.payments ?? []).find((p: any) => p.status === "pending") ?? (order.payments ?? [])[0];
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  async function approve() {
  const { tr } = useI18n();
    setBusy(true);
    const { error } = await supabase.rpc("approve_order_payment" as any, { p_order_id: order.id, p_note: null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Payment approved, stock deducted"));
    onDone();
  }

  async function reject() {
  const { tr } = useI18n();
    if (!reason.trim()) return toast.error(tr("Please enter a reason"));
    setBusy(true);
    const { error } = await supabase.rpc("reject_order_payment" as any, { p_order_id: order.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("Payment rejected"));
    setRejectOpen(false);
    onDone();
  }

  return (
    <div className="card-premium p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{order.order_number}</div>
          <div className="text-lg font-bold mt-1">{fmt(order.total)} · <span className="capitalize">{tr(order.payment_method)}</span></div>
          <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpen(order)}><Eye className="h-4 w-4 me-1" /> {tr("View")}</Button>

          <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}><XCircle className="h-4 w-4 me-1" /> {tr("Reject")}</Button>
          <Button className="btn-gold" onClick={approve} disabled={busy}><CheckCircle2 className="h-4 w-4 me-1" /> {busy ? tr("Working…") : tr("Approve")}</Button>
        </div>
      </div>

      <div className="grid gap-4 mt-4 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{tr("Transfer reference")}</div>
          <div className="font-mono">{pay?.transfer_reference ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{tr("Amount")}</div>
          <div className="font-semibold">{fmt(pay?.amount ?? order.total)} {pay?.currency ?? "EGP"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">{tr("Submitted")}</div>
          <div>{pay?.transferred_at ? new Date(pay.transferred_at).toLocaleString() : "—"}</div>
        </div>
      </div>

      {pay?.proof_url ? (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">{tr("Proof of transfer")}</div>
          <button onClick={() => setProofOpen(true)} className="block">
            <img src={pay.proof_url} alt={tr("proof")} className="h-32 rounded-lg border border-border hover:border-primary object-cover" />
          </button>
        </div>
      ) : (
        <div className="mt-4 text-xs text-destructive">{tr("No proof uploaded.")}</div>
      )}

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{tr("Proof of transfer —")}{order.order_number}</DialogTitle></DialogHeader>
          {pay?.proof_url && <img src={pay.proof_url} alt={tr("proof")} className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tr("Reject payment")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{tr("The customer will be asked to re-upload a valid proof.")}</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={tr("Reason (e.g. amount mismatch, unclear screenshot)")} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{tr("Cancel")}</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>{tr("Reject payment")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
