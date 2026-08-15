/**
 * Security regression tests.
 *
 * Guards two invariants that have regressed before:
 *  1. RLS is ENABLED on every table in the `public` schema.
 *  2. SECURITY DEFINER admin RPCs are NOT executable by `anon` or `PUBLIC`.
 *     They may only be executable by `authenticated` (in-function role check)
 *     and/or `service_role`. Trigger-only helpers must not expose EXECUTE at all
 *     to anon/public/authenticated.
 *
 * Runs against the database pointed at by the standard PG* env vars
 * (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE). When those are missing the
 * suite is skipped so remote builds without DB access don't break — the test
 * is designed to run inside the Lovable sandbox / CI where PG* is injected.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const hasPg = !!process.env.PGHOST;
const d = hasPg ? describe : describe.skip;

// Functions whose EXECUTE ACL is inspected. Update when adding new admin RPCs.
const ADMIN_RPCS: Array<{
  schema: string;
  name: string;
  /** roles that MAY hold EXECUTE. Any other role with EXECUTE is a regression. */
  allowedExecutors: string[];
}> = [
  // Admin-only RPCs — authenticated is allowed because the function body
  // asserts the caller has admin/super_admin via private.has_role.
  { schema: "public", name: "approve_order_payment", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "public", name: "reject_order_payment", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "public", name: "rollback_content_version", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "public", name: "update_delivery_status", allowedExecutors: ["authenticated", "service_role"] },
  // Owner-scoped RPC — signed-in user acts on their own cart.
  { schema: "public", name: "merge_guest_cart_on_login", allowedExecutors: ["authenticated", "service_role"] },
  // Review moderation — admin/super_admin asserted inside the function body.
  { schema: "public", name: "set_review_status", allowedExecutors: ["authenticated", "service_role"] },
  // Fulfillment loop — scope asserted inside the function body (supplier_users /
  // delivery_partner_users membership + forward-only stage transitions).
  { schema: "public", name: "supplier_set_order_stage", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "public", name: "logistics_set_order_stage", allowedExecutors: ["authenticated", "service_role"] },
  // Trigger-only helpers — must NOT be callable from the Data API.
  { schema: "public", name: "record_content_version", allowedExecutors: ["service_role"] },
  { schema: "public", name: "handle_new_user", allowedExecutors: ["service_role"] },
  { schema: "public", name: "ensure_delivery_for_confirmed_order", allowedExecutors: ["service_role"] },
  { schema: "public", name: "enforce_verified_purchase_review", allowedExecutors: ["service_role"] },
  { schema: "public", name: "recalc_product_rating", allowedExecutors: ["service_role"] },
  { schema: "public", name: "queue_order_at_supplier", allowedExecutors: ["service_role"] },
  // Private role/scope helpers — never callable by anon/public.
  { schema: "private", name: "has_role", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "is_admin", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "supplier_id_for", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "delivery_partner_id_for", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "order_has_supplier", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "order_stage", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "order_for_delivery_partner", allowedExecutors: ["authenticated", "service_role"] },
];


const FORBIDDEN_EXECUTORS = ["anon", "public", "PUBLIC"];

const pool = hasPg ? new Pool({ ssl: { rejectUnauthorized: false }, max: 4 }) : null;
async function getClient() {
  if (!pool) throw new Error("PG env not configured");
  return pool;
}

afterAll(async () => {
  if (pool) await pool.end();
});

d("RLS is enabled on every public table", () => {
  it("no public.* table has RLS disabled", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
        ORDER BY 1`,
    );
    expect(rows.map((r) => r.relname), "tables missing RLS").toEqual([]);
  });

  it("every public.* table has at least one policy", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        GROUP BY c.relname
       HAVING COUNT(p.polname) = 0
        ORDER BY 1`,
    );
    expect(rows.map((r) => r.relname), "tables with RLS enabled but no policies").toEqual([]);
  });
});

d("SECURITY DEFINER admin RPC execute permissions", () => {
  it.each(ADMIN_RPCS)(
    "$schema.$name has only allowed EXECUTE grantees",
    async ({ schema, name, allowedExecutors }) => {
      const c = await getClient();
      const { rows } = await c.query<{ prosecdef: boolean; proacl: string[] | null }>(
        `SELECT p.prosecdef, p.proacl::text[] AS proacl
           FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = $1 AND p.proname = $2`,
        [schema, name],
      );
      expect(rows, `function ${schema}.${name} not found`).toHaveLength(1);
      const row = rows[0];
      expect(row.prosecdef, `${schema}.${name} must be SECURITY DEFINER`).toBe(true);

      // proacl is null when only the owner has default privileges — safe.
      const acl = row.proacl ?? [];
      const executors = acl
        .map((entry) => {
          // entries look like `role=X/grantor` (X = EXECUTE). PUBLIC is `=X/grantor`.
          const [left, right] = entry.split("=");
          if (!right?.includes("X")) return null;
          return left === "" ? "PUBLIC" : left;
        })
        .filter((x): x is string => !!x);

      const owners = new Set(["postgres", "sandbox_exec", "supabase_admin"]);
      const nonOwner = executors.filter((r) => !owners.has(r));

      const forbidden = nonOwner.filter((r) => FORBIDDEN_EXECUTORS.includes(r));
      expect(forbidden, `${schema}.${name} exposes EXECUTE to anon/PUBLIC`).toEqual([]);

      const unexpected = nonOwner.filter(
        (r) => !allowedExecutors.includes(r) && !FORBIDDEN_EXECUTORS.includes(r),
      );
      expect(
        unexpected,
        `${schema}.${name} has EXECUTE granted to unexpected role(s); update ADMIN_RPCS if intentional`,
      ).toEqual([]);
    },
  );
});

