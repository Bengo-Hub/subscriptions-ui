'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { useAllPlans } from '@/hooks/usePlans';
import {
  useAdminApplyPlanChange,
  useAdminCancelPlanChange,
  useAdminEndUpgradeTrial,
  useGrantUpgradeTrial,
  useSaveTenantUpgradeTrialPolicy,
  useTenantUpgradeTrial,
} from '@/hooks/useUpgradeTrial';
import { planGroup } from '@/lib/plans/catalog';

type Switch = 'inherit' | 'on' | 'off';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

const OUTCOME_LABEL: Record<string, string> = {
  completed: 'Completed',
  ended_by_tenant: 'Ended by tenant',
  ended_by_platform: 'Ended by platform',
  paid: 'Paid for',
  plan_changed: 'Plan changed',
  cancelled: 'Subscription cancelled',
};

/**
 * One tenant's upgrade trials: its own on/off and length (or follow the platform setting), the
 * running trial and scheduled plan change with admin overrides, granting a trial outside the
 * policy, and past trials. Eligibility comes from the server, which applies the real rules.
 */
export function UpgradeTrialTenantPanel({ tenantId, paidPlanCode }: { tenantId: string; paidPlanCode?: string }) {
  const [grantPlan, setGrantPlan] = useState('');
  const [grantDays, setGrantDays] = useState('');
  const { data } = useTenantUpgradeTrial(tenantId);
  const { data: check } = useTenantUpgradeTrial(tenantId, grantPlan || undefined);
  const { data: plans } = useAllPlans();

  const savePolicy = useSaveTenantUpgradeTrialPolicy();
  const grant = useGrantUpgradeTrial();
  const endTrial = useAdminEndUpgradeTrial();
  const applyChange = useAdminApplyPlanChange();
  const cancelChange = useAdminCancelPlanChange();

  const tenantLevel = data?.policy.tenant;
  const [sw, setSw] = useState<Switch>('inherit');
  const [days, setDays] = useState('');
  useEffect(() => {
    if (!data) return;
    setSw(tenantLevel?.enabled == null ? 'inherit' : tenantLevel.enabled ? 'on' : 'off');
    setDays(tenantLevel?.days == null ? '' : String(tenantLevel.days));
  }, [data, tenantLevel?.enabled, tenantLevel?.days]);

  const paid = plans?.find((p) => p.planCode === paidPlanCode);
  const candidates = useMemo(
    () =>
      (plans ?? [])
        .filter((p) => paid && planGroup(p.planCode) === planGroup(paid.planCode) && p.tierOrder > paid.tierOrder && p.billingCycle !== 'ONE_TIME')
        .sort((a, b) => a.tierOrder - b.tierOrder),
    [plans, paid],
  );

  const max = data?.policy.max_days ?? 90;
  const daysNum = days === '' ? null : Number(days);
  const daysValid = daysNum === null || (Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= max);
  const grantDaysNum = grantDays === '' ? undefined : Number(grantDays);
  const grantDaysValid = grantDaysNum === undefined || (Number.isInteger(grantDaysNum) && grantDaysNum >= 1 && grantDaysNum <= max);
  const eligibility = grantPlan ? check?.eligibility : undefined;

  const sourceLabel = (s?: string) => (s === 'tenant' ? 'this tenant' : s === 'platform' ? 'platform setting' : 'default');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Upgrade trials</h2>
          {data && (
            <Badge variant={data.policy.enabled ? 'success' : 'outline'}>
              {data.policy.enabled ? `On, ${data.policy.days} days` : 'Off'}
            </Badge>
          )}
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-1">
            Switch from {sourceLabel(data.policy.enabled_source)}, length from {sourceLabel(data.policy.days_source)}.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label htmlFor="tenant-trial-switch" className="text-xs text-muted-foreground">Trials for this tenant</label>
            <select
              id="tenant-trial-switch"
              value={sw}
              onChange={(e) => setSw(e.target.value as Switch)}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="inherit">Follow platform setting</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="tenant-trial-days" className="text-xs text-muted-foreground">Length in days (blank follows platform)</label>
            <Input id="tenant-trial-days" type="number" min={1} max={max} value={days} onChange={(e) => setDays(e.target.value)} className="h-9 rounded-lg" aria-invalid={!daysValid} />
          </div>
          <Button
            size="sm"
            className="h-9"
            disabled={!daysValid || savePolicy.isPending}
            onClick={() => savePolicy.mutate({ tenantId, enabled: sw === 'inherit' ? null : sw === 'on', days: daysNum })}
          >
            {savePolicy.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save setting'}
          </Button>
        </div>

        {data?.active && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              Trying <strong>{data.active.plan_name}</strong> until {fmt(data.active.ends_at)} ({data.active.days_remaining} day(s) left), paying for {data.active.base_plan_name}.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={endTrial.isPending}
              onClick={() => { if (confirm('End this trial now? The tenant stays on its paid plan and the scheduled upgrade is cancelled.')) endTrial.mutate(tenantId); }}
            >
              End trial
            </Button>
          </div>
        )}

        {data?.scheduled_change && (
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              {data.scheduled_change.from_plan_name} moves to <strong>{data.scheduled_change.plan_name}</strong> on {fmt(data.scheduled_change.effective_at)} ({data.scheduled_change.source.replace('_', ' ')}).
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={applyChange.isPending}
                onClick={() => { if (confirm(`Move the tenant to ${data.scheduled_change?.plan_name} today?`)) applyChange.mutate(tenantId); }}
              >
                Apply now
              </Button>
              <Button size="sm" variant="ghost" disabled={cancelChange.isPending} onClick={() => cancelChange.mutate(tenantId)}>
                Cancel change
              </Button>
            </div>
          </div>
        )}

        {!data?.active && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grant a trial</p>
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <label htmlFor="grant-plan" className="text-xs text-muted-foreground">Higher tier</label>
                <select
                  id="grant-plan"
                  value={grantPlan}
                  onChange={(e) => setGrantPlan(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">{candidates.length ? 'Select a plan...' : 'No higher tier available'}</option>
                  {candidates.map((p) => (
                    <option key={p.planCode} value={p.planCode}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="grant-days" className="text-xs text-muted-foreground">Days (blank uses the setting)</label>
                <Input id="grant-days" type="number" min={1} max={max} value={grantDays} onChange={(e) => setGrantDays(e.target.value)} className="h-9 rounded-lg" aria-invalid={!grantDaysValid} />
              </div>
              <Button
                size="sm"
                className="h-9"
                disabled={!grantPlan || !grantDaysValid || grant.isPending || eligibility?.eligible === false}
                onClick={() => grant.mutate({ tenantId, planCode: grantPlan, days: grantDaysNum }, { onSuccess: () => { setGrantPlan(''); setGrantDays(''); } })}
              >
                {grant.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Grant trial'}
              </Button>
            </div>
            {eligibility && (
              <p className={`text-xs ${eligibility.eligible ? 'text-muted-foreground' : 'text-destructive'}`}>
                {eligibility.eligible
                  ? `Runs until ${fmt(eligibility.ends_at)}; the upgrade then starts on the renewal of ${fmt(eligibility.upgrade_at)}.`
                  : eligibility.message}
              </p>
            )}
          </div>
        )}

        {!!data?.history.length && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past trials</p>
            <ul className="text-sm divide-y divide-border">
              {data.history.slice().reverse().map((h) => (
                <li key={`${h.plan_code}-${h.started_at}`} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span>{h.plan_code} from {h.base_plan_code}</span>
                  <span className="text-muted-foreground">{fmt(h.started_at)} to {fmt(h.ended_at)}, {OUTCOME_LABEL[h.outcome] ?? h.outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
