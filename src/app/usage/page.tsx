'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarClock, Gauge, Layers } from 'lucide-react';
import { SubscriptionProvider, FeatureGate } from '@bengo-hub/shared-ui-lib/subscription';
import { PageContainer, PageHeader, StatTile } from '@/components/ui/page-header';
import { TokenWalletCard } from '@/components/usage/TokenWalletCard';
import { UsageMeterCard, usageLevel } from '@/components/usage/UsageMeterCard';
import { useUsage } from '@/hooks/useUsage';
import { useSubscription } from '@/hooks/useSubscription';
import { fmtDate } from '@/lib/billing/format';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function UsagePage() {
  const { data, isLoading } = useUsage();
  // The eTIMS API token wallet is its own product (ETIMS_API_* plans or the bundled overlay), so
  // its card stays hidden unless the plan carries etims_api_access or the tenant is exempt.
  // Without the gate any tenant could open a real payment for a product they never bought.
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();

  const metrics = data?.metrics ?? [];
  const hot = metrics.filter((m) => ['danger', 'over'].includes(usageLevel(m.used ?? 0, m.limit ?? 0)));
  const periodEnd = data?.billingPeriod?.end;
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / DAY_MS)) : undefined;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Usage"
        icon={Gauge}
        title="Usage"
        description="How much of your plan you have used this period. Counters reset when the period ends."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Layers} label="Plan" value={data?.plan || '—'} />
        <StatTile
          icon={CalendarClock}
          label="Resets"
          value={periodEnd ? fmtDate(periodEnd) : '—'}
          hint={daysLeft !== undefined ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : undefined}
        />
        <StatTile
          icon={AlertTriangle}
          label="Near or over a limit"
          value={isLoading ? '—' : hot.length}
          tone={hot.length > 0 ? 'danger' : 'success'}
          hint={hot.length > 0 ? hot.map((m) => m.name).join(', ') : 'Everything is within your plan'}
        />
      </div>

      {hot.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
            <p className="text-sm text-foreground">
              <span className="font-semibold">You are close to your plan&apos;s limits.</span>{' '}
              <span className="text-muted-foreground">Move to a bigger plan to keep going without interruptions or extra-usage charges.</span>
            </p>
          </div>
          <Link
            href="/plans"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            See plans
          </Link>
        </div>
      )}

      <section aria-label="Usage by metric" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)
          : metrics.map((m) => <UsageMeterCard key={m.key || m.name} metric={m} />)}
        {!isLoading && metrics.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No usage recorded this period yet.
          </p>
        )}
      </section>

      <SubscriptionProvider
        value={{
          features: subscription?.features ?? [],
          limits: subscription?.limits ?? {},
          isExempt: subscription?.exempt ?? false,
          isLoading: subscriptionLoading,
        }}
      >
        <FeatureGate feature="etims_api_access">
          <TokenWalletCard />
        </FeatureGate>
      </SubscriptionProvider>
    </PageContainer>
  );
}
