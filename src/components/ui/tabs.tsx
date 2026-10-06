'use client';

import { ComponentType, KeyboardEvent, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Small count or status shown after the label. */
  badge?: string | number;
}

interface CapsuleTabsProps<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name for the tab list. */
  label: string;
  /**
   * "row": one swipeable capsule row at every width.
   * "rail": the same row on phones and tablets, a vertical section rail from lg up.
   */
  layout?: 'row' | 'rail';
  /** Hide labels below sm and show icons only, so every tab fits on a phone. */
  compactOnMobile?: boolean;
  className?: string;
  /** id prefix linking each tab to its panel (`${idPrefix}-panel-${key}`). */
  idPrefix?: string;
}

/**
 * Capsule tab strip. Never wraps into a ragged second line on phones: it scrolls sideways
 * instead, the way native segmented controls do. Arrow keys, Home and End move between tabs.
 */
export function CapsuleTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  layout = 'row',
  compactOnMobile = false,
  className,
  idPrefix = 'tabs',
}: CapsuleTabsProps<K>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = items.findIndex((t) => t.key === value);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const key = items[next].key;
    onChange(key);
    refs.current[key]?.focus();
  }

  const rail = layout === 'rail';

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={rail ? 'vertical' : 'horizontal'}
      onKeyDown={onKeyDown}
      className={cn(
        'flex gap-1 overflow-x-auto scrollbar-hide rounded-2xl border border-border bg-muted/50 p-1',
        rail && 'lg:flex-col lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0',
        className,
      )}
    >
      {items.map((t) => {
        const active = t.key === value;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[t.key] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.key}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${t.key}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.key)}
            title={compactOnMobile ? t.label : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60',
              rail && 'lg:w-full lg:justify-start lg:px-3 lg:py-2.5',
              rail && active && 'lg:bg-primary/10 lg:text-primary lg:ring-0 lg:shadow-none',
            )}
          >
            {Icon && <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : '')} />}
            <span className={cn(compactOnMobile && Icon && 'sr-only sm:not-sr-only')}>{t.label}</span>
            {t.badge !== undefined && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Wraps a tab's content and wires it to its tab for screen readers. */
export function TabPanel<K extends string>({
  tabKey,
  idPrefix = 'tabs',
  children,
  className,
}: {
  tabKey: K;
  idPrefix?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
