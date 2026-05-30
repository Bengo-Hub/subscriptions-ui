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
import { TreasuryPaymentModal } from '@bengo-hub/shared-ui-lib';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, CreditCard, Download, Gift, Receipt, Tag, TrendingUp, Wallet } from 'lucide-react';

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
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
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
  nextRenewalDate: string;
  nextAmount?: number;
  amount?: number;
  currency: string;
  planName?: string;
  planCode?: string;
  status?: string;
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

  const { data, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn: () => apiClient.get<BillingInfo>('/api/v1/billing'),
  });

  const { data: preview } = useQuery({
    queryKey: ['invoice-preview'],
    queryFn: () => apiClient.get<InvoicePreview>('/api/v1/billing/invoice-preview'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: wallet } = useQuery({
    queryKey: ['credit-wallet'],
    queryFn: () => apiClient.get<CreditWallet>('/api/v1/billing/credits'),
    staleTime: 5 * 60 * 1000,
  });

  const [paymentSetup, setPaymentSetup] = useState<{
    initiateUrl: string;
    intentId: string;
  } | null>(null);

  const [couponCode, setCouponCode] = useState('');

  const setupMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ initiate_url: string; payment_intent_id: string }>(
        '/api/v1/subscription/payment-method/setup',
        {},
      ),
    onSuccess: (res) =>
      setPaymentSetup({ initiateUrl: res.initiate_url, intentId: res.payment_intent_id }),
    onError: () => toast.error('Failed to initiate payment method setup'),
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
      queryClient.invalidateQueries({ queryKey: ['credit-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-preview'] });
    },
    onError: (err: any) => toast.error(err?.message ?? 'Invalid or expired coupon code'),
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
    {paymentSetup && (
      <TreasuryPaymentModal
        open={!!paymentSetup}
        onOpenChange={(open) => { if (!open) setPaymentSetup(null); }}
        paymentIntentId={paymentSetup.intentId}
        tenantSlug={user?.tenant_slug ?? ''}
        initiateUrl={paymentSetup.initiateUrl}
        amount={0}
        currency="KES"
        referenceType="card_setup"
        customerEmail={user?.email}
        onPaymentConfirmed={() => {
          setPaymentSetup(null);
          queryClient.invalidateQueries({ queryKey: ['billing'] });
          toast.success('Payment method saved successfully');
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

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Payment Method</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                <div className="h-4 w-28 bg-muted rounded animate-pulse" />
              </div>
            ) : data?.paymentMethod ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center text-xs font-bold uppercase">
                    {data.paymentMethod.brand}
                  </div>
                  <div>
                    <p className="font-medium text-sm">&bull;&bull;&bull;&bull; {data.paymentMethod.last4}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {data.paymentMethod.expiryMonth}/{data.paymentMethod.expiryYear}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                  style={{ borderColor: brandColor, color: brandColor }}
                >
                  {setupMutation.isPending ? 'Starting…' : 'Update Card'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">No payment method on file</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a card to enable subscription auto-renewal.
                    A KES 1 verification charge will be refunded instantly.
                  </p>
                </div>
                <Button
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                  className="w-full font-semibold shadow-sm"
                  style={{ backgroundColor: brandColor, color: brandTextColor }}
                >
                  {setupMutation.isPending ? 'Setting up…' : '+ Add Payment Method'}
                </Button>
              </div>
            )}
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
