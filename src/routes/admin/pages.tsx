import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";

export const Route = createFileRoute("/admin/pages")({
  component: () => (
    <CrudPage
      title="Pages (CMS)"
      table="pages"
      orderBy="sort_order"
      defaultValues={{ is_published: false, is_indexable: true, sort_order: 0 }}
      columns={[
        { key: "slug", label: "Slug" },
        { key: "title_en", label: "Title (EN)" },
        { key: "is_published", label: "Published", render: (r) => r.is_published ? "✓" : "—" },
      ]}
      fields={[
        { name: "slug", label: "Slug", required: true },
        { name: "title_en", label: "Title (EN)", required: true },
        { name: "title_ar", label: "Title (AR)" },
        { name: "content_en", label: "Content (EN) — Markdown", type: "textarea" },
        { name: "content_ar", label: "Content (AR) — Markdown", type: "textarea" },
        { name: "meta_title_en", label: "Meta Title (EN)" },
        { name: "meta_title_ar", label: "Meta Title (AR)" },
        { name: "meta_description_en", label: "Meta Description (EN)", type: "textarea" },
        { name: "meta_description_ar", label: "Meta Description (AR)", type: "textarea" },
        { name: "og_image_url", label: "OG Image", type: "image" },
        { name: "sort_order", label: "Sort", type: "number" },
        { name: "is_indexable", label: "Search-indexable", type: "switch" },
        { name: "is_published", label: "Published", type: "switch" },
      ]}
    />
  ),
});
