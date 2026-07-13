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
  basePrice: number; // per MONTH
  setupFee: number; // one-time setup/installation fee (0 = none)
  currency: string;
  billingCycle: string;
  freeTrialDays: number;
  tierLimits: Record<string, any>;
}

// Billing periods offered on every recurring plan. Price = months × monthly base price
// (no automatic discount); periods of WAIVER_MONTHS+ months waive the one-time setup fee.
const WAIVER_MONTHS = 6;
const BILLING_PERIODS = [
  { cycle: 'MONTHLY', months: 1, label: 'Monthly' },
  { cycle: 'SEMI_ANNUAL', months: 6, label: '6 Months' },
  { cycle: 'ANNUAL', months: 12, label: '12 Months' },
] as const;
type BillingCycle = (typeof BILLING_PERIODS)[number]['cycle'];

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
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [intentId, setIntentId] = useState('');
  const [initiateUrl, setInitiateUrl] = useState('');
  const [initiating, setInitiating] = useState(false);
  const [paidIntentId, setPaidIntentId] = useState<string | null>(null);

  // Subscription Terms & Conditions — must be accepted before subscribing.
  const [termsVersion, setTermsVersion] = useState('');
  const [termsContent, setTermsContent] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

    async function fetchTerms() {
      try {
        const t = await apiClient.get<{ version: string; content: string }>('/api/v1/terms');
        setTermsVersion(t.version);
        setTermsContent(t.content);
      } catch {
        // Non-fatal: if terms can't load, the version stays empty and the gate stays closed.
      }
    }

    if (status === 'authenticated') {
      fetchPlan();
      fetchTerms();
    }
  }, [planCode, status, router, redirectToSSO]);

  const hasTrial = (plan?.freeTrialDays ?? 0) > 0;
  const isFree = (plan?.basePrice ?? 0) === 0;

  // The plan's billing_cycle (from the DB) is the single source of truth for HOW it is charged.
  // A ONE_TIME (perpetual-licence) plan is billed once at its full base_price — no recurring
  // period selector and no ×months multiplier. Every other cycle is a recurring plan priced per
  // month across the tenant-chosen period. Nothing here assumes a plan is recurring.
  const isOneTime = (plan?.billingCycle ?? '').toUpperCase() === 'ONE_TIME';

  // Billing-period derived pricing (recurring only): price = months × monthly base (no discount);
  // the setup fee is WAIVED when paying for 6+ months up front. For a one-time plan there is no
  // period (months = 1, no waiver) and the cycle sent to the backend is the plan's own ONE_TIME.
  const period = BILLING_PERIODS.find((p) => p.cycle === cycle) ?? BILLING_PERIODS[0];
  const periodMonths = isOneTime ? 1 : period.months;
  const periodLabel = isOneTime ? 'One-time payment' : period.label;
  const effectiveCycle = isOneTime ? 'ONE_TIME' : cycle;
  const setupFee = plan?.setupFee ?? 0;
  const setupFeeWaived = !isOneTime && setupFee > 0 && period.months >= WAIVER_MONTHS;
  const planSubtotal = (plan?.basePrice ?? 0) * periodMonths;
  const totalDueNow = planSubtotal + (setupFee > 0 && !setupFeeWaived ? setupFee : 0);

  // Start a free trial or free plan directly via POST /subscription
  const handleStartTrial = async () => {
    if (!plan) return;
    if (!termsAccepted || !termsVersion) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setInitiating(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/subscription', {
        plan_code: plan.planCode,
        billing_cycle: effectiveCycle,
        terms_version: termsVersion,
        terms_accepted: true,
      });
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
    if (!termsAccepted || !termsVersion) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setInitiating(true);
    setError(null);

    try {
      const result = await apiClient.post<InitiateResult>('/api/v1/subscription/initiate', {
        plan_code: plan.planCode,
        billing_cycle: effectiveCycle,
        return_url: `${window.location.origin}/usage?checkout=success`,
        terms_version: termsVersion,
        terms_accepted: true,
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
          amount={totalDueNow}
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
                {/* Billing period selector — Monthly / 6 Months / 12 Months. Recurring plans only;
                    a ONE_TIME (perpetual-licence) plan is a single up-front charge, so no period. */}
                {!isFree && !isOneTime && (
                  <div className="mb-6">
                    <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Billing Period</span>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {BILLING_PERIODS.map((p) => {
                        const selected = p.cycle === cycle;
                        const waives = setupFee > 0 && p.months >= WAIVER_MONTHS;
                        return (
                          <button
                            key={p.cycle}
                            type="button"
                            onClick={() => setCycle(p.cycle)}
                            className={`relative rounded-2xl border p-3 text-center transition-all ${
                              selected
                                ? 'border-primary bg-primary/10 shadow-sm'
                                : 'border-border bg-background hover:border-primary/40'
                            }`}
                          >
                            <span className="block text-sm font-black">{p.label}</span>
                            <span className="block text-[11px] text-muted-foreground font-medium mt-0.5">
                              {plan.currency} {(plan.basePrice * p.months).toLocaleString()}
                            </span>
                            {waives && (
                              <span className="mt-1 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-green-600">
                                Setup fee waived
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* One-time (perpetual licence) — single up-front payment, billed once, never renews. */}
                {!isFree && isOneTime && (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-foreground">
                    <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>
                      This is a <strong>one-time perpetual licence</strong> — pay{' '}
                      <strong>{plan.currency} {(plan.basePrice ?? 0).toLocaleString()}</strong> once and own it. No
                      monthly or recurring charges.
                    </span>
                  </div>
                )}

                {/* Setup-fee waiver banner — recurring plans only (the waiver is earned by paying 6+
                    months up front, a concept that does not apply to a one-time licence). */}
                {!isFree && !isOneTime && setupFee > 0 && (
                  <div
                    className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
                      setupFeeWaived
                        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'border-primary/30 bg-primary/5 text-foreground'
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 mt-0.5 shrink-0 ${setupFeeWaived ? 'text-green-600' : 'text-primary'}`} />
                    {setupFeeWaived ? (
                      <span>
                        Your one-time setup fee of <strong>{plan.currency} {setupFee.toLocaleString()}</strong> is{' '}
                        <strong>waived</strong> because you're paying for {period.months} months up front.
                      </span>
                    ) : (
                      <span>
                        Pay for <strong>6 months or more</strong> and your one-time setup fee of{' '}
                        <strong>{plan.currency} {setupFee.toLocaleString()}</strong> will be <strong>waived</strong>.
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-4 mb-8">
                  {hasTrial ? (
                    <>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground font-medium">{plan.name} Plan ({periodLabel})</span>
                        <span className="font-bold">{plan.currency} {planSubtotal.toLocaleString()} after trial</span>
                      </div>
                      {setupFee > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground font-medium">One-time setup fee</span>
                          {setupFeeWaived ? (
                            <span className="font-bold">
                              <span className="line-through text-muted-foreground mr-2">{plan.currency} {setupFee.toLocaleString()}</span>
                              <span className="text-green-600 uppercase text-xs tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">Waived</span>
                            </span>
                          ) : (
                            <span className="font-bold">{plan.currency} {setupFee.toLocaleString()} after trial</span>
                          )}
                        </div>
                      )}
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
                        <span className="text-muted-foreground font-medium">{plan.name} Plan ({periodLabel})</span>
                        <span className="font-bold">{plan.currency} {planSubtotal.toLocaleString()}</span>
                      </div>
                      {setupFee > 0 && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-muted-foreground font-medium">One-time setup fee</span>
                          {setupFeeWaived ? (
                            <span className="font-bold">
                              <span className="line-through text-muted-foreground mr-2">{plan.currency} {setupFee.toLocaleString()}</span>
                              <span className="text-green-600 uppercase text-xs tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">Waived</span>
                            </span>
                          ) : (
                            <span className="font-bold">{plan.currency} {setupFee.toLocaleString()}</span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-muted-foreground font-medium">Platform Fee</span>
                        <span className="text-green-500 font-bold uppercase text-xs tracking-widest bg-green-500/10 px-2 py-1 rounded-lg">Included</span>
                      </div>
                      <div className="border-t border-border pt-4 mt-4 flex justify-between items-end">
                        <div>
                          <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Total Due Now</span>
                          <p className="text-3xl font-black mt-1">
                            {isFree ? 'Free' : `${plan.currency} ${totalDueNow.toLocaleString()}`}
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

                {/* Terms & Conditions acceptance — required before subscribing */}
                <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      I have read and accept the{' '}
                      <button
                        type="button"
                        className="text-primary font-semibold underline underline-offset-2"
                        onClick={() => setShowTerms((v) => !v)}
                      >
                        Terms &amp; Conditions
                      </button>
                      {termsVersion ? ` (v${termsVersion})` : ''}.
                    </span>
                  </label>
                  {showTerms && (
                    <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                      {termsContent || 'Loading terms…'}
                    </pre>
                  )}
                </div>

                <Button
                  className="w-full h-16 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={hasTrial || isFree ? handleStartTrial : handleCheckout}
                  disabled={initiating || !termsAccepted || !termsVersion}
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
