import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";
import { ProvisionAccountButton } from "@/components/admin/provision-account-button";

export const Route = createFileRoute("/admin/logistics-partners")({
  component: () => (
    <CrudPage
      title="Logistics Partners"
      table="delivery_partners"
      orderBy="sort_order"
      searchKeys={["name_en", "name_ar", "email", "phone"]}
      defaultValues={{ type: "in_house", is_active: true, sort_order: 0 }}
      rowActions={(row) => <ProvisionAccountButton entityType="logistics" row={row} />}
      columns={[
        { key: "name_en", label: "Name (EN)" },
        { key: "name_ar", label: "Name (AR)" },
        { key: "type", label: "Type" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
      fields={[
        { name: "name_en", label: "Name (EN)", required: true },
        { name: "name_ar", label: "Name (AR)", required: true },
        { name: "type", label: "Type", type: "select", options: [
          { value: "in_house", label: "In-house" },
          { value: "third_party", label: "Third party" },
        ]},
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "coverage_notes", label: "Coverage notes", type: "textarea" },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "switch" },
      ]}
    />
  ),
});
