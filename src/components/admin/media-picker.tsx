import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, Image as ImageIcon, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "media";

export function useMediaList() {
  return useQuery({
    queryKey: ["media_library"],
    queryFn: async () => (await supabase.from("media_library").select("*").order("created_at", { ascending: false })).data ?? [],
  });
}

export async function uploadFile(file: File): Promise<{ id: string | null; url: string; path: string } | null> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type });
  if (upErr) { toast.error(upErr.message); return null; }
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  const url = signed?.signedUrl ?? "";
  const { data: row } = await supabase.from("media_library").insert({ path, url, name: file.name, mime_type: file.type, size_bytes: file.size }).select("id").maybeSingle();
  return { id: row?.id ?? null, url, path };
}

export function MediaPickerButton({ onPick, label = "Choose image" }: { onPick: (url: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ImageIcon className="h-4 w-4 mr-2" /> {label}
      </Button>
      <MediaPickerDialog open={open} onOpenChange={setOpen} onPick={(u) => { onPick(u); setOpen(false); }} />
    </>
  );
}

export function MediaPickerDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (url: string) => void }) {
  const qc = useQueryClient();
  const { data: items = [] } = useMediaList();
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const f of Array.from(files)) await uploadFile(f);
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["media_library"] });
    toast.success("Uploaded");
  }

  const filtered = (items as any[]).filter((i) => !q || i.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Media Library</DialogTitle></DialogHeader>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search media..." className="pl-9" />
          </div>
          <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium cursor-pointer hover:opacity-90">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-y-auto py-2">
          {filtered.map((m: any) => (
            <button key={m.id} type="button" onClick={() => onPick(m.url)} className="group relative aspect-square rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary">
              <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] truncate px-1 py-0.5 opacity-0 group-hover:opacity-100">{m.name}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="col-span-full p-8 text-center text-sm text-muted-foreground">No media yet. Upload your first image.</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaGrid() {
  const qc = useQueryClient();
  const { data: items = [] } = useMediaList();
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    for (const f of Array.from(files)) await uploadFile(f);
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["media_library"] });
    toast.success("Uploaded");
  }

  const del = useMutation({
    mutationFn: async (m: any) => {
      await supabase.storage.from(BUCKET).remove([m.path]);
      await supabase.from("media_library").delete().eq("id", m.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media_library"] }); toast.success("Deleted"); },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground mt-1">{items.length} files</p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold cursor-pointer hover:opacity-90">
          <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload files"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {(items as any[]).map((m) => (
          <div key={m.id} className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted">
            <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button onClick={() => { navigator.clipboard.writeText(m.url); toast.success("URL copied"); }} className="text-xs text-white underline">Copy URL</button>
              <button onClick={() => { if (confirm("Delete?")) del.mutate(m); }} className="text-xs text-white flex items-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full p-12 text-center border border-dashed rounded-2xl text-muted-foreground">No media yet. Upload images to start filling your marketplace.</div>}
      </div>
    </div>
  );
}
