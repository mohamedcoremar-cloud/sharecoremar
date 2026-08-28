import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/admin/crud-page";
import { Info } from "lucide-react";

export const Route = createFileRoute("/admin/ai-agents")({ component: AiAgentsPage });

function AiAgentsPage() {
  return (
    <div className="space-y-0">
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Registry only. Enabling an agent records state in the database — no model is called, no prompt is executed
            and no automation runs. The key switches below decide which AI account pays for an agent's calls once that
            agent is wired up: your own external provider key first, with Lovable AI credits as an optional fallback.
          </p>
        </div>
      </div>
      <CrudPage
        title="AI Agents"
        table="ai_agents"
        orderBy="created_at"
        activeKey="is_active"
        searchKeys={["role_key", "name_en", "name_ar", "provider", "model"]}
        defaultValues={{ provider: "none", is_active: false, use_own_key: true, fallback_to_lovable: true }}
        columns={[
          { key: "role_key", label: "Role key" },
          { key: "name_en", label: "Name (EN)" },
          { key: "name_ar", label: "Name (AR)" },
          { key: "provider", label: "Provider" },
          { key: "model", label: "Model", render: (r) => r.model ?? "—" },
          { key: "use_own_key", label: "Own key", render: (r) => (r.use_own_key ? "✓" : "—") },
          { key: "fallback_to_lovable", label: "Fallback", render: (r) => (r.fallback_to_lovable ? "✓" : "—") },
          { key: "is_active", label: "Enabled", render: (r) => (r.is_active ? "✓" : "—") },
        ]}
        fields={[
          { name: "role_key", label: "Role key (unique)", required: true },
          { name: "name_en", label: "Name (EN)", required: true },
          { name: "name_ar", label: "Name (AR)", required: true },
          { name: "provider", label: "Provider (documentation only)" },
          { name: "model", label: "Model (documentation only)" },
          { name: "system_prompt", label: "Notes / intended system prompt", type: "textarea" },
          { name: "use_own_key", label: "Use my own external API key first", type: "switch" },
          {
            name: "fallback_to_lovable",
            label: "Fall back to Lovable AI credits if my key fails or runs out",
            type: "switch",
          },
          { name: "is_active", label: "Enabled (database flag only)", type: "switch" },
        ]}
      />

    </div>
  );
}
