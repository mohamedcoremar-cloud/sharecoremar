import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";
import { ProvisionAccountButton } from "@/components/admin/provision-account-button";

export const Route = createFileRoute("/admin/suppliers")({
  component: () => (
    <CrudPage
      title="Suppliers"
      table="suppliers"
      hasActive={false}
      rowActions={(row) => <ProvisionAccountButton entityType="supplier" row={row} />}
      defaultValues={{ status: "pending", is_featured: false }}

      columns={[
        { key: "company_name", label: "Company" },
        { key: "brand_name", label: "Brand" },
        { key: "governorate", label: "Governorate" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { name: "company_name", label: "Company name", required: true },
        { name: "brand_name", label: "Brand name" },
        { name: "owner_name", label: "Owner name" },
        { name: "business_type", label: "Business type" },
        { name: "tax_number", label: "Tax number" },
        { name: "commercial_registration", label: "Commercial registration" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "governorate", label: "Governorate" },
        { name: "city", label: "City" },
        { name: "address", label: "Address" },
        { name: "phone", label: "Phone" },
        { name: "whatsapp", label: "WhatsApp" },
        { name: "email", label: "Email" },
        { name: "logo_url", label: "Logo URL" },
        { name: "status", label: "Status", type: "select", options: [
          { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" }, { value: "suspended", label: "Suspended" },
        ]},
        { name: "is_featured", label: "Featured", type: "switch" },
      ]}
    />
  ),
});
