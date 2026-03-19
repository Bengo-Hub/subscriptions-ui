'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2, TrendingDown, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  tierLimits: Record<string, any>;
  tierOrder: number;
}

interface CurrentSubscription {
  id: string;
  planCode: string;
  status: string;
  currentPeriodEnd: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Features that are available in higher tiers but may be lost on downgrade
const DOWNGRADE_FEATURE_MATRIX: {
  name: string;
  starter: boolean;
  growth: boolean;
  professional: boolean;
}[] = [
  { name: 'Multi-outlet Support', starter: false, growth: true, professional: true },
  { name: 'White-labeling', starter: false, growth: false, professional: true },
  { name: 'API Webhooks', starter: false, growth: false, professional: true },
  { name: 'Loyalty Program Engine', starter: false, growth: true, professional: true },
  { name: 'Promo Codes & Discounts', starter: false, growth: true, professional: true },
  { name: 'Group Ordering', starter: false, growth: true, professional: true },
  { name: 'Advanced Reports', starter: false, growth: true, professional: true },
  { name: 'Google Maps (Premium)', starter: false, growth: false, professional: true },
  { name: 'Route Optimization (AI)', starter: false, growth: false, professional: true },
  { name: 'Paystack Gateway', starter: false, growth: true, professional: true },
  { name: 'POS Integration', starter: false, growth: false, professional: true },
  { name: 'Priority Support (4h SLA)', starter: false, growth: false, professional: true },
];

function getLostFeatures(currentCode: string, targetCode: string): string[] {
  const curr = currentCode.toLowerCase() as 'starter' | 'growth' | 'professional';
  const target = targetCode.toLowerCase() as 'starter' | 'growth' | 'professional';
  return DOWNGRADE_FEATURE_MATRIX
    .filter((f) => f[curr] === true && f[target] === false)
    .map((f) => f.name);
}

function DowngradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planCode = searchParams.get('plan');
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);

  const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState(true); // default: downgrade at period end
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      redirectToSSO(window.location.pathname + window.location.search);
      return;
    }
    if (!planCode) {
      router.push('/plans');
      return;
    }
    if (status !== 'authenticated') return;

    async function fetchData() {
      try {
        const [target, sub] = await Promise.all([
          apiClient.get<Plan>(`/api/v1/plans/code/${planCode}`),
          apiClient.get<CurrentSubscription>('/api/v1/subscription'),
        ]);
        const current = sub?.planCode
          ? await apiClient.get<Plan>(`/api/v1/plans/code/${sub.planCode}`)
          : null;
        setTargetPlan(target);
        setCurrentSub(sub);
        setCurrentPlan(current);
      } catch {
        setError('Failed to load plan details. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [planCode, status, router, redirectToSSO]);

  const handleDowngrade = async () => {
    if (!targetPlan || !confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.put('/api/v1/subscription', {
        plan_code: targetPlan.planCode,
        effective: periodEnd ? 'period_end' : 'immediate',
      });
      router.push('/usage?downgrade=success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process downgrade. Please try again.');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'syncing' || (loading && !error)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading downgrade details...</h2>
      </div>
    );
  }

  if (error || !targetPlan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <Zap className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{error || 'Plan not found.'}</p>
        <Link href="/plans" className="mt-8">
          <Button variant="outline" className="rounded-xl px-8 h-12 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
          </Button>
        </Link>
      </div>
    );
  }

  const lostFeatures = currentPlan
    ? getLostFeatures(currentPlan.planCode, targetPlan.planCode)
    : [];

  const priceSaving = (currentPlan?.basePrice ?? 0) - targetPlan.basePrice;

  return (
    <div className="max-w-5xl mx-auto p-6 py-12">
      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Left: Downgrade Details */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <Link href="/plans" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
              <TrendingDown className="h-3.5 w-3.5" /> Plan Downgrade
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Downgrade to <span className="text-amber-500">{targetPlan.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Please review what you'll lose before confirming this change.
            </p>
          </div>

          {/* Plan transition */}
          <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-lg font-black mb-4">Plan Change</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-4 rounded-2xl bg-slate-100 dark:bg-slate-800">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">From</p>
                  <p className="text-xl font-black">{currentPlan?.name ?? 'Current'}</p>
                  {currentPlan && (
                    <p className="text-sm text-muted-foreground font-bold mt-1">
                      {currentPlan.currency} {currentPlan.basePrice.toLocaleString()} / mo
                    </p>
                  )}
                </div>
                <ArrowRight className="h-6 w-6 text-amber-500 flex-shrink-0" />
                <div className="flex-1 text-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1">To</p>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400">{targetPlan.name}</p>
                  <p className="text-sm font-bold mt-1">
                    {targetPlan.currency} {targetPlan.basePrice.toLocaleString()} / mo
                  </p>
                </div>
              </div>
              {priceSaving > 0 && (
                <div className="mt-4 p-3 rounded-2xl bg-green-500/10 text-center">
                  <p className="text-sm font-black text-green-600 dark:text-green-400">
                    You'll save {targetPlan.currency} {priceSaving.toLocaleString()} / month
                  </p>
                </div>
              )}
            </div>

            {lostFeatures.length > 0 && (
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Features you'll lose</h4>
                    <p className="text-xs text-muted-foreground">These won't be available on {targetPlan.name}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {lostFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                      <X className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Capacity reduction */}
          {currentPlan && (
            <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <CardContent className="p-8">
                <h4 className="font-black text-sm uppercase tracking-widest text-muted-foreground mb-5">Capacity Changes</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-semibold">Orders / Day</span>
                    <div className="flex items-center gap-3 text-sm font-black">
                      <span className="text-muted-foreground">{currentPlan.tierLimits.max_orders_per_day}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-600">{targetPlan.tierLimits.max_orders_per_day}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-semibold">Rider Seats</span>
                    <div className="flex items-center gap-3 text-sm font-black">
                      <span className="text-muted-foreground">{currentPlan.tierLimits.max_riders}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-600">{targetPlan.tierLimits.max_riders}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-sm font-semibold">Admin Seats</span>
                    <div className="flex items-center gap-3 text-sm font-black">
                      <span className="text-muted-foreground">
                        {currentPlan.tierLimits.max_admins === -1 ? 'Unlimited' : currentPlan.tierLimits.max_admins}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-600">
                        {targetPlan.tierLimits.max_admins === -1 ? 'Unlimited' : targetPlan.tierLimits.max_admins}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Confirmation */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-amber-500/20 bg-slate-50/50 dark:bg-slate-900 shadow-xl shadow-amber-500/5 sticky top-8">
            <CardHeader className="p-8 pb-0">
              <Badge className="w-fit mb-4 bg-amber-500 text-white font-black text-[10px] tracking-widest px-3">DOWNGRADE</Badge>
              <h3 className="text-2xl font-black">Confirm Downgrade</h3>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6 mb-8">
                {/* Timing option */}
                <div className="space-y-3">
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">When to apply</p>

                  <button
                    type="button"
                    onClick={() => setPeriodEnd(true)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      periodEnd
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      periodEnd ? 'border-primary bg-primary' : 'border-slate-300'
                    }`}>
                      {periodEnd && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="font-black text-sm">At period end</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Keep current plan until{' '}
                        {currentSub ? formatDate(currentSub.currentPeriodEnd) : 'end of cycle'}.
                        No charge today.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodEnd(false)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      !periodEnd
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      !periodEnd ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                    }`}>
                      {!periodEnd && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="font-black text-sm">Immediately</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Switch now. Access to current-plan features ends today.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Confirmation checkbox */}
                <button
                  type="button"
                  onClick={() => setConfirmed((c) => !c)}
                  className="w-full flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className={`mt-0.5 h-4 w-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    confirmed ? 'bg-primary border-primary' : 'border-slate-300'
                  }`}>
                    {confirmed && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                    I understand I will lose access to the features listed above and capacity will be reduced.
                  </p>
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <Button
                className={`w-full h-14 rounded-2xl font-black text-lg transition-all ${
                  confirmed
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={handleDowngrade}
                disabled={submitting || !confirmed}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 mr-2" />
                    Confirm Downgrade
                  </>
                )}
              </Button>

              <Link href="/plans" className="block mt-4">
                <Button variant="ghost" className="w-full h-11 rounded-2xl font-bold text-muted-foreground">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-slate-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}

export default function DowngradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading...</h2>
      </div>
    }>
      <DowngradeContent />
    </Suspense>
  );
}
