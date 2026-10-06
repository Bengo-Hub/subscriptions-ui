'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard } from '@/components/ui/page-header';
import { useCancelSubscription, useUndoCancelSubscription } from '@/hooks/useBilling';
import { fmtDate } from '@/lib/billing/format';
import type { BillingInfo } from '@/types/billing';

/**
 * Change or cancel, at the bottom of the page where it does not compete with paying. Cancelling
 * is as easy as subscribing: one confirm, and it can be undone until the period ends.
 */
export function ManageSubscription({ billing }: { billing?: BillingInfo }) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelSubscription();
  const undo = useUndoCancelSubscription();
  if (!billing?.hasSubscription) return null;
  const until = fmtDate(billing.currentPeriodEnd);

  return (
    <SectionCard title="Manage subscription" icon={Settings2}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {billing.cancelAtPeriodEnd
            ? `Cancelled. ${billing.planName ?? 'Your plan'} keeps working until ${until}, then stops. Nothing more will be charged.`
            : `You are on ${billing.planName ?? 'a plan'}. Change plan or billing period, or cancel any time.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/plans"
            className="inline-flex h-9 items-center rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Change plan
          </Link>
          {billing.cancelAtPeriodEnd ? (
            <Button variant="outline" onClick={() => undo.mutate()} disabled={undo.isPending}>
              {undo.isPending ? 'Restoring…' : 'Keep my subscription'}
            </Button>
          ) : (
            !billing.isPerpetual && (
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirming(true)}
              >
                Cancel subscription
              </Button>
            )
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Cancel your subscription?"
        description={`Everything keeps working until ${until}. After that your plan stops and nothing more is charged. You can undo this any time before then.`}
        confirmLabel="Cancel subscription"
        cancelLabel="Keep it"
        pending={cancel.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => cancel.mutate(undefined, { onSettled: () => setConfirming(false) })}
      />
    </SectionCard>
  );
}
