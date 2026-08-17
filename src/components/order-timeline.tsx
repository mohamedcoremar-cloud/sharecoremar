import { CheckCircle2, Package, Truck, Home, Clock, XCircle } from "lucide-react";
import { STAGE_META } from "@/lib/fulfillment";

/** Shared status/stage presentation used by the buyer order page and the admin order view. */
export const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-500" },
  pending_payment_review: { label: "Awaiting payment review", icon: Clock, color: "text-amber-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-500" },
  processing: { label: "Preparing", icon: Package, color: "text-blue-500" },
  packed: { label: "Packed", icon: Package, color: "text-blue-500" },
  shipped: { label: "Shipped", icon: Truck, color: "text-indigo-500" },
  delivered: { label: "Delivered", icon: Home, color: "text-emerald-500" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-500" },
  refunded: { label: "Refunded", icon: XCircle, color: "text-red-500" },
  // Fulfillment loop stages (stored in order_status_history only).
  ...Object.fromEntries(
    Object.entries(STAGE_META).map(([code, m]) => [code, { label: m.en, icon: m.icon, color: m.color }]),
  ),
};

export function statusMeta(code?: string | null) {
  return STATUS_META[code ?? ""] ?? STATUS_META.pending;
}

/** Read-only fulfillment timeline rendered from order_status_history rows. */
export function OrderTimeline({ history }: { history: any[] }) {
  return (
    <div className="space-y-3">
      {history.length === 0 && <div className="text-sm text-muted-foreground">No updates yet.</div>}
      {history.map((h: any) => {
        const m = statusMeta(h.status);
        const I = m.icon;
        return (
          <div key={h.id} className="flex gap-3">
            <I className={`h-5 w-5 mt-0.5 ${m.color}`} />
            <div className="flex-1">
              <div className="font-medium text-sm">
                {m.label}
                {h.is_internal && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    internal
                  </span>
                )}
              </div>
              {h.supplier_ready_eta && (
                <div className="text-xs text-muted-foreground">Ready in: {h.supplier_ready_eta}</div>
              )}
              {h.logistics_delivery_eta && (
                <div className="text-xs text-muted-foreground">Delivery timeframe: {h.logistics_delivery_eta}</div>
              )}
              {h.driver_name && (
                <div className="text-xs text-muted-foreground">
                  Driver: {h.driver_name}
                  {h.driver_phone ? ` · ${h.driver_phone}` : ""}
                  {h.vehicle_info ? ` · ${h.vehicle_info}` : ""}
                </div>
              )}
              {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
              <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
