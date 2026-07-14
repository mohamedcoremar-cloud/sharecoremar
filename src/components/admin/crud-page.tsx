import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "switch" | "select";
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
}

export function CrudPage({ title, table, columns, fields, orderBy = "created_at", defaultValues = {} }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>(defaultValues);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order(orderBy, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [table] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  function startEdit(row: any) { setEditing(row); setForm(row); setOpen(true); }
  function startNew() { setEditing(null); setForm(defaultValues); setOpen(true); }

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

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{rows.length} record{rows.length === 1 ? "" : "s"}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="btn-gold"><Plus className="mr-2 h-4 w-4" /> New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} {title.replace(/s$/, "")}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {fields.map((f) => (
                <div key={f.name}>
                  <Label>{f.label}{f.required && <span className="text-destructive">*</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} rows={3} />
                  ) : f.type === "switch" ? (
                    <div className="pt-2"><Switch checked={!!form[f.name]} onCheckedChange={(v) => setForm({ ...form, [f.name]: v })} /></div>
                  ) : f.type === "select" ? (
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      <option value="">—</option>
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input type={f.type === "number" ? "number" : "text"} step="0.01" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={save.isPending} className="btn-gold">{save.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {columns.map((c) => <th key={c.key} className="text-left p-3 font-medium">{c.label}</th>)}
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="p-8 text-center text-muted-foreground">No records yet</td></tr>
              ) : rows.map((row: any) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  {columns.map((c) => <td key={c.key} className="p-3">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</td>)}
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this record?")) del.mutate(row.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
