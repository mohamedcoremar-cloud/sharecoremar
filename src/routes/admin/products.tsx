import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/products")({ component: ProductsAdmin });

function ProductsAdmin() {
  const { tr, lang } = useI18n();
  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name_en, name_ar").order("name_en")).data ?? [],
  });
  const { data: brands = [] } = useQuery({
    queryKey: ["all-brands"],
    queryFn: async () => (await supabase.from("brands").select("id, name").order("name")).data ?? [],
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("id, company_name").order("company_name")).data ?? [],
  });

  return (
    <CrudPage
      title={tr("Products")}
      table="products"
      defaultValues={{ is_active: true, is_featured: false, stock: 0, min_quantity: 1, retail_price: 0, tax_rate: 0 }}
      columns={[
        { key: "name_en", label: tr("Name") },
        { key: "sku", label: tr("SKU") },
        { key: "retail_price", label: tr("Price"), render: (r) => `${Number(r.retail_price).toFixed(2)} ${lang === "ar" ? "ج.م" : "EGP"}` },
        { key: "stock", label: tr("Stock") },
        { key: "is_active", label: tr("Active"), render: (r) => r.is_active ? "✓" : "—" },
        { key: "is_featured", label: tr("Featured"), render: (r) => r.is_featured ? "✓" : "—" },
      ]}
      fields={[
        { name: "name_en", label: tr("Name (English)"), required: true },
        { name: "name_ar", label: tr("Name (Arabic)"), required: true },
        { name: "slug", label: tr("Slug"), required: true },
        { name: "sku", label: tr("SKU") },
        { name: "barcode", label: tr("Barcode") },
        { name: "category_id", label: tr("Category"), type: "select", options: categories.map((c: any) => ({ value: c.id, label: lang === "ar" ? c.name_ar || c.name_en : c.name_en })) },
        { name: "brand_id", label: tr("Brand"), type: "select", options: brands.map((b: any) => ({ value: b.id, label: b.name })) },
        { name: "supplier_id", label: tr("Supplier"), type: "select", options: suppliers.map((s: any) => ({ value: s.id, label: s.company_name })) },
        { name: "description", label: tr("Description"), type: "textarea" },
        { name: "retail_price", label: tr("Retail price (EGP)"), type: "number", required: true },
        { name: "wholesale_price", label: tr("Wholesale price (EGP)"), type: "number" },
        { name: "min_quantity", label: tr("Min quantity"), type: "number" },
        { name: "max_quantity", label: tr("Max quantity"), type: "number" },
        { name: "stock", label: tr("Stock"), type: "number" },
        { name: "tax_rate", label: tr("Tax rate %"), type: "number" },
        { name: "weight", label: tr("Weight (kg)"), type: "number" },
        { name: "unit", label: tr("Unit"), placeholder: "piece / carton / kg" },
        { name: "is_active", label: tr("Active"), type: "switch" },
        { name: "is_featured", label: tr("Featured"), type: "switch" },
        { name: "is_offer", label: tr("On offer"), type: "switch" },
        { name: "images", label: tr("Images"), type: "images" },
      ]}
    />
  );
}
