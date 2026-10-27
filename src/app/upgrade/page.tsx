'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useScheduleUpgrade, useStartUpgradeTrial, useUpgradeTrial } from '@/hooks/useUpgradeTrial';
import { useAuthStore } from '@/store/auth';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { legalUrls } from '@bengo-hub/shared-ui-lib/legal';
import { ArrowLeft, ArrowRight, CalendarClock, Check, CreditCard, Loader2, Sparkles, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { ScheduledChangeInfo, UpgradeTrialInfo } from '@/lib/api/upgradeTrial';

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
  plan_code: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  upgrade_trial?: UpgradeTrialInfo;
  scheduled_change?: ScheduledChangeInfo;
}

interface InitiateResult {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  initiate_url?: string;
  authorization_url?: string;
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

// "max_users" -> "Max users"; limit keys differ per product, so the label is derived.
function limitLabel(key: string): string {
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function limitValue(v: unknown): string {
  if (v === -1) return 'Unlimited';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v ?? '');
}

/**
 * Upgrade to a higher tier. With paid time left the upgrade starts on the next renewal date and
 * that renewal is billed at the new price; a free trial, when offered, gives the new tier now.
 * Only a subscription with no paid time left pays and switches today.
 */
function UpgradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planCode = searchParams.get('plan');
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const redirectToSSO = useAuthStore((s) => s.redirectToSSO);

  const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [intentId, setIntentId] = useState('');
  const [initiateUrl, setInitiateUrl] = useState('');
  const [payAmount, setPayAmount] = useState(0);

  const trialStatus = useUpgradeTrial(status === 'authenticated' ? planCode : null);
  const startTrial = useStartUpgradeTrial();
  const scheduleUpgrade = useScheduleUpgrade();

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
        // Plan responses are wrapped: { plan: {...} }; unwrap with fallback.
        const unwrap = (r: any): Plan => r?.plan ?? r;
        const [targetResp, sub] = await Promise.all([
          apiClient.get<{ plan: Plan } | Plan>(`/api/v1/plans/code/${planCode}`),
          apiClient.get<CurrentSubscription>('/api/v1/subscription').catch(() => null),
        ]);
        // During a trial plan_code is the trial plan; the plan being paid for is the base plan.
        const paidCode = sub?.upgrade_trial?.base_plan_code ?? sub?.plan_code;
        const current = paidCode
          ? unwrap(await apiClient.get<{ plan: Plan } | Plan>(`/api/v1/plans/code/${paidCode}`))
          : null;
        setTargetPlan(unwrap(targetResp));
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

