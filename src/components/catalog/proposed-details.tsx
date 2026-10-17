import { useI18n } from "@/lib/i18n";

export function ProposedDetails({ proposed }: { proposed: Record<string, unknown> }) {
  const { tr } = useI18n();
  return <dl className="mt-3 space-y-2 text-sm">
    {Object.entries(proposed).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-b border-border py-2">
      <dt className="text-muted-foreground">{tr(key)}</dt>
      <dd className="break-words" dir={key.endsWith("_en") ? "ltr" : undefined}>
        {key === "images" && Array.isArray(value) ? <div className="flex flex-wrap gap-2">{value.filter((v): v is string => typeof v === "string").map((url) => <img key={url} src={url} alt={tr("Product")} className="h-16 w-16 rounded-md object-cover" />)}</div> : typeof value === "boolean" ? tr(value ? "Yes" : "No") : value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)}
      </dd>
    </div>)}
  </dl>;
}
