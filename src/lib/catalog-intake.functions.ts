import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runCatalogIntake, type IntakeResult } from "./catalog-intake.server";

type Input = {
  supplierId: string;
  fileBase64: string;
  mimeType: string;
  note?: string;
};

const ALLOWED_MIME = /^(image\/(png|jpe?g|webp)|application\/pdf|text\/(plain|csv)|application\/json)$/;

export const extractCatalogDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input?.supplierId) throw new Error("Missing supplier");
    if (!input.fileBase64 || typeof input.fileBase64 !== "string") throw new Error("Missing file");
    if (!ALLOWED_MIME.test(input.mimeType ?? "")) {
      throw new Error("Unsupported file type. Use an image (PNG/JPG/WebP), PDF, CSV or text file.");
    }
    // ~8MB base64 ceiling
    if (input.fileBase64.length > 11_000_000) throw new Error("File too large (max ~8MB).");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntakeResult> => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) throw new Error(roleErr.message);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    if (!roles.includes("admin") && !roles.includes("super_admin")) throw new Error("Forbidden");

    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", data.supplierId)
      .maybeSingle();
    if (!supplier) throw new Error("Supplier not found");

    return runCatalogIntake({
      supabase,
      supplierId: data.supplierId,
      fileBase64: data.fileBase64,
      mimeType: data.mimeType,
      note: data.note,
    });
  });
