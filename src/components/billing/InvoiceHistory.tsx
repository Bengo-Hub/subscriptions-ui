'use client';

import { FileText, History } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { Badge, Button } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import { invoiceAmountDue } from '@/lib/billing/account-standing';
import { fmtDate, fmtMoney } from '@/lib/billing/format';
import type { Invoice } from '@/types/billing';

const STATUS: Record<string, { label: string; variant: 'success' | 'partial' | 'warning' | 'error' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'success' },
  partial: { label: 'Part paid', variant: 'partial' },
  pending: { label: 'Unpaid', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'error' },
  failed: { label: 'Failed', variant: 'error' },
  void: { label: 'Cancelled', variant: 'outline' },
};

/** Every invoice, newest first. A table on desktop, stacked cards on phones (shared DataTable). */
export function InvoiceHistory({
  invoices,
  loading,
  onView,
  onPay,
}: {
  invoices: Invoice[];
  loading: boolean;
  onView: (inv: Invoice) => void;
  onPay: (inv: Invoice) => void;
}) {
  const columns: DataTableColumn<Invoice>[] = [
    { key: 'date', header: 'Date', render: (i) => fmtDate(i.date), accessor: (i) => i.date },
    {
      key: 'description',
      header: 'Invoice',
      primary: true,
      render: (i) => (
        <span className="font-medium">
          {i.id}
          <span className="block text-xs font-normal text-muted-foreground">{i.kind === 'support' ? 'Support' : 'Subscription'}</span>
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (i) => i.amount,
      render: (i) => {
        const due = invoiceAmountDue(i);
        return (
          <span className="font-semibold tabular-nums">
            {fmtMoney(i.amount, i.currency)}
            {due > 0 && due < i.amount && (
              <span className="block text-xs font-normal text-muted-foreground">{fmtMoney(due, i.currency)} left to pay</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) => {
        const s = STATUS[String(i.status).toLowerCase()] ?? { label: i.status, variant: 'outline' as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      exportable: false,
      mobileAction: true,
      render: (i) => (
        <div className="inline-flex items-center gap-1">
          {i.pdfUrl && (
            <Button variant="ghost" size="icon" onClick={() => onView(i)} aria-label={`View invoice ${i.id}`}>
              <FileText className="h-4 w-4" />
            </Button>
          )}
          {invoiceAmountDue(i) > 0 && i.payUrl && (
            <Button size="sm" onClick={() => onPay(i)}>
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <SectionCard title="Invoice history" icon={History} bodyClassName="p-0 sm:p-0">
      <DataTable<Invoice>
        columns={columns}
        rows={invoices}
        rowKey={(i) => i.id}
        loading={loading}
        emptyText="No invoices yet."
        gridLines="rows"
        dense
        maxBodyHeight={false}
      />
    </SectionCard>
  );
}
