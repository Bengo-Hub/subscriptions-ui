'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { EmailHostingLicensesSection } from './email-hosting-licenses-section';
import { EmailHostingDomainsSection } from './email-hosting-domains-section';

type Section = 'licenses' | 'domains';

/**
 * Tenant self-service Email Hosting console (plan Part 3) — thin shell over
 * two sections. Placed as its own top-level page, matching this app's
 * existing billing/usage/settings convention, rather than nested inside
 * another page's tab set.
 */
export default function EmailHostingPage() {
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const [section, setSection] = useState<Section>('licenses');
  const [intent, setIntent] = useState<{ intentId: string; initiateUrl: string; amount: number } | null>(null);

  const tabs: { id: Section; label: string }[] = [
    { id: 'licenses', label: 'Licenses & users' },
    { id: 'domains', label: 'Domains' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Mail className="h-7 w-7 text-primary" /> Email Hosting
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage mailbox licenses, users, and custom domains for your organization&apos;s hosted email.
        </p>
      </header>

      <div className="flex w-fit gap-2 rounded-2xl bg-accent/50 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              section === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === 'licenses' && <EmailHostingLicensesSection onIntent={setIntent} />}
      {section === 'domains' && <EmailHostingDomainsSection />}

      {intent && (
        <TreasuryPaymentModal
          open={!!intent}
          onOpenChange={(open) => { if (!open) setIntent(null); }}
          paymentIntentId={intent.intentId}
          tenantSlug={selectedTenant?.slug ?? user?.tenant_slug ?? ''}
          initiateUrl={intent.initiateUrl}
          amount={intent.amount}
          currency="KES"
          referenceType="email_license_purchase"
          customerEmail={user?.email}
          allowedMethods="paystack,mpesa"
          onPaymentConfirmed={() => setIntent(null)}
          onPaymentFailed={() => setIntent(null)}
        />
      )}
    </div>
  );
}
