'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Check, CreditCard, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  tierLimits: Record<string, any>;
}

interface InitiateResult {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  authorization_url?: string;
}

function SubscribeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planCode = searchParams.get('plan');
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      const currentPath = window.location.pathname + window.location.search;
      redirectToSSO(currentPath);
      return;
    }

    if (!planCode) {
      router.push('/plans');
      return;
    }

    async function fetchPlan() {
      try {
        const data = await apiClient.get<Plan>(`/api/v1/plans/code/${planCode}`);
        setPlan(data);
      } catch (err) {
        setError('Failed to load plan details');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchPlan();
    }
  }, [planCode, status, router, redirectToSSO]);

  const handleCheckout = async () => {
    if (!plan) return;
    setInitiating(true);
    setError(null);

    try {
      const result = await apiClient.post<InitiateResult>('/api/v1/subscription/initiate', {
        plan_code: plan.planCode,
        return_url: `${window.location.origin}/usage?checkout=success`,
      });

      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        // If no auth URL, maybe it's a zero-amount or already paid?
        // For now, redirect to usage
        router.push('/usage?status=' + result.status);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate checkout. Please try again.');
      setInitiating(false);
    }
  };

  if (status === 'loading' || status === 'syncing' || (loading && !error)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Preparing your checkout...</h2>
        <p className="text-muted-foreground mt-2">Setting up your secure payment session</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <Zap className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{error || 'Plan not found'}</p>
        <Link href="/plans" className="mt-8">
          <Button variant="outline" className="rounded-xl px-8 h-12 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 py-12">
      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Left: Summary & Features */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <Link href="/plans" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" /> Change Plan
            </Link>
            <h1 className="text-4xl font-black tracking-tight mb-4">Complete your <br /><span className="text-primary underline decoration-primary/20 underline-offset-8">Subscription</span></h1>
            <p className="text-lg text-muted-foreground">You're one step away from unlocking premium tools for your food business.</p>
          </div>

          <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Plan Benefits</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{plan.name} Tier</p>
                </div>
              </div>
            </div>
            <CardContent className="p-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Priority Orders</p>
                    <p className="text-xs text-muted-foreground mt-1">Up to {plan.tierLimits.max_orders_per_day} orders per day processed with priority.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Rider Network</p>
                    <p className="text-xs text-muted-foreground mt-1">Connect up to {plan.tierLimits.max_riders} riders to your dedicated app.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Secure Treasury</p>
                    <p className="text-xs text-muted-foreground mt-1">Manage M-Pesa and Paystack payouts directly through Treasury.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Analytics Suite</p>
                    <p className="text-xs text-muted-foreground mt-1">Real-time heatmaps and performance reports included.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-muted-foreground font-medium">
            <CreditCard className="h-4 w-4" /> Secure checkout powered by Codevertex Treasury. PCI-DSS compliant.
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-primary/20 bg-slate-50/50 dark:bg-slate-900 shadow-xl shadow-primary/5 sticky top-8">
            <CardHeader className="p-8 pb-0">
              <Badge className="w-fit mb-4 bg-primary text-white font-black text-[10px] tracking-widest px-3">CHECKOUT</Badge>
              <h3 className="text-2xl font-black">Order Summary</h3>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground font-medium">{plan.name} Plan</span>
                  <span className="font-bold">{plan.currency} {plan.basePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground font-medium">Platform Fee</span>
                  <span className="text-green-500 font-bold uppercase text-xs tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">Included</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 flex justify-between items-end">
                  <div>
                    <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Total Due Now</span>
                    <p className="text-3xl font-black mt-1">{plan.currency} {plan.basePrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-16 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={handleCheckout}
                disabled={initiating}
              >
                {initiating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Confirm & Pay
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

      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading...</h2>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
