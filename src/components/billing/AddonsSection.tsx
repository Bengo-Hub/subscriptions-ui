'use client';

import { Gauge, Package } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { SectionCard } from '@/components/ui/page-header';
import { fmtMoney, titleCase } from '@/lib/billing/format';
import type { AddonLine, InvoicePreview, OverageLine } from '@/types/billing';

const overageColumns: DataTableColumn<OverageLine>[] = [
  { key: 'metric', header: 'What', primary: true, render: (o) => <span className="font-medium">{titleCase(o.metric_type)}</span> },
  { key: 'used', header: 'Used', align: 'right', render: (o) => o.units_used.toLocaleString() },
  { key: 'limit', header: 'Included', align: 'right', hideBelow: 'md', render: (o) => o.plan_limit.toLocaleString() },
  { key: 'over', header: 'Extra', align: 'right', render: (o) => <span className="font-semibold text-amber-800 dark:text-amber-300">+{o.units_over.toLocaleString()}</span> },
  { key: 'rate', header: 'Price each', align: 'right', hideBelow: 'md', render: (o) => fmtMoney(o.unit_price_kes) },
  { key: 'total', header: 'Total', align: 'right', mobileAction: true, render: (o) => <span className="font-semibold">{fmtMoney(o.total_kes)}</span> },
];

const activeColumns: DataTableColumn<AddonLine>[] = [
  { key: 'name', header: 'Add-on', primary: true, render: (a) => <span className="font-medium">{a.name}</span> },
  { key: 'service', header: 'App', hideBelow: 'md', render: (a) => <span className="capitalize text-muted-foreground">{a.service_code ?? 'Platform'}</span> },
  { key: 'qty', header: 'Qty', align: 'right', render: (a) => a.quantity },
  { key: 'unit', header: 'Price each', align: 'right', hideBelow: 'md', render: (a) => fmtMoney(a.unit_price_kes) },
  { key: 'total', header: 'Total', align: 'right', mobileAction: true, render: (a) => <span className="font-semibold">{fmtMoney(a.total_kes)}</span> },
];

/**
 * Extras on the next bill: usage over the plan's limits this period (including SMS and WhatsApp
 * messages beyond plan and bundles) and add-ons already attached. SMS, WhatsApp and AI bundles
 * are bought in the messaging section.
 */
export function AddonsSection({ preview }: { preview?: InvoicePreview }) {
  const overages = preview?.overage_charges ?? [];
  const active = preview?.custom_addons ?? [];

  return (
    <>
      {overages.length > 0 && (
        <SectionCard title="Extra usage this period" icon={Gauge} description="Usage above your plan's limits, added to your next bill." bodyClassName="p-0 sm:p-0">
          <DataTable<OverageLine> columns={overageColumns} rows={overages} rowKey={(o) => o.metric_type} gridLines="rows" dense maxBodyHeight={false} />
        </SectionCard>
      )}

      {active.length > 0 && (
        <SectionCard title="Your add-ons" icon={Package} bodyClassName="p-0 sm:p-0">
          <DataTable<AddonLine> columns={activeColumns} rows={active} rowKey={(a) => `${a.name}-${a.service_code ?? ''}`} gridLines="rows" dense maxBodyHeight={false} />
        </SectionCard>
      )}
    </>
  );
}
