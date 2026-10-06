'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Info, Package, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { listFeatureCatalog } from '@/lib/api/feature-catalog';
import { fetchTenantBySlug } from '@/lib/tenant-api';
import { cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { PlanCard, type PlanBadge, type PlanCta } from '@/components/plans/PlanCard';
import { PlanComparison } from '@/components/plans/PlanComparison';
import { useAllPlans } from '@/hooks/usePlans';
import {
  EMPTY_CATALOG_MAPS,
  USECASE_GROUPS,
  buildCatalogMaps,
  groupLabel,
  isOneTimePlan,
  isRecommended,
  planGroup,
  plansForTenant,
  sortGroups,
  type BillingKind,
  type CurrentSubscription,
  type Plan,
} from '@/lib/plans/catalog';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-700 dark:text-green-400',
  TRIAL: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  EXPIRED: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

/**
 * Tenant plan picker. Product and billing type sit on one sticky toolbar row (they were two
 * stacked rows plus a banner); the billing-period note is a short hint in that row.
 */
export function TenantPlansView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get('service');
  const highlight = searchParams.get('plan');
  const [pickedGroup, setPickedGroup] = useState('');
  const [kind, setKind] = useState<BillingKind>('RECURRING');

  // The tenant's use case decides which plan groups are relevant.
  const { data: tenantBrand } = useQuery({
    queryKey: ['tenant-brand'],
    queryFn: () => {
      const slug = typeof window !== 'undefined' ? localStorage.getItem('tenant_slug') : null;
      return slug ? fetchTenantBySlug(slug) : Promise.resolve(null);
    },
    staleTime: 300_000,
  });
  const useCase = (tenantBrand?.useCase ?? 'other').toLowerCase();

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  });
  const { data: plansData, isLoading } = useAllPlans();
  const { data: catalog } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: () => listFeatureCatalog().then((r) => r.features ?? []),
    staleTime: 5 * 60_000,
  });
  const maps = useMemo(() => (catalog?.length ? buildCatalogMaps(catalog) : EMPTY_CATALOG_MAPS), [catalog]);

  // Public plans only: is_public=false rows (e.g. annual support plans) are sold by the platform.
  const allPlans = useMemo(() => (plansData ?? []).filter((p) => p.isPublic !== false), [plansData]);

  // Visible groups: those relevant to the use case, plus whatever the tenant already subscribes to.
  const subscribedGroup = currentSub?.plan_code ? planGroup(currentSub.plan_code) : null;
  const allowed = USECASE_GROUPS[useCase];
  const groups = sortGroups(
    [...new Set(allPlans.map((p) => planGroup(p.planCode)))].filter((g) => !allowed || allowed.includes(g) || g === subscribedGroup),
  );
  const paramGroup = serviceParam ? planGroup(serviceParam.replace(/-/g, '_').toUpperCase() + '_') : null;
  const group = pickedGroup && groups.includes(pickedGroup) ? pickedGroup : paramGroup && groups.includes(paramGroup) ? paramGroup : groups[0] ?? 'ORDERING';

  const currentCode = currentSub?.plan_code ?? null;
  const status = currentSub?.status ?? null;
  const hasOneTime = allPlans.some((p) => planGroup(p.planCode) === group && isOneTimePlan(p));
  const effectiveKind: BillingKind = kind === 'ONE_TIME' && !hasOneTime ? 'RECURRING' : kind;
  const plans = useMemo(
    () => plansForTenant(allPlans, group, effectiveKind, useCase, currentCode),
    [allPlans, group, effectiveKind, useCase, currentCode],
  );
  const currentPlan = allPlans.find((p) => p.planCode === currentCode);

  const badgeFor = (p: Plan): PlanBadge => {
    if (p.planCode === currentCode) return status === 'EXPIRED' ? 'expired' : 'current';
    if (p.planCode === highlight) return 'selected';
    return isRecommended(p.planCode) ? 'recommended' : null;
  };

  const ctaFor = (p: Plan, badge: PlanBadge): PlanCta => {
    const go = (path: string) => () => router.push(`${path}?plan=${p.planCode}`);
    if (badge === 'current') return { label: 'Your current plan', disabled: true, tone: 'current' };
    if (badge === 'expired') return { label: 'Renew this plan', onClick: go('/subscribe'), tone: 'danger' };
    if (!currentSub || !currentPlan || planGroup(p.planCode) !== planGroup(currentCode)) {
      return { label: currentSub ? 'Subscribe' : 'Get started', onClick: go('/subscribe'), tone: badge === 'recommended' ? 'primary' : 'outline' };
    }
    if (p.tierOrder > currentPlan.tierOrder) return { label: 'Upgrade', onClick: go('/upgrade'), tone: 'primary' };
    return { label: 'Downgrade', onClick: go('/downgrade'), tone: 'outline' };
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Plans"
        icon={Sparkles}
        title="Choose your plan"
        description="Upgrade, downgrade or cancel any time."
        actions={
          currentSub ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current plan</p>
                <p className="truncate text-sm font-bold text-foreground">{currentSub.plan_name}</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_STYLE[status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                {status ?? 'Unknown'}
              </span>
            </div>
          ) : undefined
        }
      />

      {/* One toolbar row: product on the left, billing type on the right; scrolls on phones. */}
      <div className="sticky top-16 z-20 -mx-4 border-y border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Product" className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/50 p-1 scrollbar-hide">
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setPickedGroup(g)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  group === g ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {groupLabel(g)}
              </button>
            ))}
          </div>

          {hasOneTime && (
            <div role="tablist" aria-label="Billing type" className="flex gap-1 rounded-2xl border border-border bg-muted/50 p-1">
              {(['RECURRING', 'ONE_TIME'] as BillingKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={effectiveKind === k}
                  onClick={() => setKind(k)}
                  className={cn(
                    'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    effectiveKind === k ? 'bg-card text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {k === 'RECURRING' ? 'Subscription' : 'One-time licence'}
                </button>
              ))}
            </div>
          )}

          {effectiveKind === 'RECURRING' && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground lg:ml-auto">
              <Info className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              Pay monthly, or for 6 or 12 months at checkout. 6+ months: no setup fee.
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 h-12 w-12 opacity-30" aria-hidden />
          <p className="font-medium">No plans available here yet.</p>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-6 pt-3',
            plans.length === 1 ? 'max-w-md grid-cols-1' : plans.length === 2 ? 'max-w-3xl grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
          )}
        >
          {plans.map((p, i) => {
            const badge = badgeFor(p);
            return (
              <PlanCard
                key={p.id}
                plan={p}
                prevPlan={i > 0 ? plans[i - 1] : undefined}
                group={group}
                kind={effectiveKind}
                badge={badge}
                cta={ctaFor(p, badge)}
                limitInfo={maps.limitInfo}
              />
            );
          })}
        </div>
      )}

      {!isLoading && (catalog?.length ?? 0) > 0 && <PlanComparison plans={plans} group={group} maps={maps} />}

      {effectiveKind === 'RECURRING' && !isLoading && plans.length > 0 && (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Going over a limit? With extra usage switched on you only pay for what you use beyond your plan, at the rates shown above.
          For larger businesses, <a className="font-semibold text-primary underline-offset-2 hover:underline" href="mailto:info@codevertexafrica.com">contact us</a>.
        </p>
      )}
    </PageContainer>
  );
}
