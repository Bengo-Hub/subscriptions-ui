'use client';

import { useState } from 'react';
import { Bell, HardDriveDownload, Loader2, Mail, RefreshCw, ShieldCheck, Settings as SettingsIcon } from 'lucide-react';
import { Button, Input } from '@/components/ui/base';
import { CapsuleTabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { PageContainer, PageHeader, SectionCard } from '@/components/ui/page-header';
import { SwitchRow } from '@/components/ui/switch';
import { PrivacyDataSection } from '@/components/settings/PrivacyDataSection';
import { useSubscriptionSettings, useUpdateSubscriptionSettings } from '@/hooks/useSubscription';
import { useBackupSettings, useUpdateBackupSettings } from '@/hooks/useBackupSettings';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { useTenantFilterStore } from '@/store/tenant-filter';
import type { BackupSettings } from '@/lib/api/backups';
import type { SubscriptionSettings } from '@/types/subscription';

type SectionKey = 'renewal' | 'notifications' | 'contact' | 'backups' | 'privacy';

const SECTIONS: TabItem<SectionKey>[] = [
  { key: 'renewal', label: 'Renewal', icon: RefreshCw },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'contact', label: 'Billing contact', icon: Mail },
  { key: 'backups', label: 'Backups', icon: HardDriveDownload },
  { key: 'privacy', label: 'Privacy and data', icon: ShieldCheck },
];

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? 'AM' : 'PM'}`;

/**
 * Tenant subscription settings. Phones get a swipeable capsule strip; from lg up the sections
 * sit in a left rail with the content beside it, so wide screens have no dead side margins.
 * Unsaved edits show one sticky save bar instead of a Save button per section.
 */
export function TenantSettingsView({ viewingTenantName }: { viewingTenantName?: string }) {
  const { tenant } = useTenantBranding();
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null);
  const [section, setSection] = useState<SectionKey>('renewal');

  const { data: settings, isLoading } = useSubscriptionSettings();
  const saveSettings = useUpdateSubscriptionSettings();
  const [form, setForm] = useState<Partial<SubscriptionSettings>>({});
  const merged: Partial<SubscriptionSettings> = { ...settings, ...form };

  const { data: backupSettings, isLoading: backupsLoading } = useBackupSettings(tenantKey);
  const saveBackups = useUpdateBackupSettings(tenantKey);
  const [backupForm, setBackupForm] = useState<Partial<BackupSettings>>({});
  const backups: BackupSettings = { auto_enabled: false, schedule_hour: 2, retention_days: 4, ...backupSettings, ...backupForm };

  const dirty = Object.keys(form).length > 0 || Object.keys(backupForm).length > 0;
  const saving = saveSettings.isPending || saveBackups.isPending;

  const saveAll = () => {
    if (Object.keys(form).length > 0) saveSettings.mutate(merged, { onSuccess: () => setForm({}) });
    if (Object.keys(backupForm).length > 0) saveBackups.mutate(backups, { onSuccess: () => setBackupForm({}) });
  };
  const discard = () => {
    setForm({});
    setBackupForm({});
  };
  const set = <K extends keyof SubscriptionSettings>(key: K, value: SubscriptionSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <PageContainer className={dirty ? 'pb-28' : undefined}>
      <PageHeader
        eyebrow="Settings"
        icon={SettingsIcon}
        title={viewingTenantName ? `${viewingTenantName} settings` : 'Subscription settings'}
        description="Renewal, reminders, where invoices go, backups and your data."
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

              {section === 'backups' && (
                <SectionCard title="Automatic backups" icon={HardDriveDownload} description="Off by default. When on, a copy of this organisation's data is made daily.">
                  {backupsLoading ? (
                    <div className="h-24 animate-pulse rounded-xl bg-muted" />
                  ) : (
                    <div className="space-y-4">
                      <SwitchRow
                        id="set-backups"
                        title="Back up every day"
                        checked={backups.auto_enabled}
                        onCheckedChange={(v) => setBackupForm((p) => ({ ...p, auto_enabled: v }))}
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="set-backup-hour" className="mb-1.5 block text-sm font-medium">
                            Time of day
                          </label>
                          <select
                            id="set-backup-hour"
                            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                            value={backups.schedule_hour}
                            disabled={!backups.auto_enabled}
                            onChange={(e) => setBackupForm((p) => ({ ...p, schedule_hour: Number(e.target.value) }))}
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h} value={h}>
                                {hourLabel(h)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="set-backup-days" className="mb-1.5 block text-sm font-medium">
                            Keep backups for (days)
                          </label>
                          <Input
                            id="set-backup-days"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={backups.retention_days}
                            disabled={!backups.auto_enabled}
                            onChange={(e) => setBackupForm((p) => ({ ...p, retention_days: Math.max(1, Number(e.target.value) || 1) }))}
                          />
                          <p className="mt-1.5 text-xs text-muted-foreground">Older backups are deleted automatically.</p>
                        </div>
                      </div>
                    </div>
                  )}
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
