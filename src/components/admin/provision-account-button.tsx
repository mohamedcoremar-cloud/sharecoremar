import { useI18n } from "@/lib/i18n";
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
  const { tr } = useI18n();
  const provision = useServerFn(provisionEntityAccount);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string>(row.email ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const linked = entityType === "supplier" && !!row.user_id;
  const label = row.company_name ?? row.name_en ?? "";

  async function run() {
  const { tr } = useI18n();
    setPending(true);
    try {
      const res = (await provision({
        data: { entityType, entityId: row.id, ...(email ? { email } : {}) },
      })) as ProvisionResult;
      setResult(res);
      toast.success(res.created ? tr("Account created and linked") : tr("Existing account linked"));
    } catch (e: any) {
      toast.error(e?.message ?? "Provisioning failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button size="icon" variant="ghost" title={tr("Provision account")} onClick={() => { setResult(null); setOpen(true); }}>
        <KeyRound className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{tr("Provision account ·")}{label}</DialogTitle></DialogHeader>
          {result ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {result.created
                  ? tr("A new account was created. Share these credentials manually — they are shown only once.")
                  : tr("An existing account was linked. No new password was generated.")}
              </p>
              <div className="rounded-lg border border-border p-3 space-y-1 font-mono text-xs">
                <div>{tr("Email:")}{result.email}</div>
                {result.password && <div>{tr("Password:")}{result.password}</div>}
                <div>{tr("Role:")}{result.role}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {linked
                  ? tr("This record already has a linked account. Provisioning will grant the role and create the portal link.")
                  : tr("No account is linked yet. A new account will be created with a temporary password.")}
              </p>
              <div>
                <Label>{tr("Email")}</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@example.com" disabled={linked} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tr("Close")}</Button>
            {!result && <Button className="btn-gold" disabled={pending} onClick={run}>{pending ? tr("Working…") : tr("Provision")}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
