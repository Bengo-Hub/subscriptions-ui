'use client';

import { Check, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/base';
import { cn } from '@/lib/utils';
import { fmtMoney } from '@/lib/billing/format';
import { planTierLabel, type BillingKind, type LimitInfo, type Plan } from '@/lib/plans/catalog';

export type PlanBadge = 'recommended' | 'current' | 'expired' | 'selected' | null;

export interface PlanCta {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone: 'primary' | 'outline' | 'danger' | 'current';
}

interface Props {
  plan: Plan;
  prevPlan?: Plan;
  group: string;
  kind: BillingKind;
  badge: PlanBadge;
  cta: PlanCta;
  limitInfo: Record<string, LimitInfo>;
}

const BADGE: Record<Exclude<PlanBadge, null>, { text: string; className: string }> = {
  recommended: { text: 'Recommended', className: 'bg-primary text-primary-foreground' },
  current: { text: 'Your plan', className: 'bg-blue-600 text-white' },
  expired: { text: 'Expired', className: 'bg-red-600 text-white' },
  selected: { text: 'Your selection', className: 'border border-primary/30 bg-primary/10 text-primary' },
};

/**
 * One plan. The price sits on one line ("KES 4,500 /mo"); the one-time setup fee is its own small
 * pill under it, so it never wraps into the price and is never hidden.
 */
export function PlanCard({ plan, prevPlan, group, kind, badge, cta, limitInfo }: Props) {
  const name = planTierLabel(plan.planCode, group);
  const setupFee = plan.setupFee ?? 0;
  const limits = Object.entries(plan.tierLimits ?? {}).filter(([k]) => !limitInfo[k]?.isOverage);
  const prev = prevPlan?.tierLimits ?? {};
  const improved = prevPlan
    ? limits.filter(([k, v]) => {
        const p = prev[k];
        if (p === undefined) return true;
        if (v === -1 && p !== -1) return true;
        return typeof v === 'number' && typeof p === 'number' && v > p;
      })
    : limits;
  const shown = (improved.length ? improved : limits).slice(0, 5);
  const more = limits.length - shown.length;

  return (
    <article
      className={cn(
        'relative flex flex-col rounded-3xl border bg-card p-5 shadow-sm transition-shadow sm:p-6',
        badge === 'current' && 'border-blue-500 ring-2 ring-blue-500/40',
        badge === 'selected' && 'border-primary ring-2 ring-primary/40',
        badge === 'recommended' && 'border-primary/40 shadow-lg shadow-primary/5',
        badge === 'expired' && 'border-red-500/50',
        !badge && 'border-border hover:shadow-md',
      )}
    >
      {badge && (
        <span
          className={cn(
            'absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
            BADGE[badge].className,
          )}
        >
          {badge === 'recommended' && <Star className="h-3 w-3" aria-hidden />}
          {BADGE[badge].text}
        </span>
      )}

      <h3 className="font-display text-xl font-bold text-foreground">{name}</h3>
      {plan.description && <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{plan.description}</p>}

      <div className="mt-4">
        <p className="flex flex-wrap items-baseline gap-x-1">
          <span className="text-3xl font-black tabular-nums tracking-tight text-foreground">{fmtMoney(plan.basePrice ?? 0, plan.currency || 'KES')}</span>
          <span className="text-sm font-medium text-muted-foreground">{kind === 'ONE_TIME' ? 'once' : '/ month'}</span>
        </p>
        {kind === 'ONE_TIME' ? (
          <p className="mt-1.5 text-xs text-muted-foreground">One-time licence, yours to keep.</p>
        ) : setupFee > 0 ? (
          <p className="mt-2 inline-flex flex-wrap items-center gap-x-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <span>Setup {fmtMoney(setupFee, plan.currency || 'KES')}</span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-green-700 dark:text-green-400">free on 6+ months</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No setup fee</p>
        )}
      </div>

      <div className="mt-5 flex-1 space-y-2 border-t border-border pt-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {prevPlan ? `Everything in ${planTierLabel(prevPlan.planCode, group)}, plus` : 'What you get'}
        </p>
        <ul className="space-y-1.5">
          {shown.map(([key, val]) => {
            const info = limitInfo[key];
            const label = info ? `${info.label}${info.unit ? ` ${info.unit}` : ''}` : key.replace(/_/g, ' ');
            return (
              <li key={key} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-2.5 w-2.5 text-primary" aria-hidden />
                </span>
                <span>
                  <span className="font-semibold">{val === -1 ? 'Unlimited' : Number(val).toLocaleString()}</span> {label}
                </span>
              </li>
            );
          })}
        </ul>
        {more > 0 && <p className="pl-6 text-xs text-muted-foreground">+{more} more included</p>}
      </div>

      <Button
        onClick={cta.onClick}
        disabled={cta.disabled}
        variant={cta.tone === 'outline' ? 'outline' : cta.tone === 'danger' ? 'destructive' : 'primary'}
        className={cn(
          'mt-6 h-11 w-full rounded-xl font-semibold',
          cta.tone === 'current' && 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
        )}
      >
        {cta.label}
        {!cta.disabled && <ChevronRight className="h-4 w-4" aria-hidden />}
      </Button>
    </article>
  );
}
