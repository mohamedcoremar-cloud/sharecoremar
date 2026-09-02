import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password | Share CoreMar" },
      { name: "description", content: "Securely choose a new password for your Share CoreMar account." },
      { property: "og:title", content: "Reset password | Share CoreMar" },
      { property: "og:description", content: "Securely choose a new password for your Share CoreMar account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const isRecoveryLink = hashParams.get("type") === "recovery" || queryParams.has("code");

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setSession(nextSession);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (isRecoveryLink) setSession(data.session);
      setChecking(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      toast.error("This reset link is invalid or has expired");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords don't match");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setComplete(true);
    await supabase.auth.signOut();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img src={logoIcon} alt="Share CoreMar" className="h-12 w-12 rounded-xl" />
          <span className="text-xl font-bold">Share CoreMar</span>
        </Link>

        <section className="card-premium p-6" aria-labelledby="reset-heading">
          {checking ? (
            <p className="py-8 text-center text-sm text-muted-foreground" role="status">Checking your reset link…</p>
          ) : complete ? (
            <div className="space-y-5 py-3 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <div>
                <h1 id="reset-heading" className="text-2xl font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">You can now sign in with your new password.</p>
              </div>
              <Button className="w-full btn-gold" onClick={() => navigate({ to: "/auth" })}>Return to sign in</Button>
            </div>
          ) : session ? (
            <form onSubmit={updatePassword} className="space-y-4">
              <div className="text-center">
                <KeyRound className="mx-auto mb-3 h-9 w-9 text-primary" aria-hidden="true" />
                <h1 id="reset-heading" className="text-2xl font-bold">Choose a new password</h1>
                <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </div>
              <Button type="submit" className="w-full btn-gold" disabled={saving}>{saving ? "Updating…" : "Update password"}</Button>
            </form>
          ) : (
            <div className="space-y-5 py-3 text-center">
              <KeyRound className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <div>
                <h1 id="reset-heading" className="text-2xl font-bold">Reset link unavailable</h1>
                <p className="mt-2 text-sm text-muted-foreground">This link is invalid or has expired. Request a new one from the sign-in page.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>Back to sign in</Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}