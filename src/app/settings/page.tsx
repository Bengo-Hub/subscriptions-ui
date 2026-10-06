'use client';

import { useState } from 'react';
import { Database, Link2, Settings as SettingsIcon } from 'lucide-react';
import { useMe } from '@/hooks/useMe';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { CapsuleTabs, TabPanel, type TabItem } from '@/components/ui/tabs';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { TenantSettingsView } from '@/components/settings/TenantSettingsView';
import { PlatformConfigsView } from '@/components/settings/PlatformConfigsView';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';

type PlatformTab = 'configs' | 'integrations';
const PLATFORM_TABS: TabItem<PlatformTab>[] = [
  { key: 'configs', label: 'Service configs', icon: Database },
  { key: 'integrations', label: 'Integrations', icon: Link2 },
];

/**
 * Tenants (and platform owners viewing a selected tenant) get the tenant's subscription settings;
 * platform owners with no tenant selected get platform configuration.
 */
export default function SettingsPage() {
  const { user } = useMe();
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const isPlatformOwner = !!(user?.is_platform_owner || user?.tenant_slug === 'codevertex');
  const [tab, setTab] = useState<PlatformTab>('configs');

  if (!isPlatformOwner) return <TenantSettingsView />;
  if (selectedTenant) return <TenantSettingsView viewingTenantName={selectedTenant.name} />;

  return (
    <PageContainer>
      <PageHeader eyebrow="Platform" icon={SettingsIcon} title="Platform settings" description="Platform configuration and integrations for the subscriptions service." />
      <CapsuleTabs items={PLATFORM_TABS} value={tab} onChange={setTab} label="Platform settings" idPrefix="platform-settings" className="w-fit max-w-full" />
      <TabPanel tabKey={tab} idPrefix="platform-settings">
        {tab === 'configs' ? <PlatformConfigsView /> : <IntegrationsSection />}
      </TabPanel>
    </PageContainer>
  );
}
