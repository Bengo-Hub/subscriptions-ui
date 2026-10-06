'use client';

import type { Dispatch, SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import type { FeatureDefinition } from '@/types/feature-catalog';

export type TierLimitEntry = { key: string; value: string };
export type FeatureEntry = { featureCode: string; isIncluded: boolean; limitValue: string; overageUnitPrice: string };

export const serviceTagLabel = (t: string) => t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/**
 * Loads the platform feature catalog, grouped service then category, and lets the platform owner
 * toggle features (featureEntries) and limits (tierEntries) in or out of a plan. The manual
 * editors in the plan form stay as a fallback for codes not in the catalog.
 */
export function CatalogFeaturePicker({
  catalog,
  isLoading,
  selectedService,
  onSelectService,
  featureEntries,
  setFeatureEntries,
  tierEntries,
  setTierEntries,
}: {
  catalog: FeatureDefinition[];
  isLoading: boolean;
  selectedService: string;
  onSelectService: (s: string) => void;
  featureEntries: FeatureEntry[];
  setFeatureEntries: Dispatch<SetStateAction<FeatureEntry[]>>;
  tierEntries: TierLimitEntry[];
  setTierEntries: Dispatch<SetStateAction<TierLimitEntry[]>>;
}) {
  const services = ['all', ...Array.from(new Set(catalog.map((c) => c.serviceTag))).sort()];
  const isAll = selectedService === 'all';
  const scoped = isAll ? catalog : catalog.filter((c) => c.serviceTag === selectedService);
  const byService = scoped.reduce<Record<string, Record<string, FeatureDefinition[]>>>((acc, f) => {
    const svc = (acc[f.serviceTag] ??= {});
    (svc[f.category] ??= []).push(f);
    return acc;
  }, {});
  const serviceOrder = Object.keys(byService).sort();

  const hasFeature = (code: string) => featureEntries.some((e) => e.featureCode === code && e.isIncluded);
  const hasLimit = (code: string) => tierEntries.some((e) => e.key === code);

  const toggleFeature = (f: FeatureDefinition) =>
    setFeatureEntries((prev) =>
      prev.some((e) => e.featureCode === f.featureCode)
        ? prev.filter((e) => e.featureCode !== f.featureCode)
        : [...prev, { featureCode: f.featureCode, isIncluded: true, limitValue: '', overageUnitPrice: '0' }],
    );

  const toggleLimit = (f: FeatureDefinition) =>
    setTierEntries((prev) =>
      prev.some((e) => e.key === f.featureCode)
        ? prev.filter((e) => e.key !== f.featureCode)
        : [...prev, { key: f.featureCode, value: f.defaultLimit != null ? String(f.defaultLimit) : '-1' }],
    );

  const inPlanCount = scoped.filter((f) => (f.kind === 'LIMIT' ? hasLimit(f.featureCode) : hasFeature(f.featureCode))).length;

  return (
    <div className="space-y-3 border-t border-border pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="catalog-service" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Add features from the catalog
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {inPlanCount} of {scoped.length} in plan
          </span>
          <select
            id="catalog-service"
            value={selectedService}
            onChange={(e) => onSelectService(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs font-medium"
          >
            {services.length <= 1 && <option value="all">No services</option>}
            {services.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All services' : serviceTagLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm italic text-muted-foreground">Loading catalog…</p>
      ) : scoped.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No catalog features for this service. Run the seed to populate the catalog, or use the manual editors below.
        </p>
      ) : (
        <div className="max-h-96 space-y-5 overflow-y-auto pr-1">
          {serviceOrder.map((svc) => (
            <div key={svc} className="space-y-2">
              {isAll && (
                <p className="sticky top-0 border-b border-border/60 bg-card py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {serviceTagLabel(svc)}
                </p>
              )}
              {Object.entries(byService[svc]).map(([category, defs]) => (
                <div key={category} className="space-y-1.5">
                  <p className={cn('py-1 text-[11px] font-semibold text-foreground/80', !isAll && 'sticky top-0 bg-card')}>{category}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {defs.map((f) => {
                      const isLimit = f.kind === 'LIMIT';
                      const active = isLimit ? hasLimit(f.featureCode) : hasFeature(f.featureCode);
                      return (
                        <label
                          key={f.featureCode}
                          className={cn(
                            'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
                            active ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-accent/40',
                          )}
                          title={f.description || f.featureCode}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => (isLimit ? toggleLimit(f) : toggleFeature(f))}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded accent-primary"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium">{f.label}</span>
                            <span className="block truncate font-mono text-[10px] text-muted-foreground">
                              {f.featureCode}
                              {isLimit ? ` · limit${f.unit ? ' ' + f.unit : ''}` : ''}
                              {f.isRateLimited ? ' · metered' : ''}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
