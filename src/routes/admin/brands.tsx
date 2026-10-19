import { backofficeHead } from "@/lib/backoffice-head";
import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";

export const Route = createFileRoute("/admin/brands")({ head: () => backofficeHead("Brands"),
  component: () => (
    <CrudPage
      title="Brands"
      table="brands"
      orderBy="sort_order"
      defaultValues={{ is_active: true, sort_order: 0 }}
      columns={[
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "country", label: "Country" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
        { key: "is_featured", label: "Featured", render: (r) => r.is_featured ? "✓" : "—" },
      ]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "slug", label: "Slug", required: true },
        { name: "description", label: "Description", type: "textarea" },
        { name: "logo_url", label: "Logo", type: "image" },
        { name: "cover_url", label: "Cover", type: "image" },
        { name: "country", label: "Country" },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "switch" },
        { name: "is_featured", label: "Featured", type: "switch" },
      ]}
    />
  ),
});
