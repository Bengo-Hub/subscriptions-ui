'use client';

import { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Every tenant page uses this one content width so pages line up and wide screens have no dead
 * side margins. The shell's <main> owns no padding, so the page wrapper does.
 */
export const PAGE_CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-8';

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(PAGE_CONTAINER, 'space-y-6 sm:space-y-8', className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  /** Buttons or chips on the right. They drop below the title on phones. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {Icon && <Icon className="h-4 w-4" />}
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-sm sm:text-base text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

/** Compact figure tile for a page's summary strip. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-700 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }[tone];
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {Icon && (
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-foreground tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Card section with a title row; the action slot wraps under the title on phones. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      <div className={cn('p-4 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}
