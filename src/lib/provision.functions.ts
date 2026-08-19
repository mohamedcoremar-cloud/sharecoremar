import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { entityType: "supplier" | "logistics"; entityId: string; email?: string };

export type ProvisionResult = {
  ok: true;
  created: boolean;
  email: string;
  password?: string;
  role: "supplier" | "logistics_partner";
};

export const provisionEntityAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input || (input.entityType !== "supplier" && input.entityType !== "logistics")) {
      throw new Error("Invalid entity type");
    }
    if (!input.entityId) throw new Error("Missing entity id");
    return input;
  })
  .handler(async ({ data, context }): Promise<ProvisionResult> => {
    const { supabase, userId } = context;

    // Authorize: caller must be admin / super_admin
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) throw new Error(roleErr.message);
    const callerRoles = (roleRows ?? []).map((r) => r.role as string);
    if (!callerRoles.includes("admin") && !callerRoles.includes("super_admin")) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const isSupplier = data.entityType === "supplier";
    const role = (isSupplier ? "supplier" : "logistics_partner") as "supplier" | "logistics_partner";
    const table = isSupplier ? "suppliers" : "delivery_partners";

    const { data: entity, error: entErr } = await supabaseAdmin
      .from(table as "suppliers")
      .select("*")
      .eq("id", data.entityId)
      .maybeSingle();
    if (entErr) throw new Error(entErr.message);
    if (!entity) throw new Error("Entity not found");

    const e = entity as Record<string, unknown>;
    let targetUserId = (isSupplier ? (e["user_id"] as string | null) : null) ?? null;
    let email = (data.email ?? (e["email"] as string | null) ?? "").trim().toLowerCase();
    let created = false;
    let password: string | undefined;

    if (targetUserId) {
      const { data: got, error } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (error || !got?.user) throw new Error("Linked account no longer exists");
      email = got.user.email ?? email;
    } else {
      if (!email) throw new Error("An email address is required to create an account");
      // Reuse an existing auth account with the same email when present
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (profile?.id) {
        targetUserId = profile.id;
      } else {
        password = `Scm-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 9000 + 1000)}!`;
        const label = (e["company_name"] ?? e["name_en"] ?? email) as string;
        const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: label },
        });
        if (createErr || !createdUser?.user) throw new Error(createErr?.message ?? "Could not create account");
        targetUserId = createdUser.user.id;
        created = true;
      }
    }

    // Grant role (idempotent)
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });
    if (rErr) throw new Error(rErr.message);

    // Link entity <-> user (idempotent)
    if (isSupplier) {
      const { data: existing } = await supabaseAdmin
        .from("supplier_users")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("supplier_id", data.entityId)
        .maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from("supplier_users").update({ is_active: true }).eq("id", existing.id);
      } else {
        const { error } = await supabaseAdmin
          .from("supplier_users")
          .insert({ user_id: targetUserId, supplier_id: data.entityId, is_active: true });
        if (error) throw new Error(error.message);
      }
      if (!e["user_id"]) {
        await supabaseAdmin.from("suppliers").update({ user_id: targetUserId }).eq("id", data.entityId);
      }
    } else {
      const { data: existing } = await supabaseAdmin
        .from("delivery_partner_users")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("delivery_partner_id", data.entityId)
        .maybeSingle();
      if (existing?.id) {
        await supabaseAdmin.from("delivery_partner_users").update({ is_active: true }).eq("id", existing.id);
      } else {
        const { error } = await supabaseAdmin
          .from("delivery_partner_users")
          .insert({ user_id: targetUserId, delivery_partner_id: data.entityId, is_active: true });
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true, created, email, ...(password ? { password } : {}), role };
  });
