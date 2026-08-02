import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { User, Package, Heart, MapPin, KeyRound, Bell, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_public/account")({
  component: AccountPage,
  head: () => ({
    meta: [
      { title: "My Account — Share CoreMar" },
      { name: "description", content: "Manage your Share CoreMar profile, delivery addresses and password in one place." },
      { property: "og:title", content: "My Account — Share CoreMar" },
      { property: "og:description", content: "Manage your profile, delivery addresses and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AccountPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"profile" | "addresses" | "password" | "notifications">("profile");

  if (!user) return <div className="mx-auto max-w-md px-4 py-20 text-center"><Button asChild className="btn-gold"><Link to="/auth">Sign in</Link></Button></div>;

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "password", label: "Password", icon: KeyRound },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">My Account</h1>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${tab === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-border">
            <Link to="/orders" className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"><Package className="h-4 w-4" /> Orders</Link>
            <Link to="/wishlist" className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"><Heart className="h-4 w-4" /> Wishlist</Link>
          </div>
        </aside>
        <div className="card-premium p-6">
          {tab === "profile" && <ProfileTab />}
          {tab === "addresses" && <AddressesTab />}
          {tab === "password" && <PasswordTab />}
          {tab === "notifications" && <NotificationsTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const [full_name, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { (async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
    if (data) { setFullName(data.full_name ?? ""); setPhone((data as any).phone ?? ""); }
  })(); }, [user]);
  async function save() {
    const { error } = await supabase.from("profiles").update({ full_name, phone } as any).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  }
  return (
    <div className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold">Profile</h2>
      <div><label className="text-xs text-muted-foreground">Email</label><input value={user?.email ?? ""} disabled className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm" /></div>
      <div><label className="text-xs text-muted-foreground">Full name</label><input value={full_name} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
      <div><label className="text-xs text-muted-foreground">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>
      <Button className="btn-gold" onClick={save}>Save changes</Button>
    </div>
  );
}

function AddressesTab() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  async function load() { if (!user) return; const { data } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }); setAddresses(data ?? []); }
  useEffect(() => { load(); }, [user]);
  async function del(id: string) { await supabase.from("addresses").delete().eq("id", id); load(); }
  async function makeDefault(id: string) {
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
    await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    load();
  }
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Addresses</h2>
      {addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses yet. Add one during checkout.</p>}
      {addresses.map((a) => (
        <div key={a.id} className="rounded-xl border border-border p-4 flex justify-between gap-2">
          <div className="text-sm">
            <div className="font-semibold">{a.full_name} {a.is_default && <span className="ms-2 text-xs text-primary">(default)</span>}</div>
            <div className="text-muted-foreground">{a.phone}</div>
            <div className="text-muted-foreground">{a.street}, {a.city}, {a.governorate}</div>
          </div>
          <div className="flex flex-col gap-1">
            {!a.is_default && <button className="text-xs text-primary hover:underline" onClick={() => makeDefault(a.id)}>Make default</button>}
            <button className="text-xs text-red-500 hover:underline" onClick={() => del(a.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PasswordTab() {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  async function update() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated"); setPw(""); setPw2("");
  }
  return (
    <div className="space-y-4 max-w-md">
      <h2 className="text-xl font-bold">Change password</h2>
      <input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <input type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <Button className="btn-gold" onClick={update}>Update password</Button>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Notifications</h2>
      <p className="text-sm text-muted-foreground">You will receive email updates about your orders. Advanced preferences will be available soon.</p>
    </div>
  );
}
