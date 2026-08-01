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
  // Trigger-only helpers — must NOT be callable from the Data API.
  { schema: "public", name: "record_content_version", allowedExecutors: ["service_role"] },
  { schema: "public", name: "handle_new_user", allowedExecutors: ["service_role"] },
  { schema: "public", name: "ensure_delivery_for_confirmed_order", allowedExecutors: ["service_role"] },
  // Private role-check helpers — never callable by anon/public.
  { schema: "private", name: "has_role", allowedExecutors: ["authenticated", "service_role"] },
  { schema: "private", name: "is_admin", allowedExecutors: ["authenticated", "service_role"] },
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
