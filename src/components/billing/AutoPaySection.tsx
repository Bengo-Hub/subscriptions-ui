'use client';

import { useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SwitchRow } from '@/components/ui/switch';
import { PaymentMethodList } from '@/components/billing/PaymentMethodList';
import { MpesaStandingOrderCard } from '@/components/billing/MpesaStandingOrderCard';
import type { BillingInfo, PaymentMethod } from '@/types/billing';

interface Props {
  billing?: BillingInfo;
  autoRenew: boolean;
  onToggleAutoRenew: (on: boolean) => void;
  togglePending: boolean;
  /** Start collapsed while a bill is open, so it never competes with the Pay button. */
  defaultOpen: boolean;
  onAddCard: () => void;
  addCardPending: boolean;
  onSetDefault: (key: string) => void;
  onRemove: (key: string) => void;
  defaultPending: boolean;
  removePending: boolean;
}

/**
 * Optional: renew without lifting a finger. Clearly labelled optional and folded away while a bill
 * is open; paying a bill never depends on anything in here.
 */
export function AutoPaySection(p: Props) {
  const [open, setOpen] = useState(p.defaultOpen);
  const methods = (p.billing?.paymentMethods ?? []).filter((m): m is PaymentMethod => !!m && typeof m === 'object');
  const chargeable = methods.some((m) => m.type === 'card' || m.type === 'mobile_money');
  const recurring = !p.billing?.isPerpetual && p.billing?.billingMode !== 'service_charge';
  if (!p.billing?.hasSubscription || !recurring) return null;

  const summary = p.autoRenew && chargeable ? 'On: renewals are charged automatically' : 'Off: you pay each renewal yourself';

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 rounded-2xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-6"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-foreground">Automatic payments</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Optional</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">{summary}</span>
        </span>
        <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-4 pb-5 pt-2 sm:px-6">
          <SwitchRow
            id="auto-renew"
            title="Renew automatically"
            description={
              chargeable
                ? 'Charge the saved card or M-Pesa number below when your plan is due.'
                : 'Save a card or set up an M-Pesa standing order below to use this.'
            }
            checked={p.autoRenew && chargeable}
            onCheckedChange={p.onToggleAutoRenew}
            disabled={!chargeable || p.togglePending}
          />
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved cards</p>
            <PaymentMethodList
              methods={methods}
              onAddMethod={p.onAddCard}
              onSetDefault={p.onSetDefault}
              onRemove={p.onRemove}
              isPendingDefault={p.defaultPending}
              isPendingRemove={p.removePending}
              isSetupPending={p.addCardPending}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Or pay from M-Pesa automatically</p>
            <MpesaStandingOrderCard />
          </div>
        </div>
      )}
    </section>
  );
}
