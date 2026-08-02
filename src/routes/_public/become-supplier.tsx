import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_public/become-supplier")({
  component: BecomeSupplier,
  head: () => ({
    meta: [
      { title: "Become a Supplier — Share CoreMar" },
      { name: "description", content: "Apply to sell your FMCG catalog on Share CoreMar and reach Egyptian businesses and personal buyers from one storefront." },
      { property: "og:title", content: "Become a Supplier — Share CoreMar" },
      { property: "og:description", content: "Sell your FMCG catalog on Share CoreMar and reach Egyptian businesses and personal buyers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function BecomeSupplier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState<any>({});
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first"); navigate({ to: "/auth" }); return; }
    setLoading(true);
    const { error } = await supabase.from("suppliers").insert({ ...f, user_id: user.id, email: user.email, status: "pending" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted! We'll review it shortly.");
    setF({});
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Become a Supplier</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Reach thousands of business and personal buyers across Egypt. Join Share CoreMar today.</p>
      </div>
      <form onSubmit={submit} className="card-premium p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Company name *</Label><Input required value={f.company_name ?? ""} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
          <div><Label>Brand name</Label><Input value={f.brand_name ?? ""} onChange={(e) => setF({ ...f, brand_name: e.target.value })} /></div>
          <div><Label>Owner name</Label><Input value={f.owner_name ?? ""} onChange={(e) => setF({ ...f, owner_name: e.target.value })} /></div>
          <div><Label>Business type</Label><Input value={f.business_type ?? ""} onChange={(e) => setF({ ...f, business_type: e.target.value })} placeholder="Manufacturer / Distributor / Importer" /></div>
          <div><Label>Tax number</Label><Input value={f.tax_number ?? ""} onChange={(e) => setF({ ...f, tax_number: e.target.value })} /></div>
          <div><Label>Commercial registration</Label><Input value={f.commercial_registration ?? ""} onChange={(e) => setF({ ...f, commercial_registration: e.target.value })} /></div>
          <div><Label>Governorate</Label><Input value={f.governorate ?? ""} onChange={(e) => setF({ ...f, governorate: e.target.value })} /></div>
          <div><Label>City</Label><Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div><Label>Phone *</Label><Input required value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
        </div>
        <div><Label>Address</Label><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Label>Business description</Label><Textarea rows={4} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <Button type="submit" disabled={loading} className="btn-gold w-full">{loading ? "Submitting..." : "Submit Application"}</Button>
      </form>
    </div>
  );
}
