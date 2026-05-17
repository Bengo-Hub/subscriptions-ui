'use client';

import { Badge, Button, Card, CardContent } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Sparkles, Layout, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';


interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  basePrice: number;
  currency: string;
  isActive: boolean;
  tierOrder: number;
  tierLimits: Record<string, any>;
}

interface CurrentSubscription {
  id: string;
  planId: string;
  planCode: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
}

type ServiceTab = 'Delivery' | 'POS' | 'Inventory' | 'ERP' | 'Logistics' | 'TruLoad';
type BillingTab = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';

const SERVICE_TABS: ServiceTab[] = ['Delivery', 'POS', 'Inventory', 'ERP', 'Logistics', 'TruLoad'];

function planBelongsToService(planCode: string, service: ServiceTab): boolean {
  switch (service) {
    case 'Delivery':
      return /^(STARTER|GROWTH|PROFESSIONAL)(_YEARLY)?$/.test(planCode);
    case 'POS':
      return planCode.startsWith('POS_');
    case 'Inventory':
      return planCode.startsWith('INVENTORY_');
    case 'ERP':
      return planCode.startsWith('ERP_');
    case 'Logistics':
      return planCode.startsWith('TRANSPORTER_');
    case 'TruLoad':
      return planCode.startsWith('TRULOAD_');
    default:
      return false;
  }
}

