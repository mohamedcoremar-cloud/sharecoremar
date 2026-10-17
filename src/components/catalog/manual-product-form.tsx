import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type ManualDraft = {
  name_en: string;
  name_ar: string;
  description: string;
  retail_price: string;
  offer_price: string;
  is_offer: boolean;
  unit: string;
  stock: string;
  category_id: string;
  image_url: string;
};

const EMPTY: ManualDraft = {
  name_en: "", name_ar: "", description: "", retail_price: "", offer_price: "",
  is_offer: false, unit: "", stock: "", category_id: "", image_url: "",
};

export function buildProposed(d: ManualDraft): Record<string, any> {
  const proposed: Record<string, any> = {
    name_en: d.name_en.trim(),
    name_ar: d.name_ar.trim() || d.name_en.trim(),
    description: d.description.trim() || null,
    retail_price: Number(d.retail_price),
    offer_price: d.offer_price === "" ? null : Number(d.offer_price),
    is_offer: d.is_offer,
    unit: d.unit.trim() || null,
    stock: d.stock === "" ? 0 : Number(d.stock),
    category_id: d.category_id || null,
  };
  if (d.image_url) proposed.images = [d.image_url];
  return proposed;
}

/**
 * Simple manual "add product" form (no AI). Creates a catalog_submissions row
 * with source='manual' that follows the normal approval chain — nothing is
 * published to the live catalog until an admin approves it.
 */
export function ManualProductDialog({
  open,
  onOpenChange,
  mode,
  supplierId,
  suppliers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** supplier: submits for own account. admin: picks a supplier, creates a draft. */
  mode: "supplier" | "admin";
  supplierId?: string;
  suppliers?: { id: string; company_name: string }[];
  onCreated?: () => void;
}) {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [draft, setDraft] = useState<ManualDraft>(EMPTY);
  const [target, setTarget] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["manual-form-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id, name_en, name_ar").order("name_en")).data ?? [],
  });

  function reset() {
    setDraft(EMPTY);
    setTarget("");
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const res = await uploadFile(file);
    setUploading(false);
    if (res?.url) {
      setDraft((d) => ({ ...d, image_url: res.url }));
      toast.success(ar ? "تم رفع الصورة" : "Photo uploaded");
    }
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!draft.name_en.trim()) throw new Error(ar ? "الاسم مطلوب" : "A product name is required");
      const price = Number(draft.retail_price);
      if (!Number.isFinite(price) || price <= 0) throw new Error(ar ? "السعر مطلوب" : "A valid price is required");
      const proposed = buildProposed(draft);

      if (mode === "supplier") {
        const { data, error } = await supabase.rpc("submit_new_product", { p_proposed: proposed });
        if (error) throw error;
        return data;
      }
      const sup = target || supplierId;
      if (!sup) throw new Error(ar ? "اختر الموردين" : "Select a supplier");
      const { data, error } = await supabase.rpc("admin_create_submission_draft", {
        p_supplier_id: sup,
        p_proposed: proposed,
        p_source: "manual",
        p_ai_note: "Manual entry by admin",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-submissions"] });
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      reset();
      onOpenChange(false);
      onCreated?.();
      toast.success(
        mode === "supplier"
          ? ar ? "تم إرسال المنتج للمراجعة" : "Product submitted for approval"
          : ar ? "تم إنشاء مسودة المنتج" : "Product draft created",
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ar ? "إضافة منتج يدويًا" : "Add a product manually"}</DialogTitle>
          <DialogDescription>
            {ar
              ? "يمر المنتج بنفس دورة المراجعة ولن يُنشر إلا بعد موافقة الإدارة."
              : "This follows the same review chain and is only published after admin approval."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pe-1">
          {mode === "admin" && (
            <div>
              <Label>{ar ? "المورد" : tr("Supplier")}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">{ar ? "اختر موردًا" : "Select a supplier"}</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.company_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>{ar ? "الاسم (EN)" : tr("Name (EN)")}</Label>
            <Input value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} />
          </div>
          <div>
            <Label>{ar ? "الاسم (AR)" : tr("Name (AR)")}</Label>
            <Input value={draft.name_ar} onChange={(e) => setDraft({ ...draft, name_ar: e.target.value })} />
          </div>
          <div>
            <Label>{ar ? "المواصفات / الوصف" : "Specs / description"}</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{ar ? "السعر (ج.م)" : tr("Retail price (EGP)")}</Label>
              <Input type="number" min="0" value={draft.retail_price}
                onChange={(e) => setDraft({ ...draft, retail_price: e.target.value })} />
            </div>
            <div>
              <Label>{ar ? "سعر العرض" : "Offer price"}</Label>
              <Input type="number" min="0" value={draft.offer_price}
                onChange={(e) => setDraft({ ...draft, offer_price: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{ar ? "الوحدة" : tr("Unit")}</Label>
              <Input placeholder={tr("250g")} value={draft.unit}
                onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
            </div>
            <div>
              <Label>{ar ? "المخزون" : tr("Stock")}</Label>
              <Input type="number" min="0" value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
            </div>
            <div>
              <Label>{ar ? "التصنيف" : tr("Category")}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={draft.category_id}
                onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
              >
                <option value="">—</option>
                {(categories as any[]).map((c) => (
                  <option key={c.id} value={c.id}>{ar ? c.name_ar : c.name_en}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_offer}
              onChange={(e) => setDraft({ ...draft, is_offer: e.target.checked })} />
            {ar ? "تشغيل العرض" : "Mark as on offer"}
          </label>

          <div>
            <Label>{ar ? "صورة المنتج" : "Product photo"}</Label>
            <div className="flex items-center gap-3 mt-1">
              <Button asChild type="button" variant="outline" size="sm" disabled={uploading}>
                <label className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <Upload className="h-4 w-4 me-1" />}
                  {ar ? "رفع صورة" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                </label>
              </Button>
              {draft.image_url && (
                <img src={draft.image_url} alt={draft.name_en || "product"} className="h-12 w-12 rounded-md object-cover border" />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
            {ar ? "إلغاء" : tr("Cancel")}
          </Button>
          <Button disabled={submit.isPending || uploading} onClick={() => submit.mutate()}>
            {submit.isPending && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
            {mode === "supplier"
              ? ar ? "إرسال للمراجعة" : "Submit for approval"
              : ar ? "إنشاء مسودة" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
