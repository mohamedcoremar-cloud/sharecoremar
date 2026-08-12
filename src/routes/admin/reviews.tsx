import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
  head: () => ({
    meta: [
      { title: "Product Reviews — Share CoreMar Admin" },
      { name: "description", content: "Moderate customer product reviews: approve or reject verified-purchase ratings before they go public." },
      { property: "og:title", content: "Product Reviews — Share CoreMar Admin" },
      { property: "og:description", content: "Approve or reject verified-purchase product reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Filter = "pending" | "approved" | "rejected" | "all";

function AdminReviews() {
  const [filter, setFilter] = useState<Filter>("pending");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let q = supabase
        .from("product_reviews")
        .select("id, rating, comment, created_at, customer_id, status_id, product:products(name_en, name_ar), status:review_statuses(code, label_en)")
        .order("created_at", { ascending: false });
      if (filter !== "all") {
        const { data: st } = await supabase.from("review_statuses").select("id").eq("code", filter).maybeSingle();
        if (st) q = q.eq("status_id", st.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      const list = data ?? [];
      const ids = [...new Set(list.map((r: any) => r.customer_id))];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
        (profs ?? []).forEach((p: any) => { names[p.id] = p.full_name || p.email; });
      }
      return list.map((r: any) => ({ ...r, customer_name: names[r.customer_id] ?? "—" }));
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.rpc("set_review_status", { p_review_id: id, p_status_code: status });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review updated"); qc.invalidateQueries({ queryKey: ["admin-reviews"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed to update review"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Only approved reviews appear publicly and count toward product ratings.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Product</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Comment</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No reviews in this state.</td></tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.product?.name_en ?? "—"}</td>
                <td className="p-3">{r.customer_name}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating}</span>
                </td>
                <td className="p-3 max-w-[280px] truncate text-muted-foreground">{r.comment || "—"}</td>
                <td className="p-3 capitalize">{r.status?.code}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={r.status?.code === "approved" || moderate.isPending}
                      onClick={() => moderate.mutate({ id: r.id, status: "approved" })}>
                      <Check className="h-4 w-4 me-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={r.status?.code === "rejected" || moderate.isPending}
                      onClick={() => moderate.mutate({ id: r.id, status: "rejected" })}>
                      <X className="h-4 w-4 me-1" /> Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
