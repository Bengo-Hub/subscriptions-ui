'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Info, Layers, Package } from 'lucide-react';
import { toast } from 'sonner';
import { listFeatureCatalog } from '@/lib/api/feature-catalog';
import { getTerms } from '@/lib/api/subscriptions';
import { fetchTenantBySlug } from '@/lib/tenant-api';
import { cn } from '@/lib/utils';
import { PageContainer, PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlanCard, type PlanBadge, type PlanCta } from '@/components/plans/PlanCard';
import { PlanComparison } from '@/components/plans/PlanComparison';
import { useBillPayment } from '@/components/billing/use-bill-payment';
import { useAllPlans } from '@/hooks/usePlans';
import { useAddPlanToSubscription, useCurrentSubscription } from '@/hooks/useSubscription';
import { useAuthStore } from '@/store/auth';
import { addOnRuleNote, breakdownLines, parseAddPlanResult, subscriptionAddOns, type AddPlanResult } from '@/lib/billing/addons';
import { fmtMoney } from '@/lib/billing/format';
import {
  EMPTY_CATALOG_MAPS,
  USECASE_GROUPS,
  buildCatalogMaps,
  groupLabel,
  isOneTimePlan,
  isRecommended,
  planAction,
  planGroup,
  plansForTenant,
  previousTier,
  visibleGroups,
  type BillingKind,
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
  const onlyLinked = searchParams.get('only') === '1';
  const [pickedGroup, setPickedGroup] = useState('');
  // Null until the tenant picks: a linked one-time plan (?plan=..._ONE_TIME) opens on licences.
  const [kind, setKind] = useState<BillingKind | null>(null);

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

  const { data: currentSub } = useCurrentSubscription();
  const addOns = useMemo(() => subscriptionAddOns(currentSub), [currentSub]);
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: getTerms, staleTime: 10 * 60_000, enabled: !!currentSub });
  const addPlan = useAddPlanToSubscription();
  const email = useAuthStore((s) => s.user?.email);
  const pay = useBillPayment({ customerEmail: email });
  // The add-on being confirmed, the terms box, and the API's answer when it asks for payment.
  const [adding, setAdding] = useState<Plan | null>(null);
  const [termsOk, setTermsOk] = useState(false);
  const [charge, setCharge] = useState<{ plan: Plan; result: AddPlanResult } | null>(null);
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
  // Links arrive with a service tag (?service=pos, from auth-ui and the apps) or a plan-code prefix
  // (?service=powersuite). A tag resolves through the plans that carry it, so pos opens PowerSuite
  // and hospital opens Codevertex Afya. A linked plan code decides the group when service is absent.
  const highlightPlan = highlight ? allPlans.find((p) => p.planCode === highlight) : undefined;
  const paramGroup = serviceParam
    ? (() => {
        const tagged = allPlans.find((p) => p.serviceTag?.toLowerCase() === serviceParam.toLowerCase());
        return tagged ? planGroup(tagged.planCode) : planGroup(serviceParam.replace(/-/g, '_').toUpperCase() + '_');
      })()
    : highlightPlan
      ? planGroup(highlightPlan.planCode)
      : null;
  const groups = visibleGroups(
    allPlans.map((p) => planGroup(p.planCode)),
    { allowed, subscribed: subscribedGroup, linked: paramGroup, only: onlyLinked },
  );
  const group = pickedGroup && groups.includes(pickedGroup) ? pickedGroup : paramGroup && groups.includes(paramGroup) ? paramGroup : groups[0] ?? 'ORDERING';

  // The plan being paid for, not a trial plan: the trial tier still shows as an upgrade.
  const currentCode = currentSub?.upgrade_trial?.base_plan_code ?? currentSub?.plan_code ?? null;
  const status = currentSub?.status ?? null;
  const hasOneTime = allPlans.some((p) => planGroup(p.planCode) === group && isOneTimePlan(p));
  const wantedKind: BillingKind = kind ?? (highlightPlan && isOneTimePlan(highlightPlan) ? 'ONE_TIME' : 'RECURRING');
  const effectiveKind: BillingKind = wantedKind === 'ONE_TIME' && !hasOneTime ? 'RECURRING' : wantedKind;
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
    const action = planAction(p, {
      currentCode,
      currentPlan,
      status,
      isPerpetual: currentSub?.is_perpetual,
      addOns,
      hasSubscription: !!currentSub,
    });
    switch (action) {
      case 'current':
        return { label: 'Your current plan', disabled: true, tone: 'current' };
      case 'expired':
        return { label: 'Renew this plan', onClick: go('/subscribe'), tone: 'danger' };
      case 'added':
        return { label: 'On your plan', disabled: true, tone: 'current', note: 'Added to your plan. Manage it on the billing page.' };
      case 'add_on':
        return {
          label: 'Add to my plan',
          onClick: () => {
            setTermsOk(false);
            setAdding(p);
          },
          tone: 'primary',
          note: addOnRuleNote(p, currentSub ?? { status: null }),
        };
      case 'upgrade':
        return { label: 'Upgrade', onClick: go('/upgrade'), tone: 'primary' };
      case 'downgrade':
        return { label: 'Downgrade', onClick: go('/downgrade'), tone: 'outline' };
      default:
        return { label: currentSub ? 'Subscribe' : 'Get started', onClick: go('/subscribe'), tone: badge === 'recommended' ? 'primary' : 'outline' };
    }
  };

  const confirmAdd = () => {
    const plan = adding;
    if (!plan || !terms?.version) return;
    addPlan.mutate(
      { planCode: plan.planCode, termsVersion: terms.version },
      {
        onSuccess: (res) => {
          setAdding(null);
          const result = parseAddPlanResult(res);
          if (result.payment.kind === 'none') {
            toast.success(result.outcome === 'main_plan' ? `${plan.name} is now your main plan.` : `${plan.name} is on your plan.`);
            return;
          }
          // Something to pay: show the API's own breakdown first, then take the payment.
          setCharge({ plan, result });
        },
        // A 409 ("already covered by your plan") is an answer, not a failure: the hook shows the
        // API's message and refreshes the page, so the dialog closes.
        onError: (e: any) => {
          if (e?.response?.status === 409) setAdding(null);
        },
      },
    );
  };

  const payCharge = () => {
    if (!charge) return;
    const { plan, result } = charge;
    setCharge(null);
    if (result.payment.kind === 'intent') {
      pay.openIntent({ intentId: result.payment.intentId, initiateUrl: result.payment.initiateUrl, amount: result.payment.amount, label: plan.name, referenceType: 'subscription' });
    } else if (result.payment.kind === 'redirect') {
      window.location.href = result.payment.url;
    } else {
      router.push('/billing');
    }
  };
  const chargeAmount =
    charge && (charge.result.payment.kind === 'intent' ? charge.result.payment.amount : charge.result.payment.kind === 'invoice' ? charge.result.payment.amount : charge.result.breakdown?.charged);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Plans"
        icon={Layers}
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
          {groups.length > 1 && (
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
          )}

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
                prevPlan={previousTier(plans, i)}
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
          For larger businesses, <a className="font-semibold text-primary underline-offset-2 hover:underline" href="mailto:sales@codevertexafrica.com">contact us</a>.
        </p>
      )}

      <ConfirmDialog
        open={!!adding}
        variant="info"
        title={`Add ${adding?.name ?? 'this plan'} to your plan?`}
        description={adding ? addOnRuleNote(adding, currentSub ?? { status: null }) : undefined}
        confirmLabel="Add to my plan"
        pending={addPlan.isPending}
        confirmDisabled={!termsOk || !terms?.version}
        onCancel={() => setAdding(null)}
        onConfirm={confirmAdd}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            It renews and ends with {currentSub?.plan_name ?? 'your plan'} and appears on the same bill. If it includes
            everything your plan has, it becomes your main plan instead. If your plan already has some of its features,
            you pay only for the new ones. You see the exact amount before you pay anything.
          </p>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-foreground">
            <input
              type="checkbox"
              checked={termsOk}
              onChange={(e) => setTermsOk(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            />
            <span>I accept the subscription Terms and Conditions{terms?.version ? ` (version ${terms.version})` : ''}.</span>
          </label>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!charge}
        variant="info"
        title={
          charge?.result.outcome === 'main_plan'
            ? `${charge.plan.name} becomes your main plan`
            : `Pay for ${charge?.plan.name ?? 'your add-on'}`
        }
        description={
          charge?.result.outcome === 'main_plan'
            ? 'It includes everything in your current plan, so it replaces it. You pay the difference for the days to your renewal date.'
            : charge?.result.breakdown && charge.result.breakdown.covered > 0
              ? 'Your plan already has some of its features, so you pay only for the new ones.'
              : 'Charged for the days to your renewal date, then it renews with your plan.'
        }
        confirmLabel={
          charge?.result.payment.kind === 'invoice'
            ? 'Go to billing to pay'
            : chargeAmount != null
              ? `Pay ${fmtMoney(chargeAmount, charge?.result.breakdown?.currency ?? 'KES')}`
              : 'Continue to payment'
        }
        cancelLabel="Pay later"
        onCancel={() => {
          setCharge(null);
          toast.message('Not paid yet. Anything due shows on your billing page.');
        }}
        onConfirm={payCharge}
      >
        {charge?.result.breakdown ? (
          <dl className="space-y-1.5 rounded-xl border border-border p-3 text-sm">
            {breakdownLines(charge.result.breakdown).map((l) => (
              <div key={l.label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{l.label}</dt>
                <dd className="font-medium tabular-nums text-foreground">{l.value}</dd>
              </div>
            ))}
          </dl>
        ) : chargeAmount != null ? (
          <p className="text-sm text-foreground">
            Amount due now: <span className="font-semibold tabular-nums">{fmtMoney(chargeAmount)}</span>
          </p>
        ) : null}
      </ConfirmDialog>

      {pay.modal}
    </PageContainer>
  );
}
