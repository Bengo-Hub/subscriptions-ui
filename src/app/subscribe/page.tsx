'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { ArrowLeft, Calendar, Check, CreditCard, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
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
  billingCycle: string;
  freeTrialDays: number;
  tierLimits: Record<string, any>;
}

interface InitiateResult {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  initiate_url?: string;
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
  const [error, setError] = useState<string | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [intentId, setIntentId] = useState('');
  const [initiateUrl, setInitiateUrl] = useState('');
  const [initiating, setInitiating] = useState(false);
  const [paidIntentId, setPaidIntentId] = useState<string | null>(null);

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
        // Backend returns { plan: {...} } — unwrap the wrapper
        const resp = await apiClient.get<{ plan: Plan } | Plan>(`/api/v1/plans/code/${planCode}`);
        const planData: Plan = (resp as any)?.plan ?? resp as Plan;
        setPlan(planData);
      } catch {
        setError('Failed to load plan details');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchPlan();
    }
  }, [planCode, status, router, redirectToSSO]);

  const hasTrial = (plan?.freeTrialDays ?? 0) > 0;
  const isFree = (plan?.basePrice ?? 0) === 0;

  // Start a free trial or free plan directly via POST /subscription
  const handleStartTrial = async () => {
    if (!plan) return;
    setInitiating(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/subscription', { plan_code: plan.planCode });
      router.push('/usage?subscribed=true');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? '';
      if (msg.includes('already') || err.response?.status === 409) {
        router.push('/usage');
      } else {
        setError(msg || 'Failed to start trial. Please try again.');
      }
    } finally {
      setInitiating(false);
    }
  };

  const handleCheckout = async () => {
    if (!plan) return;
    setInitiating(true);
    setError(null);

    try {
      const result = await apiClient.post<InitiateResult>('/api/v1/subscription/initiate', {
        plan_code: plan.planCode,
        return_url: `${window.location.origin}/usage?checkout=success`,
      });

      if (result.initiate_url && result.intent_id) {
        setIntentId(result.intent_id);
        setInitiateUrl(result.initiate_url);
        setPaymentOpen(true);
      } else if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        router.push('/usage?status=' + result.status);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate checkout. Please try again.');
    } finally {
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
    <>
      {paymentOpen && intentId && (
        <TreasuryPaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          paymentIntentId={intentId}
          tenantSlug={user?.tenant_slug ?? ''}
          initiateUrl={initiateUrl}
          amount={plan.basePrice}
          currency={plan.currency || 'KES'}
          referenceType="subscription"
          customerEmail={user?.email}
          allowedMethods="paystack,mpesa"
          onPaymentConfirmed={() => {
            setPaymentOpen(false);
            // Save card details from this subscription payment for auto-renewal.
            // Fire-and-forget: the user is redirected regardless; card saving is best-effort here.
            apiClient
              .post('/api/v1/subscription/payment-method/confirm', { intent_id: intentId })
              .catch(() => { /* non-fatal */ });
            setPaidIntentId(intentId);
            router.push('/billing?checkout=success&save_card=1');
          }}
          onPaymentFailed={() => {
            setPaymentOpen(false);
            setError('Payment failed. Please try again.');
          }}
        />
      )}

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

            <Card className="rounded-[2.5rem] border-border bg-card shadow-sm overflow-hidden">
              <div className="p-8 border-b border-border bg-accent/30">
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
                  {Object.entries(plan.tierLimits ?? {}).slice(0, 6).map(([key, val]) => (
                    <div className="flex items-start gap-4" key={key}>
                      <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500"><Check className="h-3 w-3" /></div>
                      <div>
                        <p className="font-bold text-sm capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {val === -1 ? 'Unlimited' : String(val)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {Object.keys(plan.tierLimits ?? {}).length === 0 && (
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-1 rounded-full bg-blue-500/10 text-blue-500"><Check className="h-3 w-3" /></div>
                      <div>
                        <p className="font-bold text-sm">Full {plan.name} Access</p>
                        <p className="text-xs text-muted-foreground mt-1">All features included in this plan.</p>
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

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <Card className="rounded-[2.5rem] border-primary/20 bg-accent/30 shadow-xl shadow-primary/5 sticky top-8">
              <CardHeader className="p-8 pb-0">
                <Badge className="w-fit mb-4 bg-primary text-white font-black text-[10px] tracking-widest px-3">
                  {hasTrial ? 'FREE TRIAL' : 'CHECKOUT'}
                </Badge>
                <h3 className="text-2xl font-black">Order Summary</h3>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4 mb-8">
                  {hasTrial ? (
                    <>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground font-medium">{plan.name} Plan</span>
                        <span className="font-bold">{plan.currency} {plan.basePrice.toLocaleString()}/mo after trial</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground font-medium">Trial period</span>
                        </div>
                        <span className="text-primary font-bold">{plan.freeTrialDays} days free</span>
                      </div>
                      <div className="border-t border-border pt-4 mt-4 flex justify-between items-end">
                        <div>
                          <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Due Today</span>
                          <p className="text-3xl font-black mt-1 text-primary">Free</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground font-medium">{plan.name} Plan</span>
                        <span className="font-bold">{plan.currency} {plan.basePrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground font-medium">Platform Fee</span>
                        <span className="text-green-500 font-bold uppercase text-xs tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">Included</span>
                      </div>
                      <div className="border-t border-border pt-4 mt-4 flex justify-between items-end">
                        <div>
                          <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Total Due Now</span>
                          <p className="text-3xl font-black mt-1">
                            {isFree ? 'Free' : `${plan.currency} ${plan.basePrice.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full h-16 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={hasTrial || isFree ? handleStartTrial : handleCheckout}
                  disabled={initiating}
                >
                  {initiating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Processing...
                    </>
                  ) : hasTrial ? (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start {plan.freeTrialDays}-Day Free Trial
                    </>
                  ) : isFree ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Activate Free Plan
                    </>
                  ) : (
                    <>
                      Confirm & Pay
                    </>
                  )}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground mt-6 font-bold uppercase tracking-widest leading-relaxed">
                  {hasTrial
                    ? `No payment required today. Cancel any time during your trial.`
                    : `By confirming, you agree to our Terms of Service.`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Background Decor */}
        <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      </div>
    </>
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
