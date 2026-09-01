import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/currency";
import { Pencil, Clock, CheckCircle2, XCircle, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type SubmissionRow = {
  id: string;
  reference_code: string;
  product_id: string | null;
  kind: string;
  reason: string | null;
  proposed: Record<string, any>;
  created_at: string;
  catalog_submission_statuses: { code: string; label_en: string; label_ar: string } | null;
};

const STATUS_STYLE: Record<string, { icon: any; className: string }> = {
  draft: { icon: Clock, className: "text-muted-foreground" },
  admin_review: { icon: Clock, className: "text-amber-500" },
  sent_to_supplier: { icon: Send, className: "text-primary" },
  supplier_approved: { icon: CheckCircle2, className: "text-emerald-500" },
  pending_final_approval: { icon: Clock, className: "text-amber-500" },
  published: { icon: CheckCircle2, className: "text-emerald-500" },
  rejected: { icon: XCircle, className: "text-destructive" },
};

export function StatusBadge({ code, labelEn, labelAr }: { code: string; labelEn: string; labelAr: string }) {
  const { lang } = useI18n();
  const meta = STATUS_STYLE[code] ?? STATUS_STYLE.draft;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" /> {lang === "ar" ? labelAr : labelEn}
    </span>
  );
}

type Draft = {
  name_en: string;
  name_ar: string;
  description: string;
  retail_price: string;
  offer_price: string;
  is_offer: boolean;
  unit: string;
  stock: string;
  category_id: string;
};

function toDraft(p: any): Draft {
  return {
    name_en: p.name_en ?? "",
    name_ar: p.name_ar ?? "",
    description: p.description ?? "",
    retail_price: String(p.retail_price ?? ""),
    offer_price: p.offer_price == null ? "" : String(p.offer_price),
    is_offer: !!p.is_offer,
    unit: p.unit ?? "",
    stock: String(p.stock ?? ""),
    category_id: p.category_id ?? "",
  };
}

