'use client';

import { useState } from 'react';
import { Bell, Loader2, Mail, RefreshCw, ShieldCheck, Settings as SettingsIcon } from 'lucide-react';
import { Button, Input } from '@/components/ui/base';
import { CapsuleTabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { PageContainer, PageHeader, SectionCard } from '@/components/ui/page-header';
import { SwitchRow } from '@/components/ui/switch';
import { PrivacyDataSection } from '@/components/settings/PrivacyDataSection';
import { useSubscriptionSettings, useUpdateSubscriptionSettings } from '@/hooks/useSubscription';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import type { SubscriptionSettings } from '@/types/subscription';

type SectionKey = 'renewal' | 'notifications' | 'contact' | 'privacy';

const SECTIONS: TabItem<SectionKey>[] = [
  { key: 'renewal', label: 'Renewal', icon: RefreshCw },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'contact', label: 'Billing contact', icon: Mail },
  { key: 'privacy', label: 'Privacy and data', icon: ShieldCheck },
];

/**
 * Tenant subscription settings. Phones get a swipeable capsule strip; from lg up the sections
 * sit in a left rail with the content beside it, so wide screens have no dead side margins.
 * Unsaved edits show one sticky save bar instead of a Save button per section.
 */
export function TenantSettingsView({ viewingTenantName }: { viewingTenantName?: string }) {
  const { tenant } = useTenantBranding();
  const [section, setSection] = useState<SectionKey>('renewal');

  const { data: settings, isLoading } = useSubscriptionSettings();
  const saveSettings = useUpdateSubscriptionSettings();
  const [form, setForm] = useState<Partial<SubscriptionSettings>>({});
  const merged: Partial<SubscriptionSettings> = { ...settings, ...form };

  const dirty = Object.keys(form).length > 0;
  const saving = saveSettings.isPending;

  const saveAll = () => {
    if (Object.keys(form).length > 0) saveSettings.mutate(merged, { onSuccess: () => setForm({}) });
  };
  const discard = () => {
    setForm({});
  };
  const set = <K extends keyof SubscriptionSettings>(key: K, value: SubscriptionSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <PageContainer className={dirty ? 'pb-28' : undefined}>
      <PageHeader
        eyebrow="Settings"
        icon={SettingsIcon}
        title={viewingTenantName ? `${viewingTenantName} settings` : 'Subscription settings'}
        description="Renewal, reminders, where invoices go and your data."
        actions={
          tenant ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-3 w-3 rounded-full border border-border bg-primary" aria-hidden />
              {tenant.name}
            </span>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <CapsuleTabs
          items={SECTIONS}
          value={section}
          onChange={setSection}
          label="Settings sections"
          layout="rail"
          idPrefix="settings"
          className="lg:sticky lg:top-24 lg:self-start"
        />

        <TabPanel tabKey={section} idPrefix="settings" className="min-w-0 space-y-6">
          {isLoading ? (
            <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          ) : (
            <>
              {section === 'renewal' && (
                <SectionCard title="Automatic renewal" icon={RefreshCw} description="What happens when your plan period ends.">
                  <SwitchRow
                    id="set-auto-renew"
                    title="Renew automatically"
                    description="Charge your saved card or M-Pesa standing order when the plan is due. With it off, you get an invoice to pay instead."
                    checked={!!merged.autoRenew}
                    onCheckedChange={(v) => set('autoRenew', v)}
                  />
                  <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    Manage saved cards and the M-Pesa standing order on the Billing page, under Automatic payments.
                  </p>
                </SectionCard>
              )}

              {section === 'notifications' && (
                <SectionCard title="Reminders and alerts" icon={Bell} description="Messages about your subscription. Invoices and receipts are always sent.">
                  <div className="divide-y divide-border">
                    <SwitchRow
                      id="set-renewal-reminder"
                      title="Renewal reminder"
                      description="A reminder before your plan renews or ends."
                      checked={!!merged.notifyBeforeRenewal}
                      onCheckedChange={(v) => set('notifyBeforeRenewal', v)}
                    />
                    <div>
                      <SwitchRow
                        id="set-usage-alert"
                        title="Usage alert"
                        description={`Tell me when any limit reaches ${merged.usageThresholdPercent || 80}%.`}
                        checked={!!merged.notifyOnUsageThreshold}
                        onCheckedChange={(v) => set('notifyOnUsageThreshold', v)}
                      />
                      {merged.notifyOnUsageThreshold && (
                        <div className="mb-3 flex flex-wrap items-center gap-3 border-l-2 border-primary/30 pl-4">
                          <label htmlFor="set-threshold" className="text-sm text-muted-foreground">
                            Alert at
                          </label>
                          <Input
                            id="set-threshold"
                            type="number"
                            inputMode="numeric"
                            min={50}
                            max={100}
                            value={merged.usageThresholdPercent || 80}
                            onChange={(e) => set('usageThresholdPercent', Math.min(100, Math.max(50, Number(e.target.value) || 80)))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">% of a limit</span>
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}

              {section === 'contact' && (
                <SectionCard title="Billing contact" icon={Mail} description="Invoices, receipts and payment alerts go to this address.">
                  <label htmlFor="set-billing-email" className="mb-1.5 block text-sm font-medium">
                    Billing email
                  </label>
                  <Input
                    id="set-billing-email"
                    type="email"
                    autoComplete="email"
                    value={merged.billingEmail || ''}
                    onChange={(e) => set('billingEmail', e.target.value)}
                    placeholder="billing@company.com"
                  />
                </SectionCard>
              )}

              {section === 'privacy' && <PrivacyDataSection />}
            </>
          )}
        </TabPanel>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4 md:left-65 md:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
            <p className="text-sm font-medium text-foreground">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={discard} disabled={saving}>
                Discard
              </Button>
              <Button onClick={saveAll} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
