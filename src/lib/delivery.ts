import { Truck, PackageCheck, PackageSearch, CalendarClock, XCircle, CheckCircle2, Ban } from "lucide-react";

/** Visual metadata only. Labels ALWAYS come from delivery_statuses (DB). */
export const DELIVERY_ICONS: Record<string, { icon: any; color: string }> = {
  assigned: { icon: PackageSearch, color: "text-amber-500" },
  picked_up: { icon: PackageCheck, color: "text-blue-500" },
  out_for_delivery: { icon: Truck, color: "text-indigo-500" },
  rescheduled: { icon: CalendarClock, color: "text-amber-500" },
  failed: { icon: XCircle, color: "text-red-500" },
  delivered: { icon: CheckCircle2, color: "text-emerald-500" },
  cancelled: { icon: Ban, color: "text-muted-foreground" },
};

export function deliveryIcon(code?: string | null) {
  return DELIVERY_ICONS[code ?? ""] ?? { icon: PackageSearch, color: "text-muted-foreground" };
}

/** Mirrors the transition map enforced inside update_delivery_status(). */
export const DELIVERY_TRANSITIONS: Record<string, string[]> = {
  assigned: ["picked_up", "out_for_delivery", "cancelled"],
  picked_up: ["out_for_delivery", "failed", "cancelled"],
  out_for_delivery: ["delivered", "failed", "cancelled"],
  failed: ["rescheduled", "cancelled"],
  rescheduled: ["out_for_delivery", "picked_up", "failed", "cancelled"],
  delivered: [],
  cancelled: [],
};
