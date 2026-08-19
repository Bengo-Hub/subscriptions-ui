'use client';

import { Badge, Button, Card, CardContent, CardHeader, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/base';
import {
  useAssignEmailLicense,
  useEmailLicenses,
  useEmailPlans,
  usePurchaseEmailLicenses,
  useSuspendEmailLicense,
  useUnassignEmailLicense,
} from '@/hooks/useEmailHosting';
import type { EmailLicense, EmailLicenseStatus } from '@/lib/api/email-hosting';
import { Loader2, Mail, Plus, ShieldOff, UserMinus, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function statusBadge(status: EmailLicenseStatus) {
  const styles: Record<EmailLicenseStatus, string> = {
    AVAILABLE: 'bg-blue-500/10 text-blue-600',
    ASSIGNED: 'bg-emerald-500/10 text-emerald-600',
    SUSPENDED: 'bg-amber-500/10 text-amber-600',
    EXPIRED: 'bg-muted text-muted-foreground',
    DELETED: 'bg-destructive/10 text-destructive',
  };
  return <Badge className={styles[status]}>{status}</Badge>;
}

/**
 * The tenant self-service Email Hosting license section — Zoho Mail Admin's
 * "Total Licenses"/"Organization Users" stat cards and users list, sourced
 * entirely from our own EmailLicense data (plan Part 2b: license status
 * IS the "active vs inactive users" signal — Stalwart has no equivalent
 * field, so this is the real substitute, not a stand-in for a missing one).
 */
export function EmailHostingLicensesSection({
  onIntent,
}: {
  onIntent: (intent: { intentId: string; initiateUrl: string; amount: number }) => void;
}) {
  const { data: licenses = [], isLoading } = useEmailLicenses();
  const { data: plans = [] } = useEmailPlans();
  const purchaseMutation = usePurchaseEmailLicenses();
  const assignMutation = useAssignEmailLicense();
  const unassignMutation = useUnassignEmailLicense();
  const suspendMutation = useSuspendEmailLicense();

  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasePlanCode, setPurchasePlanCode] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignNotifyEmail, setAssignNotifyEmail] = useState('');

  const stats = useMemo(() => {
    const assigned = licenses.filter((l) => l.status === 'ASSIGNED').length;
    const available = licenses.filter((l) => l.status === 'AVAILABLE').length;
    return { total: licenses.length, assigned, available };
  }, [licenses]);

  async function handlePurchase() {
    if (!purchasePlanCode || purchaseQuantity <= 0) return;
    const result = await purchaseMutation.mutateAsync({
      planCode: purchasePlanCode,
      quantity: purchaseQuantity,
      returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/email-hosting` : undefined,
    });
    if (result.status === 'payment_required' && result.intent) {
      const intent = result.intent as Record<string, any>;
      onIntent({
        intentId: intent.intent_id ?? intent.id ?? '',
        initiateUrl: intent.initiate_url ?? '',
        amount: (plans.find((p) => p.code === purchasePlanCode)?.price_per_user_monthly ?? 0) * purchaseQuantity,
      });
    }
    setShowPurchase(false);
  }

  function startAssign(license: EmailLicense) {
    setAssigningId(license.id);
    setAssignEmail('');
    setAssignNotifyEmail('');
  }

  async function handleAssign() {
    if (!assigningId || !assignEmail.trim()) return;
    try {
      await assignMutation.mutateAsync({ licenseId: assigningId, email: assignEmail.trim(), notifyEmail: assignNotifyEmail.trim() || undefined });
      setAssigningId(null);
    } catch {
      // toast already shown by the mutation's onError
    }
  }

  const availableLicense = licenses.find((l) => l.status === 'AVAILABLE');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total licenses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{stats.assigned}</p>
              <p className="text-xs text-muted-foreground">Active users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Plus className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Available seats</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mailbox licenses</h2>
        <Button
          onClick={() => {
            if (stats.available === 0) {
              setShowPurchase(true);
              toast.info('No licenses available — purchase more to add a user');
              return;
            }
            const lic = availableLicense;
            if (lic) startAssign(lic);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add user
        </Button>
      </div>

      {showPurchase && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Purchase licenses</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPurchase(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm text-muted-foreground">
              You have {stats.available} unassigned license{stats.available === 1 ? '' : 's'}. Buy more to add
              additional users — one seat is enough for a single new hire, or buy in bulk for a team.
            </p>
            <div className="flex gap-3">
              <select
                value={purchasePlanCode}
                onChange={(e) => setPurchasePlanCode(e.target.value)}
                className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a plan</option>
                {plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} — KES {p.price_per_user_monthly}/user/mo
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24"
              />
              <Button onClick={handlePurchase} disabled={!purchasePlanCode || purchaseMutation.isPending} className="gap-2">
                {purchaseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Buy now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {assigningId && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Add user</h3>
              <Button variant="ghost" size="icon" onClick={() => setAssigningId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-6">
            <label className="text-sm font-medium">
              Mailbox address
              <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="jane@yourdomain.com" className="mt-1.5" />
            </label>
            <label className="text-sm font-medium">
              Notify email (their existing address — gets the setup link, not the new mailbox)
              <Input value={assignNotifyEmail} onChange={(e) => setAssignNotifyEmail(e.target.value)} placeholder="jane.personal@gmail.com" className="mt-1.5" />
            </label>
            <Button onClick={handleAssign} disabled={!assignEmail.trim() || assignMutation.isPending} className="gap-2 self-end">
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No licenses yet — purchase your first one above.
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.assigned_to_email ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                  <TableCell>{l.edges?.email_plan?.name ?? '—'}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                  <TableCell>{l.storage_quota_gb} GB</TableCell>
                  <TableCell className="text-right">
                    {l.status === 'AVAILABLE' && (
                      <Button variant="ghost" size="sm" onClick={() => startAssign(l)} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Assign
                      </Button>
                    )}
                    {l.status === 'ASSIGNED' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => unassignMutation.mutate(l.id)} className="gap-1.5">
                          <UserMinus className="h-3.5 w-3.5" /> Unassign
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => suspendMutation.mutate({ licenseId: l.id })} className="gap-1.5 text-destructive">
                          <ShieldOff className="h-3.5 w-3.5" /> Suspend
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
