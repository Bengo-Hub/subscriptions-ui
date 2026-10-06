'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { PdfPreview, useDocumentPreview } from '@bengo-hub/shared-ui-lib/documents';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { BillingStatusHero } from '@/components/billing/BillingStatusHero';
import { BillsToPay } from '@/components/billing/BillsToPay';
import { AutoPaySection } from '@/components/billing/AutoPaySection';
import { NextInvoiceCard } from '@/components/billing/NextInvoiceCard';
import { InvoiceHistory } from '@/components/billing/InvoiceHistory';
import { WalletCouponCard } from '@/components/billing/WalletCouponCard';
import { ReferralCard } from '@/components/billing/ReferralCard';
import { AddonsSection } from '@/components/billing/AddonsSection';
import { ManageSubscription } from '@/components/billing/ManageSubscription';
import { SupportChargesCard } from '@/components/billing/SupportChargesCard';
import { useBillPayment } from '@/components/billing/use-bill-payment';
import {
  useBilling,
  useConfirmPaymentMethod,
  useCreditWallet,
  useDeletePaymentMethod,
  useInvoicePreview,
  useSetDefaultPaymentMethod,
  useSetupPaymentMethod,
  useUndoCancelSubscription,
} from '@/hooks/useBilling';
import { useSubscriptionSettings, useUpdateSubscriptionSettings } from '@/hooks/useSubscription';
import { accountStanding, type OpenBill } from '@/lib/billing/account-standing';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import type { Invoice } from '@/types/billing';

/**
 * Billing, ordered by what a business owner needs first:
 *   1. Where the account stands and one button to fix it (pay the open bill, or renew).
 *   2. Every open bill with its own Pay button.
 *   3. Next bill, credit, history and extras.
 *   4. Optional automatic payments, folded away while a bill is open.
 *   5. Change or cancel, at the bottom.
 * Paying never requires saving a card first (2026-10-05: alpha-china-market's admin could not
 * find how to pay an open invoice and set up a card four times instead).
 */
