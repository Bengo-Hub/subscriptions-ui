'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/base';
import { useAuthStore } from '@/store/auth';
import { useAdminTenantUsage, useOverrideMetric } from '@/hooks/useAdminUsage';
import { useAdminTenantAddons, useCreateAdminAddon, useDeleteAdminAddon, useSetAdminAddonStatus } from '@/hooks/useCustomAddons';
import { useGiftCredits } from '@/hooks/useBilling';
import { useExtendTrial } from '@/hooks/useAdminTenants';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import type { CustomAddonCreateRequest } from '@/types/addon';

interface TenantSubscriptionDetail {
  id: string;
  tenant_id: string;
  status: string;
  plan_code: string;
  plan_name?: string;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  metadata?: Record<string, unknown>;
}

export default function TenantDetailPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';
  const params = useParams<{ id: string }>();
  const tenantId = params.id;

  const [overrideTarget, setOverrideTarget] = useState<{ metricType: string; current: number } | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [showAddonForm, setShowAddonForm] = useState(false);
  const [addonForm, setAddonForm] = useState<CustomAddonCreateRequest>({ name: '', billingCycle: 'monthly', unitPriceKes: 0, quantity: 1 });

  const [giftAmount, setGiftAmount] = useState('');
  const [giftReason, setGiftReason] = useState('');

  const [extendTrialDate, setExtendTrialDate] = useState('');

  const { data: subData } = useQuery({
    queryKey: ['admin-tenant-detail', tenantId],
    queryFn: () => apiClient.get<TenantSubscriptionDetail>(`/api/v1/tenants/${tenantId}/subscription`),
    enabled: !!tenantId && !!isPlatformOwner,
  });

  const { data: usageData, isLoading: usageLoading } = useAdminTenantUsage(tenantId);
  const { data: addonsData } = useAdminTenantAddons(tenantId);

  const overrideMutation = useOverrideMetric();
  const createAddonMutation = useCreateAdminAddon();
  const setAddonStatusMutation = useSetAdminAddonStatus();
  const deleteAddonMutation = useDeleteAdminAddon();
  const giftMutation = useGiftCredits();
  const extendTrialMutation = useExtendTrial();

  const metrics = usageData?.metrics ?? [];
  const addons = addonsData?.data ?? [];

  const handleOverride = () => {
    if (!overrideTarget) return;
    overrideMutation.mutate(
      { tenantId, req: { metricType: overrideTarget.metricType, value: Number(overrideValue), reason: overrideReason } },
      { onSuccess: () => { setOverrideTarget(null); setOverrideValue(''); setOverrideReason(''); } },
    );
  };

  const handleCreateAddon = () => {
    createAddonMutation.mutate(
      { tenantId, req: addonForm },
      { onSuccess: () => { setShowAddonForm(false); setAddonForm({ name: '', billingCycle: 'monthly', unitPriceKes: 0, quantity: 1 }); } },
    );
  };

  const handleGiftCredits = () => {
    giftMutation.mutate(
      { tenantId, amountKes: Number(giftAmount), reason: giftReason },
      { onSuccess: () => { setGiftAmount(''); setGiftReason(''); } },
    );
  };

  const handleExtendTrial = () => {
    if (!extendTrialDate) return;
    extendTrialMutation.mutate(
      { tenantId, trialEndsAt: new Date(extendTrialDate).toISOString() },
      { onSuccess: () => setExtendTrialDate('') },
    );
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/platform/tenants">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Detail</h1>
          <p className="text-muted-foreground text-sm font-mono">{tenantId}</p>
        </div>
      </div>

      {/* Subscription Summary */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Subscription</h2>
        </CardHeader>
        <CardContent>
          {!subData ? (
            <p className="text-sm text-muted-foreground">No subscription found for this tenant.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-semibold">{subData.plan_name ?? subData.plan_code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={subData.status === 'ACTIVE' ? 'success' : subData.status === 'TRIAL' ? 'default' : 'error'}>
                  {subData.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm">{formatDate(subData.current_period_start)} – {formatDate(subData.current_period_end)}</p>
              </div>
              {subData.trial_ends_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Trial Ends</p>
                  <p className="text-sm">{formatDate(subData.trial_ends_at)}</p>
                </div>
              )}
              {subData.status === 'TRIAL' && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">New trial end date</label>
                    <Input type="datetime-local" value={extendTrialDate} onChange={(e) => setExtendTrialDate(e.target.value)} className="h-9 rounded-lg" />
                  </div>
                  <Button size="sm" onClick={handleExtendTrial} disabled={!extendTrialDate || extendTrialMutation.isPending}>
                    {extendTrialMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Extend'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Override */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Usage Metrics</h2>
            {overrideTarget && (
              <Button variant="ghost" size="sm" onClick={() => setOverrideTarget(null)}>
                <X className="h-4 w-4 mr-1" /> Cancel override
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {overrideTarget && (
            <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 space-y-3">
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>This will overwrite the Redis counter for <strong>{overrideTarget.metricType}</strong>. Use only to correct NATS event loss.</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">New value (current: {overrideTarget.current})</label>
                  <Input type="number" min={0} value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)} placeholder="e.g. 50" className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Reason (required for audit trail)</label>
                  <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="e.g. NATS backlog caused missed events" className="h-9 rounded-lg" />
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleOverride}
                disabled={!overrideValue || !overrideReason || overrideMutation.isPending}
              >
                {overrideMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm Override
              </Button>
            </div>
          )}
          {usageLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : metrics.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Period</TableHead>
                  <TableHead className="w-24 text-right pr-4">{''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.metricType}>
                    <TableCell className="text-sm font-medium">{m.label ?? m.metricType}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.used}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.limit === 0 ? '∞' : m.limit}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{m.period}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setOverrideTarget({ metricType: m.metricType, current: m.used }); setOverrideValue(String(m.used)); }}
                        className="h-7 rounded-lg text-xs"
                      >
                        Override
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No usage data for this tenant in the current period.</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Addons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Custom Add-ons</h2>
            <Button size="sm" onClick={() => setShowAddonForm((v) => !v)} className="h-8 rounded-lg">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddonForm && (
            <div className="mb-4 p-4 rounded-xl border border-border space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={addonForm.name} onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))} placeholder="Add-on name" className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Unit Price (KES)</label>
                  <Input type="number" min={0} value={addonForm.unitPriceKes} onChange={(e) => setAddonForm((p) => ({ ...p, unitPriceKes: Number(e.target.value) }))} className="h-9 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Billing Cycle</label>
                  <select value={addonForm.billingCycle} onChange={(e) => setAddonForm((p) => ({ ...p, billingCycle: e.target.value as any }))} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm">
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="one_time">One-Time</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Quantity</label>
                  <Input type="number" min={1} value={addonForm.quantity ?? 1} onChange={(e) => setAddonForm((p) => ({ ...p, quantity: Number(e.target.value) }))} className="h-9 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateAddon} disabled={!addonForm.name || createAddonMutation.isPending}>
                  {createAddonMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddonForm(false)}>Cancel</Button>
              </div>
            </div>
          )}
          {addons.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16 text-right pr-4">{''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{a.name}</p>
                      {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{a.billing_cycle.replace('_', '-')}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">KES {a.unit_price_kes.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.quantity}</TableCell>
                    <TableCell><Badge variant={a.status === 'active' ? 'success' : 'outline'}>{a.status}</Badge></TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg text-xs hover:text-emerald-600"
                            disabled={setAddonStatusMutation.isPending}
                            onClick={() => setAddonStatusMutation.mutate({ tenantId, addonId: a.id, status: 'active' })}
                          >
                            Reactivate
                          </Button>
                        )}
                        {a.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg text-xs hover:text-amber-600"
                            disabled={setAddonStatusMutation.isPending}
                            onClick={() => { if (confirm(`Cancel add-on "${a.name}"?`)) setAddonStatusMutation.mutate({ tenantId, addonId: a.id, status: 'cancelled' }); }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 rounded-lg text-xs hover:text-destructive"
                          disabled={deleteAddonMutation.isPending}
                          onClick={() => { if (confirm(`Permanently delete add-on "${a.name}"? This cannot be undone.`)) deleteAddonMutation.mutate({ tenantId, addonId: a.id }); }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No custom add-ons configured for this tenant.</p>
          )}
        </CardContent>
      </Card>

      {/* Gift Credits */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Gift Credits</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Amount (KES)</label>
              <Input type="number" min={1} value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} placeholder="e.g. 500" className="h-9 rounded-lg w-36" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Reason</label>
              <Input value={giftReason} onChange={(e) => setGiftReason(e.target.value)} placeholder="e.g. Goodwill credit for downtime" className="h-9 rounded-lg" />
            </div>
            <Button
              size="sm"
              onClick={handleGiftCredits}
              disabled={!giftAmount || Number(giftAmount) <= 0 || !giftReason || giftMutation.isPending}
            >
              {giftMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Gift Credits'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
