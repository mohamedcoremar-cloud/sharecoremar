import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";

export const Route = createFileRoute("/admin/banners")({
  component: () => (
    <CrudPage
      title="Banners"
      table="banners"
      orderBy="sort_order"
      defaultValues={{ is_active: true, position: "hero", sort_order: 0 }}
      columns={[
        { key: "title_en", label: "Title" },
        { key: "position", label: "Position" },
        { key: "is_active", label: "Active", render: (r) => r.is_active ? "✓" : "—" },
        { key: "sort_order", label: "Order" },
      ]}
      fields={[
        { name: "title_en", label: "Title (EN)" },
        { name: "title_ar", label: "Title (AR)" },
        { name: "subtitle_en", label: "Subtitle (EN)" },
        { name: "subtitle_ar", label: "Subtitle (AR)" },
        { name: "image_url", label: "Image URL", required: true },
        { name: "link_url", label: "Link URL" },
        { name: "position", label: "Position", type: "select", options: [
          { value: "hero", label: "Hero" }, { value: "middle", label: "Middle" }, { value: "footer", label: "Footer" },
        ]},
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "switch" },
      ]}
    />
  ),
});
