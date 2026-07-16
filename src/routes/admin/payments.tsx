import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";

export const Route = createFileRoute("/admin/payments")({
  component: () => (
    <CrudPage
      title="Payment Methods"
      table="payment_methods"
      orderBy="sort_order"
      activeKey="is_enabled"
      defaultValues={{ is_enabled: false, is_available_at_launch: false, environment: "sandbox", sort_order: 0, fees_percent: 0, fees_fixed: 0, config: {} }}
      columns={[
        { key: "code", label: "Code" },
        { key: "name_en", label: "Name" },
        { key: "is_enabled", label: "Enabled", render: (r) => r.is_enabled ? "✓" : "—" },
        { key: "is_available_at_launch", label: "Launch", render: (r) => r.is_available_at_launch ? "✓" : "—" },
        { key: "environment", label: "Env" },
        { key: "sort_order", label: "Sort" },
      ]}
      fields={[
        { name: "code", label: "Code (unique)", required: true },
        { name: "name_en", label: "Name (EN)", required: true },
        { name: "name_ar", label: "Name (AR)" },
        { name: "description_en", label: "Description (EN)", type: "textarea" },
        { name: "description_ar", label: "Description (AR)", type: "textarea" },
        { name: "instructions_en", label: "Instructions (EN)", type: "textarea" },
        { name: "instructions_ar", label: "Instructions (AR)", type: "textarea" },
        { name: "icon_url", label: "Icon", type: "image" },
        { name: "environment", label: "Environment (sandbox/live)" },
        { name: "fees_percent", label: "Fee %", type: "number" },
        { name: "fees_fixed", label: "Fee fixed", type: "number" },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_available_at_launch", label: "Available at launch", type: "switch" },
        { name: "is_enabled", label: "Enabled", type: "switch" },
      ]}
    />
  ),
});
