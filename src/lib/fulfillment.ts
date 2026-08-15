import {
  Clock, ChefHat, PackageCheck, Handshake, Truck, Navigation, Home,
} from "lucide-react";

/** The 6 fulfillment stages added in the Supplier/Logistics loop, plus `delivered`.
 *  Stored ONLY as rows in order_status_history — never as a column. */
export const FULFILLMENT_STAGES = [
  "queued_at_supplier",
  "supplier_preparing",
  "ready_for_pickup",
  "accepted_by_logistics",
  "picked_up_by_logistics",
  "in_transit",
  "delivered",
] as const;

export type FulfillmentStage = (typeof FULFILLMENT_STAGES)[number];

export const STAGE_META: Record<
  string,
  { en: string; ar: string; icon: any; color: string }
> = {
  queued_at_supplier: { en: "Queued at supplier", ar: "في انتظار المورد", icon: Clock, color: "text-amber-500" },
  supplier_preparing: { en: "Supplier preparing", ar: "جاري التجهيز", icon: ChefHat, color: "text-amber-500" },
  ready_for_pickup: { en: "Ready for pickup", ar: "تم التجهيز — جاهز للاستلام", icon: PackageCheck, color: "text-blue-500" },
  accepted_by_logistics: { en: "Accepted by logistics", ar: "تم قبول المهمة", icon: Handshake, color: "text-blue-500" },
  picked_up_by_logistics: { en: "Collected from supplier", ar: "تم الاستلام من المورد", icon: Truck, color: "text-indigo-500" },
  in_transit: { en: "In transit", ar: "في الطريق إليك", icon: Navigation, color: "text-indigo-500" },
  delivered: { en: "Delivered", ar: "تم التسليم", icon: Home, color: "text-emerald-500" },
};

export function stageMeta(code?: string | null) {
  return STAGE_META[code ?? ""] ?? null;
}

export function stageIndex(code?: string | null) {
  return FULFILLMENT_STAGES.indexOf((code ?? "") as FulfillmentStage);
}

/** Mirrors the transition maps enforced inside the SECURITY DEFINER RPCs. */
export const SUPPLIER_NEXT: Record<string, FulfillmentStage[]> = {
  queued_at_supplier: ["supplier_preparing"],
  supplier_preparing: ["ready_for_pickup"],
};

export const LOGISTICS_NEXT: Record<string, FulfillmentStage[]> = {
  ready_for_pickup: ["accepted_by_logistics"],
  accepted_by_logistics: ["picked_up_by_logistics"],
  picked_up_by_logistics: ["in_transit"],
  in_transit: ["delivered"],
};

export const ETA_PRESETS = [
  { value: "خلال ساعة", en: "Within 1 hour" },
  { value: "خلال 5 ساعات", en: "Within 5 hours" },
  { value: "خلال يوم", en: "Within 1 day" },
  { value: "خلال يومين", en: "Within 2 days" },
];
