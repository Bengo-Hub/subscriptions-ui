'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { supportPeriodLabel, type SupportCycle, type SupportIntervalUnit } from '@/lib/api/support';
import { DataTable, formatCurrency, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { AlertTriangle, ExternalLink, FileText, Headset } from 'lucide-react';

export interface TenantSupportAgreement {
  id: string;
  kind: 'STANDARD' | 'SPECIAL';
  name: string;
  billingCycle: SupportCycle;
  intervalCount: number;
  intervalUnit: SupportIntervalUnit;
  periodAmount: number;
  monthlyEquivalent: number;
  currency: string;
  billingTiming: 'ADVANCE' | 'ARREARS';
  status: 'ACTIVE' | 'PAUSED';
  nextPeriodStart: string;
}

export interface TenantSupportCharge {
  id: string;
  name: string;
  periodStart: string;
  periodEnd?: string;
  dueDate: string;
  graceEndsAt: string;
  status: 'PENDING' | 'INVOICED' | 'OVERDUE';
  amount: number;
  invoiceTotal?: number;
  currency: string;
  invoiceNumber?: string;
  payUrl?: string;
  pdfUrl?: string;
  blocking: boolean;
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '');

const columns: DataTableColumn<TenantSupportCharge>[] = [
  { key: 'name', header: 'Charge', primary: true, render: (c) => <span className="font-medium">{c.name || 'Support'}</span> },
  {
    key: 'period',
    header: 'Period',
    accessor: (c) => c.periodStart,
    render: (c) => {
      if (!c.periodEnd) return fmtDate(c.periodStart);
      const end = new Date(c.periodEnd);
      end.setDate(end.getDate() - 1);
      return `${fmtDate(c.periodStart)} to ${end.toLocaleDateString()}`;
    },
  },
  { key: 'dueDate', header: 'Due', render: (c) => fmtDate(c.dueDate) },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    accessor: (c) => c.invoiceTotal ?? c.amount,
    render: (c) => formatCurrency(c.invoiceTotal ?? c.amount),
  },
  {
    key: 'status',
    header: 'Status',
    mobileAction: true,
    render: (c) =>
      c.blocking ? (
        <Badge variant="error">Overdue, editing blocked</Badge>
      ) : c.status === 'OVERDUE' ? (
        <Badge variant="warning">Overdue until {fmtDate(c.graceEndsAt)}</Badge>
      ) : c.status === 'INVOICED' ? (
        <Badge variant="partial">Invoiced</Badge>
      ) : (
        <Badge variant="outline">Upcoming</Badge>
      ),
  },
  {
    key: 'pay',
    header: '',
    align: 'right',
    exportable: false,
    render: (c) => (
      <div className="inline-flex items-center gap-2">
        {c.pdfUrl && (
          <a href={c.pdfUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary" title={c.invoiceNumber}>
            <FileText className="h-4 w-4" />
          </a>
        )}
        {c.payUrl ? (
          <a href={c.payUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant={c.status === 'OVERDUE' ? 'destructive' : 'primary'}>
              Pay <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Invoice coming</span>
        )}
      </div>
    ),
  },
];

/**
 * The tenant's support agreements (hosting and support, special support) and unpaid support
 * charges. When a charge stays unpaid 7 days past its due date, create/edit/delete is blocked in
 * every service until it is paid; viewing keeps working.
 */
export function SupportChargesCard({
  agreements = [],
  charges = [],
  blocked,
}: {
  agreements?: TenantSupportAgreement[];
  charges?: TenantSupportCharge[];
  blocked?: boolean;
}) {
  if (agreements.length === 0 && charges.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Headset className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Support and hosting</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {blocked && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              A support invoice is overdue. You can still view your data, but creating, editing and deleting records is
              paused in all apps until it is paid. Access returns within a few minutes of payment.
            </span>
          </div>
        )}
        {agreements.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {agreements.map((a) => (
              <div key={a.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  {a.status === 'PAUSED' && <Badge variant="outline">paused</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(a.periodAmount)} {supportPeriodLabel({
                    billing_cycle: a.billingCycle,
                    interval_count: a.intervalCount,
                    interval_unit: a.intervalUnit,
                  }).toLowerCase()}{' '}
                  (plus VAT where applicable)
                </p>
                {a.status === 'ACTIVE' && (
                  <p className="text-xs text-muted-foreground">Next period starts {fmtDate(a.nextPeriodStart)}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {charges.length > 0 && (
          <DataTable<TenantSupportCharge>
            columns={columns}
            rows={charges}
            rowKey={(c) => c.id}
            gridLines="rows"
            dense
            maxBodyHeight={false}
            rowClassName={(c) => (c.blocking ? 'bg-red-500/5' : undefined)}
          />
        )}
      </CardContent>
    </Card>
  );
}
