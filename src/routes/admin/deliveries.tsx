import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { fmt } from "@/lib/currency";
import { deliveryIcon, DELIVERY_TRANSITIONS } from "@/lib/delivery";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/admin/deliveries")({ component: DeliveriesAdmin });

function DeliveriesAdmin() {
  const { tr } = useI18n();
  const { pick } = useI18n();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: statuses = [] } = useQuery({
    queryKey: ["delivery-statuses"],
    queryFn: async () => (await (supabase as any).from("delivery_statuses").select("*").order("sort_order")).data ?? [],
  });
  const { data: reasons = [] } = useQuery({
    queryKey: ["delivery-reasons"],
    queryFn: async () => (await (supabase as any).from("delivery_failure_reasons").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["admin-deliveries"],
    queryFn: async () => (await (supabase as any)
      .from("deliveries")
      .select("*, delivery_statuses(code,name_en,name_ar), delivery_partners(name_en,name_ar,type), orders(order_number,total,status,contact_phone,shipping_address), delivery_attempts(*)")
      .order("created_at", { ascending: false })).data ?? [],
  });

  const active = (deliveries as any[]).find((d) => d.id === openId) ?? null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><Truck className="h-7 w-7" /> {tr("Deliveries")}</h1>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">{tr("Loading…")}</div>
      ) : deliveries.length === 0 ? (
        <div className="card-premium p-16 text-center text-muted-foreground">
          {tr("No deliveries yet. A delivery row is created automatically when an order is confirmed.")}</div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-start p-3">{tr("Order #")}</th>
                  <th className="text-start p-3">{tr("Delivery status")}</th>
                  <th className="text-start p-3">{tr("Partner")}</th>
                  <th className="text-start p-3">{tr("Attempts")}</th>
                  <th className="text-start p-3">{tr("Scheduled")}</th>
                  <th className="text-start p-3">{tr("Total")}</th>
                  <th className="text-end p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(deliveries as any[]).map((d) => {
                  const code = d.delivery_statuses?.code;
                  const { icon: Icon, color } = deliveryIcon(code);
                  return (
                    <tr key={d.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-mono text-xs">{d.orders?.order_number}</td>
                      <td className={`p-3 font-medium ${color}`}>
                        <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {pick(d.delivery_statuses ?? {}, "name")}</span>
                      </td>
                      <td className="p-3">{d.delivery_partners ? pick(d.delivery_partners, "name") : "—"}</td>
                      <td className="p-3">{d.attempts_count}</td>
                      <td className="p-3 text-muted-foreground">{d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : "—"}</td>
                      <td className="p-3 font-semibold">{fmt(d.orders?.total ?? 0)}</td>
                      <td className="p-3 text-end">
                        <Button size="sm" variant="outline" onClick={() => setOpenId(d.id)}>{tr("Manage")}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active && (
        <ManageDialog
          delivery={active}
          statuses={statuses as any[]}
          reasons={reasons as any[]}
          onClose={() => setOpenId(null)}
          onDone={() => { qc.invalidateQueries({ queryKey: ["admin-deliveries"] }); qc.invalidateQueries({ queryKey: ["admin-orders"] }); setOpenId(null); }}
        />
      )}
    </div>
  );
}

function ManageDialog({ delivery, statuses, reasons, onClose, onDone }: any) {
  const { tr } = useI18n();
  const { pick } = useI18n();
  const current: string = delivery.delivery_statuses?.code ?? "assigned";
  const allowed: string[] = DELIVERY_TRANSITIONS[current] ?? [];
  const [next, setNext] = useState<string>(allowed[0] ?? "");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [reschedule, setReschedule] = useState("");
  const [busy, setBusy] = useState(false);

  const attempts = (delivery.delivery_attempts ?? []).slice().sort((a: any, b: any) => a.attempt_number - b.attempt_number);

  async function submit() {
  const { tr } = useI18n();
    if (!next) return;
    if (next === "failed" && !reason) return toast.error(tr("Please select a failure reason"));
    setBusy(true);
    const { error } = await (supabase as any).rpc("update_delivery_status", {
      p_delivery_id: delivery.id,
      p_new_status_code: next,
      p_note: note.trim() || null,
      p_failure_reason_code: next === "failed" ? reason : null,
      p_reschedule_at: reschedule ? new Date(reschedule).toISOString() : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(next === "failed" ? "Delivery attempt recorded — order stays open for rescheduling" : "Delivery updated");
    onDone();
  }

  const label = (code: string) => {
    const s = statuses.find((x: any) => x.code === code);
    return s ? pick(s, "name") : code;
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{tr("Delivery —")}{delivery.orders?.order_number}</DialogTitle></DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">{tr("Current delivery status")}</div>
            <div className="font-semibold">{label(current)}</div>
            {delivery.scheduled_at && <div className="text-xs text-muted-foreground mt-1">{tr("Scheduled:")}{new Date(delivery.scheduled_at).toLocaleString()}</div>}
          </div>

          {attempts.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">{tr("Delivery attempts")}</div>
              <div className="space-y-1">
                {attempts.map((a: any) => (
                  <div key={a.id} className="text-xs">
                    #{a.attempt_number} · <span className={a.result === "delivered" ? "text-emerald-500" : "text-red-500"}>{tr(a.result)}</span>
                    {a.note ? ` · ${a.note}` : ""} · {new Date(a.attempted_at).toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allowed.length === 0 ? (
            <p className="text-muted-foreground">{tr("This delivery reached a final state; no further transitions are allowed.")}</p>
          ) : (
            <>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{tr("New status")}</div>
                <select value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2">
                  {allowed.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                </select>
              </div>

              {next === "failed" && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("Failure reason (required)")}</div>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2">
                    <option value="">{tr("Select a reason…")}</option>
                    {reasons.map((r: any) => <option key={r.code} value={r.code}>{pick(r, "name")}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">{tr("The order stays open so the delivery can be rescheduled.")}</p>
                </div>
              )}

              {(next === "rescheduled" || next === "failed") && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("Proposed new delivery time")}</div>
                  <input type="datetime-local" value={reschedule} onChange={(e) => setReschedule(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
                </div>
              )}

              <div>
                <div className="text-xs text-muted-foreground mb-1">{tr("Note")}</div>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tr("Close")}</Button>
          {allowed.length > 0 && <Button className="btn-gold" onClick={submit} disabled={busy}>{busy ? tr("Working…") : "Update delivery"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
