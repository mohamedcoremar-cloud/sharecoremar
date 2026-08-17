import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/currency";
import { LogOut, Globe, Handshake, Truck, Navigation, Home } from "lucide-react";
import { ETA_PRESETS, LOGISTICS_NEXT, stageMeta } from "@/lib/fulfillment";

export const Route = createFileRoute("/logistics")({
  component: () => (
    <AuthProvider>
      <I18nProvider>
        <LogisticsGate />
      </I18nProvider>
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "Logistics Portal — Share CoreMar" },
      { name: "description", content: "Delivery partners accept ready orders, collect from suppliers and dispatch drivers on Share CoreMar." },
      { property: "og:title", content: "Logistics Portal — Share CoreMar" },
      { property: "og:description", content: "Accept ready orders, collect from suppliers and dispatch your drivers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { lang, setLang } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <div>
            <div className="font-bold">Share CoreMar</div>
            <div className="text-[10px] uppercase tracking-wider text-primary">Logistics Portal</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Globe className="h-4 w-4 me-1" /> {lang === "en" ? "العربية" : "English"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}><LogOut className="h-4 w-4 me-1" /> Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}

function Denied({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-6">{body}</p>
        <Button asChild><Link to="/">Go home</Link></Button>
      </div>
    </div>
  );
}

function LogisticsGate() {
  const { user, loading } = useAuth();
  const { data: link, isLoading } = useQuery({
    queryKey: ["logistics-link", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_partner_users")
        .select("delivery_partner_id, is_active, delivery_partners(name_en, name_ar)")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
  });

  if (loading || (user && isLoading)) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Denied title="Sign in required" body="Please sign in with your logistics account to continue." />;
  if (!link || !link.is_active) return <Denied title="Access Denied" body="This account is not linked to an active delivery partner." />;

  return <LogisticsOrders partnerId={link.delivery_partner_id} partner={(link as any).delivery_partners} />;
}

function LogisticsOrders({ partnerId, partner }: { partnerId: string; partner: any }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const [form, setForm] = useState<Record<string, any>>({});
  const [openFor, setOpenFor] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["logistics-orders", partnerId],
    queryFn: async () => {
      // Column-limited RPC: only this partner's assignments at ready_for_pickup or later,
      // and only the delivery fields (no buyer account email, no internal notes).
      const { data: ords } = await supabase.rpc("logistics_orders");

      const ids = (ords ?? []).map((o: any) => o.id);
      if (ids.length === 0) return [];
      const [{ data: stages }, { data: items }] = await Promise.all([
        supabase.from("order_fulfillment_current").select("*").in("order_id", ids),
        supabase.from("order_items").select("id, order_id, product_name, quantity, total_price").in("order_id", ids),
      ]);
      const stageBy = new Map((stages ?? []).map((s: any) => [s.order_id, s]));
      // Supplier ETA comes from the timeline entry the supplier wrote.
      const { data: etas } = await supabase
        .from("order_status_history")
        .select("order_id, supplier_ready_eta, created_at")
        .in("order_id", ids)
        .eq("status", "supplier_preparing");
      const etaBy = new Map((etas ?? []).map((e: any) => [e.order_id, e.supplier_ready_eta]));
      return (ords ?? [])
        .map((o: any) => ({
          ...o,
          stage: stageBy.get(o.id) ?? null,
          supplierEta: etaBy.get(o.id) ?? null,
          lines: (items ?? []).filter((i: any) => i.order_id === o.id),
        }))
        .filter((o: any) => o.stage && LOGISTICS_NEXT[o.stage.stage as string]?.length);
    },
  });

  const advance = useMutation({
    mutationFn: async ({ orderId, stage }: { orderId: string; stage: string }) => {
      const f = form[orderId] ?? {};
      const { error } = await supabase.rpc("logistics_set_order_stage", {
        p_order_id: orderId,
        p_stage: stage,
        p_eta: stage === "accepted_by_logistics" ? f.eta : undefined,
        p_driver_name: stage === "in_transit" ? f.driver_name : undefined,
        p_driver_phone: stage === "in_transit" ? f.driver_phone : undefined,
        p_vehicle_info: stage === "in_transit" ? f.vehicle_info : undefined,
        p_note: undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics-orders", partnerId] });
      setOpenFor(null);
      toast.success(lang === "ar" ? "تم التحديث" : "Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (id: string, k: string, v: string) =>
    setForm((p) => ({ ...p, [id]: { ...(p[id] ?? {}), [k]: v } }));

  return (
    <Shell title={lang === "ar" ? `الطلبات الجاهزة — ${partner?.name_ar ?? ""}` : `Ready Orders — ${partner?.name_en ?? ""}`}>
      {isLoading && <div>Loading…</div>}
      {!isLoading && orders.length === 0 && (
        <div className="card-premium p-8 text-center text-muted-foreground">
          {lang === "ar" ? "لا توجد طلبات جاهزة حاليًا." : "No ready orders right now."}
        </div>
      )}
      <div className="space-y-4">
        {orders.map((o: any) => {
          const code = o.stage.stage as string;
          const meta = stageMeta(code);
          const Icon = meta?.icon;
          const next = LOGISTICS_NEXT[code] ?? [];
          const f = form[o.id] ?? {};
          const addr: any = o.delivery_address;
          return (
            <div key={o.id} className="card-premium p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                {meta && (
                  <div className={`flex items-center gap-2 text-sm font-semibold ${meta.color}`}>
                    {Icon && <Icon className="h-4 w-4" />} {lang === "ar" ? meta.ar : meta.en}
                  </div>
                )}
              </div>

              {o.supplierEta && (
                <div className="text-xs text-muted-foreground mt-2">
                  {lang === "ar" ? "جهوزية المورد" : "Supplier readiness"}: {o.supplierEta}
                </div>
              )}
              {o.stage.logistics_delivery_eta && (
                <div className="text-xs text-muted-foreground">
                  {lang === "ar" ? "موعد التسليم" : "Delivery timeframe"}: {o.stage.logistics_delivery_eta}
                </div>
              )}

              {addr && (
                <div className="text-xs text-muted-foreground mt-2">
                  {addr.full_name} · {addr.phone} · {addr.street}, {addr.city}, {addr.governorate}
                </div>
              )}

              <div className="mt-4 space-y-2">
                {o.lines.map((l: any) => (
                  <div key={l.id} className="flex justify-between text-sm">
                    <span>{l.product_name} × {l.quantity}</span>
                    <span className="font-medium">{fmt(l.total_price)}</span>
                  </div>
                ))}
              </div>

              {next.includes("accepted_by_logistics") && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {ETA_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => set(o.id, "eta", p.value)}
                        className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${f.eta === p.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                      >
                        {lang === "ar" ? p.value : p.en}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={f.eta ?? ""}
                    onChange={(e) => set(o.id, "eta", e.target.value)}
                    placeholder={lang === "ar" ? "موعد التسليم المتوقع" : "Delivery timeframe"}
                  />
                  <Button
                    disabled={!f.eta?.trim() || advance.isPending}
                    onClick={() => advance.mutate({ orderId: o.id, stage: "accepted_by_logistics" })}
                  >
                    <Handshake className="h-4 w-4 me-1" /> {lang === "ar" ? "قبول المهمة" : "Accept task"}
                  </Button>
                </div>
              )}

              {next.includes("picked_up_by_logistics") && (
                <Button className="mt-4" disabled={advance.isPending}
                  onClick={() => advance.mutate({ orderId: o.id, stage: "picked_up_by_logistics" })}>
                  <Truck className="h-4 w-4 me-1" /> {lang === "ar" ? "تم الاستلام من المورد" : "Picked up from supplier"}
                </Button>
              )}

              {next.includes("in_transit") && (
                <div className="mt-4">
                  {openFor === o.id ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input value={f.driver_name ?? ""} onChange={(e) => set(o.id, "driver_name", e.target.value)}
                        placeholder={lang === "ar" ? "اسم السائق" : "Driver name"} />
                      <Input value={f.driver_phone ?? ""} onChange={(e) => set(o.id, "driver_phone", e.target.value)}
                        placeholder={lang === "ar" ? "هاتف السائق" : "Driver phone"} />
                      <Input value={f.vehicle_info ?? ""} onChange={(e) => set(o.id, "vehicle_info", e.target.value)}
                        placeholder={lang === "ar" ? "بيانات المركبة" : "Vehicle info"} />
                      <div className="sm:col-span-3 flex gap-2">
                        <Button
                          disabled={advance.isPending || !f.driver_name?.trim() || !f.driver_phone?.trim() || !f.vehicle_info?.trim()}
                          onClick={() => advance.mutate({ orderId: o.id, stage: "in_transit" })}
                        >
                          <Navigation className="h-4 w-4 me-1" /> {lang === "ar" ? "في الطريق" : "In transit"}
                        </Button>
                        <Button variant="ghost" onClick={() => setOpenFor(null)}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => setOpenFor(o.id)}>
                      <Navigation className="h-4 w-4 me-1" /> {lang === "ar" ? "في الطريق" : "In transit"}
                    </Button>
                  )}
                </div>
              )}

              {next.includes("delivered") && (
                <div className="mt-4">
                  {o.stage.driver_name && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {lang === "ar" ? "السائق" : "Driver"}: {o.stage.driver_name} · {o.stage.driver_phone} · {o.stage.vehicle_info}
                    </div>
                  )}
                  <Button disabled={advance.isPending}
                    onClick={() => advance.mutate({ orderId: o.id, stage: "delivered" })}>
                    <Home className="h-4 w-4 me-1" /> {lang === "ar" ? "تم التسليم" : "Delivered"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
