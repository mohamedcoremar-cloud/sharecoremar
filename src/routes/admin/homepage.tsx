import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPickerButton } from "@/components/admin/media-picker";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { GripVertical, Plus, Copy, Trash2, ChevronUp, ChevronDown, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/homepage")({ component: HomepageCMS });

function HomepageCMS() {
  const qc = useQueryClient();
  const { data: sections = [] } = useQuery({
    queryKey: ["cms-homepage"],
    queryFn: async () => (await supabase.from("homepage_sections").select("*").order("sort_order")).data ?? [],
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Homepage CMS</h1>
      <p className="text-muted-foreground mb-6">Edit every section of your homepage visually. No JSON required.</p>
      <div className="space-y-4">
        {sections.map((s: any) => (
          <SectionEditor key={s.id} section={s} onSaved={() => qc.invalidateQueries({ queryKey: ["cms-homepage"] })} />
        ))}
      </div>
    </div>
  );
}

const ICON_OPTIONS = [
  { value: "truck", label: "Truck" },
  { value: "shield-check", label: "Shield" },
  { value: "tag", label: "Tag" },
  { value: "headphones", label: "Headphones" },
  { value: "sparkles", label: "Sparkles" },
];

function SectionEditor({ section, onSaved }: any) {
  const [form, setForm] = useState<any>(section);
  useEffect(() => setForm(section), [section]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("homepage_sections")
        .update({
          title_en: form.title_en ?? null,
          title_ar: form.title_ar ?? null,
          subtitle_en: form.subtitle_en ?? null,
          subtitle_ar: form.subtitle_ar ?? null,
          is_active: !!form.is_active,
          content: form.content ?? {},
        })
        .eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Section saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setContent = (patch: any) => setForm({ ...form, content: { ...(form.content ?? {}), ...patch } });
  const key = section.section_key as string;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold uppercase tracking-wide text-xs text-primary">{key}</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${section.id}`} className="text-sm">Active</Label>
          <Switch id={`active-${section.id}`} checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title (EN)"><Input value={form.title_en ?? ""} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></Field>
        <Field label="Title (AR)"><Input dir="rtl" value={form.title_ar ?? ""} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} /></Field>
        <Field label="Subtitle (EN)"><Input value={form.subtitle_en ?? ""} onChange={(e) => setForm({ ...form, subtitle_en: e.target.value })} /></Field>
        <Field label="Subtitle (AR)"><Input dir="rtl" value={form.subtitle_ar ?? ""} onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })} /></Field>
      </div>

      <div className="mt-5 border-t pt-5">
        {key === "hero" && <HeroEditor content={form.content ?? {}} setContent={setContent} />}
        {key === "features" && <ItemsEditor content={form.content ?? {}} setContent={setContent} itemType="feature" />}
        {key === "stats" && <ItemsEditor content={form.content ?? {}} setContent={setContent} itemType="stat" />}
        {key === "cta_supplier" && <CtaSupplierEditor content={form.content ?? {}} setContent={setContent} />}
        {!["hero", "features", "stats", "cta_supplier"].includes(key) && (
          <GenericJsonEditor content={form.content ?? {}} setContent={(c) => setForm({ ...form, content: c })} />
        )}
      </div>

      <div className="mt-5 text-right">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">
          {save.isPending ? "Saving..." : "Save section"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

function HeroEditor({ content, setContent }: { content: any; setContent: (p: any) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Badge (EN)"><Input value={content.badge_en ?? ""} onChange={(e) => setContent({ badge_en: e.target.value })} /></Field>
      <Field label="Badge (AR)"><Input dir="rtl" value={content.badge_ar ?? ""} onChange={(e) => setContent({ badge_ar: e.target.value })} /></Field>
      <Field label="Primary CTA (EN)"><Input value={content.cta_primary_en ?? ""} onChange={(e) => setContent({ cta_primary_en: e.target.value })} /></Field>
      <Field label="Primary CTA (AR)"><Input dir="rtl" value={content.cta_primary_ar ?? ""} onChange={(e) => setContent({ cta_primary_ar: e.target.value })} /></Field>
      <Field label="Secondary CTA (EN)"><Input value={content.cta_secondary_en ?? ""} onChange={(e) => setContent({ cta_secondary_en: e.target.value })} /></Field>
      <Field label="Secondary CTA (AR)"><Input dir="rtl" value={content.cta_secondary_ar ?? ""} onChange={(e) => setContent({ cta_secondary_ar: e.target.value })} /></Field>
    </div>
  );
}

function CtaSupplierEditor({ content, setContent }: { content: any; setContent: (p: any) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Button Label (EN)"><Input value={content.cta_en ?? ""} onChange={(e) => setContent({ cta_en: e.target.value })} /></Field>
      <Field label="Button Label (AR)"><Input dir="rtl" value={content.cta_ar ?? ""} onChange={(e) => setContent({ cta_ar: e.target.value })} /></Field>
    </div>
  );
}

function ItemsEditor({
  content,
  setContent,
  itemType,
}: {
  content: any;
  setContent: (p: any) => void;
  itemType: "feature" | "stat";
}) {
  const items: any[] = Array.isArray(content.items) ? content.items : [];
  const setItems = (next: any[]) => setContent({ items: next });

  const emptyItem = () =>
    itemType === "feature"
      ? { icon: "sparkles", title_en: "", title_ar: "" }
      : { value: "", label_en: "", label_ar: "" };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setItems(next);
  };

  const update = (i: number, patch: any) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    setItems(next);
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">{itemType === "feature" ? "Features" : "Statistics"}</div>
        <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyItem()])}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
              setDragIndex(null);
            }}
            className="rounded-xl border border-border bg-background p-3"
          >
            <div className="flex items-start gap-2">
              <div className="pt-2 cursor-grab text-muted-foreground" title="Drag to reorder">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1 grid gap-2 md:grid-cols-3">
                {itemType === "feature" ? (
                  <>
                    <Field label="Icon">
                      <Select value={it.icon ?? "sparkles"} onValueChange={(v) => update(i, { icon: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Title (EN)"><Input value={it.title_en ?? ""} onChange={(e) => update(i, { title_en: e.target.value })} /></Field>
                    <Field label="Title (AR)"><Input dir="rtl" value={it.title_ar ?? ""} onChange={(e) => update(i, { title_ar: e.target.value })} /></Field>
                  </>
                ) : (
                  <>
                    <Field label="Value"><Input value={it.value ?? ""} onChange={(e) => update(i, { value: e.target.value })} placeholder="500+" /></Field>
                    <Field label="Label (EN)"><Input value={it.label_en ?? ""} onChange={(e) => update(i, { label_en: e.target.value })} /></Field>
                    <Field label="Label (AR)"><Input dir="rtl" value={it.label_ar ?? ""} onChange={(e) => update(i, { label_ar: e.target.value })} /></Field>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(i, i - 1)} disabled={i === 0} title="Move up"><ChevronUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} title="Move down"><ChevronDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setItems([...items.slice(0, i + 1), { ...it }, ...items.slice(i + 1)])} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, x) => x !== i))} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No items yet. Click "Add" to create one.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generic key/value editor for any other section keys — infers input type per field
 * so administrators never need to touch raw JSON.
 */
