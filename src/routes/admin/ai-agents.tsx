import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Info } from "lucide-react";

export const Route = createFileRoute("/admin/ai-agents")({ component: AiAgentsPage });

function AiAgentsPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () =>
      (await supabase.from("ai_agents").select("*").is("deleted_at", null).order("created_at")).data ?? [],
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Bot className="h-7 w-7 text-primary" /> AI Agents
        </h1>
        <p className="mt-1 text-muted-foreground">Registry only — read-only. No agent is wired to any model yet.</p>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          These records exist purely for planning and documentation. Activation, prompts and model wiring require a
          separate approved decision.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Role key</th>
              <th className="px-4 py-3">Name (EN)</th>
              <th className="px-4 py-3">Name (AR)</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No agents registered.
                </td>
              </tr>
            ) : (
              agents.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs">{a.role_key}</td>
                  <td className="px-4 py-3 font-medium">{a.name_en}</td>
                  <td className="px-4 py-3">{a.name_ar}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.provider}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.model ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
