'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader2, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
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
  planId: string;
  planCode: string;
  status: string;
  currentPeriodEnd: string;
}

interface InitiateResult {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  authorization_url?: string;
}

function daysRemaining(periodEnd: string): number {
  const end = new Date(periodEnd);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function UpgradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planCode = searchParams.get('plan');
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);

  const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleUpgrade = async () => {
    if (!targetPlan) return;
    setInitiating(true);
    setError(null);
    try {
      const result = await apiClient.post<InitiateResult>('/api/v1/subscription/initiate', {
        plan_code: targetPlan.planCode,
        return_url: `${window.location.origin}/usage?checkout=success`,
      });
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        router.push('/usage?status=' + result.status);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate upgrade. Please try again.');
      setInitiating(false);
    }
  };

  if (status === 'loading' || status === 'syncing' || (loading && !error)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading upgrade details...</h2>
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

  const daysLeft = currentSub ? daysRemaining(currentSub.currentPeriodEnd) : 0;
  const priceDiff = targetPlan.basePrice - (currentPlan?.basePrice ?? 0);
  // Prorated charge: proportional to days remaining in billing cycle (approx 30-day month)
  const proratedAmount = currentSub
    ? Math.round((priceDiff / 30) * daysLeft)
    : targetPlan.basePrice;

  return (
    <div className="max-w-5xl mx-auto p-6 py-12">
      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Left: Upgrade Details */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <Link href="/plans" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-black uppercase tracking-widest mb-4">
              <TrendingUp className="h-3.5 w-3.5" /> Plan Upgrade
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Upgrade to <span className="text-primary">{targetPlan.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Unlock more capacity and features to grow your business.
            </p>
          </div>

          {/* Plan transition card */}
          <Card className="rounded-[2.5rem] border-border overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border bg-accent/30">
              <h3 className="text-lg font-black mb-2">Plan Change</h3>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1 text-center p-4 rounded-2xl bg-accent">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">From</p>
                  <p className="text-xl font-black">{currentPlan?.name ?? 'Free'}</p>
                  {currentPlan && (
                    <p className="text-sm text-muted-foreground font-bold mt-1">
                      {currentPlan.currency} {currentPlan.basePrice.toLocaleString()} / mo
                    </p>
                  )}
                </div>
                <ArrowRight className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex-1 text-center p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">To</p>
                  <p className="text-xl font-black text-primary">{targetPlan.name}</p>
                  <p className="text-sm font-bold mt-1">
                    {targetPlan.currency} {targetPlan.basePrice.toLocaleString()} / mo
                  </p>
                </div>
              </div>
            </div>
            <CardContent className="p-8 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                What you're gaining
              </h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {targetPlan.tierLimits.max_orders_per_day} Orders / Day
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan ? `Up from ${currentPlan.tierLimits.max_orders_per_day}` : 'Included'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {targetPlan.tierLimits.max_riders} Rider Seats
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan ? `Up from ${currentPlan.tierLimits.max_riders}` : 'Included'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {targetPlan.tierLimits.max_admins === -1
                        ? 'Unlimited Admins'
                        : `${targetPlan.tierLimits.max_admins} Admin(s)`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan ? `Up from ${currentPlan.tierLimits.max_admins}` : 'Included'}
                    </p>
                  </div>
                </div>
                {targetPlan.planCode === 'PROFESSIONAL' && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">White-labeling + API Webhooks</p>
                      <p className="text-xs text-muted-foreground">Enterprise customization</p>
                    </div>
                  </div>
                )}
                {targetPlan.planCode === 'GROWTH' && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Loyalty Program + Promo Codes</p>
                      <p className="text-xs text-muted-foreground">Customer retention tools</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-4 rounded-2xl bg-accent/50 border border-border text-xs text-muted-foreground font-medium">
            <CreditCard className="h-4 w-4" /> Secure checkout powered by Codevertex Treasury. PCI-DSS compliant.
          </div>
        </div>

        {/* Right: Upgrade Summary */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-primary/20 bg-accent/30 shadow-xl shadow-primary/5 sticky top-8">
            <CardHeader className="p-8 pb-0">
              <Badge className="w-fit mb-4 bg-green-500 text-white font-black text-[10px] tracking-widest px-3">UPGRADE</Badge>
              <h3 className="text-2xl font-black">Upgrade Summary</h3>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground font-medium">{targetPlan.name} Plan</span>
                  <span className="font-bold">{targetPlan.currency} {targetPlan.basePrice.toLocaleString()} / mo</span>
                </div>
                {currentSub && daysLeft > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <span className="text-muted-foreground font-medium">Prorated charge</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{daysLeft} days remaining in cycle</p>
                    </div>
                    <span className="font-bold">{targetPlan.currency} {proratedAmount.toLocaleString()}</span>
                  </div>
                )}
                {currentSub && (
                  <div className="flex justify-between items-center py-2 text-xs text-muted-foreground">
                    <span>Next billing date</span>
                    <span className="font-bold">{formatDate(currentSub.currentPeriodEnd)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-4 mt-4 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Due Today</span>
                    <p className="text-3xl font-black mt-1">
                      {targetPlan.currency} {(currentSub ? proratedAmount : targetPlan.basePrice).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-16 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleUpgrade}
                disabled={initiating}
              >
                {initiating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Confirm Upgrade
                  </>
                )}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground mt-6 font-bold uppercase tracking-widest leading-relaxed">
                By confirming, you agree to our <br />
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-green-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading...</h2>
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
