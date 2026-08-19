'use client';

import { Card, CardContent } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Mail, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useEmailLicenses } from '@/hooks/useEmailHosting';

interface BillingSummary {
  nextRenewalDate?: string;
  planName?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Org header (plan Part 2b/5, T2) — the Zoho-style "who is this dashboard
 * for" strip: tenant name, super-admin email, plan(s), renewal date. Plan
 * name/renewal come from the tenant's existing overall subscription
 * (already-real data via /api/v1/billing, same as the Billing page uses) —
 * email-specific tier names are derived from the licenses already fetched
 * for the page below, since a tenant can hold more than one tier at once.
 */
export function EmailHostingOrgHeader() {
  const user = useAuthStore((s) => s.user);
  const { tenant } = useTenantBranding();
  const { data: licenses = [] } = useEmailLicenses();

  const { data: billing } = useQuery({
    queryKey: ['billing-summary-for-email-hosting'],
    queryFn: () => apiClient.get<BillingSummary>('/api/v1/billing'),
    staleTime: 5 * 60_000,
  });

  const planNames = useMemo(() => {
    const names = new Set<string>();
    for (const l of licenses) {
      const name = l.edges?.email_plan?.name;
      if (name) names.add(name);
    }
    return names.size > 0 ? Array.from(names).join(', ') : '—';
  }, [licenses]);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 p-4">
        <div>
          <p className="text-lg font-bold">{tenant?.name ?? 'Your organization'}</p>
          <p className="text-sm text-muted-foreground">Super administrator: {user?.email ?? '—'}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary" />
            <span>Email plan(s): {planNames}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Account plan: {billing?.planName ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Renews: {formatDate(billing?.nextRenewalDate)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