function GenericJsonEditor({ content, setContent }: { content: any; setContent: (c: any) => void }) {
  const entries = Object.entries(content ?? {});
  const set = (k: string, v: any) => setContent({ ...content, [k]: v });

  return (
    <div className="space-y-3">
      {entries.map(([k, v]) => {
        if (typeof v === "boolean") {
          return (
            <div key={k} className="flex items-center justify-between">
              <Label className="text-xs">{k}</Label>
              <Switch checked={v} onCheckedChange={(nv) => set(k, nv)} />
            </div>
          );
        }
        if (typeof v === "string") {
          const isUrl = /url|image|logo|cover|href|link/i.test(k);
          const isLong = v.length > 80 || /description|body|text|copy/i.test(k);
          if (isUrl) {
            return (
              <Field key={k} label={k}>
                <div className="flex gap-2">
                  <Input value={v} onChange={(e) => set(k, e.target.value)} placeholder="https://..." />
                  <MediaPickerButton onPick={(u) => set(k, u)} label="Pick" />
                </div>
                {v && <img src={v} alt="" className="mt-2 h-16 w-16 object-cover rounded border" />}
              </Field>
            );
          }
          if (isLong) {
            return <Field key={k} label={k}><Textarea rows={3} value={v} onChange={(e) => set(k, e.target.value)} /></Field>;
          }
          return <Field key={k} label={k}><Input value={v} onChange={(e) => set(k, e.target.value)} /></Field>;
        }
        if (typeof v === "number") {
          return <Field key={k} label={k}><Input type="number" value={v} onChange={(e) => set(k, Number(e.target.value))} /></Field>;
        }
        // Fallback: display read-only note (nested arrays/objects handled by dedicated editors above)
        return (
          <div key={k} className="text-xs text-muted-foreground">
            <ImageIcon className="inline h-3 w-3 mr-1" />
            <strong>{k}</strong>: complex value — use a dedicated section editor.
          </div>
        );
      })}
      {entries.length === 0 && <div className="text-sm text-muted-foreground">No content fields.</div>}
    </div>
  );
}
