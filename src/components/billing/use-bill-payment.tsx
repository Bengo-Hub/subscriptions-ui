'use client';

import { ReactNode, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { initiateSubscription } from '@/lib/api/subscriptions';
import { payTargetFor, type OpenBill } from '@/lib/billing/account-standing';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';

interface Checkout {
  intentId: string;
  tenant: string;
  amount: number;
  currency: string;
  description: string;
  initiateUrl?: string;
  referenceId?: string;
  referenceType?: string;
}

/**
 * One way to pay on the billing page: an open bill (its own pay link) or a renewal of the current
 * plan. Both open the same in-app checkout (M-Pesa or card), so paying never needs a saved
 * payment method first.
 */
export function useBillPayment({ customerEmail }: { customerEmail?: string } = {}) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const tenantSlug = selectedTenant?.slug ?? user?.tenant_slug ?? '';
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const refreshAll = useCallback(() => {
    for (const key of ['billing', 'invoice-preview', 'current-subscription', 'subscription', 'credit-wallet', 'standing-order', 'plan-addons']) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  }, [qc]);

  const payBill = useCallback(
    (bill: OpenBill) => {
      const target = payTargetFor(bill.payUrl, bill.amountDue);
      if (!target) {
        toast.error('This bill cannot be paid online yet. Please contact support.');
        return;
      }
      if (target.mode === 'link') {
        window.open(target.href, '_blank', 'noopener,noreferrer');
        return;
      }
      setCheckout({
        intentId: target.intentId,
        tenant: target.tenant,
        amount: target.amount,
        currency: target.currency,
        description: bill.reference ? `${bill.label} (${bill.reference})` : bill.label,
        referenceId: target.referenceId,
        referenceType: target.referenceType,
      });
    },
    [],
  );

  const renew = useCallback(
    async (planCode: string, billingCycle?: string, label = 'Renew subscription') => {
      setStarting('renew');
      try {
        const res = await initiateSubscription(planCode, `${window.location.origin}/billing?checkout=success`, billingCycle);
        const r = res as typeof res & { is_bypass?: boolean };
        if (r.is_bypass || !res.intent_id) {
          toast.success('Your subscription is already active.');
          refreshAll();
          return;
        }
        setCheckout({
          intentId: res.intent_id,
          tenant: tenantSlug,
          amount: Number(res.amount) || 0,
          currency: res.currency || 'KES',
          description: label,
          initiateUrl: res.initiate_url,
          referenceType: 'subscription',
        });
      } catch (e: any) {
        toast.error(e?.response?.data?.error ?? 'Could not start the payment. Please try again.');
      } finally {
        setStarting(null);
      }
    },
    [tenantSlug, refreshAll],
  );

  /** Any other intent created by this app (e.g. an add-on purchase). */
  const openIntent = useCallback(
    (args: { intentId: string; initiateUrl?: string; amount: number; label: string; referenceType?: string }) => {
      if (!args.intentId) {
        toast.error('Could not start the payment. Please try again.');
        return;
      }
      setCheckout({
        intentId: args.intentId,
        tenant: tenantSlug,
        amount: args.amount,
        currency: 'KES',
        description: args.label,
        initiateUrl: args.initiateUrl || undefined,
        referenceType: args.referenceType,
      });
    },
    [tenantSlug],
  );

  const modal: ReactNode = checkout ? (
    <TreasuryPaymentModal
      open
      onOpenChange={(open) => {
        if (!open) setCheckout(null);
      }}
      paymentIntentId={checkout.intentId}
      tenantSlug={checkout.tenant}
      amount={checkout.amount}
      currency={checkout.currency}
      description={checkout.description}
      initiateUrl={checkout.initiateUrl}
      referenceId={checkout.referenceId}
      referenceType={checkout.referenceType}
      customerEmail={customerEmail}
      allowedMethods="paystack,mpesa"
      onPaymentConfirmed={() => {
        setCheckout(null);
        toast.success('Payment received. Thank you, your account is up to date.');
        refreshAll();
        // Renewal and invoice settlement land through treasury events a moment later.
        setTimeout(refreshAll, 4000);
      }}
      onPaymentFailed={() => {
        setCheckout(null);
        toast.error('The payment did not complete. Please try again, or contact support if money left your account.');
      }}
    />
  ) : null;

  return { payBill, renew, openIntent, starting, modal };
}
