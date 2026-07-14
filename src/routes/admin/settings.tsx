import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-6">Platform configuration</p>
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Platform</div>
          <div className="font-semibold">Share CoreMar</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Slogan</div>
          <div className="font-semibold">Smart Market. Core Solutions.</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Default Currency</div>
          <div className="font-semibold">EGP (auto-detected by region)</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Payment Providers</div>
          <div className="font-semibold">Cash on Delivery · InstaPay · Mobile Wallet</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Languages</div>
          <div className="font-semibold">Arabic (RTL) · English (LTR)</div>
        </div>
      </div>
    </div>
  ),
});
