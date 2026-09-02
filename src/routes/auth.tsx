import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Share CoreMar" },
      { name: "description", content: "Sign in to your Share CoreMar account or recover access securely." },
      { property: "og:title", content: "Sign in | Share CoreMar" },
      { property: "og:description", content: "Sign in to your Share CoreMar account or recover access securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Destination only — role/permission logic itself is unchanged (RLS + route gates still decide access).
    let dest = "/account";
    const userId = data.user?.id;
    if (userId) {
      const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const roles = (roleRows ?? []).map((r: any) => r.role as string);
      if (roles.includes("super_admin") || roles.includes("admin")) dest = "/admin";
      else if (roles.includes("supplier")) dest = "/supplier";
      else if (roles.includes("logistics_partner")) dest = "/logistics";
    }
    setLoading(false);
    toast.success("Welcome back!");
    navigate({ to: dest });
  }


  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now.");
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      toast.error("Enter your email address first");
      return;
    }

    setRecovering(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecovering(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRecoverySent(true);
    toast.success("Password reset link sent");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <img src={logoIcon} alt="Share CoreMar" className="h-12 w-12 rounded-xl" />
          <span className="text-xl font-bold">Share CoreMar</span>
        </Link>
        <div className="card-premium p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 pt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <Label>Password</Label>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" disabled={recovering} onClick={requestPasswordReset}>
                      {recovering ? "Sending…" : "Forgot password?"}
                    </Button>
                  </div>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {recoverySent && (
                  <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
                    Check your email for a secure password reset link.
                  </p>
                )}
                <Button type="submit" disabled={loading} className="w-full btn-gold">{loading ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 pt-4">
                <div><Label>Full name</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full btn-gold">{loading ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>

        </div>
        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </div>
    </div>
  );
}