  const payNow = async () => {
    if (!targetPlan) return;
    setInitiating(true);
    setError(null);
    try {
      const result = await apiClient.post<InitiateResult>('/api/v1/subscription/initiate', {
        plan_code: targetPlan.planCode,
        return_url: `${window.location.origin}/billing?checkout=success`,
      });
      if (result.initiate_url && result.intent_id) {
        setIntentId(result.intent_id);
        setInitiateUrl(result.initiate_url);
        setPayAmount(Number(result.amount) || targetPlan.basePrice);
        setPaymentOpen(true);
      } else if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        router.push('/billing');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start the payment. Please try again.');
    } finally {
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

  if (!targetPlan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
          <Zap className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 max-w-md">{error ?? 'Plan not found.'}</p>
        <Link href="/plans" className="mt-8">
          <Button variant="outline" className="rounded-xl px-8 h-12 font-bold">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
          </Button>
        </Link>
      </div>
    );
  }

  const renewalDate = currentSub?.current_period_end;
  // Paid time left: the upgrade waits for the renewal. None (no plan, expired, past due): pay now.
  const hasPaidTime = !!currentSub && !!renewalDate && new Date(renewalDate).getTime() > Date.now() &&
    ['ACTIVE', 'TRIAL'].includes(currentSub.status);
  const eligibility = trialStatus.data?.eligibility;
  const trialHere = currentSub?.upgrade_trial?.plan_code === targetPlan.planCode ? currentSub.upgrade_trial : undefined;
  const scheduledHere = currentSub?.scheduled_change?.plan_code === targetPlan.planCode ? currentSub.scheduled_change : undefined;
  const busy = initiating || startTrial.isPending || scheduleUpgrade.isPending;

  const limitRows = Object.entries(targetPlan.tierLimits ?? {})
    .filter(([k, v]) => typeof v === 'number' && currentPlan?.tierLimits?.[k] !== v)
    .slice(0, 8);

  return (
    <>
      {paymentOpen && intentId && (
        <TreasuryPaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          paymentIntentId={intentId}
          tenantSlug={user?.tenant_slug ?? ''}
          initiateUrl={initiateUrl}
          amount={payAmount}
          currency={targetPlan.currency || 'KES'}
          referenceType="subscription"
          customerEmail={user?.email}
          allowedMethods="paystack,mpesa"
          onPaymentConfirmed={() => {
            setPaymentOpen(false);
            router.push('/billing?checkout=success');
          }}
          onPaymentFailed={() => {
            setPaymentOpen(false);
            setError('Payment failed. Please try again.');
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-3 space-y-8">
            <div>
              <Link href="/plans" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Plans
              </Link>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-black uppercase tracking-widest mb-4">
                <TrendingUp className="h-3.5 w-3.5" /> Plan Upgrade
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
                Upgrade to <span className="text-primary">{targetPlan.name}</span>
              </h1>
              <p className="text-lg text-muted-foreground">{targetPlan.description || 'More capacity and features for your business.'}</p>
            </div>

            <Card className="rounded-[2rem] border-border overflow-hidden shadow-sm">
              <div className="p-6 sm:p-8 border-b border-border bg-accent/30">
                <h3 className="text-lg font-black mb-2">Plan change</h3>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 text-center p-4 rounded-2xl bg-accent">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">From</p>
                    <p className="text-lg sm:text-xl font-black">{currentPlan?.name ?? 'No plan'}</p>
                    {currentPlan && (
                      <p className="text-sm text-muted-foreground font-bold mt-1">
                        {currentPlan.currency} {currentPlan.basePrice.toLocaleString()} / mo
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-6 w-6 text-primary shrink-0" />
                  <div className="flex-1 text-center p-4 rounded-2xl bg-primary/10 border border-primary/20">
                    <p className="text-xs font-black uppercase tracking-widest text-primary mb-1">To</p>
                    <p className="text-lg sm:text-xl font-black text-primary">{targetPlan.name}</p>
                    <p className="text-sm font-bold mt-1">
                      {targetPlan.currency} {targetPlan.basePrice.toLocaleString()} / mo
                    </p>
                  </div>
                </div>
              </div>
              {limitRows.length > 0 && (
                <CardContent className="p-6 sm:p-8 space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">What changes</h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {limitRows.map(([key, value]) => (
                      <div key={key} className="flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-full bg-green-500/10 text-green-500">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{limitLabel(key)}: {limitValue(value)}</p>
                          {currentPlan && (
                            <p className="text-xs text-muted-foreground">Now {limitValue(currentPlan.tierLimits?.[key] ?? 0)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            <div className="flex items-center gap-2 p-4 rounded-2xl bg-accent/50 border border-border text-xs text-muted-foreground font-medium">
              <CreditCard className="h-4 w-4 shrink-0" /> Bills are paid through Codevertex Treasury by M-Pesa or card.
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="rounded-[2rem] border-primary/20 bg-accent/30 shadow-xl shadow-primary/5 lg:sticky lg:top-8">
              <CardHeader className="p-6 sm:p-8 pb-0">
                <Badge className="w-fit mb-4 bg-green-500 text-white font-black text-[10px] tracking-widest px-3">UPGRADE</Badge>
                <h3 className="text-2xl font-black">How it works</h3>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 space-y-5">
                {trialHere ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    <p className="font-bold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Trial running</p>
                    <p className="text-muted-foreground mt-1">
                      You have {targetPlan.name} free until {formatDate(trialHere.ends_at)}.
                      {scheduledHere ? ` It becomes your plan from your renewal on ${formatDate(scheduledHere.effective_at)}.` : ''}
                    </p>
                  </div>
                ) : scheduledHere ? (
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="font-bold text-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Already scheduled</p>
                    <p className="text-muted-foreground mt-1">
                      Your plan moves to {targetPlan.name} on {formatDate(scheduledHere.effective_at)}. Manage it from your billing page.
                    </p>
                  </div>
                ) : hasPaidTime ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Due today</span><span className="font-bold">Nothing</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Upgrade starts</span><span className="font-bold">{formatDate(renewalDate)}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Then billed</span><span className="font-bold">{targetPlan.currency} {targetPlan.basePrice.toLocaleString()} / mo</span></div>
                    </div>

                    {eligibility?.eligible && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <p className="text-sm font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Try it free for {eligibility.days} days</p>
                        <p className="text-xs text-muted-foreground">
                          Use {targetPlan.name} now until {formatDate(eligibility.ends_at)}. From your renewal on {formatDate(eligibility.upgrade_at)} it becomes your plan.
                          End the trial any time before then to stay on {currentPlan?.name ?? 'your plan'}.
                        </p>
                        <Button
                          variant="primary"
                          className="w-full h-12 rounded-xl font-black"
                          disabled={busy}
                          onClick={() => startTrial.mutate(targetPlan.planCode, { onSuccess: () => router.push('/billing') })}
                        >
                          {startTrial.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                          Start free trial
                        </Button>
                      </div>
                    )}

                    <Button
                      variant={eligibility?.eligible ? 'outline' : 'primary'}
                      className="w-full h-14 rounded-2xl font-black text-base"
                      disabled={busy}
                      onClick={() => scheduleUpgrade.mutate(targetPlan.planCode, { onSuccess: () => router.push('/billing') })}
                    >
                      {scheduleUpgrade.isPending ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <TrendingUp className="h-5 w-5 mr-2" />}
                      Upgrade from {formatDate(renewalDate)}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-end border-t border-border pt-4">
                      <span className="text-xs text-muted-foreground font-black uppercase tracking-widest">Due today</span>
                      <p className="text-3xl font-black">{targetPlan.currency} {targetPlan.basePrice.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">You have no paid time left, so {targetPlan.name} starts as soon as payment is received.</p>
                    <Button variant="primary" className="w-full h-14 rounded-2xl font-black text-base" disabled={busy} onClick={payNow}>
                      {initiating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <TrendingUp className="h-5 w-5 mr-2" />}
                      Pay and upgrade
                    </Button>
                  </>
                )}

                {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">{error}</div>}

                <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                  By continuing, you agree to our <br />
                  <a href={legalUrls().terms} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a> and{' '}
                  <a href={legalUrls().privacy} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
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
