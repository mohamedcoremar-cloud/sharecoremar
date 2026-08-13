import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export function useApprovedRating(productId: string | undefined) {
  return useQuery({
    queryKey: ["review-summary", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", productId!);
      const rows = data ?? [];
      const count = rows.length;
      const avg = count ? rows.reduce((s, r) => s + Number(r.rating), 0) / count : 0;
      return { avg, count };
    },
  });
}

export function RatingSummary({ productId }: { productId: string }) {
  const { data } = useApprovedRating(productId);
  if (!data || data.count === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i <= Math.round(data.avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        ))}
      </span>
      <span className="font-semibold">{data.avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({data.count} review{data.count === 1 ? "" : "s"})</span>
    </div>
  );
}

/** Shows "Review this product" only when the signed-in buyer received it in a delivered order and hasn't reviewed it. */
export function ReviewAction({ productId }: { productId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: eligibility } = useQuery({
    queryKey: ["review-eligibility", productId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id, order:orders!inner(id, status, buyer_id)")
        .eq("product_id", productId)
        .eq("order.buyer_id", user!.id)
        .eq("order.status", "delivered");
      const orderId = (items ?? [])[0]?.order_id as string | undefined;
      if (!orderId) return { orderId: null, reviewed: false };
      const { data: mine } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("customer_id", user!.id)
        .limit(1);
      return { orderId, reviewed: (mine ?? []).length > 0 };
    },
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", productId, user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase
        .from("product_reviews")
        .select("id, rating, comment, status:review_statuses(code, label_en)")
        .eq("product_id", productId)
        .eq("customer_id", user!.id)
        .maybeSingle()).data,
  });

  if (!user || !eligibility?.orderId) return null;

  if (myReview) {
    return (
      <div className="mt-6 rounded-xl border border-border p-4 text-sm">
        <div className="font-semibold">Your review</div>
        <div className="mt-1 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-4 w-4 ${i <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          ))}
          <span className="ms-2 text-muted-foreground capitalize">· {(myReview as any).status?.code}</span>
        </div>
        {myReview.comment && <p className="mt-2 text-muted-foreground">{myReview.comment}</p>}
      </div>
    );
  }

  async function submit() {
    setSaving(true);
    const { error } = await supabase.from("product_reviews").insert({
      product_id: productId,
      customer_id: user!.id,
      order_id: eligibility!.orderId!,
      rating,
      comment: comment.trim() || null,
      // status is forced to "pending" server-side
      status_id: (await supabase.from("review_statuses").select("id").eq("code", "pending").maybeSingle()).data?.id as string,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks! Your review is pending approval.");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["my-review", productId, user!.id] });
  }

  return (
    <div className="mt-6 rounded-xl border border-border p-4">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Star className="h-4 w-4 me-2" /> Review this product
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`}>
                <Star className={`h-6 w-6 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Share your experience (optional)"
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving}>{saving ? "Submitting…" : "Submit review"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApprovedReviewList({ productId }: { productId: string }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["approved-reviews", productId],
    queryFn: async () =>
      (await supabase
        .from("product_reviews")
        .select("id, rating, comment, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(10)).data ?? [],
  });
  if (reviews.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold mb-4">Customer reviews</h2>
      <div className="space-y-3">
        {reviews.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              ))}
            </div>
            {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
