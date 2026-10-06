'use client';

import { Fragment, useMemo } from 'react';
import { Check, ChevronDown, Minus } from 'lucide-react';
import { planTierLabel, type CatalogMaps, type Plan } from '@/lib/plans/catalog';

interface Row {
  key: string;
  label: string;
  values: (string | boolean | null)[];
}
interface Section {
  title: string;
  rows: Row[];
}

function limitCell(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return v === -1 ? 'Unlimited' : Number(v).toLocaleString();
}

/** Builds the comparison once: usage limits, features by category, then extra-usage rates. */
function buildSections(plans: Plan[], maps: CatalogMaps): Section[] {
  const { featureInfo, limitInfo, internal, comparisonFeatures } = maps;
  const keys = Array.from(new Set(plans.flatMap((p) => Object.keys(p.tierLimits ?? {}))));
  const limitKeys = keys.filter((k) => !limitInfo[k]?.isOverage);
  const overageKeys = keys.filter((k) => limitInfo[k]?.isOverage);
  const sets = plans.map((p) => new Set((p.features ?? []).filter((f) => f.isIncluded && !internal.has(f.featureCode)).map((f) => f.featureCode)));

  const sections: Section[] = [];
  if (limitKeys.length) {
    sections.push({
      title: 'Usage limits',
      rows: limitKeys.map((k) => {
        const info = limitInfo[k];
        return {
          key: k,
          label: info ? `${info.label}${info.unit ? ` (${info.unit})` : ''}` : k.replace(/_/g, ' '),
          values: plans.map((p) => limitCell((p.tierLimits ?? {})[k])),
        };
      }),
    });
  }
  const byCategory = new Map<string, Row[]>();
  for (const code of comparisonFeatures) {
    if (!featureInfo[code] || !sets.some((s) => s.has(code))) continue;
    const cat = featureInfo[code].category ?? 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push({ key: code, label: featureInfo[code].label ?? code, values: sets.map((s) => s.has(code)) });
  }
  for (const [title, rows] of byCategory) sections.push({ title, rows });
  if (overageKeys.length) {
    sections.push({
      title: 'Extra usage rates',
      rows: overageKeys.map((k) => ({
        key: k,
        label: `${limitInfo[k]?.label ?? k.replace(/_/g, ' ')}${limitInfo[k]?.unit ? ` (${limitInfo[k].unit})` : ''}`,
        values: plans.map((p) => {
          const v = (p.tierLimits ?? {})[k];
          return v === undefined ? null : `KES ${Number(v).toLocaleString()}`;
        }),
      })),
    });
  }
  return sections;
}

function Cell({ value }: { value: string | boolean | null }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-green-700 dark:text-green-400" aria-label="Included" />;
  if (value === false || value === null) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="Not included" />;
  return <span className={value === 'Unlimited' ? 'font-semibold text-green-700 dark:text-green-400' : 'font-semibold text-foreground'}>{value}</span>;
}

export function PlanComparison({ plans, group, maps }: { plans: Plan[]; group: string; maps: CatalogMaps }) {
  const sections = useMemo(() => buildSections(plans, maps), [plans, maps]);
  if (plans.length < 2 || sections.length === 0) return null;
  const names = plans.map((p) => planTierLabel(p.planCode, group));

  return (
    <section aria-labelledby="compare-heading" className="space-y-4">
      <h2 id="compare-heading" className="font-display text-xl font-bold text-foreground">
        Compare plans
      </h2>

      {/* Desktop and tablet: one table, plan names stay visible while scrolling. */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th scope="col" className="w-2/5 px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Feature
                </th>
                {names.map((n) => (
                  <th key={n} scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-widest text-foreground">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <Fragment key={s.title}>
                  <tr className="border-t border-border bg-muted/40">
                    <th scope="colgroup" colSpan={names.length + 1} className="px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      {s.title}
                    </th>
                  </tr>
                  {s.rows.map((r) => (
                    <tr key={r.key} className="border-b border-border/50 hover:bg-muted/20">
                      <th scope="row" className="px-6 py-3 font-medium text-foreground">
                        {r.label}
                      </th>
                      {r.values.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          <Cell value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phones: one expandable list per plan instead of a sideways-scrolling table. */}
      <div className="space-y-2 md:hidden">
        {names.map((n, pi) => (
          <details key={n} className="group rounded-2xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 font-semibold text-foreground">
              {n}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              {sections.map((s) => (
                <div key={s.title}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.title}</p>
                  <dl className="divide-y divide-border/60 text-sm">
                    {s.rows.map((r) => (
                      <div key={r.key} className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-muted-foreground">{r.label}</dt>
                        <dd className="shrink-0 text-right">
                          <Cell value={r.values[pi]} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
