'use client';

import { useId, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Input } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import { useRedeemCoupon } from '@/hooks/useBilling';
import { fmtMoney } from '@/lib/billing/format';
import type { CreditWallet } from '@/types/billing';

const TX_LABEL: Record<string, string> = {
  earned: 'Referral reward',
  coupon_redeemed: 'Coupon',
  gifted: 'Gift',
  auto_applied: 'Used on a bill',
  expired: 'Expired',
  manual_adjusted: 'Adjustment',
};

/** Credit balance (used automatically on the next bill) and coupon redemption in one place. */
export function WalletCouponCard({ wallet }: { wallet?: CreditWallet }) {
  const [code, setCode] = useState('');
  const redeem = useRedeemCoupon();
  const inputId = useId();
  const txs = wallet?.transactions ?? [];

  return (
    <SectionCard title="Credit and coupons" icon={Wallet} description="Credit is taken off your next bill automatically.">
      <p className="text-3xl font-bold tabular-nums text-green-700 dark:text-green-400">{fmtMoney(wallet?.balance_kes ?? 0)}</p>
      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) redeem.mutate(code.trim(), { onSuccess: () => setCode('') });
        }}
      >
        <label htmlFor={inputId} className="text-xs font-semibold text-muted-foreground">
          Have a coupon code?
        </label>
        <div className="flex gap-2">
          <Input id={inputId} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME20" autoComplete="off" />
          <Button type="submit" variant="outline" disabled={!code.trim() || redeem.isPending}>
            {redeem.isPending ? 'Applying…' : 'Apply'}
          </Button>
        </div>
      </form>
      {txs.length > 0 && (
        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto border-t border-border pt-3 text-xs">
          {txs.slice(0, 8).map((tx) => (
            <li key={tx.id} className="flex justify-between gap-3 py-0.5">
              <span className="text-muted-foreground">{TX_LABEL[tx.type] ?? tx.type}</span>
              <span className={tx.amount_kes < 0 ? 'text-red-700 dark:text-red-400' : 'font-medium text-green-700 dark:text-green-400'}>
                {tx.amount_kes < 0 ? '−' : '+'}
                {fmtMoney(Math.abs(tx.amount_kes))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
