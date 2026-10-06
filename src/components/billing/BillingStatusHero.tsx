'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Infinity as InfinityIcon, Layers, Loader2, PauseCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import type { AccountStanding, OpenBill } from '@/lib/billing/account-standing';
import { fmtDate, fmtMoney } from '@/lib/billing/format';
import type { BillingInfo } from '@/types/billing';

interface Props {
  standing: AccountStanding;
  billing?: BillingInfo;
  nextBillAmount?: number;
  onPay: (bill: OpenBill) => void;
  onRenew: () => void;
  onKeepSubscription: () => void;
  busy?: boolean;
}

type Tone = 'danger' | 'warning' | 'success' | 'neutral';

const toneClasses: Record<Tone, { card: string; icon: string }> = {
  danger: { card: 'border-red-500/30 bg-red-500/5', icon: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  warning: { card: 'border-amber-500/40 bg-amber-500/5', icon: 'bg-amber-500/15 text-amber-800 dark:text-amber-300' },
  success: { card: 'border-green-500/30 bg-green-500/5', icon: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  neutral: { card: 'border-border bg-card', icon: 'bg-primary/10 text-primary' },
};

/**
 * The first thing on the billing page: one plain sentence about where the account stands and the
 * one button that fixes it. Written for an owner with no billing vocabulary: "You have KES 3,000
 * to pay" + "Pay KES 3,000 now", never "Add payment method".
 */
export function BillingStatusHero({ standing, billing, nextBillAmount, onPay, onRenew, onKeepSubscription, busy }: Props) {
  const plan = billing?.planName ?? 'your plan';
  const first = standing.bills[0];
  const days = standing.daysLeft ?? 0;

  let tone: Tone = 'neutral';
  let Icon = Layers;
  let title = '';
  let detail = '';
  let action: React.ReactNode = null;
  let reassurance = '';

  switch (standing.kind) {
    case 'owes': {
      const several = standing.bills.length > 1;
      tone = first.overdue ? 'danger' : 'warning';
      Icon = first.overdue ? AlertTriangle : Clock;
      title = several
        ? `You have ${standing.bills.length} bills to pay, ${fmtMoney(standing.totalDue, standing.currency)} in total`
        : `You have ${fmtMoney(first.amountDue, first.currency)} to pay`;
      detail = several
        ? `Start with the oldest: ${first.label}${first.reference ? ` (${first.reference})` : ''}. The others are listed below.`
        : `${first.label}${first.reference ? `, invoice ${first.reference}` : ''}.${first.overdue ? ' This bill is overdue.' : ''}`;
      action = (
        <Button size="lg" className="h-12 w-full text-base font-bold sm:w-auto" onClick={() => onPay(first)} disabled={busy}>
          Pay {fmtMoney(first.amountDue, first.currency)} now
        </Button>
      );
      reassurance =
        first.kind === 'subscription'
          ? 'Pay with M-Pesa or card. It takes about a minute and your plan renews straight away. No setup needed.'
          : 'Pay with M-Pesa or card. Your account is updated within a few minutes.';
      break;
    }
    case 'suspended':
      tone = 'danger';
      Icon = PauseCircle;
      title = 'Your subscription is paused';
      detail = `Renew ${plan} to switch everything back on.`;
      action = (
        <Button size="lg" className="h-12 w-full text-base font-bold sm:w-auto" onClick={onRenew} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Renew now
        </Button>
      );
      reassurance = 'Pay with M-Pesa or card. Your apps unlock as soon as the payment is received.';
      break;
    case 'renew_due':
      tone = days < 0 ? 'danger' : 'warning';
      Icon = days < 0 ? AlertTriangle : Clock;
      title =
        days < 0
          ? `Your plan ended on ${fmtDate(billing?.currentPeriodEnd)}`
          : days === 0
            ? 'Your plan ends today'
            : `Your plan ends in ${days} day${days === 1 ? '' : 's'}`;
      detail = `Renew ${plan} now to keep using your apps without a break.${
        nextBillAmount ? ` Next bill: ${fmtMoney(nextBillAmount, standing.currency)}.` : ''
      }`;
      action = (
        <Button size="lg" className="h-12 w-full text-base font-bold sm:w-auto" onClick={onRenew} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Renew now
        </Button>
      );
      reassurance = 'Pay with M-Pesa or card. You see the exact amount before you confirm.';
      break;
    case 'cancelling':
      tone = 'warning';
      Icon = Clock;
      title = `Your subscription ends on ${fmtDate(billing?.currentPeriodEnd)}`;
      detail = 'You cancelled. Everything keeps working until then, and nothing more will be charged.';
      action = (
        <Button size="lg" variant="outline" className="h-12 w-full sm:w-auto" onClick={onKeepSubscription} disabled={busy}>
          Keep my subscription
        </Button>
      );
      break;
    case 'perpetual':
      tone = 'success';
      Icon = InfinityIcon;
      title = 'Lifetime licence, nothing to pay';
      detail = `${plan} is paid for once and never renews.`;
      break;
    case 'paid':
      tone = 'success';
      Icon = CheckCircle2;
      title = 'You are all paid up';
      detail =
        billing?.billingMode === 'service_charge'
          ? 'Pay-as-you-go plan: charges are worked out from your usage.'
          : `${plan} is active until ${fmtDate(billing?.currentPeriodEnd)}.${
              nextBillAmount ? ` Next bill: ${fmtMoney(nextBillAmount, standing.currency)}.` : ''
            }`;
      if (billing?.billingMode !== 'service_charge') {
        action = (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onRenew} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Pay early
          </Button>
        );
      }
      break;
    case 'none':
      Icon = Layers;
      title = 'You do not have a subscription yet';
      detail = 'Choose a plan to get started.';
      action = (
        <Link href="/plans" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">
          Choose a plan
        </Link>
      );
      break;
  }

  const t = toneClasses[tone];
  return (
    <section aria-live="polite" className={cn('rounded-3xl border p-5 shadow-sm sm:p-7', t.card)}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', t.icon)}>
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{detail}</p>
          </div>
        </div>
        {action && <div className="shrink-0 md:min-w-[14rem] md:text-right">{action}</div>}
      </div>
      {reassurance && (
        <p className="mt-4 flex items-start gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" aria-hidden />
          {reassurance}
        </p>
      )}
    </section>
  );
}
