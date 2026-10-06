'use client';

import { Copy, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import { apiClient } from '@/lib/api/client';
import { useTenantFilterStore } from '@/store/tenant-filter';

/** Share a code; when a referred business subscribes and pays, credit lands in the wallet. */
export function ReferralCard() {
  const tenantKey = useTenantFilterStore((s) => s.selectedTenant?.id ?? null);
  const { data } = useQuery({
    queryKey: ['referral-code', tenantKey],
    queryFn: () => apiClient.get<{ referral_code: string }>('/api/v1/subscription/referral-code'),
    staleTime: 10 * 60_000,
  });
  if (!data?.referral_code) return null;
  return (
    <SectionCard title="Refer and earn" icon={Gift} description="Earn credit when a business you refer subscribes and pays.">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider">
          {data.referral_code}
        </code>
        <Button
          variant="outline"
          aria-label="Copy referral code"
          onClick={() => {
            void navigator.clipboard?.writeText(data.referral_code);
            toast.success('Referral code copied');
          }}
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
      </div>
    </SectionCard>
  );
}
