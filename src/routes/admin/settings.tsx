import { useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { tr } = useI18n();
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{tr("Settings")}</h1>
      <p className="text-muted-foreground mb-6">{tr("Platform configuration")}</p>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">{tr("Platform")}</div>
          <div className="font-semibold">Share CoreMar</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{tr("Slogan")}</div>
          <div className="font-semibold">{tr("Smart Market. Core Solutions.")}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{tr("Default Currency")}</div>
          <div className="font-semibold">{tr("EGP (auto-detected by region)")}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{tr("Payment Providers")}</div>
          <div className="font-semibold">{tr("Cash on Delivery \u00b7 InstaPay \u00b7 Mobile Wallet")}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{tr("Languages")}</div>
          <div className="font-semibold">{tr("Arabic (RTL) \u00b7 English (LTR)")}</div>
        </div>
      </div>
    </div>
  );
}
