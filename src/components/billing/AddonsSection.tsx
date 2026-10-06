'use client';

import { Gauge, Layers, Loader2, Package, Trash2, Zap } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib';
import { Badge, Button } from '@/components/ui/base';
import { SectionCard } from '@/components/ui/page-header';
import { usePlanAddons, usePurchasePlanAddon, useRemovePlanAddon } from '@/hooks/useCustomAddons';
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
 * Extras: usage over the plan's limits this period, add-ons already on the bill, and add-ons that
 * can be bought. Buying one opens the same checkout as paying a bill.
 */
export function AddonsSection({
  preview,
  onCheckout,
}: {
  preview?: InvoicePreview;
  onCheckout: (args: { intentId: string; initiateUrl: string; amount: number; label: string }) => void;
}) {
  const { data, isLoading } = usePlanAddons();
  const purchase = usePurchasePlanAddon();
  const remove = useRemovePlanAddon();
  const addons = data?.addons ?? [];
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

      {(isLoading || addons.length > 0) && (
        <SectionCard title="Add more to your plan" icon={Layers} description="Paid add-ons are charged when you buy them. Free ones switch on straight away.">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading add-ons…
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {addons.map((a) => {
                const free = a.overage_unit_price === 0;
                return (
                  <li
                    key={a.feature_code}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${a.purchased ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{titleCase(a.feature_code)}</p>
                      {a.limit_value != null && a.limit_value > 0 && (
                        <p className="text-xs text-muted-foreground">{a.limit_value.toLocaleString()} included</p>
                      )}
                      <p className="mt-0.5 text-xs font-semibold text-primary">{free ? 'Free' : fmtMoney(a.overage_unit_price)}</p>
                    </div>
                    {a.purchased ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="success">On</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${titleCase(a.feature_code)}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove.mutate(a.feature_code)}
                          disabled={remove.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="shrink-0"
                        disabled={purchase.isPending}
                        onClick={async () => {
                          const result = await purchase.mutateAsync({
                            featureCode: a.feature_code,
                            returnUrl: `${window.location.origin}/billing?addon_success=${a.feature_code}`,
                          });
                          if (result.status === 'payment_required' && result.intent) {
                            const intent = result.intent as Record<string, any>;
                            onCheckout({
                              intentId: intent.intent_id ?? intent.id ?? '',
                              initiateUrl: intent.initiate_url ?? '',
                              amount: a.overage_unit_price,
                              label: `${titleCase(a.feature_code)} add-on`,
                            });
                          }
                        }}
                      >
                        {purchase.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        {free ? 'Switch on' : 'Buy'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}
    </>
  );
}
