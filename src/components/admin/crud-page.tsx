import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy, Search, Power, PowerOff } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { MediaPickerButton } from "@/components/admin/media-picker";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "switch" | "select" | "image" | "images";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

interface Props {
  title: string;
  table: string;
  columns: { key: string; label: string; render?: (row: any) => any }[];
  fields: FieldDef[];
  orderBy?: string;
  defaultValues?: Record<string, any>;
  searchKeys?: string[];
  hasActive?: boolean;
  activeKey?: string;
  /** Explicit column list for reads. Use when the table has columns the client is not granted (e.g. secrets). */
  selectColumns?: string;
}

export function CrudPage({ title, table, columns, fields, orderBy = "created_at", defaultValues = {}, searchKeys = ["name", "name_en", "slug", "title_en"], hasActive = true, activeKey = "is_active", selectColumns = "*" }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>(defaultValues);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table, selectColumns],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select(selectColumns).order(orderBy, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });


  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return (rows as any[]).filter((r) => {
      if (filter === "active" && !r[activeKey]) return false;
      if (filter === "inactive" && r[activeKey]) return false;
      if (!ql) return true;
      return searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(ql));
    });
  }, [rows, q, filter, searchKeys, activeKey]);

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        const { error } = await supabase.from(table as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); setOpen(false); setEditing(null); setForm(defaultValues); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from(table as any).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); setSelected(new Set()); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkSet = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const { error } = await supabase.from(table as any).update({ [activeKey]: active } as any).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); setSelected(new Set()); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  function startEdit(row: any) { setEditing(row); setForm(row); setOpen(true); }
  function startNew() { setEditing(null); setForm(defaultValues); setOpen(true); }
  function duplicate(row: any) {
    const { id, created_at, updated_at, ...rest } = row;
    const copy = { ...rest, slug: rest.slug ? `${rest.slug}-copy-${Date.now().toString(36)}` : undefined };
    setEditing(null); setForm(copy); setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {};
    for (const f of fields) {
      let v = form[f.name];
      if (f.type === "number") v = v === "" || v == null ? null : Number(v);
      if (v === "") v = null;
      payload[f.name] = v;
    }
    save.mutate(payload);
  }

  const allSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(r.id));
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((r: any) => r.id)));
  }
  function toggleOne(id: string) {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} / {rows.length}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="btn-gold"><Plus className="mr-2 h-4 w-4" /> {t("crud.new")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? t("crud.edit") : t("crud.new")} · {title}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} rows={3} />
                  ) : f.type === "switch" ? (
                    <div className="pt-2"><Switch checked={!!form[f.name]} onCheckedChange={(v) => setForm({ ...form, [f.name]: v })} /></div>
                  ) : f.type === "select" ? (
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : f.type === "image" ? (
                    <div className="flex items-center gap-3 mt-1">
                      {form[f.name] && <img src={form[f.name]} alt="" className="h-16 w-16 rounded-lg object-cover border" />}
                      <MediaPickerButton onPick={(url) => setForm({ ...form, [f.name]: url })} label={form[f.name] ? "Change" : "Choose image"} />
                      {form[f.name] && <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, [f.name]: "" })}>Clear</Button>}
                    </div>
                  ) : f.type === "images" ? (
                    <div className="mt-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(form[f.name] ?? []).map((u: string, i: number) => (
                          <div key={i} className="relative">
                            <img src={u} alt="" className="h-16 w-16 rounded-lg object-cover border" />
                            <button type="button" className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs" onClick={() => setForm({ ...form, [f.name]: (form[f.name] ?? []).filter((_: any, j: number) => j !== i) })}>×</button>
                          </div>
                        ))}
                      </div>
                      <MediaPickerButton onPick={(url) => setForm({ ...form, [f.name]: [...(form[f.name] ?? []), url] })} label="Add image" />
                    </div>
                  ) : (
                    <Input type={f.type === "number" ? "number" : "text"} step="0.01" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("crud.cancel")}</Button>
                <Button type="submit" disabled={save.isPending} className="btn-gold">{save.isPending ? t("crud.saving") : t("crud.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("crud.search")} className="pl-9" />
        </div>
        {hasActive && (
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            {(["all", "active", "inactive"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-2 ${filter === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {t(`crud.filter_${k}`)}
              </button>
            ))}
          </div>
        )}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selected.size} {t("crud.selected")}</span>
            {hasActive && (
              <>
                <Button size="sm" variant="outline" onClick={() => bulkSet.mutate({ ids: [...selected], active: true })}><Power className="h-3.5 w-3.5 mr-1" />{t("crud.bulk_enable")}</Button>
                <Button size="sm" variant="outline" onClick={() => bulkSet.mutate({ ids: [...selected], active: false })}><PowerOff className="h-3.5 w-3.5 mr-1" />{t("crud.bulk_disable")}</Button>
              </>
            )}
            <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete ${selected.size} items?`)) del.mutate([...selected]); }}><Trash2 className="h-3.5 w-3.5 mr-1" />{t("crud.bulk_delete")}</Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="p-3 w-8"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>
                {columns.map((c) => <th key={c.key} className="text-left rtl:text-right p-3 font-medium">{c.label}</th>)}
                <th className="p-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length + 2} className="p-8 text-center text-muted-foreground">{t("crud.loading")}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="p-8 text-center text-muted-foreground">{t("crud.no_records")}</td></tr>
              ) : filtered.map((row: any) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="p-3"><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleOne(row.id)} /></td>
                  {columns.map((c) => <td key={c.key} className="p-3">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicate(row)}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Edit" onClick={() => startEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Delete" onClick={() => { if (confirm("Delete this record?")) del.mutate([row.id]); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
