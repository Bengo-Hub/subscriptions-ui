'use client';

import { useState } from 'react';
import { Smartphone, Loader2 } from 'lucide-react';
import { PhoneInputField } from '@bengo-hub/shared-ui-lib/contact';
import { Badge, Button } from '@/components/ui/base';
import { useRegisterStandingOrder, useStandingOrder } from '@/hooks/useBilling';

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'every month',
  quarterly: 'every quarter',
  semi_annual: 'every six months',
  annual: 'every year',
};

/**
 * Pay the subscription automatically from an M-Pesa number (Safaricom Ratiba standing order).
 * Amount and frequency follow the plan and billing cycle; the customer approves the order on the
 * phone, and each debit renews the subscription and settles its invoice.
 */
export function MpesaStandingOrderCard() {
  const { data: order, isLoading } = useStandingOrder();
  const register = useRegisterStandingOrder();
  const [phone, setPhone] = useState('');

  if (isLoading) {
    return <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm">M-Pesa standing order</p>
            {order && (
              <Badge variant={order.status === 'active' ? 'success' : 'warning'}>
                {order.status === 'active' ? 'Active' : 'Waiting for approval on the phone'}
              </Badge>
            )}
          </div>
          {order ? (
            <p className="text-xs text-muted-foreground mt-1">
              KES {Number(order.amount).toLocaleString()} {FREQUENCY_LABEL[order.frequency] ?? order.frequency} from +{order.phone},
              starting {order.start_date}.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Renew automatically from your M-Pesa number. You approve the standing order once on your phone.
            </p>
          )}
        </div>
      </div>
      {!order && (
        <div className="flex flex-col sm:flex-row gap-2">
          <PhoneInputField value={phone} onChange={setPhone} defaultCountry="KE" className="flex-1" />
          <Button onClick={() => register.mutate(phone)} disabled={!phone || register.isPending}>
            {register.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Set up
          </Button>
        </div>
      )}
    </div>
  );
}
