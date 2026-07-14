import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/homepage")({ component: HomepageCMS });

function HomepageCMS() {
  const qc = useQueryClient();
  const { data: sections = [] } = useQuery({
    queryKey: ["cms-homepage"],
    queryFn: async () => (await supabase.from("homepage_sections").select("*").order("sort_order")).data ?? [],
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Homepage CMS</h1>
      <p className="text-muted-foreground mb-6">Edit every section of your homepage.</p>
      <div className="space-y-4">
        {sections.map((s: any) => <SectionEditor key={s.id} section={s} onSaved={() => qc.invalidateQueries({ queryKey: ["cms-homepage"] })} />)}
      </div>
    </div>
  );
}

function SectionEditor({ section, onSaved }: any) {
  const [form, setForm] = useState(section);
  useEffect(() => setForm(section), [section]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("homepage_sections").update({
        title_en: form.title_en, title_ar: form.title_ar,
        subtitle_en: form.subtitle_en, subtitle_ar: form.subtitle_ar,
        is_active: form.is_active,
        content: typeof form.content === "string" ? JSON.parse(form.content) : form.content,
      }).eq("id", section.id);
      if (error) throw error;
    },
    onSuccess: () => { onSaved(); toast.success("Section saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold uppercase tracking-wide text-xs text-primary">{section.section_key}</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><Label>Title EN</Label><Input value={form.title_en ?? ""} onChange={(e) => setForm({ ...form, title_en: e.target.value })} /></div>
        <div><Label>Title AR</Label><Input value={form.title_ar ?? ""} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} /></div>
        <div><Label>Subtitle EN</Label><Input value={form.subtitle_en ?? ""} onChange={(e) => setForm({ ...form, subtitle_en: e.target.value })} /></div>
        <div><Label>Subtitle AR</Label><Input value={form.subtitle_ar ?? ""} onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })} /></div>
      </div>
      <div className="mt-3">
        <Label>Content (JSON)</Label>
        <Textarea rows={6} value={typeof form.content === "string" ? form.content : JSON.stringify(form.content, null, 2)} onChange={(e) => setForm({ ...form, content: e.target.value })} className="font-mono text-xs" />
      </div>
      <div className="mt-3 text-right">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="btn-gold">{save.isPending ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  );
}
