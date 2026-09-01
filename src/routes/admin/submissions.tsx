import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractCatalogDrafts } from "@/lib/catalog-intake.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/currency";
import { Search, Eye, Sparkles, Upload, Plus } from "lucide-react";
import { StatusBadge } from "@/components/supplier/catalog-panel";
import { ManualProductDialog } from "@/components/catalog/manual-product-form";

export const Route = createFileRoute("/admin/submissions")({ component: SubmissionsAdmin });

const OPEN_CODES = ["draft", "admin_review", "sent_to_supplier", "supplier_approved", "pending_final_approval"];

function SubmissionsAdmin() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "all">("open");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_submissions")
        .select("*, catalog_submission_statuses(code, label_en, label_ar), suppliers(company_name), products(name_en, name_ar, retail_price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id, name_en").order("name_en")).data ?? [],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["all-suppliers"],
    queryFn: async () =>
      (await supabase.from("suppliers").select("id, company_name").is("deleted_at", null).order("company_name")).data ?? [],
  });

  const act = useMutation({
    mutationFn: async ({ id, status, why }: { id: string; status: string; why?: string }) => {
      const { error } = await supabase.rpc("admin_set_submission_status", {
        p_submission_id: id,
        p_status_code: status,
        p_reason: why ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      setDetail(null);
      setReason("");
      toast.success(v.status === "published" ? "Published to the catalogue" : "Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (rows as any[])
      .filter((r) => (tab === "open" ? OPEN_CODES.includes(r.catalog_submission_statuses?.code) : true))
      .filter((r) =>
        !ql ||
        String(r.reference_code ?? "").toLowerCase().includes(ql) ||
        String(r.suppliers?.company_name ?? "").toLowerCase().includes(ql) ||
        String(r.proposed?.name_en ?? "").toLowerCase().includes(ql) ||
        String(r.products?.name_en ?? "").toLowerCase().includes(ql),
      );
  }, [rows, tab, q]);

  const code = detail?.catalog_submission_statuses?.code as string | undefined;
  const nextActions: { label: string; status: string; variant?: "default" | "outline" }[] = (() => {
    switch (code) {
      case "draft": return [{ label: "Move to admin review", status: "admin_review" }];
      case "admin_review": return [
        { label: "Send to supplier", status: "sent_to_supplier" },
        { label: "Skip to final approval", status: "pending_final_approval", variant: "outline" },
      ];
      case "sent_to_supplier": return [{ label: "Pull back to review", status: "admin_review", variant: "outline" }];
      case "supplier_approved": return [{ label: "Move to final approval", status: "pending_final_approval" }];
      case "pending_final_approval": return [
        { label: "Approve & publish", status: "published" },
        { label: "Back to review", status: "admin_review", variant: "outline" },
      ];
      default: return [];
    }
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold mb-1">Catalog Submissions</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Supplier product proposals and bulk intake drafts. Nothing reaches the live catalogue until you publish it here.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["open", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="ps-9" placeholder="Search code, supplier or product…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4 me-1" /> Add product manually
        </Button>
        <Button onClick={() => setIntakeOpen(true)}>
          <Sparkles className="h-4 w-4 me-1" /> AI Bulk Intake
        </Button>
        <ManualProductDialog
          open={manualOpen}
          onOpenChange={setManualOpen}
          mode="admin"
          suppliers={suppliers as { id: string; company_name: string }[]}
        />
      </div>

      {isLoading && <div>Loading…</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="card-premium p-8 text-center text-muted-foreground">No submissions here.</div>
      )}

      <div className="space-y-3">
        {filtered.map((r: any) => (
          <div key={r.id} className="card-premium p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">
                {r.reference_code} · {r.kind === "edit" ? "Edit" : "New product"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {r.suppliers?.company_name ?? "—"} · {r.products?.name_en ?? r.proposed?.name_en ?? "—"}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {r.catalog_submission_statuses && (
                <StatusBadge
                  code={r.catalog_submission_statuses.code}
                  labelEn={r.catalog_submission_statuses.label_en}
                  labelAr={r.catalog_submission_statuses.label_ar}
                />
              )}
              <Button size="sm" variant="outline" onClick={() => { setDetail(r); setReason(r.reason ?? ""); }}>
                <Eye className="h-4 w-4 me-1" /> Review
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setReason(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.reference_code}</DialogTitle>
            <DialogDescription>
              {detail?.suppliers?.company_name} · {detail?.kind === "edit" ? "Edit to an existing product" : "New product draft"}
              {detail?.source === "ai_bulk" ? " · extracted by AI" : ""}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pe-1">
              {detail.kind === "edit" && detail.products && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-semibold mb-1">Current live values</div>
                  <div className="text-muted-foreground">
                    {detail.products.name_en} · {fmt(detail.products.retail_price)}
                  </div>
                </div>
              )}
              <div>
                <div className="font-semibold text-sm mb-1">Proposed values</div>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(detail.proposed ?? {}).map(([k, v]) => (
                      <tr key={k} className="border-b border-border/60">
                        <td className="py-1.5 pe-3 text-muted-foreground align-top">{k}</td>
                        <td className="py-1.5 font-medium">
                          {k === "category_id"
                            ? (categories as any[]).find((c) => c.id === v)?.name_en ?? String(v)
                            : typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.ai_note && (
                <div className="text-xs text-muted-foreground">AI note: {detail.ai_note}</div>
              )}
              <div>
                <Label>Reason / note (required to reject)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={act.isPending || !reason.trim() || nextActions.length === 0}
              onClick={() => act.mutate({ id: detail.id, status: "rejected", why: reason })}
            >
              Reject
            </Button>
            {nextActions.map((a) => (
              <Button
                key={a.status}
                variant={a.variant ?? "default"}
                disabled={act.isPending}
                onClick={() => act.mutate({ id: detail.id, status: a.status, why: reason.trim() || undefined })}
              >
                {a.label}
              </Button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiIntakeDialog
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        suppliers={suppliers as any[]}
        onDone={() => qc.invalidateQueries({ queryKey: ["admin-submissions"] })}
      />
    </div>
  );
}

function AiIntakeDialog({
  open,
  onOpenChange,
  suppliers,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suppliers: { id: string; company_name: string }[];
  onDone: () => void;
}) {
  const run = useServerFn(extractCatalogDrafts);
  const fileRef = useRef<HTMLInputElement>(null);
  const [supplierId, setSupplierId] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    created: { reference_code: string; name: string }[];
    skipped: { name: string; reason: string }[];
    servedByLabel: string;
  }>(null);

  const reset = () => {
    setSupplierId(""); setNote(""); setFile(null); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!supplierId || !file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const fileBase64 = btoa(bin);
      const res = await run({
        data: { supplierId, fileBase64, mimeType: file.type || "application/octet-stream", note: note.trim() || undefined },
      });
      setResult(res);
      onDone();
      toast.success(`Extracted ${res.created.length} draft${res.created.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>AI Bulk Intake</DialogTitle>
          <DialogDescription>
            Upload a trader's price list (photo, PDF, CSV or text). The AI extracts product drafts — nothing goes live
            without passing the full review chain.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Choose supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Price list file</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv,application/json"
                className="mt-1"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Note for reviewers (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. WhatsApp list from Hajj Mahmoud, March prices" />
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            <div className="text-xs text-muted-foreground">Served by: {result.servedByLabel}</div>
            {result.created.length > 0 && (
              <div>
                <div className="font-semibold text-sm mb-1">Created drafts ({result.created.length})</div>
                <ul className="text-sm space-y-1">
                  {result.created.map((c) => (
                    <li key={c.reference_code} className="rounded-md border border-border px-3 py-1.5">
                      {c.reference_code} · {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div>
                <div className="font-semibold text-sm mb-1">Skipped ({result.skipped.length})</div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {result.skipped.map((s, i) => (
                    <li key={i}>{s.name} — {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Drafts are in <strong>draft</strong> status. Review them, then move to admin review → send to supplier.
            </p>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button onClick={submit} disabled={busy || !supplierId || !file}>
              <Upload className="h-4 w-4 me-1" />
              {busy ? "Extracting…" : "Extract drafts"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
