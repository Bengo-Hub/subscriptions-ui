'use client';

import { useId, useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import { PhoneInputField } from '@bengo-hub/shared-ui-lib/contact';
import { formatCurrency } from '@bengo-hub/shared-ui-lib';
import { Badge, Button } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useCancelStandingOrder,
  useRegisterStandingOrder,
  useStandingOrder,
  useStandingOrderQuote,
} from '@/hooks/useBilling';

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'every month',
  quarterly: 'every three months',
  semi_annual: 'every six months',
  annual: 'every year',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * Optional automatic renewal from an M-Pesa number (Safaricom Ratiba standing order). Before
 * anything is set up the customer sees who will debit them, how much, how often and from when,
 * and must tick the authorisation themselves (nothing pre-ticked). They can cancel any time.
 */
export function MpesaStandingOrderCard() {
  const { data: order, isLoading } = useStandingOrder();
  const live = order && order.status !== 'cancelled' ? order : null;
  const { data: quote, isLoading: quoteLoading } = useStandingOrderQuote(!isLoading && !live);
  const register = useRegisterStandingOrder();
  const cancel = useCancelStandingOrder();
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const consentId = useId();

  if (isLoading) return <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />;

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-700 dark:text-green-400">
          <Smartphone className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">M-Pesa standing order</p>
            {live && (
              <Badge variant={live.status === 'active' ? 'success' : 'warning'}>
                {live.status === 'active' ? 'Active' : 'Approve on your phone'}
              </Badge>
            )}
          </div>
          {live ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(Number(live.amount))} {FREQUENCY_LABEL[live.frequency] ?? live.frequency} from +{live.phone}, starting{' '}
              {fmtDate(live.start_date)}.
              {live.status !== 'active' && ' Open the M-Pesa prompt on your phone to approve it.'}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Renew automatically from your M-Pesa number. You approve it once on your phone and can cancel any time.
            </p>
          )}
        </div>
      </div>

      {live && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmCancel(true)}
          >
            Cancel standing order
          </Button>
        </div>
      )}

      {!live && quoteLoading && <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />}

      {!live && quote && !quote.available && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Not available for this plan: {quote.reason}.
        </p>
      )}

      {!live && quote?.available && quote.terms && (
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-semibold text-foreground">{formatCurrency(quote.terms.amount, quote.terms.currency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">How often</dt>
              <dd className="font-semibold text-foreground">{FREQUENCY_LABEL[quote.terms.frequency] ?? quote.terms.frequency}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">First debit</dt>
              <dd className="font-semibold text-foreground">{fmtDate(quote.terms.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid to</dt>
              <dd className="font-semibold text-foreground">{quote.terms.payee}</dd>
            </div>
          </dl>
          <PhoneInputField value={phone} onChange={setPhone} defaultCountry="KE" />
          <label htmlFor={consentId} className="flex cursor-pointer items-start gap-2.5 text-xs text-foreground">
            <input
              id={consentId}
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>{quote.authorisation_text}</span>
          </label>
          <Button
            className="w-full sm:w-auto"
            onClick={() => register.mutate({ phone, authorised: agreed })}
            disabled={!phone || !agreed || register.isPending}
          >
            {register.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Set up standing order
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        variant="warning"
        title="Cancel the M-Pesa standing order?"
        description="We will stop using it for your subscription, and future renewals will come as invoices for you to pay. Also end it in M-Pesa (Ratiba / standing orders) so Safaricom makes no further debits."
        confirmLabel="Cancel standing order"
        cancelLabel="Keep it"
        pending={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
      />
    </div>
  );
}
