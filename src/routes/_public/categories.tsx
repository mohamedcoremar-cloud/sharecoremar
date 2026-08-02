import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Layers } from "lucide-react";
import categoryFallback from "@/assets/category-fallback.jpg";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/categories")({
  component: CategoriesPage,
  head: () => ({
    meta: [
      { title: "FMCG Categories — Share CoreMar" },
      { name: "description", content: "Browse Share CoreMar's FMCG categories — dairy, beverages, cooking essentials, home care and more from verified Egyptian suppliers." },
      { property: "og:title", content: "FMCG Categories — Share CoreMar" },
      { property: "og:description", content: "Dairy, beverages, cooking essentials, home care and more from verified Egyptian suppliers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CategoriesPage() {
  const { pick, lang } = useI18n();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["public-categories-all"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")).data ?? [],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Every FMCG line on Share CoreMar, organised so you can find what your shelves need faster.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card-premium aspect-[4/3] animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="card-premium p-16 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">Categories will appear here once they are published.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c: any) => (
            <Link key={c.id} to="/products" className="card-premium group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={c.image_url || categoryFallback}
                  alt={pick(c, "name")}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{pick(c, "name")}</div>
                    <div className="truncate text-xs text-muted-foreground">{lang === "ar" ? c.name_en : c.name_ar}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </div>
                {c.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