function stripServicePrefix(planCode: string, service: ServiceTab): string {
  let stripped = planCode;
  switch (service) {
    case 'Delivery':
      stripped = planCode.replace(/_YEARLY$/, '');
      break;
    case 'POS':
      stripped = planCode.replace(/^POS_/, '');
      break;
    case 'Inventory':
      stripped = planCode.replace(/^INVENTORY_/, '');
      break;
    case 'ERP':
      stripped = planCode.replace(/^ERP_/, '');
      break;
    case 'Logistics':
      stripped = planCode.replace(/^TRANSPORTER_/, '');
      break;
    case 'TruLoad':
      stripped = planCode.replace(/^TRULOAD_/, '').replace(/_YEARLY$/, '');
      break;
  }
  return stripped
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function isOneTimePlan(plan: Plan): boolean {
  return plan.billingCycle === 'ONE_TIME' || plan.planCode.includes('ONE_TIME') || plan.planCode.includes('LICENSE') || plan.planCode.includes('_COMPLETE');
}

function isAnnualPlan(plan: Plan): boolean {
  return plan.billingCycle === 'ANNUAL' || plan.planCode.includes('YEARLY');
}

function getTierClass(planCode: string): string {
  const upper = planCode.toUpperCase();
  if (upper.includes('PROFESSIONAL') || upper.includes('PREMIUM') || upper.includes('COMPLETE')) return 'from-purple-500/20 to-transparent';
  if (upper.includes('GROWTH') || upper.includes('STANDARD') || upper.includes('DEVICE_5') || upper.includes('DEVICE_10')) return 'from-primary/20 to-transparent';
  return 'from-blue-500/10 to-transparent';
}

function getTierBorder(planCode: string, isCurrent: boolean): string {
  if (isCurrent) return 'ring-2 ring-blue-500 border-blue-500 shadow-xl shadow-blue-500/10';
  const upper = planCode.toUpperCase();
  if (upper.includes('GROWTH') || upper.includes('STANDARD') || upper.includes('DEVICE_5')) return 'border-primary shadow-lg shadow-primary/5';
  return 'border-border';
}

function isRecommendedPlan(planCode: string): boolean {
  const upper = planCode.toUpperCase();
  return upper.includes('GROWTH') || upper.includes('STANDARD') || upper.includes('DEVICE_5');
}

export default function PlansPage() {
  const router = useRouter();
  const [activeService, setActiveService] = useState<ServiceTab>('Delivery');
  const [billingTab, setBillingTab] = useState<BillingTab>('MONTHLY');

  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<{ plans: Plan[]; count: number }>('/api/v1/plans'),
    staleTime: 300_000,
  });

  const allPlans: Plan[] = plansResponse?.plans ?? [];

  const servicePlans = allPlans.filter((p) => planBelongsToService(p.planCode, activeService));

  const hasOneTime = servicePlans.some((p) => isOneTimePlan(p));

  const displayPlans = servicePlans
    .filter((p) => {
      if (billingTab === 'ONE_TIME') return isOneTimePlan(p);
      if (billingTab === 'ANNUAL') return isAnnualPlan(p) && !isOneTimePlan(p);
      return !isAnnualPlan(p) && !isOneTimePlan(p);
    })
    .sort((a, b) => a.tierOrder - b.tierOrder);

  const isAnnual = billingTab === 'ANNUAL';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6">
            <Sparkles className="h-4 w-4" /> Discover the Power of BengoBox
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6">
            Choose the membership <br />
            <span className="bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">that's right for you</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprise chains, we provide the tools you need to grow your business.
          </p>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
          <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Service Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-accent border border-border flex-wrap justify-center">
            {SERVICE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveService(tab); setBillingTab('MONTHLY'); }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-black transition-all",
                  activeService === tab
                    ? "bg-white dark:bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-accent border border-border">
            <button
              onClick={() => setBillingTab('MONTHLY')}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-black transition-all",
                billingTab === 'MONTHLY'
                  ? "bg-white dark:bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingTab('ANNUAL')}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                billingTab === 'ANNUAL'
                  ? "bg-white dark:bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-black">SAVE 17%</span>
            </button>
            {hasOneTime && (
              <button
                onClick={() => setBillingTab('ONE_TIME')}
                className={cn(
                  "px-6 py-3 rounded-xl text-sm font-black transition-all",
                  billingTab === 'ONE_TIME'
                    ? "bg-white dark:bg-accent text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                One-Time
              </button>
            )}
          </div>
        </div>

        {/* Plan Cards */}
        {plansLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : displayPlans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No plans available for this selection.</p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-8 mb-20",
            displayPlans.length === 1 ? "grid-cols-1 max-w-sm mx-auto" :
            displayPlans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" :
            "grid-cols-1 md:grid-cols-3"
          )}>
            {displayPlans.map((plan) => {
              const isCurrent = currentSub?.planCode === plan.planCode;
              const recommended = isRecommendedPlan(plan.planCode) && !isCurrent;
              const displayName = stripServicePrefix(plan.planCode, activeService);

              return (
                <div key={plan.id} className="relative">
                  <Card className={cn(
                    "h-full flex flex-col rounded-[3rem] p-4 transition-all duration-300 bg-card border",
                    getTierBorder(plan.planCode, isCurrent)
                  )}>
                    {recommended && (
                      <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">
                        Recommended
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">
                        Current Plan
                      </div>
                    )}

                    <div className={cn("rounded-[2.5rem] p-8 h-full flex flex-col bg-linear-to-b", getTierClass(plan.planCode))}>
                      <div className="mb-8">
                        <h3 className="text-2xl font-black text-foreground mb-2">{displayName}</h3>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="text-5xl font-black text-foreground">
                            {billingTab === 'ONE_TIME'
                              ? `KES ${plan.basePrice.toLocaleString()}`
                              : `KES ${isAnnual ? Math.round(plan.basePrice / 12).toLocaleString() : plan.basePrice.toLocaleString()}`}
                          </span>
                          {billingTab !== 'ONE_TIME' && (
                            <span className="text-muted-foreground font-bold">/mo</span>
                          )}
                        </div>
                        {isAnnual && (
                          <p className="text-xs text-muted-foreground font-bold -mt-2 mb-2">
                            Billed KES {plan.basePrice.toLocaleString()} / year
                          </p>
                        )}
                        {billingTab === 'ONE_TIME' && (
                          <p className="text-xs text-muted-foreground font-bold -mt-2 mb-2">One-time payment</p>
                        )}
                        <p className="text-muted-foreground font-medium text-sm leading-relaxed min-h-16">
                          {plan.description}
                        </p>
                      </div>

                      <div className="flex-1 space-y-4 mb-10">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-2">Top Features</p>
                        <div className="space-y-3">
                          {Object.entries(plan.tierLimits ?? {}).slice(0, 4).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3">
                              <Check className="h-4 w-4 text-blue-500 shrink-0" />
                              <span className="text-sm font-semibold text-foreground capitalize">
                                {val === -1 ? 'Unlimited' : String(val)} {key.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant={recommended ? 'primary' : 'outline'}
                        className={cn(
                          "w-full h-14 rounded-2xl font-black text-lg transition-all",
                          isCurrent && "opacity-50 cursor-default",
                          recommended && "shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90",
                          !recommended && "border-border text-foreground hover:bg-accent"
                        )}
                        disabled={isCurrent}
                        onClick={() => {
                          if (isCurrent) return;
                          if (!currentSub) {
                            router.push(`/subscribe?plan=${plan.planCode}`);
                            return;
                          }
                          const currentPlanData = allPlans.find((p) => p.planCode === currentSub.planCode);
                          if (!currentPlanData) {
                            router.push(`/subscribe?plan=${plan.planCode}`);
                            return;
                          }
                          if (plan.tierOrder > currentPlanData.tierOrder) {
                            router.push(`/upgrade?plan=${plan.planCode}`);
                          } else {
                            router.push(`/downgrade?plan=${plan.planCode}`);
                          }
                        }}
                      >
                        {isCurrent ? 'Current Plan' : (() => {
                          if (!currentSub) return 'Get Started';
                          const currentPlanData = allPlans.find((p) => p.planCode === currentSub.planCode);
                          if (!currentPlanData) return 'Get Started';
                          return plan.tierOrder > currentPlanData.tierOrder ? 'Upgrade' : 'Downgrade';
                        })()}
                      </Button>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Dynamic TierLimits Comparison Table */}
        {!plansLoading && displayPlans.length > 0 && (
          <div className="mt-16 mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-foreground mb-4">Plan Features Comparison</h2>
              <p className="text-muted-foreground">Detailed limits for each plan in this category.</p>
            </div>
            <div className="bg-card rounded-[3rem] border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-6 px-10 text-xs font-black uppercase tracking-widest text-muted-foreground">Feature</th>
                      {displayPlans.map((p) => (
                        <th key={p.id} className="py-6 px-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                          {stripServicePrefix(p.planCode, activeService)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set(displayPlans.flatMap((p) => Object.keys(p.tierLimits ?? {})))
                    ).map((limitKey, idx, arr) => (
                      <tr
                        key={limitKey}
                        className={cn("group transition-colors", idx !== arr.length - 1 && "border-b border-border/50")}
                      >
                        <td className="py-5 px-10">
                          <span className="text-sm font-bold text-foreground capitalize group-hover:text-blue-500 transition-colors">
                            {limitKey.replace(/_/g, ' ')}
                          </span>
                        </td>
                        {displayPlans.map((p) => {
                          const val = (p.tierLimits ?? {})[limitKey];
                          return (
                            <td key={p.id} className="py-5 px-6 text-center">
                              <span className="text-sm font-black text-foreground">
                                {val === undefined ? '—' : val === -1 ? 'Unlimited' : String(val)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Annual Savings Banner */}
        <div className="mt-12 p-12 rounded-[3.5rem] bg-card border border-border relative overflow-hidden dark:bg-accent/50">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-black text-white mb-6">Simple, Transparent Pricing</h3>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
                Exceeding your plan's limits? No worries — you'll be charged at competitive rates only for what you use beyond your package.
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                Overage rates vary by plan — contact support for details.
              </p>
            </div>
            <div className="p-10 rounded-[3rem] bg-linear-to-br from-white/10 to-transparent border border-white/10 text-center relative">
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-green-500 text-white border-none font-black text-[10px] tracking-widest px-3">SAVE BIG</Badge>
              </div>
              <Layout className="h-16 w-16 text-blue-500 mx-auto mb-6" />
              <h4 className="text-3xl font-black text-white mb-3">Annual Savings</h4>
              <p className="text-muted-foreground text-md mb-8">Switch to annual billing and get <span className="text-white font-black underline underline-offset-4 decoration-primary">1 month for free</span> on any plan. Best for long-term growth.</p>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black h-16 rounded-2xl text-xl shadow-2xl"
                onClick={() => setBillingTab('ANNUAL')}
              >
                Switch to Annual
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
        </div>
      </div>
    </div>
  );
}
