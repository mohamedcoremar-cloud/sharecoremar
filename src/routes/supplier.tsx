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
import { LogOut, Globe, PackageCheck, ChefHat } from "lucide-react";
import { ETA_PRESETS, SUPPLIER_NEXT, stageMeta } from "@/lib/fulfillment";

export const Route = createFileRoute("/supplier")({
  component: () => (
    <AuthProvider>
      <I18nProvider>
        <SupplierGate />
      </I18nProvider>
    </AuthProvider>
  ),
  head: () => ({
    meta: [
      { title: "Supplier Portal — Share CoreMar" },
      { name: "description", content: "Suppliers on Share CoreMar confirm preparation time and mark orders ready for pickup." },
      { property: "og:title", content: "Supplier Portal — Share CoreMar" },
      { property: "og:description", content: "Confirm preparation time and mark your orders ready for pickup." },
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
            <div className="text-[10px] uppercase tracking-wider text-primary">Supplier Portal</div>
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

function SupplierGate() {
  const { user, loading } = useAuth();
  const { data: link, isLoading } = useQuery({
    queryKey: ["supplier-link", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_users")
        .select("supplier_id, is_active, suppliers(company_name, brand_name)")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .maybeSingle();
      return data;
    },
  });

  if (loading || (user && isLoading)) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Denied title="Sign in required" body="Please sign in with your supplier account to continue." />;
  if (!link || !link.is_active) return <Denied title="Access Denied" body="This account is not linked to an active supplier." />;

  return <SupplierOrders supplierId={link.supplier_id} companyName={(link as any).suppliers?.company_name ?? ""} />;
}

function SupplierOrders({ supplierId, companyName }: { supplierId: string; companyName: string }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const [etaFor, setEtaFor] = useState<string | null>(null);
  const [eta, setEta] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["supplier-orders", supplierId],
    queryFn: async () => {
      // RLS restricts every table below to this supplier's own scope.
      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, product_name, quantity, unit_price, total_price, product_id, products(supplier_id)")
        .order("created_at", { ascending: false });
      const mine = (items ?? []).filter((i: any) => i.products?.supplier_id === supplierId);
      const ids = [...new Set(mine.map((i: any) => i.order_id))];
      if (ids.length === 0) return [];
      const [{ data: ords }, { data: stages }] = await Promise.all([
        supabase.from("orders").select("id, order_number, created_at, status, total, contact_phone").in("id", ids),
        supabase.from("order_fulfillment_current").select("*").in("order_id", ids),
      ]);
      const stageBy = new Map((stages ?? []).map((s: any) => [s.order_id, s]));
      return (ords ?? [])
        .map((o: any) => ({
          ...o,
          lines: mine.filter((i: any) => i.order_id === o.id),
          stage: stageBy.get(o.id) ?? null,
        }))
        .filter((o: any) => o.stage)
        .sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  const advance = useMutation({
    mutationFn: async ({ orderId, stage, etaValue }: { orderId: string; stage: string; etaValue?: string }) => {
      const { error } = await supabase.rpc("supplier_set_order_stage", {
        p_order_id: orderId,
        p_stage: stage,
        p_eta: etaValue ?? undefined,
        p_note: undefined,

      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-orders", supplierId] });
      setEtaFor(null);
      setEta("");
      toast.success(lang === "ar" ? "تم التحديث" : "Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Shell title={lang === "ar" ? `طلباتي — ${companyName}` : `My Orders — ${companyName}`}>
      {isLoading && <div>Loading…</div>}
      {!isLoading && orders.length === 0 && (
        <div className="card-premium p-8 text-center text-muted-foreground">
          {lang === "ar" ? "لا توجد طلبات في قائمتك حاليًا." : "No orders in your queue yet."}
        </div>
      )}
      <div className="space-y-4">
        {orders.map((o: any) => {
          const code = o.stage?.stage as string;
          const meta = stageMeta(code);
          const Icon = meta?.icon;
          const next = SUPPLIER_NEXT[code] ?? [];
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

              {o.stage?.supplier_ready_eta && (
                <div className="text-xs text-muted-foreground mt-2">
                  {lang === "ar" ? "وقت الجهوزية" : "Ready in"}: {o.stage.supplier_ready_eta}
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

              {next.includes("supplier_preparing") && (
                <div className="mt-4">
                  {etaFor === o.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {ETA_PRESETS.map((p) => (
                          <button
                            key={p.value}
                            onClick={() => setEta(p.value)}
                            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${eta === p.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                          >
                            {lang === "ar" ? p.value : p.en}
                          </button>
                        ))}
                      </div>
                      <Input
                        value={eta}
                        onChange={(e) => setEta(e.target.value)}
                        placeholder={lang === "ar" ? "أو اكتب مدة مخصصة" : "Or type a custom duration"}
                      />
                      <div className="flex gap-2">
                        <Button
                          disabled={!eta.trim() || advance.isPending}
                          onClick={() => advance.mutate({ orderId: o.id, stage: "supplier_preparing", etaValue: eta })}
                        >
                          <ChefHat className="h-4 w-4 me-1" /> {lang === "ar" ? "جاري التجهيز" : "Start preparing"}
                        </Button>
                        <Button variant="ghost" onClick={() => { setEtaFor(null); setEta(""); }}>
                          {lang === "ar" ? "إلغاء" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={() => { setEtaFor(o.id); setEta(""); }}>
                      <ChefHat className="h-4 w-4 me-1" /> {lang === "ar" ? "جاري التجهيز" : "Start preparing"}
                    </Button>
                  )}
                </div>
              )}

              {next.includes("ready_for_pickup") && (
                <Button
                  className="mt-4"
                  disabled={advance.isPending}
                  onClick={() => advance.mutate({ orderId: o.id, stage: "ready_for_pickup" })}
                >
                  <PackageCheck className="h-4 w-4 me-1" /> {lang === "ar" ? "تم التجهيز" : "Mark ready"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
