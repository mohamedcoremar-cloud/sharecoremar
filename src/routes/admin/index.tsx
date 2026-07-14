import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Users, ShoppingBag, Building2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-gold)" }}>
          <Icon className="h-5 w-5 text-ink" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [p, s, o, u] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { products: p.count ?? 0, suppliers: s.count ?? 0, orders: o.count ?? 0, users: u.count ?? 0 };
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your marketplace</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={data?.products ?? "—"} icon={Package} />
        <StatCard label="Suppliers" value={data?.suppliers ?? "—"} icon={Building2} />
        <StatCard label="Orders" value={data?.orders ?? "—"} icon={ShoppingBag} />
        <StatCard label="Users" value={data?.users ?? "—"} icon={Users} />
      </div>
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5 text-primary" /><h2 className="font-semibold">Welcome to your Control Center</h2></div>
        <p className="text-sm text-muted-foreground">Use the sidebar to manage products, suppliers, categories, brands, orders, homepage content and more. Every module is fully connected to your Lovable Cloud database.</p>
      </div>
    </div>
  );
}
