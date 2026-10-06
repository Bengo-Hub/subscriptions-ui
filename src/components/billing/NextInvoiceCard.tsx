'use client';

import { TrendingUp } from 'lucide-react';
import { SectionCard } from '@/components/ui/page-header';
import { fmtDate, fmtMoney } from '@/lib/billing/format';
import type { BillingInfo, InvoicePreview } from '@/types/billing';

/** What the next bill will be, broken into its parts so nothing on it is a surprise. */
export function NextInvoiceCard({ preview, billing }: { preview?: InvoicePreview; billing?: BillingInfo }) {
  if (billing?.isPerpetual) return null;
  const rows: { label: string; value: string; tone?: string }[] = preview
    ? [
        { label: 'Plan', value: fmtMoney(preview.base_plan_price_kes) },
        ...(preview.overage_total_kes > 0 ? [{ label: 'Extra usage', value: `+${fmtMoney(preview.overage_total_kes)}`, tone: 'text-amber-800 dark:text-amber-300' }] : []),
        ...(preview.addons_total_kes > 0 ? [{ label: 'Add-ons', value: `+${fmtMoney(preview.addons_total_kes)}` }] : []),
        ...(preview.credits_to_apply_kes > 0 ? [{ label: 'Credit applied', value: `−${fmtMoney(preview.credits_to_apply_kes)}`, tone: 'text-green-700 dark:text-green-400' }] : []),
      ]
    : [];

  return (
    <SectionCard title="Next bill" icon={TrendingUp} description={billing?.nextRenewalDate ? `Due ${fmtDate(billing.nextRenewalDate)}` : 'Worked out from your usage'}>
      {!preview ? (
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold tabular-nums text-foreground">{fmtMoney(preview.estimated_total_kes)}</p>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className={r.tone ?? 'text-foreground'}>{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">An estimate. Your invoice shows the final figure, including VAT where it applies.</p>
        </>
      )}
    </SectionCard>
  );
}
