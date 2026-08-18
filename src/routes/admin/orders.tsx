import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { fmt } from "@/lib/currency";
import { OrderTimeline, statusMeta } from "@/components/order-timeline";

export const Route = createFileRoute("/admin/orders")({ component: OrdersAdmin });

const REGULAR_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];


function OrdersAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"review" | "all">("review");
  const [detailOrder, setDetailOrder] = useState<any>(null);


  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase
      .from("orders")
      .select("*, payments(*)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: id, status, note: `Status set to ${status}` });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewQueue = (orders as any[]).filter((o) => o.status === "pending_payment_review");
  const rest = (orders as any[]).filter((o) => o.status !== "pending_payment_review");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="flex rounded-md border border-border overflow-hidden text-sm">
          <button onClick={() => setTab("review")} className={`px-4 py-2 flex items-center gap-2 ${tab === "review" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <Clock className="h-4 w-4" /> Payment review
            {reviewQueue.length > 0 && <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-2">{reviewQueue.length}</span>}
          </button>
          <button onClick={() => setTab("all")} className={`px-4 py-2 ${tab === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>All orders</button>
        </div>
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
                  <th className="text-left p-3">Order #</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="text-left p-3">Total</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={6} className="p-8 text-center">Loading…</td></tr>
                  : rest.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No orders yet</td></tr>
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
                            {REGULAR_STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-3 capitalize">{o.payment_method} · {pay?.status ?? o.payment_status}</td>
                        <td className="p-3 font-semibold">{fmt(o.total)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <Button variant="outline" size="sm" onClick={() => setDetailOrder(o)}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
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

function PaymentReviewList({ orders, isLoading, onDone }: { orders: any[]; isLoading: boolean; onDone: () => void }) {
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (orders.length === 0) return (
    <div className="card-premium p-16 text-center">
      <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
      <p className="text-muted-foreground">No orders awaiting payment review.</p>
    </div>
  );
  return (
    <div className="space-y-4">
      {orders.map((o) => <ReviewCard key={o.id} order={o} onDone={onDone} />)}
    </div>
  );
}

function ReviewCard({ order, onDone }: { order: any; onDone: () => void }) {
  const pay = (order.payments ?? []).find((p: any) => p.status === "pending") ?? (order.payments ?? [])[0];
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [proofOpen, setProofOpen] = useState(false);

  async function approve() {
    setBusy(true);
    const { error } = await supabase.rpc("approve_order_payment" as any, { p_order_id: order.id, p_note: null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment approved, stock deducted");
    onDone();
  }

  async function reject() {
    if (!reason.trim()) return toast.error("Please enter a reason");
    setBusy(true);
    const { error } = await supabase.rpc("reject_order_payment" as any, { p_order_id: order.id, p_reason: reason.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment rejected");
    setRejectOpen(false);
    onDone();
  }

  return (
    <div className="card-premium p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{order.order_number}</div>
          <div className="text-lg font-bold mt-1">{fmt(order.total)} · <span className="capitalize">{order.payment_method}</span></div>
          <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={busy}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
          <Button className="btn-gold" onClick={approve} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1" /> {busy ? "Working…" : "Approve"}</Button>
        </div>
      </div>

      <div className="grid gap-4 mt-4 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Transfer reference</div>
          <div className="font-mono">{pay?.transfer_reference ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Amount</div>
          <div className="font-semibold">{fmt(pay?.amount ?? order.total)} {pay?.currency ?? "EGP"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Submitted</div>
          <div>{pay?.transferred_at ? new Date(pay.transferred_at).toLocaleString() : "—"}</div>
        </div>
      </div>

      {pay?.proof_url ? (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">Proof of transfer</div>
          <button onClick={() => setProofOpen(true)} className="block">
            <img src={pay.proof_url} alt="proof" className="h-32 rounded-lg border border-border hover:border-primary object-cover" />
          </button>
        </div>
      ) : (
        <div className="mt-4 text-xs text-destructive">No proof uploaded.</div>
      )}

      <Dialog open={proofOpen} onOpenChange={setProofOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Proof of transfer — {order.order_number}</DialogTitle></DialogHeader>
          {pay?.proof_url && <img src={pay.proof_url} alt="proof" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The customer will be asked to re-upload a valid proof.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (e.g. amount mismatch, unclear screenshot)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>Reject payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
