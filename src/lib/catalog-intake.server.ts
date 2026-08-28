/**
 * Server-side AI bulk catalog intake for the merchandising_inventory agent.
 *
 * Extracts structured product drafts from an uploaded file/image on behalf of a
 * supplier, then inserts each as a catalog_submissions row in `draft` status.
 * Nothing is ever published here — the drafts follow the normal approval chain.
 */

import { generateText } from "ai";
import { runWithAiFailover, type AiLeg } from "./ai-provider.server";

export type ExtractedDraft = {
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  retail_price: number | null;
  offer_price: number | null;
  unit: string | null;
  category_id: string | null;
  category_guess: string | null;
};

export type IntakeResult = {
  created: { reference_code: string; name: string }[];
  skipped: { name: string; reason: string }[];
  servedBy: AiLeg;
  servedByLabel: string;
};

type Category = { id: string; name_en: string; name_ar: string | null };

const PROMPT_HEAD = `You are a merchandising data-entry assistant for Share CoreMar, an Egyptian FMCG marketplace.
Extract every distinct sellable product from the attached document/photo (e.g. a trader's price list).
Return ONLY a JSON array (no markdown fences) of objects with these keys:
- "name_en": product name in English (translate from Arabic if needed)
- "name_ar": product name in Arabic (translate from English if needed), or null
- "description_en": one short sentence, or null
- "retail_price": numeric price in EGP, or null if not stated
- "offer_price": numeric discounted price in EGP if one is shown, else null
- "unit": pack/unit size as text (e.g. "250g", "1L", "12 pcs"), or null
- "category_guess": the single best-matching category name EN from this exact list, or null: `;

function matchCategory(guess: string | null, categories: Category[]): string | null {
  if (!guess) return null;
  const g = guess.trim().toLowerCase();
  const exact = categories.find(
    (c) => c.name_en.toLowerCase() === g || (c.name_ar ?? "").trim() === guess.trim(),
  );
  if (exact) return exact.id;
  const partial = categories.find(
    (c) => c.name_en.toLowerCase().includes(g) || g.includes(c.name_en.toLowerCase()),
  );
  return partial?.id ?? null;
}

function sanitizeDrafts(raw: unknown, categories: Category[]): ExtractedDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtractedDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const nameEn = typeof o.name_en === "string" ? o.name_en.trim() : "";
    if (!nameEn) continue;
    const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const guess = str(o.category_guess);
    out.push({
      name_en: nameEn,
      name_ar: str(o.name_ar),
      description_en: str(o.description_en),
      retail_price: num(o.retail_price),
      offer_price: num(o.offer_price),
      unit: str(o.unit),
      category_guess: guess,
      category_id: matchCategory(guess, categories),
    });
    if (out.length >= 50) break; // hard cap per upload
  }
  return out;
}

/** Pull the first JSON array out of model output, tolerating fences/prose. */
function parseJsonArray(text: string): unknown {
  const fenced = text.match(/\[[\s\S]*\]/);
  const candidate = fenced ? fenced[0] : text;
  return JSON.parse(candidate);
}

export async function runCatalogIntake(args: {
  supabase: any;
  supplierId: string;
  fileBase64: string;
  mimeType: string;
  note?: string;
}): Promise<IntakeResult> {
  const { supabase, supplierId, fileBase64, mimeType, note } = args;

  // Per-agent key routing from the registry
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("use_own_key, fallback_to_lovable")
    .eq("role_key", "merchandising_inventory")
    .maybeSingle();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_en, name_ar")
    .is("deleted_at", null);
  const cats = (categories ?? []) as Category[];

  const prompt = `${PROMPT_HEAD}${cats.map((c) => c.name_en).join(", ") || "(none configured)"}].
Prices are in Egyptian Pounds. If the document is ambiguous, prefer null over inventing values.`;

  const isImage = mimeType.startsWith("image/");
  const isText = mimeType.startsWith("text/") || mimeType === "application/json";

  const { result, leg, label } = await runWithAiFailover(
    async ({ model }) => {
      const content: any[] = [{ type: "text", text: prompt }];
      if (isImage) {
        content.push({ type: "image", image: fileBase64, mimeType });
      } else if (isText) {
        const decoded = Buffer.from(fileBase64, "base64").toString("utf8");
        content.push({ type: "text", text: `Document contents:\n${decoded.slice(0, 20000)}` });
      } else {
        // PDF or other binary document
        content.push({ type: "file", data: fileBase64, mimeType });
      }
      const res = await generateText({ model, messages: [{ role: "user", content }] });
      return res.text;
    },
    {
      useOwnKey: agent?.use_own_key ?? true,
      fallbackToLovable: agent?.fallback_to_lovable ?? true,
    },
  );

  const drafts = sanitizeDrafts(parseJsonArray(result), cats);
  const created: IntakeResult["created"] = [];
  const skipped: IntakeResult["skipped"] = [];

  for (const d of drafts) {
    if (d.retail_price === null) {
      skipped.push({ name: d.name_en, reason: "no price extracted" });
      continue;
    }
    const proposed = {
      name_en: d.name_en,
      name_ar: d.name_ar,
      description_en: d.description_en,
      retail_price: d.retail_price,
      offer_price: d.offer_price,
      unit: d.unit,
      category_id: d.category_id,
    };
    const aiNote = [
      `AI bulk intake (${label})`,
      d.category_guess ? `category guess: ${d.category_guess}${d.category_id ? "" : " — unmatched"}` : null,
      note?.trim() ? `admin note: ${note.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const { data, error } = await supabase.rpc("admin_create_submission_draft", {
      p_supplier_id: supplierId,
      p_proposed: proposed,
      p_source: "ai_bulk",
      p_ai_note: aiNote,
    });
    if (error) {
      skipped.push({ name: d.name_en, reason: error.message });
    } else {
      created.push({ reference_code: String(data ?? ""), name: d.name_en });
    }
  }

  return { created, skipped, servedBy: leg, servedByLabel: label };
}
