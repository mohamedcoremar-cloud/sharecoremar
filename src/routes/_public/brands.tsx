import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_public/brands")({ component: BrandsPage });

function BrandsPage() {
  const { data: brands = [] } = useQuery({
    queryKey: ["public-brands-all"],
    queryFn: async () => (await supabase.from("brands").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-bold mb-8">Brands</h1>
      <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {brands.map((b: any) => (
          <div key={b.id} className="card-premium p-6 h-28 flex items-center justify-center text-center font-semibold">{b.name}</div>
        ))}
      </div>
    </div>
  );
}
