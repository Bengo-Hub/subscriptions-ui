'use client';

import { FileText, Receipt } from 'lucide-react';
import { Badge, Button } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import type { OpenBill } from '@/lib/billing/account-standing';
import { fmtDate, fmtMoney } from '@/lib/billing/format';

/** Every open bill with its own Pay button, so a second bill is never hidden behind the first. */
export function BillsToPay({
  bills,
  onPay,
  onViewPdf,
}: {
  bills: OpenBill[];
  onPay: (bill: OpenBill) => void;
  onViewPdf: (bill: OpenBill) => void;
}) {
  if (bills.length === 0) return null;
  return (
    <SectionCard
      title="Bills to pay"
      icon={Receipt}
      description="Pay any of these with M-Pesa or card. You do not need a saved card."
      bodyClassName="p-0 sm:p-0"
    >
      <ul className="divide-y divide-border">
        {bills.map((b) => (
          <li key={b.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{b.label}</p>
                {b.overdue ? <Badge variant="error">Overdue</Badge> : <Badge variant="warning">Unpaid</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {b.reference ? `Invoice ${b.reference}` : 'Invoice'}
                {b.dueDate ? ` · ${b.kind === 'support' ? 'due' : 'issued'} ${fmtDate(b.dueDate)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="mr-auto text-base font-bold tabular-nums text-foreground sm:mr-2">{fmtMoney(b.amountDue, b.currency)}</p>
              {b.pdfUrl && (
                <Button variant="ghost" size="icon" onClick={() => onViewPdf(b)} aria-label={`View invoice ${b.reference ?? ''}`}>
                  <FileText className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={() => onPay(b)} disabled={!b.payUrl} className="min-w-24">
                {b.payUrl ? 'Pay' : 'Invoice coming'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