export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const { data: billing, isLoading } = useBilling();
  const { data: preview } = useInvoicePreview();
  const { data: wallet } = useCreditWallet();
  const { data: settings } = useSubscriptionSettings();
  const updateSettings = useUpdateSubscriptionSettings();
  const setDefault = useSetDefaultPaymentMethod();
  const removeMethod = useDeletePaymentMethod();
  const setupCard = useSetupPaymentMethod();
  const confirmCard = useConfirmPaymentMethod();
  const undoCancel = useUndoCancelSubscription();

  const billingEmail = settings?.billingEmail || user?.email || '';
  const pay = useBillPayment({ customerEmail: billingEmail });
  const standing = useMemo(() => accountStanding(billing), [billing]);
  const [cardSetup, setCardSetup] = useState<{ intentId: string; initiateUrl: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') toast.success('Payment received. Thank you, your plan is active.');
  }, []);

  // Invoice PDFs open in the shared preview (download / print); if the cross-origin fetch is
  // blocked, fall back to opening the file in a new tab so the action never breaks.
  const lastPdfUrl = useRef<string | null>(null);
  const { openPreview, previewProps } = useDocumentPreview({
    onError: () => {
      if (lastPdfUrl.current) window.open(lastPdfUrl.current, '_blank', 'noopener,noreferrer');
    },
  });
  const viewPdf = (url: string | undefined, title: string, fileName: string) => {
    if (!url) return;
    lastPdfUrl.current = url;
    openPreview(
      async () => {
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) throw new Error(`Failed to load invoice PDF (${res.status})`);
        return res.blob();
      },
      { fileName, title },
    );
  };

  const renew = () => {
    if (!billing?.planCode) {
      toast.error('No plan to renew. Choose a plan first.');
      return;
    }
    void pay.renew(billing.planCode, billing.billingCycle, `Renew ${billing.planName ?? 'subscription'}`);
  };

  const payInvoice = (inv: Invoice) => {
    const bill = standing.bills.find((b) => b.reference === inv.id);
    if (bill) pay.payBill(bill);
  };

  const viewBillPdf = (b: OpenBill) => viewPdf(b.pdfUrl, b.reference ?? b.label, `invoice-${b.reference ?? 'bill'}.pdf`);

  return (
    <>
      <PageContainer>
        <PageHeader
          eyebrow="Billing"
          icon={CreditCard}
          title="Billing and payments"
          description="See what you owe, pay it, and manage how you pay."
          actions={
            billing?.planName ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{billing.planName}</span>
            ) : undefined
          }
        />

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-label="Loading billing" />
        ) : (
          <BillingStatusHero
            standing={standing}
            billing={billing}
            nextBillAmount={preview?.estimated_total_kes}
            onPay={pay.payBill}
            onRenew={renew}
            onKeepSubscription={() => undoCancel.mutate()}
            busy={pay.starting === 'renew' || undoCancel.isPending}
          />
        )}

        {/* One bill is fully handled by the hero; list them when there is more than one. */}
        {standing.bills.length > 1 && <BillsToPay bills={standing.bills} onPay={pay.payBill} onViewPdf={viewBillPdf} />}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <InvoiceHistory
              invoices={billing?.invoices ?? []}
              loading={isLoading}
              onView={(inv) => viewPdf(inv.pdfUrl, inv.description || inv.id, `invoice-${inv.id}.pdf`)}
              onPay={payInvoice}
            />
            <AddonsSection preview={preview} onCheckout={(a) => pay.openIntent({ ...a, referenceType: 'addon_purchase' })} />
            <SupportChargesCard agreements={billing?.supportAgreements} charges={billing?.supportCharges} blocked={billing?.supportBlocked} showCharges={false} />
          </div>
          <aside className="space-y-6">
            <NextInvoiceCard preview={preview} billing={billing} />
            <AutoPaySection
              key={standing.kind}
              billing={billing}
              autoRenew={settings?.autoRenew ?? true}
              onToggleAutoRenew={(on) => updateSettings.mutate({ autoRenew: on })}
              togglePending={updateSettings.isPending}
              defaultOpen={standing.kind === 'paid'}
              onAddCard={() =>
                setupCard.mutate(billingEmail ? { billing_email: billingEmail } : undefined, {
                  onSuccess: (res) => setCardSetup({ intentId: res.payment_intent_id, initiateUrl: res.initiate_url }),
                })
              }
              addCardPending={setupCard.isPending}
              onSetDefault={(k) => setDefault.mutate(k)}
              onRemove={(k) => removeMethod.mutate(k)}
              defaultPending={setDefault.isPending}
              removePending={removeMethod.isPending}
            />
            <WalletCouponCard wallet={wallet} />
            <ReferralCard />
          </aside>
        </div>

        <ManageSubscription billing={billing} />
      </PageContainer>

      {pay.modal}

      {cardSetup && (
        <TreasuryPaymentModal
          open
          onOpenChange={(open) => {
            if (!open) setCardSetup(null);
          }}
          paymentIntentId={cardSetup.intentId}
          tenantSlug={selectedTenant?.slug ?? user?.tenant_slug ?? ''}
          initiateUrl={cardSetup.initiateUrl}
          amount={5}
          currency="KES"
          description="Payment method check (KES 5, refunded automatically)"
          referenceType="card_setup"
          customerEmail={billingEmail}
          allowedMethods="paystack,mpesa"
          onPaymentConfirmed={() => {
            const intentId = cardSetup.intentId;
            setCardSetup(null);
            confirmCard.mutate(intentId, {
              onSuccess: () => toast.success('Card saved for automatic renewal.'),
              onError: () => toast.success('Card saved. Refresh if it does not appear yet.'),
            });
          }}
          onPaymentFailed={() => {
            setCardSetup(null);
            toast.error('The card check did not complete. Please try again.');
          }}
        />
      )}

      <PdfPreview {...previewProps} />
    </>
  );
}