export function SupplierCatalogPanel({ supplierId }: { supplierId: string }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const [editing, setEditing] = useState<any>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [respondTo, setRespondTo] = useState<SubmissionRow | null>(null);
  const [note, setNote] = useState("");

  const ar = lang === "ar";

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["supplier-products", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_en, name_ar, description, retail_price, offer_price, is_offer, unit, stock, category_id, is_active")
        .eq("supplier_id", supplierId)
        .order("name_en");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["supplier-submissions", supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_submissions")
        .select("id, reference_code, product_id, kind, reason, proposed, created_at, catalog_submission_statuses(code, label_en, label_ar)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SubmissionRow[];
    },
  });

  const openByProduct = useMemo(() => {
    const m = new Map<string, SubmissionRow>();
    for (const s of submissions) {
      const code = s.catalog_submission_statuses?.code;
      if (s.product_id && code && code !== "published" && code !== "rejected") m.set(s.product_id, s);
    }
    return m;
  }, [submissions]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!editing || !draft) return;
      const original = toDraft(editing);
      const proposed: Record<string, any> = {};
      if (draft.name_en.trim() !== original.name_en) proposed.name_en = draft.name_en.trim();
      if (draft.name_ar.trim() !== original.name_ar) proposed.name_ar = draft.name_ar.trim();
      if (draft.description !== original.description) proposed.description = draft.description;
      if (draft.retail_price !== original.retail_price) proposed.retail_price = Number(draft.retail_price);
      if (draft.offer_price !== original.offer_price) proposed.offer_price = draft.offer_price === "" ? null : Number(draft.offer_price);
      if (draft.is_offer !== original.is_offer) proposed.is_offer = draft.is_offer;
      if (draft.unit !== original.unit) proposed.unit = draft.unit;
      if (draft.stock !== original.stock) proposed.stock = Number(draft.stock);

      if (Object.keys(proposed).length === 0) {
        throw new Error(ar ? "لم تقم بتغيير أي بيانات" : "You haven't changed anything yet");
      }
      const { data, error } = await supabase.rpc("submit_product_edit", {
        p_product_id: editing.id,
        p_proposed: proposed,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-submissions", supplierId] });
      setEditing(null);
      setDraft(null);
      toast.success(ar ? "تم إرسال التعديل للمراجعة" : "Change submitted for approval");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: async ({ action }: { action: "approve" | "changes" }) => {
      const { error } = await supabase.rpc("supplier_respond_submission", {
        p_submission_id: respondTo!.id,
        p_action: action,
        p_note: action === "changes" ? note : undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-submissions", supplierId] });
      setRespondTo(null);
      setNote("");
      toast.success(ar ? "تم الإرسال" : "Sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const awaiting = submissions.filter((s) => s.catalog_submission_statuses?.code === "sent_to_supplier");

  return (
    <div className="space-y-8">
      {awaiting.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">{ar ? "بانتظار موافقتك" : "Awaiting your approval"}</h2>
          <div className="space-y-3">
            {awaiting.map((s) => (
              <div key={s.id} className="card-premium p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.proposed?.name_ar || s.proposed?.name_en || s.reference_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.reference_code} · {s.proposed?.retail_price != null ? fmt(s.proposed.retail_price) : "—"}
                  </div>
                </div>
                <Button size="sm" onClick={() => setRespondTo(s)}>{ar ? "مراجعة" : "Review"}</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg font-bold">{ar ? "منتجاتي" : "My products"}</h2>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4 me-1" /> {ar ? "إضافة منتج" : "Add product"}
          </Button>
        </div>
        {isLoading && <div>Loading…</div>}
        {!isLoading && products.length === 0 && (
          <div className="card-premium p-8 text-center text-muted-foreground">
            {ar ? "لا توجد منتجات مرتبطة بحسابك." : "No products are linked to your account yet."}
          </div>
        )}
        <div className="space-y-3">
          {products.map((p: any) => {
            const open = openByProduct.get(p.id);
            return (
              <div key={p.id} className="card-premium p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{ar ? p.name_ar : p.name_en}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(p.retail_price)} · {ar ? "المخزون" : "Stock"}: {p.stock ?? 0}
                  </div>
                </div>
                {open ? (
                  <StatusBadge
                    code={open.catalog_submission_statuses!.code}
                    labelEn={open.catalog_submission_statuses!.label_en}
                    labelAr={open.catalog_submission_statuses!.label_ar}
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setDraft(toDraft(p)); }}>
                    <Pencil className="h-4 w-4 me-1" /> {ar ? "اقتراح تعديل" : "Propose edit"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">{ar ? "طلبات التعديل" : "My submissions"}</h2>
        {submissions.length === 0 ? (
          <div className="card-premium p-8 text-center text-muted-foreground">
            {ar ? "لا توجد طلبات بعد." : "No submissions yet."}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="card-premium p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.reference_code}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                  </div>
                  {s.catalog_submission_statuses && (
                    <StatusBadge
                      code={s.catalog_submission_statuses.code}
                      labelEn={s.catalog_submission_statuses.label_en}
                      labelAr={s.catalog_submission_statuses.label_ar}
                    />
                  )}
                </div>
                <pre className="mt-3 text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(s.proposed, null, 2)}
                </pre>
                {s.reason && (
                  <div className="mt-2 text-sm text-destructive">
                    {ar ? "السبب" : "Reason"}: {s.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setDraft(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ar ? "اقتراح تعديل" : "Propose an edit"}</DialogTitle>
            <DialogDescription>
              {ar
                ? "لن يتم تطبيق أي تغيير قبل موافقة الإدارة."
                : "Nothing changes on the live store until an admin approves it."}
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pe-1">
              <div><Label>{ar ? "الاسم (EN)" : "Name (EN)"}</Label>
                <Input value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} /></div>
              <div><Label>{ar ? "الاسم (AR)" : "Name (AR)"}</Label>
                <Input value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} /></div>
              <div><Label>{ar ? "الوصف" : "Description"}</Label>
                <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{ar ? "السعر" : "Retail price"}</Label>
                  <Input type="number" value={draft.retail_price} onChange={(e) => setDraft({ ...draft, retail_price: e.target.value })} /></div>
                <div><Label>{ar ? "سعر العرض" : "Offer price"}</Label>
                  <Input type="number" value={draft.offer_price} onChange={(e) => setDraft({ ...draft, offer_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{ar ? "الوحدة" : "Unit"}</Label>
                  <Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
                <div><Label>{ar ? "المخزون" : "Stock"}</Label>
                  <Input type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.is_offer}
                  onChange={(e) => setDraft({ ...draft, is_offer: e.target.checked })}
                />
                {ar ? "تشغيل العرض" : "Mark as on offer"}
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditing(null); setDraft(null); }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
              {ar ? "إرسال للمراجعة" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!respondTo} onOpenChange={(o) => { if (!o) { setRespondTo(null); setNote(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{respondTo?.reference_code}</DialogTitle>
            <DialogDescription>
              {ar ? "راجع البيانات المقترحة ثم وافق أو اطلب تعديلًا." : "Review the proposed details, then approve or request changes."}
            </DialogDescription>
          </DialogHeader>
          <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-64">
            {JSON.stringify(respondTo?.proposed ?? {}, null, 2)}
          </pre>
          <div>
            <Label>{ar ? "ملاحظات (مطلوبة لطلب التعديل)" : "Notes (required to request changes)"}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={respond.isPending || !note.trim()}
              onClick={() => respond.mutate({ action: "changes" })}
            >
              {ar ? "طلب تعديل" : "Request changes"}
            </Button>
            <Button disabled={respond.isPending} onClick={() => respond.mutate({ action: "approve" })}>
              {ar ? "موافقة" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
