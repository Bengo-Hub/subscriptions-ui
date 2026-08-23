'use client';

import { Handshake } from 'lucide-react';
import { Badge, Card, CardContent } from '@/components/ui/base';
import { useResellerStatus } from '@/hooks/useResellerPortal';
import { PartnerClientsSection } from './partner-clients-section';
import { PartnerCommissionSection } from './partner-commission-section';

const TIER_LABELS: Record<string, string> = {
  registered: 'Registered Partner',
  certified: 'Certified Partner',
  premier: 'Premier Partner',
};

// Certified Reseller & Partner Program self-service portal — thin shell over two sections,
// matching this app's existing email-hosting/page.tsx pattern (own page, own status header,
// section components). Guarded by ./layout.tsx (redirects away if the current tenant isn't a
// certified reseller). Sub-model B ("Commission Partner") only for now — declaring/managing a
// client's own retail price (Sub-model A) is Phase 4, once that sub-model ships.
export default function PartnerPortalPage() {
  const { data: status } = useResellerStatus();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
          <Handshake className="h-7 w-7 text-primary" /> Partner Portal
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your certified reseller status, clients, and commission.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-6">
          <div>
            <p className="text-sm text-muted-foreground">Certified as</p>
            <p className="text-xl font-bold">{status?.business_name ?? '—'}</p>
          </div>
          <Badge className="text-sm px-3 py-1">
            {status?.requested_tier ? TIER_LABELS[status.requested_tier] ?? status.requested_tier : 'Certified Reseller'}
          </Badge>
        </CardContent>
      </Card>

      <PartnerClientsSection />
      <PartnerCommissionSection />
    </div>
  );
}
