import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { provisionEntityAccount, type ProvisionResult } from "@/lib/provision.functions";

interface Props {
  entityType: "supplier" | "logistics";
  row: any;
}

export function ProvisionAccountButton({ entityType, row }: Props) {
  const provision = useServerFn(provisionEntityAccount);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>(row.email ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const linked = entityType === "supplier" && !!row.user_id;
  const label = row.company_name ?? row.name_en ?? "";

  async function run() {
    setPending(true);
    try {
      const res = (await provision({
        data: { entityType, entityId: row.id, ...(email ? { email } : {}) },
      })) as ProvisionResult;
      setResult(res);
      toast.success(res.created ? "Account created and linked" : "Existing account linked");
    } catch (e: any) {
      toast.error(e?.message ?? "Provisioning failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="icon" variant="ghost" title="Provision account" onClick={() => { setResult(null); setOpen(true); }}>
        <KeyRound className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Provision account · {label}</DialogTitle></DialogHeader>
          {result ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {result.created
                  ? "A new account was created. Share these credentials manually — they are shown only once."
                  : "An existing account was linked. No new password was generated."}
              </p>
              <div className="rounded-lg border border-border p-3 space-y-1 font-mono text-xs">
                <div>Email: {result.email}</div>
                {result.password && <div>Password: {result.password}</div>}
                <div>Role: {result.role}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {linked
                  ? "This record already has a linked account. Provisioning will grant the role and create the portal link."
                  : "No account is linked yet. A new account will be created with a temporary password."}
              </p>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@example.com" disabled={linked} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {!result && <Button className="btn-gold" disabled={pending} onClick={run}>{pending ? "Working…" : "Provision"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
