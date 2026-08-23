'use client';

import { Badge, Card, CardContent, CardHeader } from '@/components/ui/base';
import { useResellerCommission } from '@/hooks/useResellerPortal';

const FREQUENCY_LABELS: Record<string, string> = {
  manual: 'Manual',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

// Commission summary — this reseller's own EquityHolder record (GET /api/v1/reseller/commission
// on treasury-api). Deliberately summary-level only (percentage share, status, linked-client
// count) — itemized payout history is a follow-up, not built this session. Sub-model B
// ("Commission Partner") only; there is no price-declaration UI here (that's Sub-model A,
// Phase 4, once it ships).
export function PartnerCommissionSection() {
  const { data, isLoading, isError } = useResellerCommission();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-bold">Commission</h2>
        <p className="text-sm text-muted-foreground">
          Your revenue-share commission on your clients' subscription revenue.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load your commission summary. Please try again.</p>
        ) : !data?.has_commission_record ? (
          <p className="text-sm text-muted-foreground py-4">
            Your commission record will appear here once your first client's subscription is active.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Commission rate</p>
              <p className="text-2xl font-black">{data.percentage_share?.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked clients</p>
              <p className="text-2xl font-black">{data.linked_client_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Payout schedule</p>
              <p className="text-2xl font-black">
                {FREQUENCY_LABELS[data.payout_frequency ?? ''] ?? data.payout_frequency ?? '—'}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Badge variant={data.is_active ? 'default' : 'outline'}>
                {data.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
