import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { fmt } from "@/lib/currency";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_public/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*, payments(status)").eq("buyer_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  if (!user) return <div className="mx-auto max-w-md px-4 py-20 text-center"><Button asChild className="btn-gold"><Link to="/auth">Sign in</Link></Button></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="card-premium p-16 text-center"><Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No orders yet.</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const payStatus = o.payments?.[0]?.status ?? o.payment_status;
            return (
              <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="card-premium p-4 flex items-center justify-between hover:border-primary transition-colors">
                <div>
                  <div className="font-semibold">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.status.replace(/_/g, " ")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{fmt(o.total)}</div>
                  <div className="text-xs text-muted-foreground capitalize">{payStatus}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
