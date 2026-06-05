'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useTenantBranding } from '@/providers/tenant-branding-provider';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Calendar, CheckCircle2, CreditCard, Download, Gift, Layers, Loader2, Package, Receipt, RefreshCw, Tag, TrendingUp, Trash2, Wallet, XCircle, Zap } from 'lucide-react';
import { useSubscriptionSettings, useUpdateSubscriptionSettings } from '@/hooks/useSubscription';
import { usePlanAddons, usePurchasePlanAddon, useRemovePlanAddon } from '@/hooks/useCustomAddons';
import type { PlanAddon } from '@/lib/api/addons';
import { PaymentMethodList } from '@/components/billing/PaymentMethodList';
import {
  setDefaultPaymentMethod,
  deletePaymentMethod,
  cancelSubscription,
  undoCancelSubscription,
} from '@/lib/api/billing';

function contrastColor(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ffffff';
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#1a1a1a' : '#ffffff';
}

interface PaymentMethod {
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  phone?: string;
  provider?: string;
  isDefault?: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'void';
  description: string;
  pdfUrl?: string;
}

interface BillingInfo {
  hasSubscription?: boolean;
  paymentMethod: PaymentMethod | null;
  paymentMethods?: PaymentMethod[];
  nextRenewalDate: string;
  nextAmount?: number;
  amount?: number;
  currency: string;
  planName?: string;
  planCode?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  invoices: Invoice[];
}

interface OverageLine {
  metric_type: string;
  units_used: number;
  plan_limit: number;
  units_over: number;
  unit_price_kes: number;
  total_kes: number;
}

interface AddonLine {
  name: string;
  service_code?: string;
  billing_cycle: string;
  unit_price_kes: number;
  quantity: number;
  total_kes: number;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount_kes: number;
  description: string;
  created_at: string;
}

interface InvoicePreview {
  base_plan_price_kes: number;
  currency: string;
  overage_charges: OverageLine[];
  overage_total_kes: number;
  custom_addons: AddonLine[];
  addons_total_kes: number;
  credits_available_kes: number;
  credits_to_apply_kes: number;
  estimated_total_kes: number;
}

interface CreditWallet {
  balance_kes: number;
  transactions: CreditTransaction[];
}

