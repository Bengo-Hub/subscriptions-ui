'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Blocks } from 'lucide-react';
import { Badge, Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard } from '@/components/ui/page-header';
import { useRemoveAddOn } from '@/hooks/useSubscription';
import {
  addOnPriceLabel,
  addOnRenewalNote,
  canRemoveAddOn,
  serviceLabel,
} from '@/lib/billing/addons';
import { fmtDate } from '@/lib/billing/format';
import type { SubscriptionAddOn } from '@/types/subscription';

const STATUS: Record<SubscriptionAddOn['status'], { text: string; variant: 'success' | 'partial' | 'outline' }> = {
  active: { text: 'Active', variant: 'success' },
  trial: { text: 'Trial', variant: 'partial' },
  inactive: { text: 'Inactive', variant: 'outline' },
};

/**
 * Plans of other services attached to the main plan (MarketFlow on a Treasury plan, for example).
 * They renew and end with the main plan, so each row says when, and removal takes effect at the
 * end of the period already paid for.
 */
export function PlanAddOnsCard({ addOns, mainTrialEndsAt, includedServices = [], mainPlanName }: {
  addOns: SubscriptionAddOn[];
  mainTrialEndsAt?: string | null;
  /** Other apps the main plan itself includes (bundled, such as MarketFlow Starter in Treasury). */
  includedServices?: string[];
  mainPlanName?: string | null;
}) {
  const remove = useRemoveAddOn();
  const [confirming, setConfirming] = useState<SubscriptionAddOn | null>(null);
  // Bundled apps are listed too (owner, 2026-11-28: "No other apps" read as missing when MarketFlow
  // came with the plan); an app that is also an add-on shows once, as the add-on.
  const bundled = includedServices.filter((tag) => !addOns.some((a) => (a.service_tag || '').toLowerCase() === tag));
  const empty = addOns.length === 0 && bundled.length === 0;

  return (
    <SectionCard
      title="Add-ons"
      icon={Blocks}
      description="Other apps on your plan. They renew with your plan and appear on the same bill."
      action={
        <Link
          href="/plans"
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Add an app
        </Link>
      }
      bodyClassName={empty ? undefined : 'p-0 sm:p-0'}
    >
      {empty ? (
        <p className="text-sm text-muted-foreground">No other apps on your plan yet.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Add-ons on your plan">
          {bundled.map((tag) => (
            <li key={`bundled-${tag}`} className="flex flex-col gap-1 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{serviceLabel(tag)}</p>
                <Badge variant="success">Included</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Comes with {mainPlanName || 'your plan'} at no extra cost. Add a higher {serviceLabel(tag)} plan to get more.
              </p>
            </li>
          ))}
          {addOns.map((a) => {
            const status = a.cancel_at_period_end ? { text: 'Ending', variant: 'outline' as const } : STATUS[a.status] ?? STATUS.inactive;
            return (
              <li key={a.product_code} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{a.plan_name}</p>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {serviceLabel(a.service_tag)} <span aria-hidden>·</span>{' '}
                    <span className="font-medium text-foreground">{addOnPriceLabel(a)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{addOnRenewalNote(a, mainTrialEndsAt)}</p>
                </div>
                {canRemoveAddOn(a) && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirming(a)}
                    disabled={remove.isPending}
                    aria-label={`Remove ${a.plan_name} at period end`}
                    className="h-11 shrink-0"
                  >
                    Remove at period end
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirming}
        variant="warning"
        title={`Remove ${confirming?.plan_name ?? 'this add-on'}?`}
        description={
          confirming?.status === 'trial'
            ? `It stays on until ${fmtDate(confirming.current_period_end ?? confirming.trial_ends_at ?? mainTrialEndsAt)} and you are not billed for it. You can add it again from the plans page.`
            : `It stays on until ${fmtDate(confirming?.current_period_end)}, the end of the period you have paid for, and is not on any bill after that. You can add it again from the plans page.`
        }
        confirmLabel="Remove at period end"
        cancelLabel="Keep it"
        pending={remove.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          remove.mutate(confirming.product_code, { onSettled: () => setConfirming(null) });
        }}
      />
    </SectionCard>
  );
}
