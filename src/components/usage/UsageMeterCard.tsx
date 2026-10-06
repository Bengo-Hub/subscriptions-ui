'use client';

import { AlertTriangle, BarChart3, Globe, Infinity as InfinityIcon, Package, ShoppingCart, Truck, Users, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UsageMetric } from '@/types/usage';

const METRIC_ICONS: Record<string, LucideIcon> = {
  orders: ShoppingCart,
  riders: Truck,
  outlets: Globe,
  api_calls: Zap,
  users: Users,
  products: Package,
  reports: BarChart3,
};

export type UsageLevel = 'ok' | 'warning' | 'danger' | 'over' | 'unlimited';

export function usagePercent(used: number, limit: number): number {
  return limit > 0 ? Math.round((used / limit) * 100) : 0;
}

export function usageLevel(used: number, limit: number): UsageLevel {
  if (limit <= 0) return 'unlimited';
  const p = usagePercent(used, limit);
  if (p >= 100) return 'over';
  if (p >= 90) return 'danger';
  if (p >= 75) return 'warning';
  return 'ok';
}

const LEVEL = {
  ok: { ring: 'text-primary', chip: 'bg-green-500/10 text-green-700 dark:text-green-400', label: 'Plenty left' },
  warning: { ring: 'text-amber-500', chip: 'bg-amber-500/10 text-amber-800 dark:text-amber-300', label: 'Getting close' },
  danger: { ring: 'text-red-500', chip: 'bg-red-500/10 text-red-700 dark:text-red-400', label: 'Almost full' },
  over: { ring: 'text-red-600', chip: 'bg-red-500/15 text-red-700 dark:text-red-400', label: 'Limit reached' },
  unlimited: { ring: 'text-muted-foreground', chip: 'bg-muted text-muted-foreground', label: 'Unlimited' },
} as const;

/** One metric: a ring that fills as the limit is used, the exact numbers, and a plain status. */
export function UsageMeterCard({ metric }: { metric: UsageMetric }) {
  const used = metric.used ?? 0;
  const limit = metric.limit ?? 0;
  const level = usageLevel(used, limit);
  const pct = usagePercent(used, limit);
  const Icon = METRIC_ICONS[metric.key] ?? Package;
  const style = LEVEL[level];
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = level === 'unlimited' ? 0 : Math.min(100, pct);

  return (
    <article
      className={cn(
        'flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5',
        level === 'over' || level === 'danger' ? 'border-red-500/40' : 'border-border',
      )}
    >
      <div className="relative h-16 w-16 shrink-0" role="img" aria-label={limit > 0 ? `${pct}% of the limit used` : 'No limit'}>
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} className="fill-none stroke-muted" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={r}
            className={cn('fill-none stroke-current transition-[stroke-dashoffset] duration-700', style.ring)}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * filled) / 100}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-foreground">
          {level === 'unlimited' ? <InfinityIcon className="h-4 w-4 text-muted-foreground" aria-hidden /> : `${pct}%`}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h3 className="truncate text-sm font-semibold text-foreground">{metric.name || metric.key}</h3>
        </div>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">
          <span className="font-bold text-foreground">{used.toLocaleString()}</span>
          {limit > 0 ? ` of ${limit.toLocaleString()}` : ''} {metric.unit}
        </p>
        <span className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', style.chip)}>
          {(level === 'over' || level === 'danger') && <AlertTriangle className="h-3 w-3" aria-hidden />}
          {level === 'ok' && limit > 0 ? `${(limit - used).toLocaleString()} left` : style.label}
        </span>
      </div>
    </article>
  );
}
