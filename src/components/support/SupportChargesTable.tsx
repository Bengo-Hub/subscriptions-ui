'use client';

import { Badge, Button, Input } from '@/components/ui/base';
import { useIssueSupportInvoice, useUpdateSupportCharge } from '@/hooks/useSupportAgreements';
import type { SupportCharge, SupportChargeStatus } from '@/lib/api/support';
import { DataTable, formatCurrency, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { Ban, CheckCircle2, FileText, Loader2, Pencil, Send } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<SupportChargeStatus, 'default' | 'success' | 'warning' | 'error' | 'outline' | 'partial'> = {
  PENDING: 'outline',
  INVOICED: 'partial',
  OVERDUE: 'warning',
  PAID: 'success',
  WAIVED: 'outline',
};

const STATUS_OPTIONS = ['PENDING', 'INVOICED', 'OVERDUE', 'PAID', 'WAIVED'].map((s) => ({ value: s, label: s.toLowerCase() }));

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString() : '');

export function SupportChargeStatusBadge({ charge }: { charge: Pick<SupportCharge, 'status' | 'blocking'> }) {
  if (charge.blocking) return <Badge variant="error">Blocking</Badge>;
  return <Badge variant={STATUS_VARIANT[charge.status]}>{charge.status.toLowerCase()}</Badge>;
}

function periodLabel(c: SupportCharge) {
  if (!c.period_end) return fmtDate(c.period_start);
  const end = new Date(c.period_end);
  end.setDate(end.getDate() - 1);
  return `${fmtDate(c.period_start)} to ${end.toLocaleDateString()}`;
}

type Action = { charge: SupportCharge; kind: 'reprice' | 'settle' } | null;

/** Server-mode passthrough for the platform receivables list. */
export interface SupportChargesPaging {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  pageSize: number;
  onPageSizeChange: (n: number) => void;
}

/**
 * Support charges on the shared DataTable, with platform-owner actions: issue or re-send the
 * invoice, reprice one period (sales-agreed price), record an offline payment, or waive. Used by
 * the per-tenant agreements panel and the platform receivables page.
 */
