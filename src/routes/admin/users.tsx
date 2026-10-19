import { backofficeHead } from "@/lib/backoffice-head";
import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/users")({ head: () => backofficeHead("Users"), component: UsersAdmin });

const ROLES = ["super_admin", "admin", "supplier", "logistics_partner", "business_buyer", "personal_buyer"];

function UsersAdmin() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, has }: any) => {
      if (has) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success(tr("Updated")); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return users as any[];
    return (users as any[]).filter((u) =>
      ["ref_code", "email", "full_name", "phone"].some((k) => String(u[k] ?? "").toLowerCase().includes(ql)),
    );
  }, [users, q]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{tr("Users & Roles")}</h1>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Search by code, email, name or phone…")} className="ps-9" />
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="text-start p-3">{tr("Code")}</th>
                <th className="text-start p-3">{tr("Email")}</th>
                <th className="text-start p-3">{tr("Name")}</th>
                <th className="text-start p-3">{tr("Type")}</th>
                <th className="text-start p-3">{tr("Roles")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{tr("No matching accounts")}</td></tr>
              )}
              {filtered.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{u.ref_code ?? "—"}</td>
                  <td className="p-3 font-medium">{u.email}</td>
                  <td className="p-3">{u.full_name ?? "—"}</td>
                  <td className="p-3">{tr(u.account_type ?? "—")}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <button key={r} onClick={() => toggleRole.mutate({ userId: u.id, role: r, has })} className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${has ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border hover:border-primary"}`}>
                            {tr(r)}
                          </button>
                        );
                      })}
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
