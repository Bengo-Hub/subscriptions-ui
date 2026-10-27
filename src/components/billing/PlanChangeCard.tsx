'use client';

import { useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard } from '@/components/ui/page-header';
import { useCancelPlanChange, useEndUpgradeTrial, useUpgradeTrial } from '@/hooks/useUpgradeTrial';
import { fmtDate } from '@/lib/billing/format';

/**
 * A running upgrade trial and a plan change waiting for the next renewal. The trial gives the
 * higher tier now; the upgrade itself starts on the renewal date and that renewal is billed at
 * the new price. Ending the trial keeps the current plan (and drops the upgrade it scheduled).
 */
export function PlanChangeCard() {
  const { data } = useUpgradeTrial();
  const endTrial = useEndUpgradeTrial();
  const cancelChange = useCancelPlanChange();
  const [confirm, setConfirm] = useState<'trial' | 'change' | null>(null);

  const trial = data?.active;
  const change = data?.scheduled_change;
  if (!trial && !change) return null;
  const changeFromTrial = !!trial && change?.source === 'upgrade_trial';

  return (
    <SectionCard title={trial ? 'Free trial' : 'Plan change scheduled'} icon={trial ? Sparkles : CalendarClock}>
      <div className="space-y-4">
        {trial && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                You are trying {trial.plan_name} free until {fmtDate(trial.ends_at)}
              </p>
              <p className="text-sm text-muted-foreground">
                {trial.days_remaining} day(s) left. You keep paying for {trial.base_plan_name} during the trial.
              </p>
            </div>
            <Button variant="outline" onClick={() => setConfirm('trial')} disabled={endTrial.isPending} className="shrink-0">
              {endTrial.isPending ? 'Ending…' : 'End trial'}
            </Button>
          </div>
        )}

        {change && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {change.from_plan_name} moves to {change.plan_name} on {fmtDate(change.effective_at)}
              </p>
              <p className="text-sm text-muted-foreground">
                {changeFromTrial
                  ? `After the trial you are on ${change.from_plan_name} until that renewal, which is billed at the ${change.plan_name} price.`
                  : `That renewal is billed at the ${change.plan_name} price.`}
              </p>
            </div>
            {!changeFromTrial && (
              <Button variant="ghost" onClick={() => setConfirm('change')} disabled={cancelChange.isPending} className="shrink-0">
                {cancelChange.isPending ? 'Cancelling…' : 'Cancel change'}
              </Button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'trial'}
        title="End your free trial?"
        description={`You go back to ${trial?.base_plan_name ?? 'your plan'} now and the upgrade to ${trial?.plan_name ?? 'the trial plan'} is cancelled. Nothing changes on your bill.`}
        confirmLabel="End trial"
        cancelLabel="Keep trying"
        pending={endTrial.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => endTrial.mutate(undefined, { onSettled: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={confirm === 'change'}
        title="Cancel the plan change?"
        description={`You stay on ${change?.from_plan_name ?? 'your plan'} and your next renewal is billed at its price.`}
        confirmLabel="Cancel change"
        cancelLabel="Keep it"
        pending={cancelChange.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => cancelChange.mutate(undefined, { onSettled: () => setConfirm(null) })}
      />
    </SectionCard>
  );
}