d("Fulfillment loop: new tables are locked down", () => {
  it("supplier_users and delivery_partner_users have RLS + policies", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ relname: string; rls: boolean; policies: string }>(
      `SELECT c.relname, c.relrowsecurity AS rls, COUNT(p.polname)::text AS policies
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         LEFT JOIN pg_policy p ON p.polrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relname IN ('supplier_users','delivery_partner_users')
        GROUP BY 1,2 ORDER BY 1`,
    );
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.rls, `${r.relname} RLS`).toBe(true);
      expect(Number(r.policies), `${r.relname} policies`).toBeGreaterThan(0);
    }
  });

  it("anon holds no privileges on the membership tables or the stage view", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee = 'anon'
          AND table_name IN ('supplier_users','delivery_partner_users','order_fulfillment_current')`,
    );
    expect(rows, "anon must have no grants on fulfillment surfaces").toEqual([]);
  });

  it("authenticated cannot write the membership tables directly", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee = 'authenticated'
          AND privilege_type IN ('INSERT','UPDATE','DELETE')
          AND table_name IN ('supplier_users','delivery_partner_users')`,
    );
    expect(rows, "membership assignment is admin/service_role only").toEqual([]);
  });

  it("the derived stage view is security_invoker (RLS still applies)", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ opts: string[] | null }>(
      `SELECT c.reloptions AS opts
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'order_fulfillment_current'`,
    );
    expect(rows).toHaveLength(1);
    expect((rows[0].opts ?? []).join(",")).toContain("security_invoker=true");
  });

  it("scoped read policies exist for supplier and logistics on every exposed table", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ policyname: string }>(
      `SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname IN (
            'orders_supplier_read','orders_logistics_read',
            'order_items_supplier_read','order_items_logistics_read',
            'osh_supplier_read','osh_logistics_read',
            'deliveries_logistics_read')
        ORDER BY 1`,
    );
    expect(rows.map((r) => r.policyname)).toEqual([
      "deliveries_logistics_read",
      "order_items_logistics_read",
      "order_items_supplier_read",
      "orders_logistics_read",
      "orders_supplier_read",
      "osh_logistics_read",
      "osh_supplier_read",
    ]);
  });
});

d("Fulfillment loop: scoping helpers isolate tenants", () => {
  it("a user with no membership resolves to no supplier and no partner", async () => {
    const c = await getClient();
    const { rows } = await c.query(
      `SELECT private.supplier_id_for(gen_random_uuid()) AS s,
              private.delivery_partner_id_for(gen_random_uuid()) AS p`,
    );
    expect(rows[0].s).toBeNull();
    expect(rows[0].p).toBeNull();
  });

  it("order_has_supplier is false for a foreign supplier and for a null supplier", async () => {
    const c = await getClient();
    const { rows } = await c.query(
      `SELECT private.order_has_supplier(gen_random_uuid(), gen_random_uuid()) AS foreign_sup,
              private.order_has_supplier(gen_random_uuid(), NULL) AS null_sup`,
    );
    expect(rows[0].foreign_sup).toBe(false);
    expect(rows[0].null_sup).toBe(false);
  });

  it("a logistics partner sees nothing before ready_for_pickup", async () => {
    const c = await getClient();
    // Any order that has not reached ready_for_pickup must be invisible even to
    // the partner actually assigned to its delivery record.
    const { rows } = await c.query<{ order_id: string; visible: boolean }>(
      `SELECT d.order_id,
              private.order_for_delivery_partner(d.order_id, d.delivery_partner_id) AS visible
         FROM public.deliveries d
        WHERE COALESCE(private.order_stage(d.order_id), 'none')
              NOT IN ('ready_for_pickup','accepted_by_logistics','picked_up_by_logistics','in_transit','delivered')
        LIMIT 25`,
    );
    expect(rows.filter((r) => r.visible), "early-stage orders leaked to logistics").toEqual([]);
  });

  it("the supplier RPC rejects stages outside its own segment", async () => {
    const c = await getClient();
    await expect(
      c.query(`SELECT public.supplier_set_order_stage(gen_random_uuid(), 'in_transit')`),
    ).rejects.toThrow();
  });

  it("the logistics RPC rejects stages outside its own segment", async () => {
    const c = await getClient();
    await expect(
      c.query(`SELECT public.logistics_set_order_stage(gen_random_uuid(), 'supplier_preparing')`),
    ).rejects.toThrow();
  });

  it("orders.status enum was NOT extended with fulfillment stages", async () => {
    const c = await getClient();
    const { rows } = await c.query<{ v: string }>(
      `SELECT unnest(enum_range(NULL::public.order_status))::text AS v`,
    );
    expect(rows.map((r) => r.v)).toEqual([
      "pending", "pending_payment_review", "confirmed", "processing",
      "shipped", "delivered", "cancelled", "refunded",
    ]);
  });
});
