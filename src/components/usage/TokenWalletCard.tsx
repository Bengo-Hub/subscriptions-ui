'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui/base';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useTenantFilterStore } from '@/store/tenant-filter';
import { TreasuryPaymentModal, formatCurrency } from '@bengo-hub/shared-ui-lib';
import { toast } from 'sonner';
import { AlertTriangle, Coins, Zap } from 'lucide-react';
import {
  DEFAULT_TOKEN_SERVICE_TAG,
  estimateTokenUsage,
  getTokenBalance,
  getTokenTransactions,
  initiateTokenTopUp,
} from '@/lib/api/tokens';

const ACTION_LABEL: Record<string, string> = {
  grant: 'Plan grant',
  topup: 'Top-up',
  deduction: 'API call',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

/**
 * Token wallet card for the external eTIMS API's prepaid token bucket. Shows the current
 * balance, a low-balance warning, recent ledger activity, a top-up flow, and a small
 * capacity-planning calculator. Only renders anything once a tenant context is resolved
 * (this product is tenant-scoped; a platform-wide "all tenants" view has no single wallet).
 */
export function TokenWalletCard() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const selectedTenant = useTenantFilterStore((s) => s.selectedTenant);
  const tenantId = selectedTenant?.id ?? user?.tenant_id ?? null;
  const tenantSlug = selectedTenant?.slug ?? user?.tenant_slug ?? '';

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amountKes, setAmountKes] = useState('2000');
  const [payment, setPayment] = useState<{ intentId: string; initiateUrl: string; amount: number } | null>(null);

  const [estimateOpen, setEstimateOpen] = useState(false);
  const [avgSalesPerDay, setAvgSalesPerDay] = useState('50');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['token-wallet', tenantId],
    queryFn: () => getTokenBalance(tenantId as string),
    enabled: !!tenantId,
  });

  const { data: txns } = useQuery({
    queryKey: ['token-transactions', tenantId],
    queryFn: () => getTokenTransactions(tenantId as string, DEFAULT_TOKEN_SERVICE_TAG, 8, 0),
    enabled: !!tenantId,
  });

  const { data: estimate, mutate: runEstimate, isPending: estimating } = useMutation({
    mutationFn: (avgPerDay: number) => estimateTokenUsage({ avgSalesPerDay: avgPerDay, daysPerMonth: 30 }),
  });

  const topUpMutation = useMutation({
    mutationFn: (amount: number) =>
      initiateTokenTopUp(tenantId as string, amount, `${window.location.origin}/usage?topup=success`),
    onSuccess: (res: any) => {
      const intentId = res.intent_id ?? res.id ?? res.payment_intent_id;
      const initiateUrl = res.initiate_url ?? res.initiateUrl;
      if (!intentId || !initiateUrl) {
        toast.error('Could not start the top-up payment. Please try again.');
        return;
      }
      setPayment({ intentId, initiateUrl, amount: Number(amountKes) });
      setTopUpOpen(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Failed to start top-up'),
  });

  if (!tenantId) return null;

  const balance = wallet?.balance ?? 0;
  const lowBalance = wallet?.low_balance ?? false;

  return (
    <>
      {payment && (
        <TreasuryPaymentModal
          open={!!payment}
          onOpenChange={(open: boolean) => { if (!open) setPayment(null); }}
          paymentIntentId={payment.intentId}
          tenantSlug={tenantSlug}
          initiateUrl={payment.initiateUrl}
          amount={payment.amount}
          currency="KES"
          referenceType="api_token_topup"
          customerEmail={user?.email}
          allowedMethods="paystack,mpesa"
          onPaymentConfirmed={() => {
            setPayment(null);
            toast.success('Payment received. Tokens will land in your wallet shortly.');
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['token-wallet', tenantId] });
              queryClient.invalidateQueries({ queryKey: ['token-transactions', tenantId] });
            }, 3000);
          }}
          onPaymentFailed={() => {
            setPayment(null);
            toast.error('Top-up payment failed. Please try again.');
          }}
        />
      )}

      <Card className={lowBalance ? 'border-amber-500/50' : undefined}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">eTIMS API Tokens</h2>
            </div>
            <Button size="sm" onClick={() => setTopUpOpen((v) => !v)}>
              Buy tokens
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{balance.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">tokens remaining</span>
              </div>
              {lowBalance && (
                <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Balance is low. Top up to avoid interruptions to your external API calls.
                </p>
              )}
            </>
          )}

          {topUpOpen && (
            <div className="mt-4 flex items-end gap-2 border-t pt-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Amount (KES)</label>
                <Input
                  type="number"
                  min={100}
                  value={amountKes}
                  onChange={(e) => setAmountKes(e.target.value)}
                />
              </div>
              <Button
                onClick={() => topUpMutation.mutate(Number(amountKes))}
                disabled={topUpMutation.isPending || !Number(amountKes)}
              >
                {topUpMutation.isPending ? 'Starting…' : 'Continue to payment'}
              </Button>
            </div>
          )}

          {txns?.data && txns.data.length > 0 && (
            <div className="mt-4 space-y-1 max-h-40 overflow-y-auto border-t pt-3">
              {txns.data.map((tx) => (
                <div key={tx.id} className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">
                    {ACTION_LABEL[tx.action] ?? tx.action}
                    {tx.endpoint_pattern ? ` · ${tx.endpoint_pattern.split('/').pop()}` : ''}
                  </span>
                  <span className={tx.tokens < 0 ? 'text-red-500' : 'text-green-600 font-medium'}>
                    {tx.tokens < 0 ? '' : '+'}{tx.tokens.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t pt-3">
            <button
              type="button"
              className="text-xs text-primary flex items-center gap-1"
              onClick={() => setEstimateOpen((v) => !v)}
            >
              <Zap className="h-3 w-3" />
              Not sure how many tokens you need?
            </button>
            {estimateOpen && (
              <div className="mt-3 space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Avg. sales per day</label>
                    <Input
                      type="number"
                      min={1}
                      value={avgSalesPerDay}
                      onChange={(e) => setAvgSalesPerDay(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runEstimate(Number(avgSalesPerDay))}
                    disabled={estimating || !Number(avgSalesPerDay)}
                  >
                    {estimating ? 'Calculating…' : 'Estimate'}
                  </Button>
                </div>
                {estimate && (
                  <div className="text-xs space-y-2">
                    <p className="text-muted-foreground">
                      About <span className="font-semibold text-foreground">{estimate.tokens_per_month.toLocaleString()}</span>{' '}
                      tokens/month at that volume.
                    </p>
                    <div className="space-y-1">
                      {estimate.plans_compared.map((p) => (
                        <div
                          key={p.plan_code}
                          className={`flex justify-between items-center rounded-md px-2 py-1 ${
                            p.plan_code === estimate.recommended_plan ? 'bg-primary/10' : ''
                          }`}
                        >
                          <span>
                            {p.name}
                            {p.plan_code === estimate.recommended_plan && (
                              <Badge variant="default" className="ml-2">Recommended</Badge>
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {formatCurrency(p.monthly_price_kes)}/mo
                            {!p.covers_estimate && p.projected_topup_kes > 0 && (
                              <> + {formatCurrency(p.projected_topup_kes)} top-up</>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
