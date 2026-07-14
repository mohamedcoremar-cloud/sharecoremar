import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_public/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const { data: categories = [] } = useQuery({
    queryKey: ["public-categories-all"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-4xl font-bold mb-8">Categories</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c: any) => (
          <Link key={c.id} to="/products" className="card-premium p-6 group">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3" style={{ background: "var(--gradient-gold)" }}>
              <Sparkles className="h-6 w-6 text-ink" />
            </div>
            <div className="font-semibold">{c.name_en}</div>
            <div className="text-xs text-muted-foreground">{c.name_ar}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