export function SupportChargesTable({
  charges,
  showTenant = false,
  loading,
  paging,
  toolbar,
  storageKey,
}: {
  charges: SupportCharge[];
  showTenant?: boolean;
  loading?: boolean;
  paging?: SupportChargesPaging;
  toolbar?: ReactNode;
  storageKey?: string;
}) {
  const issue = useIssueSupportInvoice();
  const update = useUpdateSupportCharge();
  const [action, setAction] = useState<Action>(null);
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');

  const open = (charge: SupportCharge, kind: 'reprice' | 'settle') => {
    setAction({ charge, kind });
    setPrice('');
    setReason('');
  };

  const submitReprice = (clear: boolean) => {
    if (!action) return;
    const { charge } = action;
    if (clear) {
      update.mutate({ id: charge.id, body: { clear_custom_price: true } }, { onSuccess: () => setAction(null) });
      return;
    }
    const value = Number(price);
    if (!price.trim() || Number.isNaN(value) || value < 0) {
      toast.error('Enter a non-negative amount');
      return;
    }
    update.mutate(
      { id: charge.id, body: { custom_price: value, ...(reason.trim() ? { custom_price_reason: reason.trim() } : {}) } },
      { onSuccess: () => setAction(null) },
    );
  };

  const settle = (status: 'PAID' | 'WAIVED') => {
    if (!action) return;
    if (status === 'WAIVED' && !reason.trim()) {
      toast.error('Give a reason for waiving this charge');
      return;
    }
    update.mutate(
      { id: action.charge.id, body: { status, reason: reason.trim() || undefined } },
      { onSuccess: () => setAction(null) },
    );
  };

  const columns = useMemo<DataTableColumn<SupportCharge>[]>(() => {
    const cols: DataTableColumn<SupportCharge>[] = [];
    if (showTenant) {
      cols.push({
        key: 'tenant',
        header: 'Tenant',
        accessor: (c) => c.tenant_name || c.tenant_id,
        render: (c) => <span className="font-medium">{c.tenant_name || c.tenant_id.slice(0, 8)}</span>,
        sortable: true,
        filterable: true,
        primary: true,
      });
    }
    cols.push(
      {
        key: 'charge',
        header: 'Charge',
        accessor: (c) => c.agreement_name || 'Support',
        render: (c) => (
          <div>
            <div className="font-medium">{c.agreement_name || 'Support'}</div>
            <div className="text-xs text-muted-foreground">
              #{c.cycle_number}
              {c.agreement_kind === 'SPECIAL' ? ' · special' : ''}
            </div>
          </div>
        ),
        filterable: true,
        primary: !showTenant,
      },
      { key: 'period', header: 'Period', accessor: (c) => c.period_start, render: (c) => periodLabel(c), sortable: true, hideBelow: 'lg' },
      { key: 'due_date', header: 'Due', accessor: (c) => c.due_date, render: (c) => fmtDate(c.due_date), sortable: true },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        accessor: (c) => c.effective_price,
        render: (c) => (
          <div className="whitespace-nowrap">
            {formatCurrency(c.effective_price)}
            {c.custom_price != null && (
              <div className="text-[10px] text-muted-foreground" title={c.custom_price_reason}>
                custom, list {formatCurrency(c.base_price)}
              </div>
            )}
          </div>
        ),
        sortable: true,
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (c) => c.status,
        render: (c) => <SupportChargeStatusBadge charge={c} />,
        filterable: true,
        filterOptions: STATUS_OPTIONS,
        mobileAction: true,
      },
      {
        key: 'invoice',
        header: 'Invoice',
        accessor: (c) => c.invoice_number ?? '',
        render: (c) =>
          c.invoice_number ? (
            c.pdf_url ? (
              <a href={c.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" />
                {c.invoice_number}
              </a>
            ) : (
              c.invoice_number
            )
          ) : (
            <span className="text-muted-foreground">Not issued</span>
          ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        exportable: false,
        render: (c) => {
          const busy =
            (issue.isPending && issue.variables?.id === c.id) || (update.isPending && update.variables?.id === c.id);
          if (busy) return <Loader2 className="h-4 w-4 animate-spin inline" />;
          if (c.status === 'PAID' || c.status === 'WAIVED') {
            return <span className="text-xs text-muted-foreground">{c.paid_at ? `Paid ${fmtDate(c.paid_at)}` : ''}</span>;
          }
          return (
            <div className="inline-flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                title={c.invoice_number ? 'Re-send invoice' : 'Issue invoice now'}
                onClick={() => issue.mutate({ id: c.id, force: !!c.invoice_number })}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" title="Reprice this period" onClick={() => open(c, 'reprice')}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" title="Record payment or waive" onClick={() => open(c, 'settle')}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    );
    return cols;
  }, [showTenant, issue, update]);

  return (
    <div className="space-y-2">
      {action && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium mr-2">
            {action.charge.agreement_name || 'Support'} #{action.charge.cycle_number}
          </span>
          {action.kind === 'reprice' ? (
            <>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={`New amount (list ${formatCurrency(action.charge.base_price)})`}
                className="h-9 w-56"
              />
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-9 w-64" />
              <Button size="sm" onClick={() => submitReprice(false)}>Save price</Button>
              {action.charge.custom_price != null && (
                <Button size="sm" variant="outline" onClick={() => submitReprice(true)}>Revert to list</Button>
              )}
            </>
          ) : (
            <>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment reference or reason" className="h-9 w-72" />
              <Button size="sm" onClick={() => settle('PAID')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Record payment
              </Button>
              <Button size="sm" variant="outline" onClick={() => settle('WAIVED')}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Waive
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
        </div>
      )}
      <DataTable<SupportCharge>
        columns={columns}
        rows={charges}
        rowKey={(c) => c.id}
        loading={loading}
        loadingRows={5}
        emptyText="No charges."
        gridLines="rows"
        dense
        maxBodyHeight={false}
        toolbar={toolbar}
        storageKey={storageKey}
        showExportCsv={showTenant}
        exportFileName="support-charges"
        rowClassName={(c) => (c.blocking ? 'bg-red-500/5' : undefined)}
        {...(paging
          ? {
              page: paging.page,
              totalPages: paging.totalPages,
              total: paging.total,
              onPageChange: paging.onPageChange,
              pageSize: paging.pageSize,
              onPageSizeChange: paging.onPageSizeChange,
              pageSizeOptions: [10, 25, 50, 100],
            }
          : {})}
      />
    </div>
  );
}