function formatMetric(m: string): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { tenant } = useTenantBranding();
  const brandColor = tenant?.primaryColor ?? '#722F5F';
  const brandTextColor = contrastColor(brandColor);
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const tenantKey = selectedTenant?.id ?? null;
  // Show a prompt when landing here after a subscription checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        toast.success('Subscription activated! Add a payment method below to enable auto-renewal.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['billing', tenantKey],
    queryFn: () => apiClient.get<BillingInfo>('/api/v1/billing'),
  });

  const { data: settings } = useSubscriptionSettings();
  const settingsMutation = useUpdateSubscriptionSettings();

  const { data: preview } = useQuery({
    queryKey: ['invoice-preview', tenantKey],
    queryFn: () => apiClient.get<InvoicePreview>('/api/v1/billing/invoice-preview'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: wallet } = useQuery({
    queryKey: ['credit-wallet', tenantKey],
    queryFn: () => apiClient.get<CreditWallet>('/api/v1/billing/credits'),
    staleTime: 5 * 60 * 1000,
  });

  const [paymentSetup, setPaymentSetup] = useState<{
    initiateUrl: string;
    intentId: string;
  } | null>(null);

  const [couponCode, setCouponCode] = useState('');

  // Self-service plan addons
  const { data: planAddonsData, isLoading: addonsLoading } = usePlanAddons();
  const purchaseAddonMutation = usePurchasePlanAddon();
  const removeAddonMutation = useRemovePlanAddon();
  const planAddons: PlanAddon[] = planAddonsData?.addons ?? [];
  const [addonPayment, setAddonPayment] = useState<{ initiateUrl: string; intentId: string; amount: number; featureCode: string } | null>(null);

  function addonLabel(code: string): string {
    return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const billingEmail = settings?.billingEmail || user?.email || '';

  const setupMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ initiate_url: string; payment_intent_id: string }>(
        '/api/v1/subscription/payment-method/setup',
        billingEmail ? { billing_email: billingEmail } : {},
      ),
    onSuccess: (res) =>
      setPaymentSetup({ initiateUrl: res.initiate_url, intentId: res.payment_intent_id }),
    onError: () => toast.error('Failed to initiate payment method setup'),
  });

  const confirmCardMutation = useMutation({
    mutationFn: (intentId: string) =>
      apiClient.post<{ status: string; payment_method?: object }>(
        '/api/v1/subscription/payment-method/confirm',
        { intent_id: intentId },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ message: string; credits_earned: number; new_balance_kes: number }>(
        '/api/v1/subscription/coupon/redeem',
        { code },
      ),
    onSuccess: (res) => {
      toast.success(`${res.message} — KES ${res.credits_earned.toLocaleString()} added to your credit wallet`);
      setCouponCode('');
      queryClient.invalidateQueries({ queryKey: ['credit-wallet', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['invoice-preview', tenantKey] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? err?.message ?? 'Invalid or expired coupon code'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (last4: string) => setDefaultPaymentMethod(last4),
    onSuccess: () => {
      toast.success('Default payment method updated');
      queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to update default payment method'),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (last4: string) => deletePaymentMethod(last4),
    onSuccess: () => {
      toast.success('Payment method removed');
      queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to remove payment method'),
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success('Cancellation scheduled — your subscription remains active until the current period ends');
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to cancel subscription'),
  });

  const undoCancelMutation = useMutation({
    mutationFn: undoCancelSubscription,
    onSuccess: () => {
      toast.success('Cancellation reversed — auto-renewal restored');
      queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to reverse cancellation'),
  });

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const formatKes = (amount?: number) =>
    amount != null ? `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—';

  const formatCurrency = (amount?: number, currency = 'KES') =>
    amount != null
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)
      : '—';

  const invoiceStatusVariant = (s: string) => {
    switch (s) {
      case 'paid': return 'success' as const;
      case 'pending': return 'warning' as const;
      case 'failed': return 'error' as const;
      default: return 'outline' as const;
    }
  };

  const txTypeLabel = (t: string) =>
    ({ earned: 'Earned', coupon_redeemed: 'Coupon', gifted: 'Gift', auto_applied: 'Applied', expired: 'Expired', manual_adjusted: 'Adjusted' }[t] ?? t);

  return (
    <>
    {addonPayment && (
      <TreasuryPaymentModal
        open={!!addonPayment}
        onOpenChange={(open) => { if (!open) setAddonPayment(null); }}
        paymentIntentId={addonPayment.intentId}
        tenantSlug={selectedTenant?.slug ?? user?.tenant_slug ?? ''}
        initiateUrl={addonPayment.initiateUrl}
        amount={addonPayment.amount}
        currency="KES"
        referenceType="addon_purchase"
        customerEmail={billingEmail || user?.email}
        allowedMethods="paystack,mpesa"
        onPaymentConfirmed={() => {
          setAddonPayment(null);
          queryClient.invalidateQueries({ queryKey: ['plan-addons', tenantKey] });
          queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
          toast.success('Add-on activated successfully');
        }}
        onPaymentFailed={() => {
          setAddonPayment(null);
          toast.error('Add-on payment failed. Please try again.');
        }}
      />
    )}
    {paymentSetup && (
      <TreasuryPaymentModal
        open={!!paymentSetup}
        onOpenChange={(open) => { if (!open) setPaymentSetup(null); }}
        paymentIntentId={paymentSetup.intentId}
        tenantSlug={selectedTenant?.slug ?? user?.tenant_slug ?? ''}
        initiateUrl={paymentSetup.initiateUrl}
        amount={5}
        currency="KES"
        referenceType="card_setup"
        customerEmail={billingEmail || user?.email}
        allowedMethods="paystack,mpesa"
        onPaymentConfirmed={() => {
          const intentId = paymentSetup.intentId;
          setPaymentSetup(null);
          toast.success('Payment processed — saving your card details…');
          confirmCardMutation.mutate(intentId, {
            onSuccess: () => toast.success('Payment method saved successfully'),
            onError: () => {
              // Fallback: invalidate billing query so NATS pipeline result is visible on refresh
              queryClient.invalidateQueries({ queryKey: ['billing', tenantKey] });
              toast.success('Payment method saved — refresh if it does not appear immediately');
            },
          });
        }}
        onPaymentFailed={() => {
          setPaymentSetup(null);
          toast.error('Card setup failed. Please try again.');
        }}
      />
    )}
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage payment methods, view invoices, and track renewals.
          {data?.planName && (
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {data.planName}
            </span>
          )}
        </p>
      </div>

      {/* Dunning / payment-failure banner */}
      {data?.status === 'SUSPENDED' && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Payment failed — your subscription is suspended</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-renewal failed. Update your payment method to reactivate your subscription.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto shrink-0"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            Update Card
          </Button>
        </div>
      )}

      {/* Payment Methods — full-width card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Payment Methods</h2>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-4">
              <div className="h-44 w-72 bg-muted rounded-2xl animate-pulse" />
              <div className="h-44 w-44 bg-muted/40 rounded-2xl animate-pulse" />
            </div>
          ) : (
            <PaymentMethodList
              methods={(data?.paymentMethods ?? (data?.paymentMethod ? [data.paymentMethod] : [])) as any}
              status={data?.status}
              cancelAtPeriodEnd={data?.cancelAtPeriodEnd}
              onAddMethod={() => setupMutation.mutate()}
              onSetDefault={(last4) => setDefaultMutation.mutate(last4)}
              onRemove={(last4) => deleteMethodMutation.mutate(last4)}
              isPendingDefault={setDefaultMutation.isPending}
              isPendingRemove={deleteMethodMutation.isPending}
              isSetupPending={setupMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Cancellation banner / action */}
      {data?.hasSubscription && (
        <Card className="border-destructive/20">
          <CardContent className="pt-4">
            {data.cancelAtPeriodEnd ? (
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Subscription cancellation scheduled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your subscription will remain active until{' '}
                    <span className="font-medium">{data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : 'the end of your billing period'}</span>.
                    No charge will be made after that date.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => undoCancelMutation.mutate()}
                  disabled={undoCancelMutation.isPending}
                  className="shrink-0"
                >
                  {undoCancelMutation.isPending ? 'Restoring…' : 'Undo Cancellation'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Need to cancel? Your subscription stays active until your current period ends —{' '}
                    {data.currentPeriodEnd
                      ? new Date(data.currentPeriodEnd).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'no immediate interruption'}.
                  </p>
                </div>
                {!showCancelConfirm ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive font-medium">Confirm cancellation?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? 'Cancelling…' : 'Yes, Cancel'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowCancelConfirm(false)}>
                      Keep Plan
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Auto-Renew Status */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Auto-Renewal</h2>
              </div>
              {(() => {
                const pm = data?.paymentMethod;
                const supportsAutoCharge = pm?.type === 'card' || pm?.type === 'mobile_money';
                const autoRenew = settings?.autoRenew ?? true;
                return (
                  <button
                    role="switch"
                    aria-checked={autoRenew && supportsAutoCharge}
                    onClick={() => {
                      if (!supportsAutoCharge) return; // non-recurring method — can't enable
                      settingsMutation.mutate({ autoRenew: !autoRenew });
                    }}
                    disabled={settingsMutation.isPending || !supportsAutoCharge}
                    title={!supportsAutoCharge && pm ? 'Card or mobile money required for auto-renewal' : undefined}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                      autoRenew && supportsAutoCharge ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        autoRenew && supportsAutoCharge ? 'translate-x-[18px]' : 'translate-x-1'
                      }`}
                    />
                  </button>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const pm = data?.paymentMethod;
              const supportsAutoCharge = pm?.type === 'card' || pm?.type === 'mobile_money';
              const autoRenew = settings?.autoRenew ?? true;

              if (!pm) {
                return (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>No card on file. Add a payment method to enable auto-renewal.</p>
                  </div>
                );
              }
              if (!supportsAutoCharge) {
                return (
                  <div className="flex items-start gap-2 text-sm text-amber-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Auto-renewal requires a card or mobile money payment method.{' '}
                      <span className="capitalize">{pm.type}</span> payments cannot be charged automatically.
                    </p>
                  </div>
                );
              }
              if (autoRenew) {
                return (
                  <div className="flex items-start gap-2 text-sm text-green-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Card ending in <strong>{pm.last4}</strong> will be charged on{' '}
                      {formatDate(data?.nextRenewalDate)}.
                    </p>
                  </div>
                );
              }
              return (
                <p className="text-sm text-muted-foreground">
                  Auto-renewal is off. Your subscription will expire at period end.
                </p>
              );
            })()}
          </CardContent>
        </Card>

        {/* Next Invoice Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Next Invoice</h2>
            </div>
          </CardHeader>
          <CardContent>
            {!preview ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-44 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold">{formatKes(preview.estimated_total_kes)}</p>
                <p className="text-xs text-muted-foreground">
                  Due on {formatDate(data?.nextRenewalDate)}
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground border-t pt-3">
                  <div className="flex justify-between">
                    <span>Base plan</span>
                    <span>{formatKes(preview.base_plan_price_kes)}</span>
                  </div>
                  {preview.overage_total_kes > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Overages</span>
                      <span>+{formatKes(preview.overage_total_kes)}</span>
                    </div>
                  )}
                  {preview.addons_total_kes > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons</span>
                      <span>+{formatKes(preview.addons_total_kes)}</span>
                    </div>
                  )}
                  {preview.credits_to_apply_kes > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Credits applied</span>
                      <span>−{formatKes(preview.credits_to_apply_kes)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overage Charges */}
      {preview && preview.overage_charges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold">Current Period Overages</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Over</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.overage_charges.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{formatMetric(o.metric_type)}</TableCell>
                    <TableCell className="text-right">{o.units_used.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{o.plan_limit.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-amber-600 font-semibold">+{o.units_over.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatKes(o.unit_price_kes)}/unit</TableCell>
                    <TableCell className="text-right font-semibold">{formatKes(o.total_kes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Custom Add-ons */}
      {preview && preview.custom_addons.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Active Add-ons</h2>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Add-on</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.custom_addons.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{a.service_code ?? 'Platform'}</TableCell>
                    <TableCell className="text-right">{a.quantity}</TableCell>
                    <TableCell className="text-right">{formatKes(a.unit_price_kes)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatKes(a.total_kes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Self-Service Plan Add-ons Marketplace */}
      {(planAddons.length > 0 || addonsLoading) && (
        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Available Add-ons</h2>
              </div>
              <span className="text-xs text-muted-foreground">Expand your current plan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Add-ons are charged immediately when purchased. Free add-ons activate instantly.
            </p>
          </CardHeader>
          <CardContent>
            {addonsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading available add-ons…</span>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {planAddons.map((addon) => (
                  <div
                    key={addon.feature_code}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      addon.purchased
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${addon.purchased ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{addonLabel(addon.feature_code)}</p>
                        {addon.limit_value != null && addon.limit_value > 0 && (
                          <p className="text-xs text-muted-foreground">{addon.limit_value.toLocaleString()} units included</p>
                        )}
                        <p className="text-xs font-semibold text-primary mt-0.5">
                          {addon.overage_unit_price === 0 ? 'Free' : `KES ${addon.overage_unit_price.toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      {addon.purchased ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeAddonMutation.mutate(addon.feature_code)}
                          disabled={removeAddonMutation.isPending}
                        >
                          {removeAddonMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={async () => {
                            const result = await purchaseAddonMutation.mutateAsync({
                              featureCode: addon.feature_code,
                              returnUrl: `${window.location.origin}/billing?addon_success=${addon.feature_code}`,
                            });
                            if (result.status === 'payment_required' && result.intent) {
                              const intent = result.intent as Record<string, any>;
                              setAddonPayment({
                                intentId: intent.intent_id ?? intent.id ?? '',
                                initiateUrl: intent.initiate_url ?? '',
                                amount: addon.overage_unit_price,
                                featureCode: addon.feature_code,
                              });
                            }
                          }}
                          disabled={purchaseAddonMutation.isPending}
                        >
                          {purchaseAddonMutation.isPending
                            ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            : <Zap className="h-3 w-3 mr-1" />}
                          {addon.overage_unit_price === 0 ? 'Activate' : 'Purchase'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Wallet + Coupon Redeem */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold">Credit Wallet</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-1">
              {formatKes(wallet?.balance_kes ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mb-4">Applied automatically at renewal</p>
            {wallet?.transactions && wallet.transactions.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {wallet.transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span className="text-muted-foreground">{txTypeLabel(tx.type)}</span>
                    <span className={tx.amount_kes < 0 ? 'text-red-500' : 'text-green-600 font-medium'}>
                      {tx.amount_kes < 0 ? '−' : '+'}{formatKes(Math.abs(tx.amount_kes))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Redeem Coupon</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Enter a coupon code to add credits to your wallet. Credits are applied at your next renewal.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME20"
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button
                onClick={() => redeemMutation.mutate(couponCode)}
                disabled={!couponCode.trim() || redeemMutation.isPending}
                style={{ backgroundColor: brandColor, color: brandTextColor }}
                className="font-semibold"
              >
                {redeemMutation.isPending ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Invoice History</h2>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data?.invoices?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">{" "}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{formatDate(inv.date)}</TableCell>
                    <TableCell>{inv.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No invoices yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
