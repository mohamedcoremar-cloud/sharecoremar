import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_public/suppliers")({ component: SuppliersPage });

function SuppliersPage() {
  const { data: suppliers = [] } = useQuery({
    queryKey: ["public-suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").eq("status", "approved").order("is_featured", { ascending: false })).data ?? [],
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-bold mb-8">Verified Suppliers</h1>
      {suppliers.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Approved suppliers will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s: any) => (
            <div key={s.id} className="card-premium p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold-soft to-accent flex items-center justify-center"><Building2 className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold">{s.company_name}</h3>
                  {s.is_featured && <span className="text-[10px] uppercase text-primary font-semibold">Featured</span>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{s.description ?? "—"}</p>
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 text-primary" /> Verified · {s.governorate ?? "Egypt"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
