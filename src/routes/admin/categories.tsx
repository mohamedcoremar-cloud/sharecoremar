import { backofficeHead } from "@/lib/backoffice-head";
import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";

export const Route = createFileRoute("/admin/categories")({ head: () => backofficeHead("Categories"),
  component: () => (
    <CrudPage
      title="Categories"
      table="categories"
      orderBy="sort_order"
      defaultValues={{ is_active: true, sort_order: 0 }}
      columns={[
        { key: "name_en", label: "Name (EN)" },
        { key: "name_ar", label: "Name (AR)" },
        { key: "slug", label: "Slug" },
        { key: "sort_order", label: "Order" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
        { key: "is_featured", label: "Featured", render: (r) => r.is_featured ? "✓" : "—" },
      ]}
      fields={[
        { name: "name_en", label: "Name (English)", required: true },
        { name: "name_ar", label: "Name (Arabic)", required: true },
        { name: "slug", label: "Slug", required: true, placeholder: "e.g. beverages" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "image_url", label: "Image", type: "image" },
        { name: "icon", label: "Icon name" },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "switch" },
        { name: "is_featured", label: "Featured", type: "switch" },
        { name: "seo_title", label: "SEO Title" },
        { name: "seo_description", label: "SEO Description", type: "textarea" },
      ]}
    />
  ),
});
