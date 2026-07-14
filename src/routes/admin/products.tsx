import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/products")({ component: ProductsAdmin });

function ProductsAdmin() {
  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name_en").order("name_en")).data ?? [],
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
      title="Products"
      table="products"
      defaultValues={{ is_active: true, is_featured: false, stock: 0, min_quantity: 1, retail_price: 0, tax_rate: 0 }}
      columns={[
        { key: "name_en", label: "Name" },
        { key: "sku", label: "SKU" },
        { key: "retail_price", label: "Price", render: (r) => `${Number(r.retail_price).toFixed(2)} EGP` },
        { key: "stock", label: "Stock" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
        { key: "is_featured", label: "Featured", render: (r) => r.is_featured ? "✓" : "—" },
      ]}
      fields={[
        { name: "name_en", label: "Name (English)", required: true },
        { name: "name_ar", label: "Name (Arabic)", required: true },
        { name: "slug", label: "Slug", required: true },
        { name: "sku", label: "SKU" },
        { name: "barcode", label: "Barcode" },
        { name: "category_id", label: "Category", type: "select", options: categories.map((c: any) => ({ value: c.id, label: c.name_en })) },
        { name: "brand_id", label: "Brand", type: "select", options: brands.map((b: any) => ({ value: b.id, label: b.name })) },
        { name: "supplier_id", label: "Supplier", type: "select", options: suppliers.map((s: any) => ({ value: s.id, label: s.company_name })) },
        { name: "description", label: "Description", type: "textarea" },
        { name: "retail_price", label: "Retail price (EGP)", type: "number", required: true },
        { name: "wholesale_price", label: "Wholesale price (EGP)", type: "number" },
        { name: "min_quantity", label: "Min quantity", type: "number" },
        { name: "max_quantity", label: "Max quantity", type: "number" },
        { name: "stock", label: "Stock", type: "number" },
        { name: "tax_rate", label: "Tax rate %", type: "number" },
        { name: "weight", label: "Weight (kg)", type: "number" },
        { name: "unit", label: "Unit", placeholder: "piece / carton / kg" },
        { name: "is_active", label: "Active", type: "switch" },
        { name: "is_featured", label: "Featured", type: "switch" },
        { name: "is_offer", label: "On offer", type: "switch" },
      ]}
    />
  );
}
